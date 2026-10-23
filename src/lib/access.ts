import { createRemoteJWKSet, jwtVerify } from "jose";
export async function requireAccess(req:Request){
 const team=process.env.CF_ACCESS_TEAM_DOMAIN;const aud=process.env.CF_ACCESS_AUD;
 if(!team||!aud)throw new Error("ACCESS_NOT_CONFIGURED");
 const token=req.headers.get("Cf-Access-Jwt-Assertion");
 if(!token)throw new Error("UNAUTHORIZED");
 const domain=team.replace(/^https?:\/\//,"").replace(/\/$/,"");
 const issuer="https://"+domain;
 const jwks=createRemoteJWKSet(new URL(issuer+"/cdn-cgi/access/certs"));
 const {payload}=await jwtVerify(token,jwks,{issuer,audience:aud});
 if(!payload.sub)throw new Error("UNAUTHORIZED");
 return payload.sub;
}
