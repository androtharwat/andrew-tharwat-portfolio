import {apiFetch} from './transport';
import {useState,useRef,useEffect} from 'react';
import {House,KeyRound,Check,CheckCircle2,Phone,ShieldCheck} from 'lucide-react';
import {services,catalog,fieldsFor,numericMax,timeline,contactTime,works,type Service,type Field} from './model';
import Brand from './brand';

export default function Page(){
 const [service,setService]=useState<Service|null>(null);
 const [step,setStep]=useState(0);
 const [details,setDetails]=useState<Record<string,string>>({});
 const [name,setName]=useState('');const [phone,setPhone]=useState('');
 const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');const [done,setDone]=useState('');
 const id=useRef('');const [website,setWebsite]=useState('');
 const choose=(selected:Service)=>{if(service!==selected){setService(selected);setDetails({});id.current='';}setError('');};
 useEffect(()=>{
  const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;
  if(!context?.registerTool)return;const lifecycle=new AbortController();
  try{Promise.resolve(context.registerTool({name:'start_property_request',description:'Choose one Move Now service and display its specific property details form. Does not submit a request.',inputSchema:{type:'object',properties:{service:{type:'string',enum:Object.keys(catalog)}},required:['service'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input:unknown){const selected=(input as {service?:Service}).service;if(!selected||!Object.hasOwn(catalog,selected))throw new Error('Invalid service');setService(selected);setDetails({});id.current='';setStep(1);setError('');return {service:selected,step:'property_details'};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return()=>lifecycle.abort();
 },[]);
 const put=(key:string,value:string)=>setDetails(current=>({...current,[key]:value}));
 const field=(f:Field)=><label className="field" key={f.key}><span>{f.label}{f.required&&<b> *</b>}</span>{f.options?<select required={f.required} value={details[f.key]||''} onChange={e=>put(f.key,e.target.value)}><option value="">اختار المناسب</option>{f.options.map(option=><option key={option}>{option}</option>)}</select>:<input type={f.type} min={f.type==='number'?1:undefined} max={f.type==='number'?numericMax(f.key):undefined} step={f.type==='number'&&['area','downPayment','monthlyInstallment'].includes(f.key)?'any':1} maxLength={150} required={f.required} value={details[f.key]||''} onChange={e=>put(f.key,e.target.value)} placeholder={f.placeholder}/>}</label>;
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');if(step===1){setStep(2);return;}if(!service)return;setBusy(true);
  if(!id.current)id.current=crypto.randomUUID();
  const allowed=new Set([...(fieldsFor(service) as Field[]).map(f=>f.key),'brief',...(service.startsWith('finish')?['works']:[])]);
  const relevantDetails=Object.fromEntries(Object.entries(details).filter(([key,value])=>allowed.has(key)&&value.trim()));
  try{const response=await apiFetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id.current,name,phone,service,details:relevantDetails,consent,website})});const result=await response.json() as {id:string;error?:string};if(!response.ok)throw new Error(result.error);setDone(result.id);}catch(cause){setError(cause instanceof Error?cause.message:'تعذر الإرسال. حاول مرة أخرى.');}finally{setBusy(false);}
 }
 function reset(){setDone('');setStep(0);setService(null);setDetails({});setName('');setPhone('');setConsent(false);setWebsite('');setError('');id.current='';}
 const purchase=service?.startsWith('buy');
 return <div className="customer-view" data-step={done?'complete':step}>
  <header className="topbar"><Brand/><span className="header-tag">شراء · تشطيب · بيع · فرش · تأجير</span></header>
  <main className="intake-shell">
   <aside className="intro"><img className="story-image" src="/move-now/assets/property-transition.webp" width="1536" height="1024" fetchPriority="high" alt="تصور بصري للانتقال من وحدة خام إلى مساحة مجهزة"/><div className="story-shade"/><div className="story-content"><span className="eyebrow" dir="ltr">FROM PROPERTY TO MARKET</span><h1>مساحة جديدة.<br/><em>احتمالات أكبر.</em></h1><p>من شراء العقار كاش أو قسط، لتشطيبه وتجهيزه للبيع أو التأجير. اختار احتياجك، وفريق Move Now يكمل معاك.</p></div><div className="story-foot"><span className="story-signature" dir="ltr">Plan. Finish. Prepare. Move.</span><div className="intro-note"><ShieldCheck size={18}/><span>تفاصيلك لفريق Move Now لمتابعة طلبك.</span></div></div></aside>
   <section className="form-panel" aria-label="تقديم طلب">
    <div className="progress" aria-label={done?'اكتملت خطوات الطلب':`الخطوة ${step+1} من 3`}>{['الخدمة','تفاصيل العقار','بيانات التواصل'].map((label,index)=><div key={label} aria-current={!done&&step===index?'step':undefined} className={done?'complete':step===index?'current':step>index?'complete':''}><span>{done||step>index?<Check size={15}/>:index+1}</span>{label}</div>)}</div>
    {done&&service?<div className="success"><CheckCircle2 size={60}/><span className="eyebrow">تم تسجيل طلبك</span><h2>خطوتك الجاية بدأت.</h2><p>فريق Move Now هيراجع التفاصيل ويتواصل معاك على الواتساب لمناقشة طلبك.</p><div className="receipt"><span>رقم الطلب</span><strong dir="ltr">MN-{done.slice(0,8).toUpperCase()}</strong><span>{services[service]}</span><span dir="ltr">{phone}</span></div><button className="primary" onClick={reset}>تقديم طلب جديد</button></div>:<>
     <div className="form-heading"><span className="eyebrow">{step===0?'نبدأ باحتياجك':step===1?'التفاصيل بتفرق':'باقي خطوة واحدة'}</span><h2>{step===0?'نقدر نساعدك في إيه؟':step===1?'احكي لنا عن العقار':'نتواصل معاك إزاي؟'}</h2><p>{step===0?'اختار الخدمة المناسبة. كل مسار له تفاصيله.':step===1?'البيانات دي بتساعدنا نجهّز للتواصل معاك.':'سيب بياناتك، وفريقنا يكمل معاك الخطوة الجاية.'}</p></div>
     {step===0?<>
      {['شراء عقار','عندي عقار'].map(group=><fieldset className="service-group" key={group}><legend>{group}</legend><div className="choices service-choices">{(Object.entries(catalog) as [Service,typeof catalog[Service]][]).filter(([,definition])=>definition.group===group).map(([key,definition])=><button type="button" className={'choice '+(service===key?'selected':'')} aria-pressed={service===key} key={key} onClick={()=>choose(key)}>{group==='شراء عقار'?<KeyRound size={28}/>:<House size={28}/>}<span><strong>{definition.label}</strong><small>{definition.description}</small></span><i aria-hidden="true">{service===key&&<Check size={14}/>}</i></button>)}</div></fieldset>)}
      <button className="primary full" disabled={!service} onClick={()=>setStep(1)}>كمّل تفاصيل العقار</button><p className="minor">بدون التزام أو دفع عند إرسال الطلب.</p>
     </>:service&&<form onSubmit={submit}>
      {step===1?<>
       <div className="selected-service"><span>{services[service]}</span><button type="button" onClick={()=>setStep(0)}>تغيير الخدمة</button></div>
       <div className="form-grid">{catalog[service].fields.map(field)}{field(timeline)}</div>
       {service.startsWith('finish')&&<fieldset className="works"><legend>الأعمال اللي محتاجها (اختياري)</legend><div>{works.map((work:string)=><label key={work}><input type="checkbox" checked={(details.works||'').split('، ').includes(work)} onChange={e=>{const current=(details.works||'').split('، ').filter(Boolean);put('works',(e.target.checked?[...current,work]:current.filter(value=>value!==work)).join('، '));}}/>{work}</label>)}</div></fieldset>}
       <label className="field"><span>تفاصيل إضافية (اختياري)</span><textarea maxLength={1500} rows={3} value={details.brief||''} onChange={e=>put('brief',e.target.value)} placeholder="احكي لنا أي تفاصيل أو طلبات مهمة بالنسبة لك"/></label>
       <p className="notice">{service==='buy_installments'?'المقدم والقسط اللي بتسجلهم بيعبروا عن تفضيلاتك، علشان نراجع الخيارات المناسبة معاك.':purchase?'هنراجع طلبك ونتواصل معاك لمناقشة الخيارات المناسبة.':'عرض التشطيب والتجهيز بيتحدد بعد مراجعة الطلب والمعاينة، حسب الأعمال المطلوبة.'}</p>
      </>:<>
       <div className="selected-service"><span>{services[service]} · {details.location}</span></div>
       <div className="form-grid"><label className="field"><span>اسمك بالكامل <b>*</b></span><input autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم اللي نتواصل بيه معاك"/></label><label className="field"><span>رقم واتساب <b>*</b></span><input dir="ltr" type="tel" autoComplete="tel" required maxLength={25} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01012345678"/><small>رقم مصري أو رقم دولي مع كود الدولة.</small></label>{field(contactTime)}</div>
       <label className="field"><span>ملاحظات أخيرة (اختياري)</span><textarea maxLength={1500} rows={3} value={details.brief||''} onChange={e=>put('brief',e.target.value)} placeholder="أي معلومة تساعدنا نفهم طلبك"/></label>
       <div className="honey" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
       <label className="consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>موافق إن فريق Move Now يحتفظ ببيانات الطلب ويتواصل معايا بخصوصه على الرقم المسجّل. أقدر أطلب تعديل بياناتي أو حذفها أثناء التواصل.</span></label><p className="notice"><Phone size={16}/> بعد إرسال الطلب، فريقنا هيتواصل معاك لمراجعة التفاصيل.</p>
      </>}
      {error&&<p className="error" role="alert">{error}</p>}<div className="actions"><button type="button" className="secondary" disabled={busy} onClick={()=>{setError('');setStep(step-1)}}>رجوع</button><button className="primary" type="submit" disabled={busy}>{busy?'جاري إرسال الطلب…':step===1?'كمّل بيانات التواصل':'إرسال الطلب'}</button></div>
     </form>}
    </>}
   </section>
  </main><footer><span dir="ltr">© {new Date().getFullYear()} Move Now</span><span>FROM PROPERTY TO MARKET</span></footer>
 </div>;
}
