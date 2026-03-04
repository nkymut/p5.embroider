// EmbroiderPart — interactive embroidery part model with transform and hit-testing.
// Parsing is handled by SVGReader from the p5.embroider library; this file provides
// the editable wrapper class, geometry utilities, and thin SVGReader delegates.

// Shared SVGReader instance from p5.embroider library (loaded via <script>)
const _svgReader = typeof SVGReader !== "undefined" ? new SVGReader() : null;

// Debug flag and helper for conditional logging
let SVG_PARSER_DEBUG = false;
function setSvgParserDebug(flag) {
  SVG_PARSER_DEBUG = !!flag;
  if (_svgReader) _svgReader.debug = !!flag;
}
function getSvgParserDebug() {
  return SVG_PARSER_DEBUG;
}
function svgDebugLog() {
  if (SVG_PARSER_DEBUG) {
    console.log.apply(console, arguments);
  }
}
if (typeof window !== "undefined") {
  window.setSvgParserDebug = setSvgParserDebug;
  window.getSvgParserDebug = getSvgParserDebug;
}

/** Squared distance from point (px,py) to line segment (ax,ay)-(bx,by). */
function _ptSegDistSq(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - ax) * (px - ax) + (py - ay) * (py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

// Deep-clone an EmbroiderPart instance (used by undo system)
function clonePart(part) {
  const clone = new EmbroiderPart({
    id: part.id,
    name: part.name,
    elementType: part.elementType,
    pathData: part.pathData,
    shapeParams: part.shapeParams ? JSON.parse(JSON.stringify(part.shapeParams)) : null,
    closed: part.closed,
    visible: part.visible,
    strokeSettings: JSON.parse(JSON.stringify(part.strokeSettings)),
    fillSettings: JSON.parse(JSON.stringify(part.fillSettings)),
    selected: part.selected,
  });
  clone.tx = part.tx;
  clone.ty = part.ty;
  clone.rotation = part.rotation;
  clone.sx = part.sx;
  clone.sy = part.sy;
  if (part.addToOutline !== undefined) clone.addToOutline = part.addToOutline;
  if (part.isOutline !== undefined) clone.isOutline = part.isOutline;
  if (part.sourcePartId !== undefined) clone.sourcePartId = part.sourcePartId;
  if (part.outlineOffset !== undefined) clone.outlineOffset = part.outlineOffset;
  return clone;
}

// Editable embroidery part with transform state for interactive editing
class EmbroiderPart {
  constructor(base) {
    this.id = base.id;
    this.name = base.name;
    this.elementType = base.elementType;
    this.pathData = base.pathData;
    this.shapeParams = base.shapeParams || null;
    this.closed = base.closed;
    this.visible = base.visible !== false;
    this.strokeSettings = base.strokeSettings;
    this.fillSettings = base.fillSettings;
    this.selected = !!base.selected;

    // Interactive transform state (in mm and radians)
    this.tx = 0;
    this.ty = 0;
    this.rotation = 0;
    this.sx = 1;
    this.sy = 1;
  }

  hasTransform() {
    return this.tx !== 0 || this.ty !== 0 || this.rotation !== 0 || this.sx !== 1 || this.sy !== 1;
  }

  // Compute transformed edit frame (center/size/rotation) in mm.
  // Uses shapeParams for precise bounds when available, falls back to path sampling.
  computeFrame() {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const sp = this.shapeParams;
    switch (this.elementType) {
      case "circle":
        if (sp && typeof sp.cx === "number" && typeof sp.cy === "number" && typeof sp.r === "number") {
          minX = sp.cx - sp.r;
          maxX = sp.cx + sp.r;
          minY = sp.cy - sp.r;
          maxY = sp.cy + sp.r;
        }
        break;
      case "ellipse":
        if (
          sp &&
          typeof sp.cx === "number" &&
          typeof sp.cy === "number" &&
          typeof sp.rx === "number" &&
          typeof sp.ry === "number"
        ) {
          minX = sp.cx - sp.rx;
          maxX = sp.cx + sp.rx;
          minY = sp.cy - sp.ry;
          maxY = sp.cy + sp.ry;
        }
        break;
      case "rect":
        if (
          sp &&
          typeof sp.x === "number" &&
          typeof sp.y === "number" &&
          typeof sp.w === "number" &&
          typeof sp.h === "number"
        ) {
          minX = sp.x;
          maxX = sp.x + sp.w;
          minY = sp.y;
          maxY = sp.y + sp.h;
        }
        break;
      case "line":
        if (
          sp &&
          typeof sp.x1 === "number" &&
          typeof sp.y1 === "number" &&
          typeof sp.x2 === "number" &&
          typeof sp.y2 === "number"
        ) {
          minX = Math.min(sp.x1, sp.x2);
          maxX = Math.max(sp.x1, sp.x2);
          minY = Math.min(sp.y1, sp.y2);
          maxY = Math.max(sp.y1, sp.y2);
        }
        break;
      case "polygon":
      case "polyline":
        if (sp && Array.isArray(sp.coords) && sp.coords.length >= 2) {
          for (let i = 0; i < sp.coords.length; i += 2) {
            const x = sp.coords[i];
            const y = sp.coords[i + 1];
            if (isFinite(x) && isFinite(y)) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }
        break;
    }

    if (minX === Infinity) {
      const points = getPathPoints(this.pathData);
      for (const p of points) {
        if (isNaN(p.x) || isNaN(p.y)) continue;
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    if (minX === Infinity) {
      return {
        centerMm: { x: this.tx || 0, y: this.ty || 0 },
        widthMm: 10,
        heightMm: 10,
        rotation: this.rotation || 0,
        base: { cx0: 0, cy0: 0, w0: 10, h0: 10 },
      };
    }

    const w0 = Math.max(1e-6, maxX - minX);
    const h0 = Math.max(1e-6, maxY - minY);
    const cx0 = (minX + maxX) / 2;
    const cy0 = (minY + maxY) / 2;

    const sx = this.sx || 1;
    const sy = this.sy || 1;
    const rot = this.rotation || 0;
    const tx = this.tx || 0;
    const ty = this.ty || 0;

    const cx = cx0 + tx;
    const cy = cy0 + ty;

    return {
      centerMm: { x: cx, y: cy },
      widthMm: w0 * sx,
      heightMm: h0 * sy,
      rotation: rot,
      base: { cx0, cy0, w0, h0 },
    };
  }

  // Compute on-screen pixel frame using preview and layout params
  computeScreenFramePx(params) {
    const {
      scaleFactor,
      offsetX,
      offsetY,
      centerOffsetX,
      centerOffsetY,
      canvasWidth,
      canvasHeight,
      previewScale,
      previewPanX,
      previewPanY,
    } = params;
    const frame = this.computeFrame();
    const mmX = offsetX + frame.centerMm.x * scaleFactor;
    const mmY = offsetY + frame.centerMm.y * scaleFactor;
    const px0 = mmToPixel(mmX);
    const py0 = mmToPixel(mmY);
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const screenX = (px0 + centerOffsetX - cx) * previewScale + cx + previewPanX;
    const screenY = (py0 + centerOffsetY - cy) * previewScale + cy + previewPanY;
    const widthPx = mmToPixel(frame.widthMm * scaleFactor) * previewScale;
    const heightPx = mmToPixel(frame.heightMm * scaleFactor) * previewScale;
    return { centerPx: { x: screenX, y: screenY }, widthPx, heightPx, rotation: frame.rotation };
  }

  // Draw this part using p5.js
  draw(scaleFactor, offsetX, offsetY) {
    if (this.visible === false) return;

    if (typeof applyPartSettings === "function") {
      applyPartSettings(this);
    }

    if (this.shapeParams && typeof this.drawPrimitive === "function") {
      const didDraw = this.drawPrimitive(scaleFactor, offsetX, offsetY);
      if (didDraw) return;
    }

    const points = getPathPoints(this.pathData);
    if (points.length >= 2) {
      const frame = this.computeFrame();
      const cx0 = frame.base.cx0;
      const cy0 = frame.base.cy0;
      push();
      translate(offsetX + (cx0 + (this.tx || 0)) * scaleFactor, offsetY + (cy0 + (this.ty || 0)) * scaleFactor);
      rotate(this.rotation || 0);
      scale(this.sx || 1, this.sy || 1);

      const shapes = organizeSubpathsIntoContours(points);

      for (const shape of shapes) {
        if (shape.outer.length < 2) continue;

        beginShape();
        for (const pt of shape.outer) {
          vertex((pt.x - cx0) * scaleFactor, (pt.y - cy0) * scaleFactor);
        }
        for (const hole of shape.holes) {
          if (hole.length < 2) continue;
          beginContour();
          for (const pt of hole) {
            vertex((pt.x - cx0) * scaleFactor, (pt.y - cy0) * scaleFactor);
          }
          endContour();
        }
        endShape(CLOSE);
      }

      pop();
    }
  }

  // Draw primitive shapes (circle, rect, ellipse, line) with transforms applied
  drawPrimitive(scaleFactor, offsetX, offsetY) {
    const params = this.shapeParams;
    if (!params) return false;

    const supported =
      this.elementType === "circle" ||
      this.elementType === "rect" ||
      this.elementType === "ellipse" ||
      this.elementType === "line";
    if (!supported) return false;

    const frame = this.computeFrame();
    const cx0 = frame.base.cx0;
    const cy0 = frame.base.cy0;

    push();
    translate(offsetX + (cx0 + (this.tx || 0)) * scaleFactor, offsetY + (cy0 + (this.ty || 0)) * scaleFactor);
    rotate(this.rotation || 0);
    scale(this.sx || 1, this.sy || 1);

    switch (this.elementType) {
      case "circle": {
        const dx = (params.cx - cx0) * scaleFactor;
        const dy = (params.cy - cy0) * scaleFactor;
        const r = (params.r || 0) * scaleFactor;
        circle(dx, dy, r * 2);
        pop();
        return true;
      }
      case "rect": {
        const dx = (params.x - cx0) * scaleFactor;
        const dy = (params.y - cy0) * scaleFactor;
        const w = (params.w || 0) * scaleFactor;
        const h = (params.h || 0) * scaleFactor;
        rect(dx, dy, w, h);
        pop();
        return true;
      }
      case "ellipse": {
        const dx = (params.cx - cx0) * scaleFactor;
        const dy = (params.cy - cy0) * scaleFactor;
        const w = (params.rx || 0) * 2 * scaleFactor;
        const h = (params.ry || 0) * 2 * scaleFactor;
        ellipse(dx, dy, w, h);
        pop();
        return true;
      }
      case "line": {
        const x1 = (params.x1 - cx0) * scaleFactor;
        const y1 = (params.y1 - cy0) * scaleFactor;
        const x2 = (params.x2 - cx0) * scaleFactor;
        const y2 = (params.y2 - cy0) * scaleFactor;
        line(x1, y1, x2, y2);
        pop();
        return true;
      }
      default:
        pop();
        return false;
    }
  }

  // Hit test in pixel domain
  hitTestPixel(mouseX, mouseY, params, options = {}) {
    const { handlePx = 8, rotationHandleOffsetPx = 30, allowBodyMove = true } = options;
    const framePx = this.computeScreenFramePx(params);
    const halfW = framePx.widthPx / 2;
    const halfH = framePx.heightPx / 2;
    const dx = mouseX - framePx.centerPx.x;
    const dy = mouseY - framePx.centerPx.y;
    const cosA = Math.cos(-framePx.rotation);
    const sinA = Math.sin(-framePx.rotation);
    const lx = dx * cosA - dy * sinA;
    const ly = dx * sinA + dy * cosA;

    const corners = [
      { x: -halfW, y: -halfH, id: "nw" },
      { x: halfW, y: -halfH, id: "ne" },
      { x: halfW, y: halfH, id: "se" },
      { x: -halfW, y: halfH, id: "sw" },
    ];
    for (const c of corners) {
      if (Math.abs(lx - c.x) <= handlePx && Math.abs(ly - c.y) <= handlePx) {
        return { type: "corner", corner: c.id };
      }
    }

    const rDistPx = Math.max(halfW, halfH) + rotationHandleOffsetPx;
    if (Math.hypot(lx - rDistPx, ly - 0) <= handlePx * 1.5) {
      return { type: "rotate" };
    }

    if (allowBodyMove) {
      if (lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH) {
        return { type: "body" };
      }
    }
    return { type: null };
  }

  /**
   * Path-proximity hit test in screen-pixel domain.
   * Works entirely in screen space using the same forward transform as
   * computeScreenFramePx / draw().
   */
  hitTestPathPixel(mouseX, mouseY, params, tolerancePx = 8) {
    const tSq = tolerancePx * tolerancePx;

    const {
      scaleFactor, offsetX, offsetY, centerOffsetX, centerOffsetY,
      canvasWidth, canvasHeight, previewScale, previewPanX, previewPanY,
    } = params;
    const frame = this.computeFrame();
    const cx0 = frame.base.cx0;
    const cy0 = frame.base.cy0;
    const cosA = this.rotation ? Math.cos(this.rotation) : 1;
    const sinA = this.rotation ? Math.sin(this.rotation) : 0;
    const sx = this.sx || 1;
    const sy = this.sy || 1;
    const txPart = this.tx || 0;
    const tyPart = this.ty || 0;
    const halfCW = canvasWidth / 2;
    const halfCH = canvasHeight / 2;
    const mmPxFactor = 96 / 25.4;

    const toScreen = (mx, my) => {
      const dx = (mx - cx0) * sx;
      const dy = (my - cy0) * sy;
      const rx = dx * cosA - dy * sinA;
      const ry = dx * sinA + dy * cosA;
      const outMmX = offsetX + (rx + cx0 + txPart) * scaleFactor;
      const outMmY = offsetY + (ry + cy0 + tyPart) * scaleFactor;
      const px0 = outMmX * mmPxFactor;
      const py0 = outMmY * mmPxFactor;
      return {
        x: (px0 + centerOffsetX - halfCW) * previewScale + halfCW + previewPanX,
        y: (py0 + centerOffsetY - halfCH) * previewScale + halfCH + previewPanY,
      };
    };

    const sp = this.shapeParams;
    if (sp) {
      switch (this.elementType) {
        case "circle": {
          if (typeof sp.cx === "number" && typeof sp.cy === "number" && typeof sp.r === "number") {
            const N = 36;
            let prev = toScreen(sp.cx + sp.r, sp.cy);
            for (let i = 1; i <= N; i++) {
              const angle = (i / N) * Math.PI * 2;
              const cur = toScreen(sp.cx + sp.r * Math.cos(angle), sp.cy + sp.r * Math.sin(angle));
              if (_ptSegDistSq(mouseX, mouseY, prev.x, prev.y, cur.x, cur.y) <= tSq) return true;
              prev = cur;
            }
            return false;
          }
          break;
        }
        case "ellipse": {
          if (typeof sp.cx === "number" && typeof sp.cy === "number" && sp.rx > 0 && sp.ry > 0) {
            const N = 36;
            let prev = toScreen(sp.cx + sp.rx, sp.cy);
            for (let i = 1; i <= N; i++) {
              const angle = (i / N) * Math.PI * 2;
              const cur = toScreen(sp.cx + sp.rx * Math.cos(angle), sp.cy + sp.ry * Math.sin(angle));
              if (_ptSegDistSq(mouseX, mouseY, prev.x, prev.y, cur.x, cur.y) <= tSq) return true;
              prev = cur;
            }
            return false;
          }
          break;
        }
        case "rect": {
          if (typeof sp.x === "number" && typeof sp.y === "number" && sp.w > 0 && sp.h > 0) {
            const tl = toScreen(sp.x, sp.y);
            const tr = toScreen(sp.x + sp.w, sp.y);
            const br = toScreen(sp.x + sp.w, sp.y + sp.h);
            const bl = toScreen(sp.x, sp.y + sp.h);
            if (_ptSegDistSq(mouseX, mouseY, tl.x, tl.y, tr.x, tr.y) <= tSq) return true;
            if (_ptSegDistSq(mouseX, mouseY, tr.x, tr.y, br.x, br.y) <= tSq) return true;
            if (_ptSegDistSq(mouseX, mouseY, br.x, br.y, bl.x, bl.y) <= tSq) return true;
            if (_ptSegDistSq(mouseX, mouseY, bl.x, bl.y, tl.x, tl.y) <= tSq) return true;
            return false;
          }
          break;
        }
        case "line": {
          if (typeof sp.x1 === "number" && typeof sp.y1 === "number" &&
              typeof sp.x2 === "number" && typeof sp.y2 === "number") {
            const p1 = toScreen(sp.x1, sp.y1);
            const p2 = toScreen(sp.x2, sp.y2);
            return _ptSegDistSq(mouseX, mouseY, p1.x, p1.y, p2.x, p2.y) <= tSq;
          }
          break;
        }
      }
    }

    const points = typeof getPathPoints === "function" ? getPathPoints(this.pathData) : [];
    if (points.length < 2) return false;

    const screenPts = points.map((p) => toScreen(p.x, p.y));

    for (let i = 0; i < screenPts.length - 1; i++) {
      if (_ptSegDistSq(mouseX, mouseY, screenPts[i].x, screenPts[i].y, screenPts[i + 1].x, screenPts[i + 1].y) <= tSq) {
        return true;
      }
    }
    if (this.closed && screenPts.length > 2) {
      const last = screenPts[screenPts.length - 1];
      const first = screenPts[0];
      if (_ptSegDistSq(mouseX, mouseY, last.x, last.y, first.x, first.y) <= tSq) {
        return true;
      }
    }
    return false;
  }

  // Convert pixel to model (SVG) coordinates by inverting preview and output layout
  _pixelToModel(mouseX, mouseY, params) {
    const {
      centerOffsetX, centerOffsetY,
      canvasWidth, canvasHeight,
      previewScale, previewPanX, previewPanY,
      offsetX, offsetY, scaleFactor,
    } = params;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const outPxX = (mouseX - cx - previewPanX) / Math.max(1e-6, previewScale) + cx - centerOffsetX;
    const outPxY = (mouseY - cy - previewPanY) / Math.max(1e-6, previewScale) + cy - centerOffsetY;
    const outMmX = outPxX / mmToPixel(1);
    const outMmY = outPxY / mmToPixel(1);
    const modelX = (outMmX - offsetX) / Math.max(1e-6, scaleFactor);
    const modelY = (outMmY - offsetY) / Math.max(1e-6, scaleFactor);
    return { modelX, modelY };
  }

  mousePressedPixel(mouseX, mouseY, params, options = {}) {
    const handlePx = Math.max(6, 8 / Math.max(0.0001, params.previewScale));
    const hit = this.hitTestPixel(mouseX, mouseY, params, {
      handlePx,
      rotationHandleOffsetPx: Math.max(20, 30 / Math.max(0.0001, params.previewScale)),
      allowBodyMove: options.allowBodyMove,
    });
    if (!hit || !hit.type) return false;
    const frame = this.computeFrame();
    const start = this._pixelToModel(mouseX, mouseY, params);
    this._drag = {
      active: true,
      type: hit.type === "body" ? "move" : hit.type,
      corner: hit.corner || null,
      startMouseModel: { x: start.modelX, y: start.modelY },
      startCenterMm: { x: frame.centerMm.x, y: frame.centerMm.y },
      startWidthMm: frame.widthMm,
      startHeightMm: frame.heightMm,
      startRotation: this.rotation || 0,
      startTx: this.tx || 0,
      startTy: this.ty || 0,
      startSx: this.sx || 1,
      startSy: this.sy || 1,
      baseW0: frame.base.w0,
      baseH0: frame.base.h0,
    };
    return true;
  }

  mouseDraggedPixel(mouseX, mouseY, params, modifiers = {}) {
    if (!this._drag || !this._drag.active) return false;
    const { shiftKey = false, altKey = false } = modifiers;
    const drag = this._drag;
    const pos = this._pixelToModel(mouseX, mouseY, params);
    const mmX = pos.modelX;
    const mmY = pos.modelY;
    if (drag.type === "move") {
      const dx = mmX - drag.startMouseModel.x;
      const dy = mmY - drag.startMouseModel.y;
      this.tx = drag.startTx + dx;
      this.ty = drag.startTy + dy;
      return true;
    }
    if (drag.type === "corner") {
      const dx = mmX - drag.startCenterMm.x;
      const dy = mmY - drag.startCenterMm.y;
      const cosA = Math.cos(-drag.startRotation);
      const sinA = Math.sin(-drag.startRotation);
      const lx = dx * cosA - dy * sinA;
      const ly = dx * sinA + dy * cosA;
      const halfBaseW = Math.max(1e-6, drag.baseW0 / 2);
      const halfBaseH = Math.max(1e-6, drag.baseH0 / 2);
      let targetX = drag.corner === "ne" || drag.corner === "se" ? Math.max(1e-6, lx) : Math.min(-1e-6, lx);
      let targetY = drag.corner === "sw" || drag.corner === "se" ? Math.max(1e-6, ly) : Math.min(-1e-6, ly);
      let absSx = Math.abs(targetX) / halfBaseW;
      let absSy = Math.abs(targetY) / halfBaseH;
      absSx = Math.max(0.01, absSx);
      absSy = Math.max(0.01, absSy);
      if (altKey) {
        const uni = Math.max(absSx, absSy);
        this.sx = uni;
        this.sy = uni;
      } else {
        this.sx = absSx;
        this.sy = absSy;
      }
      return true;
    }
    if (drag.type === "rotate") {
      const cxMm = drag.startCenterMm.x;
      const cyMm = drag.startCenterMm.y;
      const ang0 = Math.atan2(drag.startMouseModel.y - cyMm, drag.startMouseModel.x - cxMm);
      const ang1 = Math.atan2(mmY - cyMm, mmX - cxMm);
      let delta = ang1 - ang0;
      if (shiftKey) {
        const step = Math.PI / 12;
        delta = Math.round(delta / step) * step;
      }
      this.rotation = drag.startRotation + delta;
      return true;
    }
    return false;
  }

  mouseReleased() {
    if (this._drag) this._drag.active = false;
  }
}

// Global aliases for SVGReader methods — EmbroiderPart and sketch.js
// call these as bare functions (e.g. getPathPoints(d)) while SVGReader
// uses different method names (e.g. _svgReader.parsePathData(d)).
const getPathPoints = (pathData) => _svgReader.parsePathData(pathData);
const organizeSubpathsIntoContours = (pts) => _svgReader.organizeSubpathsIntoContours(pts);

