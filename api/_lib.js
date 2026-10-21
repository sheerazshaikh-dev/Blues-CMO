const BASE = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
function configured(){return Boolean(BASE && SECRET && ADMIN_EMAIL)}
function headers(extra={}){return {'apikey':SECRET,'Authorization':'Bearer '+SECRET,...extra}}
function json(res,status,body){res.status(status).setHeader('Cache-Control','no-store').json(body)}
function cookie(req){const match=(req.headers.cookie||'').match(/(?:^|;\s*)blues_admin=([^;]+)/);return match?decodeURIComponent(match[1]):null}
function originOk(req){const origin=req.headers.origin;if(!origin)return true;try{const o=new URL(origin),host=req.headers['x-forwarded-host']||req.headers.host;return o.host===host&&o.protocol==='https:'||o.host===host&&process.env.NODE_ENV!=='production'}catch{return false}}
async function supa(path,opts={}){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);try{return await fetch(BASE+path,{...opts,headers:headers(opts.headers||{}),signal:controller.signal})}finally{clearTimeout(timer)}}
async function adminUser(req){if(!configured())return null;const token=cookie(req);if(!token)return null;const response=await supa('/auth/v1/user',{headers:{Authorization:'Bearer '+token}});if(!response.ok)return null;const user=await response.json();return user?.email?.toLowerCase()===ADMIN_EMAIL?user:null}
function writeCookie(res,token,maxAge){const secure=process.env.NODE_ENV==='production'?'; Secure':'';res.setHeader('Set-Cookie',`blues_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`)}
module.exports={BASE,SECRET,ADMIN_EMAIL,configured,headers,json,cookie,originOk,supa,adminUser,writeCookie};