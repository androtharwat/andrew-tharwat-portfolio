
(() => {
  const KEY='ats_admin_language_v1';

  const EN_AR={
    // Access / shell
    'ATS':'ATS','CONTROL CENTER.':'مركز التحكم','CONTROL CENTER':'مركز التحكم',
    'No email. No password. Approve this browser once and it will open the Control Center automatically every time.':'بدون بريد أو كلمة مرور. وافق على هذا المتصفح مرة واحدة وسيفتح مركز التحكم تلقائيًا بعد ذلك.',
    'TRUST THIS DEVICE':'اعتماد هذا الجهاز','RETRY ACCESS':'إعادة محاولة الدخول','CHECKING…':'جارٍ التحقق…','CREATING DEVICE…':'جارٍ إنشاء الجهاز…',
    'Your browser will create a private device key that stays only on this device.':'سينشئ المتصفح مفتاح جهاز خاصًا يظل محفوظًا على هذا الجهاز فقط.',
    'DEVICE APPROVAL CODE':'كود اعتماد الجهاز','Send this 6-digit code to me here in ChatGPT. Once I approve it, this page will open automatically.':'أرسل كود الـ6 أرقام هنا في ChatGPT. بعد اعتماده ستفتح الصفحة تلقائيًا.',
    'Waiting for approval…':'في انتظار الاعتماد…','One-time approval pending. After approval this browser stays trusted.':'في انتظار الاعتماد لمرة واحدة. بعد الموافقة سيظل هذا المتصفح موثوقًا.',
    'TRUSTED DEVICE':'جهاز موثوق','View Website ↗':'عرض الموقع ↗','Forget This Device':'إلغاء اعتماد هذا الجهاز',

    // Navigation / topbar
    'ATS CONTROL CENTER':'مركز تحكم ATS','Dashboard':'لوحة المتابعة','CLIENT OPERATIONS':'إدارة العملاء',
    'Leads':'العملاء المحتملون','Client Inbox':'صندوق العميل','Clients':'العملاء','Client Projects':'مشاريع العملاء',
    'Proposals':'العروض','Payments':'المدفوعات','WEBSITE':'الموقع','Website Projects':'مشاريع الموقع',
    'Categories':'التصنيفات','Site Content':'محتوى الموقع','V9 Layout':'تنسيق V9','Media Library':'مكتبة الوسائط',
    '+ WEBSITE PROJECT':'+ مشروع للموقع','All Site Text':'كل نصوص الموقع','FULL TEXT CMS':'إدارة نصوص الموقع',
    'Every editable word':'كل النصوص القابلة للتعديل',

    // Dashboard
    'NEW LEADS':'عملاء محتملون جدد','Awaiting review':'في انتظار المراجعة',
    'FOLLOW-UPS DUE':'متابعات مستحقة','Need your action':'تحتاج إجراء منك',
    'CLIENT INBOX':'صندوق العميل','Unread messages':'رسائل غير مقروءة',
    'ACTIVE CLIENTS':'عملاء نشطون','Client records':'سجلات العملاء',
    'ACTIVE PROJECTS':'مشاريع نشطة','In delivery':'قيد التنفيذ',
    'PENDING PAYMENTS':'مدفوعات معلقة','Need confirmation':'تحتاج تأكيد',
    'PROPOSALS OUT':'عروض مرسلة','Awaiting decision':'في انتظار القرار',
    'PRIORITY QUEUE':'قائمة الأولويات','Needs Attention':'تحتاج اهتمامك','REFRESH':'تحديث',
    'LATEST':'الأحدث','Recent Leads':'أحدث العملاء المحتملين','OPEN LEADS':'فتح العملاء المحتملين',
    'WEBSITE CONTENT':'محتوى الموقع','MANAGE WEBSITE':'إدارة الموقع',
    'Website Projects':'مشاريع الموقع','Total project items':'إجمالي عناصر المشاريع',
    'Published':'منشور','Visible on website':'ظاهر على الموقع','Drafts':'مسودات','Work in progress':'قيد العمل',
    'Website structure':'هيكل الموقع','RECENT CONTENT':'أحدث المحتوى','Latest Website Projects':'أحدث مشاريع الموقع',
    'Manage Website Projects':'إدارة مشاريع الموقع','Nothing needs immediate attention.':'لا توجد عناصر تحتاج إجراءً فوريًا.',
    'Could not load operations dashboard.':'تعذر تحميل لوحة العمليات.','Dashboard load failed':'فشل تحميل لوحة المتابعة.',
    'Follow-up due':'متابعة مستحقة','Client message':'رسالة من العميل','Review new lead':'مراجعة عميل محتمل جديد',
    'Pending payment':'دفعة معلقة','Unknown':'غير معروف','Unnamed lead':'عميل محتمل بدون اسم','Individual':'فرد','Not specified':'غير محدد',

    // Search / filters / generic
    'Search lead, company, email, phone…':'ابحث بالاسم أو الشركة أو البريد أو الهاتف…',
    'Search message, project, client…':'ابحث في الرسائل أو المشاريع أو العملاء…',
    'Search client, email, phone…':'ابحث عن عميل أو بريد أو هاتف…',
    'Search project, client, stage…':'ابحث عن مشروع أو عميل أو مرحلة…',
    'Search proposal or lead…':'ابحث عن عرض أو عميل محتمل…',
    'Search payment code or reference…':'ابحث بكود الدفع أو المرجع…',
    'Search projects...':'ابحث في المشاريع…','Search text, section or key...':'ابحث في النص أو القسم أو المفتاح…',
    'All statuses':'كل الحالات','All client activity':'كل نشاط العميل','All pages':'كل الصفحات','All sections':'كل الأقسام',
    'All status':'كل الحالات','All pages':'كل الصفحات',
    'Messages':'الرسائل','Revision requests':'طلبات التعديل','Client uploads':'ملفات العميل','New project requests':'طلبات مشاريع جديدة',
    'Active':'نشط','Completed':'مكتمل','Paused':'متوقف مؤقتًا','Draft':'مسودة','Sent':'مرسل','Accepted':'مقبول',
    'Declined':'مرفوض','Expired':'منتهي','Pending':'معلق','Paid':'مدفوع','Overdue':'متأخر',
    'New':'جديد','Contacted':'تم التواصل','Discovery':'استكشاف','Reviewing':'قيد المراجعة','Reviewing · Legacy':'قيد المراجعة · قديم',
    'Qualified':'مؤهل','Proposal Sent':'تم إرسال العرض','Negotiation':'تفاوض','Won':'تم الفوز','Lost':'مفقود',
    'new':'جديد','contacted':'تم التواصل','discovery':'استكشاف','reviewing':'قيد المراجعة','qualified':'مؤهل',
    'proposal sent':'تم إرسال العرض','negotiation':'تفاوض','won':'تم الفوز','lost':'مفقود',
    'pending':'معلق','paid':'مدفوع','overdue':'متأخر','active':'نشط','completed':'مكتمل','paused':'متوقف مؤقتًا',
    'draft':'مسودة','sent':'مرسل','accepted':'مقبول','declined':'مرفوض','expired':'منتهي','published':'منشور','hidden':'مخفي',
    'OPEN':'فتح','OPEN →':'فتح ←','OPEN WORKSPACE':'فتح مساحة العميل','EDIT':'تعديل','VIEW ↗':'عرض ↗',
    'ACCEPT':'قبول','MARK PAID':'تأكيد الدفع','SAVE':'حفظ','SAVED ✓':'تم الحفظ ✓','SAVING…':'جارٍ الحفظ…',
    'ERROR':'خطأ','CLOSE':'إغلاق','CANCEL':'إلغاء','DELETE':'حذف','UPLOAD':'رفع','EMAIL':'البريد','WHATSAPP ↗':'واتساب ↗',

    // Table headers
    'ACTIVITY':'النشاط','PROJECT':'المشروع','DETAIL':'التفاصيل','DATE':'التاريخ',
    'LEAD':'العميل المحتمل','SERVICE':'الخدمة','NEXT ACTION':'الإجراء التالي','STATUS':'الحالة','RECEIVED':'تاريخ الاستلام',
    'CLIENT':'العميل','PHONE':'الهاتف','SINCE':'منذ','STAGE':'المرحلة','PROGRESS':'التقدم','DUE':'الاستحقاق',
    'PROPOSAL':'العرض','CLIENT / LEAD':'العميل / العميل المحتمل','TOTAL':'الإجمالي','DEPOSIT':'العربون',
    'PAYMENT':'الدفعة','TYPE':'النوع','AMOUNT':'المبلغ',

    // Inbox
    'Client uploaded a file':'رفع العميل ملفًا','New project request':'طلب مشروع جديد',
    'No matching client activity.':'لا يوجد نشاط عميل مطابق.','MESSAGE':'رسالة','REVISION':'تعديل','UPLOAD':'رفع','LEAD':'عميل محتمل',

    // Leads list / workspace
    'No matching leads.':'لا يوجد عملاء محتملون مطابقون.','No due date':'بدون موعد استحقاق','Not set':'غير محدد',
    'CLIENT BRIEF':'بريف العميل','What they told us':'ما الذي أخبرنا به العميل','Structured from the original intake':'منظم من بيانات العميل الأصلية',
    'View original intake':'عرض الطلب الأصلي','ATS UNDERSTANDING':'فهم ATS','Turn the intake into a clear problem':'حوّل كلام العميل إلى مشكلة واضحة',
    'Internal · editable':'داخلي · قابل للتعديل','WHAT WE UNDERSTAND':'ما الذي فهمناه','Write the problem in clear ATS language…':'اكتب المشكلة بصياغة ATS واضحة…',
    'MISSING INFORMATION':'المعلومات الناقصة','One missing item per line…':'اكتب كل معلومة ناقصة في سطر…',
    'CURRENT ASSETS':'الأصول الحالية','No structured assets listed.':'لا توجد أصول منظمة مسجلة.',
    'RELATIONSHIP HISTORY':'سجل العلاقة','Communication Timeline':'الخط الزمني للتواصل',
    'ATS NEXT MOVE':'خطوة ATS التالية','What happens next?':'ما الخطوة التالية؟',
    'FIT':'مدى الملاءمة','High Fit':'ملاءمة عالية','Medium Fit':'ملاءمة متوسطة','Low Fit':'ملاءمة منخفضة',
    'FIT REASON':'سبب الملاءمة','Why is this a good / weak fit for ATS?':'لماذا هذا العميل مناسب أو غير مناسب لـ ATS؟',
    'Choose next action':'اختر الإجراء التالي','Discovery call':'مكالمة استكشاف','WhatsApp follow-up':'متابعة واتساب',
    'Email follow-up':'متابعة بالبريد','Request information / assets':'طلب معلومات / أصول','Internal review':'مراجعة داخلية',
    'Prepare proposal':'إعداد عرض','Follow up proposal':'متابعة العرض','Waiting for client':'في انتظار العميل',
    'Start onboarding':'بدء التهيئة','Await deposit payment':'انتظار دفع العربون','Closed':'مغلق',
    'DUE DATE':'موعد الاستحقاق','PREFERRED CHANNEL':'قناة التواصل المفضلة','WhatsApp':'واتساب','Email':'بريد إلكتروني','Call':'مكالمة','Portal':'بوابة العميل',
    'LOST REASON':'سبب فقد العميل','Budget, timing, no response, not ATS fit…':'الميزانية، التوقيت، عدم الرد، عدم الملاءمة لـ ATS…',
    'START DISCOVERY':'بدء الاستكشاف','SAVE NEXT MOVE':'حفظ الخطوة التالية',
    'CONTACT':'التواصل','Reach the client':'تواصل مع العميل','No contact logged':'لم يتم تسجيل تواصل',
    'CHANNEL':'القناة','OUTCOME':'النتيجة','No response':'لا يوجد رد','Waiting for client':'في انتظار العميل',
    'Discovery completed':'اكتمل الاستكشاف','SUMMARY':'ملخص','What happened? What did the client say?':'ماذا حدث؟ وماذا قال العميل؟',
    '+ LOG INTERACTION':'+ تسجيل تواصل','PRIVATE':'داخلي','Internal Notes':'ملاحظات داخلية','Never shown to client':'لا تظهر للعميل',
    'Context, concerns, commercial notes, handover details…':'السياق، الملاحظات، الأمور التجارية، تفاصيل التسليم…',
    'CREATE PROPOSAL →':'إنشاء عرض ←','Qualify the lead before creating a proposal.':'يجب تأهيل العميل قبل إنشاء العرض.',
    'SAVE & CLOSE':'حفظ وإغلاق','SAVE LEAD':'حفظ العميل المحتمل','Lead workspace saved':'تم حفظ مساحة العميل المحتمل.',
    'Set one clear next action before leaving this lead.':'حدد إجراءً واضحًا واحدًا قبل مغادرة هذا العميل المحتمل.',
    'OVERDUE · This follow-up needs attention.':'متأخر · هذه المتابعة تحتاج اهتمامك.',
    'Converted client · manage delivery from Client Projects.':'تم تحويله إلى عميل · أدر التنفيذ من مشاريع العملاء.',
    'Add a lost reason before closing this lead':'أضف سبب فقد العميل قبل إغلاقه.',
    'Set the ATS fit before qualifying this lead':'حدد مدى ملاءمة العميل لـ ATS قبل تأهيله.',
    'Write the ATS understanding before qualifying this lead':'اكتب فهم ATS للمشكلة قبل تأهيل العميل.',
    'Write the problem in clear ATS language…':'اكتب المشكلة بصياغة ATS واضحة…',
    'Interaction added to timeline':'تمت إضافة التواصل إلى الخط الزمني.',
    'Add a short interaction summary':'أضف ملخصًا قصيرًا للتواصل.',
    'Discovery workflow started':'تم بدء مسار الاستكشاف.',
    'Lead received':'تم استلام العميل المحتمل','Status changed':'تم تغيير الحالة','Client contact logged':'تم تسجيل التواصل مع العميل',
    'Next action updated':'تم تحديث الإجراء التالي','Discovery started':'بدأ الاستكشاف','Proposal created':'تم إنشاء العرض',
    'Proposal sent':'تم إرسال العرض','Proposal accepted':'تم قبول العرض',
    'Primary audience / people affected':'الجمهور الأساسي / الأشخاص المتأثرون','Success criteria / measurable outcome':'معايير النجاح / نتيجة قابلة للقياس',
    'Timeline / urgency':'الجدول الزمني / درجة الاستعجال','Budget / investment range':'الميزانية / نطاق الاستثمار',
    'Available assets / references':'الأصول / المراجع المتاحة','Original brief':'البريف الأصلي',
    'Challenge / Goal':'التحدي / الهدف','Audience':'الجمهور','Success looks like':'شكل النجاح','Current stage':'المرحلة الحالية',
    'Possible expertise':'الخبرات المحتملة','Original client words':'كلمات العميل الأصلية','Context link':'رابط السياق',
    'Current situation':'الوضع الحالي','Core problem':'المشكلة الأساسية','Possible direction':'الاتجاه المقترح','Likely capabilities':'القدرات المحتملة',
    'Issue':'المشكلة','Context':'السياق','Jurisdiction':'جهة التطبيق','People exposed':'الأشخاص المعرضون','Immediate danger':'خطر فوري','Control concern':'مشكلة في وسائل التحكم',

    // Proposal
    'COMMERCIAL':'تجاري','New Proposal':'عرض جديد','Edit Proposal':'تعديل العرض','Select lead':'اختر العميل المحتمل',
    'TITLE':'العنوان','SCOPE':'النطاق','DELIVERABLES · ONE PER LINE':'المخرجات · عنصر في كل سطر','TIMELINE':'المدة',
    'REVISIONS':'التعديلات','TOTAL · EGP':'الإجمالي · جنيه','DEPOSIT %':'نسبة العربون %','VALID UNTIL':'صالح حتى',
    'TERMS':'الشروط','SAVE PROPOSAL':'حفظ العرض','+ NEW PROPOSAL':'+ عرض جديد',
    'Title, scope and deliverables are required':'العنوان والنطاق والمخرجات مطلوبة.',
    'Proposal saved':'تم حفظ العرض','Proposal saved and marked sent':'تم حفظ العرض وتسجيله كمرسل.',
    'Mark this proposal accepted and create the deposit request?':'هل تريد اعتماد العرض وإنشاء طلب العربون؟',
    'Proposal accepted · deposit created':'تم قبول العرض · تم إنشاء طلب العربون',
    'Select a lead':'اختر العميل المحتمل',
    'Payment confirmed':'تم تأكيد الدفع',
    'At least one brief step must remain visible':'يجب أن تظل خطوة واحدة على الأقل من خطوات البريف ظاهرة.',
    'Confirm this payment as paid?':'هل تريد تأكيد هذه الدفعة كمدفوعة؟',


    // Client/project lists
    'No clients yet.':'لا يوجد عملاء حتى الآن.','No client projects yet.':'لا توجد مشاريع عملاء حتى الآن.',
    'No proposals yet.':'لا توجد عروض حتى الآن.','No payments yet.':'لا توجد مدفوعات حتى الآن.',
    'Project':'مشروع','Client':'عميل','Payment':'دفعة','Lead':'عميل محتمل',

    // Client project workspace
    'Onboarding':'التهيئة','Content Preparation':'إعداد المحتوى','Design':'التصميم','Development':'التطوير',
    'Internal QA':'مراجعة الجودة الداخلية','Client Review':'مراجعة العميل','Revisions':'التعديلات',
    'Final Approval':'الموافقة النهائية','Final Payment':'الدفعة النهائية','Deployment':'الإطلاق','Completed':'مكتمل',
    'On Track':'على المسار','At Risk':'معرّض للخطر','Blocked':'متوقف',
    'HEALTH':'حالة المشروع','PROGRESS %':'نسبة التقدم %','CLIENT ACTION':'المطلوب من العميل','INTERNAL ACTION':'الإجراء الداخلي',
    'CLIENT-VISIBLE UPDATE':'تحديث ظاهر للعميل','Write a concise update for the Client Portal…':'اكتب تحديثًا مختصرًا لبوابة العميل…',
    'POST CLIENT UPDATE':'نشر تحديث للعميل','REFRESH COLLABORATION':'تحديث التعاون',
    'CLIENT MESSAGES':'رسائل العميل','Write a direct message to the client…':'اكتب رسالة مباشرة للعميل…','SEND MESSAGE':'إرسال الرسالة',
    'FILES · REVIEWS · REVISIONS':'الملفات · المراجعات · التعديلات','Review':'مراجعة','Final Delivery':'التسليم النهائي',
    'Reference':'مرجع','Internal':'داخلي','Version':'الإصدار','SAVE PROJECT':'حفظ المشروع',
    'Loading messages…':'جارٍ تحميل الرسائل…','Loading files…':'جارٍ تحميل الملفات…','Loading reviews…':'جارٍ تحميل المراجعات…',
    'No messages in this project yet.':'لا توجد رسائل في هذا المشروع حتى الآن.','No project files yet.':'لا توجد ملفات للمشروع حتى الآن.',
    'No reviews published yet.':'لا توجد مراجعات منشورة حتى الآن.','Message sent to Client Portal':'تم إرسال الرسالة إلى بوابة العميل.',
    'Write a message first':'اكتب رسالة أولًا.','Choose a file first':'اختر ملفًا أولًا.','Maximum file size is 25 MB':'الحد الأقصى لحجم الملف 25 ميجابايت.',
    'Final Delivery is locked until the project is fully paid':'التسليم النهائي مغلق حتى اكتمال دفع قيمة المشروع.',
    'Move project to Deployment or Completed first':'انقل المشروع إلى مرحلة الإطلاق أو مكتمل أولًا.',
    'Final file released to Client Portal':'تم إتاحة الملف النهائي في بوابة العميل.','Project updated':'تم تحديث المشروع.',
    'Client-visible update posted':'تم نشر التحديث للعميل.','Write the client update first':'اكتب تحديث العميل أولًا.',

    // Website project editor
    'Project Editor':'محرر المشروع','PROJECT EDITOR':'محرر المشروع','New Project':'مشروع جديد','Edit Project':'تعديل المشروع',
    'Project Title':'عنوان المشروع','Slug':'المسار المختصر','Category':'التصنيف','Short Description':'وصف مختصر','Full Description':'الوصف الكامل',
    'Challenge':'التحدي','Solution':'الحل','Result / Impact':'النتيجة / الأثر','Cover Image URL':'رابط صورة الغلاف',
    'Upload Cover':'رفع الغلاف','Video URL':'رابط الفيديو','Live Project URL':'رابط المشروع المباشر','GitHub URL':'رابط GitHub',
    'Sort Order':'ترتيب العرض','Tags':'الكلمات المفتاحية','comma separated':'مفصولة بفواصل','Tools':'الأدوات',
    'Feature on homepage':'إبرازه في الصفحة الرئيسية','Project Gallery':'معرض المشروع','images/videos can be added after saving':'يمكن إضافة الصور/الفيديوهات بعد الحفظ',
    'SAVE PROJECT':'حفظ المشروع','ADD PROJECT':'إضافة مشروع','+ ADD PROJECT':'+ إضافة مشروع','Title and slug are required.':'العنوان والمسار المختصر مطلوبان.',
    'Project saved.':'تم حفظ المشروع.','Project deleted.':'تم حذف المشروع.','Remove this media item?':'هل تريد حذف عنصر الوسائط هذا؟',
    'Uncategorized':'بدون تصنيف','Featured':'مميز','No projects yet.':'لا توجد مشاريع حتى الآن.','No matching projects.':'لا توجد مشاريع مطابقة.',
    'PUBLISH FIRST':'انشر أولًا','PAGE ON':'الصفحة مفعلة','PAGE OFF':'الصفحة مغلقة',
    'Publish the project before enabling its page':'انشر المشروع قبل تفعيل صفحته',
    'Click to disable cover/page opening':'اضغط لإيقاف فتح الغلاف/الصفحة','Click to enable cover/page opening':'اضغط لتفعيل فتح الغلاف/الصفحة',
    'Controls card click + project page':'يتحكم في فتح الكارت وصفحة المشروع','Publish the project first.':'انشر المشروع أولًا.',
    'Project page enabled.':'تم تفعيل صفحة المشروع.','Project page locked.':'تم إغلاق صفحة المشروع.',

    // Categories
    'STRUCTURE':'الهيكل','Categories / Worlds':'التصنيفات / العوالم','+ ADD CATEGORY':'+ إضافة تصنيف','CATEGORY':'التصنيف',
    'New Category':'تصنيف جديد','Edit Category':'تعديل التصنيف','Name':'الاسم','Description':'الوصف','Color':'اللون',
    'Active':'نشط','Category saved.':'تم حفظ التصنيف.','Category deleted.':'تم حذف التصنيف.',

    // Site content
    'HERO':'الواجهة الرئيسية','Main Message':'الرسالة الرئيسية','Eyebrow':'العنوان الصغير','Title':'العنوان','Subtitle':'العنوان الفرعي',
    'ABOUT':'من نحن','Your Story':'قصتك','Body':'النص','STATS':'الإحصائيات','Numbers':'الأرقام','Years':'السنوات','Projects':'المشاريع',
    'Worlds':'العوالم','Purpose':'الهدف','CONTACT':'التواصل','Links':'الروابط','SAVE WEBSITE CONTENT':'حفظ محتوى الموقع',
    'Website content updated.':'تم تحديث محتوى الموقع.',
    'Instagram — Personal':'إنستجرام — شخصي','Instagram — DO Stories':'إنستجرام — قصص DO','Instagram — DO Document':'إنستجرام — مستند DO',
    'Safety, AI Video, Storytelling':'سلامة، فيديو بالذكاء الاصطناعي، سرد قصصي','HSE, AI, Web':'سلامة، ذكاء اصطناعي، ويب',
    'my-project':'my-project','WIDE':'عريض',

    // V9
    'SELECTED WORK':'الأعمال المختارة','Homepage Project Layout':'تنسيق مشاريع الصفحة الرئيسية','Columns':'الأعمدة',
    'Reorder, resize or hide published website projects without changing their published status.':'غيّر الترتيب والحجم أو أخفِ المشاريع المنشورة دون تغيير حالة النشر.',
    'SPECIALIST NETWORK':'شبكة المتخصصين','Expertise Presentation':'عرض الخبرات','Founder width':'عرض المؤسس',
    'PROJECT BRIEF':'بريف المشروع','Problem-First Steps':'خطوات تبدأ من المشكلة','ONE CONTROL CENTER':'مركز تحكم واحد',
    'Public V9':'واجهة V9 العامة','These settings control presentation only. ATS positioning and core brand language stay locked.':'هذه الإعدادات تتحكم في العرض فقط. تموضع ATS ولغة البراند الأساسية يظلان ثابتين.',
    'OPEN WEBSITE ↗':'فتح الموقع ↗','SAVE V9 LAYOUT':'حفظ تنسيق V9','V9 layout saved':'تم حفظ تنسيق V9.',

    // Media
    'ASSET LIBRARY':'مكتبة الأصول','Media':'الوسائط','UPLOAD MEDIA':'رفع وسائط','Uploading...':'جارٍ الرفع...',
    'COPY URL':'نسخ الرابط','URL copied.':'تم نسخ الرابط.','Media uploaded.':'تم رفع الوسائط.','Media deleted.':'تم حذف الوسائط.',
    'No media uploaded yet.':'لم يتم رفع وسائط حتى الآن.','Delete this media file?':'هل تريد حذف ملف الوسائط هذا؟',
    'MEDIA CONTENT & ORDER':'محتوى الوسائط وترتيبها','Briefs, Viewer Interaction & ترتيب العناصر':'البريف، تفاعل المشاهدين وترتيب العناصر',
    'DRAG TO SORT':'اسحب للترتيب','SAVE ORDER':'حفظ الترتيب','SAVE NEW ORDER':'حفظ الترتيب الجديد',
    'Title — English':'العنوان — إنجليزي','Title — Arabic':'العنوان — عربي','Brief — English':'البريف — إنجليزي','Brief — Arabic':'البريف — عربي',
    'Video title':'عنوان الفيديو','Short context about this content...':'سياق مختصر عن هذا المحتوى…','SAVE ITEM':'حفظ العنصر',
    'VIEWS':'مشاهدة','Private admin metric':'مؤشر خاص بالإدارة','Drag to reorder':'اسحب لإعادة الترتيب','Move up':'تحريك لأعلى','Move down':'تحريك لأسفل',
    'SAVING ORDER…':'جارٍ حفظ الترتيب…','ORDER SAVED ✓':'تم حفظ الترتيب ✓','ERROR — TRY AGAIN':'خطأ — أعد المحاولة',

    // Full text CMS
    'Edit the fixed website copy here in English and Arabic. Project titles, descriptions, challenge, solution and impact remain editable inside each project. Media titles and briefs remain inside the media editor.':'عدّل نصوص الموقع الثابتة هنا بالإنجليزية والعربية. عناوين ووصف وتحدي وحل وأثر المشاريع تظل داخل كل مشروع، وعناوين وبريفات الوسائط داخل محرر الوسائط.',
    'RELOAD':'إعادة تحميل','SAVE ALL CHANGES':'حفظ كل التغييرات','Open this tab to load site text.':'افتح هذا القسم لتحميل نصوص الموقع.',
    'English':'الإنجليزية','Arabic':'العربية','No text items match this filter.':'لا توجد عناصر نصية تطابق هذا الفلتر.',
    'Loading site text…':'جارٍ تحميل نصوص الموقع…','NOTHING TO SAVE':'لا توجد تغييرات للحفظ','ALL SAVED ✓':'تم حفظ الكل ✓',

    // AI / bilingual content editor
    'AI PROJECT AUTOFILL — EN + AR':'الملء التلقائي للمشروع بالذكاء الاصطناعي — عربي + إنجليزي',
    'BILINGUAL AI':'ذكاء اصطناعي ثنائي اللغة','GENERATE EN + AR':'توليد عربي + إنجليزي','Ready':'جاهز',
    'Generating bilingual project data…':'جارٍ توليد بيانات المشروع باللغتين…','AI IS WRITING EN + AR…':'الذكاء الاصطناعي يكتب بالعربي والإنجليزي…',
    'Arabic project version':'النسخة العربية للمشروع',

    // General system
    'ATS — Control Center':'ATS — مركز التحكم',
    'Open Leads to load live data.':'افتح العملاء المحتملين لتحميل البيانات المباشرة.',
    'Open Client Inbox to load live client activity.':'افتح صندوق العميل لتحميل نشاط العميل المباشر.',
    'Open Clients to load live data.':'افتح العملاء لتحميل البيانات المباشرة.',
    'Open Client Projects to load live data.':'افتح مشاريع العملاء لتحميل البيانات المباشرة.',
    'Open Proposals to load live data.':'افتح العروض لتحميل البيانات المباشرة.',
    'Open Payments to load live data.':'افتح المدفوعات لتحميل البيانات المباشرة.',
    'Open V9 Layout to load settings.':'افتح تنسيق V9 لتحميل الإعدادات.',
    'Status':'الحالة','SAVE CATEGORY':'حفظ التصنيف','NEW':'جديد','Loading activity…':'جارٍ تحميل النشاط…',
    'Upload below or paste URL':'ارفع الملف بالأسفل أو الصق الرابط','Close lead workspace':'إغلاق مساحة العميل المحتمل',
    'Received':'تم الاستلام','Last contact':'آخر تواصل',
    'HSE & TECHNICAL':'السلامة والصحة المهنية · تقني','SOFTWARE & AUTOMATION':'البرمجيات والأتمتة',
    'DESIGN & VISUAL':'التصميم والهوية البصرية','VIDEO & MOTION':'الفيديو والموشن',
    'CONTENT & STORYTELLING':'المحتوى والسرد القصصي','AI PRODUCTION':'إنتاج بالذكاء الاصطناعي',
    'CHALLENGE & OUTCOME':'التحدي والنتيجة','STARTING POINT':'نقطة البداية','POSSIBLE EXPERTISE':'الخبرات المحتملة',
    'SCOPE & TIMING':'النطاق والتوقيت','Next action':'الإجراء التالي','Client Portal':'بوابة العميل',
    'UPLOADING…':'جارٍ الرفع…','Upload revised review file and publish the next version':'ارفع ملف المراجعة المعدل وانشر الإصدار التالي',
    'Project saved, but stage timeline could not sync:':'تم حفظ المشروع، لكن تعذر مزامنة الخط الزمني للمرحلة:',
    'Qualify the lead before creating a proposal':'قم بتأهيل العميل المحتمل قبل إنشاء عرض.',
    'Device verification timed out.':'انتهت مهلة التحقق من الجهاز.','Windows browser':'متصفح Windows','Trusted browser':'متصفح موثوق',
    'AI generation failed':'فشل التوليد بالذكاء الاصطناعي',
    'Loading live data…':'جارٍ تحميل البيانات المباشرة…','Loading…':'جارٍ التحميل…',
    'Could not load':'تعذر التحميل','SAVE CHANGES':'حفظ التغييرات','No action required':'لا يوجد إجراء مطلوب',
    'The security check is taking too long. Your existing browser approval is محفوظ. Press RETRY ACCESS.':'فحص الأمان يستغرق وقتًا أطول من المتوقع. اعتماد المتصفح الحالي محفوظ. اضغط إعادة محاولة الدخول.',
    'Control Center could not confirm this browser right now. Press RETRY ACCESS.':'تعذر على مركز التحكم التحقق من هذا المتصفح الآن. اضغط إعادة محاولة الدخول.',
    'This browser is not registered yet. Create a one-time approval request.':'هذا المتصفح غير مسجل بعد. أنشئ طلب اعتماد لمرة واحدة.',
    'This device is no longer approved. Create a new approval request.':'لم يعد هذا الجهاز معتمدًا. أنشئ طلب اعتماد جديد.',
    'Website data could not load':'تعذر تحميل بيانات الموقع',
    'admin only':'للإدارة فقط','client visible':'ظاهر للعميل'
  };

  // Arabic strings that existed natively in some admin plugins.
  const AR_EN={
    'النسخة العربية للمشروع':'Arabic project version',
    'تظهر تلقائيًا للزائر عند اختيار «عربي» في الموقع.':'It appears automatically when the visitor selects Arabic on the website.',
    'عنوان المشروع بالعربية':'Project title — Arabic',
    'الوصف المختصر بالعربية':'Short description — Arabic',
    'الوصف الكامل بالعربية':'Full description — Arabic',
    'التحدي بالعربية':'Challenge — Arabic','الحل بالعربية':'Solution — Arabic','النتيجة / الأثر بالعربية':'Result / Impact — Arabic',
    'الكلمات المفتاحية بالعربية':'Tags — Arabic','الأدوات بالعربية':'Tools — Arabic',
    'العربي':'Arabic','العنوان — عربي':'Title — Arabic','البريف — عربي':'Brief — Arabic',
    'تفعيل آراء المشاهدين + 👍 / 👎':'Enable viewer feedback + 👍 / 👎',
    'ترتيب العرض:':'Display order:',
    'احفظ وارفع الميديا أولًا، ثم افتح المشروع مرة أخرى لإضافة البريف والتفاعل وترتيب العناصر.':'Save and upload media first, then reopen the project to add briefs, interaction and ordering.',
    'اسحب العناصر لأعلى وأسفل أو استخدم الأسهم. عداد المشاهدات خاص بالـAdmin فقط ولا يظهر لزوار الموقع.':'Drag items up/down or use the arrows. View counts are private to Admin and are not shown to website visitors.',
    'هيملأ المحتوى باللغتين فقط. حالة Published/Draft لن يغيرها.':'It fills content in both languages only. Published/Draft status will not change.',
    'اكتب وصف بسيط بالعربي أو الإنجليزي. الـAI هيجهز نسخة إنجليزية ونسخة عربية احترافية في نفس الوقت. راجعهم قبل الحفظ.':'Write a simple brief in Arabic or English. AI will prepare professional English and Arabic versions together. Review them before saving.',
    'مثال: عملت سلسلة فيديوهات HSE لمشروع ميناء في شرق بورسعيد، مبنية على مخاطر حقيقية من الموقع وNEBOSH... اكتب أي تفاصيل حقيقية تعرفها.':'Example: I created an HSE video series for a port project based on real site risks and NEBOSH principles. Add any real details you know.',
    'سلامة، ذكاء اصطناعي، تصميم':'Safety, AI, Design',
    'تقييم مخاطر، تطوير ويب، تصميم':'Risk Assessment, Web Development, Design',
    'ترتيب العناصر':'Item ordering',
    'العنصر رقم 01 يظهر أولًا، ثم 02، ثم 03... وعدد المشاهدات يحسب المشاهدين الفريدين لكل فيديو.':'Item 01 appears first, then 02, then 03. View counts track unique viewers for each video.',
    'عنوان الفيديو':'Video title',
    'اكتب بريف مختصر يشرح محتوى الفيديو والرسالة منه...':'Write a short brief explaining the content and its message...',
    'اكتب وصف بسيط للمشروع الأول':'Write a simple project description first'

  };

  const AR_TO_EN={};
  for(const [en,ar] of Object.entries(EN_AR)) if(ar&&ar!==en) AR_TO_EN[ar]=en;
  Object.assign(AR_TO_EN,AR_EN);

  let lang=(localStorage.getItem(KEY)==='en'||localStorage.getItem(KEY)==='ar')?localStorage.getItem(KEY):'ar';
  const originalText=new WeakMap();
  const originalAttrs=new WeakMap();
  let applying=false,observer=null;

  function canonical(raw){
    const s=String(raw??'');
    return AR_TO_EN[s]||s;
  }

  function translatePattern(core,target){
    if(target!=='ar') return core;
    let m;
    if((m=core.match(/^Received (.+)$/))) return 'تم الاستلام '+m[1];
    if((m=core.match(/^Due (.+)$/))) return 'الاستحقاق '+m[1];
    if((m=core.match(/^OVERDUE · (.+)$/))) return 'متأخر · '+m[1];
    if((m=core.match(/^Last contact (.+)$/))) return 'آخر تواصل '+m[1];
    if((m=core.match(/^Lead received from (.+)$/))) return 'تم استلام العميل المحتمل من '+m[1];
    if((m=core.match(/^Revision request #(\d+)$/))) return 'طلب تعديل رقم '+m[1];
    if((m=core.match(/^Revision #(\d+) (.+)$/))) return 'التعديل رقم '+m[1]+' · '+m[2];
    if((m=core.match(/^Order (\d+) • Active$/))) return 'الترتيب '+m[1]+' • نشط';
    if((m=core.match(/^Order (\d+) • Hidden$/))) return 'الترتيب '+m[1]+' • مخفي';
    if((m=core.match(/^(\d+) of (\d+) text items shown$/))) return m[1]+' من أصل '+m[2]+' عنصر نصي';
    if((m=core.match(/^SAVING (\d+)…$/))) return 'جارٍ حفظ '+m[1]+'…';
    if((m=core.match(/^Delete (.+)\?$/))) return 'هل تريد حذف '+m[1]+'؟';
    if((m=core.match(/^(.+) uploaded$/))) return 'تم رفع '+m[1];
    if((m=core.match(/^Revision #(\d+) completed$/))) return 'تم إكمال التعديل رقم '+m[1];
    return core;
  }

  function t(raw,target=lang){
    if(raw===null||raw===undefined)return raw;
    const source=canonical(String(raw));
    if(target==='en')return source;
    return EN_AR[source]||translatePattern(source,target);
  }

  function formatDate(value,options){
    if(!value)return '—';
    const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);
    const locale=lang==='ar'?'ar-EG-u-nu-latn':'en-GB';
    return new Intl.DateTimeFormat(locale,options||{day:'2-digit',month:'short',year:'numeric'}).format(d);
  }
  function formatNumber(value){
    const locale=lang==='ar'?'ar-EG-u-nu-latn':'en-US';
    return new Intl.NumberFormat(locale).format(Number(value||0));
  }

  function skippedText(node){
    const el=node.parentElement;if(!el)return true;
    if(el.closest('script,style,pre,code,[data-i18n-skip]'))return true;
    if(el.closest('textarea,input'))return true;
    if(el.matches('.entity-title b,.entity-title small,.lead-contact-summary b,.lead-brief-grid p,.asset-chip-list span,.message-bubble p,.collab-row p,.recent-item h3,.project-row h3,.category-row h3,.text-cms-card-head strong,.text-cms-card-head small'))return true;
    if(el.matches('td')&&!el.closest('th'))return true;
    return false;
  }

  function translateTextNode(node){
    if(skippedText(node))return;
    if(!originalText.has(node))originalText.set(node,node.nodeValue);
    const original=originalText.get(node);
    const m=String(original).match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core=m?.[2]??original;
    if(!core.trim())return;
    const next=(m?.[1]||'')+t(core,lang)+(m?.[3]||'');
    if(node.nodeValue!==next)node.nodeValue=next;
  }

  function translateAttrs(el){
    if(!el||el.nodeType!==1)return;
    if(!originalAttrs.has(el))originalAttrs.set(el,{});
    const store=originalAttrs.get(el);
    for(const attr of ['placeholder','title','aria-label']){
      if(!el.hasAttribute(attr))continue;
      if(!(attr in store))store[attr]=el.getAttribute(attr);
      const original=store[attr];
      const next=t(original,lang);
      if(el.getAttribute(attr)!==next)el.setAttribute(attr,next);
    }
  }

  function apply(root=document){
    if(applying)return;applying=true;
    try{
      const base=root.nodeType===3?root:root;
      if(base.nodeType===3)translateTextNode(base);
      else{
        translateAttrs(base);
        const walker=document.createTreeWalker(base,NodeFilter.SHOW_TEXT);
        let n;while((n=walker.nextNode()))translateTextNode(n);
        if(base.querySelectorAll)base.querySelectorAll('[placeholder],[title],[aria-label]').forEach(translateAttrs);
      }
      document.documentElement.lang=lang==='ar'?'ar':'en';
      document.documentElement.dir=lang==='ar'?'rtl':'ltr';
      document.title=lang==='ar'?'ATS — مركز التحكم':'ATS — Control Center';
      document.body?.classList.toggle('admin-ar',lang==='ar');
      document.body?.classList.toggle('admin-en',lang==='en');
      document.querySelectorAll('[data-admin-lang]').forEach(b=>b.classList.toggle('active',b.dataset.adminLang===lang));
    }finally{applying=false}
  }

  function setLang(next){
    if(next!=='ar'&&next!=='en')return;
    lang=next;localStorage.setItem(KEY,lang);apply(document);
    window.dispatchEvent(new CustomEvent('ats-admin-language-change',{detail:{lang}}));
  }

  function createSwitch(id){
    const wrap=document.createElement('div');
    wrap.id=id;wrap.className='admin-language-switch';wrap.setAttribute('data-i18n-skip','');
    wrap.innerHTML='<button type="button" data-admin-lang="ar">عربي</button><span>|</span><button type="button" data-admin-lang="en">EN</button>';
    wrap.addEventListener('click',e=>{const b=e.target.closest('[data-admin-lang]');if(b)setLang(b.dataset.adminLang)});
    return wrap;
  }
  function injectSwitch(){
    if(!document.getElementById('admin-language-switch')){
      const top=document.querySelector('.top-actions');if(top)top.prepend(createSwitch('admin-language-switch'));
    }
    if(!document.getElementById('admin-language-switch-auth')){
      const auth=document.querySelector('.auth-card');if(auth)auth.prepend(createSwitch('admin-language-switch-auth'));
    }
  }

  function boot(){
    injectSwitch();
    apply(document);
    observer=new MutationObserver(ms=>{
      if(applying)return;
      for(const m of ms){
        if(m.type==='characterData')translateTextNode(m.target);
        for(const n of m.addedNodes||[]){
          if(n.nodeType===3)translateTextNode(n);
          else if(n.nodeType===1)apply(n);
        }
        if(m.type==='attributes')translateAttrs(m.target);
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
  }

  window.ATS_I18N={
    t:(key,vars)=>{
      let out=t(key,lang);
      if(vars)for(const [k,v] of Object.entries(vars))out=String(out).replaceAll('{'+k+'}',v);
      return out;
    },
    setLang,
    apply,
    formatDate,
    formatNumber,
    get lang(){return lang}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();