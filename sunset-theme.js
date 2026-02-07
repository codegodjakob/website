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
    const enterClass = options.enterClass || "sunset-enter";
    const enterDuration = Number(options.enterDuration || 12850);
    let sunsetEnterTimer = null;

    function clearEnterTimer() {
      if (sunsetEnterTimer) {
        clearTimeout(sunsetEnterTimer);
        sunsetEnterTimer = null;
      }
    }

    function setTheme(theme) {
      const previousTheme = body.getAttribute("data-theme");
      body.setAttribute("data-theme", theme);
      storage.setItem(storageKey, theme);

      if (theme === "sunset") {
        clearEnterTimer();
        if (previousTheme !== "sunset") {
          body.classList.add(enterClass);
          sunsetEnterTimer = setTimeout(() => {
            body.classList.remove(enterClass);
            sunsetEnterTimer = null;
          }, enterDuration);
        }
        return;
      }

      body.classList.remove(enterClass);
      clearEnterTimer();
    }

    return {
      setTheme
    };
  }

  return {
    createThemeController
  };
});
