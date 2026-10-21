const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY='dummy-secret';
process.env.ADMIN_EMAIL='admin@example.com';
const submission=require('../api/submissions');
const entries=require('../api/admin-entries');
const login=require('../api/login');
function res(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}}}
function req(body,method='POST'){return {method,body,headers:{origin:'https://blues.example.com',host:'blues.example.com'},query:{}}}
test('invalid submissions never hit database',async()=>{const r=res();await submission(req({id:'not-a-uuid',session:{business:'Test'}}),r);assert.equal(r.statusCode,400)});
test('empty identity is rejected',async()=>{const r=res();await submission(req({id:'a6a20c4a-bffd-4db1-b213-dfe05b2c3da2',session:{}}),r);assert.equal(r.statusCode,400)});
test('foreign origin is blocked',async()=>{const q=req({});q.headers.origin='https://evil.example.com';const r=res();await submission(q,r);assert.equal(r.statusCode,403)});
test('anonymous admin reads are forbidden',async()=>{const r=res();await entries({...req({},'GET'),query:{}},r);assert.equal(r.statusCode,401)});
test('admin allowlist refuses other users',async()=>{const r=res();await login(req({email:'stranger@example.com',password:'password'}),r);assert.equal(r.statusCode,401)});
test('valid submission is stored through private API',async()=>{
const previous=global.fetch;let seen=null;
global.fetch=async(url,opts)=>{seen={url,opts};return {ok:true,status:201}};
try{const r=res();await submission(req({id:'a6a20c4a-bffd-4db1-b213-dfe05b2c3da2',session:{owner:'Owner',business:'Company',ratings:{'Lead Rescue':'Must have'}}}),r);assert.equal(r.statusCode,200);assert.ok(seen.url.includes('founding_sessions'));assert.deepEqual(JSON.parse(seen.opts.body).payload.ratings,{'Lead Rescue':'Must have'})}finally{global.fetch=previous}
});