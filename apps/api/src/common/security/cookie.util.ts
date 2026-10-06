import { Response } from 'express';
import { AppConfig } from '../../config/app-config';
export const SESSION_COOKIE='gdys_session';
export const CSRF_COOKIE='gdys_csrf';
export function setSessionCookie(res:Response,token:string,config:AppConfig){
  const sameSite = (process.env.COOKIE_SAMESITE as 'none' | 'lax' | 'strict') || (config.cookieSecure ? 'none' : 'strict');
  res.cookie(SESSION_COOKIE,token,{httpOnly:true,secure:config.cookieSecure,sameSite,path:'/'});
}
export function clearSessionCookie(res:Response,config:AppConfig){
  const sameSite = (process.env.COOKIE_SAMESITE as 'none' | 'lax' | 'strict') || (config.cookieSecure ? 'none' : 'strict');
  res.clearCookie(SESSION_COOKIE,{httpOnly:true,secure:config.cookieSecure,sameSite,path:'/'});
}
export function setCsrfCookie(res:Response,token:string,config:AppConfig){
  const sameSite = (process.env.COOKIE_SAMESITE as 'none' | 'lax' | 'strict') || (config.cookieSecure ? 'none' : 'strict');
  res.cookie(CSRF_COOKIE,token,{httpOnly:false,secure:config.cookieSecure,sameSite,path:'/'});
}
