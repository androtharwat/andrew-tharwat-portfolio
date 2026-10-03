import {services as serviceLabels,catalog as definitions,fieldsFor,numericMax,timeline,contactTime,works} from '../../server/move-now-services.cjs';
export type Service='buy_installments'|'buy_cash'|'finish'|'finish_sale'|'finish_rent'|'finish_furnish_rent';
export type Field={key:string;label:string;options?:string[];required:boolean;type:string;placeholder:string};
export const catalog=definitions as Record<Service,{label:string;group:string;description:string;fields:Field[]}>;
export const services=serviceLabels as Record<Service|'buy'|'rent'|'both',string>;
export {fieldsFor,numericMax,timeline,contactTime,works};
export const statuses = {new:'طلب جديد',contacted:'تم التواصل',visit:'معاينة / مقابلة',offer:'عرض سعر / خيارات',active:'جاري التنفيذ',done:'مكتمل',closed:'مغلق'} as const;
export const labels:Record<string,string>={location:'المنطقة / المدينة',type:'نوع العقار',area:'المساحة بالمتر',rooms:'عدد الغرف',bathrooms:'عدد الحمامات',condition:'حالة العقار',purpose:'هدفك من العقار',timeline:'الوقت المناسب',style:'ستايل التشطيب',works:'الأعمال المطلوبة',furnished:'حالة الأثاث',rentType:'نوع الإيجار',brief:'تفاصيل إضافية',contactTime:'وقت التواصل المفضل',...Object.fromEntries(Object.values(catalog).flatMap(s=>s.fields.map(f=>[f.key,f.label]))),budget:'الميزانية المتاحة'};
export type Lead={id:string;name:string;phone:string;service:keyof typeof services;details:string;status:keyof typeof statuses;assigned:string;notes:string;next_followup:string;created_at:number;updated_at:number};

export function detailLabel(service:Lead['service'],key:string){return (fieldsFor(service) as Field[]).find(f=>f.key===key)?.label||labels[key]||key;}
