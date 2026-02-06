const STORAGE_KEY = "bubble-data";
const CATEGORY_KEY = "bubble-categories";
const ABOUT_KEY = "site-about";
const CONTACT_KEY = "site-contact";
const SOCIAL_KEY = "site-social";

const defaultBubbleData = [
  { title: "Die Zukunft der stillen Interfaces", url: "https://example.com/future-interfaces" },
  { title: "Minimalismus als Produktstrategie", url: "https://example.com/minimalism" },
  { title: "Kuratierte Inhalte für langsame Medien", url: "https://example.com/slow-media" },
  { title: "Design Systems für leise Marken", url: "https://example.com/design-systems" },
  { title: "Glas, Licht & Tiefe im UI", url: "https://example.com/glass-ui" },
  { title: "Kleine Bewegungen, große Wirkung", url: "https://example.com/motion" },
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

const listEl = document.getElementById("item-list");
const addBtn = document.getElementById("add-btn");
const openSiteBtn = document.getElementById("open-site");
const statusText = document.getElementById("status-text");
const saveBtn = document.getElementById("save-btn");
const countText = document.getElementById("count-text");
const categoryInput = document.getElementById("category-input");
const addCategoryBtn = document.getElementById("add-category");
const categoryListEl = document.getElementById("category-list");
const cropModal = document.getElementById("crop-modal");
const cropImage = document.getElementById("crop-image");
const cropFrame = document.getElementById("crop-frame");
const cropZoom = document.getElementById("crop-zoom");
const cropApply = document.getElementById("crop-apply");
const cropCancel = document.getElementById("crop-cancel");
const cropClose = document.getElementById("crop-close");
const aboutTitleInput = document.getElementById("about-title");
const aboutBodyInput = document.getElementById("about-body");
const aboutImagePreview = document.getElementById("about-image-preview");
const aboutUploadBtn = document.getElementById("about-upload");
const aboutClearBtn = document.getElementById("about-clear");
const aboutFileInput = document.getElementById("about-file");
const aboutEditBtn = document.getElementById("about-edit");
const aboutOpenBtn = document.getElementById("about-open");
const contactEmailInput = document.getElementById("contact-email");
const spotifyInput = document.getElementById("social-spotify");
const linkedinInput = document.getElementById("social-linkedin");
const checkSpotifyBtn = document.getElementById("check-spotify");
const checkLinkedinBtn = document.getElementById("check-linkedin");
const spotifyHint = document.getElementById("spotify-hint");
const linkedinHint = document.getElementById("linkedin-hint");

let items = loadData();
let dragState = null;
let uploadInFlight = false;
let cropState = null;
let categories = loadCategories();
let aboutData = loadAbout();
let contactData = loadContact();
let socialData = loadSocial();
let isDirty = false;
let saveTimer = null;

function startSort(row, event) {
  dragState = {
    row,
    startY: event.clientY,
    pointerId: event.pointerId
  };
  row.classList.add("dragging");
  row.style.zIndex = "2";
  row.style.position = "relative";
  row.style.pointerEvents = "none";
  document.body.classList.add("is-sorting");
}

function handleSortMove(event) {
  if (!dragState) return;
  const { row, startY } = dragState;
  const dy = event.clientY - startY;
  row.style.transform = `translateY(${dy}px)`;

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".item-row");
  if (!target || target === row || target.parentElement !== listEl) return;

  const targetRect = target.getBoundingClientRect();
  const insertAfter = event.clientY > targetRect.top + targetRect.height / 2;
  if (insertAfter) {
    listEl.insertBefore(row, target.nextSibling);
  } else {
    listEl.insertBefore(row, target);
  }
}

function commitDomOrder() {
  const order = Array.from(listEl.querySelectorAll(".item-row")).map((row) => row.dataset.id);
  if (!order.length) return;
  items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  render();
  requestSave();
}

