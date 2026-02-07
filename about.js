const shared = window.SiteShared || {};
const constants = shared.constants || {};
const storageUtils = shared.storage || {};
const urlUtils = shared.url || {};

if (typeof storageUtils.migrateState === "function") {
  storageUtils.migrateState(localStorage, constants);
}

const THEMES = constants.THEMES?.BASIC || ["light", "dark"];
const THEME_KEY = constants.STORAGE_KEYS?.THEME || "bubble-theme";
const CONTACT_KEY = constants.STORAGE_KEYS?.CONTACT || "site-contact";
const SOCIAL_KEY = constants.STORAGE_KEYS?.SOCIAL || "site-social";
const DEFAULT_SOCIAL = constants.DEFAULT_SOCIAL || {
  spotify: "https://open.spotify.com/user/jakobschlenker?si=03ac03535b8045d7",
  linkedin: "https://www.linkedin.com/in/jakob-schlenker-88169526b"
};
const normalizeUrl = urlUtils.normalizeUrl || ((value) => value || "");
const isValidUrl = urlUtils.isValidUrl || (() => false);

const themeToggle = document.getElementById("theme-toggle");
const menuToggle = document.getElementById("menu-toggle");
const menuBubble = document.getElementById("menu");
const emailLinks = document.querySelectorAll("[data-email]");
const socialLinks = document.querySelectorAll("[data-social]");

const initialTheme = "light";
document.body.setAttribute("data-theme", initialTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") || "light";
    const index = THEMES.indexOf(current);
    const next = THEMES[(index + 1 + THEMES.length) % THEMES.length] || "light";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
  });
}

if (menuToggle && menuBubble) {
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
}

function loadContact() {
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    if (!raw) return { email: "" };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { email: "" };
    return { email: parsed.email ?? "" };
  } catch (error) {
    return { email: "" };
  }
}

function applyEmailLinks() {
  const data = loadContact();
  const email = data.email.trim();
  emailLinks.forEach((link) => {
    if (email) {
      link.href = `mailto:${email}`;
      link.removeAttribute("aria-disabled");
      link.classList.remove("is-disabled");
      link.setAttribute("aria-label", `Email ${email}`);
      return;
    }
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    link.classList.add("is-disabled");
    link.removeAttribute("aria-label");
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
      return;
    }
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    link.classList.add("is-disabled");
  });
}

applyEmailLinks();
applySocialLinks();

window.addEventListener("storage", (event) => {
  if (event.key === CONTACT_KEY) {
    applyEmailLinks();
  }
  if (event.key === SOCIAL_KEY) {
    applySocialLinks();
  }
});

async function bootstrapAbout() {
  if (window.SiteStateSync) {
    const pulled = await window.SiteStateSync.pull();
    if (pulled?.ok && pulled.changed) {
      applyEmailLinks();
      applySocialLinks();
    }
  }
}

void bootstrapAbout();
