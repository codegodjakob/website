const shared = window.SiteShared || {};
const constants = shared.constants || {};
const storageUtils = shared.storage || {};
const urlUtils = shared.url || {};

if (typeof storageUtils.migrateState === "function") {
  storageUtils.migrateState(localStorage, constants);
}

const DATA_KEY = constants.STORAGE_KEYS?.DATA || "bubble-data";
const PAGE_KEY = constants.STORAGE_KEYS?.PAGES || "bubble-pages";
const CATEGORY_KEY = constants.STORAGE_KEYS?.CATEGORIES || "bubble-categories";
const toEmbedUrl = urlUtils.toEmbedUrl || ((value) => value || "");

const titleField = document.getElementById("field-title");
const categoryField = document.getElementById("field-category");
const categoryOptions = document.getElementById("category-options");
const statusText = document.getElementById("status-text");
const saveBtn = document.getElementById("save-btn");
const openPage = document.getElementById("open-page");
const sectionList = document.getElementById("section-list");
const addSectionBtn = document.getElementById("add-section");
const addSectionType = document.getElementById("add-section-type");

const params = new URLSearchParams(window.location.search);
const pageId = params.get("id");
let isDirty = false;
let saveTimer = null;
let sections = [];
let dragState = null;
let remoteSyncInFlight = false;

async function pullRemoteState() {
  if (!window.SiteStateSync) return;
  await window.SiteStateSync.pull();
}

async function pushRemoteState() {
  if (!window.SiteStateSync || remoteSyncInFlight) return;
  let token = window.SiteStateSync.getAdminToken();
  if (!token) {
    token = window.prompt("Admin Sync Token für Live-Speicherung eingeben:");
    token = window.SiteStateSync.setAdminToken(token);
  }
  if (!token) return;

  remoteSyncInFlight = true;
  try {
    const result = await window.SiteStateSync.push(window.SiteStateSync.collectLocalState(), token);
    if (!result?.ok) {
      console.warn("Live-Sync fehlgeschlagen", result?.error || result);
    }
  } finally {
    remoteSyncInFlight = false;
  }
}

function loadBubbles() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function loadPages() {
  try {
    const raw = localStorage.getItem(PAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveBubbles(bubbles) {
  localStorage.setItem(DATA_KEY, JSON.stringify(bubbles, null, 2));
}

function savePages(pages) {
  localStorage.setItem(PAGE_KEY, JSON.stringify(pages, null, 2));
}

function slugifyFileName(name) {
  const base = name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "media";
}

function fileExtension(file) {
  const match = /\.([a-z0-9]+)$/i.exec(file.name);
  if (match) return match[1].toLowerCase();
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "video/mp4") return "mp4";
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

function setDirty() {
  if (isDirty) return;
  isDirty = true;
  if (saveBtn) saveBtn.style.display = "inline-flex";
  if (statusText) statusText.textContent = "Nicht gespeichert";
}

function markSaved() {
  isDirty = false;
  if (saveBtn) saveBtn.style.display = "none";
  if (statusText) {
    statusText.textContent = "Gespeichert";
    statusText.classList.add("is-saved");
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      statusText.classList.remove("is-saved");
    }, 1200);
  }
}

function normalizedCategoryList() {
  const value = categoryField.value.trim();
  if (!value || value.toLowerCase() === "category") return [];
  return [value];
}

function ensureBubbleRecord(bubbles) {
  const id = typeof pageId === "string" ? pageId.trim() : "";
  if (!id) return -1;
  const currentIndex = bubbles.findIndex((item) => item?.id === id);
  if (currentIndex >= 0) return currentIndex;

  bubbles.push({
    id,
    title: titleField.value.trim(),
    url: `page.html?id=${encodeURIComponent(id)}`,
    image: "",
    enabled: true,
    imageOnly: false,
    categories: normalizedCategoryList()
  });
  return bubbles.length - 1;
}

function commitSave() {
  const bubbles = loadBubbles();
  const bubbleIndex = ensureBubbleRecord(bubbles);
  const title = titleField.value.trim();
  const categoryList = normalizedCategoryList();
  if (bubbleIndex >= 0) {
    const existing = bubbles[bubbleIndex] || {};
    const image = typeof existing.image === "string" ? existing.image : "";
    bubbles[bubbleIndex] = {
      ...existing,
      id: pageId,
      title,
      url: `page.html?id=${encodeURIComponent(pageId)}`,
      image,
      imageOnly: Boolean(image && !title),
      enabled: typeof existing.enabled === "undefined" ? true : existing.enabled,
      categories: categoryList
    };
    saveBubbles(bubbles);
  }

  const pages = loadPages();
  pages[pageId] = {
    title,
    category: categoryList[0] || "",
    sections
  };
  savePages(pages);
  markSaved();
  void pushRemoteState();
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => String(entry || "").trim()).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function renderCategoryOptions() {
  if (!categoryOptions) return;
  const categories = loadCategories();
  categoryOptions.innerHTML = "";
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    categoryOptions.appendChild(option);
  });
}

function createSection(type) {
  return {
    id: crypto.randomUUID(),
    type,
    text: "",
    media: []
  };
}

