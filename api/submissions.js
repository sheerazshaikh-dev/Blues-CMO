const {configured,json,originOk,supa}=require('./_lib');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function trim(s,n=400){return typeof s==='string'?s.trim().slice(0,n):''}
module.exports=async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 if(!configured())return json(res,503,{error:'Server storage is not configured'});
 if(!originOk(req))return json(res,403,{error:'Invalid origin'});
 const size=Number(req.headers['content-length']||0);if(size>50000)return json(res,413,{error:'Submission too large'});
 const {id,session}=req.body||{};
 if(!uuid.test(id||'')||!session||typeof session!=='object'||Array.isArray(session))return json(res,400,{error:'Invalid submission'});
 if(session.website||session.company_website)return json(res,200,{success:true});
 const owner=trim(session.owner,200),business=trim(session.business,200),email=trim(session.email,254);
 if(!owner&&!business)return json(res,400,{error:'Owner or business required'});
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Invalid email'});
 if(JSON.stringify(session).length>35000)return json(res,413,{error:'Submission too large'});
 const record={submission_key:id,owner,business,email,phone:trim(session.phone,80),decision:trim(session.decision,100),session_date:trim(session.date,80),seat:trim(session.seat,60),follow_up:trim(session.followUp,600),notes:trim(session.notes,3000),payload:session};
 try{
  const response=await supa('/rest/v1/founding_sessions?on_conflict=submission_key',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(record)});
  if(!response.ok){console.error('Supabase submission status',response.status);return json(res,502,{error:'Save failed. Please try again.'})}
  return json(res,200,{success:true});
 }catch(e){console.error('Supabase submission request failure',e?.message);return json(res,502,{error:'Save failed. Please try again.'})}
};