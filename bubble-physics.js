(function initBubblePhysics(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.BubblePhysics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createBubblePhysics() {
  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomCenterBiased(min, max, strength = 0.35) {
    const t = Math.random();
    const eased = 0.5 + (t - 0.5) * (1 - strength);
    return min + eased * (max - min);
  }

  function computeSmallness(bubble) {
    const s = bubble.sizeFactor;
    const minS = 0.84;
    const maxS = 1.2;
    const t = (maxS - s) / (maxS - minS);
    return Math.min(Math.max(t, 0), 1);
  }

  function safeWidthForY(innerWidth, innerHeight, radius, y) {
    const topFadeStart = innerHeight * 0.36;
    const topFadeEnd = innerHeight * 0.05;
    if (y >= topFadeStart) return innerWidth;
    if (y <= topFadeEnd) return innerWidth * 0.28;
    const t = (y - topFadeEnd) / (topFadeStart - topFadeEnd);
    return innerWidth * (0.28 + 0.72 * t);
  }

  function setWanderTarget(state, bubble) {
    const { left, right, top, bottom } = state.bounds;
    const xStrength = bubble.image ? 0.32 : 0.24;
    const yStrength = bubble.image ? 0.38 : 0.3;
    const widthY = safeWidthForY(state.width - left * 2, state.height, bubble.radius, bubble.y);
    const yTarget = randomCenterBiased(top, bottom, yStrength);
    const halfWidth = widthY * 0.5;
    const minX = Math.max(left, state.width * 0.5 - halfWidth);
    const maxX = Math.min(right, state.width * 0.5 + halfWidth);
    bubble.wanderX = randomCenterBiased(minX, maxX, xStrength);
    bubble.wanderY = yTarget;
    bubble.wanderTimer = randomInRange(4.8, 9.2);
  }

  function isOverlapping(a, b, extraGap = 110) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.hypot(dx, dy);
    const minDist = a.baseRadius + b.baseRadius + extraGap;
    return distance < minDist;
  }

  function findExitTarget(state, bubble) {
    const { left, right, top, bottom } = state.bounds;
    let best = { x: bubble.x, y: bubble.y, score: -Infinity };
    const samples = 30;
    const edgeBand = Math.min(Math.max(state.minDim * 0.06, 18), 64);
    const edgeInset = bubble.radius + Math.max(6, edgeBand * 0.2);

    for (let i = 0; i < samples; i += 1) {
      const edgePick = Math.random();
      let x = randomInRange(left, right);
      let y = randomInRange(top, bottom);

      if (edgePick < 0.25) {
        x = randomInRange(left + edgeInset, Math.min(left + edgeInset + edgeBand, right - edgeInset));
        y = randomInRange(top + edgeInset, bottom - edgeInset);
      } else if (edgePick < 0.5) {
        x = randomInRange(Math.max(right - edgeInset - edgeBand, left + edgeInset), right - edgeInset);
        y = randomInRange(top + edgeInset, bottom - edgeInset);
      } else if (edgePick < 0.75) {
        x = randomInRange(left + edgeInset, right - edgeInset);
        y = randomInRange(top + edgeInset, Math.min(top + edgeInset + edgeBand, bottom - edgeInset));
      } else {
        x = randomInRange(left + edgeInset, right - edgeInset);
        y = randomInRange(Math.max(bottom - edgeInset - edgeBand, top + edgeInset), bottom - edgeInset);
      }
      let minDistance = Infinity;

      for (const other of state.bubbles) {
        if (other === bubble) continue;
        if (other.lifeState === "exiting") continue;
        const dx = x - other.x;
        const dy = y - other.y;
        const distance = Math.hypot(dx, dy) - other.radius;
        if (distance < minDistance) {
          minDistance = distance;
        }
      }

      if (minDistance > best.score) {
        best = { x, y, score: minDistance };
      }
    }

    return best;
  }

  function updateBounds(state, clamp) {
    const margin = clamp(state.minDim * 0.05, 24, 64);
    state.bounds.margin = margin;
    state.bounds.left = margin;
    state.bounds.right = state.width - margin;
    state.bounds.top = state.height * 0.12 + margin * 0.25;
    state.bounds.bottom = state.height - margin;
  }

  return {
    randomInRange,
    randomCenterBiased,
    computeSmallness,
    safeWidthForY,
    setWanderTarget,
    isOverlapping,
    findExitTarget,
    updateBounds
  };
});
