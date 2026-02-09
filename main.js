const shared = window.SiteShared || {};
const constants = shared.constants || {};
const storageUtils = shared.storage || {};
const urlUtils = shared.url || {};
const bubblePhysics = window.BubblePhysics || {};
const bubbleRender = window.BubbleRender || {};
const sunsetTheme = window.SunsetTheme || {};

if (typeof storageUtils.migrateState === "function") {
  storageUtils.migrateState(localStorage, constants);
}

const STORAGE_KEY = constants.STORAGE_KEYS?.DATA || "bubble-data";
const VISIBILITY_KEY = constants.STORAGE_KEYS?.VISIBILITY || "bubble-visibility";
const CONTACT_KEY = constants.STORAGE_KEYS?.CONTACT || "site-contact";
const SOCIAL_KEY = constants.STORAGE_KEYS?.SOCIAL || "site-social";
const SUNSET_TUNING_KEY = constants.STORAGE_KEYS?.SUNSET_TUNING || "site-sunset-tuning";
const THEME_KEY = constants.STORAGE_KEYS?.THEME || "bubble-theme";
const THEMES = constants.THEMES?.MAIN || ["light", "dark", "sunset"];
const DEFAULT_SOCIAL = constants.DEFAULT_SOCIAL || {
  spotify: "https://open.spotify.com/user/jakobschlenker?si=03ac03535b8045d7",
  linkedin: "https://www.linkedin.com/in/jakob-schlenker-88169526b"
};
const DEFAULT_SUNSET_TUNING = constants.DEFAULT_SUNSET_TUNING || {
  cycleSeconds: 76,
  pulseCycleSeconds: 34,
  brightnessScale: 1,
  colorStrength: 1,
  peakBoost: 1,
  nightStrength: 1,
  pulseStrength: 1
};
const normalizeUrl = urlUtils.normalizeUrl || ((value) => value || "");
const isValidUrl = urlUtils.isValidUrl || (() => false);
const coerceEnabled = storageUtils.coerceEnabled || ((value) => value !== false);
const normalizeSunsetTuning = storageUtils.normalizeSunsetTuning || ((value) => value || DEFAULT_SUNSET_TUNING);

const sampleImages = [
  "https://images.unsplash.com/photo-1737276746228-218b6f8a0efc?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1600",
  "https://images.unsplash.com/photo-1762087483789-a757e3937603?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1600",
  "https://images.unsplash.com/photo-1622518381548-f659e83917f6?auto=format&fit=crop&fm=jpg&ixlib=rb-4.0.3&q=80&w=1600"
];

const defaultBubbleData = [
  { title: "Die Zukunft der stillen Interfaces", url: "https://example.com/future-interfaces" },
  { title: "Minimalismus als Produktstrategie", url: "https://example.com/minimalism" },
  { title: "Kuratierte Inhalte für langsame Medien", url: "https://example.com/slow-media" },
  { title: "Design Systems für leise Marken", url: "https://example.com/design-systems", image: sampleImages[0] },
  { title: "Glas, Licht & Tiefe im UI", url: "https://example.com/glass-ui", image: sampleImages[1] },
  { title: "Kleine Bewegungen, große Wirkung", url: "https://example.com/motion", image: sampleImages[2] },
  { title: "Poetische Navigation", url: "https://example.com/poetic-navigation" },
  { title: "Die Ästhetik von Ruhe", url: "https://example.com/calm-aesthetic" },
  { title: "Neue Rituale im Web", url: "https://example.com/web-rituals" },
  { title: "Digitale Stille gestalten", url: "https://example.com/digital-stillness" },
  { title: "Bubbles als Inhaltsarchitektur", url: "https://example.com/bubble-architecture" },
  { title: "Interaktion ohne Lärm", url: "https://example.com/interaction" },
  { title: "Arbeit mit weichen Kanten", url: "https://example.com/soft-edges" },
  { title: "Sinnliches Interface Branding", url: "https://example.com/sensory-branding" },
  { title: "Scrollytelling in Zeitlupe", url: "https://example.com/scrollytelling" },
  { title: "Die Magie sanfter Übergänge", url: "https://example.com/transitions" },
  { title: "Fokus als Einladung", url: "https://example.com/focus" },
  { title: "Design für atmosphärische Räume", url: "https://example.com/atmospheric" },
  { title: "Informationsarchitektur der Zukunft", url: "https://example.com/ia-future" },
  { title: "Interface Poetry", url: "https://example.com/interface-poetry" }
];

function loadVisibilityMap() {
  try {
    const raw = localStorage.getItem(VISIBILITY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch (error) {
    return {};
  }
}

function loadBubbleData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const visibilityRaw = localStorage.getItem(VISIBILITY_KEY);
    lastDataSnapshot = raw || "";
    lastVisibilitySnapshot = visibilityRaw || "";
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    const visibilityMap = loadVisibilityMap();
    const cleaned = parsed
      .filter((item) => {
        if (!item) return false;
        const title = typeof item.title === "string" ? item.title.trim() : "";
        const image = typeof item.image === "string" ? item.image.trim() : "";
        return Boolean(title || image);
      })
      .map((item) => {
        const title = typeof item.title === "string" ? item.title.trim() : "";
        const url = typeof item.url === "string" && item.url.trim().length ? item.url.trim() : "https://example.com";
        const image = typeof item.image === "string" && item.image.trim().length ? item.image.trim() : null;
        const imageOnly = Boolean(image && !title);
        const id = typeof item.id === "string" && item.id.trim().length ? item.id.trim() : crypto.randomUUID();
        const fromItem = coerceEnabled(item?.enabled);
        const fromMap = Object.prototype.hasOwnProperty.call(visibilityMap, id)
          ? coerceEnabled(visibilityMap[id])
          : undefined;
        const enabled = fromMap === undefined ? fromItem : fromMap;
        const base = image ? { id, title, url, image, enabled } : { id, title, url, enabled };
        return imageOnly ? { ...base, imageOnly: true } : base;
      })
      .filter((item) => coerceEnabled(item?.enabled));
    return cleaned;
  } catch (error) {
    return [];
  }
}

