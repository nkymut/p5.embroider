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
  centerY: 0
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
    _previewState.centerX = options.centerX || (typeof width !== 'undefined' ? width / 2 : 400);
    _previewState.centerY = options.centerY || (typeof height !== 'undefined' ? height / 2 : 300);
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
  
  const canvasWidth = typeof width !== 'undefined' ? width : 800;
  const canvasHeight = typeof height !== 'undefined' ? height : 600;
  
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
  const {
    showSlider = true,
    showResetButton = true
  } = options;
  
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
    const t = Math.max(0, Math.min(1, (_previewState.scale - _previewState.minScale) / (_previewState.maxScale - _previewState.minScale)));
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
  const canvasWidth = (typeof globalThis !== 'undefined' && globalThis.width) || 800;
  const canvasHeight = (typeof globalThis !== 'undefined' && globalThis.height) || 600;
  
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
    recenter: { x: recenterX, y: recenterY, w: recenterSize, h: recenterSize }
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