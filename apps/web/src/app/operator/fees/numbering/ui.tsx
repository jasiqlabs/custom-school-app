'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FeesNav } from '@/features/fees/components/fees-nav';
type Policy='LEGACY'|'CONTINUOUS'|'ACADEMIC_YEAR'|'FINANCIAL_YEAR';
type Settings={version:number;receiptNumberPolicy:Policy;receiptNumberPrefix:string;studentNumberPolicy:Policy;studentNumberPrefix:string};
const choices: {key:Policy;label:string}[]=[
  {key:'LEGACY',label:'Existing numbering (keep current format)'},
  {key:'CONTINUOUS',label:'Continuous'},
  {key:'ACADEMIC_YEAR',label:'Reset for academic year'},
  {key:'FINANCIAL_YEAR',label:'Reset for financial year (April–March)'},
];
export function NumberingUi(){
  const [data,setData]=useState<Settings|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  async function load(){try{setData(await api<Settings>('/operator/numbering'));}catch(e:any){setError(e?.message||'Cannot load numbering settings');}}
  useEffect(()=>{load();},[]);
  async function save(e:React.FormEvent){
    e.preventDefault();if(!data||busy)return;setBusy(true);setError('');setSuccess('');
    try{setData(await api<Settings>('/operator/numbering',{method:'PATCH',body:JSON.stringify(data)}));
      setSuccess('Settings saved. Existing student IDs and receipts are unchanged.');
    }catch(e:any){setError(e?.message||'Could not save settings');}finally{setBusy(false);}
  }
  const label=(field:'receipt'|'student')=>field==='receipt'?'Receipt numbers':'Student codes';
  return <main style={{maxWidth:930,margin:'0 auto',padding:20}}>
    <FeesNav/><h1>Numbering settings</h1>
    <p>Change how <strong>new</strong> receipt numbers and student codes are allocated. Existing numbers will never be reset or changed. Keep Existing to preserve the current format.</p>
    {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
    {success&&<p role="status" style={{color:'#166534'}}>{success}</p>}
    {!data?<p>Loading settings…</p>:<form onSubmit={save} style={{display:'grid',gap:20}}>
      {(['receipt','student'] as const).map(kind=>{
        const policyKey=kind==='receipt'?'receiptNumberPolicy':'studentNumberPolicy';
        const prefixKey=kind==='receipt'?'receiptNumberPrefix':'studentNumberPrefix';
        return <fieldset key={kind} style={{border:'1px solid #ddd',borderRadius:10,padding:16}}>
          <legend style={{fontWeight:700}}>{label(kind)}</legend>
          <label>Numbering system
            <select value={data[policyKey]} onChange={e=>setData({...data,[policyKey]:e.target.value as Policy})}
              style={{display:'block',padding:8,width:'100%',maxWidth:500,marginTop:6}}>
              {choices.map(c=><option value={c.key} key={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label style={{display:'block',marginTop:14}}>Prefix
            <input value={data[prefixKey]} maxLength={12} required pattern="[A-Z0-9_-]{2,12}"
              onChange={e=>setData({...data,[prefixKey]:e.target.value.toUpperCase()})}
              style={{display:'block',padding:8,marginTop:6}}/>
          </label>
          <small>The prefix is only applied in newly chosen numbering systems. Existing mode keeps prior numbering.</small>
        </fieldset>;
      })}
      <button type="submit" disabled={busy}>{busy?'Saving…':'Save numbering settings'}</button>
    </form>}
  </main>;
}
