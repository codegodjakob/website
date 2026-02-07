"use strict";

(function initAdminGuard() {
  const shared = window.SiteShared || {};
  const constants = shared.constants || {};
  const keys = constants.STORAGE_KEYS || {};

  const TOKEN_KEY = keys.ADMIN_TOKEN || "site-admin-sync-token";
  const SESSION_UNTIL_KEY = keys.ADMIN_SESSION_UNTIL || "site-admin-session-until";
  const SESSION_MS = 8 * 60 * 60 * 1000;
  const ADMIN_SCRIPT_SRC = "admin.js";
  const AUTH_ENDPOINT = "/api/admin-auth";

  function setReady() {
    document.documentElement.classList.remove("admin-locked");
    document.documentElement.classList.add("admin-ready");
  }

  function loadAdminScript() {
    const script = document.createElement("script");
    script.src = ADMIN_SCRIPT_SRC;
    document.body.appendChild(script);
  }

  async function validateToken(token) {
    try {
      const response = await fetch(AUTH_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": token
        },
        body: JSON.stringify({ token })
      });
      if (!response.ok) {
        return { ok: false, status: response.status };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, offline: true };
    }
  }

  function isLocalHost() {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  async function unlockWithPrompt() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const entered = window.prompt("Admin Token eingeben:");
      if (entered === null) {
        window.location.href = "index.html";
        return false;
      }
      const token = entered.trim();
      if (!token) continue;

      const result = await validateToken(token);
      if (result.ok || (result.offline && isLocalHost())) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(SESSION_UNTIL_KEY, String(Date.now() + SESSION_MS));
        return true;
      }
      alert("Token ungültig.");
    }

    window.location.href = "index.html";
    return false;
  }

  async function bootstrapGuard() {
    const token = String(localStorage.getItem(TOKEN_KEY) || "").trim();
    const until = Number(localStorage.getItem(SESSION_UNTIL_KEY) || 0);
    const sessionValid = Number.isFinite(until) && until > Date.now() && token;

    if (sessionValid) {
      const result = await validateToken(token);
      if (result.ok || (result.offline && isLocalHost())) {
        setReady();
        loadAdminScript();
        return;
      }
    }

    const unlocked = await unlockWithPrompt();
    if (!unlocked) return;
    setReady();
    loadAdminScript();
  }

  void bootstrapGuard();
})();