function sectionHasText(type) {
  return type === "text" || type === "split-text-media" || type === "split-media-text";
}

function sectionHasMedia(type) {
  return type !== "text";
}

function mediaLimit(type) {
  if (type === "media-duo") return 2;
  if (type === "media-full" || type === "media-bleed") return 1;
  return 6;
}

function renderSections() {
  if (!sectionList) return;
  sectionList.innerHTML = "";

  sections.forEach((section) => {
    const card = document.createElement("div");
    card.className = "section-card";
    card.dataset.id = section.id;

    const bar = document.createElement("div");
    bar.className = "section-bar";

    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "section-handle";
    handle.textContent = "⋮⋮";
    handle.addEventListener("pointerdown", (event) => startSort(card, event));

    const typeSelect = document.createElement("select");
    typeSelect.innerHTML = `
      <option value="text">Text (volle Breite)</option>
      <option value="split-text-media">Text links / Media rechts</option>
      <option value="split-media-text">Media links / Text rechts</option>
      <option value="media-full">Media (volle Breite)</option>
      <option value="media-grid">Media Grid</option>
      <option value="media-duo">Doppelbild nebeneinander</option>
      <option value="media-bleed">Full-Bleed Media</option>
    `;
    typeSelect.value = section.type;
    typeSelect.addEventListener("change", (event) => {
      section.type = event.target.value;
      if (!sectionHasText(section.type)) section.text = "";
      if (!sectionHasMedia(section.type)) section.media = [];
      if (section.media.length > mediaLimit(section.type)) {
        section.media = section.media.slice(0, mediaLimit(section.type));
      }
      setDirty();
      renderSections();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "section-remove";
    removeBtn.textContent = "Entfernen";
    removeBtn.addEventListener("click", () => {
      sections = sections.filter((item) => item.id !== section.id);
      setDirty();
      renderSections();
    });

    bar.append(handle, typeSelect, removeBtn);

    const fields = document.createElement("div");
    fields.className = "section-fields";

    if (sectionHasText(section.type)) {
      const textArea = document.createElement("textarea");
      textArea.placeholder = "Text für diese Section";
      textArea.value = section.text || "";
      textArea.addEventListener("input", (event) => {
        section.text = event.target.value;
        setDirty();
      });
      fields.appendChild(textArea);
    }

    if (sectionHasMedia(section.type)) {
      const mediaList = document.createElement("div");
      mediaList.className = "media-list";

      section.media.forEach((media) => {
        const row = document.createElement("div");
        row.className = "media-row";

        const preview = document.createElement("div");
        preview.className = "media-preview";
        if (media.kind === "image" && media.src) {
          const img = document.createElement("img");
          img.src = media.src;
          img.alt = "";
          preview.appendChild(img);
        } else if (media.kind === "video" && media.src) {
          const vid = document.createElement("video");
          vid.src = media.src;
          vid.muted = true;
          vid.playsInline = true;
          preview.appendChild(vid);
        } else if (media.kind === "embed" && media.src) {
          const frame = document.createElement("iframe");
          frame.src = toEmbedUrl(media.src);
          frame.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
          preview.appendChild(frame);
        } else {
          preview.textContent = "Vorschau";
        }

        const controls = document.createElement("div");
        controls.className = "media-controls";
        const kindSelect = document.createElement("select");
        kindSelect.innerHTML = `
          <option value="image">Bild</option>
          <option value="video">Video (MP4)</option>
          <option value="embed">YouTube/Vimeo</option>
        `;
        kindSelect.value = media.kind || "image";
        kindSelect.addEventListener("change", (event) => {
          media.kind = event.target.value;
          setDirty();
          renderSections();
        });

        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.placeholder = "URL oder Embed";
        urlInput.value = media.src || "";
        urlInput.addEventListener("input", (event) => {
          media.src = event.target.value.trim();
          setDirty();
        });

        controls.append(kindSelect, urlInput);

        const actions = document.createElement("div");
        actions.className = "media-actions";

        const uploadBtn = document.createElement("button");
        uploadBtn.type = "button";
        uploadBtn.textContent = "Upload";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.hidden = true;
        fileInput.accept =
          media.kind === "video" ? "video/mp4" : media.kind === "image" ? "image/*" : "";

        uploadBtn.disabled = media.kind === "embed";
        uploadBtn.addEventListener("click", () => {
          if (media.kind === "embed") return;
          fileInput.click();
        });

        fileInput.addEventListener("change", async () => {
          const file = fileInput.files[0];
          if (!file) return;
          setDirty();
          const savedUrl = await saveToImagesFolder(file);
          if (savedUrl) {
            media.src = savedUrl;
            setDirty();
            renderSections();
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            media.src = reader.result;
            setDirty();
            renderSections();
          };
          reader.readAsDataURL(file);
        });

        const removeBtnMedia = document.createElement("button");
        removeBtnMedia.type = "button";
        removeBtnMedia.className = "remove";
        removeBtnMedia.textContent = "Entfernen";
        removeBtnMedia.addEventListener("click", () => {
          section.media = section.media.filter((item) => item.id !== media.id);
          setDirty();
          renderSections();
        });

        actions.append(uploadBtn, removeBtnMedia, fileInput);

        row.append(preview, controls, actions);
        mediaList.appendChild(row);
      });

      const addMediaBtn = document.createElement("button");
      addMediaBtn.type = "button";
      addMediaBtn.className = "media-add";
      addMediaBtn.textContent = "Medium hinzufügen";
      const limit = mediaLimit(section.type);
      if (section.media.length >= limit) {
        addMediaBtn.disabled = true;
      }
      addMediaBtn.addEventListener("click", () => {
        if (section.media.length >= limit) return;
        section.media.push({
          id: crypto.randomUUID(),
          kind: "image",
          src: ""
        });
        setDirty();
        renderSections();
      });

      fields.append(mediaList, addMediaBtn);
    }

    card.append(bar, fields);
    sectionList.appendChild(card);
  });
}

function startSort(card, event) {
  dragState = {
    card,
    startY: event.clientY,
    pointerId: event.pointerId
  };
  card.classList.add("dragging");
  card.style.zIndex = "2";
  card.style.position = "relative";
  card.style.pointerEvents = "none";
  document.body.classList.add("is-sorting");
  card.setPointerCapture(event.pointerId);
}

function handleSortMove(event) {
  if (!dragState) return;
  const { card, startY } = dragState;
  const dy = event.clientY - startY;
  card.style.transform = `translateY(${dy}px)`;

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".section-card");
  if (!target || target === card || target.parentElement !== sectionList) return;

  const rect = target.getBoundingClientRect();
  const insertAfter = event.clientY > rect.top + rect.height / 2;
  if (insertAfter) {
    sectionList.insertBefore(card, target.nextSibling);
  } else {
    sectionList.insertBefore(card, target);
  }
}

function endSort() {
  if (!dragState) return;
  const { card } = dragState;
  card.classList.remove("dragging");
  card.style.transform = "";
  card.style.zIndex = "";
  card.style.position = "";
  card.style.pointerEvents = "";
  document.body.classList.remove("is-sorting");
  card.releasePointerCapture(dragState.pointerId);
  dragState = null;

  const order = Array.from(sectionList.querySelectorAll(".section-card")).map((node) => node.dataset.id);
  sections.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  setDirty();
}

window.addEventListener("pointermove", handleSortMove);
window.addEventListener("pointerup", endSort);
window.addEventListener("pointercancel", endSort);

function init() {
  if (!pageId) {
    statusText.textContent = "Kein Eintrag gewählt.";
    saveBtn.disabled = true;
    return;
  }

  openPage.href = `page.html?id=${encodeURIComponent(pageId)}`;

  const bubbles = loadBubbles();
  const bubble = bubbles.find((item) => item.id === pageId);
  const bubbleCategories = Array.isArray(bubble?.categories) ? bubble.categories : [];
  const legacyCategory = typeof bubble?.category === "string" ? bubble.category.trim() : "";
  const bubbleCategoryList = bubbleCategories.length
    ? bubbleCategories
    : legacyCategory && legacyCategory.toLowerCase() !== "category"
      ? [legacyCategory]
      : [];

  const pages = loadPages();
  const page = pages[pageId] || {};

  const storedCategory = typeof page?.category === "string" ? page.category.trim() : "";
  const safeCategory =
    storedCategory && storedCategory.toLowerCase() !== "category" ? storedCategory : "";

  titleField.value = bubble?.title || page.title || "";
  categoryField.value = safeCategory || bubbleCategoryList[0] || "";
  const storedSections = Array.isArray(page?.sections) ? page.sections : [];
  if (storedSections.length) {
    sections = storedSections.map((section) => ({
      id: section.id || crypto.randomUUID(),
      type: section.type || "text",
      text: section.text || "",
      media: Array.isArray(section.media)
        ? section.media.map((media) => ({
            id: media.id || crypto.randomUUID(),
            kind: media.kind || "image",
            src: media.src || ""
          }))
        : []
    }));
  } else {
    sections = [];
    if (page.hero || bubble?.image) {
      sections.push({
        id: crypto.randomUUID(),
        type: "media-full",
        text: "",
        media: [
          {
            id: crypto.randomUUID(),
            kind: "image",
            src: page.hero || bubble?.image || ""
          }
        ]
      });
    }
    if (page.body) {
      sections.push({
        id: crypto.randomUUID(),
        type: "text",
        text: page.body,
        media: []
      });
    }
    if (!sections.length) {
      sections.push(createSection("text"));
    }
  }
  renderCategoryOptions();
  renderSections();
  markSaved();
}

saveBtn.addEventListener("click", () => {
  commitSave();
});

titleField.addEventListener("input", setDirty);
categoryField.addEventListener("input", setDirty);
if (addSectionBtn) {
  addSectionBtn.addEventListener("click", () => {
    const type = addSectionType?.value || "text";
    sections.push(createSection(type));
    setDirty();
    renderSections();
  });
}

async function bootstrap() {
  await pullRemoteState();
  init();
}

void bootstrap();
