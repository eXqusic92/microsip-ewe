"use strict";

const THEME_KEY = "ewe-ticket-theme";
const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");
const usernameInput = document.querySelector("#login-username");
const passwordInput = document.querySelector("#login-password");
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleLabel = document.querySelector("#theme-toggle-label");

function currentTheme() {
  return document.body.dataset.theme === "dark" ? "dark" : "light";
}

function updateThemeControl() {
  const isDark = currentTheme() === "dark";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему"
  );
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggleLabel.textContent = isDark ? "Світла тема" : "Темна тема";
}

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
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

setTheme(document.documentElement.dataset.theme || "light", false);
