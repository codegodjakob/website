(function initSharedSyncCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.SiteShared = root.SiteShared || {};
  root.SiteShared.syncCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSyncCore() {
  function parseRaw(raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return raw;
    }
  }

  function collectState(storage, stateKeys) {
    const data = {};
    (stateKeys || []).forEach((key) => {
      const raw = storage.getItem(key);
      if (raw == null) return;
      data[key] = parseRaw(raw);
    });
    return data;
  }

  function applyState(storage, remoteState, stateKeys) {
    if (!remoteState || typeof remoteState !== "object") return false;
    let changed = false;
    (stateKeys || []).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(remoteState, key)) return;
      const value = remoteState[key];
      const serialized = typeof value === "string" ? value : JSON.stringify(value, null, 2);
      const previous = storage.getItem(key);
      if (previous === serialized) return;
      storage.setItem(key, serialized);
      changed = true;
    });
    return changed;
  }

  return {
    collectState,
    applyState
  };
});
