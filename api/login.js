const {ADMIN_EMAIL,configured,json,originOk,supa,writeCookie}=require('./_lib');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 if(!configured())return json(res,503,{error:'Admin configuration is incomplete'});
 if(!originOk(req))return json(res,403,{error:'Invalid origin'});
 const {email,password}=req.body||{};
 if(typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>1024)return json(res,400,{error:'Invalid credentials'});
 if(email.trim().toLowerCase()!==ADMIN_EMAIL)return json(res,401,{error:'Incorrect email or password'});
 try{
  const response=await supa('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password})});
  const result=await response.json();
  if(!response.ok||!result.access_token)return json(res,401,{error:'Incorrect email or password'});
  writeCookie(res,result.access_token,Math.min(result.expires_in||3600,3600));
  return json(res,200,{success:true});
 }catch{return json(res,502,{error:'Authentication is currently unavailable'})}
};