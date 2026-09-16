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
    button.disabled = true; button.textContent = lang === 'ar' ? 'جاري إنشاء الطلب…' : 'CREATING REQUEST…';
    const { data, error } = await sb.rpc('studio_submit_public_consultation_request', payload);
    if (error) {
      console.error(error); toast(lang === 'ar' ? 'تعذر إرسال الطلب. حاول مرة أخرى.' : 'Could not submit the request. Please try again.');
      button.disabled = false; button.textContent = lang === 'ar' ? 'ابدأ طلب الاستشارة ←' : 'START MY CONSULTATION →';
      return;
    }
    $('#consultation-form').classList.add('hidden');
    $('#success-state').classList.remove('hidden');
    $('#success-copy').textContent = lang === 'ar'
      ? `تم إنشاء طلبك ${data?.lead_code || ''}. الخطوة التالية فقط هي رابط الحجز/الدفع الآمن بقيمة $${Number(data?.consultation_fee_usd || 75).toFixed(0)}.`
      : `Your request ${data?.lead_code || ''} is created. The only next step is the secure $${Number(data?.consultation_fee_usd || 75).toFixed(0)} booking/payment link.`;
    $('#success-state').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  applyLang('en');
})();
