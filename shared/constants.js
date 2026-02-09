(function initSharedConstants(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.SiteShared = root.SiteShared || {};
  root.SiteShared.constants = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSharedConstants() {
  const STORAGE_KEYS = Object.freeze({
    DATA: "bubble-data",
    VISIBILITY: "bubble-visibility",
    CATEGORIES: "bubble-categories",
    PAGES: "bubble-pages",
    ABOUT: "site-about",
    CONTACT: "site-contact",
    SOCIAL: "site-social",
    SUNSET_TUNING: "site-sunset-tuning",
    THEME: "bubble-theme",
    ADMIN_TOKEN: "site-admin-sync-token",
    STATE_VERSION: "site-state-version",
    ADMIN_SESSION_UNTIL: "site-admin-session-until"
  });

  const STATE_KEYS = Object.freeze([
    STORAGE_KEYS.DATA,
    STORAGE_KEYS.VISIBILITY,
    STORAGE_KEYS.CATEGORIES,
    STORAGE_KEYS.PAGES,
    STORAGE_KEYS.ABOUT,
    STORAGE_KEYS.CONTACT,
    STORAGE_KEYS.SOCIAL,
    STORAGE_KEYS.SUNSET_TUNING
  ]);

  const THEMES = Object.freeze({
    MAIN: Object.freeze(["light", "dark", "sunset"]),
    BASIC: Object.freeze(["light", "dark"])
  });

  const DEFAULT_SOCIAL = Object.freeze({
    spotify: "https://open.spotify.com/user/jakobschlenker?si=03ac03535b8045d7",
    linkedin: "https://www.linkedin.com/in/jakob-schlenker-88169526b"
  });

  const DEFAULT_SUNSET_TUNING = Object.freeze({
    cycleSeconds: 76,
    pulseCycleSeconds: 34,
    brightnessScale: 1,
    colorStrength: 1,
    peakBoost: 1,
    nightStrength: 1,
    pulseStrength: 1
  });

  return Object.freeze({
    CURRENT_STATE_VERSION: 3,
    STORAGE_KEYS,
    STATE_KEYS,
    THEMES,
    DEFAULT_SOCIAL,
    DEFAULT_SUNSET_TUNING
  });
});
