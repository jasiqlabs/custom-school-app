'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

type TcRow = {id:string;tcUuid:string;studentName:string;studentCode:string;status:string;issuedAt:string;fileAvailable?:boolean};
type Student = {id:string;name?:string;fullName?:string;studentCode:string;className?:string};

export default function OperatorTcUi({session}:{session:any}) {
  const canIssue = session?.role !== 'REPORT_VIEWER' && session?.operator?.role !== 'REPORT_VIEWER';
  const [query,setQuery] = useState('');
  const [matches,setMatches] = useState<Student[]>([]);
  const [selected,setSelected] = useState<Student|null>(null);
  const [rows,setRows] = useState<TcRow[]>([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  async function load() {
    try {const r=await api<{items:TcRow[]}>('/operator/transfer-certificates');setRows(r.items||[]);}
    catch(e:any){setError(e?.message||'Unable to load transfer certificates');}
  }
  useEffect(()=>{load();},[]);
  useEffect(()=>{
    if(!rows.some(r=>r.status==='QUEUED'||r.status==='PROCESSING'))return;
    const h=setTimeout(()=>{load();},4000);return()=>clearTimeout(h);
  },[rows]);

  async function search(e:FormEvent) {
    e.preventDefault();setError('');setBusy(true);
    try{setMatches(await api<Student[]>(`/operator/transfer-certificates/students/search?q=${encodeURIComponent(query)}`));}
    catch(e:any){setError(e?.message||'Search failed');}finally{setBusy(false);}
  }
  async function issue() {
    if(!selected||busy||!canIssue)return;
    setBusy(true);setError('');setNotice('');
    try{const r=await api<{tcUuid:string}>('/operator/transfer-certificates',{
      method:'POST',body:JSON.stringify({studentId:selected.id,templateVersion:'standard-v2'}),
    });setNotice(`TC accepted: ${r.tcUuid}. PDF will be available after processing.`);setSelected(null);setMatches([]);await load();}
    catch(e:any){setError(e?.message||'Unable to issue TC');}finally{setBusy(false);}
  }
  async function download(row:TcRow) {
    setError('');
    try{const file=await api<{url:string}>(`/operator/transfer-certificates/${row.id}/download`);
      window.open(file.url,'_blank','noopener,noreferrer');
    }catch(e:any){setError(e?.message||'PDF is not available');}
  }
  async function retry(row:TcRow) {
    setError('');try{await api(`/operator/transfer-certificates/${row.id}/retry-render`,{method:'POST'});await load();}
    catch(e:any){setError(e?.message||'Retry failed');}
  }
  return <main style={{maxWidth:1000,margin:'0 auto',padding:20}}>
    <h1>Transfer Certificates</h1>
    <p>Issue a certificate only after fee clearance. Previous certificates remain available in history.</p>
    {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
    {notice&&<p role="status" style={{color:'#166534'}}>{notice}</p>}
    {canIssue&&<section style={{padding:16,border:'1px solid #ddd',borderRadius:12,marginBottom:22}}>
      <h2>Issue new certificate</h2>
      <form onSubmit={search} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <label>Student code or name <input value={query} onChange={e=>setQuery(e.target.value)} required minLength={2}/></label>
        <button type="submit" disabled={busy}>Search</button>
      </form>
      {matches.length>0&&<div style={{display:'grid',gap:8,marginTop:12}}>
        {matches.map(student=><button type="button" key={student.id}
          onClick={()=>setSelected(student)}
          style={{textAlign:'left',padding:12,borderRadius:8,border:selected?.id===student.id?'2px solid #2563eb':'1px solid #ddd'}}>
          {student.studentCode} — {student.name||student.fullName} ({student.className||'Class not available'})
        </button>)}
      </div>}
      {selected&&<div style={{marginTop:15}}>
        <strong>Selected: {selected.studentCode} — {selected.name||selected.fullName}</strong>
        <p>Fee clearance and school readiness will be checked again when you confirm.</p>
        <button type="button" disabled={busy} onClick={issue}>{busy?'Submitting…':'Confirm and issue TC'}</button>
      </div>}
    </section>}
    <h2>Certificate history</h2>
    {!rows.length&&<p>No certificates yet.</p>}
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
      <thead><tr><th>Student</th><th>TC UUID</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>{rows.map(row=><tr key={row.id}>
        <td>{row.studentCode} — {row.studentName}</td><td style={{overflowWrap:'anywhere'}}>{row.tcUuid}</td>
        <td>{row.status}</td><td>{new Date(row.issuedAt).toLocaleDateString('en-IN')}</td>
        <td>{row.status==='COMPLETED'
          ?<button type="button" onClick={()=>download(row)}>Download PDF</button>
          :row.status==='FAILED'&&canIssue
          ?<button type="button" onClick={()=>retry(row)}>Retry PDF</button>
          :<span>{row.status==='QUEUED'||row.status==='PROCESSING'?'Preparing…':'Unavailable'}</span>}</td>
      </tr>)}</tbody>
    </table></div>
  </main>;
}
