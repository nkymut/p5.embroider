let svgInput;
let svgParts = []; // Array of SVG part objects (instances of EmbroiderPart)

// Debug flag and helper for conditional logging
let SVG_PARSER_DEBUG = false;
function setSvgParserDebug(flag) {
  SVG_PARSER_DEBUG = !!flag;
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
  // Copy extra properties used by outline system
  if (part.addToOutline !== undefined) clone.addToOutline = part.addToOutline;
  if (part.isOutline !== undefined) clone.isOutline = part.isOutline;
  if (part.sourcePartId !== undefined) clone.sourcePartId = part.sourcePartId;
  if (part.outlineOffset !== undefined) clone.outlineOffset = part.outlineOffset;
  return clone;
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

// Editable embroidery part with transform state for interactive editing
class EmbroiderPart {
  constructor(base) {
    // Copy drawable properties
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
    this.tx = 0; // translate X (mm)
    this.ty = 0; // translate Y (mm)
    this.rotation = 0; // radians
    this.sx = 1; // scale X
    this.sy = 1; // scale Y
  }

  hasTransform() {
    return this.tx !== 0 || this.ty !== 0 || this.rotation !== 0 || this.sx !== 1 || this.sy !== 1;
  }

  // Compute transformed edit frame (center/size/rotation) in mm
  computeFrame() {
    // Prefer precise base bounds from shape parameters where available (avoids arc approximation issues)
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

    // If shapeParams did not yield bounds, fall back to path sampling
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
    // Anchor at part center
    const cx0 = (minX + maxX) / 2;
    const cy0 = (minY + maxY) / 2;

    const sx = this.sx || 1;
    const sy = this.sy || 1;
    const rot = this.rotation || 0;
    const tx = this.tx || 0;
    const ty = this.ty || 0;

    // Center-pivot model: translation shifts the base center; scale/rotation do not move center
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

  // Hit test at mm coordinates. options: { handleMm, rotationHandleOffsetMm, allowBodyMove }
  hitTest(mmX, mmY, options = {}) {
    const { handleMm = 1, rotationHandleOffsetMm = 10, allowBodyMove = true } = options;
    const frame = this.computeFrame();
    const halfW = frame.widthMm / 2;
    const halfH = frame.heightMm / 2;
    const dx = mmX - frame.centerMm.x;
    const dy = mmY - frame.centerMm.y;
    const cosA = Math.cos(-frame.rotation);
    const sinA = Math.sin(-frame.rotation);
    const lx = dx * cosA - dy * sinA;
    const ly = dx * sinA + dy * cosA;

    // Corners
    const corners = [
      { x: -halfW, y: -halfH, id: "nw" },
      { x: halfW, y: -halfH, id: "ne" },
      { x: halfW, y: halfH, id: "se" },
      { x: -halfW, y: halfH, id: "sw" },
    ];
    for (const c of corners) {
      if (Math.abs(lx - c.x) <= handleMm && Math.abs(ly - c.y) <= handleMm) {
        return { type: "corner", corner: c.id };
      }
    }

    // Rotation handle (local +X axis)
    const rDistMm = Math.max(halfW, halfH) + rotationHandleOffsetMm;
    if (Math.hypot(lx - rDistMm, ly - 0) <= handleMm * 1.5) {
      return { type: "rotate" };
    }

    // Body
    if (allowBodyMove) {
      if (lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH) {
        return { type: "body" };
      }
    }

    return { type: null };
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
    // Forward: screenX = (px0 + centerOffsetX - cx) * previewScale + cx + panX
    // centerOffsetX must be inside the scaled term (it's part of the world-space position)
    const screenX = (px0 + centerOffsetX - cx) * previewScale + cx + previewPanX;
    const screenY = (py0 + centerOffsetY - cy) * previewScale + cy + previewPanY;
    const widthPx = mmToPixel(frame.widthMm * scaleFactor) * previewScale;
    const heightPx = mmToPixel(frame.heightMm * scaleFactor) * previewScale;
    return { centerPx: { x: screenX, y: screenY }, widthPx, heightPx, rotation: frame.rotation };
  }

  // Draw this part using p5.js. Expects global helpers from the sketch (applyPartSettings, usePrimitiveShape, getPathPoints)
  draw(scaleFactor, offsetX, offsetY) {
    if (this.visible === false) return;

    if (typeof applyPartSettings === "function") {
      applyPartSettings(this);
    }

    // Prefer primitive drawing when shape parameters are available (with full transform support)
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
      
      // Organize subpaths into shapes with contours (holes)
      const shapes = organizeSubpathsIntoContours(points);
      
      for (const shape of shapes) {
        if (shape.outer.length < 2) continue;
        
        beginShape();
        
        // Draw outer shape
        for (const pt of shape.outer) {
          const lx = (pt.x - cx0) * scaleFactor;
          const ly = (pt.y - cy0) * scaleFactor;
          vertex(lx, ly);
        }
        
        // Draw holes as contours
        for (const hole of shape.holes) {
          if (hole.length < 2) continue;
          beginContour();
          for (const pt of hole) {
            const lx = (pt.x - cx0) * scaleFactor;
            const ly = (pt.y - cy0) * scaleFactor;
            vertex(lx, ly);
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

    // Only handle core primitives here
    const supported =
      this.elementType === "circle" ||
      this.elementType === "rect" ||
      this.elementType === "ellipse" ||
      this.elementType === "line";
    if (!supported) return false;

    // Compute base center for local coordinates
    const frame = this.computeFrame();
    const cx0 = frame.base.cx0;
    const cy0 = frame.base.cy0;

    push();
    // Translate to transformed center in output mm space
    translate(offsetX + (cx0 + (this.tx || 0)) * scaleFactor, offsetY + (cy0 + (this.ty || 0)) * scaleFactor);
    // Apply rotation and non-uniform scale in model space
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

  // Hit test in pixel domain; options: { handlePx, rotationHandleOffsetPx, allowBodyMove }
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

    // Corners
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

    // Rotation handle
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
   * computeScreenFramePx / draw(). This avoids inverse-transform issues
   * that caused offsets at non-default zoom levels.
   */
  hitTestPathPixel(mouseX, mouseY, params, tolerancePx = 8) {
    const tSq = tolerancePx * tolerancePx;

    // Pre-compute all transform constants ONCE (avoid repeated computeFrame calls)
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
    // mmToPixel(mm) = (mm / 25.4) * 96  — linear, so factor out the constant
    const mmPxFactor = 96 / 25.4;

    // Fast model-to-screen helper (same formula as computeScreenFramePx)
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

    // For primitive shapes, use exact geometric tests in screen space
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

    // Fallback: convert sampled path points to screen space and test there
    const points = typeof getPathPoints === "function" ? getPathPoints(this.pathData) : [];
    if (points.length < 2) return false;

    // Convert all path points to screen space using the cached helper
    const screenPts = points.map((p) => toScreen(p.x, p.y));

    for (let i = 0; i < screenPts.length - 1; i++) {
      if (_ptSegDistSq(mouseX, mouseY, screenPts[i].x, screenPts[i].y, screenPts[i + 1].x, screenPts[i + 1].y) <= tSq) {
        return true;
      }
    }
    // If closed shape, also check the closing segment
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
      centerOffsetX,
      centerOffsetY,
      canvasWidth,
      canvasHeight,
      previewScale,
      previewPanX,
      previewPanY,
      offsetX,
      offsetY,
      scaleFactor,
    } = params;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    // Undo preview viewport transform, then undo centerOffset translate
    // Forward: screenX = (outPxX + centerOffsetX - cx) * previewScale + cx + panX
    // Inverse: outPxX  = (screenX - cx - panX) / previewScale + cx - centerOffsetX
    const outPxX = (mouseX - cx - previewPanX) / Math.max(1e-6, previewScale) + cx - centerOffsetX;
    const outPxY = (mouseY - cy - previewPanY) / Math.max(1e-6, previewScale) + cy - centerOffsetY;
    // Convert to output-mm space
    const outMmX = outPxX / mmToPixel(1);
    const outMmY = outPxY / mmToPixel(1);
    // Convert to model (SVG) coordinate space used by parts
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
      // Compute in start-space (stable center and rotation)
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
      // Absolute new scales based on base geometry, not relative to current scale
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

  mousePressed(mmX, mmY, options = {}) {
    const hit = this.hitTest(mmX, mmY, options);
    if (!hit || !hit.type) return false;
    const frame = this.computeFrame();
    this._drag = {
      active: true,
      type: hit.type === "body" ? "move" : hit.type,
      corner: hit.corner || null,
      startMouseMm: { x: mmX, y: mmY },
      startCenterMm: { x: frame.centerMm.x, y: frame.centerMm.y },
      startWidthMm: frame.widthMm,
      startHeightMm: frame.heightMm,
      startRotation: this.rotation || 0,
      startTx: this.tx || 0,
      startTy: this.ty || 0,
      startSx: this.sx || 1,
      startSy: this.sy || 1,
    };
    return true;
  }

  mouseDragged(mmX, mmY, modifiers = {}) {
    if (!this._drag || !this._drag.active) return false;
    const { shiftKey = false, altKey = false } = modifiers;
    const drag = this._drag;
    if (drag.type === "move") {
      const dx = mmX - drag.startMouseMm.x;
      const dy = mmY - drag.startMouseMm.y;
      this.tx = drag.startTx + dx;
      this.ty = drag.startTy + dy;
      return true;
    }
    if (drag.type === "corner") {
      const frame = this.computeFrame();
      const dx = mmX - frame.centerMm.x;
      const dy = mmY - frame.centerMm.y;
      const cosA = Math.cos(-frame.rotation);
      const sinA = Math.sin(-frame.rotation);
      const lx = dx * cosA - dy * sinA;
      const ly = dx * sinA + dy * cosA;
      const halfW0 = drag.startWidthMm / 2;
      const halfH0 = drag.startHeightMm / 2;
      let targetX = drag.corner === "ne" || drag.corner === "se" ? Math.max(1e-6, lx) : Math.min(-1e-6, lx);
      let targetY = drag.corner === "sw" || drag.corner === "se" ? Math.max(1e-6, ly) : Math.min(-1e-6, ly);
      const newSx = Math.max(0.01, Math.abs(targetX / halfW0));
      const newSy = Math.max(0.01, Math.abs(targetY / halfH0));
      if (altKey) {
        const uni = Math.max(newSx, newSy);
        this.sx = uni;
        this.sy = uni;
      } else {
        this.sx = newSx;
        this.sy = newSy;
      }
      return true;
    }
    if (drag.type === "rotate") {
      const cxMm = drag.startCenterMm.x;
      const cyMm = drag.startCenterMm.y;
      const ang0 = Math.atan2(drag.startMouseMm.y - cyMm, drag.startMouseMm.x - cxMm);
      const ang1 = Math.atan2(mmY - cyMm, mmX - cxMm);
      let delta = ang1 - ang0;
      if (shiftKey) {
        const step = Math.PI / 12; // 15 degrees
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

  mouseMoved(mmX, mmY, options = {}) {
    // Lightweight hover check; returns same shape as hitTest
    return this.hitTest(mmX, mmY, options);
  }
}

// SVG Presets with colored elements
const presets = {
  1: `<?xml version="1.0" encoding="UTF-8"?>
    <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 470.39 1300.91">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path d="M219.53,340.99c15.83-3.84,49,4.74,64,10,32.27,2.44,58.27-13.17,65-46.01,3.52-39.32-17.67-50.77-44-73-8.45-14.63-21.07-37.76-38-44-26.23-11.25-62.84-1.72-81,20-12.67,29.3-45.76,39.56-57,69-3.83,19.37-2.55,32.69,5,51,5.48,9.46,23.14,18.49,33,22,15.05,2.53,38.76-5.27,53-9Z"/>
      <path d="M419.53,188.99c2.07-26.72-10.93-41.68-38-41-22.61,5.07-39.89,27.93-44,50-3.66,40.88,27.97,57.04,61,35,11.15-10.36,20.38-28.67,21-44Z"/>
      <path d="M138.53,194.99c-3.38-16.73-14.64-37.75-31-45-19.48-2.56-32.02-4.42-43,15-10.53,28.19,5.71,67.5,36,75,0,0,20-2,20-2,14.2-10.89,23.36-24.55,18-43Z"/>
      <path d="M174.53,62.99c-25.14,5.81-28.1,23.17-34,45-3.85,31.43,14.8,71.59,51,69,58.84-11.69,41.41-119.34-17-114"/>
      <path d="M306.53,58.99c-30.53-2.7-48.64,28.33-55,54-3.39,25.39,5.23,52.31,32,60,60.9,7.76,80-97.36,23-114Z"/>
      <path class="cls-1" d="M459.25,1300.9c-7.13-253.24-65.36-677.54-56.02-931,9.46-50.12,45.96-99.68,62.02-147,8.38-35.87,7.58-82.88-21.01-110-11.91-13.96-38.93-18.24-56-20-.24-37.6-25.4-79.92-63-90-28.35-6.84-63.62.85-82.68,24.05h0c-29.57-32.73-82.65-33.38-116-6-20.87,16.94-33.56,47.46-34,74-32.5-6.5-64.95,21.3-78,49-19.56,44.39,7.67,103.2,27,143C86.81,345.61-2.39,1212.39.57,1299.94"/>
    </svg>`,
  2: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="80" height="80" fill="#ff6b6b" stroke="#4ecdc4" stroke-width="2"/>
    <circle cx="50" cy="50" r="25" fill="#45b7d1" stroke="#f7dc6f" stroke-width="3"/>
  </svg>`,
  3: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,10 90,80 10,80" fill="#f39c12" stroke="#34495e" stroke-width="2"/>
    <circle cx="50" cy="50" r="15" fill="#1abc9c" stroke="#e67e22" stroke-width="2"/>
  </svg>`,
  
};

function loadPreset(num) {
  if (presets[num]) {
    svgInput.value(presets[num]);
    // Reset title to default when loading preset
    updateCanvasTitle();
    loadSVGFromTextArea();
  }
}

function handleSVGFileUpload(file) {
  if (file && (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg"))) {
    // Read the SVG file content
    const reader = new FileReader();
    reader.onload = function (e) {
      const svgContent = e.target.result;
      // Display the SVG content in the textarea
      svgInput.value(svgContent);
      // Update the title with filename
      updateCanvasTitle(file.name);
      // Automatically load the SVG
      loadSVGFromTextArea();
    };
    reader.readAsText(file);
  } else {
    console.error("Please upload a valid SVG file");
  }
}

function parseCSSStyles(svgDoc) {
  const styles = {};
  const styleElements = svgDoc.querySelectorAll("defs style, style");

  styleElements.forEach((styleElement) => {
    const cssText = styleElement.textContent || styleElement.innerHTML;
    svgDebugLog("Found CSS style element:", cssText.substring(0, 200) + "...");

    // Use regex to find CSS rules: selector { properties }
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(cssText)) !== null) {
      const selector = match[1].trim();
      const properties = match[2].trim();

      // Parse properties
      const styleObj = {};
      properties.split(";").forEach((prop) => {
        const trimmedProp = prop.trim();
        if (trimmedProp) {
          const colonIndex = trimmedProp.indexOf(":");
          if (colonIndex > 0) {
            const property = trimmedProp.substring(0, colonIndex).trim();
            const value = trimmedProp.substring(colonIndex + 1).trim();
            if (property && value) {
              styleObj[property] = value;
            }
          }
        }
      });

      if (Object.keys(styleObj).length > 0) {
        styles[selector] = styleObj;
        svgDebugLog(`Parsed CSS rule for ${selector}:`, styleObj);
      }
    }
  });

  return styles;
}

function loadSVGFromTextArea(append = false) {
  const svgText = svgInput.value().trim();
  if (!svgText) return;

  // Save state before loading (undo system lives in sketch.js)
  if (typeof pushUndo === "function") pushUndo();

  svgDebugLog("Loading SVG from textarea:", svgText.substring(0, 200) + "...");

  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");

    if (!svgElement) {
      console.error("No <svg> element found");
      return;
    }

    // Parse CSS styles from <defs><style> section
    const cssStyles = parseCSSStyles(svgDoc);
    svgDebugLog("Parsed CSS styles:", cssStyles);

    if (!append) svgParts = [];
    const allElements = svgElement.querySelectorAll("path, circle, rect, line, polyline, polygon, ellipse");

    svgDebugLog(
      `Found ${allElements.length} SVG elements:`,
      Array.from(allElements).map((el) => el.tagName.toLowerCase()),
    );

    allElements.forEach((element, index) => {
      const raw = createSVGPartObject(element, index, cssStyles);
      if (raw) {
        const wrapped = new EmbroiderPart(raw);
        // Ensure closed is set for shapes that are inherently closed
        if (
          wrapped.elementType === "circle" ||
          wrapped.elementType === "ellipse" ||
          wrapped.elementType === "rect" ||
          wrapped.elementType === "polygon"
        ) {
          wrapped.closed = true;
        }
        svgParts.push(wrapped);
      }
    });

    if (svgParts.length > 0) {
      boundingBox = calculateBoundingBoxForParts(svgParts);
      // Selection behavior
      if (!append) {
        selectedPartIndices = [0];
        svgParts.forEach((p) => {
          p.selected = false;
          p.tx = 0;
          p.ty = 0;
          p.rotation = 0;
          p.sx = 1;
          p.sy = 1;
        });
        svgParts[0].selected = true;
      } else {
        // Append mode: keep existing selection, select newly added parts too
        const existingCount = svgParts.length - allElements.length;
        for (let i = existingCount; i < svgParts.length; i++) {
          svgParts[i].selected = true;
          selectedPartIndices.push(i);
        }
      }
      updatePartSettings(svgParts[selectedPartIndices[0]]);

      updateSVGPartsList();
      updateInfoTable();
      redraw();
      svgDebugLog(`Loaded ${svgParts.length} SVG parts as objects`);
    }
  } catch (error) {
    console.error("Error loading SVG:", error);
  }
}

function createSVGPartObject(element, index, cssStyles = {}) {
  let pathData = "";
  let shapeParams = null;
  const tagName = element.tagName.toLowerCase();

  svgDebugLog(`Creating SVG part object for ${tagName} element:`, element);

  // Store original shape parameters and convert to path data
  const dpi = (typeof globalSettings !== "undefined" && globalSettings && globalSettings.dpi) || 96;

  switch (tagName) {
    case "path": {
      const d = element.getAttribute("d");
      pathData = d || "";
      // Convert to mm by sampling points and reconstructing path with proper subpath structure
      if (pathData) {
        const sampled = getPathPoints(pathData) || [];
        if (sampled.length > 0) {
          let rebuilt = "";
          let lastWasClose = false;
          
          for (let i = 0; i < sampled.length; i++) {
            const pt = sampled[i];
            const ptMm = { x: px2mm(pt.x), y: px2mm(pt.y) };
            
            if (pt.isMoveTo) {
              // Start a new subpath
              if (i > 0 && !lastWasClose) {
                // Previous subpath wasn't closed, so don't add anything special
              }
              rebuilt += ` M ${ptMm.x} ${ptMm.y}`;
              lastWasClose = false;
            } else {
              // Regular point
              rebuilt += ` L ${ptMm.x} ${ptMm.y}`;
              lastWasClose = false;
            }
            
            if (pt.isClosePath) {
              // Close this subpath
              rebuilt += " Z";
              lastWasClose = true;
            }
          }
          
          pathData = rebuilt.trim();
        }
      }
      break;
    }
    case "circle":
      const cx = px2mm(parseFloat(element.getAttribute("cx") || 0));
      const cy = px2mm(parseFloat(element.getAttribute("cy") || 0));
      const r = px2mm(parseFloat(element.getAttribute("r") || 0));
      if (r > 0) {
        shapeParams = { cx, cy, r };
        pathData = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
      }
      break;
    case "rect":
      const x = px2mm(parseFloat(element.getAttribute("x") || 0));
      const y = px2mm(parseFloat(element.getAttribute("y") || 0));
      const w = px2mm(parseFloat(element.getAttribute("width") || 0));
      const h = px2mm(parseFloat(element.getAttribute("height") || 0));
      if (w > 0 && h > 0) {
        shapeParams = { x, y, w, h };
        pathData = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
      }
      break;
    case "ellipse":
      const ex = px2mm(parseFloat(element.getAttribute("cx") || 0));
      const ey = px2mm(parseFloat(element.getAttribute("cy") || 0));
      const rx = px2mm(parseFloat(element.getAttribute("rx") || 0));
      const ry = px2mm(parseFloat(element.getAttribute("ry") || 0));
      if (rx > 0 && ry > 0) {
        shapeParams = { cx: ex, cy: ey, rx, ry };
        pathData = `M ${ex - rx} ${ey} A ${rx} ${ry} 0 1 1 ${ex + rx} ${ey} A ${rx} ${ry} 0 1 1 ${ex - rx} ${ey} Z`;
      }
      break;
    case "line":
      const x1 = px2mm(parseFloat(element.getAttribute("x1") || 0));
      const y1 = px2mm(parseFloat(element.getAttribute("y1") || 0));
      const x2 = px2mm(parseFloat(element.getAttribute("x2") || 0));
      const y2 = px2mm(parseFloat(element.getAttribute("y2") || 0));
      shapeParams = { x1, y1, x2, y2 };
      pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
      break;
    case "polygon":
    case "polyline":
      const points = element.getAttribute("points") || "";
      const coordsPx = points
        .trim()
        .split(/[\s,]+/)
        .map(parseFloat);
      if (coordsPx.length >= 4) {
        const coords = [];
        for (let i = 0; i < coordsPx.length; i += 2) {
          const px = px2mm(coordsPx[i]);
          const py = px2mm(coordsPx[i + 1]);
          coords.push(px, py);
        }
        shapeParams = { coords, closed: tagName === "polygon" };
        pathData = `M ${coords[0]} ${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
          pathData += ` L ${coords[i]} ${coords[i + 1]}`;
        }
        if (tagName === "polygon") {
          pathData += " Z";
        }
      }
      break;
  }

  if (!pathData) return null;

  // Parse SVG attributes for colors with improved handling
  const stroke = element.getAttribute("stroke");
  const fill = element.getAttribute("fill");
  const strokeWidthPx = parseFloat(element.getAttribute("stroke-width")) || 2;

  // Also check for style attribute which might contain fill/stroke
  const styleAttr = element.getAttribute("style");
  let styleFill = null;
  let styleStroke = null;
  let styleStrokeWidth = null;

  if (styleAttr) {
    // Parse style attribute for fill, stroke, and stroke-width
    const styleRules = styleAttr.split(";");
    styleRules.forEach((rule) => {
      const [property, value] = rule.split(":").map((s) => s.trim());
      if (property === "fill") styleFill = value;
      else if (property === "stroke") styleStroke = value;
      else if (property === "stroke-width") styleStrokeWidth = parseFloat(value);
    });
  }

  // Check for CSS classes and apply their styles
  let cssFill = null;
  let cssStroke = null;
  let cssStrokeWidth = null;

  const classAttr = element.getAttribute("class");
  if (classAttr && cssStyles) {
    const classes = classAttr
      .split(" ")
      .map((c) => c.trim())
      .filter((c) => c);
    classes.forEach((className) => {
      const cssRule = cssStyles[`.${className}`];
      if (cssRule) {
        svgDebugLog(`Applying CSS rule for class ${className}:`, cssRule);
        if (cssRule.fill) cssFill = cssRule.fill;
        if (cssRule.stroke) cssStroke = cssRule.stroke;
        if (cssRule["stroke-width"]) cssStrokeWidth = parseFloat(cssRule["stroke-width"]);
      }
    });
  }

  // Use CSS values if available, otherwise fall back to style attributes, then direct attributes
  const finalFill = cssFill || fill || styleFill;
  const finalStroke = cssStroke || stroke || styleStroke;
  const finalStrokeWidth = cssStrokeWidth || strokeWidthPx || styleStrokeWidth || 2;
  const finalStrokeWidthMm = px2mm(finalStrokeWidth);

  svgDebugLog(`Element ${tagName} color parsing:`, {
    directFill: fill,
    styleFill: styleFill,
    cssFill: cssFill,
    finalFill: finalFill,
    directStroke: stroke,
    styleStroke: styleStroke,
    cssStroke: cssStroke,
    finalStroke: finalStroke,
    classes: element.getAttribute("class"),
    hasFill: finalFill && finalFill !== "none",
    hasStroke: finalStroke && finalStroke !== "none",
  });

  // Determine default behavior when no colors are specified
  const hasStroke = finalStroke && finalStroke !== "none";
  const hasFill = finalFill && finalFill !== "none";
  const hasNoColors = !hasStroke && !hasFill;

  // Determine if path should be closed (has Z command)
  const shouldClose = pathData.toLowerCase().includes("z");

  // Create structured object
  const partObject = {
    id: `part_${index}`,
    name: `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} ${index + 1}`,
    elementType: tagName,
    pathData: pathData,
    shapeParams: shapeParams,
    closed: shouldClose,
    originalAttributes: {
      stroke: finalStroke,
      fill: finalFill,
      "stroke-width": finalStrokeWidth,
      style: styleAttr,
      class: element.getAttribute("class"),
    },
    strokeSettings: {
      enabled: hasStroke || hasNoColors, // Enable stroke if explicitly set or no colors specified
      color: parseColor(finalStroke) || [128, 128, 128], // Gray default stroke
      weight: finalStrokeWidthMm,
      mode: "straight",
      stitchLength: 2,
      minStitchLength: 0.5,
      resampleNoise: 0.0,
    },
    fillSettings: {
      enabled: hasFill, // Only enable fill if explicitly set
      color: parseColor(finalFill) || [0, 0, 0], // Black default fill
      mode: "tatami",
      stitchLength: 3,
      minStitchLength: 0.5,
      resampleNoise: 0.0,
      rowSpacing: 0.8,
    },
    visible: true,
    selected: false,
    addToOutline: false,
  };

  svgDebugLog(`Created part object:`, {
    name: partObject.name,
    fillEnabled: partObject.fillSettings.enabled,
    fillColor: partObject.fillSettings.color,
    strokeEnabled: partObject.strokeSettings.enabled,
    strokeColor: partObject.strokeSettings.color,
  });

  return partObject;
}

function parseColor(colorStr) {
  if (!colorStr || colorStr === "none") return null;

  svgDebugLog(`Parsing color: "${colorStr}"`);

  // Handle hex colors
  if (colorStr.startsWith("#")) {
    const hex = colorStr.slice(1);
    if (hex.length === 3) {
      const result = [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
      svgDebugLog(`Parsed 3-digit hex:`, result);
      return result;
    } else if (hex.length === 6) {
      const result = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
      svgDebugLog(`Parsed 6-digit hex:`, result);
      return result;
    }
  }

  // Handle RGB colors
  const rgbMatch = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const result = [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
    svgDebugLog(`Parsed RGB:`, result);
    return result;
  }

  // Handle RGBA colors (ignore alpha for now)
  const rgbaMatch = colorStr.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/);
  if (rgbaMatch) {
    const result = [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])];
    svgDebugLog(`Parsed RGBA:`, result);
    return result;
  }

  // Handle common color names with extended palette
  const colorMap = {
    black: [0, 0, 0],
    white: [255, 255, 255],
    red: [255, 0, 0],
    green: [0, 255, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
    orange: [255, 165, 0],
    purple: [128, 0, 128],
    pink: [255, 192, 203],
    brown: [165, 42, 42],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    lime: [0, 255, 0],
    navy: [0, 0, 128],
    teal: [0, 128, 128],
    olive: [128, 128, 0],
    maroon: [128, 0, 0],
    fuchsia: [255, 0, 255],
    aqua: [0, 255, 255],
  };

  const result = colorMap[colorStr.toLowerCase()];
  if (result) {
    svgDebugLog(`Parsed color name "${colorStr}":`, result);
    return result;
  }

  svgDebugLog(`Could not parse color: "${colorStr}"`);
  return null;
}

// Helper function to calculate polygon area (for winding order detection)
function calculatePolygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

// Helper function to check if point is inside polygon (ray casting algorithm)
function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getPathPoints(pathData) {
  const points = [];
  // Updated regex to include all SVG path commands
  const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

  svgDebugLog("Parsing path data:", pathData.substring(0, 100) + "...");
  svgDebugLog("Found commands:", commands?.length || 0);

  if (commands) {
    let currentX = 0,
      currentY = 0;
    let lastControlX = 0,
      lastControlY = 0; // For smooth curve commands
    let subpathStartX = 0,
      subpathStartY = 0; // Track start of current subpath for Z command

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const type = command[0];
      const nextCommand = i < commands.length - 1 ? commands[i + 1][0] : null;
      
      // Robust coordinate parsing for SVG paths
      const coordString = command.slice(1).trim();
      const coords = [];

      // Use regex to match floating point numbers (including negative)
      const numberRegex = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
      let match;
      while ((match = numberRegex.exec(coordString)) !== null) {
        const num = parseFloat(match[0]);
        if (!isNaN(num)) {
          coords.push(num);
        }
      }

      // Debug coordinate parsing for first few commands
      if (i < 3) {
        svgDebugLog(`Command: ${type}, coords:`, coords);
      }

      switch (type.toLowerCase()) {
        case "m": // Move to
          if (coords.length >= 2) {
            currentX = type === type.toUpperCase() ? coords[0] : currentX + coords[0];
            currentY = type === type.toUpperCase() ? coords[1] : currentY + coords[1];
            // Store the start of this subpath
            subpathStartX = currentX;
            subpathStartY = currentY;
            // Add a special marker for M commands to track subpath boundaries
            points.push({ x: currentX, y: currentY, isMoveTo: true });

            // Handle additional coordinate pairs for moveto (treated as lineto after first pair)
            for (let j = 2; j < coords.length; j += 2) {
              if (j + 1 < coords.length) {
                currentX = type === type.toUpperCase() ? coords[j] : currentX + coords[j];
                currentY = type === type.toUpperCase() ? coords[j + 1] : currentY + coords[j + 1];
                points.push({ x: currentX, y: currentY });
              }
            }
          }
          break;
        case "l": // Line to
          if (coords.length >= 2) {
            // Handle all coordinate pairs
            for (let j = 0; j < coords.length; j += 2) {
              if (j + 1 < coords.length) {
                currentX = type === type.toUpperCase() ? coords[j] : currentX + coords[j];
                currentY = type === type.toUpperCase() ? coords[j + 1] : currentY + coords[j + 1];
                points.push({ x: currentX, y: currentY });
              }
            }
          }
          break;

        case "h": // Horizontal line to
          if (coords.length >= 1) {
            currentX = type === "H" ? coords[0] : currentX + coords[0];
            points.push({ x: currentX, y: currentY });
          }
          break;

        case "v": // Vertical line to
          if (coords.length >= 1) {
            currentY = type === "V" ? coords[0] : currentY + coords[0];
            points.push({ x: currentX, y: currentY });
          }
          break;

        case "c": // Cubic Bézier curve
          for (let i = 0; i < coords.length; i += 6) {
            if (i + 5 < coords.length) {
              let cp1x, cp1y, cp2x, cp2y, endX, endY;

              if (type === "C") {
                // Absolute coordinates
                cp1x = coords[i];
                cp1y = coords[i + 1];
                cp2x = coords[i + 2];
                cp2y = coords[i + 3];
                endX = coords[i + 4];
                endY = coords[i + 5];
              } else {
                // Relative coordinates
                cp1x = currentX + coords[i];
                cp1y = currentY + coords[i + 1];
                cp2x = currentX + coords[i + 2];
                cp2y = currentY + coords[i + 3];
                endX = currentX + coords[i + 4];
                endY = currentY + coords[i + 5];
              }

              // Debug first few curve segments
              if (i < 12) {
                svgDebugLog(
                  `Curve ${i / 6}: from (${currentX.toFixed(1)}, ${currentY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`,
                );
              }

              // Approximate Bézier curve with multiple points
              const numPoints = 10;
              for (let j = 0; j <= numPoints; j++) {
                const t = j / numPoints;
                const x =
                  Math.pow(1 - t, 3) * currentX +
                  3 * Math.pow(1 - t, 2) * t * cp1x +
                  3 * (1 - t) * t * t * cp2x +
                  t * t * t * endX;
                const y =
                  Math.pow(1 - t, 3) * currentY +
                  3 * Math.pow(1 - t, 2) * t * cp1y +
                  3 * (1 - t) * t * t * cp2y +
                  t * t * t * endY;
                points.push({ x: x, y: y });
              }

              lastControlX = cp2x;
              lastControlY = cp2y;
              currentX = endX;
              currentY = endY;
            }
          }
          break;

        case "s": // Smooth cubic Bézier curve
          for (let i = 0; i < coords.length; i += 4) {
            if (i + 3 < coords.length) {
              // First control point is reflection of last control point
              const cp1x = 2 * currentX - lastControlX;
              const cp1y = 2 * currentY - lastControlY;
              const cp2x = type === "S" ? coords[i] : currentX + coords[i];
              const cp2y = type === "S" ? coords[i + 1] : currentY + coords[i + 1];
              const endX = type === "S" ? coords[i + 2] : currentX + coords[i + 2];
              const endY = type === "S" ? coords[i + 3] : currentY + coords[i + 3];

              // Approximate Bézier curve with multiple points
              const numPoints = 10;
              for (let t = 0; t <= 1; t += 1 / numPoints) {
                const x =
                  Math.pow(1 - t, 3) * currentX +
                  3 * Math.pow(1 - t, 2) * t * cp1x +
                  3 * (1 - t) * t * t * cp2x +
                  t * t * t * endX;
                const y =
                  Math.pow(1 - t, 3) * currentY +
                  3 * Math.pow(1 - t, 2) * t * cp1y +
                  3 * (1 - t) * t * t * cp2y +
                  t * t * t * endY;
                points.push({ x: x, y: y });
              }

              lastControlX = cp2x;
              lastControlY = cp2y;
              currentX = endX;
              currentY = endY;
            }
          }
          break;

        case "q": // Quadratic Bézier curve
          for (let i = 0; i < coords.length; i += 4) {
            if (i + 3 < coords.length) {
              const cpx = type === "Q" ? coords[i] : currentX + coords[i];
              const cpy = type === "Q" ? coords[i + 1] : currentY + coords[i + 1];
              const endX = type === "Q" ? coords[i + 2] : currentX + coords[i + 2];
              const endY = type === "Q" ? coords[i + 3] : currentY + coords[i + 3];

              // Approximate quadratic Bézier curve
              const numPoints = 8;
              for (let t = 0; t <= 1; t += 1 / numPoints) {
                const x = (1 - t) * (1 - t) * currentX + 2 * (1 - t) * t * cpx + t * t * endX;
                const y = (1 - t) * (1 - t) * currentY + 2 * (1 - t) * t * cpy + t * t * endY;
                points.push({ x: x, y: y });
              }

              lastControlX = cpx;
              lastControlY = cpy;
              currentX = endX;
              currentY = endY;
            }
          }
          break;

        case "a": // Elliptical arc - simplified approximation
          for (let i = 0; i < coords.length; i += 7) {
            if (i + 6 < coords.length) {
              // For now, approximate arc with a straight line
              // Full arc implementation would be quite complex
              const endX = type === "A" ? coords[i + 5] : currentX + coords[i + 5];
              const endY = type === "A" ? coords[i + 6] : currentY + coords[i + 6];

              // Simple approximation - draw multiple points along arc
              const numPoints = 15;
              for (let j = 1; j <= numPoints; j++) {
                const t = j / numPoints;
                const x = currentX + t * (endX - currentX);
                const y = currentY + t * (endY - currentY);
                points.push({ x: x, y: y });
              }

              currentX = endX;
              currentY = endY;
            }
          }
          break;

        case "z": // Close path
          // Close the current subpath by adding a line back to subpath start if not already there
          if (points.length > 0) {
            const lastPoint = points[points.length - 1];
            // Only add closing segment if we're not already at the start point
            if (Math.abs(lastPoint.x - subpathStartX) > 0.001 || Math.abs(lastPoint.y - subpathStartY) > 0.001) {
              points.push({ x: subpathStartX, y: subpathStartY, isClosePath: true });
            } else {
              // Mark the last point as a close path even if we're already at start
              lastPoint.isClosePath = true;
            }
            // Update current position to subpath start
            currentX = subpathStartX;
            currentY = subpathStartY;
          }
          break;
      }
    }
  }

  return points;
}

// New function to organize subpaths into shapes with contours (supports nested holes)
function organizeSubpathsIntoContours(allPoints) {
  // Split points into separate subpaths
  const subpaths = [];
  let currentSubpath = [];
  
  for (let i = 0; i < allPoints.length; i++) {
    const pt = allPoints[i];
    
    if (pt.isMoveTo && currentSubpath.length > 0) {
      // Save previous subpath and start new one
      subpaths.push(currentSubpath);
      currentSubpath = [pt];
    } else {
      currentSubpath.push(pt);
    }
  }
  
  // Don't forget the last subpath
  if (currentSubpath.length > 0) {
    subpaths.push(currentSubpath);
  }
  
  svgDebugLog(`Found ${subpaths.length} subpaths`);
  
  if (subpaths.length === 0) {
    return [];
  }
  
  if (subpaths.length === 1) {
    // Single subpath - return as-is
    return [{ outer: subpaths[0], holes: [] }];
  }
  
  // Calculate winding order and area for each subpath
  const subpathInfo = subpaths.map((subpath, idx) => {
    const area = calculatePolygonArea(subpath);
    return {
      index: idx,
      points: subpath,
      area: Math.abs(area),
      isClockwise: area < 0, // Negative area = clockwise winding
      bounds: calculateSubpathBounds(subpath),
      used: false,
      nestingLevel: 0 // Track nesting depth
    };
  });
  
  // Sort by area (largest first)
  subpathInfo.sort((a, b) => b.area - a.area);
  
  svgDebugLog('Subpath analysis:', subpathInfo.map(s => ({ 
    idx: s.index, 
    area: s.area.toFixed(2), 
    clockwise: s.isClockwise 
  })));
  
  // Build containment hierarchy: determine nesting level for each subpath
  // A subpath's nesting level = number of other subpaths that contain it
  for (let i = 0; i < subpathInfo.length; i++) {
    const testPoint = subpathInfo[i].points[0];
    let nestingCount = 0;
    
    for (let j = 0; j < subpathInfo.length; j++) {
      if (i === j) continue;
      if (isPointInPolygon(testPoint, subpathInfo[j].points)) {
        nestingCount++;
      }
    }
    
    subpathInfo[i].nestingLevel = nestingCount;
    svgDebugLog(`Subpath ${subpathInfo[i].index}: nesting level ${nestingCount}`);
  }
  
  // Organize into shapes with holes
  // Level 0 (even) = filled shapes/islands
  // Level 1 (odd) = holes
  // Level 2 (even) = filled islands within holes
  // etc.
  
  const shapes = [];
  
  // Find all level-0 shapes (outermost shapes, not contained by anything)
  const level0Shapes = subpathInfo.filter(s => s.nestingLevel === 0);
  
  for (const shape of level0Shapes) {
    const holes = [];
    
    // Find all direct holes (level 1 children that are inside this shape)
    for (const potential of subpathInfo) {
      if (potential.nestingLevel !== 1) continue;
      if (potential.used) continue;
      
      const testPoint = potential.points[0];
      if (isPointInPolygon(testPoint, shape.points)) {
        // This is a level-1 hole in this level-0 shape
        // But we need to check if it contains any level-2+ shapes (islands in the hole)
        // Those islands should become separate top-level shapes
        holes.push(potential.points);
        potential.used = true;
        svgDebugLog(`Subpath ${potential.index} (level ${potential.nestingLevel}) is a hole in subpath ${shape.index}`);
      }
    }
    
    shapes.push({
      outer: shape.points,
      holes: holes
    });
    shape.used = true;
  }
  
  // Now handle islands within holes (level 2+)
  // Any even-level subpath that hasn't been used yet is an island that should be its own shape
  for (const potential of subpathInfo) {
    if (potential.used) continue;
    if (potential.nestingLevel % 2 !== 0) continue; // Skip odd levels (those are holes, not shapes)
    
    // This is an island (even nesting level >= 2)
    // Treat it as a new top-level shape
    const holes = [];
    
    // Find holes within this island (odd-level children)
    for (const holeCandidate of subpathInfo) {
      if (holeCandidate.used) continue;
      if (holeCandidate.nestingLevel <= potential.nestingLevel) continue;
      if (holeCandidate.nestingLevel % 2 === 0) continue; // Skip even levels
      
      const testPoint = holeCandidate.points[0];
      if (isPointInPolygon(testPoint, potential.points)) {
        holes.push(holeCandidate.points);
        holeCandidate.used = true;
        svgDebugLog(`Subpath ${holeCandidate.index} (level ${holeCandidate.nestingLevel}) is a hole in island ${potential.index} (level ${potential.nestingLevel})`);
      }
    }
    
    shapes.push({
      outer: potential.points,
      holes: holes
    });
    potential.used = true;
  }
  
  svgDebugLog(`Organized into ${shapes.length} shapes with holes`);
  return shapes;
}

// Helper to calculate bounds of a subpath
function calculateSubpathBounds(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }
  return { minX, minY, maxX, maxY };
}

function calculateBoundingBoxForParts(parts) {
  if (!parts || parts.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  // Helper to apply a candidate bounds
  function includeBounds(b) {
    if (!b) return;
    if (isFinite(b.minX) && isFinite(b.minY) && isFinite(b.maxX) && isFinite(b.maxY)) {
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }
  }

  // Compute bounds per part, preferring shape parameters when available
  for (let part of parts) {
    let b = null;
    const sp = part.shapeParams;
    switch (part.elementType) {
      case "circle":
        if (sp && typeof sp.cx === "number" && typeof sp.cy === "number" && typeof sp.r === "number") {
          b = { minX: sp.cx - sp.r, minY: sp.cy - sp.r, maxX: sp.cx + sp.r, maxY: sp.cy + sp.r };
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
          b = { minX: sp.cx - sp.rx, minY: sp.cy - sp.ry, maxX: sp.cx + sp.rx, maxY: sp.cy + sp.ry };
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
          b = { minX: sp.x, minY: sp.y, maxX: sp.x + sp.w, maxY: sp.y + sp.h };
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
          b = {
            minX: Math.min(sp.x1, sp.x2),
            minY: Math.min(sp.y1, sp.y2),
            maxX: Math.max(sp.x1, sp.x2),
            maxY: Math.max(sp.y1, sp.y2),
          };
        }
        break;
      case "polygon":
      case "polyline":
        if (sp && Array.isArray(sp.coords) && sp.coords.length >= 2) {
          for (let i = 0; i < sp.coords.length; i += 2) {
            const x = sp.coords[i];
            const y = sp.coords[i + 1];
            includeBounds({ minX: x, minY: y, maxX: x, maxY: y });
          }
          continue; // already included all points
        }
        break;
    }

    if (!b) {
      const points = getPathPoints(part.pathData);
      for (let point of points) {
        if (!isNaN(point.x) && !isNaN(point.y)) {
          includeBounds({ minX: point.x, minY: point.y, maxX: point.x, maxY: point.y });
        }
      }
    } else {
      includeBounds(b);
    }
  }

  if (minX !== Infinity && maxX !== -Infinity) {
    const bbox = {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY,
      width: maxX - minX,
      height: maxY - minY,
    };

    svgDebugLog("Calculated bounding box:", bbox);
    return bbox;
  } else {
    console.warn("No valid points found, using default bounding box");
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }
}

function updateSVGPartsList() {
  const container = select("#svg-parts-list");
  container.html(""); // Clear existing content

  if (svgParts.length === 0) {
    const emptyMsg = createDiv("No parts loaded");
    emptyMsg.parent(container);
    emptyMsg.style("color", "#888");
    emptyMsg.style("font-style", "italic");
    return;
  }

  // Create horizontal button layout
  const partsContainer = createDiv();
  partsContainer.parent(container);
  partsContainer.class("parts-button-container");

  svgParts.forEach((part, index) => {
    const partButton = createButton(part.name);
    partButton.parent(partsContainer);

    partButton.class("part-button");

    if (part.selected) {
      partButton.addClass("active");
    }

    // Add color indicators as borders for all buttons
    let colorIndicators = "";
    if (part.strokeSettings.enabled) {
      colorIndicators += `border-left: 8px solid rgb(${part.strokeSettings.color.join(",")});`;
    }
    if (part.fillSettings.enabled) {
      colorIndicators += `border-right: 8px solid rgb(${part.fillSettings.color.join(",")});`;
    }

    if (colorIndicators) {
      partButton.elt.style.cssText += colorIndicators;
    }

    partButton.mousePressed((event) => {
      event && event.stopPropagation && event.stopPropagation();
      selectPart(index, event || window.event);
    });
  });
}

function selectPart(index, event) {
  if (index < 0 || index >= svgParts.length) return;

  const isCtrlOrCmd = event && (event.ctrlKey || event.metaKey || event.shiftKey);

  if (isCtrlOrCmd) {
    // Multi-select mode: toggle selection
    const isSelected = selectedPartIndices.includes(index);
    if (isSelected) {
      // Remove from selection
      selectedPartIndices = selectedPartIndices.filter((i) => i !== index);
      svgParts[index].selected = false;
    } else {
      // Add to selection
      selectedPartIndices.push(index);
      svgParts[index].selected = true;
    }
  } else {
    // Single select mode: clear all and select this one
    svgParts.forEach((part) => (part.selected = false));
    selectedPartIndices = [index];
    svgParts[index].selected = true;
  }

  // Update UI based on selection
  if (selectedPartIndices.length === 1) {
    updatePartSettings(svgParts[selectedPartIndices[0]]);
  } else if (selectedPartIndices.length > 1) {
    // Show first part settings; edits propagate to all selected
    updatePartSettings(svgParts[selectedPartIndices[0]], true);
  } else {
    // No selection: clear settings
    updatePartSettings(null);
  }

  updateSVGPartsList();
  updateInfoTable();
  redraw();
}

function selectAllParts() {
  if (svgParts.length === 0) return;

  // Select all parts
  selectedPartIndices = svgParts.map((_, index) => index);
  svgParts.forEach((part) => (part.selected = true));

  // Update UI: show first part's settings and propagate edits to all
  if (selectedPartIndices.length >= 1) {
    updatePartSettings(svgParts[selectedPartIndices[0]], true);
  }

  updateSVGPartsList();
  updateInfoTable();
  redraw();
}
