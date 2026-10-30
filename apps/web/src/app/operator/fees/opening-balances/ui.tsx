'use client';
import { useState, useRef } from 'react';
import { api, API_BASE } from '@/lib/api';
import { FeesNav } from '@/features/fees/components/fees-nav';

type Row = { rowNumber:number; studentCode:string; categoryCode:string; feeMonth:string; amount:string; status:string; errorText?:string|null };
type ImportStatus = { id:string;fileName:string;asOfDate:string;status:string;totalRows:number;validRows:number;errorRows:number;importedRows:number;remaining:number;rows?:Row[];items?:Row[];page:number };
const formatError = (e:any) => e?.message || 'Import request failed';
export function OpeningBalancesUi() {
 const [file,setFile]=useState<File|null>(null);
 const [asOfDate,setAsOfDate]=useState(()=>new Date().toISOString().slice(0,10));
 const [job,setJob]=useState<ImportStatus|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const active=useRef(false);
 async function load(id:string) {const s=await api<ImportStatus>(`/operator/fees/opening-balances/${id}`);setJob(s);return s;}
 async function template() {
   try {const res=await fetch(`${API_BASE}/operator/fees/opening-balances/template`,{credentials:'include'});
     if(!res.ok)throw new Error('Template download not authorized');
     const url=URL.createObjectURL(await res.blob()),a=document.createElement('a');a.href=url;a.download='opening-balances-template.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
   }catch(e:any){setError(formatError(e));}
 }
 async function preview() {
   if(!file||busy)return;setBusy(true);setError('');
   try {
     if(file.size>10*1024*1024)throw new Error('Choose a file smaller than 10 MB');
     const fileBase64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
     const status=await api<ImportStatus>('/operator/fees/opening-balances/preview',{method:'POST',body:JSON.stringify({fileBase64,fileName:file.name,asOfDate})});
     setJob(status);
   }catch(e:any){setError(formatError(e));}finally{setBusy(false);}
 }
 async function process() {
   if(!job||busy)return;setError('');setBusy(true);active.current=true;
   try{
     let current=job;
     for(let i=0;i<110&&active.current;i++){
       current=await api<ImportStatus>(`/operator/fees/opening-balances/${current.id}/process`,{method:'POST'});
       setJob(current);
       if(current.status==='COMPLETED'||current.remaining<=0)break;
       if(current.status==='FAILED')throw new Error('Import stopped due to validation error');
     }
   }catch(e:any){setError(formatError(e));}finally{active.current=false;setBusy(false);}
 }
 return <main style={{maxWidth:1100,margin:'0 auto',padding:18}}>
   <FeesNav/><h1>Opening balances</h1>
   <p>Import old outstanding fees with their original month and student. Historical external payments are not recreated as new receipts.</p>
   <button type="button" onClick={template}>Download Excel template</button>
   <section style={{display:'grid',gap:12,maxWidth:600,marginTop:20,padding:16,border:'1px solid #ddd',borderRadius:10}}>
     <label>Balance as of <input type="date" value={asOfDate} onChange={e=>setAsOfDate(e.target.value)}/></label>
     <label>CSV or Excel file <input type="file" accept=".csv,.xlsx" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
     <button type="button" disabled={!file||busy} onClick={preview}>{busy?'Processing…':'1. Validate and preview'}</button>
   </section>
   {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
   {job&&<section style={{marginTop:24,padding:16,border:'1px solid #ddd',borderRadius:10}}>
     <h2>2. Review import</h2><p>File: {job.fileName} | State: <strong>{job.status}</strong></p>
     <p>{job.totalRows} rows, {job.validRows} valid, {job.errorRows} errors, {job.importedRows} imported, {job.remaining} remaining</p>
     {job.errorRows>0&&<p role="alert" style={{color:'#b91c1c'}}>Correct the errors in the source file and preview again. No rows have been imported.</p>}
     <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
       <thead><tr><th>Row</th><th>Student</th><th>Fee / Period</th><th>Amount</th><th>Status / Error</th></tr></thead>
       <tbody>{(job.items||job.rows||[]).map((row,index)=><tr key={row.rowNumber||index}>
         <td>{row.rowNumber}</td><td>{row.studentCode}</td><td>{row.categoryCode} {row.feeMonth}</td>
         <td>{row.amount}</td><td>{row.errorText||row.status}</td>
       </tr>)}</tbody>
     </table></div>
     {job.status!=='COMPLETED'&&job.errorRows===0&&<button type="button" disabled={busy} onClick={process}>{busy?'Importing…':'3. Confirm and import'}</button>}
     <button type="button" disabled={busy} onClick={()=>load(job.id)} style={{marginLeft:12}}>Refresh status</button>
     {job.status==='COMPLETED'&&<p role="status">Import completed. Source references are retained for audit.</p>}
   </section>}
 </main>;
}
