/**
 * p5.embroider Preview Viewport Utilities
 * Provides scrollable and scalable preview viewport for embroidery design
 * Call setupPreviewViewport() before beginRecord() to enable pan/zoom preview
 */

// Global preview state
let _previewState = {
  enabled: false,
  scale: 1,
  panX: 0,
  panY: 0,
  minScale: 0.1,
  maxScale: 10,
  isDragging: false,
  isDraggingSlider: false,
  lastMouseX: 0,
  lastMouseY: 0,
  centerX: 0,
  centerY: 0,
};

/**
 * Initialize preview viewport system
 * Call this at the start of draw() to enable pan/zoom functionality
 * @param {Object} options - Viewport configuration
 * @param {number} options.scale - Initial scale (default: 1)
 * @param {number} options.panX - Initial pan X offset (default: 0)
 * @param {number} options.panY - Initial pan Y offset (default: 0)
 * @param {number} options.minScale - Minimum zoom scale (default: 0.1)
 * @param {number} options.maxScale - Maximum zoom scale (default: 10)
 * @param {number} options.centerX - Center X for scaling (default: width/2)
 * @param {number} options.centerY - Center Y for scaling (default: height/2)
 */
export function setupPreviewViewport(options = {}) {
  // Update state but don't apply transformation yet
  if (!_previewState.enabled) {
    _previewState.enabled = true;
    _previewState.scale = options.scale || _previewState.scale || 1;
    _previewState.panX = options.panX !== undefined ? options.panX : _previewState.panX;
    _previewState.panY = options.panY !== undefined ? options.panY : _previewState.panY;
    _previewState.minScale = options.minScale || 0.1;
    _previewState.maxScale = options.maxScale || 10;
    _previewState.centerX = options.centerX || (typeof width !== "undefined" ? width / 2 : 400);
    _previewState.centerY = options.centerY || (typeof height !== "undefined" ? height / 2 : 300);
  }

  // Apply the preview transformation
  push();
  translate(_previewState.centerX + _previewState.panX, _previewState.centerY + _previewState.panY);
  scale(_previewState.scale);
  translate(-_previewState.centerX, -_previewState.centerY);
}

/**
 * End preview viewport transformation
 * Call this at the end of draw() to restore normal coordinate system
 */
export function endPreviewViewport() {
  if (_previewState.enabled) {
    pop();
  }
}

/**
 * Handle mouse wheel zooming (call from mouseWheel event)
 * @param {Object} event - Mouse wheel event
 */
export function handlePreviewZoom(event) {
  if (!_previewState.enabled) return;

  // Prevent default scrolling
  if (event && event.preventDefault) {
    event.preventDefault();
  }

  const zoomFactor = 1.1;
  const delta = event ? event.delta : 0;
  const oldScale = _previewState.scale;

  // Calculate new scale
  let newScale;
  if (delta > 0) {
    newScale = oldScale / zoomFactor;
  } else {
    newScale = oldScale * zoomFactor;
  }

  // Clamp scale to limits
  newScale = Math.max(_previewState.minScale, Math.min(_previewState.maxScale, newScale));

  if (newScale !== oldScale) {
    // Get mouse position relative to canvas center
    const mouseFromCenterX = mouseX - _previewState.centerX;
    const mouseFromCenterY = mouseY - _previewState.centerY;

    // Calculate world position under mouse cursor before zoom
    const worldX = (mouseFromCenterX - _previewState.panX) / oldScale;
    const worldY = (mouseFromCenterY - _previewState.panY) / oldScale;

    // Update scale
    _previewState.scale = newScale;

    // Adjust pan so the same world point is still under the mouse
    _previewState.panX = mouseFromCenterX - worldX * newScale;
    _previewState.panY = mouseFromCenterY - worldY * newScale;
  }

  return false; // Prevent default
}

/**
 * Handle mouse dragging for panning (call from mouseDragged event)
 */
export function handlePreviewPan() {
  if (!_previewState.enabled) return;

  if (_previewState.isDragging) {
    const dx = mouseX - _previewState.lastMouseX;
    const dy = mouseY - _previewState.lastMouseY;

    _previewState.panX += dx;
    _previewState.panY += dy;
  }

  _previewState.lastMouseX = mouseX;
  _previewState.lastMouseY = mouseY;
}