let lastDataSnapshot = "";
let lastVisibilitySnapshot = "";
let lastSunsetTuningSnapshot = "";
let bubbleData = loadBubbleData();

const activeTitles = new Set();
const activeKeys = new Set();
let dataQueue = [];
let imageCursor = 0;

const app = document.getElementById("app");
const field = document.getElementById("bubble-field");
const rippleLayer = document.getElementById("ripple-layer");
const themeToggle = document.getElementById("theme-toggle");
const menuToggle = document.getElementById("menu-toggle");
const menuBubble = document.getElementById("menu");
const emailLinks = document.querySelectorAll("[data-email]");
const socialLinks = document.querySelectorAll("[data-social]");
let lastBackgroundRipple = 0;

const state = {
  bubbles: [],
  width: window.innerWidth,
  height: window.innerHeight,
  lastTime: performance.now(),
  simTime: 0,
  focusedBubble: null,
  focusTimeout: null,
  minDim: Math.min(window.innerWidth, window.innerHeight),
  recycleTimer: 0,
  bounds: {
    left: 0,
    right: window.innerWidth,
    top: 0,
    bottom: window.innerHeight,
    margin: 0
  }
};

const COUNT_MIN = 8;
const COUNT_MAX = 13;
const RECYCLE_MIN = 22;
const RECYCLE_MAX = 32;
const MIN_VISIBLE_SECONDS = 26;
const MIN_SCALE = 0.92;
const COLLISION_ITERATIONS = 0;
const COLLISION_PUSH = 0.18;
const SEPARATION_STRENGTH = 6.4;
const SEPARATION_RADIUS_SCALE = 1.48;
const SEPARATION_EXTRA = 44;
const VELOCITY_SMOOTH = 2.4;
const MAX_ACCEL = 110;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");
const FONT_STACK = '"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';

const initialTheme = "light";
const themeController =
  typeof sunsetTheme.createThemeController === "function"
    ? sunsetTheme.createThemeController({
        body: document.body,
        storage: localStorage,
        storageKey: THEME_KEY
      })
    : {
        setTheme(theme) {
          document.body.setAttribute("data-theme", theme);
          localStorage.setItem(THEME_KEY, theme);
        }
      };

function setTheme(theme) {
  themeController.setTheme(theme);
}

function loadSunsetTuning() {
  try {
    const raw = localStorage.getItem(SUNSET_TUNING_KEY);
    lastSunsetTuningSnapshot = raw || "";
    if (!raw) return { ...DEFAULT_SUNSET_TUNING };
    return normalizeSunsetTuning(JSON.parse(raw), DEFAULT_SUNSET_TUNING);
  } catch (error) {
    return { ...DEFAULT_SUNSET_TUNING };
  }
}

function applySunsetTuning(tuningInput) {
  const tuning = normalizeSunsetTuning(tuningInput, DEFAULT_SUNSET_TUNING);
  const root = document.documentElement;
  root.style.setProperty("--sunset-cycle", `${tuning.cycleSeconds}s`);
  root.style.setProperty("--sunset-pulse-cycle", `${tuning.pulseCycleSeconds}s`);
  root.style.setProperty("--sunset-brightness-scale", String(tuning.brightnessScale));
  root.style.setProperty("--sunset-color-strength", String(tuning.colorStrength));
  root.style.setProperty("--sunset-peak-boost", String(tuning.peakBoost));
  root.style.setProperty("--sunset-night-strength", String(tuning.nightStrength));
  root.style.setProperty("--sunset-pulse-strength", String(tuning.pulseStrength));
}

function refreshSunsetTuning() {
  try {
    const raw = localStorage.getItem(SUNSET_TUNING_KEY) || "";
    if (raw === lastSunsetTuningSnapshot) return;
    lastSunsetTuningSnapshot = raw;
  } catch (error) {
    return;
  }
  applySunsetTuning(loadSunsetTuning());
}

applySunsetTuning(loadSunsetTuning());

setTheme(initialTheme);

themeToggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme") || "light";
  const index = THEMES.indexOf(current);
  const next = THEMES[(index + 1 + THEMES.length) % THEMES.length] || "light";
  setTheme(next);
});

menuToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = menuBubble.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", `${isOpen}`);
});

document.addEventListener("click", (event) => {
  if (!menuBubble.classList.contains("is-open")) return;
  if (menuBubble.contains(event.target) || menuToggle.contains(event.target)) return;
  menuBubble.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  menuBubble.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
});

function spawnBackgroundRipple(clientX, clientY) {
  if (!app || !rippleLayer) return;
  const now = performance.now();
  if (now - lastBackgroundRipple < 120) return;
  lastBackgroundRipple = now;

  const rect = app.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const size = clamp(state.minDim * 0.12, 86, 168);

  const ripple = document.createElement("span");
  ripple.className = "bg-ripple";
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.setProperty("--ripple-size", `${size}px`);
  rippleLayer.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}

function isUiOrBubbleTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      ".bubble, #site-header, #theme-toggle, #menu, #menu-toggle, a, button, input, textarea, select, label"
    )
  );
}

if (app && rippleLayer) {
  app.addEventListener("click", (event) => {
    if (event.button !== 0) return;
    if (isUiOrBubbleTarget(event.target)) return;
    spawnBackgroundRipple(event.clientX, event.clientY);
  });
}

function loadSocial() {
  try {
    const raw = localStorage.getItem(SOCIAL_KEY);
    if (!raw) {
      return { ...DEFAULT_SOCIAL };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return {
      spotify: parsed.spotify ?? "",
      linkedin: parsed.linkedin ?? ""
    };
  } catch (error) {
    return {};
  }
}

function applySocialLinks() {
  const data = loadSocial();
  socialLinks.forEach((link) => {
    const key = link.dataset.social;
    const raw = data[key] || "";
    const href = normalizeUrl(raw);
    if (href && isValidUrl(href)) {
      link.href = href;
      link.removeAttribute("aria-disabled");
      link.classList.remove("is-disabled");
    } else {
      link.href = "#";
      link.setAttribute("aria-disabled", "true");
      link.classList.add("is-disabled");
    }
  });
}

applySocialLinks();

function loadContact() {
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    if (!raw) {
      return {
        email: ""
      };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      email: parsed.email ?? ""
    };
  } catch (error) {
    return null;
  }
}

