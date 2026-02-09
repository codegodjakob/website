(function initSunsetTheme(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.SunsetTheme = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSunsetTheme() {
  function createThemeController(options) {
    const body = options.body;
    const storage = options.storage;
    const storageKey = options.storageKey;

    function setTheme(theme) {
      body.setAttribute("data-theme", theme);
      storage.setItem(storageKey, theme);
      // Keep cleanup in case older cached CSS still references this class.
      body.classList.remove("sunset-enter");
    }

    return {
      setTheme
    };
  }

  return {
    createThemeController
  };
});