function endSort() {
  if (!dragState) return;
  const { row } = dragState;
  row.classList.remove("dragging");
  row.style.transform = "";
  row.style.zIndex = "";
  row.style.position = "";
  row.style.pointerEvents = "";
  document.body.classList.remove("is-sorting");
  dragState = null;
  commitDomOrder();
}

window.addEventListener("pointermove", handleSortMove);
window.addEventListener("pointerup", endSort);
window.addEventListener("pointercancel", endSort);

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    refreshFromStorage();
  }
});

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultBubbleData.map((item) => {
        const id = crypto.randomUUID();
        return {
          ...item,
          id,
          url: `page.html?id=${id}`,
          imageOnly: Boolean(item.image && !String(item.title || "").trim()),
          categories: []
        };
      });
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...defaultBubbleData];
    return parsed.map((item) => {
      const id = item?.id ?? crypto.randomUUID();
      const categories = Array.isArray(item?.categories)
        ? item.categories
        : item?.category
          ? [item.category]
          : [];
      return {
        id,
        title: item?.title ?? "",
        url: `page.html?id=${id}`,
        image: item?.image ?? "",
        imageOnly: Boolean(item?.image && !String(item?.title || "").trim()),
        categories: categories.filter(Boolean)
      };
    });
  } catch (error) {
    return defaultBubbleData.map((item) => {
      const id = crypto.randomUUID();
      return {
        ...item,
        id,
        url: `page.html?id=${id}`,
        imageOnly: Boolean(item.image && !String(item.title || "").trim()),
        categories: []
      };
    });
  }
}

function saveData() {
  items.forEach((item) => {
    if (!item.id) item.id = crypto.randomUUID();
    item.url = `page.html?id=${item.id}`;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items, null, 2));
  countText.textContent = `${items.length} Einträge`;
}

function refreshFromStorage() {
  if (isDirty) return;
  items = loadData();
  render();
}

function loadAbout() {
  try {
    const raw = localStorage.getItem(ABOUT_KEY);
    if (!raw) {
      return {
        title: "Jakob Schlenker",
        body: "",
        image: ""
      };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const intro = parsed.intro ? String(parsed.intro) : "";
    const body = parsed.body ? String(parsed.body) : "";
    const combined = [intro, body].filter(Boolean).join("\n\n");
    return {
      title: parsed.title ?? "Jakob Schlenker",
      body: combined,
      image: parsed.image ?? ""
    };
  } catch (error) {
    return {};
  }
}

function saveAbout() {
  localStorage.setItem(ABOUT_KEY, JSON.stringify(aboutData, null, 2));
}

function loadContact() {
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    if (!raw) {
      return {
        email: ""
      };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return {
      email: parsed.email ?? ""
    };
  } catch (error) {
    return {};
  }
}

function saveContact() {
  localStorage.setItem(CONTACT_KEY, JSON.stringify(contactData, null, 2));
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

function saveSocial() {
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(socialData, null, 2));
}

function setDirty() {
  if (isDirty) return;
  isDirty = true;
  if (saveBtn) saveBtn.style.display = "inline-flex";
  if (statusText) statusText.style.display = "none";
}

function markSaved() {
  isDirty = false;
  if (saveBtn) saveBtn.style.display = "none";
  if (statusText) {
    statusText.style.display = "inline-flex";
    statusText.textContent = "Gespeichert";
  }
}

function commitSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveData();
  saveCategories();
  saveAbout();
  saveContact();
  saveSocial();
  markSaved();
}

function requestSave() {
  setDirty();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    commitSave();
  }, 600);
}

function renderAbout() {
  if (!aboutTitleInput) return;
  aboutTitleInput.value = aboutData.title || "";
  aboutBodyInput.value = aboutData.body || "";
  if (aboutImagePreview) {
    aboutImagePreview.style.backgroundImage = aboutData.image ? `url("${aboutData.image}")` : "";
  }
}

function renderContact() {
  if (contactEmailInput) {
    contactEmailInput.value = contactData.email || "";
  }
}