function applyEmailLinks() {
  const data = loadContact();
  const email = data?.email?.trim();
  emailLinks.forEach((link) => {
    if (email) {
      link.href = `mailto:${email}`;
      link.removeAttribute("aria-disabled");
      link.classList.remove("is-disabled");
      link.setAttribute("aria-label", `Email ${email}`);
    } else {
      link.href = "#";
      link.setAttribute("aria-disabled", "true");
      link.classList.add("is-disabled");
      link.removeAttribute("aria-label");
    }
  });
}

applyEmailLinks();

function refreshBubbleData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "";
    const visibilityRaw = localStorage.getItem(VISIBILITY_KEY) || "";
    if (raw === lastDataSnapshot && visibilityRaw === lastVisibilitySnapshot) return;
    lastDataSnapshot = raw;
    lastVisibilitySnapshot = visibilityRaw;
  } catch (error) {
    return;
  }

  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      bubbleData = [];
    }
  } catch (error) {
    bubbleData = [];
  }

  bubbleData = loadBubbleData();
  dataQueue = [];
  state.focusedBubble = null;
  if (state.focusTimeout) {
    clearTimeout(state.focusTimeout);
    state.focusTimeout = null;
  }
  buildBubbles();
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === VISIBILITY_KEY) {
    refreshBubbleData();
  }
  if (event.key === SUNSET_TUNING_KEY) {
    refreshSunsetTuning();
  }
  if (event.key === SOCIAL_KEY) {
    applySocialLinks();
  }
  if (event.key === CONTACT_KEY) {
    applyEmailLinks();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshBubbleData();
    refreshSunsetTuning();
  }
});

// Fallback sync so admin changes apply even when storage events are missed.
setInterval(() => {
  refreshBubbleData();
  refreshSunsetTuning();
}, 1200);

function calcBubbleCount(width, height) {
  const area = width * height * 0.62;
  const count = Math.round(area / 210000);
  return clamp(count, COUNT_MIN, COUNT_MAX);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function nextImageUrl() {
  const url = sampleImages[imageCursor % sampleImages.length];
  imageCursor += 1;
  return url;
}

function shouldAssignImage() {
  return false;
}

function generateUniqueTitle() {
  const starters = [
    "Leise",
    "Sanfte",
    "Stille",
    "Subtile",
    "Lichte",
    "Offene",
    "Fließende",
    "Klarheit in",
    "Poetische",
    "Ruhige"
  ];
  const subjects = [
    "Interfaces",
    "Navigation",
    "Räume",
    "Prozesse",
    "Gesten",
    "Systeme",
    "Übergänge",
    "Bewegungen",
    "Strukturen",
    "Rhythmen"
  ];
  const endings = [
    "für neue Marken",
    "im langsamen Web",
    "für stille Produkte",
    "mit weichen Kanten",
    "im digitalen Raum",
    "für atmosphärische Inhalte",
    "als Designsprache",
    "für klare Orientierung",
    "ohne Lärm",
    "in ruhiger Balance"
  ];

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const title = `${starters[Math.floor(Math.random() * starters.length)]} ${
      subjects[Math.floor(Math.random() * subjects.length)]
    } ${endings[Math.floor(Math.random() * endings.length)]}`;
    if (!activeTitles.has(title)) {
      return title;
    }
  }

  let fallback = `Neue Komposition ${Math.floor(Math.random() * 10000)}`;
  while (activeTitles.has(fallback)) {
    fallback = `Neue Komposition ${Math.floor(Math.random() * 10000)}`;
  }
  return fallback;
}

function generateUniqueData() {
  const title = generateUniqueTitle();
  const item = {
    id: crypto.randomUUID(),
    title,
    url: `https://example.com/${slugify(title)}`
  };

  if (shouldAssignImage()) {
    item.image = nextImageUrl();
  }

  return item;
}

function getContentKey(item) {
  const title = typeof item.title === "string" ? item.title.trim() : "";
  if (title) return title;
  if (item.image) return item.image;
  if (item.url) return item.url;
  return crypto.randomUUID();
}

function getNextBubbleData() {
  if (!bubbleData.length) return null;
  if (activeKeys.size >= bubbleData.length) return null;
  if (!dataQueue.length) {
    dataQueue = shuffle([...bubbleData]);
  }

  let item = null;
  let safety = bubbleData.length + 4;
  while (safety > 0) {
    if (!dataQueue.length) {
      dataQueue = shuffle([...bubbleData]);
    }
    const candidate = dataQueue.shift();
    const key = getContentKey(candidate);
    if (!activeKeys.has(key)) {
      item = candidate;
      break;
    }
    dataQueue.push(candidate);
    safety -= 1;
  }

  if (!item) return null;

  const nextItem = { ...item };
  if (!nextItem.image && shouldAssignImage()) {
    nextItem.image = nextImageUrl();
  }

  return nextItem;
}

