(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  if (!cfg || !window.supabase) return;

  const DEVICE_KEY = 'andrew_portfolio_device_v2';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let currentDevice = null;
  let sb = null;
  let refreshTimer = null;

  try { currentDevice = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null'); } catch (_) {}

  if (currentDevice?.id && currentDevice?.secret) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      global: { headers: {
        'x-portfolio-device-id': currentDevice.id,
        'x-portfolio-device-secret': currentDevice.secret
      }},
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  function toast(message, type = 'success') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast show ${type}`;
    setTimeout(() => el.className = 'toast', 2800);
  }

  function esc(v = '') {
    return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }

  function fmtDate(v) {
    if (!v) return '—';
    try { return new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (_) { return v; }
  }

  function injectStyles() {
    if ($('#trusted-devices-styles')) return;
    const style = document.createElement('style');
    style.id = 'trusted-devices-styles';
    style.textContent = `
      .device-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
      .device-metric{background:#fff;border:1px solid #e1e8ed;border-radius:16px;padding:18px;box-shadow:0 10px 26px rgba(8,28,43,.05)}
      .device-metric span{display:block;color:#7b8d99;font-size:9px;text-transform:uppercase;letter-spacing:1.1px}.device-metric strong{display:block;font-size:30px;color:#0b2436;margin-top:7px}
      .device-approve-box{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;margin-top:18px}.device-approve-box label{margin:0!important}.device-approve-box input{font-size:20px!important;letter-spacing:6px;text-align:center;font-weight:800}
      .device-list{display:grid;gap:10px;margin-top:18px}.device-row{display:grid;grid-template-columns:minmax(0,1.3fr) .55fr .75fr auto;gap:14px;align-items:center;border:1px solid #e3eaee;border-radius:14px;padding:14px;background:#fbfcfd}.device-row.current-device{border-color:rgba(225,6,19,.35);box-shadow:inset 3px 0 #e10613}.device-name{display:flex;align-items:center;gap:11px}.device-icon{width:38px;height:38px;border-radius:12px;background:#0c2b40;color:#fff;display:grid;place-items:center;font-size:17px}.device-name h3{font-size:12px;margin:0 0 4px}.device-name p,.device-meta p{font-size:8px;color:#7b8d99;margin:2px 0}.device-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}.device-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:800;letter-spacing:1.5px;color:#0e2f46}.device-badge{display:inline-flex;border-radius:30px;padding:6px 9px;font-size:8px;font-weight:900;text-transform:uppercase}.device-badge.approved{background:#daf6e9;color:#15704a}.device-badge.pending{background:#fff0d8;color:#986100}.device-badge.revoked{background:#ffe0e4;color:#9e1d2b}.device-current{display:inline-flex;margin-left:6px;background:#e10613;color:#fff;border-radius:30px;padding:4px 7px;font-size:7px;font-weight:900;letter-spacing:.4px}.devices-empty{padding:30px;text-align:center;color:#7b8d99;font-size:11px}
      @media(max-width:900px){.device-metrics{grid-template-columns:repeat(2,1fr)}.device-row{grid-template-columns:1fr auto}.device-meta,.device-code-cell{display:none}}
      @media(max-width:600px){.device-metrics{grid-template-columns:1fr 1fr}.device-approve-box{grid-template-columns:1fr}.device-row{grid-template-columns:1fr}.device-actions{justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function injectPanel() {
    const nav = $('#admin-nav');
    const main = $('.admin-main');
    if (!nav || !main || $('[data-tab="devices"]')) return;

    const navButton = document.createElement('button');
    navButton.dataset.tab = 'devices';
    navButton.innerHTML = '◉ <span>Trusted Devices</span>';
    nav.appendChild(navButton);

    const panel = document.createElement('section');
    panel.className = 'tab-panel';
    panel.dataset.panel = 'devices';
    panel.innerHTML = `
      <div class="device-metrics">
        <article class="device-metric"><span>Trusted</span><strong id="d-approved">0</strong></article>
        <article class="device-metric"><span>Pending</span><strong id="d-pending">0</strong></article>
        <article class="device-metric"><span>Revoked</span><strong id="d-revoked">0</strong></article>
        <article class="device-metric"><span>This Device</span><strong id="d-current">✓</strong></article>
      </div>
      <div class="panel-card">
        <div class="panel-head"><div><span>DEVICE ACCESS</span><h2>Trusted Devices</h2></div><button id="devices-refresh" class="secondary">REFRESH</button></div>
        <p style="font-size:10px;color:#7b8d99;line-height:1.7;margin:12px 0 0">Approve a new phone or computer directly from here. No Supabase dashboard, email, or password is needed.</p>
        <div class="device-approve-box">
          <label>6-Digit Approval Code<input id="approve-device-code" inputmode="numeric" maxlength="6" placeholder="000000"></label>
          <button id="approve-device-button" class="primary">APPROVE DEVICE</button>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-head"><div><span>ACCESS LIST</span><h2>All Devices</h2></div></div>
        <div id="trusted-devices-list" class="device-list"><div class="devices-empty">Loading devices…</div></div>
      </div>`;
    main.appendChild(panel);

    navButton.addEventListener('click', () => {
      $$('#admin-nav button').forEach(b => b.classList.toggle('active', b === navButton));
      $$('.tab-panel').forEach(p => p.classList.toggle('active', p === panel));
      const title = $('#page-title'); if (title) title.textContent = 'Trusted Devices';
      loadDevices();
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(() => {
        if (panel.classList.contains('active')) loadDevices(true);
      }, 15000);
    });

    $('#devices-refresh').addEventListener('click', () => loadDevices());
    $('#approve-device-button').addEventListener('click', approveByCode);
    $('#approve-device-code').addEventListener('keydown', e => { if (e.key === 'Enter') approveByCode(); });
  }

  async function approveByCode() {
    if (!sb) return toast('This browser is not trusted yet.', 'error');
    const input = $('#approve-device-code');
    const code = (input?.value || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) return toast('Enter the 6-digit code.', 'error');
    const btn = $('#approve-device-button');
    btn.disabled = true; btn.textContent = 'APPROVING…';
    const { error } = await sb.rpc('portfolio_device_approve_code', { p_code: code });
    btn.disabled = false; btn.textContent = 'APPROVE DEVICE';
    if (error) return toast(error.message, 'error');
    if (input) input.value = '';
    toast('Device approved. It can open the Control Center now.');
    await loadDevices();
  }

  async function manageDevice(deviceId, action, label = null) {
    if (!sb) return toast('This browser is not trusted yet.', 'error');
    const { error } = await sb.rpc('portfolio_device_manage', {
      p_device_id: deviceId,
      p_action: action,
      p_label: label
    });
    if (error) return toast(error.message, 'error');

    if ((action === 'revoke' || action === 'remove') && deviceId === currentDevice?.id) {
      localStorage.removeItem(DEVICE_KEY);
      toast('This device was revoked.');
      setTimeout(() => location.reload(), 700);
      return;
    }

    const message = action === 'approve' ? 'Device approved.' : action === 'revoke' ? 'Device access revoked.' : action === 'remove' ? 'Device removed.' : 'Device renamed.';
    toast(message);
    await loadDevices();
  }

  function renderDevices(rows) {
    $('#d-approved').textContent = rows.filter(d => d.status === 'approved').length;
    $('#d-pending').textContent = rows.filter(d => d.status === 'pending').length;
    $('#d-revoked').textContent = rows.filter(d => d.status === 'revoked').length;
    $('#d-current').textContent = rows.some(d => d.is_current) ? '✓' : '—';

    const list = $('#trusted-devices-list');
    if (!rows.length) { list.innerHTML = '<div class="devices-empty">No devices yet.</div>'; return; }

    list.innerHTML = rows.map(d => {
      const current = !!d.is_current;
      const icon = /windows/i.test(d.label || '') ? '▣' : /phone|mobile|android|iphone/i.test(d.label || '') ? '▯' : '◈';
      let actions = `<button class="icon-btn" data-device-action="rename" data-device-id="${esc(d.device_id)}" data-device-label="${esc(d.label)}">RENAME</button>`;
      if (d.status === 'pending') actions += `<button class="primary" data-device-action="approve" data-device-id="${esc(d.device_id)}">APPROVE</button><button class="danger" data-device-action="revoke" data-device-id="${esc(d.device_id)}">REJECT</button>`;
      if (d.status === 'approved') actions += `<button class="danger" data-device-action="revoke" data-device-id="${esc(d.device_id)}">${current ? 'REVOKE THIS DEVICE' : 'REVOKE'}</button>`;
      if (d.status === 'revoked') actions += `<button class="danger" data-device-action="remove" data-device-id="${esc(d.device_id)}">REMOVE</button>`;
      return `<div class="device-row ${current ? 'current-device' : ''}">
        <div class="device-name"><div class="device-icon">${icon}</div><div><h3>${esc(d.label || 'Trusted browser')}${current ? '<span class="device-current">THIS DEVICE</span>' : ''}</h3><p>Added ${esc(fmtDate(d.created_at))}</p><p>Last seen ${esc(fmtDate(d.last_seen_at))}</p></div></div>
        <div class="device-code-cell"><span class="device-code">${esc(d.claim_code || '—')}</span></div>
        <div class="device-meta"><span class="device-badge ${esc(d.status)}">${esc(d.status)}</span><p>Approved ${esc(fmtDate(d.approved_at))}</p></div>
        <div class="device-actions">${actions}</div>
      </div>`;
    }).join('');

    $$('[data-device-action]', list).forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.deviceId;
      const action = btn.dataset.deviceAction;
      if (action === 'rename') {
        const next = prompt('Device name', btn.dataset.deviceLabel || 'Trusted device');
        if (next !== null && next.trim()) await manageDevice(id, 'rename', next.trim());
        return;
      }
      if (action === 'revoke') {
        const isCurrent = id === currentDevice?.id;
        if (!confirm(isCurrent ? 'Revoke this device? You will need to approve it again to enter the Control Center.' : 'Revoke access for this device?')) return;
      }
      if (action === 'remove' && !confirm('Remove this device record?')) return;
      await manageDevice(id, action);
    }));
  }

  async function loadDevices(silent = false) {
    if (!sb) {
      if (!silent) toast('This browser is not trusted yet.', 'error');
      return;
    }
    const list = $('#trusted-devices-list');
    if (list && !silent) list.innerHTML = '<div class="devices-empty">Loading devices…</div>';
    const { data, error } = await sb.rpc('portfolio_devices_list');
    if (error) {
      if (list) list.innerHTML = `<div class="devices-empty">${esc(error.message)}</div>`;
      if (!silent) toast(error.message, 'error');
      return;
    }
    renderDevices(data || []);
  }

  injectStyles();
  injectPanel();
})();