function renderSocial() {
  if (spotifyInput) spotifyInput.value = socialData.spotify || "";
  if (linkedinInput) linkedinInput.value = socialData.linkedin || "";
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return ["Category"];
    const cleaned = parsed
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    return cleaned.length ? Array.from(new Set(cleaned)) : ["Category"];
  } catch (error) {
    return ["Category"];
  }
}

function saveCategories() {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories, null, 2));
}

function normalizeCategories(list) {
  const cleaned = list
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

function renderCategories() {
  if (!categoryListEl) return;
  categoryListEl.innerHTML = "";
  categories.forEach((category, index) => {
    const item = document.createElement("div");
    item.className = "category-item";

    const input = document.createElement("input");
    input.type = "text";
    input.value = category;
    const original = category;
    input.addEventListener("blur", () => {
      const nextValue = input.value.trim();
      if (!nextValue) {
        input.value = original;
        return;
      }
      categories[index] = nextValue;
      categories = normalizeCategories(categories);
      if (nextValue !== original) {
        items = items.map((item) => ({
          ...item,
          categories: Array.isArray(item.categories)
            ? item.categories.map((entry) => (entry === original ? nextValue : entry))
            : []
        }));
      }
      renderCategories();
      render();
      requestSave();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      categories.splice(index, 1);
      categories = normalizeCategories(categories);
      items = items.map((item) => ({
        ...item,
        categories: Array.isArray(item.categories)
          ? item.categories.filter((entry) => categories.includes(entry))
          : []
      }));
      renderCategories();
      render();
      requestSave();
    });

    item.append(input, removeBtn);
    categoryListEl.appendChild(item);
  });
}

function shouldBeImageOnly(item) {
  return Boolean(item.image && !String(item.title || "").trim());
}

function syncImageOnly(index) {
  items[index].imageOnly = shouldBeImageOnly(items[index]);
}

function slugifyFileName(name) {
  const base = name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "image";
}

function fileExtension(file) {
  const match = /\.([a-z0-9]+)$/i.exec(file.name);
  if (match) return match[1].toLowerCase();
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function saveToImagesFolder(file) {
  if (!window.showDirectoryPicker) return null;
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    if (handle.name !== "images") {
      alert("Bitte den images-Ordner auswählen.");
      return null;
    }

    const base = slugifyFileName(file.name);
    const ext = fileExtension(file);
    const unique = `${base}-${Date.now().toString(36)}.${ext}`;
    const fileHandle = await handle.getFileHandle(unique, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    return `./images/${unique}`;
  } catch (error) {
    return null;
  }
}

function render() {
  listEl.innerHTML = "";
  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.dataset.index = `${index}`;
    row.dataset.id = item.id;

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.textContent = "⠿";
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      handle.setPointerCapture(event.pointerId);
      startSort(row, event);
    });

    const titleInput = document.createElement("input");
    titleInput.value = item.title;
    titleInput.placeholder = "Titel";
    titleInput.addEventListener("input", (event) => {
      items[index].title = event.target.value;
      syncImageOnly(index);
      requestSave();
    });

    const tagField = document.createElement("div");
    tagField.className = "category-tags";

    if (!categories.length) {
      const empty = document.createElement("span");
      empty.className = "category-empty";
      empty.textContent = "Keine Kategorien";
      tagField.appendChild(empty);
    } else {
      const assigned = Array.isArray(item.categories) ? item.categories : [];
      categories.forEach((category) => {
        const tag = document.createElement("button");
        tag.type = "button";
        tag.className = "category-tag";
        tag.textContent = category;
        if (assigned.includes(category)) {
          tag.classList.add("is-active");
        }
        tag.addEventListener("click", () => {
          const current = Array.isArray(items[index].categories) ? [...items[index].categories] : [];
          const exists = current.includes(category);
          items[index].categories = exists ? current.filter((entry) => entry !== category) : [...current, category];
          tag.classList.toggle("is-active", !exists);
          requestSave();
        });
        tagField.appendChild(tag);
      });
    }

    const imageField = document.createElement("div");
    imageField.className = "image-field";

    const imageRow = document.createElement("div");
    imageRow.className = "image-row";

    const preview = document.createElement("div");
    preview.className = "image-preview";

    const updatePreview = (value) => {
      if (!value) {
        preview.style.backgroundImage = "";
        return;
      }
      preview.style.backgroundImage = `url("${value}")`;
    };

    updatePreview(item.image);

    const imageActions = document.createElement("div");
    imageActions.className = "image-actions";

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.textContent = "Upload";

    const cropBtn = document.createElement("button");
    cropBtn.type = "button";
    cropBtn.textContent = "Crop";

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.textContent = "Entfernen";
    clearBtn.className = "delete";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.hidden = true;

    uploadBtn.addEventListener("click", () => {
      if (uploadInFlight) return;
      fileInput.click();
    });

    cropBtn.addEventListener("click", () => {
      openCropper(index);
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      uploadInFlight = true;
      setDirty();

      const savedUrl = await saveToImagesFolder(file);
      if (savedUrl) {
        items[index].image = savedUrl;
        updatePreview(savedUrl);
        syncImageOnly(index);
        requestSave();
        uploadInFlight = false;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        items[index].image = reader.result;
        updatePreview(reader.result);
        syncImageOnly(index);
        requestSave();
        uploadInFlight = false;
      };
      reader.readAsDataURL(file);
    });

    clearBtn.addEventListener("click", () => {
      items[index].image = "";
      syncImageOnly(index);
      updatePreview("");
      requestSave();
    });

    imageActions.append(uploadBtn, cropBtn, clearBtn);
    imageRow.append(preview);
    imageField.append(imageRow, imageActions, fileInput);

    const actions = document.createElement("div");
    actions.className = "row-actions";

    const contentBtn = document.createElement("button");
    contentBtn.textContent = "Inhalt bearbeiten";
    contentBtn.addEventListener("click", () => {
      window.open(`page-editor.html?id=${encodeURIComponent(item.id)}`, "_blank");
    });

    const openPageBtn = document.createElement("button");
    openPageBtn.textContent = "Seite öffnen";
    openPageBtn.addEventListener("click", () => {
      const fallback = `page.html?id=${encodeURIComponent(item.id)}`;
      const target = (items[index].url || "").trim() || fallback;
      window.open(target, "_blank");
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Löschen";
    deleteBtn.className = "delete";
    deleteBtn.addEventListener("click", () => {
      items.splice(index, 1);
      render();
      requestSave();
    });

    actions.append(contentBtn, openPageBtn, deleteBtn);
    row.append(handle, titleInput, tagField, imageField, actions);
    listEl.appendChild(row);
  });

  countText.textContent = `${items.length} Einträge`;
}

