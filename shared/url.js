(function initSharedUrl(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.SiteShared = root.SiteShared || {};
  root.SiteShared.url = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSharedUrl() {
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

  return {
    normalizeUrl,
    isValidUrl,
    toEmbedUrl
  };
});
