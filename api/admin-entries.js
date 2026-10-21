const {configured,json,adminUser,supa}=require('./_lib');
module.exports=async function handler(req,res){
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 if(!configured())return json(res,503,{error:'Admin configuration is incomplete'});
 try{
  const user=await adminUser(req);if(!user)return json(res,401,{error:'Please sign in'});
  const page=Math.max(0,Math.min(10000,Number.parseInt(req.query.page||'0',10)||0));
  const limit=100,offset=page*limit;
  const response=await supa('/rest/v1/founding_sessions?select=*&order=created_at.desc&limit='+limit+'&offset='+offset,{headers:{'Prefer':'count=exact'}});
  if(!response.ok)return json(res,502,{error:'Unable to load entries'});
  const entries=await response.json();
  const range=response.headers.get('content-range')||'';
  return json(res,200,{entries,total:Number(range.split('/')[1])||entries.length,page,limit});
 }catch(e){console.error('Admin entries failure',e?.message);return json(res,502,{error:'Unable to load entries'})}
};