function moveTo(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const [item] = items.splice(fromIndex, 1);
  const target = fromIndex < toIndex ? toIndex - 1 : toIndex;
  items.splice(target, 0, item);
  render();
  requestSave();
}

addBtn.addEventListener("click", () => {
  items.push({ id: crypto.randomUUID(), title: "", url: "", image: "", imageOnly: false, categories: [] });
  render();
  requestSave();
});

render();
renderCategories();
renderAbout();
renderContact();
renderSocial();
commitSave();

if (openSiteBtn) {
  openSiteBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

if (aboutOpenBtn) {
  aboutOpenBtn.addEventListener("click", () => {
    window.location.href = "about.html";
  });
}

if (aboutEditBtn) {
  aboutEditBtn.addEventListener("click", () => {
    const panel = document.querySelector(".about-panel");
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    aboutTitleInput?.focus();
  });
}

if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    commitSave();
  });
}

if (addCategoryBtn) {
  addCategoryBtn.addEventListener("click", () => {
    const value = (categoryInput?.value || "").trim();
    if (!value) return;
    categories = normalizeCategories([...categories, value]);
    categoryInput.value = "";
    renderCategories();
    render();
    requestSave();
  });
}

if (categoryInput) {
  categoryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCategoryBtn?.click();
    }
  });
}

