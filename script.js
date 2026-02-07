"use strict";

// Backward-compatible loader after splitting the homepage into modules.
(function legacyEntryLoader() {
  const dependencies = [
    "shared/constants.js",
    "shared/url.js",
    "shared/storage.js",
    "shared/sync-core.js",
    "state-sync.js",
    "bubble-physics.js",
    "bubble-render.js",
    "sunset-theme.js",
    "main.js"
  ];

  function isAlreadyLoaded(path) {
    return Array.from(document.scripts).some((script) => {
      const src = script.getAttribute("src") || "";
      return src.endsWith(path);
    });
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      if (isAlreadyLoaded(path)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = path;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${path}`));
      document.head.appendChild(script);
    });
  }

  dependencies
    .reduce((chain, path) => chain.then(() => loadScript(path)), Promise.resolve())
    .catch((error) => {
      console.error("Legacy script loader failed", error);
    });
})();
