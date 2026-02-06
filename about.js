const THEMES = ["light", "dark"];
const THEME_KEY = "bubble-theme";
const CONTACT_KEY = "site-contact";
const SOCIAL_KEY = "site-social";

const themeToggle = document.getElementById("theme-toggle");
const menuToggle = document.getElementById("menu-toggle");
const menuBubble = document.getElementById("menu");
const emailLinks = document.querySelectorAll("[data-email]");
const socialLinks = document.querySelectorAll("[data-social]");

const storedTheme = localStorage.getItem(THEME_KEY);
const initialTheme = storedTheme === "dark" ? "dark" : "light";
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

function normalizeUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return Boolean(parsed.protocol && parsed.host);
  } catch (error) {
    return false;
  }
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
      return {
        spotify: "https://open.spotify.com/user/jakobschlenker?si=03ac03535b8045d7",
        linkedin: "https://www.linkedin.com/in/jakob-schlenker-88169526b"
      };
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
