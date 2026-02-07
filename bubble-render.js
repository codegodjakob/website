(function initBubbleRender(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.BubbleRender = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createBubbleRender() {
  function setMeasureFont(measureCtx, fontSize, fontStack) {
    measureCtx.font = `500 ${fontSize}px ${fontStack}`;
  }

  function measureTextWidth(measureCtx, text, fontSize, fontStack) {
    setMeasureFont(measureCtx, fontSize, fontStack);
    return measureCtx.measureText(text).width;
  }

  function wrapText(measureCtx, text, maxWidth, fontSize, fontStack) {
    setMeasureFont(measureCtx, fontSize, fontStack);
    const words = text.trim().split(/\s+/);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      if (measureCtx.measureText(testLine).width <= maxWidth) {
        line = testLine;
        return;
      }

      if (line) {
        lines.push(line);
      }

      if (measureCtx.measureText(word).width > maxWidth) {
        let chunk = "";
        for (const char of word) {
          const next = chunk + char;
          if (measureCtx.measureText(next).width <= maxWidth) {
            chunk = next;
          } else {
            if (chunk) lines.push(chunk);
            chunk = char;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    });

    if (line) lines.push(line);
    return lines.length ? lines : [text];
  }

  function layoutBubble(options) {
    const {
      bubble,
      measureCtx,
      fontStack,
      clamp,
      safeWidthForY,
      randomInRange
    } = options;
    const effectiveFont = bubble.baseFont * (bubble.textFontScale || 1);
    const lineHeight = effectiveFont * (bubble.image ? 1.12 : 1.08);
    const minHeight = bubble.image ? effectiveFont * 1.4 : effectiveFont * 2.2;

    if (bubble.image) {
      const aspect = 1.7;
      let imageHeight = bubble.imageHeight;
      const minRatio = 1.3;
      let imageWidth = imageHeight * aspect;
      let maxWidth = imageWidth;
      let lines = [];
      let textHeight = 0;
      let baseHeight = 0;
      let baseWidth = 0;
      let safeTextWidth = maxWidth;

      if (bubble.imageOnly) {
        baseWidth = imageWidth + bubble.padX * 2;
        baseHeight = imageHeight + bubble.padY * 2;
        const minWidth = baseHeight * minRatio;
        if (baseWidth < minWidth) {
          imageWidth = minWidth - bubble.padX * 2;
          imageHeight = imageWidth / aspect;
          baseWidth = imageWidth + bubble.padX * 2;
          baseHeight = imageHeight + bubble.padY * 2;
        }

        bubble.textLines = [];
        bubble.baseHeight = baseHeight;
        bubble.baseWidth = baseWidth;
        bubble.imageHeight = imageHeight;
        bubble.textWidth = 0;
        bubble.textHeight = 0;
      } else {
        const overlayPadBottom = bubble.textPadBottom || 0;
        const overlayPadTop = Math.max(bubble.baseFont * 0.6, bubble.inset * 0.6);

        for (let pass = 0; pass < 3; pass += 1) {
          lines = wrapText(measureCtx, bubble.title, maxWidth, effectiveFont, fontStack);
          textHeight = lines.length * lineHeight + effectiveFont * 0.15;

          imageHeight = Math.max(bubble.imageHeight, textHeight + overlayPadBottom + overlayPadTop);
          imageWidth = imageHeight * aspect;

          baseHeight = Math.max(imageHeight + bubble.padY * 2, minHeight + bubble.padY * 2);
          baseWidth = imageWidth + bubble.padX * 2;

          const minWidth = baseHeight * minRatio;
          if (baseWidth < minWidth) {
            imageWidth = minWidth - bubble.padX * 2;
            imageHeight = imageWidth / aspect;
            if (imageHeight < textHeight + overlayPadBottom + overlayPadTop) {
              imageHeight = textHeight + overlayPadBottom + overlayPadTop;
              imageWidth = imageHeight * aspect;
            }
            baseWidth = imageWidth + bubble.padX * 2;
            baseHeight = imageHeight + bubble.padY * 2;
          }

          const innerWidth = baseWidth - bubble.padX * 2;
          const innerHeight = baseHeight - bubble.padY * 2;
          const minSideLoop = Math.min(baseWidth, baseHeight);
          const maxSideLoop = Math.max(baseWidth, baseHeight);
          const aspectLoop = maxSideLoop > 0 ? minSideLoop / maxSideLoop : 1;
          const radiusBase = 0.195;
          const radiusSpan = 0.125;
          const radiusScaleLoop = radiusBase + radiusSpan * aspectLoop;
          const cornerRadius = clamp(minSideLoop * radiusScaleLoop, 17, minSideLoop * 0.5);
          const innerRadius = Math.max(cornerRadius - bubble.inset, 0);
          const textBottom = innerHeight - overlayPadBottom;
          const safeWidth = safeWidthForY(innerWidth, innerHeight, innerRadius, textBottom);
          const rawMaxWidth = Math.min(innerWidth, safeWidth);
          const buffer = Math.max(effectiveFont * 0.28, bubble.inset * 0.25);
          const safeBlockWidth = Math.max(rawMaxWidth - buffer, effectiveFont * 4);
          const contentMaxWidth = Math.max(safeBlockWidth - bubble.textPadX * 2, effectiveFont * 3.2);
          const nextMaxWidth = contentMaxWidth;

          if (Math.abs(nextMaxWidth - maxWidth) > 1) {
            maxWidth = nextMaxWidth;
            continue;
          }

          safeTextWidth = safeBlockWidth;
          break;
        }

        bubble.textLines = lines;
        bubble.baseHeight = baseHeight;
        bubble.baseWidth = baseWidth;
        bubble.imageHeight = imageHeight;
        bubble.textWidth = safeTextWidth;
        bubble.textHeight = textHeight;
      }
    } else {
      let maxWidth = bubble.maxTextWidth;
      let lines = wrapText(measureCtx, bubble.title, maxWidth, effectiveFont, fontStack);
      let textWidth =
        Math.max(...lines.map((line) => measureTextWidth(measureCtx, line, effectiveFont, fontStack))) +
        effectiveFont * 0.15;
      let textHeight = lines.length * lineHeight + effectiveFont * 0.05;

      let baseHeight = Math.max(textHeight + bubble.padY * 2, minHeight + bubble.padY * 2);
      let baseWidth = Math.max(textWidth + bubble.padX * 2, baseHeight * 1.5);

      const availableWidth = baseWidth - bubble.padX * 2;
      if (availableWidth > maxWidth + effectiveFont * 0.5) {
        maxWidth = availableWidth;
        lines = wrapText(measureCtx, bubble.title, maxWidth, effectiveFont, fontStack);
        textWidth =
          Math.max(...lines.map((line) => measureTextWidth(measureCtx, line, effectiveFont, fontStack))) +
          effectiveFont * 0.15;
        textHeight = lines.length * lineHeight + effectiveFont * 0.05;
        baseHeight = Math.max(textHeight + bubble.padY * 2, minHeight + bubble.padY * 2);
        baseWidth = Math.max(textWidth + bubble.padX * 2, baseHeight * 1.5);
      }

      bubble.textLines = lines;
      bubble.textWidth = baseWidth - bubble.padX * 2;
      bubble.textHeight = textHeight;
      bubble.baseHeight = baseHeight;
      bubble.baseWidth = baseWidth;
    }

    const minSide = Math.min(bubble.baseWidth, bubble.baseHeight);
    const maxSide = Math.max(bubble.baseWidth, bubble.baseHeight);
    const aspect = maxSide > 0 ? minSide / maxSide : 1;
    const radiusBase = bubble.image ? 0.195 : 0.285;
    const radiusSpan = bubble.image ? 0.125 : 0.195;
    const minRadius = bubble.image ? 14 : 22;
    const radiusScale = radiusBase + radiusSpan * aspect;
    bubble.cornerRadius = clamp(minSide * radiusScale, minRadius, minSide * 0.5);
    bubble.baseRadius = Math.max(bubble.baseWidth, bubble.baseHeight) * 0.5;
    if (bubble.image) {
      const maxCorner = bubble.inset + bubble.imageHeight * 0.5 - 1;
      if (maxCorner > 0) {
        bubble.cornerRadius = Math.min(bubble.cornerRadius, maxCorner);
      }
      bubble.imageRadius = Math.max(bubble.cornerRadius - bubble.inset, 0);
    }

    // tiny variance keeps same-shape bubbles from feeling synthetic.
    bubble.cornerRadius += randomInRange(-0.15, 0.15);
  }

  return {
    setMeasureFont,
    measureTextWidth,
    wrapText,
    layoutBubble
  };
});
