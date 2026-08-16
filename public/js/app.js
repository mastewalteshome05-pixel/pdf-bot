/**
 * app.js — global app state + bootstrap. Wires the dashboard, settings,
 * FAQ, admin panel, and the Telegram login handshake together, then
 * kicks everything off on DOMContentLoaded.
 */
const AppState = (() => {
  const DEFAULT_SETTINGS = { darkMode: true, language: 'en', syncTelegramTheme: true };

  let user = null;
  let token = null;
  let settings = { ...DEFAULT_SETTINGS, ...loadLocalSettings() };
  let config = { supportUsername: 'officalvexon', freeDailyLimit: 10 }; // overwritten by /api/user/stats on load
  let usage = { used: 0, limit: 10, remaining: 10, premium: false, resetAt: null }; // overwritten by /api/user/usage on login

  function loadLocalSettings() {
    try {
      return JSON.parse(localStorage.getItem('pdfpro_settings') || '{}');
    } catch {
      return {};
    }
  }

  function persistSettings() {
    localStorage.setItem('pdfpro_settings', JSON.stringify(settings));
  }

  function updateSettings(patch) {
    settings = { ...settings, ...patch };
    persistSettings();
    fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(settings)
    }).catch(() => {}); // best-effort sync; local settings already applied
  }

  function get(key) {
    if (key === 'settings') return settings;
    if (key === 'config') return config;
    if (key === 'usage') return usage;
    return undefined;
  }

  function setUser(u, t) {
    user = u;
    token = t;
  }

  function setConfig(patch) {
    config = { ...config, ...patch };
  }

  function authHeaders() {
    const headers = {};
    if (user) headers['X-Telegram-Id'] = String(user.id);
    if (user && user.premium) headers['X-Premium'] = 'true';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  function renderUsage() {
    const statOps = document.getElementById('stat-ops');
    const statRemaining = document.getElementById('stat-remaining');
    if (statOps) statOps.textContent = String(usage.used);
    if (statRemaining) statRemaining.textContent = usage.premium ? '∞' : String(usage.remaining);
  }

  /**
   * Pulls the caller's REAL server-tracked usage for their current rolling
   * 24h window (see GET /api/user/usage). This replaces the old approach of
   * guessing from a sessionStorage counter that reset on every new tab and
   * was never synced with what the server actually enforces.
   */
  async function syncUsage() {
    if (!token) { renderUsage(); return; } // not logged in (guest/browser mode) — show static defaults
    try {
      const res = await fetch('/api/user/usage', { headers: authHeaders() });
      const body = await res.json();
      if (body.ok) {
        usage = {
          used: body.data.used,
          limit: body.data.limit,
          remaining: body.data.remaining,
          premium: body.data.premium,
          resetAt: body.data.resetAt
        };
      }
    } catch (_) {
      // best-effort — keep showing the last known values rather than an error
    }
    renderUsage();
  }

  /** Optimistic +1 right after a tool finishes, so the UI feels instant — syncUsage() then reconciles with the real count shortly after. */
  function incrementLocalOps() {
    usage.used += 1;
    if (!usage.premium) usage.remaining = Math.max(0, usage.remaining - 1);
    renderUsage();
    setTimeout(syncUsage, 1200); // reconcile with the server's real count shortly after
  }

  return {
    get, updateSettings, setUser, setConfig, authHeaders,
    incrementLocalOps, syncUsage, renderUsage, getUser: () => user
  };
})();

// ── FAQ content ──────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'Is my data private?', a: 'Files are processed on the server and automatically deleted shortly after — nothing is kept longer than needed to generate your result.' },
  { q: 'What file size can I upload?', a: 'Free accounts can upload files up to the server-configured limit (default 50MB). Premium raises this limit.' },
  { q: 'Why did PDF ⇄ Word conversion fail?', a: 'That feature needs LibreOffice installed on the server. Ask your admin to install it if you see a conversion error.' },
  { q: 'How many free operations do I get per day?', a: 'Free accounts get a limited number of operations per day (shown on your dashboard). Premium removes this limit.' },
  { q: 'Does OCR support my language?', a: 'Yes — pick your language before running OCR. More languages can be added by an admin.' }
];

