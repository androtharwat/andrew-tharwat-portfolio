(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  if (!cfg || !window.supabase) {
    alert('Supabase configuration is missing.');
    return;
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PORTFOLIO_DEVICE_KEY = 'andrew_portfolio_device_v2';
  const FIELD_DEVICE_KEY = 'ats_field_sourcing_device_v1';
  const BUCKET = 'studio-sourcing';

  const state = {
    sb: null,
    access: null,
    device: null,
    suppliers: [],
    visits: [],
    media: [],
    missions: [],
    activities: [],
    helpRequests: [],
    devices: [],
    activityPollTimer: null,
    supportPollTimer: null,
    lastActivityKey: '',
    track: 'do_story',
    editingVisitId: null,
    pendingFiles: [],
    focusMissionId: null,
    guidedIndex: 0,
    guidedStages: []
  };

  const REQUIRED = {
    do_story: {
      checks: ['a5_full_color','paper_sample_seen','written_quote'],
      fields: ['supplier-name','supplier-phone','lead-time','moq'],
      labels: {
        a5_full_color:'تأكيد A5 Full Color',
        paper_sample_seen:'رؤية عينة الورق',
        written_quote:'سعر مكتوب',
        'supplier-name':'اسم المورد',
        'supplier-phone':'رقم الهاتف',
        'lead-time':'مدة التنفيذ',
        moq:'أقل كمية MOQ'
      }
    },
    string_art: {
      checks: ['wood_sample_seen','router_clean_edge','paint_sample_seen','written_quote'],
      fields: ['supplier-name','supplier-phone','lead-time','moq'],
      labels: {
        wood_sample_seen:'رؤية خامة الخشب',
        router_clean_edge:'فحص جودة حواف الـCNC',
        paint_sample_seen:'رؤية عينة الدهان',
        written_quote:'سعر مكتوب',
        'supplier-name':'اسم المورد',
        'supplier-phone':'رقم الهاتف',
        'lead-time':'مدة التنفيذ',
        moq:'أقل كمية MOQ'
      }
    },
    opportunity: {
      checks: ['opportunity_name','use_case','written_quote'],
      fields: ['supplier-name','supplier-phone'],
      labels: {
        opportunity_name:'اسم الفرصة / الخدمة',
        use_case:'استخدامها الحقيقي للمشروع',
        written_quote:'سعر مكتوب',
        'supplier-name':'اسم المورد',
        'supplier-phone':'رقم الهاتف'
      }
    }
  };

  const GUIDED_REQUIRED = {
    do_story: [
      ['a5_full_color','print_method'],
      ['paper_type','paper_gsm','paper_sample_seen'],
      ['cover_gsm','lamination','binding'],
      ['written_quote']
    ],
    string_art: [
      ['wood_type','wood_thickness','wood_sample_seen','router_clean_edge'],
      ['surface_prep','paint_type','paint_sample_seen'],
      ['nail_type','rust_resistant','thread_type','thread_quality','hanger'],
      ['packaging','written_quote']
    ],
    opportunity: [
      ['opportunity_name','opportunity_type'],
      ['use_case'],
      ['written_quote']
    ]
  };

  const TRACKS = {
    do_story: {
      label: 'DO STORY',
      title: 'DO STORY — Checklist المطبعة',
      groups: [
        {
          title: 'الطباعة والملف',
          items: [
            { k: 'a5_full_color', t: 'check', l: 'A5 — Full Color — وجه وظهر' },
            { k: 'print_method', t: 'select', l: 'طريقة الطباعة الأنسب', o: ['Digital', 'Offset', 'Other'] },
            { k: 'sample_possible', t: 'check', l: 'يمكن عمل نسخة Sample قبل الكمية' },
            { k: 'color_proof', t: 'check', l: 'يوجد Color Proof / تجربة ألوان' },
            { k: 'cmyk', t: 'check', l: 'أكد أن الملفات المطلوبة CMYK' },
            { k: 'file_format', t: 'text', l: 'صيغة الملف المطلوبة', p: 'PDF / PDF-X...' },
            { k: 'bleed', t: 'text', l: 'Bleed المطلوب', p: 'مثال: 3 mm' },
            { k: 'dpi', t: 'text', l: 'الدقة المطلوبة', p: 'مثال: 300 DPI' }
          ]
        },
        {
          title: 'الورق الداخلي',
          items: [
            { k: 'paper_type', t: 'select', l: 'الخامة', o: ['Couché Matte', 'Couché Glossy', 'Silk / Semi-Matte', 'Other'] },
            { k: 'paper_gsm', t: 'select', l: 'الوزن', o: ['130 gsm', '150 gsm', '170 gsm', 'Other'] },
            { k: 'paper_sample_seen', t: 'check', l: 'شفت عينة الورق بإيدك' },
            { k: 'paper_recommendation', t: 'text', l: 'ترشيح المطبعة للخامة الأفضل', p: 'الخامة + السبب' }
          ]
        },
        {
          title: 'الغلاف والتجليد',
          items: [
            { k: 'cover_gsm', t: 'select', l: 'وزن الغلاف', o: ['250 gsm', '300 gsm', '350 gsm', 'Other'] },
            { k: 'lamination', t: 'select', l: 'السلوفان', o: ['Matte', 'Gloss', 'None'] },
            { k: 'binding', t: 'select', l: 'التجليد', o: ['Saddle Stitch', 'Perfect Binding', 'Thread Stitching', 'Hardcover', 'Other'] },
            { k: 'premium_finish', t: 'text', l: 'تشطيب Premium متاح', p: 'Foil / Spot UV / Embossing...' },
            { k: 'rounded_corners', t: 'check', l: 'Rounded Corners متاحة' },
            { k: 'shrink_wrap', t: 'check', l: 'Shrink Wrap فردي متاح' }
          ]
        },
        {
          title: 'الجودة والتعامل',
          items: [
            { k: 'samples_photographed', t: 'check', l: 'صورت عينات الطباعة والتجليد' },
            { k: 'written_quote', t: 'check', l: 'أخذت السعر مكتوب / رسالة واضحة' },
            { k: 'bulk_discount', t: 'check', l: 'سألت عن خصم الكميات' },
            { k: 'defect_policy', t: 'text', l: 'التعامل مع العيوب وإعادة الطباعة', p: 'اكتب سياسة المورد' },
            { k: 'delivery', t: 'text', l: 'التوصيل وتكلفته', p: 'متاح؟ التكلفة؟' },
            { k: 'payment_terms', t: 'text', l: 'شروط الدفع', p: 'مقدم / باقي / كاش...' }
          ]
        }
      ],
      prices: [
        ['q1', 'نسخة واحدة'], ['q5', '5 نسخ'], ['q10', '10 نسخ'], ['q25', '25 نسخة'],
        ['q50', '50 نسخة'], ['q100', '100 نسخة'], ['q250', '250 نسخة'], ['q500', '500 نسخة']
      ]
    },
    string_art: {
      label: 'STRING ART',
      title: 'STRING ART — Checklist الورشة',
      groups: [
        {
          title: 'الخشب والـCNC',
          items: [
            { k: 'wood_type', t: 'select', l: 'أفضل خامة', o: ['MDF', 'HDF', 'Plywood', 'Natural Wood', 'Other'] },
            { k: 'wood_thickness', t: 'select', l: 'السمك المقترح', o: ['8 mm', '10 mm', '12 mm', '15 mm', '18 mm', 'Other'] },
            { k: 'wood_sample_seen', t: 'check', l: 'شفت الخامة فعليًا' },
            { k: 'router_clean_edge', t: 'check', l: 'حواف الـRouter / CNC نظيفة' },
            { k: 'edge_finish', t: 'select', l: 'تشطيب الحواف', o: ['Straight', 'Rounded Edge', 'Chamfer', 'Other'] },
            { k: 'pilot_holes', t: 'check', l: 'يمكن تحديد / فتح أماكن المسامير بالـCNC' },
            { k: 'nail_count', t: 'text', l: 'عدد المسامير المقترح', p: '60 / 80 / 100...' }
          ]
        },
        {
          title: 'الدهان والفنش',
          items: [
            { k: 'surface_prep', t: 'text', l: 'تجهيز الخشب قبل الدهان', p: 'Sanding / Filler / Primer / Sealer' },
            { k: 'paint_type', t: 'select', l: 'نوع الدهان', o: ['Automotive', 'PU', 'Lacquer', 'Spray', 'Oven / Premium Finish', 'Other'] },
            { k: 'finish_level', t: 'select', l: 'الفنش', o: ['Matte', 'Satin', 'Gloss'] },
            { k: 'paint_sample_seen', t: 'check', l: 'شفت عينة دهان حقيقية' },
            { k: 'scratch_resistance', t: 'check', l: 'سألت عن مقاومة الخدش وثبات اللون' }
          ]
        },
        {
          title: 'المسامير والخيط والتعليق',
          items: [
            { k: 'nail_type', t: 'text', l: 'نوع / لون / مقاس المسمار', p: 'فضي / أسود / ذهبي + الطول' },
            { k: 'rust_resistant', t: 'check', l: 'المسامير مقاومة للصدأ' },
            { k: 'nail_caps', t: 'text', l: 'Nail Caps / أغطية المسامير', p: 'متاحة؟ السعر؟' },
            { k: 'thread_type', t: 'text', l: 'نوع الخيط الأفضل', p: 'Cotton / Polyester / Embroidery...' },
            { k: 'thread_quality', t: 'check', l: 'الخيط قوي وثابت اللون ولا يعمل وبر' },
            { k: 'hanger', t: 'select', l: 'طريقة التعليق', o: ['Sawtooth', 'D-Ring', 'Hidden Hanger', 'Other'] },
            { k: 'wall_protection', t: 'check', l: 'Felt / Rubber خلف اللوحة لحماية الحائط' }
          ]
        },
        {
          title: 'Packaging والتعامل',
          items: [
            { k: 'packaging', t: 'text', l: 'طريقة التغليف', p: 'Bubble / Foam / Carton / Custom Box' },
            { k: 'nail_protection', t: 'check', l: 'التغليف يحمي المسامير والخيط أثناء الشحن' },
            { k: 'written_quote', t: 'check', l: 'أخذت السعر مكتوب / رسالة واضحة' },
            { k: 'bulk_discount', t: 'check', l: 'سألت عن خصم الكميات' },
            { k: 'defect_policy', t: 'text', l: 'التعامل مع القطعة المعيبة', p: 'إعادة تنفيذ / إصلاح...' },
            { k: 'delivery', t: 'text', l: 'التوصيل وتكلفته', p: 'متاح؟ التكلفة؟' }
          ]
        }
      ],
      prices: [
        ['piece', 'قطعة واحدة'], ['q5', '5 قطع'], ['q10', '10 قطع'],
        ['q25', '25 قطعة'], ['q50', '50 قطعة'], ['q100', '100 قطعة'],
        ['size30', 'دائرة 30cm'], ['size40', 'دائرة 40cm']
      ]
    },
    opportunity: {
      label: 'OPPORTUNITY',
      title: 'Opportunity Capture — اكتشاف جديد',
      groups: [
        {
          title: 'الخدمة أو المنتج',
          items: [
            { k: 'opportunity_name', t: 'text', l: 'اسم الخدمة / المنتج', p: 'مثال: UV Printing on Wood' },
            { k: 'opportunity_type', t: 'select', l: 'التصنيف', o: ['Printing', 'Laser', 'CNC', 'UV', 'Packaging', 'Acrylic', 'Wood', 'Gift Product', 'Other'] },
            { k: 'customizable', t: 'check', l: 'يمكن تنفيذ Custom Design خاص بنا' },
            { k: 'sample_seen', t: 'check', l: 'شفت Sample حقيقية' },
            { k: 'files_required', t: 'text', l: 'صيغة الملفات المطلوبة', p: 'PDF / AI / SVG...' }
          ]
        },
        {
          title: 'القيمة للمشروع',
          items: [
            { k: 'use_case', t: 'text', l: 'إزاي ممكن تخدم DO أو String Art؟', p: 'اكتب الاستخدام الحقيقي' },
            { k: 'quality_improvement', t: 'check', l: 'تحسن جودة المنتج' },
            { k: 'cost_reduction', t: 'check', l: 'قد تقلل تكلفة التنفيذ' },
            { k: 'new_product', t: 'check', l: 'تفتح منتج / Bundle جديد' },
            { k: 'supplier_advice', t: 'text', l: 'إيه اللي المورد شايف إننا نغيره؟', p: 'نصيحته في الخامة أو التنفيذ' }
          ]
        },
        {
          title: 'التعامل التجاري',
          items: [
            { k: 'written_quote', t: 'check', l: 'أخذت السعر مكتوب' },
            { k: 'bulk_discount', t: 'check', l: 'سألت عن سعر التعامل المستمر' },
            { k: 'payment_terms', t: 'text', l: 'شروط الدفع', p: 'مقدم / باقي...' },
            { k: 'delivery', t: 'text', l: 'التوصيل', p: 'المدة والتكلفة' },
            { k: 'defect_policy', t: 'text', l: 'سياسة العيوب والاستبدال', p: 'اكتب التفاصيل' }
          ]
        }
      ],
      prices: [
        ['sample', 'Sample'], ['piece', 'سعر القطعة'], ['q10', '10 قطع'],
        ['q50', '50 قطعة'], ['q100', '100 قطعة'], ['other', 'عرض آخر']
      ]
    }
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function notify(message, type) {
    const el = $('#toast');
    el.textContent = message;
    el.className = 'toast show' + (type ? ' ' + type : '');
    window.setTimeout(function () { el.className = 'toast'; }, 2800);
  }

  function money(v) {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString('en-US') + ' EGP' : '—';
  }

  function localDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function randomSecret() {
    const a = new Uint8Array(32);
    crypto.getRandomValues(a);
    return btoa(String.fromCharCode.apply(null, a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function randomCode() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return String(a[0] % 1000000).padStart(6, '0');
  }

  async function sha256hex(value) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }

  function makeAdminClient(device) {
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      global: { headers: { 'x-portfolio-device-id': device.id, 'x-portfolio-device-secret': device.secret } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  function makeFieldClient(device) {
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      global: { headers: { 'x-studio-sourcing-device-id': device.id, 'x-studio-sourcing-device-secret': device.secret } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  function readLocal(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_e) { return null; }
  }

  async function initAccess() {
    const adminDevice = readLocal(PORTFOLIO_DEVICE_KEY);
    if (adminDevice && adminDevice.id && adminDevice.secret) {
      const client = makeAdminClient(adminDevice);
      const check = await client.from('portfolio_trusted_devices').select('status').eq('device_id', adminDevice.id).maybeSingle();
      if (!check.error && check.data && check.data.status === 'approved') {
        state.access = 'admin';
        state.device = adminDevice;
        state.sb = client;
        return enterApp();
      }
    }

    const fieldDevice = readLocal(FIELD_DEVICE_KEY);
    if (fieldDevice && fieldDevice.id && fieldDevice.secret) {
      const client = makeFieldClient(fieldDevice);
      const check = await client.from('studio_sourcing_devices').select('status,claim_code,label').eq('device_id', fieldDevice.id).maybeSingle();
      if (!check.error && check.data) {
        if (check.data.status === 'approved') {
          state.access = 'field';
          state.device = fieldDevice;
          state.sb = client;
          return enterApp();
        }
        if (check.data.status === 'pending') {
          state.sb = client;
          return showPending(check.data.claim_code || fieldDevice.code);
        }
      }
      localStorage.removeItem(FIELD_DEVICE_KEY);
    }

    showFieldStart();
  }

  function showFieldStart() {
    $('#gate-message').textContent = 'هذا الجهاز غير مفعّل بعد. أنشئ كود اعتماد للمهمات الميدانية فقط.';
    $('#field-device-start').classList.remove('hidden');
    $('#field-pairing-box').classList.add('hidden');
  }

  let pollTimer = null;
  function showPending(code) {
    $('#gate-message').textContent = 'تم إنشاء الجهاز. في انتظار اعتماد مسؤول Studio OS.';
    $('#field-device-start').classList.add('hidden');
    $('#field-pairing-box').classList.remove('hidden');
    $('#field-pairing-code').textContent = code || '------';
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async function () {
      const device = readLocal(FIELD_DEVICE_KEY);
      if (!device || !state.sb) return;
      const r = await state.sb.from('studio_sourcing_devices').select('status').eq('device_id', device.id).maybeSingle();
      if (!r.error && r.data && r.data.status === 'approved') {
        clearInterval(pollTimer);
        pollTimer = null;
        state.access = 'field';
        state.device = device;
        enterApp();
      }
    }, 3000);
  }

  $('#trust-field-device').addEventListener('click', async function () {
    const btn = this;
    btn.disabled = true;
    btn.textContent = 'جاري إنشاء الجهاز…';
    try {
      const device = { id: crypto.randomUUID(), secret: randomSecret(), code: randomCode() };
      const client = makeFieldClient(device);
      const secretHash = await sha256hex(device.secret);
      const label = /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Field mobile' : 'Field browser';
      const r = await client.from('studio_sourcing_devices').insert({
        device_id: device.id,
        secret_hash: secretHash,
        claim_code: device.code,
        label: label,
        status: 'pending'
      });
      if (r.error) throw r.error;
      localStorage.setItem(FIELD_DEVICE_KEY, JSON.stringify(device));
      state.sb = client;
      showPending(device.code);
    } catch (e) {
      notify(e.message || 'تعذر إنشاء جهاز الميدان.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'تفعيل هذا الجهاز للمهمات الميدانية';
    }
  });

  async function enterApp() {
    $('#gate').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('#access-badge').textContent = state.access === 'admin' ? 'STUDIO ADMIN' : 'FIELD DEVICE';
    $('#devices-nav').classList.toggle('hidden', state.access !== 'admin');
    $('#new-mission-button').classList.toggle('hidden', state.access !== 'admin');
    renderTrack();
    buildRatingOptions();
    await loadAll();
    startActivityPolling();
    startSupportPolling();
  }

  async function loadAll() {
    $('#sync-status').textContent = 'SYNCING…';
    const supplierReq = state.sb.from('studio_suppliers').select('*').order('name');
    const visitReq = state.sb.from('studio_sourcing_visits').select('*').order('visit_date', { ascending: false }).order('created_at', { ascending: false });
    const mediaReq = state.sb.from('studio_sourcing_media').select('*').order('created_at', { ascending: false });
    const missionReq = state.sb.from('studio_sourcing_missions').select('*').order('created_at', { ascending: false });
    const activityReq = state.access === 'admin'
      ? state.sb.from('studio_sourcing_activity').select('*').order('created_at', { ascending: false }).limit(500)
      : Promise.resolve({ data: [], error: null });
    const helpReq = state.sb.from('studio_sourcing_help_requests').select('*').order('created_at', { ascending: false }).limit(200);
    const results = await Promise.all([supplierReq, visitReq, mediaReq, missionReq, activityReq, helpReq]);
    if (results[0].error || results[1].error || results[2].error || results[3].error || results[4].error || results[5].error) {
      notify((results[0].error || results[1].error || results[2].error || results[3].error || results[4].error || results[5].error).message, 'error');
      $('#sync-status').textContent = 'SYNC ERROR';
      return;
    }
    state.suppliers = results[0].data || [];
    state.visits = results[1].data || [];
    state.media = results[2].data || [];
    state.missions = results[3].data || [];
    state.activities = results[4].data || [];
    state.helpRequests = results[5].data || [];
    if (state.access === 'admin') await loadDevices();
    renderEverything();
    $('#sync-status').textContent = 'LIVE SUPABASE';
    openMissionFromUrl();
  }

  async function loadDevices() {
    const r = await state.sb.from('studio_sourcing_devices').select('*').order('created_at', { ascending: false });
    state.devices = r.error ? [] : (r.data || []);
  }

  function renderEverything() {
    renderSupplierOptions();
    renderMissionOptions();
    renderDashboard();
    renderMissions();
    renderVisits();
    renderSuppliers();
    renderCompare();
    renderDevices();
    updateProgress();
    updateMissionHelpButton();
  }

  async function refreshActivity() {
    if (state.access !== 'admin' || !state.sb) return;
    const r = await state.sb.from('studio_sourcing_activity').select('*').order('created_at', { ascending: false }).limit(500);
    if (r.error) return;
    state.activities = r.data || [];
    renderDashboard();
    renderMissions();
  }

  function startActivityPolling() {
    if (state.activityPollTimer) {
      clearInterval(state.activityPollTimer);
      state.activityPollTimer = null;
    }
    if (state.access !== 'admin') return;
    state.activityPollTimer = setInterval(refreshActivity, 15000);
  }

  async function refreshSupport() {
    if (!state.sb) return;
    const r = await state.sb.from('studio_sourcing_help_requests').select('*').order('created_at', { ascending: false }).limit(200);
    if (r.error) return;
    state.helpRequests = r.data || [];
    updateMissionHelpButton();
    if (state.access === 'admin') {
      renderDashboard();
      renderMissions();
    }
  }

  function startSupportPolling() {
    if (state.supportPollTimer) {
      clearInterval(state.supportPollTimer);
      state.supportPollTimer = null;
    }
    state.supportPollTimer = setInterval(refreshSupport, 15000);
  }

  function openHelpForMission(missionId) {
    return state.helpRequests.find(function (r) {
      return r.mission_id === missionId && r.status === 'open';
    }) || null;
  }

  function latestResolvedHelpForMission(missionId) {
    return state.helpRequests.find(function (r) {
      return r.mission_id === missionId && r.status === 'resolved' && String(r.admin_note || '').trim() !== '';
    }) || null;
  }

  function helpTypeLabel(type) {
    if (type === 'blocked') return 'التنفيذ متوقف';
    if (type === 'problem') return 'مشكلة';
    return 'سؤال';
  }

  function updateMissionHelpButton() {
    const btn = $('#mission-help-button');
    const response = $('#mission-help-response');
    if (!btn) return;
    const req = state.focusMissionId ? openHelpForMission(state.focusMissionId) : null;
    const resolved = state.focusMissionId ? latestResolvedHelpForMission(state.focusMissionId) : null;
    btn.disabled = !!req;
    btn.textContent = req ? 'تم إرسال طلب مساعدة ✓' : 'محتاج مساعدة';
    btn.classList.toggle('requested', !!req);

    if (response) {
      if (req) {
        response.className = 'mission-help-response waiting';
        response.innerHTML = '<b>طلب المساعدة مفتوح</b><span>المسؤول هيراجع الطلب ويظهر الرد هنا.</span>';
      } else if (resolved) {
        response.className = 'mission-help-response answered';
        response.innerHTML = '<b>رد المسؤول</b><span>' + esc(resolved.admin_note) + '</span><small>' + esc(relativeActivityTime(resolved.resolved_at || resolved.created_at)) + '</small>';
      } else {
        response.className = 'mission-help-response hidden';
        response.innerHTML = '';
      }
    }
  }

  function activityForMission(missionId) {
    return state.activities.filter(function (a) { return a.mission_id === missionId; });
  }

  function latestMissionActivity(missionId) {
    return activityForMission(missionId)[0] || null;
  }

  function firstMissionActivity(missionId, type) {
    const rows = activityForMission(missionId).filter(function (a) { return a.event_type === type; });
    return rows.length ? rows[rows.length - 1] : null;
  }

  function relativeActivityTime(value) {
    if (!value) return '—';
    const ms = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 'الآن';
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return 'منذ ' + mins + ' د';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return 'منذ ' + hours + ' س';
    const days = Math.floor(hours / 24);
    return 'منذ ' + days + ' يوم';
  }

  async function logMissionActivity(eventType, data) {
    if (state.access !== 'field' || !state.sb || !state.focusMissionId) return;
    const mission = state.missions.find(function (m) { return m.id === state.focusMissionId; });
    if (!mission) return;
    const progress = completedMissionProgress(mission);
    const supplierNo = Math.min(progress.target, progress.suppliers + (eventType === 'supplier_completed' ? 0 : 1));
    const payload = {
      mission_id: mission.id,
      visit_id: data && data.visit_id ? data.visit_id : null,
      device_id: state.device && state.device.id ? state.device.id : '',
      event_type: eventType,
      stage_title: data && data.stage_title ? data.stage_title : '',
      stage_index: data && Number.isInteger(data.stage_index) ? data.stage_index : null,
      stage_total: data && Number.isInteger(data.stage_total) ? data.stage_total : null,
      supplier_no: supplierNo,
      details: data && data.details ? data.details : {}
    };
    const key = [payload.mission_id,eventType,payload.supplier_no,payload.stage_index,payload.stage_title].join(':');
    if ((eventType === 'opened' || eventType === 'stage') && state.lastActivityKey === key) return;
    if (eventType === 'opened' || eventType === 'stage') state.lastActivityKey = key;
    try {
      await state.sb.from('studio_sourcing_activity').insert(payload);
    } catch (_e) {}
  }

  function go(view) {
    $$('.app-nav button').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
    $$('.view').forEach(function (p) { p.classList.toggle('active', p.dataset.viewPanel === view); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $$('.app-nav button').forEach(function (b) {
    b.addEventListener('click', function () { go(b.dataset.view); });
  });
  document.addEventListener('click', function (e) {
    const g = e.target.closest('[data-go]');
    if (g) go(g.dataset.go);
  });
  $('#new-visit-hero').addEventListener('click', function () { resetVisit(); go('visit'); });

  function renderTrack() {
    const def = TRACKS[state.track];
    $('#dynamic-title').textContent = def.title;
    $$('.track-card').forEach(function (card) {
      const input = $('input', card);
      card.classList.toggle('selected', input && input.value === state.track);
    });

    $('#checklist-root').innerHTML = def.groups.map(function (group, gi) {
      const items = group.items.map(function (item) {
        if (item.t === 'check') {
          return '<label class="check-field"><input type="checkbox" data-check="' + esc(item.k) + '" /><span>' + esc(item.l) + '</span></label>';
        }
        if (item.t === 'select') {
          return '<label class="select-field"><span>' + esc(item.l) + '</span><select data-check="' + esc(item.k) + '"><option value="">— اختر —</option>' +
            item.o.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select></label>';
        }
        return '<label class="text-field"><span>' + esc(item.l) + '</span><input data-check="' + esc(item.k) + '" placeholder="' + esc(item.p || '') + '" /></label>';
      }).join('');
      return '<section class="check-group"><div class="check-group-head"><b>' + esc(group.title) + '</b><span>' + String(gi + 1).padStart(2, '0') + '</span></div><div class="check-items">' + items + '</div></section>';
    }).join('');

    $('#pricing-root').innerHTML = def.prices.map(function (p) {
      return '<label class="price-box"><span>' + esc(p[1]) + '</span><input type="number" min="0" step="0.01" inputmode="decimal" data-price="' + esc(p[0]) + '" placeholder="EGP" /></label>';
    }).join('');

    $('#checklist-root').addEventListener('input', updateProgress);
    $('#checklist-root').addEventListener('change', updateProgress);
    $('#pricing-root').addEventListener('input', updateProgress);
  }

  $$('input[name="track"]').forEach(function (r) {
    r.addEventListener('change', function () {
      state.track = r.value;
      renderTrack();
      renderMissionOptions();
      updateProgress();
    });
  });

  function collectChecklist() {
    const out = {};
    $$('[data-check]', $('#checklist-root')).forEach(function (el) {
      out[el.dataset.check] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    return out;
  }

  function fillChecklist(data) {
    const obj = data || {};
    $$('[data-check]', $('#checklist-root')).forEach(function (el) {
      if (el.type === 'checkbox') el.checked = !!obj[el.dataset.check];
      else el.value = obj[el.dataset.check] == null ? '' : obj[el.dataset.check];
    });
  }

  function collectPricing() {
    const out = {};
    $$('[data-price]', $('#pricing-root')).forEach(function (el) {
      out[el.dataset.price] = el.value === '' ? null : Number(el.value);
    });
    return out;
  }

  function fillPricing(data) {
    const obj = data || {};
    $$('[data-price]', $('#pricing-root')).forEach(function (el) {
      const v = obj[el.dataset.price];
      el.value = v === null || v === undefined ? '' : v;
    });
  }

  function progressValue() {
    const fixed = [
      $('#field-owner'), $('#supplier-name'), $('#supplier-phone'), $('#supplier-address'),
      $('#lead-time'), $('#moq'), $('#quoted-total'), $('#visit-notes'), $('#recommendation')
    ];
    const dynamic = Array.from($('#visit-form').querySelectorAll('[data-check], [data-price]'));
    const fields = fixed.concat(dynamic);
    if (!fields.length) return 0;
    let done = 0;
    fields.forEach(function (el) {
      if (!el) return;
      if (el.type === 'checkbox') { if (el.checked) done++; }
      else if (String(el.value || '').trim() !== '') done++;
    });
    return Math.round((done / fields.length) * 100);
  }

  function missingRequired() {
    const req = REQUIRED[state.track] || { checks: [], fields: [], labels: {} };
    const checklist = collectChecklist();
    const missing = [];
    req.checks.forEach(function (key) {
      const val = checklist[key];
      if (val !== true && String(val || '').trim() === '') missing.push(req.labels[key] || key);
    });
    req.fields.forEach(function (id) {
      const el = $('#' + id);
      if (!el || String(el.value || '').trim() === '') missing.push(req.labels[id] || id);
    });
    const hasPrice = Array.from($('#pricing-root').querySelectorAll('[data-price]')).some(function (el) {
      return String(el.value || '').trim() !== '';
    });
    if (!hasPrice) missing.push('سعر واحد على الأقل');
    return missing;
  }

  function updateProgress() {
    const p = progressValue();
    $('#visit-progress').textContent = p + '%';
    $('#visit-progress-bar').style.width = p + '%';
    const box = $('#visit-missing-box');
    if (!box) return;
    const missing = missingRequired();
    if (!missing.length) {
      box.className = 'missing-box ready';
      box.innerHTML = '<b>جاهز للإغلاق ✓</b><span>الحد الأدنى من بيانات الزيارة مكتمل. راجع التفاصيل ثم اضغط إنهاء الزيارة.</span>';
    } else {
      box.className = 'missing-box';
      box.innerHTML = '<b>قبل ما تمشي من المورد</b><span>ناقص: ' + esc(missing.join(' · ')) + '</span>';
    }
  }
  $('#visit-form').addEventListener('input', updateProgress);
  $('#visit-form').addEventListener('change', updateProgress);

  function renderMissionOptions() {
    const sel = $('#mission-select');
    if (!sel) return;
    const current = sel.value;
    const active = state.missions.filter(function (m) { return m.status === 'active' && m.track === state.track; });
    sel.innerHTML = '<option value="">زيارة بدون مهمة محددة</option>' + active.map(function (m) {
      return '<option value="' + esc(m.id) + '">' + esc(m.title) + ' · ' + esc(trackLabel(m.track)) + '</option>';
    }).join('');
    if (active.some(function (m) { return m.id === current; })) sel.value = current;
  }

  function renderSupplierOptions() {
    const sel = $('#supplier-select');
    const current = sel.value;
    sel.innerHTML = '<option value="">+ مورد جديد</option>' + state.suppliers.map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>';
    }).join('');
    if (state.suppliers.some(function (s) { return s.id === current; })) sel.value = current;
  }

  $('#supplier-select').addEventListener('change', function () {
    const s = state.suppliers.find(function (x) { return x.id === $('#supplier-select').value; });
    if (!s) {
      clearSupplierFields();
      return;
    }
    $('#supplier-name').value = s.name || '';
    $('#supplier-category').value = s.primary_category || 'other';
    $('#supplier-contact').value = s.contact_name || '';
    $('#supplier-phone').value = s.phone || '';
    $('#supplier-whatsapp').value = s.whatsapp || '';
    $('#supplier-address').value = s.address || '';
    $('#supplier-social').value = s.social_url || '';
    updateProgress();
  });

  function clearSupplierFields() {
    ['supplier-name','supplier-contact','supplier-phone','supplier-whatsapp','supplier-address','supplier-social'].forEach(function (id) { $('#' + id).value = ''; });
    $('#supplier-category').value = state.track === 'do_story' ? 'printing' : (state.track === 'string_art' ? 'router_cnc' : 'other');
  }

  async function saveSupplier() {
    const payload = {
      name: $('#supplier-name').value.trim(),
      primary_category: $('#supplier-category').value,
      contact_name: $('#supplier-contact').value.trim(),
      phone: $('#supplier-phone').value.trim(),
      whatsapp: $('#supplier-whatsapp').value.trim(),
      address: $('#supplier-address').value.trim(),
      social_url: $('#supplier-social').value.trim(),
      updated_at: new Date().toISOString()
    };
    if (!payload.name) throw new Error('اكتب اسم المورد أولًا.');
    const existingId = $('#supplier-select').value;
    if (existingId) {
      const r = await state.sb.from('studio_suppliers').update(payload).eq('id', existingId).select().single();
      if (r.error) throw r.error;
      return r.data.id;
    }
    const r = await state.sb.from('studio_suppliers').insert(payload).select().single();
    if (r.error) throw r.error;
    return r.data.id;
  }

  function newVisitCode() {
    const d = localDate().replace(/-/g, '').slice(2);
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return 'SRC-' + d + '-' + String(a[0] % 10000).padStart(4, '0');
  }

  function numericOrNull(el) {
    return el.value === '' ? null : Number(el.value);
  }

  async function saveVisit(status) {
    const btns = $$('#save-draft,#save-complete');
    btns.forEach(function (b) { b.disabled = true; });
    try {
      if (status === 'complete') {
        const missing = missingRequired();
        if (missing.length) throw new Error('الزيارة لا يمكن إغلاقها بعد. ناقص: ' + missing.join('، '));
      }
      const supplierId = await saveSupplier();
      const payload = {
        supplier_id: supplierId,
        mission_id: $('#mission-select').value || null,
        track: state.track,
        status: status,
        visit_date: state.editingVisitId
          ? ((state.visits.find(function (v) { return v.id === state.editingVisitId; }) || {}).visit_date || localDate())
          : localDate(),
        field_owner: $('#field-owner').value.trim(),
        checklist: collectChecklist(),
        pricing: collectPricing(),
        materials: {},
        extra_data: {},
        sample_available: $('#sample-available').checked,
        sample_cost: numericOrNull($('#sample-cost')),
        moq: numericOrNull($('#moq')),
        lead_time: $('#lead-time').value.trim(),
        quote_valid_until: $('#quote-valid-until').value || null,
        quoted_total: numericOrNull($('#quoted-total')),
        quality_rating: numericOrNull($('#quality-rating')),
        price_rating: numericOrNull($('#price-rating')),
        service_rating: numericOrNull($('#service-rating')),
        recommendation: $('#recommendation').value.trim(),
        next_action: $('#next-action').value.trim(),
        follow_up_date: $('#follow-up-date').value || null,
        notes: $('#visit-notes').value.trim(),
        completed_at: status === 'complete' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      let visit;
      if (state.editingVisitId) {
        const r = await state.sb.from('studio_sourcing_visits').update(payload).eq('id', state.editingVisitId).select().single();
        if (r.error) throw r.error;
        visit = r.data;
      } else {
        payload.visit_code = newVisitCode();
        const r = await state.sb.from('studio_sourcing_visits').insert(payload).select().single();
        if (r.error) throw r.error;
        visit = r.data;
        state.editingVisitId = visit.id;
      }

      if (state.pendingFiles.length) await uploadFiles(visit.id);
      const missionId = payload.mission_id;
      if (missionId && state.access === 'field') {
        await logMissionActivity(status === 'complete' ? 'supplier_completed' : 'draft_saved', {
          visit_id: visit.id,
          details: { supplier_id: supplierId, visit_code: visit.visit_code || '' }
        });
      }
      notify(status === 'complete' ? 'تم تسجيل الزيارة كاملة ✓' : 'تم حفظ الزيارة كـ Draft.');
      await loadAll();

      if (status === 'complete' && missionId) {
        const mission = state.missions.find(function (m) { return m.id === missionId; });
        if (mission) {
          const p = completedMissionProgress(mission);
          if (p.suppliers < p.target) {
            resetVisit();
            openMission(mission, true);
            notify('تم المورد ' + p.suppliers + ' من ' + p.target + ' ✓ — ابدأ المورد ' + (p.suppliers + 1) + '.');
            return;
          }

          await logMissionActivity('mission_ready', {
            visit_id: visit.id,
            details: { completed_suppliers: p.suppliers, target_suppliers: p.target }
          });
          state.focusMissionId = null;
          state.guidedStages = [];
          document.body.classList.remove('mission-focus-mode');
          const missionLabel = $('#mission-select') && $('#mission-select').closest('label');
          const ownerLabel = $('#field-owner') && $('#field-owner').closest('label');
          if (missionLabel) missionLabel.classList.remove('hidden');
          if (ownerLabel) ownerLabel.classList.remove('hidden');
          resetVisit();
          go('missions');
          notify('اكتمل العدد المطلوب: ' + p.suppliers + ' من ' + p.target + '. المهمة جاهزة للمراجعة.');
          return;
        }
      }

      resetVisit();
      go('visits');
    } catch (e) {
      notify(e.message || 'تعذر حفظ الزيارة.', 'error');
    } finally {
      btns.forEach(function (b) { b.disabled = false; });
    }
  }

  $('#visit-form').addEventListener('submit', function (e) {
    e.preventDefault();
    saveVisit('complete');
  });
  $('#save-draft').addEventListener('click', function () { saveVisit('draft'); });
  $('#reset-visit').addEventListener('click', resetVisit);

  function addPendingFiles(list) {
    const incoming = Array.from(list || []);
    const seen = new Set(state.pendingFiles.map(function (f) { return f.name + ':' + f.size + ':' + f.lastModified; }));
    incoming.forEach(function (f) {
      const key = f.name + ':' + f.size + ':' + f.lastModified;
      if (!seen.has(key)) {
        state.pendingFiles.push(f);
        seen.add(key);
      }
    });
    renderPendingFiles();
  }
  $('#visit-files').addEventListener('change', function (e) { addPendingFiles(e.target.files); });
  $('#visit-camera').addEventListener('change', function (e) {
    addPendingFiles(e.target.files);
    e.target.value = '';
  });

  function renderPendingFiles() {
    $('#pending-files').innerHTML = state.pendingFiles.map(function (f) {
      return '<span class="pending-file">' + esc(f.name) + ' · ' + Math.round(f.size / 1024) + ' KB</span>';
    }).join('');
  }

  function safeFileName(name) {
    return String(name || 'file').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
  }

  async function uploadFiles(visitId) {
    let order = state.media.filter(function (m) { return m.visit_id === visitId; }).length * 10;
    for (let i = 0; i < state.pendingFiles.length; i++) {
      const file = state.pendingFiles[i];
      const path = visitId + '/' + Date.now() + '-' + i + '-' + safeFileName(file.name);
      const up = await state.sb.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;
      const ins = await state.sb.from('studio_sourcing_media').insert({
        visit_id: visitId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || '',
        label: '',
        sort_order: order
      });
      if (ins.error) throw ins.error;
      order += 10;
    }
    state.pendingFiles = [];
    $('#visit-files').value = '';
    renderPendingFiles();
  }

  async function renderExistingMedia(visitId) {
    const root = $('#existing-media');
    const rows = state.media.filter(function (m) { return m.visit_id === visitId; });
    if (!rows.length) {
      root.innerHTML = '';
      return;
    }
    root.innerHTML = rows.map(function (m) {
      return '<article class="media-card" data-media="' + esc(m.id) + '"><div class="pdf-card">LOADING…</div><button type="button" data-delete-media="' + esc(m.id) + '">×</button></article>';
    }).join('');
    for (const m of rows) {
      const signed = await state.sb.storage.from(BUCKET).createSignedUrl(m.storage_path, 3600);
      const card = root.querySelector('[data-media="' + CSS.escape(m.id) + '"]');
      if (!card) continue;
      const url = signed.error ? '' : signed.data.signedUrl;
      const body = m.mime_type && m.mime_type.indexOf('image/') === 0
        ? '<a href="' + esc(url) + '" target="_blank" rel="noopener"><img src="' + esc(url) + '" alt="' + esc(m.file_name) + '" /></a>'
        : '<a class="pdf-card" href="' + esc(url) + '" target="_blank" rel="noopener">PDF / FILE</a>';
      card.innerHTML = body + '<button type="button" data-delete-media="' + esc(m.id) + '">×</button>';
    }
  }

  $('#existing-media').addEventListener('click', async function (e) {
    const btn = e.target.closest('[data-delete-media]');
    if (!btn) return;
    const m = state.media.find(function (x) { return x.id === btn.dataset.deleteMedia; });
    if (!m) return;
    if (!confirm('حذف الملف من الزيارة؟')) return;
    const sr = await state.sb.storage.from(BUCKET).remove([m.storage_path]);
    if (sr.error) return notify(sr.error.message, 'error');
    const dr = await state.sb.from('studio_sourcing_media').delete().eq('id', m.id);
    if (dr.error) return notify(dr.error.message, 'error');
    await loadAll();
    renderExistingMedia(state.editingVisitId);
  });

  function buildRatingOptions() {
    ['quality-rating','price-rating','service-rating'].forEach(function (id) {
      const el = $('#' + id);
      el.innerHTML = '<option value="">—</option>';
      for (let i = 1; i <= 10; i++) el.insertAdjacentHTML('beforeend', '<option value="' + i + '">' + i + ' / 10</option>');
    });
  }

  function resetVisit() {
    state.editingVisitId = null;
    state.track = 'do_story';
    $('#visit-id').value = '';
    $('#visit-heading').textContent = 'زيارة مورد جديدة';
    $('#visit-form').reset();
    $('input[name="track"][value="do_story"]').checked = true;
    $('#mission-select').value = '';
    $('#supplier-select').value = '';
    clearSupplierFields();
    state.pendingFiles = [];
    renderPendingFiles();
    $('#existing-media').innerHTML = '';
    renderTrack();
    updateProgress();
  }

  function editVisit(id) {
    const v = state.visits.find(function (x) { return x.id === id; });
    if (!v) return;
    state.editingVisitId = v.id;
    state.track = v.track;
    $('#visit-id').value = v.id;
    $('#visit-heading').textContent = 'تعديل ' + v.visit_code;
    $('#field-owner').value = v.field_owner || '';
    $('input[name="track"][value="' + v.track + '"]').checked = true;
    renderTrack();
    $('#mission-select').value = v.mission_id || '';
    $('#supplier-select').value = v.supplier_id || '';
    $('#supplier-select').dispatchEvent(new Event('change'));
    fillChecklist(v.checklist || {});
    fillPricing(v.pricing || {});
    $('#sample-available').checked = !!v.sample_available;
    $('#sample-cost').value = v.sample_cost == null ? '' : v.sample_cost;
    $('#moq').value = v.moq == null ? '' : v.moq;
    $('#lead-time').value = v.lead_time || '';
    $('#quote-valid-until').value = v.quote_valid_until || '';
    $('#quoted-total').value = v.quoted_total == null ? '' : v.quoted_total;
    $('#quality-rating').value = v.quality_rating == null ? '' : v.quality_rating;
    $('#price-rating').value = v.price_rating == null ? '' : v.price_rating;
    $('#service-rating').value = v.service_rating == null ? '' : v.service_rating;
    $('#visit-notes').value = v.notes || '';
    $('#recommendation').value = v.recommendation || '';
    $('#next-action').value = v.next_action || '';
    $('#follow-up-date').value = v.follow_up_date || '';
    renderExistingMedia(v.id);
    updateProgress();
    go('visit');
  }

  function supplierFor(id) {
    return state.suppliers.find(function (s) { return s.id === id; }) || null;
  }

  function trackLabel(track) {
    return TRACKS[track] ? TRACKS[track].label : track;
  }

  function statusLabel(status) {
    return { draft: 'DRAFT', complete: 'COMPLETE', shortlisted: 'SHORTLIST', rejected: 'REJECTED' }[status] || status;
  }

  function visitCard(v) {
    const s = supplierFor(v.supplier_id);
    return '<article class="visit-card">' +
      '<div class="visit-main"><b>' + esc(s ? s.name : 'مورد غير محدد') + '</b><small>' + esc(v.visit_code) + ' · ' + esc(trackLabel(v.track)) + ' · ' + esc(v.visit_date) + '</small></div>' +
      '<div class="visit-meta"><span>الإجمالي</span><strong>' + esc(money(v.quoted_total)) + '</strong></div>' +
      '<div class="visit-meta"><span>الحالة</span><strong><span class="status-pill status-' + esc(v.status) + '">' + esc(statusLabel(v.status)) + '</span></strong></div>' +
      '<div class="visit-actions">' +
        '<button class="mini-btn" type="button" data-edit-visit="' + esc(v.id) + '">تعديل</button>' +
        '<button class="mini-btn" type="button" data-print-visit="' + esc(v.id) + '">تقرير</button>' +
        (v.status !== 'shortlisted' ? '<button class="mini-btn" type="button" data-visit-status="shortlisted" data-visit-id="' + esc(v.id) + '">Shortlist</button>' : '') +
        (v.status !== 'rejected' ? '<button class="mini-btn" type="button" data-visit-status="rejected" data-visit-id="' + esc(v.id) + '">Reject</button>' : '') +
      '</div></article>';
  }

  function renderDashboard() {
    $('#kpi-visits').textContent = state.visits.length;
    $('#kpi-complete').textContent = state.visits.filter(function (v) { return v.status === 'complete' || v.status === 'shortlisted'; }).length;
    $('#kpi-shortlist').textContent = state.visits.filter(function (v) { return v.status === 'shortlisted'; }).length;
    $('#kpi-suppliers').textContent = state.suppliers.length;
    $('#kpi-missions').textContent = state.missions.filter(function (m) { return m.status === 'active'; }).length;
    $('#recent-visits').innerHTML = state.visits.length ? state.visits.slice(0, 5).map(visitCard).join('') : '<div class="empty">لسه مفيش زيارات. ابدأ بأول مورد.</div>';
    const activeMissions = state.missions.filter(function (m) { return m.status === 'active'; }).slice(0, 4);
    $('#dashboard-missions').innerHTML = activeMissions.length ? activeMissions.map(missionCard).join('') : '<div class="empty">لا توجد مهمات ميدانية نشطة.</div>';
  }

  function renderVisits() {
    const track = $('#visit-track-filter').value;
    const status = $('#visit-status-filter').value;
    const rows = state.visits.filter(function (v) {
      return (track === 'all' || v.track === track) && (status === 'all' || v.status === status);
    });
    $('#visits-list').innerHTML = rows.length ? rows.map(visitCard).join('') : '<div class="empty">لا توجد زيارات مطابقة للفلاتر.</div>';
  }
  $('#visit-track-filter').addEventListener('change', renderVisits);
  $('#visit-status-filter').addEventListener('change', renderVisits);

  function missionLink(m) {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('mission', m.id);
    return url.toString();
  }

  function normalizeWhatsAppPhone(raw) {
    let p = String(raw || '').replace(/\D/g, '');
    if (p.startsWith('01') && p.length === 11) p = '2' + p;
    return p;
  }

  function shareMissionWhatsApp(m) {
    const link = missionLink(m);
    const parts = [
      'مهمة ميدانية جديدة — Andrew Tharwat Studio',
      '',
      m.title,
      m.objective ? 'المطلوب: ' + m.objective : '',
      'عدد الموردين المطلوب: ' + (m.target_supplier_count || 1),
      m.due_date ? 'الموعد المستهدف: ' + m.due_date : '',
      '',
      'ابدأ المهمة من هنا:',
      link
    ].filter(Boolean);
    const phone = normalizeWhatsAppPhone(m.assigned_phone);
    const base = phone ? 'https://wa.me/' + phone : 'https://wa.me/';
    window.open(base + '?text=' + encodeURIComponent(parts.join('\n')), '_blank', 'noopener');
  }

  function openMission(m, focusMode) {
    if (!m) return;
    resetVisit();
    state.track = m.track;
    const radio = $('input[name="track"][value="' + m.track + '"]');
    if (radio) radio.checked = true;
    renderTrack();
    renderMissionOptions();
    $('#mission-select').value = m.id;
    $('#field-owner').value = m.assigned_to || '';
    updateProgress();
    go('visit');

    if (focusMode) {
      state.focusMissionId = m.id;
      state.guidedIndex = 0;
      document.body.classList.add('mission-focus-mode');
      setupGuidedMission(m);
      logMissionActivity('opened', { details: { source: 'mission_link' } });
    } else {
      state.focusMissionId = null;
      document.body.classList.remove('mission-focus-mode');
      const missionLabel = $('#mission-select') && $('#mission-select').closest('label');
      const ownerLabel = $('#field-owner') && $('#field-owner').closest('label');
      if (missionLabel) missionLabel.classList.remove('hidden');
      if (ownerLabel) ownerLabel.classList.remove('hidden');
    }
  }

  function openMissionFromUrl() {
    const id = new URLSearchParams(window.location.search).get('mission');
    if (!id || state.focusMissionId === id) return;
    const m = state.missions.find(function (x) { return x.id === id; });
    if (m) openMission(m, true);
  }

  function completedMissionProgress(m) {
    const rows = state.visits.filter(function (v) {
      return v.mission_id === m.id && (v.status === 'complete' || v.status === 'shortlisted');
    });
    const suppliers = new Set(rows.map(function (v) { return v.supplier_id; }).filter(Boolean)).size;
    const target = Number(m.target_supplier_count || 1);
    return { suppliers: suppliers, target: target, percent: Math.min(100, Math.round((suppliers / target) * 100)) };
  }

  function checklistLabel(key) {
    const groups = TRACKS[state.track] ? TRACKS[state.track].groups : [];
    for (const group of groups) {
      for (const item of group.items) {
        if (item.k === key) return item.l;
      }
    }
    return key;
  }

  function guidedValueMissing(key) {
    const el = $('[data-check="' + key + '"]', $('#checklist-root'));
    if (!el) return true;
    if (el.type === 'checkbox') return !el.checked;
    return String(el.value || '').trim() === '';
  }

  function setupGuidedMission(m) {
    const p = completedMissionProgress(m);
    const supplierNo = Math.min(p.target, p.suppliers + 1);

    $('#mission-focus-title').textContent = m.title || 'مهمة ميدانية';
    $('#mission-focus-objective').textContent = m.objective || 'نفّذ الزيارة خطوة بخطوة وسجّل البيانات المطلوبة.';
    $('#mission-focus-owner').textContent = 'المسؤول: ' + (m.assigned_to || '—');
    $('#mission-focus-progress').textContent = 'المورد: ' + supplierNo + ' من ' + p.target;
    $('#mission-focus-due').textContent = m.due_date ? 'الموعد: ' + m.due_date : 'بدون موعد محدد';
    updateMissionHelpButton();

    const panels = Array.from(document.querySelectorAll('#visit-form > section.panel')).filter(function (el) { return el.id !== 'guided-review-panel'; });
    const missionPanel = panels[0];
    const supplierPanel = panels[1];
    const checklistPanel = panels[2];
    const pricePanel = panels[3];
    const evidencePanel = panels[4];
    const judgementPanel = panels[5];
    const reviewPanel = $('#guided-review-panel');

    if (missionPanel) missionPanel.classList.remove('guided-active');
    if (checklistPanel) checklistPanel.classList.add('guided-checklist-panel');

    const groups = Array.from(document.querySelectorAll('#checklist-root > .check-group'));
    const stages = [
      { title: 'بيانات المورد', type: 'supplier', el: supplierPanel }
    ];

    groups.forEach(function (group, index) {
      const titleEl = $('.check-group-head b', group);
      stages.push({
        title: titleEl ? titleEl.textContent.trim() : 'Checklist ' + (index + 1),
        type: 'check',
        groupIndex: index,
        el: group,
        parent: checklistPanel
      });
    });

    stages.push(
      { title: 'السعر والتنفيذ', type: 'price', el: pricePanel },
      { title: 'الإثبات والصور', type: 'evidence', el: evidencePanel },
      { title: 'التقييم والمتابعة', type: 'judgement', el: judgementPanel },
      { title: 'المراجعة النهائية', type: 'review', el: reviewPanel }
    );

    state.guidedStages = stages;
    state.guidedIndex = Math.min(state.guidedIndex, Math.max(0, stages.length - 1));

    const missionLabel = $('#mission-select') && $('#mission-select').closest('label');
    const ownerLabel = $('#field-owner') && $('#field-owner').closest('label');
    if (missionLabel) missionLabel.classList.add('hidden');
    if (ownerLabel) ownerLabel.classList.add('hidden');

    renderGuidedStage();
  }

  function validateGuidedStage(showMessage) {
    const stage = state.guidedStages[state.guidedIndex];
    if (!stage) return true;
    const missing = [];

    if (stage.type === 'supplier') {
      if (!$('#supplier-name').value.trim()) missing.push('اسم المورد');
      if (!$('#supplier-phone').value.trim()) missing.push('رقم الهاتف');
    }

    if (stage.type === 'check') {
      const req = (GUIDED_REQUIRED[state.track] || [])[stage.groupIndex] || [];
      req.forEach(function (key) {
        if (guidedValueMissing(key)) missing.push(checklistLabel(key));
      });
    }

    if (stage.type === 'price') {
      const hasPrice = Array.from($('#pricing-root').querySelectorAll('[data-price]')).some(function (el) {
        return String(el.value || '').trim() !== '';
      });
      if (!hasPrice) missing.push('سعر واحد على الأقل');
      if (!$('#moq').value.trim()) missing.push('MOQ');
      if (!$('#lead-time').value.trim()) missing.push('مدة التنفيذ');
    }

    if (stage.type === 'evidence') {
      const existing = state.editingVisitId
        ? state.media.some(function (m) { return m.visit_id === state.editingVisitId; })
        : false;
      if (!state.pendingFiles.length && !existing) missing.push('صورة أو عرض سعر أو عينة');
    }

    if (stage.type === 'judgement') {
      if (!$('#next-action').value.trim()) missing.push('الخطوة التالية');
    }

    if (missing.length && showMessage) {
      notify('كمّل المرحلة أولًا: ' + missing.join('، '), 'error');
    }
    return missing.length === 0;
  }

  function renderGuidedReview() {
    const supplier = [
      $('#supplier-name').value.trim(),
      $('#supplier-contact').value.trim(),
      $('#supplier-phone').value.trim()
    ].filter(Boolean).join(' · ');

    const checklist = collectChecklist();
    const checklistRows = Object.keys(checklist).filter(function (key) {
      const v = checklist[key];
      return v === true || (v !== false && String(v || '').trim() !== '');
    }).map(function (key) {
      const v = checklist[key];
      return '<div class="guided-review-row"><span>' + esc(checklistLabel(key)) + '</span><b>' + esc(v === true ? 'نعم' : v) + '</b></div>';
    }).join('');

    const pricing = collectPricing();
    const pricingRows = Object.keys(pricing).filter(function (key) {
      return pricing[key] !== null && pricing[key] !== '';
    }).map(function (key) {
      const pair = TRACKS[state.track].prices.find(function (x) { return x[0] === key; });
      return '<div class="guided-review-row"><span>' + esc(pair ? pair[1] : key) + '</span><b>' + esc(money(pricing[key])) + '</b></div>';
    }).join('');

    $('#guided-review-content').innerHTML =
      '<div class="guided-review-grid">' +
        '<div class="guided-review-block"><h4>المورد</h4><p>' + esc(supplier || '—') + '</p></div>' +
        '<div class="guided-review-block"><h4>التنفيذ التجاري</h4><p>MOQ: ' + esc($('#moq').value || '—') + '<br>مدة التنفيذ: ' + esc($('#lead-time').value || '—') + '<br>Sample: ' + ($('#sample-available').checked ? 'متاح' : 'غير مسجل') + '</p></div>' +
      '</div>' +
      '<div class="guided-review-block"><h4>إجابات الـChecklist</h4>' + (checklistRows || '<p>—</p>') + '</div>' +
      '<div class="guided-review-block"><h4>الأسعار</h4>' + (pricingRows || '<p>—</p>') + '</div>' +
      '<div class="guided-review-grid">' +
        '<div class="guided-review-block"><h4>الخطوة التالية</h4><p>' + esc($('#next-action').value.trim() || '—') + '</p></div>' +
        '<div class="guided-review-block"><h4>ملاحظات المسؤول</h4><p>' + esc($('#visit-notes').value.trim() || $('#recommendation').value.trim() || '—') + '</p></div>' +
      '</div>';
  }

  function renderGuidedStage() {
    const stages = state.guidedStages;
    if (!stages.length) return;
    const stage = stages[state.guidedIndex];

    Array.from(document.querySelectorAll('#visit-form > section.panel')).forEach(function (panel) {
      panel.classList.remove('guided-active', 'guided-active-parent');
    });
    Array.from(document.querySelectorAll('#checklist-root > .check-group')).forEach(function (group) {
      group.classList.remove('guided-active');
    });

    if (stage.type === 'check') {
      if (stage.parent) stage.parent.classList.add('guided-active-parent');
      stage.el.classList.add('guided-active');
    } else if (stage.el) {
      stage.el.classList.add('guided-active');
    }

    if (stage.type === 'review') renderGuidedReview();

    const pct = Math.round(((state.guidedIndex + 1) / stages.length) * 100);
    $('#guided-step-label').textContent = 'الخطوة ' + (state.guidedIndex + 1) + ' من ' + stages.length;
    $('#guided-step-percent').textContent = pct + '%';
    $('#guided-step-bar').style.width = pct + '%';

    $('#guided-task-strip').innerHTML = stages.map(function (item, index) {
      const cls = index === state.guidedIndex ? ' active' : (index < state.guidedIndex ? ' done' : '');
      return '<button class="guided-task' + cls + '" type="button" data-guided-jump="' + index + '">' +
        (index < state.guidedIndex ? '✓ ' : '') + esc(item.title) + '</button>';
    }).join('');

    $('#mission-focus-current-task').textContent = stage.title;
    $('#mission-focus-next-task').textContent = state.guidedIndex < stages.length - 1
      ? 'التالي: ' + stages[state.guidedIndex + 1].title
      : 'التالي: إنهاء المورد وحفظ المرجع';

    $('#guided-back').disabled = state.guidedIndex === 0;
    $('#guided-next').textContent = state.guidedIndex === stages.length - 1 ? 'إنهاء المورد ✓' : 'التالي';

    const active = stage.type === 'check' ? stage.parent : stage.el;
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    logMissionActivity('stage', {
      stage_title: stage.title,
      stage_index: state.guidedIndex + 1,
      stage_total: stages.length
    });
  }

  $('#guided-back').addEventListener('click', function () {
    if (state.guidedIndex <= 0) return;
    state.guidedIndex--;
    renderGuidedStage();
  });

  $('#guided-next').addEventListener('click', function () {
    if (!validateGuidedStage(true)) return;
    if (state.guidedIndex >= state.guidedStages.length - 1) {
      saveVisit('complete');
      return;
    }
    state.guidedIndex++;
    renderGuidedStage();
  });

  $('#guided-task-strip').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-guided-jump]');
    if (!btn) return;
    const index = Number(btn.dataset.guidedJump);
    if (!Number.isInteger(index) || index < 0 || index > state.guidedIndex) return;
    state.guidedIndex = index;
    renderGuidedStage();
  });

  document.addEventListener('click', async function (e) {
    const edit = e.target.closest('[data-edit-visit]');
    if (edit) return editVisit(edit.dataset.editVisit);

    const print = e.target.closest('[data-print-visit]');
    if (print) return printVisit(print.dataset.printVisit);

    const statusBtn = e.target.closest('[data-visit-status]');
    if (statusBtn) {
      const next = statusBtn.dataset.visitStatus;
      const id = statusBtn.dataset.visitId;
      const r = await state.sb.from('studio_sourcing_visits').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id);
      if (r.error) return notify(r.error.message, 'error');
      notify(next === 'shortlisted' ? 'تمت إضافة المورد للـShortlist.' : 'تم استبعاد الزيارة.');
      await loadAll();
    }
  });

  function renderSuppliers() {
    const counts = {};
    state.visits.forEach(function (v) { counts[v.supplier_id] = (counts[v.supplier_id] || 0) + 1; });
    $('#suppliers-list').innerHTML = state.suppliers.length ? state.suppliers.map(function (s) {
      return '<article class="supplier-card"><span class="supplier-type">' + esc(s.primary_category) + '</span><h3>' + esc(s.name) + '</h3>' +
        '<p>' + esc(s.contact_name || '—') + '</p><p>' + esc(s.phone || s.whatsapp || '—') + '</p><p>' + esc(s.address || '—') + '</p>' +
        '<div class="supplier-stats"><span>VISITS<b>' + (counts[s.id] || 0) + '</b></span><span>STATUS<b>' + (s.is_active ? 'ACTIVE' : 'OFF') + '</b></span></div></article>';
    }).join('') : '<div class="empty">قاعدة الموردين فارغة.</div>';
  }

  function renderCompare() {
    const track = $('#compare-track').value;
    const rows = state.visits.filter(function (v) { return v.track === track; });
    $('#compare-body').innerHTML = rows.length ? rows.map(function (v) {
      const s = supplierFor(v.supplier_id);
      return '<tr><td>' + esc(s ? s.name : '—') + '</td><td>' + esc(statusLabel(v.status)) + '</td><td>' + esc(money(v.quoted_total)) + '</td><td>' +
        esc(v.moq == null ? '—' : v.moq) + '</td><td>' + esc(v.lead_time || '—') + '</td><td>' + (v.sample_available ? 'Yes' : 'No') + '</td><td>' +
        esc(v.quality_rating == null ? '—' : v.quality_rating + '/10') + '</td><td>' + esc(v.price_rating == null ? '—' : v.price_rating + '/10') + '</td><td>' +
        esc(v.service_rating == null ? '—' : v.service_rating + '/10') + '</td><td>' + esc(v.recommendation || '—') + '</td></tr>';
    }).join('') : '<tr><td colspan="10">لا توجد زيارات في هذا المسار بعد.</td></tr>';
  }
  $('#compare-track').addEventListener('change', renderCompare);

  function missionProgress(m) {
    const visits = state.visits.filter(function (v) {
      return v.mission_id === m.id && (v.status === 'complete' || v.status === 'shortlisted');
    });
    const unique = new Set(visits.map(function (v) { return v.supplier_id; }).filter(Boolean)).size;
    const target = Number(m.target_supplier_count || 1);
    return { visits: visits.length, suppliers: unique, target: target, percent: Math.min(100, Math.round((unique / target) * 100)) };
  }

  function missionActivityText(a) {
    if (!a) return 'لم تُفتح بعد';
    if (a.event_type === 'opened') return 'فتح المهمة';
    if (a.event_type === 'stage') return a.stage_title || 'بدأ التنفيذ';
    if (a.event_type === 'draft_saved') return 'حفظ Draft';
    if (a.event_type === 'supplier_completed') return 'أنهى مورد';
    if (a.event_type === 'mission_ready') return 'جاهزة للمراجعة';
    return a.event_type;
  }

  function missionCard(m) {
    const p = missionProgress(m);
    const latest = latestMissionActivity(m.id);
    const opened = firstMissionActivity(m.id, 'opened');
    const started = firstMissionActivity(m.id, 'stage');
    const supplierNow = latest && latest.supplier_no ? latest.supplier_no : Math.min(p.target, p.suppliers + 1);
    const currentTask = latest ? missionActivityText(latest) : 'لم تُفتح بعد';
    const liveClass = latest && ['stage','opened'].includes(latest.event_type) ? ' live' : '';
    const help = openHelpForMission(m.id);
    const helpBlock = state.access === 'admin' && help
      ? '<div class="mission-help-alert"><div><span>' + esc(helpTypeLabel(help.request_type)) + '</span><b>' + esc(help.message) + '</b><small>' +
        esc(help.stage_title || 'داخل المهمة') + (help.supplier_no ? ' · المورد ' + esc(String(help.supplier_no)) : '') + ' · ' +
        esc(relativeActivityTime(help.created_at)) + '</small></div><button class="mini-btn help-resolve" type="button" data-answer-help="' + esc(help.id) + '">رد وحل</button></div>'
      : '';

    return '<article class="mission-card' + liveClass + (help ? ' needs-help' : '') + '">' +
      '<div class="mission-main"><span class="mission-code">' + esc(m.mission_code) + '</span><b>' + esc(m.title) + '</b><small>' +
      esc(trackLabel(m.track)) + ' · ' + esc(m.assigned_to || 'غير محدد') + (m.due_date ? ' · حتى ' + esc(m.due_date) : '') + '</small>' +
      (state.access === 'admin' ? '<div class="mission-live-status">' +
        '<span><small>فتح المهمة</small><b>' + esc(opened ? relativeActivityTime(opened.created_at) : 'لم يفتح') + '</b></span>' +
        '<span><small>بدأ التنفيذ</small><b>' + esc(started ? relativeActivityTime(started.created_at) : 'لم يبدأ') + '</b></span>' +
        '<span><small>المورد الحالي</small><b>' + esc(String(supplierNow)) + ' / ' + esc(String(p.target)) + '</b></span>' +
        '<span class="wide"><small>آخر Task</small><b>' + esc(currentTask) + '</b></span>' +
        '<span><small>آخر نشاط</small><b>' + esc(latest ? relativeActivityTime(latest.created_at) : '—') + '</b></span>' +
      '</div>' : '') +
      helpBlock +
      '</div>' +
      '<div class="mission-progress"><div><span>SUPPLIERS</span><strong>' + p.suppliers + ' / ' + p.target + '</strong></div><i><b style="width:' + p.percent + '%"></b></i></div>' +
      '<div class="mission-actions"><span class="status-pill status-' + (m.status === 'active' ? 'complete' : 'draft') + '">' + esc(m.status.toUpperCase()) + '</span>' +
      (state.access === 'admin' && m.status === 'active' ? '<button class="mini-btn" type="button" data-mission-complete="' + esc(m.id) + '">Complete</button>' : '') +
      (state.access === 'admin' ? '<button class="mini-btn" type="button" data-share-mission="' + esc(m.id) + '">إرسال المهمة</button>' : '') +
      '<button class="mini-btn" type="button" data-start-mission="' + esc(m.id) + '">زيارة</button></div></article>';
  }

  function renderMissions() {
    const rows = state.missions;
    $('#missions-list').innerHTML = rows.length ? rows.map(missionCard).join('') : '<div class="empty">لا توجد مهمات ميدانية حتى الآن.</div>';
  }

  function newMissionCode() {
    const d = localDate().replace(/-/g, '').slice(2);
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return 'MIS-' + d + '-' + String(a[0] % 10000).padStart(4, '0');
  }

  $('#new-mission-button').addEventListener('click', function () {
    if (state.access !== 'admin') return;
    $('#mission-form').reset();
    $('#mission-target').value = '3';
    $('#mission-dialog').showModal();
  });

  $('[data-close-help-response]').forEach(function (btn) {
    btn.addEventListener('click', function () { $('#mission-help-response-dialog').close(); });
  });

  $('#mission-help-response-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (state.access !== 'admin') return;
    const id = $('#mission-help-response-id').value;
    const note = $('#mission-help-admin-note').value.trim();
    if (!id || !note) return notify('اكتب الرد أو التعليمات أولًا.', 'error');
    const r = await state.sb.from('studio_sourcing_help_requests').update({
      status: 'resolved',
      admin_note: note,
      resolved_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) return notify(r.error.message, 'error');
    $('#mission-help-response-dialog').close();
    notify('تم إرسال الرد وإغلاق طلب المساعدة ✓');
    await refreshSupport();
  });

  $('#mission-help-button').addEventListener('click', function () {
    if (state.access !== 'field' || !state.focusMissionId || openHelpForMission(state.focusMissionId)) return;
    $('#mission-help-form').reset();
    $('#mission-help-dialog').showModal();
  });

  $('[data-close-help]').forEach(function (btn) {
    btn.addEventListener('click', function () { $('#mission-help-dialog').close(); });
  });

  $('#mission-help-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (state.access !== 'field' || !state.focusMissionId) return;
    const message = $('#mission-help-message').value.trim();
    if (!message) return notify('اكتب المشكلة أو السؤال أولًا.', 'error');
    const mission = state.missions.find(function (m) { return m.id === state.focusMissionId; });
    if (!mission) return;
    const progress = completedMissionProgress(mission);
    const stage = state.guidedStages[state.guidedIndex];
    const payload = {
      mission_id: mission.id,
      visit_id: state.editingVisitId || null,
      device_id: state.device && state.device.id ? state.device.id : '',
      request_type: $('#mission-help-type').value,
      message: message,
      stage_title: stage ? stage.title : '',
      supplier_no: Math.min(progress.target, progress.suppliers + 1),
      status: 'open'
    };
    const r = await state.sb.from('studio_sourcing_help_requests').insert(payload).select().single();
    if (r.error) return notify(r.error.message || 'تعذر إرسال طلب المساعدة.', 'error');
    state.helpRequests.unshift(r.data);
    $('#mission-help-dialog').close();
    updateMissionHelpButton();
    notify('تم إرسال طلب المساعدة للمسؤول ✓');
  });

  $('#mission-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (state.access !== 'admin') return;
    const payload = {
      mission_code: newMissionCode(),
      title: $('#mission-title').value.trim(),
      track: $('#mission-track').value,
      objective: $('#mission-objective').value.trim(),
      assigned_to: $('#mission-owner').value.trim(),
      assigned_phone: $('#mission-phone').value.trim(),
      target_supplier_count: Number($('#mission-target').value || 3),
      due_date: $('#mission-due').value || null,
      notes: $('#mission-notes').value.trim(),
      status: 'active'
    };
    if (!payload.title) return notify('اكتب عنوان المهمة.', 'error');
    const r = await state.sb.from('studio_sourcing_missions').insert(payload);
    if (r.error) return notify(r.error.message, 'error');
    $('#mission-dialog').close();
    notify('تم إنشاء المهمة الميدانية.');
    await loadAll();
    go('missions');
  });

  document.addEventListener('click', async function (e) {
    const answerHelp = e.target.closest('[data-answer-help]');
    if (answerHelp && state.access === 'admin') {
      const req = state.helpRequests.find(function (x) { return x.id === answerHelp.dataset.answerHelp; });
      if (!req) return;
      $('#mission-help-response-id').value = req.id;
      $('#mission-help-admin-note').value = '';
      $('#mission-help-response-context').innerHTML =
        '<b>' + esc(helpTypeLabel(req.request_type)) + '</b><p>' + esc(req.message) + '</p><small>' +
        esc(req.stage_title || 'داخل المهمة') + (req.supplier_no ? ' · المورد ' + esc(String(req.supplier_no)) : '') + '</small>';
      $('#mission-help-response-dialog').showModal();
      return;
    }

    const share = e.target.closest('[data-share-mission]');
    if (share && state.access === 'admin') {
      const m = state.missions.find(function (x) { return x.id === share.dataset.shareMission; });
      if (!m) return;
      shareMissionWhatsApp(m);
      return;
    }

    const start = e.target.closest('[data-start-mission]');
    if (start) {
      const m = state.missions.find(function (x) { return x.id === start.dataset.startMission; });
      if (!m) return;
      return openMission(m, state.access === 'field');
    }
    const complete = e.target.closest('[data-mission-complete]');
    if (complete && state.access === 'admin') {
      const m = state.missions.find(function (x) { return x.id === complete.dataset.missionComplete; });
      if (!m) return;
      const p = missionProgress(m);
      if (p.suppliers < p.target && !confirm('لسه لم يتم جمع العدد المستهدف من الموردين. إغلاق المهمة رغم ذلك؟')) return;
      const r = await state.sb.from('studio_sourcing_missions').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', m.id);
      if (r.error) return notify(r.error.message, 'error');
      notify('تم إغلاق المهمة.');
      await loadAll();
    }
  });

  function renderDevices() {
    if (state.access !== 'admin') return;
    $('#devices-list').innerHTML = state.devices.length ? state.devices.map(function (d) {
      return '<article class="device-card"><div><b>' + esc(d.label || 'Field device') + ' · <span class="' + esc(d.status) + '">' + esc(d.status.toUpperCase()) +
        '</span></b><small>Code ' + esc(d.claim_code) + ' · Created ' + esc(String(d.created_at || '').slice(0, 16).replace('T', ' ')) + '</small></div>' +
        '<div class="device-card-actions">' +
        (d.status !== 'approved' ? '<button class="mini-btn" type="button" data-device-action="approved" data-device-id="' + esc(d.device_id) + '">Approve</button>' : '') +
        (d.status !== 'revoked' ? '<button class="mini-btn" type="button" data-device-action="revoked" data-device-id="' + esc(d.device_id) + '">Revoke</button>' : '') +
        '</div></article>';
    }).join('') : '<div class="empty">لا توجد أجهزة ميدانية.</div>';
  }

  $('#devices-list').addEventListener('click', async function (e) {
    const btn = e.target.closest('[data-device-action]');
    if (!btn || state.access !== 'admin') return;
    const status = btn.dataset.deviceAction;
    const patch = { status: status, approved_at: status === 'approved' ? new Date().toISOString() : null };
    const r = await state.sb.from('studio_sourcing_devices').update(patch).eq('device_id', btn.dataset.deviceId);
    if (r.error) return notify(r.error.message, 'error');
    notify(status === 'approved' ? 'تم اعتماد جهاز الفريق.' : 'تم إيقاف الجهاز.');
    await loadDevices();
    renderDevices();
  });

  function labelForKey(track, key) {
    const groups = TRACKS[track] ? TRACKS[track].groups : [];
    for (const g of groups) {
      for (const item of g.items) if (item.k === key) return item.l;
    }
    return key;
  }

  function printVisit(id) {
    const v = state.visits.find(function (x) { return x.id === id; });
    if (!v) return;
    const s = supplierFor(v.supplier_id);
    const checklistRows = Object.keys(v.checklist || {}).filter(function (k) {
      const val = v.checklist[k];
      return val === true || (val !== false && val !== '');
    }).map(function (k) {
      const val = v.checklist[k];
      return '<tr><th>' + esc(labelForKey(v.track, k)) + '</th><td>' + esc(val === true ? 'Yes' : val) + '</td></tr>';
    }).join('');
    const pricingRows = Object.keys(v.pricing || {}).filter(function (k) { return v.pricing[k] !== null && v.pricing[k] !== ''; }).map(function (k) {
      const pair = TRACKS[v.track].prices.find(function (x) { return x[0] === k; });
      return '<tr><th>' + esc(pair ? pair[1] : k) + '</th><td>' + esc(money(v.pricing[k])) + '</td></tr>';
    }).join('');
    $('#print-report').innerHTML =
      '<h1>Field Sourcing Visit — ' + esc(v.visit_code) + '</h1>' +
      '<div class="print-meta"><div><b>Supplier:</b> ' + esc(s ? s.name : '—') + '</div><div><b>Track:</b> ' + esc(trackLabel(v.track)) + '</div>' +
      '<div><b>Date:</b> ' + esc(v.visit_date) + '</div><div><b>Status:</b> ' + esc(statusLabel(v.status)) + '</div>' +
      '<div><b>Phone:</b> ' + esc(s ? s.phone : '—') + '</div><div><b>Address:</b> ' + esc(s ? s.address : '—') + '</div></div>' +
      '<h2>Checklist</h2><table>' + (checklistRows || '<tr><td>No checklist data</td></tr>') + '</table>' +
      '<h2>Pricing</h2><table>' + (pricingRows || '<tr><td>No pricing data</td></tr>') + '</table>' +
      '<h2>Commercial</h2><table><tr><th>Sample</th><td>' + (v.sample_available ? 'Available' : 'No') + '</td></tr><tr><th>Sample cost</th><td>' +
      esc(money(v.sample_cost)) + '</td></tr><tr><th>MOQ</th><td>' + esc(v.moq == null ? '—' : v.moq) + '</td></tr><tr><th>Lead time</th><td>' +
      esc(v.lead_time || '—') + '</td></tr><tr><th>Quoted total</th><td>' + esc(money(v.quoted_total)) + '</td></tr></table>' +
      '<h2>Field Evaluation</h2><p><b>Quality:</b> ' + esc(v.quality_rating == null ? '—' : v.quality_rating + '/10') + ' · <b>Price:</b> ' +
      esc(v.price_rating == null ? '—' : v.price_rating + '/10') + ' · <b>Service:</b> ' + esc(v.service_rating == null ? '—' : v.service_rating + '/10') +
      '</p><p><b>Recommendation:</b> ' + esc(v.recommendation || '—') + '</p><p><b>Notes:</b> ' + esc(v.notes || '—') + '</p>';
    window.print();
  }

  initAccess();
})();