/**
 * Start panning (call from mousePressed event)
 * @param {boolean} condition - Optional condition to enable panning (e.g., specific key held)
 */
export function startPreviewPan(condition = true) {
  if (!_previewState.enabled || !condition) return;

  _previewState.isDragging = true;
  _previewState.lastMouseX = mouseX;
  _previewState.lastMouseY = mouseY;
}

/**
 * Stop panning (call from mouseReleased event)
 */
export function stopPreviewPan() {
  _previewState.isDragging = false;
}

/**
 * Reset viewport to default position and scale
 */
export function resetPreviewViewport() {
  _previewState.scale = 1;
  _previewState.panX = 0;
  _previewState.panY = 0;
}

/**
 * Fit content to viewport
 * @param {Object} bounds - Content bounds {x, y, width, height} in mm
 * @param {number} padding - Padding around content in pixels (default: 50)
 */
export function fitPreviewToContent(bounds, padding = 50) {
  if (!bounds) return;

  const canvasWidth = typeof width !== "undefined" ? width : 800;
  const canvasHeight = typeof height !== "undefined" ? height : 600;

  // Convert bounds to pixels
  const contentWidthPx = mmToPixel(bounds.width);
  const contentHeightPx = mmToPixel(bounds.height);

  // Calculate scale to fit content with padding
  const scaleX = (canvasWidth - padding * 2) / contentWidthPx;
  const scaleY = (canvasHeight - padding * 2) / contentHeightPx;
  const fitScale = Math.min(scaleX, scaleY);

  // Clamp to limits
  _previewState.scale = Math.max(_previewState.minScale, Math.min(_previewState.maxScale, fitScale));

  // Center the content
  const contentCenterXPx = mmToPixel(bounds.x + bounds.width / 2);
  const contentCenterYPx = mmToPixel(bounds.y + bounds.height / 2);

  _previewState.panX = -contentCenterXPx * _previewState.scale + _previewState.centerX;
  _previewState.panY = -contentCenterYPx * _previewState.scale + _previewState.centerY;
}

/**
 * Get current preview state (for debugging or UI display)
 */
export function getPreviewState() {
  return { ..._previewState };
}

/**
 * Convert screen coordinates to world coordinates
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @returns {Object} World coordinates {x, y}
 */
export function screenToWorld(screenX, screenY) {
  if (!_previewState.enabled) {
    return { x: screenX, y: screenY };
  }

  const worldX = (screenX - _previewState.centerX - _previewState.panX) / _previewState.scale + _previewState.centerX;
  const worldY = (screenY - _previewState.centerY - _previewState.panY) / _previewState.scale + _previewState.centerY;

  return { x: worldX, y: worldY };
}

/**
 * Convert world coordinates to screen coordinates
 * @param {number} worldX - World X coordinate
 * @param {number} worldY - World Y coordinate
 * @returns {Object} Screen coordinates {x, y}
 */
export function worldToScreen(worldX, worldY) {
  if (!_previewState.enabled) {
    return { x: worldX, y: worldY };
  }

  const screenX = _previewState.centerX + (worldX - _previewState.centerX) * _previewState.scale + _previewState.panX;
  const screenY = _previewState.centerY + (worldY - _previewState.centerY) * _previewState.scale + _previewState.panY;

  return { x: screenX, y: screenY };
}

/**
 * Draw preview controls - call AFTER endPreviewViewport()
 * Styled like SVG input example with vertical slider and reset button
 * @param {Object} options - UI options
 */
