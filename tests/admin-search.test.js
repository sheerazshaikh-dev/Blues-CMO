const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY='unit-test-only';
process.env.ADMIN_EMAIL='admin@example.com';
const handler=require('../api/admin-entries');
function req(query){return {method:'GET',query,headers:{cookie:'blues_admin=testing-token'}}}
function res(){return {statusCode:200,setHeader(){return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
test('global search, filtered pagination and dashboard counts',async()=>{
 let calls=[];const before=global.fetch;
 global.fetch=async (url,options={})=>{
   calls.push({url,method:options.method||'GET'});
   if(url.includes('/auth/v1/user'))return {ok:true,json:async()=>({email:'admin@example.com'})};
   if(url.includes('/rest/v1/founding_sessions')){
     const isCount=options.method==='HEAD';
     return {ok:true,status:200,headers:{get:(k)=>k.toLowerCase()==='content-range'?(isCount?'*/7':'0-0/1'):null},json:async()=>[{business:'Example Co',decision:'Yes, sign me up'}]};
   }
   throw new Error('Unexpected URL');
 };
 try{
   const reply=res();await handler(req({page:'0',search:'Brand and Brains',decision:'Yes, sign me up'}),reply);
   assert.equal(reply.statusCode,200);
   assert.equal(reply.body.total,1);
   assert.equal(reply.body.summary.joined,7);
   const url=new URL(calls.find(x=>x.url.includes('/rest/')&&x.method==='GET').url);
   assert.ok(url.searchParams.get('or').includes('business.ilike.*Brand and Brains*'));
   assert.equal(url.searchParams.get('decision'),'eq.Yes, sign me up');
   assert.equal(reply.body.entries[0].business,'Example Co');
 }finally{global.fetch=before}
});
test('dangerous filter delimiters cannot change the query structure',async()=>{
 const before=global.fetch;let queryUrl='';
 global.fetch=async(url,options={})=>{
   if(url.includes('/auth/v1/user'))return {ok:true,json:async()=>({email:'admin@example.com'})};
   if(url.includes('/rest/v1/')){if(options.method!=='HEAD')queryUrl=url;return {ok:true,status:200,headers:{get:()=> '*/0'},json:async()=>[]}};
   throw new Error('Unexpected URL')
 };
 try{const reply=res();await handler(req({search:'hello),business.eq.secret',decision:'tampered'}),reply);assert.equal(reply.statusCode,200);
 const p=new URL(queryUrl).searchParams;assert.equal(p.get('decision'),null);assert.ok(!p.get('or').includes('),business.eq.'))}
 finally{global.fetch=before}
});