import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let ts;
try{ts=require('/usr/local/lib/node_modules/typescript/lib/typescript.js')}catch{try{ts=require('typescript')}catch{ts=null}}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required=[
'prisma/schema.prisma','prisma/migrations/0001_greenfield_v2_mod_000_002/migration.sql',
'apps/api/src/platform/auth/session.service.ts','apps/api/src/platform/files/private-file.service.ts','apps/api/src/platform/jobs/job.service.ts','apps/api/src/platform/crypto/sensitive-field-crypto.service.ts',
'apps/api/src/modules/platform-admin/auth/platform-auth.service.ts','apps/api/src/modules/platform-admin/schools/schools.service.ts','apps/api/src/modules/platform-admin/academics/academics.service.ts','apps/api/src/modules/platform-admin/operators/operators.service.ts','apps/api/src/modules/platform-admin/tc/tc.service.ts','apps/api/src/modules/operator-auth/operator-auth.service.ts',
'apps/worker/src/main.ts','apps/web/src/app/admin/login/page.tsx','apps/web/src/app/admin/(protected)/schools/[schoolId]/transfer-certificate/ui.tsx','apps/web/src/app/operator/login/page.tsx'
];
let fail=0;
for(const f of required){if(!fs.existsSync(path.join(root,f))){console.error('MISSING',f);fail++;}}
if(fs.existsSync(path.join(root,'.github/workflows'))){console.error('Unexpected GitHub Actions workflow directory');fail++;}
function text(f){return fs.readFileSync(path.join(root,f),'utf8')}
const checks=[
['schema fresh users',!text('prisma/schema.prisma').includes('model User {')],
['separate platform users',text('prisma/schema.prisma').includes('model PlatformUser')],
['operator school binding',text('prisma/schema.prisma').includes('model SchoolOperator')&&text('prisma/schema.prisma').includes('schoolId')],
['opaque session HMAC',text('apps/api/src/platform/auth/session.service.ts').includes("createHmac('sha256'")],
['csrf guard',text('apps/api/src/common/security/csrf.guard.ts').includes('timingSafeEqual')],
['private file signature validation',text('apps/api/src/platform/files/private-file.service.ts').includes('MIME and file signature do not match')],
['trusted queue payload',text('apps/worker/src/main.ts').includes("Object.keys(payload).length!==1")],
['TC UUID',text('prisma/schema.prisma').includes('tcUuid')],
['TC encrypted snapshot',text('prisma/schema.prisma').includes('snapshotCiphertext')],
['TC student facade',text('apps/api/src/modules/platform-admin/tc/tc.service.ts').includes('getTcSnapshot')],
['school deactivation revokes sessions',text('apps/api/src/modules/platform-admin/schools/schools.service.ts').includes('SCHOOL_DEACTIVATED')],
['operator reset revokes sessions',text('apps/api/src/modules/platform-admin/operators/operators.service.ts').includes('PASSWORD_RESET')],
['append-only audit trigger',text('prisma/migrations/0001_greenfield_v2_mod_000_002/migration.sql').includes('prevent_audit_mutation')],
['admin protected SSR session',text('apps/web/src/lib/server-session.ts').includes('/platform/auth/session')],
['operator non enumeration copy',text('apps/api/src/modules/operator-auth/operator-auth.service.ts').includes('If this account can be assisted')],
];
for(const [name,ok] of checks){if(!ok){console.error('CHECK FAILED',name);fail++;}}
let syntax=0;
if(ts){
  const files=[];function walk(d){for(const ent of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.next','dist'].includes(ent.name))continue;const p=path.join(d,ent.name);if(ent.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith('.d.ts'))files.push(p)}}walk(root);
  for(const f of files){const src=fs.readFileSync(f,'utf8');const out=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.Preserve,experimentalDecorators:true,emitDecoratorMetadata:true},fileName:f,reportDiagnostics:true});for(const d of out.diagnostics||[]){if(d.category===ts.DiagnosticCategory.Error){syntax++;console.error('TS SYNTAX',path.relative(root,f),ts.flattenDiagnosticMessageText(d.messageText,' '));}}}
}else console.warn('TypeScript compiler module unavailable; syntax transpile skipped');
if(syntax)fail+=syntax;
console.log(JSON.stringify({status:fail?'FAIL':'PASS',requiredArtifacts:required.length,contractChecks:checks.length,syntaxDiagnostics:syntax},null,2));
process.exit(fail?1:0);