function renderFaq() {
  const list = document.getElementById('faq-list');
  list.innerHTML = FAQ_ITEMS.map((item, i) => `
    <div class="faq-item" data-index="${i}">
      <div class="faq-q"><span>${item.q}</span><span class="chevron">⌄</span></div>
      <div class="faq-a">${item.a}</div>
    </div>
  `).join('');
  list.querySelectorAll('.faq-item').forEach((el) => {
    el.querySelector('.faq-q').addEventListener('click', () => el.classList.toggle('open'));
  });
}

// ── Dashboard wiring ─────────────────────────────────────────
function wireDashboard() {
  AppTools.renderGrid('all');

  document.querySelectorAll('.category-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      AppTools.renderGrid(tab.dataset.category);
    });
  });

  document.getElementById('btn-hero-upload').addEventListener('click', () => AppTools.openTool('merge'));
  document.getElementById('btn-hero-merge').addEventListener('click', () => AppTools.openTool('merge'));

}

// Join gate removed from the product flow.
function renderJoinGate() {}

// ── Settings view wiring ─────────────────────────────────────
function wireSettings() {
  const darkToggle = document.getElementById('toggle-dark');
  const tgThemeToggle = document.getElementById('toggle-tg-theme');
  const langSelect = document.getElementById('select-lang');

  const s = AppState.get('settings');
  darkToggle.checked = s.darkMode;
  tgThemeToggle.checked = s.syncTelegramTheme;
  langSelect.value = s.language;
  AppUI.setDarkMode(s.darkMode);
  AppUI.setLanguage(s.language);

  darkToggle.addEventListener('change', () => {
    AppUI.setDarkMode(darkToggle.checked);
    AppState.updateSettings({ darkMode: darkToggle.checked });
  });

  tgThemeToggle.addEventListener('change', () => {
    AppState.updateSettings({ syncTelegramTheme: tgThemeToggle.checked });
    if (tgThemeToggle.checked) AppTelegram.syncThemeFromTelegram();
  });

  langSelect.addEventListener('change', () => {
    AppUI.setLanguage(langSelect.value);
    AppState.updateSettings({ language: langSelect.value });
  });
}

// ── Premium / payments wiring ───────────────────────────────
// Stars = instant payment. USDT = manual confirmation request.
function openPaymentChooser(plan) {
  AppUI.openModal(`
    <div style="display:flex; flex-direction:column; gap:12px;">
      <h3 style="font-size:18px;">Choose payment method</h3>
      <p style="font-size:13px; color:var(--text-secondary);">Pick Telegram Stars for instant activation, or USDT for manual verification.</p>
      <button class="btn btn-primary btn-block" id="pay-stars-btn">💎 Telegram Stars</button>
      <button class="btn btn-ghost btn-block" id="pay-usdt-btn">🪙 USDT</button>
    </div>
  `);

  const sheet = document.getElementById('modal-sheet');
  const starsBtn = sheet.querySelector('#pay-stars-btn');
  const usdtBtn = sheet.querySelector('#pay-usdt-btn');
  starsBtn.addEventListener('click', () => {
    AppUI.closeModal();
    startStarsCheckout(plan, starsBtn);
  });
  usdtBtn.addEventListener('click', () => {
    openUsdtRequest(plan);
  });
}

async function startStarsCheckout(plan, btn) {
  const user = AppState.getUser();
  if (!user) {
    AppUI.toast('Open this from inside the Telegram app to subscribe.', 'error');
    return;
  }
  if (!AppTelegram.isInsideTelegram()) {
    AppUI.toast('Subscriptions are paid via Telegram Wallet — open PDF Pro AI inside Telegram to upgrade.', 'error');
    return;
  }

  btn.disabled = true;
  try {
    const res = await fetch('/api/payment/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() },
      body: JSON.stringify({ plan })
    });
    const body = await res.json();
    if (!body.ok) throw new Error(body.message);

    window.Telegram.WebApp.openInvoice(body.data.invoiceLink, (status) => {
      btn.disabled = false;
      if (status === 'paid') {
        AppUI.toast('💎 Payment successful — you are now Premium!', 'success');
        AppTelegram.haptic('success');
        setTimeout(() => {
          loginWithTelegram();
          loadAdminPanelIfAuthorized();
        }, 500);
      } else if (status === 'cancelled') {
        AppUI.toast('Checkout cancelled.', 'info');
      } else if (status === 'failed') {
        AppUI.toast('Payment failed. Please try again.', 'error');
      }
    });
  } catch (err) {
    btn.disabled = false;
    AppUI.toast(err.message || 'Could not start checkout.', 'error');
  }
}

