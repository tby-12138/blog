const THEME_KEY = 'blog-theme';
const toggles = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');

function syncThemeToggles() {
  const dark = document.documentElement.dataset.theme === 'dark';
  toggles.forEach((button) => {
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
  });
}

toggles.forEach((button) => {
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 隐私模式下忽略 */
    }
    syncThemeToggles();
  });
});

syncThemeToggles();