if (aboutTitleInput) {
  aboutTitleInput.addEventListener("input", (event) => {
    aboutData.title = event.target.value;
    requestSave();
  });
  aboutBodyInput.addEventListener("input", (event) => {
    aboutData.body = event.target.value;
    requestSave();
  });
}

if (contactEmailInput) {
  contactEmailInput.addEventListener("input", (event) => {
    contactData.email = event.target.value;
    requestSave();
  });
}

if (spotifyInput) {
  spotifyInput.addEventListener("input", (event) => {
    socialData.spotify = event.target.value.trim();
    requestSave();
  });
}

if (linkedinInput) {
  linkedinInput.addEventListener("input", (event) => {
    socialData.linkedin = event.target.value.trim();
    requestSave();
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

function updateSocialHint(inputEl, hintEl) {
  if (!inputEl || !hintEl) return;
  const value = inputEl.value.trim();
  hintEl.classList.remove("is-error", "is-ok");
  if (!value) {
    hintEl.textContent = "";
    return;
  }
  const normalized = normalizeUrl(value);
  if (isValidUrl(normalized)) {
    hintEl.textContent = "URL sieht gut aus";
    hintEl.classList.add("is-ok");
  } else {
    hintEl.textContent = "Ungültige URL";
    hintEl.classList.add("is-error");
  }
}

if (checkSpotifyBtn) {
  checkSpotifyBtn.addEventListener("click", () => {
    const url = normalizeUrl(spotifyInput?.value.trim());
    if (!url) return;
    if (!isValidUrl(url)) {
      updateSocialHint(spotifyInput, spotifyHint);
      return;
    }
    window.open(url, "_blank", "noopener");
  });
}

if (checkLinkedinBtn) {
  checkLinkedinBtn.addEventListener("click", () => {
    const url = normalizeUrl(linkedinInput?.value.trim());
    if (!url) return;
    if (!isValidUrl(url)) {
      updateSocialHint(linkedinInput, linkedinHint);
      return;
    }
    window.open(url, "_blank", "noopener");
  });
}

if (spotifyInput) {
  spotifyInput.addEventListener("blur", () => updateSocialHint(spotifyInput, spotifyHint));
}

if (linkedinInput) {
  linkedinInput.addEventListener("blur", () => updateSocialHint(linkedinInput, linkedinHint));
}

if (aboutUploadBtn && aboutFileInput) {
  aboutUploadBtn.addEventListener("click", () => {
    if (uploadInFlight) return;
    aboutFileInput.click();
  });
  aboutFileInput.addEventListener("change", async () => {
    const file = aboutFileInput.files[0];
    if (!file) return;
    uploadInFlight = true;
    const savedUrl = await saveToImagesFolder(file);
    if (savedUrl) {
      aboutData.image = savedUrl;
      aboutImagePreview.style.backgroundImage = `url("${savedUrl}")`;
      requestSave();
      uploadInFlight = false;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      aboutData.image = reader.result;
      aboutImagePreview.style.backgroundImage = `url("${reader.result}")`;
      requestSave();
      uploadInFlight = false;
    };
    reader.readAsDataURL(file);
  });
}

if (aboutClearBtn) {
  aboutClearBtn.addEventListener("click", () => {
    aboutData.image = "";
    if (aboutImagePreview) aboutImagePreview.style.backgroundImage = "";
    requestSave();
  });
}

function openCropper(index) {
  const source = items[index]?.image;
  if (!source) {
    alert("Bitte zuerst ein Bild setzen.");
    return;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    cropState = {
      index,
      img,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      minScale: 1,
      scale: 1,
      frameW: 0,
      frameH: 0,
      dragging: false,
      startX: 0,
      startY: 0,
      startOffsetX: 0,
      startOffsetY: 0
    };
    cropImage.src = source;
    cropZoom.value = "1";
    cropModal.classList.add("is-open");
    cropModal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      const rect = cropFrame.getBoundingClientRect();
      cropState.frameW = rect.width;
      cropState.frameH = rect.height;
      cropState.minScale = Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
      cropState.scale = cropState.minScale;
      updateCropTransform();
    });
  };
  img.onerror = () => {
    alert("Bild konnte nicht geladen werden (CORS?). Bitte lokal hochladen.");
  };
  img.src = source;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateCropTransform() {
  if (!cropState) return;
  const { img, frameW, frameH } = cropState;
  const scale = cropState.scale;
  const dispW = img.naturalWidth * scale;
  const dispH = img.naturalHeight * scale;
  const minOffsetX = (frameW - dispW) / 2;
  const maxOffsetX = (dispW - frameW) / 2;
  const minOffsetY = (frameH - dispH) / 2;
  const maxOffsetY = (dispH - frameH) / 2;
  cropState.offsetX = clamp(cropState.offsetX, minOffsetX, maxOffsetX);
  cropState.offsetY = clamp(cropState.offsetY, minOffsetY, maxOffsetY);
  cropImage.style.transform = `translate(-50%, -50%) translate(${cropState.offsetX}px, ${cropState.offsetY}px) scale(${scale})`;
}

cropZoom.addEventListener("input", (event) => {
  if (!cropState) return;
  const zoom = Number(event.target.value);
  cropState.zoom = zoom;
  cropState.scale = cropState.minScale * zoom;
  updateCropTransform();
});

cropFrame.addEventListener("pointerdown", (event) => {
  if (!cropState) return;
  cropState.dragging = true;
  cropState.startX = event.clientX;
  cropState.startY = event.clientY;
  cropState.startOffsetX = cropState.offsetX;
  cropState.startOffsetY = cropState.offsetY;
  cropFrame.setPointerCapture(event.pointerId);
});

cropFrame.addEventListener("pointermove", (event) => {
  if (!cropState || !cropState.dragging) return;
  const dx = event.clientX - cropState.startX;
  const dy = event.clientY - cropState.startY;
  cropState.offsetX = cropState.startOffsetX + dx;
  cropState.offsetY = cropState.startOffsetY + dy;
  updateCropTransform();
});

cropFrame.addEventListener("pointerup", (event) => {
  if (!cropState) return;
  cropState.dragging = false;
  cropFrame.releasePointerCapture(event.pointerId);
});

cropFrame.addEventListener("pointercancel", (event) => {
  if (!cropState) return;
  cropState.dragging = false;
  cropFrame.releasePointerCapture(event.pointerId);
});

function closeCropper() {
  cropModal.classList.remove("is-open");
  cropModal.setAttribute("aria-hidden", "true");
  cropState = null;
}

cropCancel.addEventListener("click", closeCropper);
cropClose.addEventListener("click", closeCropper);

cropApply.addEventListener("click", () => {
  if (!cropState) return;
  const { img, frameW, frameH, scale, offsetX, offsetY, index } = cropState;
  const dispW = img.naturalWidth * scale;
  const dispH = img.naturalHeight * scale;
  const x0 = (frameW - dispW) / 2 + offsetX;
  const y0 = (frameH - dispH) / 2 + offsetY;
  const sx = Math.max(0, -x0 / scale);
  const sy = Math.max(0, -y0 / scale);
  const sw = Math.min(img.naturalWidth, frameW / scale);
  const sh = Math.min(img.naturalHeight, frameH / scale);

  const outputW = 1200;
  const outputH = Math.round(outputW / 1.7);
  const canvas = document.createElement("canvas");
  canvas.width = outputW;
  canvas.height = outputH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputW, outputH);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  items[index].image = dataUrl;
  requestSave();
  render();
  closeCropper();
});
