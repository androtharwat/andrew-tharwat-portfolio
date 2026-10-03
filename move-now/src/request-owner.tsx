import {useEffect,useState} from 'react';
import {apiFetch} from './transport';
import type {Lead} from './model';
export type Member={email:string;name:string};

export async function updateLead(lead:Lead){
 const response=await apiFetch('/api/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:lead.id,status:lead.status,assigned:lead.assigned,notes:lead.notes,nextFollowup:lead.next_followup,updatedAt:lead.updated_at})});
 const result=await response.json() as {error?:string;updatedAt:number};
 if(!response.ok)throw new Error(result.error||'تعذر حفظ المتابعة.');
 return result.updatedAt;
}

export default function RequestOwner({lead,members,onSaved}:{lead:Lead;members:Member[];onSaved:()=>void}){
 const [assigned,setAssigned]=useState(lead.assigned);
 const [saving,setSaving]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{setAssigned(lead.assigned)},[lead.assigned]);
 async function save(){setSaving(true);setMessage('');try{await updateLead({...lead,assigned});setMessage('تم حفظ المسؤول.');onSaved()}catch(cause){setMessage(cause instanceof Error?cause.message:'تعذر حفظ المسؤول.')}finally{setSaving(false)}}
 return <div className="request-owner"><select aria-label={'المسؤول عن الطلب: '+lead.name} value={assigned} disabled={saving||!members.length} onChange={event=>{setAssigned(event.target.value);setMessage('')}}><option value="">غير محدد</option>{assigned&&!members.some(member=>member.email===assigned)&&<option value={assigned}>{assigned} — حساب سابق</option>}{members.map(member=><option value={member.email} key={member.email}>{member.name} — {member.email}</option>)}</select>{assigned!==lead.assigned&&<button type="button" className="secondary small" disabled={saving} onClick={save}>{saving?'جاري الحفظ…':'حفظ المسؤول'}</button>}{message&&<small role="status" className={message==='تم حفظ المسؤول.'?'saved':'error'}>{message}</small>}{lead.next_followup&&<small>موعد: {lead.next_followup}</small>}</div>;
}
