/**
 * ui.js — generic UI plumbing: view switching, sidebar drawer, toasts,
 * modal sheet, dark-mode toggle, and a tiny i18n dictionary.
 */
const AppUI = (() => {
  const I18N = {
    en: {
      dashboard: 'Dashboard', premium: 'Premium', settings: 'Settings',
      help: 'Help Center', admin: 'Admin Panel', payments: 'Payments', broadcast: 'Broadcast',
      analytics: 'Analytics', users: 'Users', owner: 'Owner', greeting: 'Welcome',
      subtitle: 'What are we doing today?', referral: 'Invite Friends',
      heroDesc: '22 document tools, zero desktop software. Merge, convert, sign, and scan — straight from this chat.',
      uploadFile: '📤 Upload a file', mergePdfs: '🧩 Merge PDFs',
      opsToday: 'Ops today', freeLeft: 'Free left', plan: 'Plan',
      tools: 'Tools', all: 'All', pdfTools: 'PDF Tools', convert: 'Convert', security: 'Security', utilities: 'Utilities',
      darkMode: 'Dark mode', darkModeSub: 'Follows Telegram theme by default',
      language: 'Language', languageSub: 'Interface language',
      syncTheme: 'Sync with Telegram theme', syncThemeSub: "Match your Telegram app's colors",
      about: 'About', aboutText: 'PDF Pro AI v1.0.0 — built with Node.js, Express & the Telegram Mini Apps platform.',
      inviteHeading: 'Invite Friends',
      inviteDesc: 'Earn free credits for every friend who joins — and free Premium at 30 referrals.',
      referrals: 'Referrals', freeCredits: 'Free credits', inviteLink: 'Your invite link',
      copyLink: 'Copy link', shareTelegram: 'Share via Telegram',
      stillStuck: 'Still stuck?', messageSupport: 'Message our support team', contact: 'Contact',

    },
    es: {
      dashboard: 'Panel', premium: 'Premium', settings: 'Ajustes',
      help: 'Centro de ayuda', admin: 'Panel de administración', payments: 'Pagos',
      broadcast: 'Difusión', analytics: 'Analíticas', users: 'Usuarios', owner: 'Propietario',
      greeting: 'Bienvenido', subtitle: '¿Qué hacemos hoy?', referral: 'Invitar amigos',
      heroDesc: '22 herramientas de documentos, sin software de escritorio. Combina, convierte, firma y escanea — desde este chat.',
      uploadFile: '📤 Subir archivo', mergePdfs: '🧩 Combinar PDFs',
      opsToday: 'Operaciones hoy', freeLeft: 'Gratis restantes', plan: 'Plan',
      tools: 'Herramientas', all: 'Todas', pdfTools: 'Herramientas PDF', convert: 'Convertir', security: 'Seguridad', utilities: 'Utilidades',
      darkMode: 'Modo oscuro', darkModeSub: 'Sigue el tema de Telegram por defecto',
      language: 'Idioma', languageSub: 'Idioma de la interfaz',
      syncTheme: 'Sincronizar con el tema de Telegram', syncThemeSub: 'Coincide con los colores de tu app de Telegram',
      about: 'Acerca de', aboutText: 'PDF Pro AI v1.0.0 — creado con Node.js, Express y la plataforma Telegram Mini Apps.',
      inviteHeading: 'Invitar amigos',
      inviteDesc: 'Gana créditos gratis por cada amigo que se una — y Premium gratis a los 30 referidos.',
      referrals: 'Referidos', freeCredits: 'Créditos gratis', inviteLink: 'Tu enlace de invitación',
      copyLink: 'Copiar enlace', shareTelegram: 'Compartir por Telegram',
      stillStuck: '¿Sigues atascado?', messageSupport: 'Escribe a nuestro equipo de soporte', contact: 'Contacto',

    },
    fr: {
      dashboard: 'Tableau de bord', premium: 'Premium', settings: 'Paramètres',
      help: "Centre d'aide", admin: 'Panneau admin', payments: 'Paiements',
      broadcast: 'Annonce', analytics: 'Analytique', users: 'Utilisateurs', owner: 'Propriétaire',
      greeting: 'Bienvenue', subtitle: "Qu'est-ce qu'on fait aujourd'hui ?", referral: 'Inviter des amis',
      heroDesc: '22 outils de documents, zéro logiciel de bureau. Fusionnez, convertissez, signez et scannez — directement depuis ce chat.',
      uploadFile: '📤 Importer un fichier', mergePdfs: '🧩 Fusionner des PDF',
      opsToday: "Opérations aujourd'hui", freeLeft: 'Gratuit restant', plan: 'Forfait',
      tools: 'Outils', all: 'Tous', pdfTools: 'Outils PDF', convert: 'Convertir', security: 'Sécurité', utilities: 'Utilitaires',
      darkMode: 'Mode sombre', darkModeSub: 'Suit le thème de Telegram par défaut',
      language: 'Langue', languageSub: "Langue de l'interface",
      syncTheme: 'Synchroniser avec le thème Telegram', syncThemeSub: "Assortit les couleurs de votre app Telegram",
      about: 'À propos', aboutText: 'PDF Pro AI v1.0.0 — conçu avec Node.js, Express et la plateforme Telegram Mini Apps.',
      inviteHeading: 'Inviter des amis',
      inviteDesc: 'Gagnez des crédits gratuits pour chaque ami qui rejoint — et Premium gratuit à 30 parrainages.',
      referrals: 'Parrainages', freeCredits: 'Crédits gratuits', inviteLink: "Votre lien d'invitation",
      copyLink: 'Copier le lien', shareTelegram: 'Partager via Telegram',
      stillStuck: 'Toujours bloqué ?', messageSupport: 'Contactez notre équipe de support', contact: 'Contact',

    },
    ar: {
      dashboard: 'لوحة التحكم', premium: 'مميز', settings: 'الإعدادات',
      help: 'مركز المساعدة', admin: 'لوحة الإدارة', payments: 'المدفوعات',
      broadcast: 'إعلان', analytics: 'تحليلات', users: 'المستخدمون', owner: 'المالك',
      greeting: 'مرحباً بك', subtitle: 'ما الذي سنفعله اليوم؟', referral: 'دعوة الأصدقاء',
      heroDesc: '22 أداة مستندات، بدون أي برامج على الحاسوب. ادمج وحوّل ووقّع وامسح ضوئيًا — مباشرة من هذه المحادثة.',
      uploadFile: '📤 رفع ملف', mergePdfs: '🧩 دمج ملفات PDF',
      opsToday: 'العمليات اليوم', freeLeft: 'المتبقي مجانًا', plan: 'الخطة',
      tools: 'الأدوات', all: 'الكل', pdfTools: 'أدوات PDF', convert: 'تحويل', security: 'الأمان', utilities: 'أدوات مساعدة',
      darkMode: 'الوضع الداكن', darkModeSub: 'يتبع مظهر تيليجرام افتراضيًا',
      language: 'اللغة', languageSub: 'لغة الواجهة',
      syncTheme: 'المزامنة مع مظهر تيليجرام', syncThemeSub: 'مطابقة ألوان تطبيق تيليجرام لديك',
      about: 'حول', aboutText: 'PDF Pro AI الإصدار 1.0.0 — مبني باستخدام Node.js وExpress ومنصة تطبيقات تيليجرام المصغّرة.',
      inviteHeading: 'دعوة الأصدقاء',
      inviteDesc: 'احصل على رصيد مجاني عن كل صديق ينضم — واشتراك مميز مجاني عند 30 إحالة.',
      referrals: 'الإحالات', freeCredits: 'رصيد مجاني', inviteLink: 'رابط الدعوة الخاص بك',
      copyLink: 'نسخ الرابط', shareTelegram: 'مشاركة عبر تيليجرام',
      stillStuck: 'ما زلت بحاجة للمساعدة؟', messageSupport: 'راسل فريق الدعم لدينا', contact: 'تواصل',

    }
  };

  let currentLang = 'en';

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
  }

  function setLanguage(lang) {
    if (!I18N[lang]) lang = 'en';
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.getElementById('select-lang') && (document.getElementById('select-lang').value = lang);
    applyStaticTranslations();
  }

  /**
   * Walks every element carrying a data-i18n / data-i18n-placeholder
   * attribute and fills it in from the current language. This — not just
   * the topbar title — is what actually makes the language switcher work;
   * previously only the topbar title text changed and the rest of the app
   * (greeting, settings labels, buttons, etc.) silently stayed in English.
   */
  function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
    });

    const activeView = document.querySelector('.view.active');
    if (activeView) {
      const viewId = activeView.id.replace('view-', '');
      const label = t(viewId) || activeView.id;
      const topbarTitle = document.getElementById('topbar-title');
      if (topbarTitle) topbarTitle.textContent = label;
    }
  }

  // ── View routing ─────────────────────────────────────────
  function showView(viewName) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sidebar-link').forEach((l) => l.classList.remove('active'));
    const navBtn = document.querySelector(`.sidebar-link[data-view="${viewName}"]`);
    if (navBtn) navBtn.classList.add('active');

    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = t(viewName) || viewName.replace(/-/g, ' ');

    closeSidebar();

    if (viewName === 'dashboard') {
      AppTelegram.hideBackButton();
      AppTelegram.hideMainButton();
    } else {
      AppTelegram.setBackButton(() => showView('dashboard'));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Sidebar drawer ───────────────────────────────────────
  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('visible');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  }
  function toggleSidebar() {
    document.getElementById('sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
  }

  // ── Theme ────────────────────────────────────────────────
  function setDarkMode(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const toggle = document.getElementById('toggle-dark');
    if (toggle) toggle.checked = isDark;
  }
  function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    setDarkMode(!isDark); // if currently dark -> switch to light, and vice versa
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  // ── Toasts ───────────────────────────────────────────────
  function toast(message, type = 'info', duration = 3200) {
    const stack = document.getElementById('toast-stack');
    const el = document.createElement('div');
    el.className = `toast glass ${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    el.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    stack.appendChild(el);

    if (type === 'error') AppTelegram.haptic('error');
    if (type === 'success') AppTelegram.haptic('success');

    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 220);
    }, duration);
  }

  // ── Modal sheet ──────────────────────────────────────────
  function openModal(html) {
    document.getElementById('modal-sheet').innerHTML = html;
    document.getElementById('modal-backdrop').classList.add('visible');
  }
  function closeModal() {
    document.getElementById('modal-backdrop').classList.remove('visible');
  }

  function initGlobalListeners() {
    document.getElementById('btn-menu').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
    document.getElementById('modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });
    document.getElementById('btn-theme').addEventListener('click', () => {
      const isDark = toggleDarkMode();
      AppState.updateSettings({ darkMode: isDark, syncTelegramTheme: false });
      const tgToggle = document.getElementById('toggle-tg-theme');
      if (tgToggle) tgToggle.checked = false;
    });
    document.getElementById('btn-lang').addEventListener('click', () => {
      const order = ['en', 'es', 'fr', 'ar'];
      const next = order[(order.indexOf(currentLang) + 1) % order.length];
      setLanguage(next);
      AppState.updateSettings({ language: next });
    });

    document.querySelectorAll('.sidebar-link[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => showView(btn.dataset.view));
    });
  }

  return {
    showView, openSidebar, closeSidebar, toggleSidebar,
    setDarkMode, toggleDarkMode, toast, openModal, closeModal,
    setLanguage, t, initGlobalListeners
  };
})();