function createBubble(data, sizeFactorOverride = null) {
  const hasImage = Boolean(data.image);
  let sizeFactor = sizeFactorOverride ?? randomInRange(0.9, 1.25);
  sizeFactor *= 0.93;
  sizeFactor *= hasImage ? 1.08 : 0.92;

  const titleText = typeof data.title === "string" ? data.title.trim() : "";
  const imageOnly = Boolean(data.image && !titleText);
  const key = getContentKey(data);

  const bubble = {
    id: crypto.randomUUID(),
    key,
    title: titleText,
    url: data.url,
    image: data.image || null,
    imageOnly,
    x: 0,
    y: 0,
    vx: randomInRange(-12, 12),
    vy: randomInRange(-12, 12),
    scale: 1,
    radius: 0,
    pulsePhase: Math.random() * Math.PI * 2,
    orbitPhase: Math.random() * Math.PI * 2,
    orbitDir: Math.random() < 0.5 ? -1 : 1,
    flowPhase: Math.random() * Math.PI * 2,
    flowPhase2: Math.random() * Math.PI * 2,
    driftPhase: Math.random() * Math.PI * 2,
    driftPhase2: Math.random() * Math.PI * 2,
    heading: Math.random() * Math.PI * 2,
    headingBias: randomInRange(-0.6, 0.6),
    speed: randomInRange(16, 26),
    prevVx: 0,
    prevVy: 0,
    swirlBias: randomInRange(0.6, 1.3),
    noisePhaseX: Math.random() * Math.PI * 2,
    noisePhaseY: Math.random() * Math.PI * 2,
    noisePhaseX2: Math.random() * Math.PI * 2,
    noisePhaseY2: Math.random() * Math.PI * 2,
    baseFont: 14,
    dragging: false,
    hovered: false,
    dragMoved: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    lastPointerTime: 0,
    lastRipple: 0,
    focused: false,
    focusLevel: 0,
    wanderX: 0,
    wanderY: 0,
    wanderTimer: 0,
    sizeFactor,
    sizeBias: randomInRange(-0.08, 0.08),
    sizeTarget: randomInRange(-0.12, 0.18),
    sizeTimer: randomInRange(8, 16),
    minScale: MIN_SCALE,
    lifeState: "entering",
    lifeTimer: 0,
    lifeDuration: randomInRange(9.5, 13),
    spawnTime: state.simTime,
    exitTargetX: null,
    exitTargetY: null,
    exitReady: false,
    exitTimer: 0,
    exitMaxRelocate: 0,
    opacity: 0,
    cornerRadius: 0
  };

  activeKeys.add(bubble.key);
  if (bubble.title) {
    activeTitles.add(bubble.title);
  }
  bubble.baseFont = clamp(state.minDim * 0.0125, 9, 14);
  bubble.textFontScale = bubble.image ? 0.82 : 1;
  const baseInset = clamp(bubble.baseFont * 0.55, 7, 13);
  const imageInset = clamp(bubble.baseFont * 0.32, 3, 9);
  bubble.inset = bubble.image ? imageInset : baseInset;
  bubble.imageGap = 0;
  bubble.textPadBottom = bubble.image ? Math.round(Math.max(bubble.inset * 1.15, bubble.baseFont * 0.6)) : 0;
  bubble.textPadX = bubble.image ? Math.round(Math.max(bubble.inset * 0.8, bubble.baseFont * 0.45)) : 0;
  if (bubble.image) {
    bubble.padX = bubble.inset;
    bubble.padY = bubble.inset;
  } else {
    bubble.padX = Math.round(bubble.inset * 2.1);
    bubble.padY = Math.round(bubble.inset * 1.6);
  }
  bubble.imageHeight = bubble.image ? clamp(bubble.baseFont * 4.9 * bubble.sizeFactor, 100, 210) : 0;
  const maxFieldWidth = (state.bounds.right - state.bounds.left) * 0.6;
  bubble.maxTextWidth = clamp(state.minDim * (0.22 + bubble.sizeFactor * 0.08), 200, Math.min(420, maxFieldWidth));

  layoutBubble(bubble);
  bubble.smallness = computeSmallness(bubble);
  setWanderTarget(bubble);
  bubble.wanderTimer = randomInRange(6, 12);

  const el = document.createElement("a");
  el.className = "bubble";
  el.setAttribute("role", "listitem");
  el.setAttribute("href", bubble.url);
  el.setAttribute("tabindex", "0");
  el.style.width = `${bubble.baseWidth}px`;
  el.style.height = `${bubble.baseHeight}px`;
  el.style.fontSize = `${bubble.baseFont}px`;
  if (bubble.image) {
    el.style.setProperty("--bubble-image-font", `${bubble.baseFont * bubble.textFontScale}px`);
  }
  el.style.setProperty("--bubble-pad-x", `${bubble.padX}px`);
  el.style.setProperty("--bubble-pad-y", `${bubble.padY}px`);
  el.style.setProperty("--bubble-radius", `${bubble.cornerRadius}px`);
  el.style.setProperty("--bubble-inset", `${bubble.inset}px`);
  el.style.borderRadius = `${bubble.cornerRadius}px`;
  el.style.setProperty("--bubble-text-width", `${bubble.textWidth}px`);
  el.style.setProperty("--bubble-text-height", `${bubble.textHeight}px`);
  if (bubble.image) {
    el.style.setProperty("--bubble-image-height", `${bubble.imageHeight}px`);
    el.style.setProperty("--bubble-image-radius", `${bubble.imageRadius}px`);
    el.style.setProperty("--bubble-image-gap", `${bubble.imageGap}px`);
    el.style.setProperty("--bubble-text-pad-bottom", `${bubble.textPadBottom}px`);
    el.style.setProperty("--bubble-text-pad-x", `${bubble.textPadX}px`);
  }
  el.style.opacity = "0";

  const textHtml = bubble.textLines.join("<br>");
  if (bubble.image) {
    el.classList.add("has-image");
    if (bubble.imageOnly) {
      el.classList.add("image-only");
      el.innerHTML = `<img src="${bubble.image}" alt="${bubble.title || ""}" loading="lazy" />`;
    } else {
      el.innerHTML = `<img src="${bubble.image}" alt="${bubble.title}" loading="lazy" /><span>${textHtml}</span>`;
    }
  } else {
    el.classList.add("text-only");
    el.innerHTML = `<span>${textHtml}</span>`;
  }

  bubble.el = el;
  attachBubbleEvents(bubble);

  return bubble;
}