export function drawPreviewControls(options = {}) {
  const { showSlider = true, showResetButton = true } = options;

  if (!_previewState.enabled) return;

  // Get UI layout (matching SVG input exactly)
  const ui = getPreviewUIRects();

  noStroke();

  // Draw reset/recenter button (matching SVG input style)
  if (showResetButton) {
    fill(245);
    rect(ui.recenter.x, ui.recenter.y, ui.recenter.w, ui.recenter.h, 4);

    // Draw crosshair icon
    fill(50);
    const cx = ui.recenter.x + ui.recenter.w / 2;
    const cy = ui.recenter.y + ui.recenter.h / 2;
    rect(cx - 6, cy - 1, 12, 2, 1);
    rect(cx - 1, cy - 6, 2, 12, 1);
  }

  // Draw vertical zoom slider (matching SVG input style)
  if (showSlider) {
    // Slider track
    fill(235);
    rect(ui.sliderTrack.x, ui.sliderTrack.y, ui.sliderTrack.w, ui.sliderTrack.h, 4);

    // Calculate knob position based on scale (matching SVG input mapping)
    const t = Math.max(
      0,
      Math.min(1, (_previewState.scale - _previewState.minScale) / (_previewState.maxScale - _previewState.minScale)),
    );
    const knobY = ui.sliderTrack.y + (1 - t) * (ui.sliderTrack.h - 14);

    // Slider knob
    fill(80);
    rect(ui.sliderTrack.x - 4, knobY, ui.sliderTrack.w + 8, 14, 6);
  }

  return ui;
}

/**
 * Get preview UI layout rectangles (matching SVG input exactly)
 * @returns {Object} UI element rectangles
 */
function getPreviewUIRects() {
  const canvasWidth = (typeof globalThis !== "undefined" && globalThis.width) || 800;
  const canvasHeight = (typeof globalThis !== "undefined" && globalThis.height) || 600;

  const margin = 40;
  const sliderWidth = 10;
  const knobHeight = 14;
  const recenterSize = 24;
  const recenterX = canvasWidth - margin - recenterSize;
  const recenterY = margin;
  const spacing = 8;

  // Center slider under recenter button
  const sliderX = recenterX + (recenterSize - sliderWidth) / 2;
  const sliderY = recenterY + recenterSize + spacing;
  const sliderHeight = Math.max(100, canvasHeight - sliderY - margin);

  return {
    sliderTrack: { x: sliderX, y: sliderY, w: sliderWidth, h: sliderHeight },
    sliderKnob: { x: sliderX - 4, y: sliderY, w: sliderWidth + 8, h: knobHeight },
    recenter: { x: recenterX, y: recenterY, w: recenterSize, h: recenterSize },
  };
}

/**
 * Check if point is inside rectangle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {Object} rect - Rectangle {x, y, w, h}
 * @returns {boolean} True if point is inside rectangle
 */
function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

/**
 * Handle mouse press on preview controls
 * Call this from mousePressed() after checking if mouse is over controls
 * @param {number} mouseX - Mouse X coordinate
 * @param {number} mouseY - Mouse Y coordinate
 * @returns {boolean} True if controls handled the event
 */
export function handlePreviewControlsPressed(mouseX, mouseY) {
  if (!_previewState.enabled) return false;

  const ui = getPreviewUIRects();

  // Check recenter button
  if (pointInRect(mouseX, mouseY, ui.recenter)) {
    resetPreviewViewport();
    return true;
  }

  // Check slider track
  if (pointInRect(mouseX, mouseY, ui.sliderTrack)) {
    updateScaleFromMouse(mouseY);
    _previewState.isDraggingSlider = true;
    return true;
  }

  return false;
}

/**
 * Handle mouse drag on preview controls
 * Call this from mouseDragged()
 * @param {number} mouseY - Mouse Y coordinate
 */
export function handlePreviewControlsDragged(mouseY) {
  if (!_previewState.enabled || !_previewState.isDraggingSlider) return;

  updateScaleFromMouse(mouseY);
}

/**
 * Handle mouse release on preview controls
 * Call this from mouseReleased()
 */
export function handlePreviewControlsReleased() {
  _previewState.isDraggingSlider = false;
}

/**
 * Update scale from mouse Y position on slider
 * @param {number} mouseY - Mouse Y coordinate
 */
