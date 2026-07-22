"use strict";

const THEME_KEY = "ewe-ticket-theme";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");
const usernameInput = document.querySelector("#login-username");
const passwordInput = document.querySelector("#login-password");
const themeToggle = document.querySelector("#theme-toggle");

function currentTheme() {
  return document.body.dataset.theme === "dark" ? "dark" : "light";
}

function readStoredTheme() {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === "dark" || theme === "light" ? theme : "";
  } catch {
    return "";
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

const themeMediaQuery = typeof window.matchMedia === "function"
  ? window.matchMedia(THEME_MEDIA_QUERY)
  : null;

function preferredTheme() {
  return readStoredTheme() || (themeMediaQuery?.matches ? "dark" : "light");
}

function updateThemeControl() {
  const isDark = currentTheme() === "dark";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему"
  );
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

function setTheme(theme, persist = true) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalizedTheme;
  document.documentElement.style.colorScheme = normalizedTheme;
  document.body.dataset.theme = normalizedTheme;
  document.body.style.colorScheme = normalizedTheme;
  if (persist) {
    writeStoredTheme(normalizedTheme);
  }
  updateThemeControl();
}

function safeNext() {
  const next = new URLSearchParams(window.location.search).get("next") || "";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) {
    return "/client-card";
  }
  return next;
}

themeToggle?.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

const syncSystemTheme = (event) => {
  if (!readStoredTheme()) {
    setTheme(event.matches ? "dark" : "light", false);
  }
};
if (themeMediaQuery?.addEventListener) {
  themeMediaQuery.addEventListener("change", syncSystemTheme);
} else {
  themeMediaQuery?.addListener?.(syncSystemTheme);
}

window.addEventListener("storage", (event) => {
  if (event.key === THEME_KEY) {
    setTheme(preferredTheme(), false);
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: usernameInput.value,
        password: passwordInput.value
      })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
      message.textContent = "Невірний логін або пароль.";
      passwordInput.select();
      return;
    }

    window.location.href = safeNext();
  } catch {
    message.textContent = "Не вдалося підключитися. Спробуйте ще раз.";
  } finally {
    button.disabled = false;
  }
});

setTheme(preferredTheme(), false);