function attachBubbleEvents(bubble) {
  const el = bubble.el;

  el.addEventListener("pointerenter", () => {
    if (bubble.dragging) return;
    bubble.hovered = true;
    bubble.savedVx = bubble.vx;
    bubble.savedVy = bubble.vy;
    bubble.vx = 0;
    bubble.vy = 0;
  });

  el.addEventListener("pointerleave", () => {
    if (bubble.dragging) return;
    bubble.hovered = false;
    bubble.vx = bubble.savedVx ?? randomInRange(-8, 8);
    bubble.vy = bubble.savedVy ?? randomInRange(-8, 8);
  });

  el.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();

    bubble.dragging = true;
    bubble.dragMoved = false;
    bubble.lastPointerX = event.clientX;
    bubble.lastPointerY = event.clientY;
    bubble.lastPointerTime = event.timeStamp;
    bubble.dragOffsetX = bubble.x - event.clientX;
    bubble.dragOffsetY = bubble.y - event.clientY;
    bubble.vx = 0;
    bubble.vy = 0;
    bubble.el.classList.add("is-dragging");

    el.setPointerCapture(event.pointerId);
  });

  el.addEventListener("pointermove", (event) => {
    if (!bubble.dragging) return;

    const dx = event.clientX - bubble.lastPointerX;
    const dy = event.clientY - bubble.lastPointerY;
    const dt = Math.max((event.timeStamp - bubble.lastPointerTime) / 1000, 0.016);

    bubble.x = event.clientX + bubble.dragOffsetX;
    bubble.y = event.clientY + bubble.dragOffsetY;

    bubble.vx = dx / dt;
    bubble.vy = dy / dt;

    bubble.lastPointerX = event.clientX;
    bubble.lastPointerY = event.clientY;
    bubble.lastPointerTime = event.timeStamp;

    if (!bubble.dragMoved && Math.hypot(dx, dy) > 4) {
      bubble.dragMoved = true;
    }

    if (event.timeStamp - bubble.lastRipple > 420) {
      bubble.lastRipple = event.timeStamp;
    }
  });

  el.addEventListener("pointerup", (event) => {
    if (!bubble.dragging) return;

    bubble.dragging = false;
    bubble.el.classList.remove("is-dragging");
    bubble.lastRipple = 0;

    if (!bubble.dragMoved) {
      handleBubbleClick(bubble, event);
    }

    el.releasePointerCapture(event.pointerId);
  });

  el.addEventListener("pointercancel", (event) => {
    if (!bubble.dragging) return;
    bubble.dragging = false;
    bubble.el.classList.remove("is-dragging");
    bubble.lastRipple = 0;
    el.releasePointerCapture(event.pointerId);
  });

  el.addEventListener("click", (event) => {
    event.preventDefault();
  });

  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleBubbleClick(bubble, event);
    }
  });
}

function handleBubbleClick(bubble, event) {
  if (!bubble.focused) {
    focusBubble(bubble);
    return;
  }

  window.location.href = bubble.url;
}

function focusBubble(target) {
  if (state.focusTimeout) {
    clearTimeout(state.focusTimeout);
    state.focusTimeout = null;
  }
  state.bubbles.forEach((bubble) => {
    bubble.focused = bubble === target;
    bubble.el.classList.toggle("is-focused", bubble.focused);
    bubble.el.style.zIndex = bubble.focused ? "6" : "2";
  });
  state.focusedBubble = target;

  if (target) {
    state.focusTimeout = setTimeout(() => {
      if (state.focusedBubble === target) {
        focusBubble(null);
      }
    }, 5000);
  }
}

function randomInRange(min, max) {
  if (typeof bubblePhysics.randomInRange === "function") {
    return bubblePhysics.randomInRange(min, max);
  }
  return min + Math.random() * (max - min);
}

function randomCenterBiased(min, max, strength = 0.35) {
  if (typeof bubblePhysics.randomCenterBiased === "function") {
    return bubblePhysics.randomCenterBiased(min, max, strength);
  }
  return randomInRange(min, max);
}

function computeSmallness(bubble) {
  if (typeof bubblePhysics.computeSmallness === "function") {
    return bubblePhysics.computeSmallness(bubble);
  }
  return clamp(1 - bubble.sizeFactor, 0, 1);
}

function safeWidthForY(innerWidth, innerHeight, radius, y) {
  if (typeof bubblePhysics.safeWidthForY === "function") {
    return bubblePhysics.safeWidthForY(innerWidth, innerHeight, radius, y);
  }
  return innerWidth;
}

function setWanderTarget(bubble) {
  if (typeof bubblePhysics.setWanderTarget === "function") {
    bubblePhysics.setWanderTarget(state, bubble);
    return;
  }
  bubble.wanderX = randomInRange(state.bounds.left, state.bounds.right);
  bubble.wanderY = randomInRange(state.bounds.top, state.bounds.bottom);
}

function layoutBubble(bubble) {
  if (typeof bubbleRender.layoutBubble === "function") {
    bubbleRender.layoutBubble({
      bubble,
      measureCtx,
      fontStack: FONT_STACK,
      clamp,
      safeWidthForY,
      randomInRange
    });
    return;
  }
  bubble.baseWidth = bubble.baseWidth || 220;
  bubble.baseHeight = bubble.baseHeight || 120;
  bubble.baseRadius = Math.max(bubble.baseWidth, bubble.baseHeight) * 0.5;
  bubble.cornerRadius = bubble.baseHeight * 0.45;
  bubble.textLines = bubble.title ? [bubble.title] : [];
  bubble.textWidth = bubble.baseWidth - bubble.padX * 2;
  bubble.textHeight = bubble.baseFont * 1.2;
}

function placeBubble(bubble) {
  const { left, right, top, bottom } = state.bounds;
  const attempts = 320;

  for (let i = 0; i < attempts; i += 1) {
    const x = randomCenterBiased(left, right, 0.55);
    const y = randomCenterBiased(top, bottom, 0.55);
    bubble.x = x;
    bubble.y = y;

    if (state.bubbles.every((other) => other === bubble || !isOverlapping(bubble, other))) {
      const angle = Math.random() * Math.PI * 2;
      const kick = randomInRange(8, 14);
      bubble.vx += Math.cos(angle) * kick;
      bubble.vy += Math.sin(angle) * kick;
      return;
    }
  }
}

function isOverlapping(a, b) {
  if (typeof bubblePhysics.isOverlapping === "function") {
    return bubblePhysics.isOverlapping(a, b, 110);
  }
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) < a.baseRadius + b.baseRadius + 110;
}