function updateScaleFromMouse(mouseY) {
  const ui = getPreviewUIRects();
  const t = Math.max(0, Math.min(1, (mouseY - ui.sliderTrack.y) / (ui.sliderTrack.h - 14)));
  const targetScale = _previewState.maxScale + t * (_previewState.minScale - _previewState.maxScale);

  const oldScale = _previewState.scale;
  const newScale = Math.max(_previewState.minScale, Math.min(_previewState.maxScale, targetScale));

  if (newScale !== oldScale) {
    // For slider zoom, keep the current view center stable
    // This provides predictable behavior when using the slider
    const scaleDelta = newScale / oldScale;

    // Adjust pan to keep current view centered
    _previewState.panX *= scaleDelta;
    _previewState.panY *= scaleDelta;
    _previewState.scale = newScale;
  }
}

// ── Millimetre grid ─────────────────────────────────────────────

/** Canvas px per mm at 96 dpi (same as mmToPixel(1)). */
const GRID_PX_PER_MM = 96 / 25.4;
/** Thickness of the top/left ruler strips (CSS px). */
const GRID_RULER_PX = 16;

/** Candidate minor steps (mm) and the major step each one pairs with. */
const GRID_STEPS = [
  { minor: 1, major: 10 },
  { minor: 2, major: 10 },
  { minor: 5, major: 50 },
  { minor: 10, major: 50 },
  { minor: 20, major: 100 },
  { minor: 50, major: 500 },
  { minor: 100, major: 500 },
];

/**
 * Picks grid spacing for a zoom level: the finest minor step whose lines are
 * at least `minScreenPx` apart on screen, and its major step.
 * @param {number} pxPerMm - Screen px per mm (CSS px)
 * @param {number} [minScreenPx=6] - Smallest gap allowed between minor lines
 * @returns {{minorMm:number, majorMm:number}}
 */
export function chooseGridSteps(pxPerMm, minScreenPx = 6) {
  const fit = GRID_STEPS.find((s) => s.minor * pxPerMm >= minScreenPx);
  const steps = fit || GRID_STEPS[GRID_STEPS.length - 1];
  return { minorMm: steps.minor, majorMm: steps.major };
}

/**
 * The world-space rectangle visible on the canvas, given the current canvas
 * transform (a DOMMatrix-like {a,b,c,d,e,f} in device px).
 * @param {{a:number,b:number,c:number,d:number,e:number,f:number}} m - Current transform
 * @param {number} canvasWidth - Canvas width in CSS px
 * @param {number} canvasHeight - Canvas height in CSS px
 * @param {number} [pd=1] - pixelDensity()
 * @returns {{x0:number, y0:number, x1:number, y1:number}} World px bounds
 */
