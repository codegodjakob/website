const THEMES = ["light", "dark"];
const STORAGE_KEY = "bubble-theme";
const DATA_KEY = "bubble-data";
const PAGE_KEY = "bubble-pages";
const VISIBILITY_KEY = "bubble-visibility";
const CONTACT_KEY = "site-contact";
const SOCIAL_KEY = "site-social";

const themeToggle = document.getElementById("theme-toggle");
const heroImage = document.getElementById("hero-image");
const heroSection = document.querySelector(".hero");
const metaCategories = document.getElementById("meta-categories");
const pageTitle = document.getElementById("page-title");
const pageContent = document.getElementById("page-content");
const relatedSection = document.getElementById("related-section");
const relatedList = document.getElementById("related-list");
const emailLinks = document.querySelectorAll("[data-email]");
const socialLinks = document.querySelectorAll("[data-social]");

const storedTheme = localStorage.getItem(STORAGE_KEY);
const initialTheme = storedTheme === "dark" ? "dark" : "light";
document.body.setAttribute("data-theme", initialTheme);

themeToggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme") || "light";
  const index = THEMES.indexOf(current);
  const next = THEMES[(index + 1 + THEMES.length) % THEMES.length] || "light";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem(STORAGE_KEY, next);
});

const menuToggle = document.getElementById("menu-toggle");
const menuBubble = document.getElementById("menu");

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

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
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

function loadVisibilityMap() {
  try {
    const raw = localStorage.getItem(VISIBILITY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function loadBubbleList() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const visibilityMap = loadVisibilityMap();
    return parsed.filter((item) => {
      if (!item) return false;
      const id = typeof item.id === "string" ? item.id : "";
      const fromItem = coerceEnabled(item.enabled);
      const fromMap = id && Object.prototype.hasOwnProperty.call(visibilityMap, id)
        ? coerceEnabled(visibilityMap[id])
        : undefined;
      return fromMap === undefined ? fromItem : fromMap;
    });
  } catch (error) {
    return [];
  }
}

function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

function getBubbleCategories(item) {
  const rawList = Array.isArray(item?.categories) ? item.categories : [];
  const legacy = typeof item?.category === "string" ? item.category.trim() : "";
  const list = rawList.length ? rawList : legacy ? [legacy] : [];
  return list.map(normalizeCategory).filter(Boolean);
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || "");
}

function toEmbedUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    const match =
      /v=([^&]+)/.exec(trimmed) ||
      /youtu\.be\/([^?&]+)/.exec(trimmed) ||
      /embed\/([^?&]+)/.exec(trimmed);
    const id = match ? match[1] : "";
    return id ? `https://www.youtube.com/embed/${id}` : trimmed;
  }
  if (trimmed.includes("vimeo.com")) {
    const match = /vimeo\.com\/(\d+)/.exec(trimmed) || /player\.vimeo\.com\/video\/(\d+)/.exec(trimmed);
    const id = match ? match[1] : "";
    return id ? `https://player.vimeo.com/video/${id}` : trimmed;
  }
  return trimmed;
}

function renderTextContent(container, text) {
  buildContent(text, container);
}

function renderMediaItem(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "media-frame";
  const kind = item.kind || (isVideoUrl(item.src) ? "video" : "image");
  if (kind === "embed") {
    const iframe = document.createElement("iframe");
    iframe.src = toEmbedUrl(item.src || "");
    iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
    iframe.setAttribute("loading", "lazy");
    wrapper.appendChild(iframe);
    return wrapper;
  }
  if (kind === "video") {
    const video = document.createElement("video");
    video.src = item.src || "";
    video.controls = true;
    video.playsInline = true;
    video.muted = true;
    wrapper.appendChild(video);
    return wrapper;
  }
  const img = document.createElement("img");
  img.src = item.src || "";
  img.alt = "";
  wrapper.appendChild(img);
  return wrapper;
}

function renderSections(sections) {
  pageContent.innerHTML = "";
  sections.forEach((section) => {
    const wrapper = document.createElement("section");
    wrapper.className = "content-section";

    const type = section.type || "text";
    if (type === "text") {
      wrapper.classList.add("section-text");
      const text = document.createElement("div");
      text.className = "section-text-body";
      renderTextContent(text, section.text || "");
      wrapper.appendChild(text);
    } else if (type === "split-text-media" || type === "split-media-text") {
      wrapper.classList.add("section-split");
      if (type === "split-media-text") wrapper.classList.add("is-reverse");
      const textCol = document.createElement("div");
      textCol.className = "section-text-body";
      renderTextContent(textCol, section.text || "");
      const mediaCol = document.createElement("div");
      mediaCol.className = "section-media-stack";
      (section.media || []).forEach((item) => {
        mediaCol.appendChild(renderMediaItem(item));
      });
      wrapper.append(textCol, mediaCol);
    } else if (type === "media-full") {
      wrapper.classList.add("section-media-full");
      const media = (section.media || [])[0];
      if (media) wrapper.appendChild(renderMediaItem(media));
    } else if (type === "media-grid") {
      wrapper.classList.add("section-media-grid");
      const grid = document.createElement("div");
      grid.className = "media-grid";
      (section.media || []).forEach((item) => {
        grid.appendChild(renderMediaItem(item));
      });
      wrapper.appendChild(grid);
    } else if (type === "media-duo") {
      wrapper.classList.add("section-media-duo");
      const grid = document.createElement("div");
      grid.className = "media-duo";
      (section.media || []).forEach((item) => {
        grid.appendChild(renderMediaItem(item));
      });
      wrapper.appendChild(grid);
    } else if (type === "media-bleed") {
      wrapper.classList.add("section-media-bleed");
      const media = (section.media || [])[0];
      if (media) wrapper.appendChild(renderMediaItem(media));
    }

    pageContent.appendChild(wrapper);
  });
}

