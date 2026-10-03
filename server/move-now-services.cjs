// Shared customer form and server validation. Legacy service IDs remain readable.
const field=(key,label,options,required=false,type='text',placeholder='')=>({key,label,options,required,type,placeholder});
const location=field('location','المنطقة اللي بتدور فيها',undefined,true,'text','مثال: القاهرة الجديدة، التجمع الخامس');
const address=field('location','عنوان العقار / المنطقة',undefined,true);
const propertyType=field('type','نوع العقار',['شقة','فيلا / تاون هاوس','دوبلكس','استوديو','عقار تجاري','أخرى'],true);
const rooms=field('rooms','عدد الغرف',undefined,false,'number');
const bathrooms=field('bathrooms','عدد الحمامات',undefined,false,'number');
const purchase=[location,propertyType,field('area','المساحة المفضلة بالمتر',undefined,false,'number'),rooms,bathrooms,field('purpose','هدفك من الشراء',['سكن شخصي','استثمار','لسه بقرر'],true),field('delivery','موعد استلام العقار المطلوب',['استلام فوري','تحت الإنشاء','محتاج اقتراح مناسب'],true)];
const finishing=[address,propertyType,field('area','مساحة العقار بالمتر',undefined,true,'number'),rooms,bathrooms,field('condition','حالة العقار الحالية',['طوب أحمر','محارة','تشطيب جزئي','متشطب بالكامل'],true),field('finishLevel','مستوى التشطيب المطلوب',['عملي واقتصادي','متوسط','فاخر','محتاج اقتراح مناسب'],true),field('style','ستايل التشطيب',['مودرن','كلاسيك','نيو كلاسيك','بسيط وعملي','محتاج اقتراحات']),field('budget','ميزانية التشطيب التقريبية (اختياري)'),field('finishPayment','طريقة السداد المفضلة للتشطيب',['دفع على مراحل التنفيذ','دفع كامل','أحتاج مناقشة خطة سداد'])];
const rental=[field('rentType','نوع الإيجار المطلوب',['إيجار طويل المدة','إيجار قصير المدة','محتاج اقتراح مناسب'],true),field('rentExpected','الإيجار المستهدف (اختياري)',undefined,false,'text','القيمة والفترة، لو محددهم')];
const catalog={
 buy_installments:{label:'اشتري عقار قسط',group:'شراء عقار',description:'حدّد المقدم والقسط المناسب وموعد الاستلام',fields:[...purchase,field('budget','ميزانية العقار الإجمالية (اختياري)'),field('downPayment','المقدم المتاح بالجنيه',undefined,true,'number'),field('monthlyInstallment','القسط الشهري المناسب بالجنيه',undefined,true,'number'),field('installmentYears','مدة التقسيط المفضلة بالسنوات (اختياري)',undefined,false,'number')]},
 buy_cash:{label:'اشتري عقار كاش',group:'شراء عقار',description:'اختار المنطقة والميزانية واحتياجك من العقار',fields:[...purchase,field('budget','ميزانية الشراء التقريبية',undefined,true,'text','مثال: من 3 إلى 4 مليون جنيه'),field('cashReadiness','توقيت جاهزية مبلغ الشراء',['جاهز حاليًا','خلال شهر','خلال 3 شهور','محتاج أحدد بعد اختيار العقار'])]},
 finish:{label:'تشطيب فقط',group:'عندي عقار',description:'جهّز وحدتك بالمستوى والأعمال المناسبة لك',fields:[...finishing,field('purpose','استخدام العقار بعد التشطيب',['سكن شخصي','استخدام تجاري','لسه بقرر'],true)]},
 finish_sale:{label:'تشطيب وبيع',group:'عندي عقار',description:'جهّز العقار للبيع وحدّد السعر والتوقيت المستهدف',fields:[...finishing,field('salePrice','سعر البيع المستهدف (اختياري)'),field('saleTimeline','الوقت المستهدف للبيع بعد التشطيب',['بمجرد انتهاء التشطيب','خلال 3 شهور بعد التشطيب','مفيش موعد محدد'],true)]},
 finish_rent:{label:'تشطيب وتأجير',group:'عندي عقار',description:'حدّد تجهيز الوحدة ونوع التأجير المناسب',fields:[...finishing,field('furnished','حالة الأثاث الحالية',['بدون أثاث','مفروش جزئيًا','مفروش بالكامل'],true),...rental]},
 finish_furnish_rent:{label:'تشطيب وفرش وتأجير',group:'عندي عقار',description:'تشطيب وتجهيز بالأثاث لبدء تأجير الوحدة',fields:[...finishing,field('furnitureScope','نطاق الفرش والتجهيز',['فرش كامل من البداية','استكمال أثاث موجود','تغيير الأثاث الموجود','محتاج معاينة لتحديد المطلوب'],true),field('furnitureBudget','ميزانية الفرش والأجهزة (اختياري)'),field('furnitureStyle','مستوى الفرش المطلوب',['عملي ومناسب للتأجير','متوسط','فاخر','محتاج اقتراح مناسب']),...rental]}
};
const timeline=field('timeline','الوقت المناسب للبدء',['في أقرب وقت','خلال شهر','خلال 3 شهور','لسه بستكشف الخيارات'],true);
const contactTime=field('contactTime','وقت التواصل المفضل',['صباحًا: 10 ص – 1 م','ظهرًا: 1 م – 5 م','مساءً: 5 م – 9 م','أي وقت مناسب'],true);
const works=['تشطيب كامل','كهربا','سباكة','أرضيات','حوائط ودهانات','نجارة وأبواب','مطبخ وحمامات','محتاج معاينة لتحديد المطلوب'];
const legacyServices={buy:'شراء عقار — طلب سابق',rent:'تأجير عقار — طلب سابق',both:'تشطيب وتأجير — طلب سابق'};
const legacyDetailKeys=['location','type','area','rooms','bathrooms','condition','budget','purpose','timeline','style','works','furnished','rentType','brief','contactTime'];
const services={...Object.fromEntries(Object.entries(catalog).map(([key,value])=>[key,value.label])),...legacyServices,sell:'بيع وحدة جاهزة'};
const detailKeys=[...new Set([...legacyDetailKeys,...Object.values(catalog).flatMap(s=>s.fields.map(f=>f.key))])];
function fieldsFor(service){return catalog[service]?[...catalog[service].fields,timeline,contactTime]:[];}
function numericMax(key){return key==='area'?100000:key==='installmentYears'?30:['downPayment','monthlyInstallment'].includes(key)?100000000000:100;}
module.exports={catalog,services,detailKeys,fieldsFor,numericMax,timeline,contactTime,works,legacyDetailKeys};