function findExitTarget(bubble) {
  if (typeof bubblePhysics.findExitTarget === "function") {
    return bubblePhysics.findExitTarget(state, bubble);
  }
  return { x: bubble.x, y: bubble.y, score: 0 };
}


function updateBounds() {
  if (typeof bubblePhysics.updateBounds === "function") {
    bubblePhysics.updateBounds(state, clamp);
    return;
  }
  const margin = clamp(state.minDim * 0.05, 24, 64);
  state.bounds.left = margin;
  state.bounds.right = state.width - margin;
  state.bounds.top = state.height * 0.12;
  state.bounds.bottom = state.height - margin;
}

function buildBubbles() {
  field.innerHTML = "";
  state.bubbles = [];
  activeTitles.clear();
  activeKeys.clear();

  const baseCount = calcBubbleCount(state.width, state.height);
  const maxCount = bubbleData.length ? Math.min(baseCount, bubbleData.length) : baseCount;
  for (let i = 0; i < maxCount; i += 1) {
    const item = getNextBubbleData();
    if (!item) break;
    const isLarge = i < Math.min(5, Math.max(3, Math.round(maxCount * 0.3)));
    const sizeFactor = isLarge ? randomInRange(1.05, 1.18) : randomInRange(0.82, 1.0);
    const bubble = createBubble(item, sizeFactor);
    state.bubbles.push(bubble);
    field.appendChild(bubble.el);
  }

  state.bubbles.forEach((bubble) => {
    placeBubble(bubble);
  });

  state.recycleTimer = randomInRange(RECYCLE_MIN, RECYCLE_MAX);
}

function pickSizeFactor() {
  return Math.random() < 0.3 ? randomInRange(1.05, 1.18) : randomInRange(0.82, 1.0);
}

function spawnBubble() {
  const item = getNextBubbleData();
  if (!item) return;
  const bubble = createBubble(item, pickSizeFactor());
  state.bubbles.push(bubble);
  field.appendChild(bubble.el);
  placeBubble(bubble);
}