async function openUsdtRequest(plan) {
  let usdtInfo = { walletAddress: 'YOUR_USDT_WALLET_ADDRESS', network: 'TRC20' };
  try {
    const infoRes = await fetch('/api/payment/usdt-info');
    const infoBody = await infoRes.json();
    if (infoBody.ok) usdtInfo = infoBody.data;
  } catch {
    // fallback to placeholder info
  }

  AppUI.openModal(`
    <div style="display:flex; flex-direction:column; gap:12px;">
      <h3 style="font-size:18px;">USDT payment request</h3>
      <p style="font-size:13px; color:var(--text-secondary);">Send USDT to the address below and paste the transaction hash here. Admin will verify it and unlock Premium.</p>
      <div class="glass" style="padding:12px;">
        <div style="font-size:11px; color:var(--text-muted);">Wallet</div>
        <div style="font-family:var(--font-mono); font-size:13px; word-break:break-all;">${usdtInfo.walletAddress || 'YOUR_USDT_WALLET_ADDRESS'}</div>
        <div style="margin-top:8px; font-size:12px; color:var(--text-muted);">Network: ${usdtInfo.network || 'TRC20'}</div>
      </div>
      <input type="text" id="usdt-txhash" placeholder="Transaction hash" />
      <input type="text" id="usdt-sender" placeholder="Sender wallet (optional)" />
      <button class="btn btn-primary btn-block" id="submit-usdt-btn">Submit request</button>
    </div>
  `);

  const sheet = document.getElementById('modal-sheet');
  sheet.querySelector('#submit-usdt-btn').addEventListener('click', async () => {
    const txHash = sheet.querySelector('#usdt-txhash').value.trim();
    const senderAddress = sheet.querySelector('#usdt-sender').value.trim();
    if (!txHash) return AppUI.toast('Please paste the transaction hash.', 'error');

    try {
      const res = await fetch('/api/payment/usdt-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() },
        body: JSON.stringify({ plan, txHash, senderAddress })
      });
      const body = await res.json();
      if (!body.ok) throw new Error(body.message);
      AppUI.closeModal();
      AppUI.toast('USDT request submitted. Admin will verify it shortly.', 'success');
      loadAdminPanelIfAuthorized();
    } catch (err) {
      AppUI.toast(err.message || 'Could not submit USDT request.', 'error');
    }
  });
}

async function renderPlanCards() {
  const grid = document.getElementById('premium-plans-grid');
  try {
    const res = await fetch('/api/payment/plans');
    const body = await res.json();
    if (!body.ok) throw new Error(body.message);

    grid.innerHTML = body.data.plans.map((p) => `
      <div class="plan-card" data-plan="${p.id}">
        <div class="plan-name">${p.label}</div>
        <div class="plan-price">$${p.usd}</div>
        <div class="plan-meta">${p.stars} Stars</div>
        <div class="plan-meta">${p.days} days access</div>
        <button class="btn btn-primary btn-block" data-select-plan="${p.id}">Upgrade</button>
      </div>
    `).join('');

    grid.querySelectorAll('[data-select-plan]').forEach((btn) => {
      btn.addEventListener('click', () => openPaymentChooser(btn.dataset.selectPlan));
    });
  } catch {
    grid.innerHTML = '<p style="font-size:12.5px; color:var(--text-muted);">Could not load plans right now.</p>';
  }
}

function wirePremium() {
  renderPlanCards();
}

async function loadReferralStats() {
  const user = AppState.getUser();
  if (!user) return;
  try {
    const res = await fetch('/api/user/referral', { headers: AppState.authHeaders() });
    const body = await res.json();
    if (!body.ok) return;

    document.getElementById('referral-count').textContent = body.data.referralCount;
    document.getElementById('referral-credits').textContent = body.data.freeCredits;
    document.getElementById('referral-link').textContent = body.data.referralLink || `Code: ${body.data.referralCode}`;

    document.getElementById('btn-copy-referral').onclick = () => {
      navigator.clipboard.writeText(body.data.referralLink || body.data.referralCode);
      AppUI.toast('Copied to clipboard', 'success');
    };
    document.getElementById('btn-share-referral').onclick = () => {
      AppTelegram.shareLink(body.data.referralLink || '', 'Join me on PDF Pro AI — free document tools in Telegram!');
    };
  } catch {
    // Referral stats are supplementary — never block the rest of the dashboard on this.
  }
}