function primaryMediaFromSections(sections) {
  for (const section of sections || []) {
    for (const item of section.media || []) {
      if (!item?.src) continue;
      if ((item.kind || "") === "embed") continue;
      return item.src;
    }
  }
  return "";
}

function renderRelated(currentId, bubbles, pages, categories) {
  if (!relatedList || !relatedSection) return;
  relatedList.innerHTML = "";

  const normalizedCurrent = categories.map(normalizeCategory).filter(Boolean);
  const candidates = bubbles.filter((item) => item?.id && item.id !== currentId);

  let related = [];
  if (normalizedCurrent.length) {
    related = candidates
      .map((item) => {
        const itemCategories = getBubbleCategories(item);
        const overlap = itemCategories.filter((cat) => normalizedCurrent.includes(cat)).length;
        return { item, overlap, categories: itemCategories };
      })
      .filter((entry) => entry.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3)
      .map((entry) => entry.item);
  }

  if (!related.length) {
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    related = shuffled.slice(0, 3);
  }

  if (!related.length) {
    relatedSection.style.display = "none";
    return;
  }

  relatedSection.style.display = "";
  related.forEach((item) => {
    const pageData = pages?.[item.id] || {};
    const title = item.title || pageData.title || "Projekt";
    const image = (Array.isArray(pageData.sections) && primaryMediaFromSections(pageData.sections)) || pageData.hero || item.image || "";

    const card = document.createElement("a");
    card.className = `related-card ${image ? "is-image" : "is-text"}`;
    card.href = `page.html?id=${encodeURIComponent(item.id)}`;

    if (image) {
      const thumb = document.createElement("span");
      thumb.className = "related-thumb";
      thumb.style.backgroundImage = `url("${image}")`;
      card.appendChild(thumb);
    }

    const text = document.createElement("div");
    text.className = "related-title";
    text.textContent = title;
    card.appendChild(text);

    relatedList.appendChild(card);
  });
}

function loadPages() {
  try {
    const raw = localStorage.getItem(PAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function buildContent(body, target) {
  const container = target || pageContent;
  container.innerHTML = "";
  if (!body) return;
  const blocks = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  blocks.forEach((block) => {
    if (block.startsWith("## ")) {
      const h2 = document.createElement("h2");
      h2.textContent = block.replace(/^##\s+/, "");
      container.appendChild(h2);
      return;
    }
    if (block.startsWith(">")) {
      const quote = document.createElement("blockquote");
      quote.textContent = block.replace(/^>\s?/, "");
      container.appendChild(quote);
      return;
    }
    const p = document.createElement("p");
    p.textContent = block.replace(/\s*\n\s*/g, " ");
    container.appendChild(p);
  });
}

function renderPage() {
  const id = getQueryParam("id");
  const bubbles = loadBubbleList();
  const pages = loadPages();
  const bubble = bubbles.find((item) => item.id === id) || null;
  const page = (id && pages[id]) || {};
  const hasSections = Array.isArray(page.sections) && page.sections.length;

  const title = bubble?.title || page.title || "Titel des Artikels";
  const hero = page.hero || bubble?.image || "";
  const bubbleCategories = Array.isArray(bubble?.categories) ? bubble.categories.filter(Boolean) : [];
  const legacyCategory = typeof bubble?.category === "string" ? bubble.category.trim() : "";
  const bubbleCategoryList = bubbleCategories.length
    ? bubbleCategories
    : legacyCategory && legacyCategory.toLowerCase() !== "category"
      ? [legacyCategory]
      : [];
  const rawPageCategory = typeof page?.category === "string" ? page.category.trim() : "";
  const pageCategory =
    rawPageCategory && rawPageCategory.toLowerCase() !== "category" ? [rawPageCategory] : [];
  const categories = bubbleCategoryList.length ? bubbleCategoryList : pageCategory;
  const body = page.body || "## Abschnittsüberschrift\n\nDieser Text ist ein Platzhalter.\n\n> Kurzes Zitat oder Highlight.\n\n## Weiterer Abschnitt\n\nMehr Details, Beispiele oder Kontext.";

  document.title = title;
  pageTitle.textContent = title;
  if (metaCategories) {
    metaCategories.innerHTML = "";
    if (categories.length) {
      metaCategories.style.display = "inline-flex";
      categories.forEach((category) => {
        const pill = document.createElement("span");
        pill.className = "meta-pill";
        pill.textContent = category;
        metaCategories.appendChild(pill);
      });
    } else {
      metaCategories.style.display = "none";
    }
  }

  if (hasSections) {
    if (heroSection) heroSection.style.display = "none";
  } else {
    if (heroSection) heroSection.style.display = "";
    if (hero) {
      heroImage.src = hero;
      heroImage.style.display = "block";
    } else {
      heroImage.style.display = "none";
    }
  }

  if (hasSections) {
    renderSections(page.sections);
  } else {
    buildContent(body);
  }
  renderRelated(id, bubbles, pages, categories);
}

async function bootstrapPage() {
  if (window.SiteStateSync) {
    const pulled = await window.SiteStateSync.pull();
    if (pulled?.ok && pulled.changed) {
      applySocialLinks();
      applyEmailLinks();
    }
  }
  renderPage();
}

void bootstrapPage();

window.addEventListener("storage", (event) => {
  if (event.key === SOCIAL_KEY) {
    applySocialLinks();
  }
  if (event.key === CONTACT_KEY) {
    applyEmailLinks();
  }
});
