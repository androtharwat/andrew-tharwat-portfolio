const {catalog}=require('./move-now-services.cjs');
const fields=[
 ['clientName','اسم العميل'],['title','اللقب',['','أ/','م/','د/']],['phone','الهاتف / الواتساب'],
 ['financialClass','تصنيف العميل المالي',['','cash','installments']],
 ['route','مسار الطلب',['','buy','finish','sale','rent']],
 ['service','الخدمة المحددة',['',...Object.keys(catalog),'sell','rent']],
 ['location','المنطقة / المشروع'],['propertyType','نوع العقار'],['area','المساحة بالمتر'],['rooms','عدد الغرف'],['condition','حالة العقار'],
 ['budget','الميزانية الإجمالية'],['downPayment','المقدم'],['monthlyInstallment','القسط الشهري'],['installmentYears','مدة السداد بالسنوات'],
 ['finishLevel','مستوى التشطيب'],['furnitureScope','الفرش والتجهيز'],['rentType','نوع الإيجار'],
 ['delivery','موعد الاستلام'],['timing','توقيت التنفيذ / المعاينة'],['nextStep','الإجراء التنفيذي التالي'],
 ['whatsappConfirmed','موافقة التواصل على واتساب',['','yes','no']],['followupTime','موعد المتابعة المتفق عليه']
];
const keys=fields.map(f=>f[0]);
const choices={title:{'':'غير محدد','أ/':'أ/','م/':'م/','د/':'د/'},financialClass:{'':'غير محدد',cash:'Class A — كاش / استثمار',installments:'تسهيلات وتقسيط'},route:{'':'غير محدد',buy:'شراء',finish:'تشطيب وتجهيز',sale:'إعادة بيع',rent:'تأجير وإدارة'},service:{'':'يحتاج تحديد',...Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,v.label])),sell:'بيع وحدة جاهزة',rent:'تأجير وإدارة وحدة جاهزة'},whatsappConfirmed:{'':'لم يُؤكد',yes:'موافق',no:'غير موافق'}};
function emptyCRM(){return Object.fromEntries(keys.map(k=>[k,'']));}
function cleanCRM(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('راجع حقول المكالمة.');const crm=emptyCRM();for(const k of Object.keys(value)){if(!keys.includes(k)||typeof value[k]!=='string'||value[k].length>600)throw Error('راجع حقول المكالمة.');crm[k]=value[k].trim();}for(const [key,,options] of fields)if(options&&!options.includes(crm[key]))throw Error('اختيار غير صحيح.');return crm;}
function phoneNumber(value){let p=value.replace(/[\s()\-]/g,'').replace(/^00/,'+');if(/^01[0125]\d{8}$/.test(p))p='+20'+p.slice(1);if(/^20\d{10}$/.test(p))p='+'+p;return /^\+[1-9]\d{7,14}$/.test(p)?p:'';}
function view(crm,uncertain=[]){
 crm={...crm}; for(const key of uncertain)crm[key]='';
 const unsure=new Set(uncertain);const missing=[];
 const known=k=>Boolean(crm[k])&&!unsure.has(k);const state=(done,started)=>done?'complete':started?'partial':'empty';
 const financeKeys=crm.financialClass==='installments'?['downPayment','monthlyInstallment']:['budget'];
 const financial=financeKeys.every(known);if(crm.route&&!financial)missing.push(crm.financialClass==='installments'?'المقدم والقسط الشهري':'الميزانية أو السعر / الإيجار المستهدف');
 if(!known('service'))missing.push('الخدمة المحددة');if(!known('location'))missing.push('المنطقة أو المشروع');
 if(!known('clientName'))missing.push('اسم العميل');if(!phoneNumber(crm.phone))missing.push('رقم الهاتف / الواتساب');
 if(!known('timing')&&!known('delivery'))missing.push('التوقيت');if(!known('nextStep'))missing.push('الخطوة التالية');
 if(crm.whatsappConfirmed!=='yes')missing.push('موافقة التواصل على واتساب');if(!known('followupTime'))missing.push('موعد المتابعة');
 const compass=[{key:'service',label:'الخدمة',status:state(known('service'),!!crm.route||!!crm.service)}, {key:'location',label:'الموقع',status:state(known('location'),!!crm.location)}, {key:'finance',label:'الجانب المالي',status:state(financial,financeKeys.some(k=>crm[k])||!!crm.financialClass)}, {key:'timing',label:'التوقيت',status:state(known('timing')||known('delivery'),!!crm.timing||!!crm.delivery)}, {key:'closing',label:'القفلة والواتساب',status:state(known('nextStep')&&crm.whatsappConfirmed==='yes'&&!!phoneNumber(crm.phone)&&known('followupTime'),!!crm.nextStep||!!crm.phone||!!crm.followupTime||!!crm.whatsappConfirmed)}];
 let nudge=!crm.route?'حضرتك بتدور على شراء عقار، ولا عندك وحدة وعايز تشطيب أو بيع أو تأجير؟':!known('service')?'تحب نحدد الخدمة بالضبط: شراء كاش أو قسط، ولا تجهيز الوحدة للبيع أو التأجير؟':!known('location')?'الوحدة في أنهي منطقة أو مشروع، أو حضرتك بتدور فين؟':!financial?(crm.financialClass==='installments'?'إيه المقدم المتاح والقسط الشهري اللي يناسبك من غير ضغط؟':crm.route==='buy'?'إيه الميزانية اللي حضرتك محددها للشراء؟':'إيه الميزانية أو السعر والعائد الإيجاري اللي حضرتك مستهدفه؟'):!known('timing')&&!known('delivery')?'تحب نبدأ أو نرتب المعاينة المجانية إمتى؟':!known('nextStep')?'نرتب معاينة مجانية للوحدة، ولا نبدأ بدراسة العائد والتقييم المجاني؟':!phoneNumber(crm.phone)||crm.whatsappConfirmed!=='yes'?'ينفع نتابع مع حضرتك على واتساب؟ وإيه الرقم المناسب؟':!known('followupTime')?'إيه اليوم والوقت المناسبين أتابع مع حضرتك على واتساب؟':'المعلومات الأساسية واضحة. راجع الملخص مع العميل وثبّت الخطوة القادمة.';
 const offer=crm.nextStep.includes('معاينة')?'هننسّق معاينة مجانية من المهندس':'هنجهّز دراسة العائد وتقييم الوحدة مجانًا من غير التزام';
 const recap=`${crm.title?crm.title+' ':''}${crm.clientName||'حضرتك'}، خليني أتأكد إني فهمت طلبك: ${(crm.service?choices.service[crm.service]:'')||(crm.route?choices.route[crm.route]:'')||'هنحدد الخدمة المناسبة مع حضرتك'}${crm.location?' في '+crm.location:''}${crm.area?'، بمساحة '+crm.area+' متر':''}${crm.budget?'، والميزانية أو السعر المستهدف '+crm.budget:''}${crm.downPayment?'، بمقدم '+crm.downPayment:''}${crm.monthlyInstallment?' وقسط شهري '+crm.monthlyInstallment:''}. ${offer}.${crm.whatsappConfirmed==='yes'&&phoneNumber(crm.phone)?' ونتابع على واتساب '+crm.phone:' نأكد مع حضرتك رقم وموافقة التواصل على واتساب'}${crm.followupTime?'، في '+crm.followupTime:'. ونحدد ميعاد متابعة مناسب لحضرتك'}.`;
 return {compass,missing,nudge,recap};
}
module.exports={fields,keys,choices,emptyCRM,cleanCRM,phoneNumber,view};