// ── Admin panel ──────────────────────────────────────────────
async function loadAdminPanelIfAuthorized() {
  const user = AppState.getUser();
  if (!user) return;
  try {
    const res = await fetch('/api/user/admin/overview', { headers: AppState.authHeaders() });
    const body = await res.json();
    if (!body.ok) return; // not an admin — silently skip, link stays hidden

    document.getElementById('admin-nav-link').classList.remove('hidden');

    const stats = body.data.stats || {};
    const analytics = body.data.analytics || {};
    document.getElementById('admin-total-users').textContent = stats.totalUsers || 0;
    document.getElementById('admin-premium-users').textContent = stats.premiumUsers || 0;
    document.getElementById('admin-total-ops').textContent = stats.operationsToday || 0;
    document.getElementById('admin-pending-payments').textContent = analytics.pendingPayments || 0;
    document.getElementById('admin-stars-revenue').textContent = analytics.revenueStars || 0;
    document.getElementById('admin-usdt-revenue').textContent = analytics.revenueUsdt || 0;
    const dashUsers = document.getElementById('admin-dashboard-total-users');
    const dashPremium = document.getElementById('admin-dashboard-premium-users');
    const dashBroadcasts = document.getElementById('admin-dashboard-broadcasts');
    const dashReferrals = document.getElementById('admin-referral-count');
    const dashCredits = document.getElementById('admin-referral-credits');
    if (dashUsers) dashUsers.textContent = stats.totalUsers || 0;
    if (dashPremium) dashPremium.textContent = stats.premiumUsers || 0;
    if (dashBroadcasts) dashBroadcasts.textContent = (body.data.broadcasts || []).length || 0;
    if (dashReferrals) dashReferrals.textContent = (body.data.referrals && body.data.referrals.profiles ? body.data.referrals.profiles.length : 0) || 0;
    if (dashCredits) dashCredits.textContent = (body.data.referrals && body.data.referrals.profiles ? body.data.referrals.profiles.reduce((n, p) => n + Number(p.freeCredits || 0), 0) : 0);

    const tbodyUsers = document.querySelector('#admin-users-table tbody');
    if (tbodyUsers) {
      tbodyUsers.innerHTML = (body.data.users || []).map((u) => `
        <tr>
          <td>${(u.firstName || 'Unknown') + (u.lastName ? ' ' + u.lastName : '')}</td>
          <td>${u.username ? '@' + u.username : '—'}</td>
          <td><span class="admin-badge ${u.premium ? 'on' : 'off'}">${u.premium ? '💎 Premium' : 'Free'}</span></td>
          <td><button class="btn btn-ghost btn-sm" data-toggle-premium="${u.id}" data-current="${u.premium}">${u.premium ? 'Revoke' : 'Grant'}</button></td>
        </tr>
      `).join('');

      tbodyUsers.querySelectorAll('[data-toggle-premium]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const targetUserId = btn.dataset.togglePremium;
          const nextValue = btn.dataset.current !== 'true';
          await fetch('/api/user/admin/premium', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() },
            body: JSON.stringify({ targetUserId, premium: nextValue, plan: 'monthly', days: 30 })
          });
          loadAdminPanelIfAuthorized();
          AppUI.toast(`Premium ${nextValue ? 'granted' : 'revoked'} for user ${targetUserId}.`, 'success');
        });
      });
    }

    const payments = body.data.payments || [];
    const paymentsBody = document.querySelector('#admin-payments-table tbody');
    if (paymentsBody) {
      paymentsBody.innerHTML = payments.map((p) => `
        <tr>
          <td>${p.paymentId || '—'}</td>
          <td>${p.telegramId || '—'}</td>
          <td>${p.plan || '—'}</td>
          <td>${p.method || p.currency || '—'}</td>
          <td><span class="admin-badge ${String(p.status || 'paid').toLowerCase() === 'paid' ? 'on' : String(p.status || '').toLowerCase()}">${p.status || 'paid'}</span></td>
          <td>${p.amount || 0}</td>
          <td>
            ${String(p.status || '').toLowerCase() === 'pending'
              ? `<button class="btn btn-ghost btn-sm" data-approve-payment="${p.paymentId}">Approve</button>
                 <button class="btn btn-ghost btn-sm" data-reject-payment="${p.paymentId}">Reject</button>`
              : '—'}
          </td>
        </tr>
      `).join('');

      paymentsBody.querySelectorAll('[data-approve-payment]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await fetch(`/api/user/admin/payments/${btn.dataset.approvePayment}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() }
          });
          loadAdminPanelIfAuthorized();
          AppUI.toast('Payment approved.', 'success');
        });
      });
      paymentsBody.querySelectorAll('[data-reject-payment]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await fetch(`/api/user/admin/payments/${btn.dataset.rejectPayment}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() }
          });
          loadAdminPanelIfAuthorized();
          AppUI.toast('Payment rejected.', 'info');
        });
      });
    }

    const planSummary = body.data.analytics ? body.data.analytics.planSummary || {} : {};
    const summaryEl = document.getElementById('admin-plan-summary');
    if (summaryEl) {
      summaryEl.innerHTML = Object.keys(planSummary).map((key) => `
        <div class="mini-row">
          <strong>${key}</strong>
          <span>Paid: ${planSummary[key].paid || 0} • Pending: ${planSummary[key].pending || 0} • Rejected: ${planSummary[key].rejected || 0}</span>
        </div>
      `).join('');
    }

    const broadcastHistory = document.getElementById('admin-broadcast-history');
    if (broadcastHistory) {
      broadcastHistory.innerHTML = (body.data.broadcasts || []).slice(0, 5).map((b) => `
        <div class="mini-row">
          <strong>${(b.message || '').slice(0, 36) || 'Broadcast'}</strong>
          <span>${b.sentCount || 0} sent • ${new Date(b.date).toLocaleString()}</span>
        </div>
      `).join('') || '<div class="mini-row">No broadcasts yet.</div>';
    }

    const referralStats = body.data.referrals || {};
    const referralCountEl = document.getElementById('admin-referral-count');
    const referralCreditsEl = document.getElementById('admin-referral-credits');
    if (referralCountEl) referralCountEl.textContent = String((referralStats.profiles || []).reduce((n, p) => n + Number(p.referralCount || 0), 0));
    if (referralCreditsEl) referralCreditsEl.textContent = String((referralStats.profiles || []).reduce((n, p) => n + Number(p.freeCredits || 0), 0));

    const topReferrers = document.getElementById('admin-top-referrers');
    if (topReferrers) {
      topReferrers.innerHTML = (referralStats.topReferrers || []).map((p) => `
        <div class="mini-row">
          <strong>${p.username ? '@' + p.username : p.telegramId}</strong>
          <span>${p.referralCount || 0} referrals • ${p.freeCredits || 0} credits</span>
        </div>
      `).join('') || '<div class="mini-row">No referrals yet.</div>';
    }

    const referralEvents = document.getElementById('admin-referral-events');
    if (referralEvents) {
      referralEvents.innerHTML = (referralStats.events || []).slice(-6).reverse().map((e) => `
        <div class="mini-row">
          <strong>${e.type || 'referral'}</strong>
          <span>${e.telegramId || e.userId || '—'} • ${new Date(e.date || Date.now()).toLocaleString()}</span>
        </div>
      `).join('') || '<div class="mini-row">No referral events yet.</div>';
    }

    const accessLog = document.getElementById('admin-access-log');
    const errorLog = document.getElementById('admin-error-log');
    if (accessLog) {
      accessLog.innerHTML = (body.data.logs && body.data.logs.access ? body.data.logs.access : []).slice(-8).reverse().map((line) => `<div class="mini-row"><span>${line}</span></div>`).join('') || '<div class="mini-row">No access log entries.</div>';
    }
    if (errorLog) {
      errorLog.innerHTML = (body.data.logs && body.data.logs.error ? body.data.logs.error : []).slice(-8).reverse().map((line) => `<div class="mini-row"><span>${line}</span></div>`).join('') || '<div class="mini-row">No error log entries.</div>';
    }

    await loadAdminSettingsAndData();
  } catch {
    // Admin overview is optional — fail silently so it never blocks the dashboard.
  }
}

