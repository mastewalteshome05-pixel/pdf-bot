/**
 * telegram.js — wraps window.Telegram.WebApp so the rest of the app
 * never has to touch the raw SDK. Degrades gracefully when opened
 * in a normal browser (tg stays null; every method becomes a no-op).
 */
const AppTelegram = (() => {
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  function init() {
    if (!tg) {
      console.info('Not running inside Telegram — WebApp SDK unavailable, using browser fallbacks.');
      return;
    }
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation && tg.enableClosingConfirmation();
    syncThemeFromTelegram();
    tg.onEvent('themeChanged', syncThemeFromTelegram);
  }

  function syncThemeFromTelegram() {
    if (!tg || !AppState.get('settings').syncTelegramTheme) return;
    const p = tg.themeParams || {};
    const root = document.documentElement;
    if (p.bg_color) root.style.setProperty('--tg-bg', p.bg_color);
    // Telegram's own light/dark signal drives our data-theme attribute.
    const isDark = tg.colorScheme === 'dark';
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  function getInitData() {
    return tg ? tg.initData : '';
  }

  function getUnsafeUser() {
    return tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
  }

  /** Shows Telegram's bottom MainButton, wired to a callback. */
  function setMainButton({ text, onClick, color, visible = true }) {
    if (!tg) return;
    tg.MainButton.setText(text);
    if (color) tg.MainButton.color = color;
    tg.MainButton.offClick(tg.MainButton._lastHandler || (() => {}));
    tg.MainButton._lastHandler = onClick;
    tg.MainButton.onClick(onClick);
    visible ? tg.MainButton.show() : tg.MainButton.hide();
  }

  function hideMainButton() {
    if (tg) tg.MainButton.hide();
  }

  /** Shows Telegram's top-left BackButton, wired to a callback (e.g. return to dashboard). */
  function setBackButton(onClick) {
    if (!tg) return;
    tg.BackButton.offClick(tg.BackButton._lastHandler || (() => {}));
    tg.BackButton._lastHandler = onClick;
    tg.BackButton.onClick(onClick);
    tg.BackButton.show();
  }

  function hideBackButton() {
    if (tg) tg.BackButton.hide();
  }

  function haptic(style = 'light') {
    if (!tg || !tg.HapticFeedback) return;
    if (['light', 'medium', 'heavy', 'rigid', 'soft'].includes(style)) {
      tg.HapticFeedback.impactOccurred(style);
    } else if (style === 'success' || style === 'error' || style === 'warning') {
      tg.HapticFeedback.notificationOccurred(style);
    }
  }

  /** Opens Telegram's native share sheet for a download URL (falls back to Web Share API / copy). */
  function shareLink(url, text = 'Check out this file') {
    if (tg && tg.openTelegramLink) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(shareUrl);
      return;
    }
    if (navigator.share) {
      navigator.share({ title: 'PDF Pro AI', text, url }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(url);
    AppUI.toast('Link copied to clipboard', 'success');
  }

  function openLink(url) {
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function close() {
    if (tg) tg.close();
  }

  function isInsideTelegram() {
    return Boolean(tg);
  }

  return {
    init, getInitData, getUnsafeUser, setMainButton, hideMainButton,
    setBackButton, hideBackButton, haptic, shareLink, openLink, close, isInsideTelegram,
    syncThemeFromTelegram
  };
})();
