"use strict";

(function initSiteStateSync() {
  const ENDPOINT = "/api/site-state";
  const TOKEN_KEY = "site-admin-sync-token";
  const STATE_KEYS = [
    "bubble-data",
    "bubble-visibility",
    "bubble-categories",
    "bubble-pages",
    "site-about",
    "site-contact",
    "site-social"
  ];

  function readJson(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function collectLocalState() {
    const data = {};
    STATE_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw == null) return;
      data[key] = readJson(raw, raw);
    });
    return data;
  }

  function applyRemoteState(remoteState) {
    if (!remoteState || typeof remoteState !== "object") return false;
    let changed = false;

    STATE_KEYS.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(remoteState, key)) return;
      const value = remoteState[key];
      const serialized = typeof value === "string" ? value : JSON.stringify(value, null, 2);
      const prev = localStorage.getItem(key);
      if (prev !== serialized) {
        localStorage.setItem(key, serialized);
        changed = true;
      }
    });

    return changed;
  }

  async function pull() {
    try {
      const response = await fetch(ENDPOINT, {
        method: "GET",
        headers: { "cache-control": "no-store" }
      });
      if (!response.ok) return { ok: false, changed: false };
      const payload = await response.json();
      const changed = applyRemoteState(payload?.data);
      return { ok: true, changed, updatedAt: payload?.updatedAt || null };
    } catch (error) {
      return { ok: false, changed: false, error };
    }
  }

  async function push(state, token) {
    const adminToken = String(token || "").trim();
    if (!adminToken) {
      return { ok: false, error: new Error("Missing admin token") };
    }

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": adminToken
        },
        body: JSON.stringify({
          data: state && typeof state === "object" ? state : collectLocalState()
        })
      });
      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          status: response.status,
          error: new Error(text || `HTTP ${response.status}`)
        };
      }
      const payload = await response.json();
      return { ok: true, updatedAt: payload?.updatedAt || null };
    } catch (error) {
      return { ok: false, error };
    }
  }

  function getAdminToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setAdminToken(token) {
    const normalized = String(token || "").trim();
    if (!normalized) {
      localStorage.removeItem(TOKEN_KEY);
      return "";
    }
    localStorage.setItem(TOKEN_KEY, normalized);
    return normalized;
  }

  window.SiteStateSync = {
    endpoint: ENDPOINT,
    stateKeys: [...STATE_KEYS],
    collectLocalState,
    applyRemoteState,
    pull,
    push,
    getAdminToken,
    setAdminToken
  };
})();