async function loadAdminSettingsAndData() {
  const settingsRes = await fetch('/api/user/admin/settings', { headers: AppState.authHeaders() });
  const settingsBody = await settingsRes.json();

  if (settingsBody.ok) {
    const s = settingsBody.data.settings;
    const maintenanceMode = document.getElementById('admin-maintenance-mode');
    const freeDailyLimit = document.getElementById('admin-free-limit');
    const monthlyUsd = document.getElementById('admin-monthly-usd');
    const yearlyUsd = document.getElementById('admin-yearly-usd');
    const proUsd = document.getElementById('admin-pro-usd');
    const monthlyStars = document.getElementById('admin-monthly-stars');
    const yearlyStars = document.getElementById('admin-yearly-stars');
    const proStars = document.getElementById('admin-pro-stars');
    if (maintenanceMode) maintenanceMode.checked = Boolean(s.maintenanceMode);
    if (freeDailyLimit) freeDailyLimit.value = s.freeDailyLimit;
    if (monthlyUsd) monthlyUsd.value = s.plans.monthly ? s.plans.monthly.usd : '';
    if (yearlyUsd) yearlyUsd.value = s.plans.yearly ? s.plans.yearly.usd : '';
    if (proUsd) proUsd.value = s.plans.pro ? s.plans.pro.usd : '';
    if (monthlyStars) monthlyStars.value = s.plans.monthly ? s.plans.monthly.stars : '';
    if (yearlyStars) yearlyStars.value = s.plans.yearly ? s.plans.yearly.stars : '';
    if (proStars) proStars.value = s.plans.pro ? s.plans.pro.stars : '';
  }

  try {
    const couponsRes = await fetch('/api/user/admin/coupons', { headers: AppState.authHeaders() });
    const couponsBody = await couponsRes.json();
    if (couponsBody.ok) renderCouponsAdmin(couponsBody.data.coupons || []);
  } catch {}
}

