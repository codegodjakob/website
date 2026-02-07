(function initSharedStorage(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.SiteShared = root.SiteShared || {};
  root.SiteShared.storage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSharedStorage() {
  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function readJson(storage, key, fallback) {
    try {
      const raw = storage.getItem(key);
      if (raw == null) return fallback;
      return safeParse(raw, fallback);
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    storage.setItem(key, JSON.stringify(value, null, 2));
  }

  function writeString(storage, key, value) {
    storage.setItem(key, String(value));
  }

  function coerceEnabled(value) {
    if (value === false || value === 0 || value === null) return false;
    if (typeof value === "undefined") return true;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no") {
        return false;
      }
    }
    return true;
  }

  function normalizeStringList(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const cleaned = [];
    list.forEach((entry) => {
      const value = String(entry || "").trim();
      if (!value) return;
      if (seen.has(value)) return;
      seen.add(value);
      cleaned.push(value);
    });
    return cleaned;
  }

  function resolveItemCategories(item) {
    const arrayCategories = normalizeStringList(item?.categories);
    if (arrayCategories.length) return arrayCategories;
    const legacy = typeof item?.category === "string" ? item.category.trim() : "";
    return legacy ? [legacy] : [];
  }

  function createFallbackId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }

  function normalizeBubbleItem(item, visibilityMap, idFactory = createFallbackId) {
    if (!item || typeof item !== "object") return null;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : idFactory();
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const image = typeof item.image === "string" ? item.image.trim() : "";
    if (!title && !image) return null;

    const fromItem = coerceEnabled(item.enabled);
    const fromMap = Object.prototype.hasOwnProperty.call(visibilityMap, id)
      ? coerceEnabled(visibilityMap[id])
      : undefined;
    const enabled = fromMap === undefined ? fromItem : fromMap;
    const categories = resolveItemCategories(item);

    return {
      id,
      title,
      url: `page.html?id=${id}`,
      image: image || "",
      enabled,
      imageOnly: Boolean(image && !title),
      categories
    };
  }

  function filterVisibleItems(items, visibilityMap) {
    const list = Array.isArray(items) ? items : [];
    return list.filter((item) => {
      if (!item || typeof item !== "object") return false;
      const id = typeof item.id === "string" ? item.id : "";
      const fromItem = coerceEnabled(item.enabled);
      const fromMap = id && Object.prototype.hasOwnProperty.call(visibilityMap, id)
        ? coerceEnabled(visibilityMap[id])
        : undefined;
      return fromMap === undefined ? fromItem : fromMap;
    });
  }

  function jsonEquals(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function migrateState(storage, constants) {
    if (!storage || !constants || !constants.STORAGE_KEYS) {
      return { changed: false, version: 0 };
    }

    const keys = constants.STORAGE_KEYS;
    const currentVersion = Number(constants.CURRENT_STATE_VERSION || 1);
    const defaultSocial = constants.DEFAULT_SOCIAL || {};
    const defaultAboutTitle = "Jakob Schlenker";

    let changed = false;
    const rawVersion = Number(storage.getItem(keys.STATE_VERSION) || 0);
    const normalizedVersion = Number.isFinite(rawVersion) && rawVersion >= 0 ? rawVersion : 0;

    const rawVisibility = readJson(storage, keys.VISIBILITY, {});
    const visibilityMap = rawVisibility && typeof rawVisibility === "object" && !Array.isArray(rawVisibility)
      ? { ...rawVisibility }
      : {};

    const rawBubbles = readJson(storage, keys.DATA, []);
    const bubbleList = Array.isArray(rawBubbles) ? rawBubbles : [];
    const normalizedBubbles = [];
    const normalizedVisibility = {};

    bubbleList.forEach((item) => {
      const normalized = normalizeBubbleItem(item, visibilityMap);
      if (!normalized) return;
      normalizedBubbles.push(normalized);
      normalizedVisibility[normalized.id] = coerceEnabled(normalized.enabled);
    });

    const storedCategories = readJson(storage, keys.CATEGORIES, []);
    const derivedCategories = normalizeStringList([
      ...normalizeStringList(storedCategories),
      ...normalizedBubbles.flatMap((item) => item.categories || [])
    ]);
    const normalizedCategories = derivedCategories.length ? derivedCategories : ["Category"];

    const rawPages = readJson(storage, keys.PAGES, {});
    const normalizedPages = rawPages && typeof rawPages === "object" && !Array.isArray(rawPages) ? rawPages : {};

    const rawAbout = readJson(storage, keys.ABOUT, {});
    const aboutIntro = rawAbout && typeof rawAbout.intro === "string" ? rawAbout.intro.trim() : "";
    const aboutBody = rawAbout && typeof rawAbout.body === "string" ? rawAbout.body : "";
    const normalizedAbout = {
      title: rawAbout && typeof rawAbout.title === "string" ? rawAbout.title : defaultAboutTitle,
      body: [aboutIntro, aboutBody].filter(Boolean).join("\n\n"),
      image: rawAbout && typeof rawAbout.image === "string" ? rawAbout.image : ""
    };

    const rawContact = readJson(storage, keys.CONTACT, {});
    const normalizedContact = {
      email: rawContact && typeof rawContact.email === "string" ? rawContact.email : ""
    };

    const rawSocial = readJson(storage, keys.SOCIAL, {});
    const normalizedSocial = {
      spotify: rawSocial && typeof rawSocial.spotify === "string" ? rawSocial.spotify : defaultSocial.spotify || "",
      linkedin:
        rawSocial && typeof rawSocial.linkedin === "string" ? rawSocial.linkedin : defaultSocial.linkedin || ""
    };

    if (!jsonEquals(rawBubbles, normalizedBubbles)) {
      writeJson(storage, keys.DATA, normalizedBubbles);
      changed = true;
    }
    if (!jsonEquals(rawVisibility, normalizedVisibility)) {
      writeJson(storage, keys.VISIBILITY, normalizedVisibility);
      changed = true;
    }
    if (!jsonEquals(storedCategories, normalizedCategories)) {
      writeJson(storage, keys.CATEGORIES, normalizedCategories);
      changed = true;
    }
    if (!jsonEquals(rawPages, normalizedPages)) {
      writeJson(storage, keys.PAGES, normalizedPages);
      changed = true;
    }
    if (!jsonEquals(rawAbout, normalizedAbout)) {
      writeJson(storage, keys.ABOUT, normalizedAbout);
      changed = true;
    }
    if (!jsonEquals(rawContact, normalizedContact)) {
      writeJson(storage, keys.CONTACT, normalizedContact);
      changed = true;
    }
    if (!jsonEquals(rawSocial, normalizedSocial)) {
      writeJson(storage, keys.SOCIAL, normalizedSocial);
      changed = true;
    }

    if (normalizedVersion !== currentVersion) {
      writeString(storage, keys.STATE_VERSION, currentVersion);
      changed = true;
    }

    return {
      changed,
      version: currentVersion
    };
  }

  return {
    safeParse,
    readJson,
    writeJson,
    coerceEnabled,
    normalizeStringList,
    resolveItemCategories,
    normalizeBubbleItem,
    filterVisibleItems,
    migrateState
  };
});