export function visibleWorldRect(m, canvasWidth, canvasHeight, pd = 1) {
  const det = m.a * m.d - m.b * m.c;
  if (!det) return { x0: 0, y0: 0, x1: canvasWidth, y1: canvasHeight };
  // Inverse of [a c e; b d f] applied to device-px corners
  const toWorld = (sx, sy) => {
    const dx = sx * pd - m.e;
    const dy = sy * pd - m.f;
    return { x: (m.d * dx - m.c * dy) / det, y: (-m.b * dx + m.a * dy) / det };
  };
  const corners = [toWorld(0, 0), toWorld(canvasWidth, 0), toWorld(0, canvasHeight), toWorld(canvasWidth, canvasHeight)];
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

const GRID_DEFAULT_COLORS = {
  minor: [0, 0, 0, 0.06],
  major: [0, 0, 0, 0.14],
  axis: [0, 0, 0, 0.32],
  bounds: [26, 140, 120, 0.85],
  label: [0, 0, 0, 0.55],
  rulerBg: [255, 255, 255, 0.75],
};

function _rgba(c) {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c.length > 3 ? c[3] : 1})`;
}

/**
 * Draw a zoom-adaptive millimetre grid for the current view, with ruler-style
 * labels along the top and left edges and an optional outlined size area.
 *
 * Call it inside the preview viewport (after setupPreviewViewport() and any
 * translate to the design origin) and OUTSIDE beginRecord()/endRecord(). It
 * draws with the raw 2D canvas API, so it is never recorded as stitches.
 * The current origin is 0 mm. Only the 2D renderer is supported.
 *
 * @method drawPreviewGrid
 * @for p5
 * @param {Object} [options]
 * @param {{width:number,height:number}} [options.bounds] - Area in mm from the origin to outline and label "W × H mm"
 * @param {number|string} [options.minorMm="auto"] - Fixed minor spacing in mm, or "auto" from the zoom
 * @param {number} [options.minScreenPx=6] - Smallest on-screen gap between minor lines (auto mode)
 * @param {boolean} [options.labels=true] - Ruler labels along the top and left canvas edges
 * @param {boolean} [options.axis=true] - Stronger lines through 0 mm
 * @param {string} [options.extent="viewport"] - "viewport" fills the visible area; "bounds" clips to options.bounds
 * @param {Object} [options.colors] - Override any of {minor, major, axis, bounds, label, rulerBg} as [r,g,b,a(0-1)]
 * @returns {{minorMm:number, majorMm:number, pxPerMm:number}|null} What was drawn, or null without a 2D context
 * @example
 * function draw() {
 *   background(255);
 *   setupPreviewViewport();
 *   drawPreviewGrid({ bounds: { width: 100, height: 100 } });
 *   beginRecord();
 *   // ... embroidery ...
 *   endRecord();
 *   endPreviewViewport();
 * }
 */
export function drawPreviewGrid(options = {}) {
  const ctx = typeof drawingContext !== "undefined" ? drawingContext : globalThis.drawingContext;
  if (!ctx || typeof ctx.getTransform !== "function") return null;

  const {
    bounds = null,
    minorMm = "auto",
    minScreenPx = 6,
    labels = true,
    axis = true,
    extent = "viewport",
  } = options;
  const colors = { ...GRID_DEFAULT_COLORS, ...(options.colors || {}) };

  const pd = typeof pixelDensity === "function" ? pixelDensity() : 1;
  const canvasWidth = typeof width !== "undefined" ? width : globalThis.width || 800;
  const canvasHeight = typeof height !== "undefined" ? height : globalThis.height || 600;
  const m = ctx.getTransform();

  // Uniform world->CSS-px scale of the current transform
  const scaleCss = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) / pd;
  const pxPerMm = GRID_PX_PER_MM * scaleCss;
  const steps =
    typeof minorMm === "number" && minorMm > 0
      ? { minorMm, majorMm: minorMm * 10 }
      : chooseGridSteps(pxPerMm, minScreenPx);

  // Visible area in mm, optionally clipped to the bounds
  const vis = visibleWorldRect(m, canvasWidth, canvasHeight, pd);
  let mx0 = vis.x0 / GRID_PX_PER_MM;
  let my0 = vis.y0 / GRID_PX_PER_MM;
  let mx1 = vis.x1 / GRID_PX_PER_MM;
  let my1 = vis.y1 / GRID_PX_PER_MM;
  if (extent === "bounds" && bounds) {
    mx0 = Math.max(mx0, 0);
    my0 = Math.max(my0, 0);
    mx1 = Math.min(mx1, bounds.width);
    my1 = Math.min(my1, bounds.height);
  }

  const toScreen = (wx, wy) => ({
    x: (m.a * wx + m.c * wy + m.e) / pd,
    y: (m.b * wx + m.d * wy + m.f) / pd,
  });
  const onMajor = (v) => Math.abs(v / steps.majorMm - Math.round(v / steps.majorMm)) < 1e-6;

  ctx.save();
  // Work in CSS-px screen space so lines are crisp hairlines at any zoom
  ctx.setTransform(pd, 0, 0, pd, 0, 0);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  const strokeLines = (color, filter) => {
    ctx.beginPath();
    for (let v = Math.ceil(mx0 / steps.minorMm) * steps.minorMm; v <= mx1 + 1e-9; v += steps.minorMm) {
      const mm = Math.round(v / steps.minorMm) * steps.minorMm;
      if (!filter(mm)) continue;
      const a = toScreen(mm * GRID_PX_PER_MM, my0 * GRID_PX_PER_MM);
      const b = toScreen(mm * GRID_PX_PER_MM, my1 * GRID_PX_PER_MM);
      ctx.moveTo(Math.round(a.x) + 0.5, a.y);
      ctx.lineTo(Math.round(b.x) + 0.5, b.y);
    }
    for (let v = Math.ceil(my0 / steps.minorMm) * steps.minorMm; v <= my1 + 1e-9; v += steps.minorMm) {
      const mm = Math.round(v / steps.minorMm) * steps.minorMm;
      if (!filter(mm)) continue;
      const a = toScreen(mx0 * GRID_PX_PER_MM, mm * GRID_PX_PER_MM);
      const b = toScreen(mx1 * GRID_PX_PER_MM, mm * GRID_PX_PER_MM);
      ctx.moveTo(a.x, Math.round(a.y) + 0.5);
      ctx.lineTo(b.x, Math.round(b.y) + 0.5);
    }
    ctx.strokeStyle = _rgba(color);
    ctx.stroke();
  };

  strokeLines(colors.minor, (mm) => !onMajor(mm));
  strokeLines(colors.major, (mm) => onMajor(mm) && !(axis && mm === 0));
  if (axis) strokeLines(colors.axis, (mm) => mm === 0);

  // Size area outline + "W × H mm" tag
  if (bounds && bounds.width > 0 && bounds.height > 0) {
    const tl = toScreen(0, 0);
    const br = toScreen(bounds.width * GRID_PX_PER_MM, bounds.height * GRID_PX_PER_MM);
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = _rgba(colors.bounds);
    ctx.strokeRect(Math.round(tl.x) + 0.5, Math.round(tl.y) + 0.5, Math.round(br.x - tl.x), Math.round(br.y - tl.y));
    ctx.setLineDash([]);
    const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = _rgba(colors.bounds);
    // Keep the tag readable when the area's left edge is under the ruler or off screen
    const tagX = Math.max(Math.round(tl.x), labels ? GRID_RULER_PX + 2 : 2);
    ctx.fillText(`${fmt(bounds.width)} × ${fmt(bounds.height)} mm`, tagX, Math.round(br.y) + 4);
  }

  // Ruler labels along the top and left canvas edges
  if (labels) {
    const ruler = GRID_RULER_PX;
    ctx.fillStyle = _rgba(colors.rulerBg);
    ctx.fillRect(0, 0, canvasWidth, ruler);
    ctx.fillRect(0, 0, ruler, canvasHeight);
    ctx.font = "10px sans-serif";
    ctx.fillStyle = _rgba(colors.label);
    ctx.strokeStyle = _rgba(colors.label);
    const label = (mm) => (mm === 0 ? "0 mm" : String(mm));

    // Top ruler: x positions
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let lastRight = -Infinity;
    ctx.beginPath();
    for (let v = Math.ceil(mx0 / steps.majorMm) * steps.majorMm; v <= mx1 + 1e-9; v += steps.majorMm) {
      const mm = Math.round(v / steps.majorMm) * steps.majorMm;
      const x = Math.round(toScreen(mm * GRID_PX_PER_MM, 0).x) + 0.5;
      if (x < ruler) continue;
      ctx.moveTo(x, ruler - 5);
      ctx.lineTo(x, ruler);
      const text = label(mm);
      if (x + 2 > lastRight + 6) {
        ctx.fillText(text, x + 2, ruler / 2 - 1);
        lastRight = x + 2 + ctx.measureText(text).width;
      }
    }
    // Left ruler: y positions, text rotated to run along the edge
    let lastBottom = -Infinity;
    for (let v = Math.ceil(my0 / steps.majorMm) * steps.majorMm; v <= my1 + 1e-9; v += steps.majorMm) {
      const mm = Math.round(v / steps.majorMm) * steps.majorMm;
      const y = Math.round(toScreen(0, mm * GRID_PX_PER_MM).y) + 0.5;
      if (y < ruler) continue;
      ctx.moveTo(ruler - 5, y);
      ctx.lineTo(ruler, y);
      const text = label(mm);
      const w = ctx.measureText(text).width;
      if (y + 2 > lastBottom + 6) {
        ctx.save();
        ctx.translate(ruler / 2 - 1, y + 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(text, 0, 0);
        ctx.restore();
        lastBottom = y + 2 + w;
      }
    }
    ctx.stroke();
  }

  ctx.restore();
  return { minorMm: steps.minorMm, majorMm: steps.majorMm, pxPerMm };
}