function renderCouponsAdmin(coupons = []) {
  const list = document.getElementById('admin-coupon-list');
  const empty = document.getElementById('admin-coupon-empty');
  if (!list) return;
  if (!coupons.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  list.innerHTML = coupons.map((c) => `
    <div class="mini-row">
      <div>
        <strong>${c.code}</strong>
        <span>${c.label || ''}</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <span>${c.type === 'fixed' ? '$' : ''}${c.value}${c.type === 'percent' ? '%' : ''} • ${c.active ? 'Active' : 'Paused'} • Uses ${c.used || 0}/${c.maxUses || '∞'}</span>
        <button class="btn btn-ghost btn-sm" data-coupon-toggle="${c.code}">${c.active ? 'Pause' : 'Activate'}</button>
        <button class="btn btn-ghost btn-sm" data-coupon-delete="${c.code}">Delete</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-coupon-toggle]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/user/admin/coupons/${encodeURIComponent(btn.dataset.couponToggle)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() }
      });
      loadAdminPanelIfAuthorized();
    });
  });

  list.querySelectorAll('[data-coupon-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/user/admin/coupons/${encodeURIComponent(btn.dataset.couponDelete)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() }
      });
      loadAdminPanelIfAuthorized();
    });
  });
}

function wireAdminSettingsForms() {
  const savePlansBtn = document.getElementById('btn-save-plans');
  if (savePlansBtn) {
    savePlansBtn.addEventListener('click', async () => {
      const maintenanceMode = document.getElementById('admin-maintenance-mode').checked;
      const freeDailyLimit = Number(document.getElementById('admin-free-limit').value);
      const monthlyUsd = Number(document.getElementById('admin-monthly-usd').value);
      const yearlyUsd = Number(document.getElementById('admin-yearly-usd').value);
      const proUsd = Number(document.getElementById('admin-pro-usd').value);
      const monthlyStars = Number(document.getElementById('admin-monthly-stars').value);
      const yearlyStars = Number(document.getElementById('admin-yearly-stars').value);
      const proStars = Number(document.getElementById('admin-pro-stars').value);

      await fetch('/api/user/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() },
        body: JSON.stringify({
          maintenanceMode,
          freeDailyLimit,
          plans: {
            monthly: { usd: monthlyUsd, stars: monthlyStars },
            yearly: { usd: yearlyUsd, stars: yearlyStars },
            pro: { usd: proUsd, stars: proStars }
          }
        })
      });
      AppUI.toast('Premium plan pricing saved.', 'success');
      loadAdminPanelIfAuthorized();
    });
  }

  const saveSettingsBtn = document.getElementById('btn-save-settings');
  if (!saveSettingsBtn) return;
  saveSettingsBtn.addEventListener('click', async () => {
    const maintenanceMode = document.getElementById('admin-maintenance-mode').checked;
    const freeDailyLimit = Number(document.getElementById('admin-free-limit').value);
    const monthlyUsd = Number(document.getElementById('admin-monthly-usd').value);
    const yearlyUsd = Number(document.getElementById('admin-yearly-usd').value);
    const proUsd = Number(document.getElementById('admin-pro-usd').value);
    const monthlyStars = Number(document.getElementById('admin-monthly-stars').value);
    const yearlyStars = Number(document.getElementById('admin-yearly-stars').value);
    const proStars = Number(document.getElementById('admin-pro-stars').value);

    await fetch('/api/user/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() },
      body: JSON.stringify({
        maintenanceMode,
        freeDailyLimit,
        plans: {
          monthly: { usd: monthlyUsd, stars: monthlyStars },
          yearly: { usd: yearlyUsd, stars: yearlyStars },
          pro: { usd: proUsd, stars: proStars }
        }
      })
    });
    AppUI.toast('Settings saved.', 'success');
    loadAdminPanelIfAuthorized();
  });

  const couponFormBtn = document.getElementById('btn-save-coupon');
  if (couponFormBtn) {
    couponFormBtn.addEventListener('click', async () => {
      const code = document.getElementById('admin-coupon-code').value.trim();
      const label = document.getElementById('admin-coupon-label').value.trim();
      const type = document.getElementById('admin-coupon-type').value;
      const value = Number(document.getElementById('admin-coupon-value').value);
      const maxUses = Number(document.getElementById('admin-coupon-max-uses').value);
      const expiresAt = document.getElementById('admin-coupon-expires').value || null;
      if (!code) return AppUI.toast('Coupon code is required.', 'error');
      await fetch('/api/user/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() },
        body: JSON.stringify({ code, label, type, value, maxUses, expiresAt, active: true })
      });
      AppUI.toast('Coupon saved.', 'success');
      loadAdminPanelIfAuthorized();
    });
  }

  document.getElementById('btn-refresh-coupons')?.addEventListener('click', () => loadAdminPanelIfAuthorized());

  document.getElementById('btn-send-broadcast').addEventListener('click', async () => {
    const message = document.getElementById('admin-broadcast-message').value.trim();
    if (!message) return AppUI.toast('Write a broadcast message first.', 'error');

    const res = await fetch('/api/user/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AppState.authHeaders() },
      body: JSON.stringify({ message })
    });
    const body = await res.json();
    if (!body.ok) return AppUI.toast(body.message || 'Broadcast failed.', 'error');
    AppUI.toast(`Broadcast sent to ${body.data.sent} users.`, 'success');
    document.getElementById('admin-broadcast-message').value = '';
    loadAdminPanelIfAuthorized();
  });

  ['btn-refresh-admin', 'btn-refresh-admin-top'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => loadAdminPanelIfAuthorized());
  });

  const broadcastShort = document.getElementById('btn-send-broadcast-short');
  if (broadcastShort) {
    broadcastShort.addEventListener('click', () => {
      document.querySelector('#admin-tabs [data-admin-tab="broadcast"]')?.click();
      document.getElementById('admin-broadcast-message')?.focus();
    });
  }

  // Admin panel tabs — Users / Payments / Broadcast / Analytics / Settings,
  // so the admin view is a set of focused screens instead of one long scroll.
  document.querySelectorAll('#admin-tabs [data-admin-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('#admin-tabs [data-admin-tab]').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');
      const target = tabBtn.dataset.adminTab;
      document.querySelectorAll('.admin-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.adminPanel === target);
      });
    });
  });
}

// ── Telegram login handshake ─────────────────────────────────

/**
 * Shows a name immediately, before the network round-trip to /api/user/login
 * finishes (or even starts). Telegram exposes the user's name client-side via
 * initDataUnsafe the instant the WebApp SDK loads — it isn't HMAC-verified,
 * so it's never used for auth, but it's perfectly fine for "what do we call
 * this person while we say hi" and removes the flash of a generic "there".
 */
function showOptimisticName() {
  const unsafeUser = AppTelegram.getUnsafeUser && AppTelegram.getUnsafeUser();
  if (!unsafeUser) return;
  const name = [unsafeUser.first_name, unsafeUser.last_name].filter(Boolean).join(' ') || unsafeUser.username || `User ${unsafeUser.id || 'Guest'}`;
  if (name) document.getElementById('user-first-name').textContent = name;
}

async function loginWithTelegram(isRetry = false) {
  if (!AppTelegram.isInsideTelegram()) {
    // Running in a plain browser (e.g. local dev) — skip auth, use demo/free mode.
    document.getElementById('user-first-name').textContent = 'Guest';
    AppState.renderUsage();
    AppUI.showView('dashboard');
    return;
  }

  showOptimisticName();

  const initData = AppTelegram.getInitData();
  if (!initData) {
    // The WebApp SDK is present but initData is empty — this happens if the
    // page was opened via a plain link/button instead of a genuine Mini App
    // launch (menu button / web_app inline button). Retry once shortly after
    // load in case initData simply wasn't populated yet, otherwise fall back
    // to guest mode without pretending we know who the user is.
    if (!isRetry) return setTimeout(() => loginWithTelegram(true), 400);
    console.warn('Telegram initData is empty — falling back to dashboard guest mode.');
    document.getElementById('user-first-name').textContent = 'Guest';
    AppUI.toast('Telegram session data is not available yet. Showing dashboard in guest mode.', 'info');
    AppUI.showView('dashboard');
    return;
  }

  try {
    const res = await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });
    const body = await res.json();
    if (!body.ok) throw new Error(body.message || `login failed (HTTP ${res.status})`);

    AppState.setUser(body.data.user, body.data.token);

    const displayName = [body.data.user.firstName, body.data.user.lastName].filter(Boolean).join(' ') ||
      body.data.user.username ||
      (body.data.user.isAdmin ? 'Owner' : 'Guest');

    document.getElementById('user-first-name').textContent = displayName;
    document.getElementById('stat-plan').textContent = body.data.user.premium ? 'Premium 💎' : 'Free';

    if (body.data.user.settings) {
      AppState.updateSettings(body.data.user.settings);
      wireSettings();
    }

    loadAdminPanelIfAuthorized();
    loadReferralStats();
    AppState.syncUsage();
    AppUI.showView('dashboard');
  } catch (err) {
    console.error('Telegram login failed:', err);
    AppUI.toast(err.message || 'Could not verify your Telegram account. Showing dashboard in guest mode.', 'error');
    document.getElementById('user-first-name').textContent = 'Guest';
    AppState.renderUsage();
    AppUI.showView('dashboard');
  }
}

/** Loads server-side public config (support username, free daily limit) — no auth needed. */
async function loadPublicConfig() {
  try {
    const res = await fetch('/api/user/stats');
    const body = await res.json();
    if (body.ok && body.data.config) {
      AppState.setConfig(body.data.config);
      const limit = body.data.config.freeDailyLimit;
      if (limit) AppState.renderUsage();
    }
  } catch (_) {
    // best-effort — falls back to the hardcoded defaults in AppState
  }
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  AppTelegram.init();
  AppUI.initGlobalListeners();

  const s = AppState.get('settings');
  AppUI.setDarkMode(s.darkMode);
  AppUI.setLanguage(s.language);

  wireDashboard();
  wireSettings();
  wirePremium();
  wireAdminSettingsForms();
  loadReferralStats();
  renderFaq();
  await loadPublicConfig();

  document.getElementById('btn-contact-support').addEventListener('click', () => {
    const username = AppState.get('config')?.supportUsername || 'officalvexon';
    AppTelegram.openLink(`https://t.me/${username}`);
  });


  await loginWithTelegram();
});

window.addEventListener('beforeunload', () => AppTools.stopQrScanner());
