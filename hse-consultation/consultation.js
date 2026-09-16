(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let lang = 'en';
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

  function toast(message) {
    const el = $('#toast'); if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.body.dataset.lang = next;
    $$('[data-en]').forEach(el => { const value = el.dataset[next]; if (value !== undefined) el.textContent = value; });
    $$('[data-en-html]').forEach(el => { const value = el.dataset[`${next}Html`]; if (value !== undefined) el.innerHTML = value; });
    $$('[data-en-placeholder]').forEach(el => { const value = el.dataset[`${next}Placeholder`]; if (value !== undefined) el.placeholder = value; });
    $('#lang-toggle').textContent = next === 'en' ? 'EN | عربي' : 'العربية | EN';
  }

  $('#lang-toggle')?.addEventListener('click', () => applyLang(lang === 'en' ? 'ar' : 'en'));

  $('#consultation-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const selected = $('#hazard').value;
    if (!selected) return toast(lang === 'ar' ? 'اختر نوع المشكلة أولًا' : 'Choose the issue first');
    const [hazardCode, hazardName] = selected.split('|');
    const payload = {
      p_full_name: $('#full-name').value.trim(),
      p_email: $('#email').value.trim().toLowerCase(),
      p_phone: $('#phone').value.trim() || null,
      p_company_name: $('#company').value.trim() || null,
      p_hazard_code: hazardCode,
      p_hazard_name: hazardName,
      p_summary: $('#summary').value.trim(),
      p_jurisdiction: $('#jurisdiction').value.trim() || null
    };
    if (payload.p_full_name.length < 2 || !payload.p_email.includes('@') || payload.p_summary.length < 10) return toast(lang === 'ar' ? 'راجع الاسم والبريد ووصف المشكلة' : 'Check your name, email and problem description');
    const button = $('#submit-consultation');
    button.disabled = true; button.textContent = lang === 'ar' ? 'جاري فتح الحالة…' : 'OPENING YOUR CASE…';
    const { data, error } = await sb.rpc('studio_submit_public_consultation_request', payload);
    if (error) {
      console.error(error); toast(lang === 'ar' ? 'تعذر إرسال الطلب. حاول مرة أخرى.' : 'Could not submit the request. Please try again.');
      button.disabled = false; button.textContent = lang === 'ar' ? 'ابدأ طلب الاستشارة ←' : 'START MY CONSULTATION →';
      return;
    }
    $('#consultation-form').classList.add('hidden');
    $('#success-state').classList.remove('hidden');
    const caseCode = data?.case_code || data?.lead_code || '';
    const fee = Number(data?.consultation_fee_usd || 75).toFixed(0);
    $('#success-copy').textContent = lang === 'ar'
      ? `تم فتح حالتك ${caseCode}. بيانات المشكلة محفوظة بالفعل، ومش هتحتاج تكتبها مرة تانية.`
      : `Your case ${caseCode} is open. Your problem details are already saved, so you will not need to enter them again.`;

    const nextBox = $('#success-state .next-box');
    if (data?.checkout_url) {
      nextBox.innerHTML = lang === 'ar'
        ? `<b>الخطوة الوحيدة المطلوبة الآن</b><p>إتمام حجز الاستشارة بقيمة $${fee}. لا توجد أي خدمات إضافية مضافة.</p><a class="home-link" href="${data.checkout_url}" target="_blank" rel="noopener">ادفع $${fee} واحجز الاستشارة ←</a>`
        : `<b>YOUR ONLY NEXT STEP</b><p>Complete the $${fee} consultation booking. No additional service has been added.</p><a class="home-link" href="${data.checkout_url}" target="_blank" rel="noopener">PAY $${fee} & BOOK CONSULTATION →</a>`;
    } else {
      nextBox.innerHTML = lang === 'ar'
        ? `<b>إيه الخطوة الجاية؟</b><p>هنرسل لك رابط الحجز/الدفع الآمن بقيمة $${fee} على البريد المسجل. لحد ما الرابط يوصل، مش مطلوب منك أي إجراء آخر.</p>`
        : `<b>WHAT HAPPENS NEXT?</b><p>We’ll send the secure $${fee} booking/payment link to your email. Until that link is ready, nothing else is required from you.</p>`;
    }
    if (!$('#success-state [data-client-portal-link]')) {
      const portal = document.createElement('a');
      portal.href = '/client-v9/#hse';
      portal.className = 'home-link';
      portal.dataset.clientPortalLink = '1';
      portal.textContent = lang === 'ar' ? 'متابعة الحالة من بوابة العميل' : 'TRACK CASE IN CLIENT PORTAL';
      $('#success-state').appendChild(portal);
    }
    $('#success-state').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  applyLang('en');
})();
