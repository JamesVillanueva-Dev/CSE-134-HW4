// theme.js: light/dark theme switching.
//
// Loaded in the <head> WITHOUT defer, so it runs before the browser
// draws anything. That lets it apply a saved dark theme before the
// first paint, so the page never flashes light first.
//
// How it works: styles.css defines every color as a CSS variable on
// :root (light), and redefines them under :root[data-theme="dark"].
// Switching themes only means setting data-theme on <html>.

// The localStorage key the choice is saved under. It's shared by every
// page, so the theme carries over as you navigate.
const THEME_KEY = "portfolio-theme";

// ---------------------------------------------------------------------
// 1. Apply the saved theme right away (before the page is drawn)
// ---------------------------------------------------------------------

// localStorage can throw (for example when storage is blocked or in
// some private modes), so reading it is wrapped in try/catch. If it
// fails, we keep the default light theme.
try {
  const savedTheme = localStorage.getItem(THEME_KEY);
  // Only accept the two values we know, so junk in storage is ignored.
  if (savedTheme === "dark" || savedTheme === "light") {
    // dataset.theme sets the data-theme attribute on <html>.
    document.documentElement.dataset.theme = savedTheme;
  }
} catch (error) {
  // Storage unavailable: stay on the light theme.
}

// ---------------------------------------------------------------------
// 2. Helpers
// ---------------------------------------------------------------------

// Returns "dark" or "light". No data-theme attribute means light,
// which is the default in styles.css.
function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// The button's label is always "Dark theme". aria-pressed tells screen
// readers whether it's on ("true" = dark theme is active).
function syncButton(button) {
  button.setAttribute("aria-pressed", String(currentTheme() === "dark"));
}

// ---------------------------------------------------------------------
// 3. Set up the button once the HTML has been parsed
// ---------------------------------------------------------------------

// The button is in the <body>, which doesn't exist yet when this file
// runs, so we wait for DOMContentLoaded.
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("theme-toggle");
  if (!button) {
    return; // page without a toggle button
  }

  // The button starts hidden in the HTML, so it never shows when
  // JavaScript is off (where it couldn't work). Reveal it now.
  button.hidden = false;
  syncButton(button);

  button.addEventListener("click", () => {
    const newTheme = currentTheme() === "dark" ? "light" : "dark";

    // Apply first, so switching works on this page even if saving fails.
    document.documentElement.dataset.theme = newTheme;
    syncButton(button);

    // Then try to save it for other pages and later visits. This has its
    // own try/catch: if storage is blocked, the theme still changed
    // above; it just won't be remembered.
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch (error) {
      // Can't save; the current page is already switched.
    }
  });
});
