import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
export const developerScopes=['carbon.read','facilities.read','reports.read','targets.read'] as const;
export const webhookEvents=['activity.created','calculation.completed','report.published','target.updated','evidence.approved'] as const;
export function hashSecret(value:string){return createHash('sha256').update(value).digest('hex')}
export function createApiCredential(){const secret=`bc_live_${randomBytes(28).toString('base64url')}`;return{secret,prefix:secret.slice(0,16),hash:hashSecret(secret)}}
export function createWebhookSecret(){const secret=`whsec_${randomBytes(32).toString('base64url')}`;return{secret,hash:hashSecret(secret)}}
export function secretMatches(value:string,expectedHash:string){const actual=Buffer.from(hashSecret(value),'hex'),expected=Buffer.from(expectedHash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected)}
export function normalizeScopes(value:unknown){const items=Array.isArray(value)?value.map(String):[];return [...new Set(items.filter(item=>(developerScopes as readonly string[]).includes(item)))]}
export function normalizeEvents(value:unknown){const items=Array.isArray(value)?value.map(String):[];return [...new Set(items.filter(item=>(webhookEvents as readonly string[]).includes(item)))]}
export function validWebhookUrl(value:unknown){try{const url=new URL(String(value));return url.protocol==='https:'&&!url.username&&!url.password}catch{return false}}
export function safeMarketplaceManifest(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))return{};const manifest=value as Record<string,unknown>;return{type:String(manifest.type??'declarative'),...('industry'in manifest?{industry:String(manifest.industry)}:{}),...('framework'in manifest?{framework:String(manifest.framework)}:{}),...('connectorKey'in manifest?{connectorKey:String(manifest.connectorKey)}:{}),...('provider'in manifest?{provider:String(manifest.provider)}:{}),...('model'in manifest?{model:String(manifest.model)}:{}),executesCode:false}}