function updateBubbles(time) {
  const dt = Math.min((time - state.lastTime) / 1000, 0.032);
  state.lastTime = time;
  state.simTime += dt;
  const simTimeMs = state.simTime * 1000;

  state.recycleTimer -= dt;
  if (state.recycleTimer <= 0) {
    const candidates = state.bubbles.filter((bubble) => {
      if (bubble.dragging || bubble.hovered || bubble.focused) return false;
      if (bubble.lifeState !== "alive") return false;
      return state.simTime - bubble.spawnTime >= MIN_VISIBLE_SECONDS;
    });
    if (candidates.length) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      pick.lifeState = "exiting";
      pick.lifeTimer = 0;
      pick.lifeDuration = randomInRange(14, 18);
      pick.exitReady = false;
      pick.exitTimer = 0;
      pick.exitMaxRelocate = randomInRange(2.8, 4.2);
      const target = findExitTarget(pick);
      pick.exitTargetX = target.x;
      pick.exitTargetY = target.y;
    }
    state.recycleTimer = randomInRange(RECYCLE_MIN, RECYCLE_MAX);
  }

  const { left, right, top, bottom } = state.bounds;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const sigma = Math.min(right - left, bottom - top) * 0.32;
  const padding = 0;
  const removals = [];

  state.bubbles.forEach((bubble) => {
    if (!Number.isFinite(bubble.prevVx)) {
      bubble.prevVx = bubble.vx;
      bubble.prevVy = bubble.vy;
    }
    let lifeScale = 1;
    if (bubble.lifeState === "entering") {
      bubble.lifeTimer += dt;
      const t = clamp(bubble.lifeTimer / bubble.lifeDuration, 0, 1);
      const ease = easeOutCubic(t);
      bubble.opacity = ease;
      // Soap bubble inflate: overshoot then settle
      const inflate = t < 0.7
        ? 0.82 + 0.26 * (t / 0.7)
        : 1.08 - 0.08 * ((t - 0.7) / 0.3);
      lifeScale = inflate;
      if (t < 0.2) {
        const jitter = (0.2 - t) * 18;
        bubble.vx += Math.cos(bubble.heading) * jitter * dt;
        bubble.vy += Math.sin(bubble.heading) * jitter * dt;
      }
      if (t >= 1) {
        bubble.lifeState = "alive";
      }
    } else if (bubble.lifeState === "exiting") {
      const edgeBand = clamp(state.minDim * 0.08, 24, 90);
      const nearEdge =
        bubble.x - left < edgeBand ||
        right - bubble.x < edgeBand ||
        bubble.y - top < edgeBand ||
        bottom - bubble.y < edgeBand;
      const distanceToOthers = () => {
        let minDistance = Infinity;
        state.bubbles.forEach((other) => {
          if (other === bubble || other.lifeState !== "alive") return;
          const dx = bubble.x - other.x;
          const dy = bubble.y - other.y;
          const dist = Math.hypot(dx, dy) - other.radius;
          if (dist < minDistance) {
            minDistance = dist;
          }
        });
        return minDistance;
      };

      const clearance = distanceToOthers();
      const targetDist =
        bubble.exitTargetX != null && bubble.exitTargetY != null
          ? Math.hypot(bubble.exitTargetX - bubble.x, bubble.exitTargetY - bubble.y)
          : 0;

      if (!bubble.exitReady) {
        bubble.exitTimer += dt;
        bubble.opacity = 1;
        lifeScale = 1;

        if (
          nearEdge &&
          ((clearance > bubble.radius + 80 && targetDist < bubble.radius * 0.7) ||
            bubble.exitTimer >= bubble.exitMaxRelocate)
        ) {
          bubble.exitReady = true;
          bubble.lifeTimer = 0;
        } else if (!nearEdge && bubble.exitTimer >= bubble.exitMaxRelocate) {
          const target = findExitTarget(bubble);
          bubble.exitTargetX = target.x;
          bubble.exitTargetY = target.y;
          bubble.exitTimer = 0;
          bubble.exitMaxRelocate = randomInRange(2.4, 3.6);
        }
      } else {
        bubble.lifeTimer += dt;
        const t = clamp(bubble.lifeTimer / bubble.lifeDuration, 0, 1);
        const ease = easeInOutCubic(t);
        bubble.opacity = 1 - ease;
        lifeScale = 1 - 0.08 * ease;

        if (t >= 1) {
          removals.push(bubble);
        }
      }

      if (!bubble.exitReady || bubble.lifeTimer < bubble.lifeDuration * 0.85) {
        state.bubbles.forEach((other) => {
          if (other === bubble || other.lifeState !== "alive") return;
          const dx = bubble.x - other.x;
          const dy = bubble.y - other.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = bubble.radius + other.radius + 50;
          if (dist < minDist) {
            const push = (minDist - dist) / minDist;
            bubble.vx += (dx / dist) * push * 18 * dt;
            bubble.vy += (dy / dist) * push * 18 * dt;
          }
        });
      }

      if (bubble.exitTargetX != null && bubble.exitTargetY != null) {
        const toX = bubble.exitTargetX - bubble.x;
        const toY = bubble.exitTargetY - bubble.y;
        const dist = Math.hypot(toX, toY) || 1;
        const pull = 0.12;
        const pullScale = bubble.exitReady ? 0.6 : 1;
        bubble.vx += (toX / dist) * Math.min(dist, 180) * pull * pullScale * dt;
        bubble.vy += (toY / dist) * Math.min(dist, 180) * pull * pullScale * dt;
      }

      if (!bubble.exitReady && bubble.exitTimer < 0.35) {
        const drift = (0.35 - bubble.exitTimer) * 12;
        bubble.vx += Math.cos(bubble.heading + 0.6) * drift * dt;
        bubble.vy += Math.sin(bubble.heading + 0.6) * drift * dt;
      }
    } else {
      bubble.opacity = 1;
    }

    bubble.lifeScale = lifeScale;

    const dx = bubble.x - centerX;
    const dy = bubble.y - centerY;
    const centerBoost = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    const pulse = 0.5 + 0.5 * Math.sin(simTimeMs * 0.00036 + bubble.pulsePhase);
    const smallness = bubble.smallness ?? 0;
    const typeBias = 0;
    bubble.sizeTimer -= dt;
    if (bubble.sizeTimer <= 0) {
      const minTarget = -0.16 + smallness * 0.12 + typeBias * 0.4;
      const maxTarget = 0.2 + smallness * 0.32 + typeBias * 0.6;
      bubble.sizeTarget = randomInRange(minTarget, maxTarget);
      const minTime = 9.4 - smallness * 2.0;
      const maxTime = 16.2 - smallness * 2.6;
      bubble.sizeTimer = randomInRange(Math.max(4.8, minTime), Math.max(8.6, maxTime));
    }

    const sizeSpeed = 0.18 + smallness * 0.18;
    bubble.sizeBias += (bubble.sizeTarget - bubble.sizeBias) * dt * sizeSpeed;
    const sizeDrift = clamp(1 + bubble.sizeBias, 0.92, 1.26);
    const baseScale = 0.92 + pulse * 0.1 + centerBoost * 0.1;

    const focusTarget = bubble.focused ? 1 : 0;
    bubble.focusLevel += (focusTarget - bubble.focusLevel) * dt * 3;
    const focusScale = 1 + bubble.focusLevel * 0.24;
    const sizePreference = clamp(1 + smallness * 0.06, 0.92, 1.12);

    bubble.scale = Math.max(baseScale * sizeDrift * focusScale * sizePreference, bubble.minScale);
    bubble.radius = (Math.max(bubble.baseWidth, bubble.baseHeight) * 0.5) * bubble.scale * bubble.lifeScale;
    if (!bubble.focused) {
      const depthScore = (bubble.scale - 0.95) * 10 + smallness * 1.6;
      const depthIndex = clamp(Math.round(2 + depthScore), 1, 3);
      bubble.el.style.zIndex = `${depthIndex}`;
    }

    if (!bubble.dragging) {
      if (bubble.focused) {
        const toX = centerX - bubble.x;
        const toY = centerY - bubble.y;
        const distToCenter = Math.hypot(toX, toY) || 1;
        const pull = 0.3 * bubble.focusLevel;
        const pullStrength = Math.min(distToCenter, 320) * pull;
        bubble.vx += (toX / distToCenter) * pullStrength * dt;
        bubble.vy += (toY / distToCenter) * pullStrength * dt;
      }
    }

    if (!bubble.dragging && !bubble.hovered) {
      const timeSec = state.simTime;
      const dist = Math.hypot(dx, dy) || 1;
      const tx = -dy / dist;
      const ty = dx / dist;

      bubble.wanderTimer -= dt;
      if (bubble.wanderTimer <= 0) {
        setWanderTarget(bubble);
      bubble.wanderTimer = randomInRange(3.5, 6.5);
      }

      const turn =
        Math.sin(timeSec * 0.12 + bubble.flowPhase) * 0.6 +
        Math.sin(timeSec * 0.2 + bubble.flowPhase2) * 0.35 +
        Math.sin(timeSec * 0.08 + bubble.driftPhase) * 0.25;
      bubble.heading += (turn + bubble.headingBias * 0.12) * dt;

      const baseVx = Math.cos(bubble.heading) * bubble.speed;
      const baseVy = Math.sin(bubble.heading) * bubble.speed;

      const swirlStrength = 8 * bubble.swirlBias;
      const swirlX = tx * swirlStrength * bubble.orbitDir;
      const swirlY = ty * swirlStrength * bubble.orbitDir;

      const radial = Math.sin(timeSec * 0.18 + bubble.orbitPhase) * 2.8;
      const radialX = (dx / dist) * radial;
      const radialY = (dy / dist) * radial;

      const driftX = Math.sin(timeSec * 0.32 + bubble.driftPhase2) * 2.4;
      const driftY = Math.cos(timeSec * 0.27 + bubble.driftPhase) * 2.4;

      const desiredVx = baseVx + swirlX + radialX + driftX;
      const desiredVy = baseVy + swirlY + radialY + driftY;

      const blend = Math.min(dt * VELOCITY_SMOOTH, 1);
      bubble.vx += (desiredVx - bubble.vx) * blend;
      bubble.vy += (desiredVy - bubble.vy) * blend;

      const wanderStrength = 0.16;
      bubble.vx += (bubble.wanderX - bubble.x) * wanderStrength * dt;
      bubble.vy += (bubble.wanderY - bubble.y) * wanderStrength * dt;

      const pullTargetX = centerX;
      const pullTargetY = top + (bottom - top) * 0.7;
      const pullStrength = 0.017;
      bubble.vx += (pullTargetX - bubble.x) * pullStrength * dt;
      bubble.vy += (pullTargetY - bubble.y) * pullStrength * dt;

      const dvx = bubble.vx - bubble.prevVx;
      const dvy = bubble.vy - bubble.prevVy;
      const deltaMag = Math.hypot(dvx, dvy);
      const maxDelta = MAX_ACCEL * dt;
      if (deltaMag > maxDelta) {
        const scale = maxDelta / deltaMag;
        bubble.vx = bubble.prevVx + dvx * scale;
        bubble.vy = bubble.prevVy + dvy * scale;
      }

      const speed = Math.hypot(bubble.vx, bubble.vy) || 0;
      const maxSpeed = clamp(bubble.speed * 2.1, 30, 58);
      if (speed > maxSpeed) {
        const s = maxSpeed / speed;
        bubble.vx *= s;
        bubble.vy *= s;
      }

      bubble.x += bubble.vx * dt;
      bubble.y += bubble.vy * dt;
    }

    bubble.prevVx = bubble.vx;
    bubble.prevVy = bubble.vy;
  });

  for (let i = 0; i < state.bubbles.length; i += 1) {
    for (let j = i + 1; j < state.bubbles.length; j += 1) {
      const a = state.bubbles[i];
      const b = state.bubbles[j];
      if (a.lifeState !== "alive" || b.lifeState !== "alive") continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 0.001;
      const minDist = (a.radius + b.radius) * SEPARATION_RADIUS_SCALE + SEPARATION_EXTRA;

      if (distance < minDist) {
        const overlap = (minDist - distance) / minDist;
        if (overlap < 0.005) continue;
        const nx = dx / distance;
        const ny = dy / distance;
        const push = overlap * overlap * SEPARATION_STRENGTH * (92 * dt);

        if (!a.dragging && !a.hovered) {
          a.vx -= nx * push;
          a.vy -= ny * push;
        }
        if (!b.dragging && !b.hovered) {
          b.vx += nx * push;
          b.vy += ny * push;
        }
      }
    }
  }

  for (let k = 0; k < COLLISION_ITERATIONS; k += 1) {
    for (let i = 0; i < state.bubbles.length; i += 1) {
      for (let j = i + 1; j < state.bubbles.length; j += 1) {
        const a = state.bubbles[i];
        const b = state.bubbles[j];
        if (a.lifeState !== "alive" || b.lifeState !== "alive") continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        const minDist = a.radius + b.radius + padding;

        if (distance < minDist) {
          const overlap = (minDist - distance) / distance;
          const pushX = dx * overlap * COLLISION_PUSH;
          const pushY = dy * overlap * COLLISION_PUSH;

          if (!a.dragging && !a.hovered) {
            a.x -= pushX;
            a.y -= pushY;
          }
          if (!b.dragging && !b.hovered) {
            b.x += pushX;
            b.y += pushY;
          }
        }
      }
    }
  }

  state.bubbles.forEach((bubble) => {
    const r = bubble.radius + 6;
    const leftBound = left + r;
    const rightBound = right - r;
    const topBound = top + r;
    const bottomBound = bottom - r;

    if (bubble.x < leftBound) {
      const delta = leftBound - bubble.x;
      bubble.vx += delta * 0.6 * dt;
      bubble.x += delta * 0.2;
      if (delta > r * 0.9) {
        bubble.x = leftBound;
        bubble.vx *= 0.3;
      }
    } else if (bubble.x > rightBound) {
      const delta = bubble.x - rightBound;
      bubble.vx -= delta * 0.6 * dt;
      bubble.x -= delta * 0.2;
      if (delta > r * 0.9) {
        bubble.x = rightBound;
        bubble.vx *= 0.3;
      }
    }

    if (bubble.y < topBound) {
      const delta = topBound - bubble.y;
      bubble.vy += delta * 0.6 * dt;
      bubble.y += delta * 0.2;
      if (delta > r * 0.9) {
        bubble.y = topBound;
        bubble.vy *= 0.3;
      }
    } else if (bubble.y > bottomBound) {
      const delta = bubble.y - bottomBound;
      bubble.vy -= delta * 0.6 * dt;
      bubble.y -= delta * 0.2;
      if (delta > r * 0.9) {
        bubble.y = bottomBound;
        bubble.vy *= 0.3;
      }
    }

    const visualScale = bubble.scale * bubble.lifeScale;
    bubble.el.style.transform = `translate(${bubble.x - bubble.baseWidth / 2}px, ${bubble.y - bubble.baseHeight / 2}px) scale(${visualScale})`;
    bubble.el.style.opacity = `${bubble.opacity}`;
  });

  if (removals.length) {
    removals.forEach((bubble) => {
      bubble.el.remove();
      const index = state.bubbles.indexOf(bubble);
      if (index >= 0) {
        state.bubbles.splice(index, 1);
      }
      if (bubble.title) {
        activeTitles.delete(bubble.title);
      }
      activeKeys.delete(bubble.key);
      spawnBubble();
    });
  }

  requestAnimationFrame(updateBubbles);
}

function syncOnResize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.minDim = Math.min(state.width, state.height);
  updateBounds();
  buildBubbles();
}

window.addEventListener("resize", () => {
  syncOnResize();
});

async function bootstrap() {
  if (window.SiteStateSync) {
    await window.SiteStateSync.pull();
  }
  bubbleData = loadBubbleData();
  updateBounds();
  buildBubbles();
  requestAnimationFrame(updateBubbles);
}

void bootstrap();
