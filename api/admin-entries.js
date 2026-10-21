const {configured,json,adminUser,supa}=require('./_lib');
const ALLOWED_DECISIONS=new Set(['Yes, sign me up','Needs to think','Not right now','__empty']);
const PER_PAGE=100;
function countFrom(response){
 if(!response.ok)return null;
 const range=response.headers.get('content-range')||'';
 const match=range.match(/\/(\d+)$/);
 return match?Number(match[1]):null;
}
async function countRows(decision){
 const u=new URLSearchParams({select:'id',limit:'0'});
 if(decision)u.set('decision',decision==='__empty'?'eq.':'eq.'+decision);
 const r=await supa('/rest/v1/founding_sessions?'+u.toString(),{method:'HEAD',headers:{Prefer:'count=exact'}});
 return countFrom(r);
}
module.exports=async function handler(req,res){
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 if(!configured())return json(res,503,{error:'Admin configuration is incomplete'});
 try{
  const user=await adminUser(req);if(!user)return json(res,401,{error:'Please sign in'});
  const page=Math.max(0,Math.min(10000,Number.parseInt(req.query.page||'0',10)||0));
  const rawSearch=typeof req.query.search==='string'?req.query.search:'';
  const search=rawSearch.slice(0,120).replace(/[(),*"\\%_]/g,' ').trim();
  const decision=typeof req.query.decision==='string'&&ALLOWED_DECISIONS.has(req.query.decision)?req.query.decision:'';
  const params=new URLSearchParams({select:'*',order:'created_at.desc',limit:String(PER_PAGE),offset:String(page*PER_PAGE)});
  if(search){
   const cols=['owner','business','email','phone','decision','notes','follow_up'];
   params.set('or','('+cols.map(x=>x+'.ilike.*'+search+'*').join(',')+')');
  }
  if(decision)params.set('decision',decision==='__empty'?'eq.':'eq.'+decision);
  const result=await supa('/rest/v1/founding_sessions?'+params.toString(),{headers:{Prefer:'count=exact'}});
  if(!result.ok){
   console.error('Admin search Supabase HTTP status',result.status);
   return json(res,502,{error:'Unable to load entries'});
  }
  const entries=await result.json();
  const count=countFrom(result);
  const summaryResults=await Promise.allSettled([countRows(''),countRows('Yes, sign me up'),countRows('Needs to think')]);
  const values=summaryResults.map(x=>x.status==='fulfilled'?x.value:null);
  return json(res,200,{
   entries,
   total:count===null?entries.length:count,
   page,
   limit:PER_PAGE,
   summary:{total:values[0],joined:values[1],followUp:values[2]}
  });
 }catch(error){
  console.error('Admin entries failure',error?.message);
  return json(res,502,{error:'Unable to load entries'});
 }
};