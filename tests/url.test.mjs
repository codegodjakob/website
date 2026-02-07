import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";

const require = createRequire(import.meta.url);
const { normalizeUrl, isValidUrl, toEmbedUrl } = require("../shared/url.js");

describe("shared/url", () => {
  it("normalizes missing protocol", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("validates URLs", () => {
    expect(isValidUrl("https://example.com/path")).toBe(true);
    expect(isValidUrl("not-a-url")).toBe(false);
  });

  it("converts YouTube and Vimeo links to embeds", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/embed/abc123");
    expect(toEmbedUrl("https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456");
  });
});
