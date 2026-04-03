(function () {
  'use strict';

  const STORAGE_KEY = 'timelessPagesTheme';

  /* ── helpers ────────────────────────── */
  function getStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  function setStoredTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* silent */ }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const checkbox = document.getElementById('darkModeToggle');
    if (checkbox) checkbox.checked = (theme === 'dark');
  }

  /* ── init on load ──────────────────── */
  function init() {
    const saved = getStoredTheme();
    // use saved preference, else respect OS setting, else light
    if (saved) {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }

    // listen to OS changes if no manual preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
    });

    // bind toggle
    var toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.addEventListener('change', function () {
        var next = this.checked ? 'dark' : 'light';
        applyTheme(next);
        setStoredTheme(next);
      });
    }
  }

  // apply theme BEFORE paint to prevent flash
  (function earlyApply() {
    var saved = getStoredTheme();
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
