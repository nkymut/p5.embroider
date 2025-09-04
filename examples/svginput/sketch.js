// SVG Object-Based Input Example for p5.embroider
// This example demonstrates loading SVGs as structured objects with individual settings

let selectedPartIndices = []; // Array of selected part indices for multiple selection
let drawMode = "p5";

// Global default settings
let globalSettings = {
  outputWidth: 100,
  outputHeight: 100,
  lockAspectRatio: true,
  outlineOffset: 2,
  outlineType: "convex",
  dpi: 96,
  adobeDPI: false,
};

let boundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
let outputWidthControl, outputHeightControl;

// Preview-only pan/zoom (does not affect recorded embroidery)
let previewScale = 1;
let previewPanX = 0;
let previewPanY = 0;
let minPreviewScale = 0.5;
let maxPreviewScale = 5;
let isDraggingScale = false;
let isPreviewInteracting = false;
let isPanning = false;
let hoverPartIndex = -1;
let lastMousePos = { x: 0, y: 0 };
let moveKeyHeld = false; // true while 'm' is held
// Group drag state for multi-select transforms
let groupDrag = {
  active: false,
  type: null, // 'move' | 'corner' | 'rotate'
  startMouseModel: { x: 0, y: 0 },
  groupCenter: { x: 0, y: 0 },
  startVec: { x: 0, y: 0 },
  startDist: 0,
  startAngle: 0,
  parts: [], // { index, tx0, ty0, sx0, sy0, rot0, center0:{x,y} }
};

// Interactive edit drag state
let editDrag = {
  active: false,
  type: null, // 'move' | 'corner' | 'rotate'
  corner: null, // 'nw','ne','se','sw'
  startMouseMm: { x: 0, y: 0 },
  startCenterMm: { x: 0, y: 0 },
  startWidthMm: 0,
  startHeightMm: 0,
  startRotation: 0,
  startSx: 1,
  startSy: 1,
  baseCx0: 0,
  baseCy0: 0,
};

function setup() {
  // Create canvas
  let canvas = createCanvas(400, 400);
  canvas.parent("canvas-wrapper");

  // Use noLoop since embroidery only needs to render when changed
  //noLoop();

  createUI();

  // Initialize info display
  updateInfoDisplay();

  // Size canvas to fit the preview window after UI loads
  setTimeout(() => {
    resizeCanvasToPreviewWindow();
  }, 100);

  // Load default SVG
  loadPreset(1);
}

function resizeCanvasToPreviewWindow() {
  const canvasWrapper = document.getElementById("canvas-wrapper");
  if (!canvasWrapper) return;

  const wrapperRect = canvasWrapper.getBoundingClientRect();
  const availableWidth = wrapperRect.width - 0; // Leave some padding
  const availableHeight = wrapperRect.height - 0; // Leave some padding

  // Use the smaller dimension to maintain a square canvas that fits
  const canvasSize = Math.min(availableWidth, availableHeight);
  const finalSize = Math.max(canvasSize, 300); // Minimum size of 300px

  //resizeCanvas(finalSize, finalSize);
  resizeCanvas(availableWidth, availableHeight);
  redraw();
}

function windowResized() {
  resizeCanvasToPreviewWindow();
}

// ----- Preview UI overlay -----
function getPreviewUIRects() {
  const margin = 40;
  const sliderWidth = 10;
  const knobHeight = 14;
  const recenterSize = 24;
  const recenterX = width - margin - recenterSize;
  const recenterY = margin;
  const spacing = 8;
  // Center slider under recenter button
  const sliderX = recenterX + (recenterSize - sliderWidth) / 2;
  const sliderY = recenterY + recenterSize + spacing;
  const sliderHeight = Math.max(100, height - sliderY - margin);

  return {
    sliderTrack: { x: sliderX, y: sliderY, w: sliderWidth, h: sliderHeight },
    sliderKnob: { x: sliderX - 4, y: sliderY, w: sliderWidth + 8, h: knobHeight }, // y updated when drawing
    recenter: { x: recenterX, y: recenterY, w: recenterSize, h: recenterSize },
  };
}

function drawPreviewUIOverlay() {
  const ui = getPreviewUIRects();
  noStroke();

  // Recenter button
  fill(245);
  rect(ui.recenter.x, ui.recenter.y, ui.recenter.w, ui.recenter.h, 4);
  fill(50);
  const cx = ui.recenter.x + ui.recenter.w / 2;
  const cy = ui.recenter.y + ui.recenter.h / 2;
  rect(cx - 6, cy - 1, 12, 2, 1);
  rect(cx - 1, cy - 6, 2, 12, 1);

  // Slider track
  fill(235);
  rect(ui.sliderTrack.x, ui.sliderTrack.y, ui.sliderTrack.w, ui.sliderTrack.h, 4);

  // Slider knob position based on previewScale
  const t = map(previewScale, minPreviewScale, maxPreviewScale, 1, 0, true);
  const knobY = ui.sliderTrack.y + t * (ui.sliderTrack.h - 14);
  fill(80);
  rect(ui.sliderTrack.x - 4, knobY, ui.sliderTrack.w + 8, 14, 6);
}

function updateScaleFromMouse(my) {
  const ui = getPreviewUIRects();
  const t = constrain((my - ui.sliderTrack.y) / (ui.sliderTrack.h - 14), 0, 1);
  const targetScale = lerp(maxPreviewScale, minPreviewScale, t);

  const oldScale = previewScale;
  const newScale = constrain(targetScale, minPreviewScale, maxPreviewScale);
  if (newScale !== oldScale) {
    // Anchor zoom to drawing center (no pan adjustment)
    previewScale = newScale;
  }
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Default settings for different stitch modes
const STROKE_MODE_DEFAULTS = {
  straight: { weight: 1, stitchLength: 2 },
  zigzag: { weight: 3, stitchLength: 0.8 },
  lines: { weight: 1.5, stitchLength: 1.5 },
  sashiko: { weight: 2, stitchLength: 4 },
};

const FILL_MODE_DEFAULTS = {
  tatami: { stitchLength: 3, rowSpacing: 0.8 },
  satin: { stitchLength: 1, rowSpacing: 0.4 },
  spiral: { stitchLength: 2, rowSpacing: 1 },
};

function applyStrokeModeDefaults(part, mode) {
  const defaults = STROKE_MODE_DEFAULTS[mode];
  if (defaults) {
    part.strokeSettings.weight = defaults.weight;
    part.strokeSettings.stitchLength = defaults.stitchLength;
  }
}

function applyFillModeDefaults(part, mode) {
  const defaults = FILL_MODE_DEFAULTS[mode];
  if (defaults) {
    part.fillSettings.stitchLength = defaults.stitchLength;
    part.fillSettings.rowSpacing = defaults.rowSpacing;
  }
}

function setupMainTabs() {
  // Get all main tab buttons and add click handlers
  const mainTabButtons = document.querySelectorAll(".main-tab-button");
  const mainTabPanes = document.querySelectorAll(".main-tab-pane");

  mainTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");

      // Remove active class from all buttons and panes
      mainTabButtons.forEach((btn) => btn.classList.remove("active"));
      mainTabPanes.forEach((pane) => pane.classList.remove("active"));

      // Add active class to clicked button and corresponding pane
      button.classList.add("active");
      document.getElementById(`${targetTab}-tab`).classList.add("active");

      // Update info table when Info tab is activated
      if (targetTab === "info") {
        updateInfoTable();
      }
    });
  });
}

function updateCanvasTitle(filename) {
  const titleElement = document.getElementById("canvas-title");
  if (titleElement) {
    if (filename) {
      titleElement.textContent = `SVG2Embroider - ${filename}`;
    } else {
      titleElement.textContent = "SVG2Embroider";
    }
  }
}

function createUI() {
  // Get container elements
  const modeButtonsContainer = select("#mode-buttons");
  const mainActionButtonsContainer = select("#main-action-buttons");
  const svgPresetsContainer = select("#svg-presets");
  const svgInputContainer = select("#svg-input-container");
  const svgButtonsContainer = select("#svg-buttons");
  const partsControlsContainer = select("#parts-controls");
  const svgPartsContainer = select("#svg-parts-list");
  const partSettingsContainer = select("#part-settings");
  const infoDisplayContainer = select("#info-display");
  const dimensionControlsContainer = select("#dimension-controls");

  // Mode buttons
  const stitchButton = createButton("Stitch")
    .parent(modeButtonsContainer)
    .class("small")
    .mousePressed(() => {
      drawMode = "stitch";
      updateModeButtonStates();
      redraw();
    });

  const realisticButton = createButton("Realistic")
    .parent(modeButtonsContainer)
    .class("small")
    .mousePressed(() => {
      drawMode = "realistic";
      updateModeButtonStates();
      redraw();
    });

  const p5Button = createButton("p5")
    .parent(modeButtonsContainer)
    .class("small")
    .mousePressed(() => {
      drawMode = "p5";
      updateModeButtonStates();
      redraw();
    });

  // Store references for button state updates
  window.modeButtons = { stitch: stitchButton, realistic: realisticButton, p5: p5Button };

  function updateModeButtonStates() {
    stitchButton.removeClass("active");
    realisticButton.removeClass("active");
    p5Button.removeClass("active");

    if (drawMode === "stitch") stitchButton.addClass("active");
    else if (drawMode === "realistic") realisticButton.addClass("active");
    else if (drawMode === "p5") p5Button.addClass("active");
  }
  updateModeButtonStates();

  // Preset buttons
  createButton("1")
    .parent(svgPresetsContainer)
    .class("small secondary")
    .mousePressed(() => loadPreset(1));
  createButton("2")
    .parent(svgPresetsContainer)
    .class("small secondary")
    .mousePressed(() => loadPreset(2));
  createButton("3")
    .parent(svgPresetsContainer)
    .class("small secondary")
    .mousePressed(() => loadPreset(3));
  createButton("4")
    .parent(svgPresetsContainer)
    .class("small secondary")
    .mousePressed(() => loadPreset(4));

  // SVG upload button (aligned with presets)
  createButton("Upload SVG")
    .parent(svgPresetsContainer)
    .class("small secondary")
    .mousePressed(() => {
      // Create hidden file input
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".svg,image/svg+xml";
      fileInput.style.display = "none";

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          handleSVGFileUpload(file);
        }
      });

      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    });

  // Parts control buttons
  createButton("Select All")
    .parent(partsControlsContainer)
    .class("small secondary")
    .mousePressed(() => selectAllParts());
  createButton("Clear")
    .parent(partsControlsContainer)
    .class("small secondary")
    .mousePressed(() => clearSelection());

  // SVG input
  svgInput = createTextAreaControl(svgInputContainer, "", "Paste your SVG code here...", 150);

  // Adobe checkbox in SVG Input area
  (function () {
    const adobeRow = createDiv();
    adobeRow.parent(svgInputContainer);
    adobeRow.addClass && adobeRow.addClass("form-row");
    const adobeWrap = createDiv();
    adobeWrap.parent(adobeRow);
    adobeWrap.addClass && adobeWrap.addClass("form-field");
    const adobeCheckbox = createCheckboxControl(adobeWrap, "Adobe (72 dpi)", !!globalSettings.adobeDPI, (checked) => {
      globalSettings.adobeDPI = checked;
      if (checked) {
        globalSettings.dpi = 72;
      }
      if (svgInput && svgInput.value && svgInput.value().trim()) {
        loadSVGFromTextArea(false);
      }
      updateInfoTable();
      redraw();
    });
  })();

  createButton("Load SVG")
    .parent(svgButtonsContainer)
    .class("primary")
    .mousePressed(() => loadSVGFromTextArea());

  createButton("Add SVG Parts")
    .parent(svgButtonsContainer)
    .class("secondary")
    .mousePressed(() => loadSVGFromTextArea(true));

  createButton("Clear")
    .parent(svgButtonsContainer)
    .class("secondary")
    .mousePressed(() => clearCanvas());

  // Initialize info display in right sidebar
  updateInfoDisplay();
  // Initialize right panel with correct form for current selection
  if (selectedPartIndices.length > 1) {
    updateMultiPartSettings();
  } else if (selectedPartIndices.length === 1) {
    updatePartSettings(svgParts[selectedPartIndices[0]]);
  }

  // Dimension controls
  // DPI before Width and Height sliders
  const dpiRow = createDiv();
  dpiRow.parent(dimensionControlsContainer);
  dpiRow.addClass && dpiRow.addClass("form-row");
  const dpiWrap = createDiv();
  dpiWrap.parent(dpiRow);
  dpiWrap.addClass && dpiWrap.addClass("form-field");
  const dpiLabel = createDiv("DPI");
  dpiLabel.parent(dpiWrap);
  dpiLabel.addClass && dpiLabel.addClass("control-label");
  const dpiInput = createInput(String(globalSettings.dpi || 96), "number");
  dpiInput.parent(dpiWrap);
  dpiInput.addClass && dpiInput.addClass("value-input");
  dpiInput.attribute("step", "1");
  dpiInput.attribute("min", "36");
  dpiInput.attribute("max", "600");
  dpiInput.style && dpiInput.style("width", "80px");
  const stopEvtDpi = (elt) => {
    ["keydown", "keyup", "keypress", "wheel", "mousedown"].forEach((evt) => {
      elt.addEventListener(evt, (e) => e.stopPropagation());
    });
  };
  stopEvtDpi(dpiInput.elt);
  dpiInput.changed(() => {
    const v = parseFloat(dpiInput.value());
    if (!isNaN(v) && v > 0) {
      globalSettings.dpi = Math.max(1, Math.min(1000, Math.round(v)));
      if (globalSettings.dpi !== 72 && globalSettings.adobeDPI) {
        globalSettings.adobeDPI = false;
      }
      if (svgInput && svgInput.value && svgInput.value().trim()) {
        loadSVGFromTextArea(false);
      }
      updateInfoTable();
      redraw();
    }
  });
  outputWidthControl = createSliderControl(
    dimensionControlsContainer,
    "Width (mm)",
    10,
    300,
    globalSettings.outputWidth,
    5,
    (value) => {
      globalSettings.outputWidth = value;
      if (globalSettings.lockAspectRatio && boundingBox.width > 0 && boundingBox.height > 0) {
        const aspectRatio = boundingBox.width / boundingBox.height;
        globalSettings.outputHeight = globalSettings.outputWidth / aspectRatio;
        if (outputHeightControl) {
          outputHeightControl.slider.value(globalSettings.outputHeight);
          outputHeightControl.valueDisplay.html(Math.round(globalSettings.outputHeight));
        }
      }
      updateInfoTable();
      redraw();
    },
  );

  outputHeightControl = createSliderControl(
    dimensionControlsContainer,
    "Height (mm)",
    10,
    300,
    globalSettings.outputHeight,
    5,
    (value) => {
      globalSettings.outputHeight = value;
      if (globalSettings.lockAspectRatio && boundingBox.width > 0 && boundingBox.height > 0) {
        const aspectRatio = boundingBox.width / boundingBox.height;
        globalSettings.outputWidth = globalSettings.outputHeight * aspectRatio;
        if (outputWidthControl) {
          outputWidthControl.slider.value(globalSettings.outputWidth);
          outputWidthControl.valueDisplay.html(Math.round(globalSettings.outputWidth));
        }
      }
      updateInfoTable();
      redraw();
    },
  );

  createCheckboxControl(dimensionControlsContainer, "Lock Aspect Ratio", globalSettings.lockAspectRatio, (checked) => {
    globalSettings.lockAspectRatio = checked;
    if (globalSettings.lockAspectRatio && boundingBox.width > 0 && boundingBox.height > 0) {
      const aspectRatio = boundingBox.width / boundingBox.height;
      globalSettings.outputHeight = globalSettings.outputWidth / aspectRatio;
      if (outputHeightControl) {
        outputHeightControl.slider.value(globalSettings.outputHeight);
        outputHeightControl.valueDisplay.html(Math.round(globalSettings.outputHeight));
      }
    }
    updateInfoTable();
    redraw();
  });

  // Export buttons section
  createDiv("Export Options")
    .parent(dimensionControlsContainer)
    .style("font-weight", "600")
    .style("margin", "16px 0 8px 0")
    .style("padding-bottom", "8px")
    .style("border-bottom", "1px solid #ddd");

  // (DPI UI moved elsewhere per request)

  createButton("Export DST")
    .parent(dimensionControlsContainer)
    .class("secondary")
    .mousePressed(() => {
      if (svgParts.length > 0) {
        exportEmbroidery("svg_objects.dst");
      } else {
        console.warn("No SVG loaded to export");
      }
    });

  createButton("Export SVG")
    .parent(dimensionControlsContainer)
    .class("secondary")
    .mousePressed(() => {
      if (svgParts.length > 0) {
        exportSVG();
      } else {
        console.warn("No SVG loaded to export");
      }
    });

  createButton("Export PNG")
    .parent(dimensionControlsContainer)
    .class("secondary")
    .mousePressed(() => {
      if (svgParts.length > 0) {
        exportPNG();
      } else {
        console.warn("No SVG loaded to export");
      }
    });

  createButton("Export Outline")
    .parent(dimensionControlsContainer)
    .class("secondary")
    .mousePressed(() => {
      if (svgParts.length > 0) {
        exportOutline();
      } else {
        console.warn("No SVG loaded to export");
      }
    });

  // Main action buttons (Import/Export in header)
  createButton("Import")
    .parent(mainActionButtonsContainer)
    .class("secondary")
    .mousePressed(() => {
      // Create hidden file input
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".svg,image/svg+xml";
      fileInput.style.display = "none";

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          handleSVGFileUpload(file);
        }
      });

      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    });

  // Export dropdown/menu in header
  createButton("Export DST")
    .parent(mainActionButtonsContainer)
    .mousePressed(() => {
      if (svgParts.length > 0) {
        exportEmbroidery("svg_objects.dst");
      } else {
        console.warn("No SVG loaded to export");
      }
    });

  // No more tabs needed in the new layout
  //setupMainTabs();
}

function draw() {
  background(255, 255, 240);

  if (svgParts.length === 0) {
    noStroke();
    fill(150);
    textAlign(CENTER, CENTER);
    textSize(16);
    text("No SVG loaded", width / 2, height / 2);
    return;
  }

  // Hover hit-test updates
  updateHoverHitTest();

  // Apply preview-only transforms (visual only)
  push();
  // Center the embroidery output area in the canvas
  const centerOffsetX = (width - mmToPixel(globalSettings.outputWidth)) / 2;
  const centerOffsetY = (height - mmToPixel(globalSettings.outputHeight)) / 2;
  translate(centerOffsetX, centerOffsetY);
  // Apply pan and zoom around canvas center
  translate(width / 2 + previewPanX, height / 2 + previewPanY);
  scale(previewScale);
  translate(-width / 2, -height / 2);

  // Start embroidery recording (recorded geometry not affected by above transforms)
  beginRecord(this);
  setDrawMode(drawMode);

  // Draw each SVG part with its individual settings
  push();

  // Calculate scaling and positioning
  const scaleXmm = (globalSettings.outputWidth * 0.9) / boundingBox.width;
  const scaleYmm = (globalSettings.outputHeight * 0.9) / boundingBox.height;
  const scaleFactor = min(scaleXmm, scaleYmm);

  const offsetX = (globalSettings.outputWidth - boundingBox.width * scaleFactor) / 2 - boundingBox.minX * scaleFactor;
  const offsetY = (globalSettings.outputHeight - boundingBox.height * scaleFactor) / 2 - boundingBox.minY * scaleFactor;

  for (let i = 0; i < svgParts.length; i++) {
    const part = svgParts[i];

    if (typeof part.draw === "function") {
      part.draw(scaleFactor, offsetX, offsetY);
    } else {
      // Fallback to existing inline logic if draw is unavailable
      applyPartSettings(part);
      const points = getPathPoints(part.pathData);
      if (points.length >= 2) {
        const frame = computeEditFrame(part);
        const cx0 = frame.base.cx0;
        const cy0 = frame.base.cy0;
        push();
        translate(offsetX + (cx0 + (part.tx || 0)) * scaleFactor, offsetY + (cy0 + (part.ty || 0)) * scaleFactor);
        rotate(part.rotation || 0);
        scale(part.sx || 1, part.sy || 1);
        beginShape();
        for (let j = 0; j < points.length; j++) {
          const point = points[j];
          const lx = (point.x - cx0) * scaleFactor;
          const ly = (point.y - cy0) * scaleFactor;
          vertex(lx, ly);
        }
        if (part.closed) endShape(CLOSE);
        else endShape();
        pop();
      }
    }
  }

  pop();
  endRecord();

  // Remove preview-only transforms
  pop();

  // Draw selection highlight in screen space (apply full mapping from model to screen)
  const _centerOffsetX = (width - mmToPixel(globalSettings.outputWidth)) / 2;
  const _centerOffsetY = (height - mmToPixel(globalSettings.outputHeight)) / 2;
  drawSelectedOverlay({
    scaleFactor,
    offsetX,
    offsetY,
    centerOffsetX: _centerOffsetX,
    centerOffsetY: _centerOffsetY,
    canvasWidth: width,
    canvasHeight: height,
    previewScale,
    previewPanX,
    previewPanY,
  });

  // UI overlay (drawn in screen space)
  drawPreviewUIOverlay();
}

// Draw a visual highlight for selected parts in preview only (not recorded)
function drawSelectedOverlay(params) {
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
  if (!selectedPartIndices || selectedPartIndices.length === 0) return;
  push();
  noFill();

  // Keep overlay thickness constant on screen regardless of previewScale
  const outerW = Math.max(1, 4 / previewScale);
  const innerW = Math.max(1, 2 / previewScale);

  // Helper to draw one outline pass with given stroke
  // Convert model point (SVG coords) through part transform and output mapping to screen px
  function modelPointToScreenPx(part, mx, my, frame) {
    const cx0 = frame.base.cx0;
    const cy0 = frame.base.cy0;
    const cosA = part.rotation ? Math.cos(part.rotation) : 1;
    const sinA = part.rotation ? Math.sin(part.rotation) : 0;
    const dx = (mx - cx0) * (part.sx || 1);
    const dy = (my - cy0) * (part.sy || 1);
    const rx = dx * cosA - dy * sinA;
    const ry = dx * sinA + dy * cosA;
    const outMmX = offsetX + (rx + cx0 + (part.tx || 0)) * scaleFactor;
    const outMmY = offsetY + (ry + cy0 + (part.ty || 0)) * scaleFactor;
    const px0 = mmToPixel(outMmX);
    const py0 = mmToPixel(outMmY);
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const sx = centerOffsetX + (px0 - cx) * previewScale + cx + previewPanX;
    const sy = centerOffsetY + (py0 - cy) * previewScale + cy + previewPanY;
    return { x: sx, y: sy };
  }

  function drawOutlinePass(strokeColor, weight) {
    stroke(strokeColor[0], strokeColor[1], strokeColor[2], strokeColor[3]);
    strokeWeight(weight);

    for (const idx of selectedPartIndices) {
      const part = svgParts[idx];
      if (!part || part.visible === false) continue;

      const frame = computeEditFrame(part);
      // Draw outline path using transformed points mapped to screen
      const points = getPathPoints(part.pathData);
      if (points.length >= 2) {
        beginShape();
        for (const point of points) {
          const sp = modelPointToScreenPx(part, point.x, point.y, frame);
          vertex(sp.x, sp.y);
        }
        if (part.closed) endShape(CLOSE);
        else endShape();
      }
    }
  }

  // White halo then blue line for contrast over any background
  drawOutlinePass([255, 255, 255, 220], outerW);
  drawOutlinePass([0, 120, 255, 230], innerW);

  // If single selection, draw interactive frame with handles
  if (selectedPartIndices.length === 1) {
    const part = svgParts[selectedPartIndices[0]];
    const frame = computeEditFrame(part);
    // Center in screen space
    const centerMmX = offsetX + frame.centerMm.x * scaleFactor;
    const centerMmY = offsetY + frame.centerMm.y * scaleFactor;
    const px0 = mmToPixel(centerMmX);
    const py0 = mmToPixel(centerMmY);
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const px = centerOffsetX + (px0 - cx) * previewScale + cx + previewPanX;
    const py = centerOffsetY + (py0 - cy) * previewScale + cy + previewPanY;
    const wPix = mmToPixel(frame.widthMm * scaleFactor) * previewScale;
    const hPix = mmToPixel(frame.heightMm * scaleFactor) * previewScale;
    const rot = frame.rotation;

    push();
    translate(px, py);
    rotate(rot);
    rectMode(CENTER);
    stroke(0, 150, 255, 220);
    strokeWeight(Math.max(1, 2 / previewScale));
    noFill();
    rect(0, 0, wPix, hPix);

    // Draw corner and edge handles
    const hs = Math.max(6, 8 / previewScale);
    const corners = [
      { x: -wPix / 2, y: -hPix / 2, type: "corner", id: "nw" },
      { x: wPix / 2, y: -hPix / 2, type: "corner", id: "ne" },
      { x: wPix / 2, y: hPix / 2, type: "corner", id: "se" },
      { x: -wPix / 2, y: hPix / 2, type: "corner", id: "sw" },
    ];
    const edges = [
      { x: 0, y: -hPix / 2, type: "edge", id: "top" },
      { x: wPix / 2, y: 0, type: "edge", id: "right" },
      { x: 0, y: hPix / 2, type: "edge", id: "bottom" },
      { x: -wPix / 2, y: 0, type: "edge", id: "left" },
    ];

    // Corner handles
    for (const c of corners) {
      push();
      translate(c.x, c.y);
      fill(255);
      stroke(0, 150, 255);
      rectMode(CENTER);
      rect(0, 0, hs, hs);
      pop();
    }

    // Edge handles
    for (const e of edges) {
      push();
      translate(e.x, e.y);
      fill(255);
      stroke(0, 100, 200);
      rectMode(CENTER);
      rect(0, 0, hs * 0.7, hs * 0.7);
      pop();
    }

    // Rotation handle
    const rDist = Math.max(wPix, hPix) / 2 + Math.max(20, 30 / previewScale);
    const rx = rDist * Math.cos(0);
    const ry = rDist * Math.sin(0);
    stroke(0, 150, 255);
    strokeWeight(Math.max(1, 1 / previewScale));
    line(0, 0, rx, ry);
    fill(100, 200, 255);
    stroke(0, 150, 255);
    strokeWeight(Math.max(1, 2 / previewScale));
    ellipse(rx, ry, Math.max(8, 10 / previewScale), Math.max(8, 10 / previewScale));

    pop();
  } else if (selectedPartIndices.length > 1) {
    // Group frame around all selected parts (screen-space axis-aligned box)
    let minPX = Infinity,
      minPY = Infinity,
      maxPX = -Infinity,
      maxPY = -Infinity;
    for (const idx of selectedPartIndices) {
      const part = svgParts[idx];
      if (!part || !part.visible) continue;
      const frame = computeEditFrame(part);
      const points = getPathPoints(part.pathData);
      for (const pt of points) {
        const sp = modelPointToScreenPx(part, pt.x, pt.y, frame);
        if (!isNaN(sp.x) && !isNaN(sp.y)) {
          minPX = Math.min(minPX, sp.x);
          minPY = Math.min(minPY, sp.y);
          maxPX = Math.max(maxPX, sp.x);
          maxPY = Math.max(maxPY, sp.y);
        }
      }
    }
    if (minPX !== Infinity) {
      const gx = (minPX + maxPX) / 2;
      const gy = (minPY + maxPY) / 2;
      const wPix = Math.max(1, maxPX - minPX);
      const hPix = Math.max(1, maxPY - minPY);

      push();
      translate(gx, gy);
      rectMode(CENTER);
      stroke(0, 150, 255, 220);
      strokeWeight(Math.max(1, 2 / previewScale));
      noFill();
      rect(0, 0, wPix, hPix);

      // Handles
      const hs = Math.max(6, 8 / previewScale);
      const corners = [
        { x: -wPix / 2, y: -hPix / 2 },
        { x: wPix / 2, y: -hPix / 2 },
        { x: wPix / 2, y: hPix / 2 },
        { x: -wPix / 2, y: hPix / 2 },
      ];
      const edges = [
        { x: 0, y: -hPix / 2 },
        { x: wPix / 2, y: 0 },
        { x: 0, y: hPix / 2 },
        { x: -wPix / 2, y: 0 },
      ];
      fill(255);
      stroke(0, 150, 255);
      for (const c of corners) {
        push();
        translate(c.x, c.y);
        rectMode(CENTER);
        rect(0, 0, hs, hs);
        pop();
      }
      stroke(0, 100, 200);
      for (const e of edges) {
        push();
        translate(e.x, e.y);
        rectMode(CENTER);
        rect(0, 0, hs * 0.7, hs * 0.7);
        pop();
      }

      // Rotation handle on +X
      const rDist = Math.max(wPix, hPix) / 2 + Math.max(20, 30 / previewScale);
      stroke(0, 150, 255);
      strokeWeight(Math.max(1, 1 / previewScale));
      line(0, 0, rDist, 0);
      fill(100, 200, 255);
      stroke(0, 150, 255);
      strokeWeight(Math.max(1, 2 / previewScale));
      ellipse(rDist, 0, Math.max(8, 10 / previewScale), Math.max(8, 10 / previewScale));
      pop();
    }
  }

  pop();
}

// Compute transformed edit frame of a part (center/size/rotation in mm)
function computeEditFrame(part) {
  // Base bbox in mm
  const base = getPathPoints(part.pathData);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of base) {
    if (isNaN(p.x) || isNaN(p.y)) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (minX === Infinity) {
    return { centerMm: { x: part.tx || 0, y: part.ty || 0 }, widthMm: 10, heightMm: 10, rotation: part.rotation || 0 };
  }

  const w0 = Math.max(1e-6, maxX - minX);
  const h0 = Math.max(1e-6, maxY - minY);
  const cx0 = (minX + maxX) / 2;
  const cy0 = (minY + maxY) / 2;

  const sx = part.sx || 1;
  const sy = part.sy || 1;
  const rot = part.rotation || 0;
  const tx = part.tx || 0;
  const ty = part.ty || 0;

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

// Interactive preview controls
function mouseDragged() {
  let handled = false;

  // Only handle interactions if initiated within canvas or dragging slider
  if (!isPreviewInteracting && !isDraggingScale) {
    return;
  }

  if (isDraggingScale) {
    updateScaleFromMouse(mouseY);
    handled = true;
  }

  if (keyIsDown(SHIFT)) {
    const dy = height - mouseY - (height - pmouseY);
    const factor = Math.max(0.001, 1 + dy * 0.0005);
    const oldScale = previewScale;
    const newScale = constrain(oldScale * factor, minPreviewScale, maxPreviewScale);

    if (newScale !== oldScale) {
      // Zoom toward mouse: adjust pan so the point under the cursor stays fixed
      const coX = (width - mmToPixel(globalSettings.outputWidth)) / 2;
      const coY = (height - mmToPixel(globalSettings.outputHeight)) / 2;
      const cx = width / 2;
      const cy = height / 2;

      // Current world position under mouse (pre-scale change)
      const worldX = (mouseX - coX - cx - previewPanX) / oldScale + cx;
      const worldY = (mouseY - coY - cy - previewPanY) / oldScale + cy;

      // Update pan to keep mouse-anchored zoom
      previewPanX -= (oldScale - newScale) * (worldX - cx);
      previewPanY -= (oldScale - newScale) * (worldY - cy);
      previewScale = newScale;
    }
    handled = true;
  }

  // Edit drag: move/scale/rotate selected part in pixel domain
  if (editDrag.active && selectedPartIndices.length === 1) {
    const idx = selectedPartIndices[0];
    const part = svgParts[idx];
    if (part) {
      const scaleXmm = (globalSettings.outputWidth * 0.9) / boundingBox.width;
      const scaleYmm = (globalSettings.outputHeight * 0.9) / boundingBox.height;
      const scaleFactor = Math.min(scaleXmm, scaleYmm);
      const offsetX =
        (globalSettings.outputWidth - boundingBox.width * scaleFactor) / 2 - boundingBox.minX * scaleFactor;
      const offsetY =
        (globalSettings.outputHeight - boundingBox.height * scaleFactor) / 2 - boundingBox.minY * scaleFactor;
      const centerOffsetX = (width - mmToPixel(globalSettings.outputWidth)) / 2;
      const centerOffsetY = (height - mmToPixel(globalSettings.outputHeight)) / 2;
      const changed = part.mouseDraggedPixel(
        mouseX,
        mouseY,
        {
          scaleFactor,
          offsetX,
          offsetY,
          centerOffsetX,
          centerOffsetY,
          canvasWidth: width,
          canvasHeight: height,
          previewScale,
          previewPanX,
          previewPanY,
        },
        { shiftKey: keyIsDown(SHIFT), altKey: keyIsDown(ALT) },
      );
      if (changed) {
        handled = true;
        // Keep transform UI in sync while dragging
        updatePartSettings(svgParts[selectedPartIndices[0]]);
      }
    }
  } else if (groupDrag.active && selectedPartIndices.length > 1) {
    const scaleXmm = (globalSettings.outputWidth * 0.9) / boundingBox.width;
    const scaleYmm = (globalSettings.outputHeight * 0.9) / boundingBox.height;
    const scaleFactor = Math.min(scaleXmm, scaleYmm);
    const offsetX = (globalSettings.outputWidth - boundingBox.width * scaleFactor) / 2 - boundingBox.minX * scaleFactor;
    const offsetY =
      (globalSettings.outputHeight - boundingBox.height * scaleFactor) / 2 - boundingBox.minY * scaleFactor;
    const centerOffsetX = (width - mmToPixel(globalSettings.outputWidth)) / 2;
    const centerOffsetY = (height - mmToPixel(globalSettings.outputHeight)) / 2;
    // Convert mouse to model
    const toModel = (mx, my) => {
      const cx = width / 2,
        cy = height / 2;
      const outPxX = cx + (mx - centerOffsetX - cx - previewPanX) / Math.max(1e-6, previewScale);
      const outPxY = cy + (my - centerOffsetY - cy - previewPanY) / Math.max(1e-6, previewScale);
      const outMmX = outPxX / mmToPixel(1);
      const outMmY = outPxY / mmToPixel(1);
      return {
        x: (outMmX - offsetX) / Math.max(1e-6, scaleFactor),
        y: (outMmY - offsetY) / Math.max(1e-6, scaleFactor),
      };
    };
    const mm = toModel(mouseX, mouseY);
    const vx = mm.x - groupDrag.groupCenter.x;
    const vy = mm.y - groupDrag.groupCenter.y;
    const dist = Math.max(1e-6, Math.hypot(vx, vy));
    const ang = Math.atan2(vy, vx);
    let scaleRatio = dist / groupDrag.startDist;
    if (keyIsDown(ALT)) {
      // uniform enforced by same ratio applied to both axes
    }
    // Rotation only when groupDrag.type is rotate; corners/edges scale only
    const deltaAng =
      groupDrag.type === "rotate"
        ? keyIsDown(SHIFT)
          ? (() => {
              const step = radians(15);
              return Math.round((ang - groupDrag.startAngle) / step) * step;
            })()
          : ang - groupDrag.startAngle
        : 0;
    // Apply to each part
    groupDrag.parts.forEach((info) => {
      const p = svgParts[info.index];
      // New center from scaling around group center
      const dx0 = info.cx0 - groupDrag.groupCenter.x;
      const dy0 = info.cy0 - groupDrag.groupCenter.y;
      const dxr = dx0 * Math.cos(deltaAng) - dy0 * Math.sin(deltaAng);
      const dyr = dx0 * Math.sin(deltaAng) + dy0 * Math.cos(deltaAng);
      const dxs = dxr * scaleRatio;
      const dys = dyr * scaleRatio;
      const newCx = groupDrag.groupCenter.x + dxs;
      const newCy = groupDrag.groupCenter.y + dys;
      // Update translation so that base center moves to newCx/newCy
      p.tx = newCx - info.base.cx0;
      p.ty = newCy - info.base.cy0;
      // Update scale; rotation only if we grabbed the rotate handle
      if (keyIsDown(ALT)) {
        const uni = (info.sx0 + info.sy0) * 0.5 * scaleRatio;
        p.sx = Math.max(0.01, uni);
        p.sy = Math.max(0.01, uni);
      } else {
        p.sx = Math.max(0.01, info.sx0 * scaleRatio);
        p.sy = Math.max(0.01, info.sy0 * scaleRatio);
      }
      if (groupDrag.type === "rotate") {
        p.rotation = info.rot0 + deltaAng;
      }
    });
    handled = true;
    updatePartSettings(svgParts[selectedPartIndices[0]]);
  } else if (isPanning) {
    // Pan follows mouse drag
    const dx = mouseX - pmouseX;
    const dy = mouseY - pmouseY;
    previewPanX += dx;
    previewPanY += dy;
    handled = true;
  }

  if (handled) {
    redraw();
    return false;
  }
}

function mousePressed() {
  // Mark interaction as inside-canvas only if press is within canvas bounds
  isPreviewInteracting = mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;

  // Check recenter button
  const ui = getPreviewUIRects();
  if (pointInRect(mouseX, mouseY, ui.recenter)) {
    previewPanX = 0;
    previewPanY = 0;
    redraw();
    return false;
  }

  // Check slider track
  if (pointInRect(mouseX, mouseY, ui.sliderTrack)) {
    isDraggingScale = true;
    updateScaleFromMouse(mouseY);
    redraw();
    return false;
  }

  // // If hovering a part, select it
  // if (hoverPartIndex >= 0) {
  //   // Single-select via parser's selection util if available
  //   if (typeof selectPart === 'function') {
  //     selectPart(hoverPartIndex, { ctrlKey: false, metaKey: false, shiftKey: false });
  //   } else {
  //     selectedPartIndices = [hoverPartIndex];
  //     svgParts.forEach(p => p.selected = false);
  //     if (svgParts[hoverPartIndex]) svgParts[hoverPartIndex].selected = true;
  //   }
  // }

  // Begin edit interaction if clicking a handle/body; moving body requires 'm' held, handles do not
  if (selectedPartIndices.length >= 1 && isPreviewInteracting) {
    // First, if multiple selected, try group handle hit-test in pixel space
    if (selectedPartIndices.length > 1) {
      const scaleXmm = (globalSettings.outputWidth * 0.9) / boundingBox.width;
      const scaleYmm = (globalSettings.outputHeight * 0.9) / boundingBox.height;
      const scaleFactor = Math.min(scaleXmm, scaleYmm);
      const offsetX =
        (globalSettings.outputWidth - boundingBox.width * scaleFactor) / 2 - boundingBox.minX * scaleFactor;
      const offsetY =
        (globalSettings.outputHeight - boundingBox.height * scaleFactor) / 2 - boundingBox.minY * scaleFactor;
      const centerOffsetX = (width - mmToPixel(globalSettings.outputWidth)) / 2;
      const centerOffsetY = (height - mmToPixel(globalSettings.outputHeight)) / 2;
      // Compute screen-space AABB of all selected parts
      let minPX = Infinity,
        minPY = Infinity,
        maxPX = -Infinity,
        maxPY = -Infinity;
      const mapPoint = (part, mx, my, frame) => {
        const cx0 = frame.base.cx0,
          cy0 = frame.base.cy0;
        const cosA = part.rotation ? Math.cos(part.rotation) : 1;
        const sinA = part.rotation ? Math.sin(part.rotation) : 0;
        const dx = (mx - cx0) * (part.sx || 1);
        const dy = (my - cy0) * (part.sy || 1);
        const rx = dx * cosA - dy * sinA;
        const ry = dx * sinA + dy * cosA;
        const outMmX = offsetX + (rx + cx0 + (part.tx || 0)) * scaleFactor;
        const outMmY = offsetY + (ry + cy0 + (part.ty || 0)) * scaleFactor;
        const px0 = mmToPixel(outMmX);
        const py0 = mmToPixel(outMmY);
        const cx = width / 2,
          cy = height / 2;
        return {
          x: centerOffsetX + (px0 - cx) * previewScale + cx + previewPanX,
          y: centerOffsetY + (py0 - cy) * previewScale + cy + previewPanY,
        };
      };
      for (const si of selectedPartIndices) {
        const p = svgParts[si];
        if (!p || !p.visible) continue;
        const frame = computeEditFrame(p);
        const pts = getPathPoints(p.pathData);
        for (const q of pts) {
          const sp = mapPoint(p, q.x, q.y, frame);
          if (!isNaN(sp.x) && !isNaN(sp.y)) {
            minPX = Math.min(minPX, sp.x);
            minPY = Math.min(minPY, sp.y);
            maxPX = Math.max(maxPX, sp.x);
            maxPY = Math.max(maxPY, sp.y);
          }
        }
      }
      if (minPX !== Infinity) {
        const gx = (minPX + maxPX) / 2;
        const gy = (minPY + maxPY) / 2;
        const wPix = Math.max(1, maxPX - minPX);
        const hPix = Math.max(1, maxPY - minPY);
        const hs = Math.max(6, 8 / previewScale);
        const handleHit = (mx, my, hx, hy, size) => Math.abs(mx - hx) <= size && Math.abs(my - hy) <= size;
        // Corners
        const corners = [
          { x: gx - wPix / 2, y: gy - hPix / 2, id: "corner" },
          { x: gx + wPix / 2, y: gy - hPix / 2, id: "corner" },
          { x: gx + wPix / 2, y: gy + hPix / 2, id: "corner" },
          { x: gx - wPix / 2, y: gy + hPix / 2, id: "corner" },
        ];
        let pickedGroup = false;
        for (const c of corners) {
          if (handleHit(mouseX, mouseY, c.x, c.y, hs)) {
            groupDrag.type = "corner";
            pickedGroup = true;
            break;
          }
        }
        // Rotation handle on +X
        if (!pickedGroup) {
          const rDist = Math.max(wPix, hPix) / 2 + Math.max(20, 30 / previewScale);
          const rx = gx + rDist,
            ry = gy;
          if (Math.hypot(mouseX - rx, mouseY - ry) <= Math.max(hs * 0.8, 10)) {
            groupDrag.type = "rotate";
            pickedGroup = true;
          }
        }
        // Body move (requires 'm')
        if (!pickedGroup && moveKeyHeld) {
          if (
            mouseX >= gx - wPix / 2 &&
            mouseX <= gx + wPix / 2 &&
            mouseY >= gy - hPix / 2 &&
            mouseY <= gy + hPix / 2
          ) {
            groupDrag.type = "move";
            pickedGroup = true;
          }
        }
        if (pickedGroup) {
          // Initialize group drag snapshot
          const toModel = (mx, my) => {
            const cx = width / 2,
              cy = height / 2;
            const outPxX = cx + (mx - centerOffsetX - cx - previewPanX) / Math.max(1e-6, previewScale);
            const outPxY = cy + (my - centerOffsetY - cy - previewPanY) / Math.max(1e-6, previewScale);
            const outMmX = outPxX / mmToPixel(1);
            const outMmY = outPxY / mmToPixel(1);
            return {
              x: (outMmX - offsetX) / Math.max(1e-6, scaleFactor),
              y: (outMmY - offsetY) / Math.max(1e-6, scaleFactor),
            };
          };
          const selectedParts = selectedPartIndices.map((i) => svgParts[i]);
          let gcx = 0,
            gcy = 0;
          const infos = [];
          selectedParts.forEach((p, idxSel) => {
            const frame = computeEditFrame(p);
            infos.push({
              index: selectedPartIndices[idxSel],
              tx0: p.tx || 0,
              ty0: p.ty || 0,
              sx0: p.sx || 1,
              sy0: p.sy || 1,
              rot0: p.rotation || 0,
              cx0: frame.centerMm.x,
              cy0: frame.centerMm.y,
              base: frame.base,
            });
            gcx += frame.centerMm.x;
            gcy += frame.centerMm.y;
          });
          gcx /= selectedParts.length;
          gcy /= selectedParts.length;
          groupDrag.active = true;
          groupDrag.groupCenter = { x: gcx, y: gcy };
          groupDrag.parts = infos;
          const m0 = toModel(mouseX, mouseY);
          groupDrag.startMouseModel = { x: m0.x, y: m0.y };
          groupDrag.startVec = { x: m0.x - gcx, y: m0.y - gcy };
          groupDrag.startDist = Math.max(1e-6, Math.hypot(groupDrag.startVec.x, groupDrag.startVec.y));
          groupDrag.startAngle = Math.atan2(groupDrag.startVec.y, groupDrag.startVec.x);
          return false;
        }
      }
    }

    const idx = selectedPartIndices[0];
    const part = svgParts[idx];
    if (part) {
      const scaleXmm = (globalSettings.outputWidth * 0.9) / boundingBox.width;
      const scaleYmm = (globalSettings.outputHeight * 0.9) / boundingBox.height;
      const scaleFactor = Math.min(scaleXmm, scaleYmm);
      const offsetX =
        (globalSettings.outputWidth - boundingBox.width * scaleFactor) / 2 - boundingBox.minX * scaleFactor;
      const offsetY =
        (globalSettings.outputHeight - boundingBox.height * scaleFactor) / 2 - boundingBox.minY * scaleFactor;
      const centerOffsetX = (width - mmToPixel(globalSettings.outputWidth)) / 2;
      const centerOffsetY = (height - mmToPixel(globalSettings.outputHeight)) / 2;
      const picked = part.mousePressedPixel(
        mouseX,
        mouseY,
        {
          scaleFactor,
          offsetX,
          offsetY,
          centerOffsetX,
          centerOffsetY,
          canvasWidth: width,
          canvasHeight: height,
          previewScale,
          previewPanX,
          previewPanY,
        },
        { allowBodyMove: moveKeyHeld },
      );
      if (picked) {
        if (selectedPartIndices.length === 1) {
          editDrag.active = true;
          updatePartSettings(svgParts[selectedPartIndices[0]]);
          return false;
        } else {
          // Initialize group drag
          const modelStart = svgParts[idx]._pixelToModel
            ? svgParts[idx]._pixelToModel(mouseX, mouseY, {
                scaleFactor,
                offsetX,
                offsetY,
                centerOffsetX,
                centerOffsetY,
                canvasWidth: width,
                canvasHeight: height,
                previewScale,
                previewPanX,
                previewPanY,
              })
            : null;
          const partsInfo = [];
          let gx = 0,
            gy = 0;
          selectedPartIndices.forEach((i) => {
            const p = svgParts[i];
            const frame = computeEditFrame(p);
            partsInfo.push({
              index: i,
              tx0: p.tx || 0,
              ty0: p.ty || 0,
              sx0: p.sx || 1,
              sy0: p.sy || 1,
              rot0: p.rotation || 0,
              cx0: frame.centerMm.x,
              cy0: frame.centerMm.y,
              base: frame.base,
            });
            gx += frame.centerMm.x;
            gy += frame.centerMm.y;
          });
          gx /= selectedPartIndices.length;
          gy /= selectedPartIndices.length;
          groupDrag.active = true;
          groupDrag.type = picked ? svgParts[idx]._drag && svgParts[idx]._drag.type : "move";
          groupDrag.startMouseModel = modelStart ? { x: modelStart.modelX, y: modelStart.modelY } : { x: gx, y: gy };
          groupDrag.groupCenter = { x: gx, y: gy };
          groupDrag.parts = partsInfo;
          // Seed rotation/scale reference
          groupDrag.startVec = { x: groupDrag.startMouseModel.x - gx, y: groupDrag.startMouseModel.y - gy };
          groupDrag.startDist = Math.max(1e-6, Math.hypot(groupDrag.startVec.x, groupDrag.startVec.y));
          groupDrag.startAngle = Math.atan2(groupDrag.startVec.y, groupDrag.startVec.x);
          return false;
        }
      }
    }
  }
  // Otherwise, start panning only if inside canvas; don't block UI inputs
  if (isPreviewInteracting) {
    isPanning = true;
    lastMousePos.x = mouseX;
    lastMousePos.y = mouseY;
    editDrag.active = false;
    editDrag.type = null;
    return false;
  }
  // Click was outside canvas; allow default behavior for inputs/controls
}

function mouseReleased() {
  isDraggingScale = false;
  isPreviewInteracting = false;
  editDrag.active = false;
  if (selectedPartIndices.length === 1) {
    const part = svgParts[selectedPartIndices[0]];
    if (part && typeof part.mouseReleased === "function") part.mouseReleased();
  }
  groupDrag.active = false;
  isPanning = false;
}

function mouseWheel(event) {
  // Only zoom when the cursor is inside the canvas area
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
    return;
  }

  // Exponential scaling factor from wheel delta (smooth and always positive)
  const factor = Math.exp(-event.deltaY * 0.0015);
  const oldScale = previewScale;
  const newScale = constrain(oldScale * factor, minPreviewScale, maxPreviewScale);

  if (newScale !== oldScale) {
    // Zoom toward mouse: keep point under cursor stationary
    const coX = (width - mmToPixel(globalSettings.outputWidth)) / 2;
    const coY = (height - mmToPixel(globalSettings.outputHeight)) / 2;
    const cx = width / 2;
    const cy = height / 2;
    const worldX = (mouseX - coX - cx - previewPanX) / oldScale + cx;
    const worldY = (mouseY - coY - cy - previewPanY) / oldScale + cy;

    previewPanX -= (oldScale - newScale) * (worldX - cx);
    previewPanY -= (oldScale - newScale) * (worldY - cy);
    previewScale = newScale;

    redraw();
  }

  // Prevent page scroll
  return false;
}

function updateHoverHitTest() {
  hoverPartIndex = -1;
  if (svgParts.length === 0) return;
  // Compute draw-time scale and offset (mirror of draw())
  const scaleXmm = (globalSettings.outputWidth * 0.9) / boundingBox.width;
  const scaleYmm = (globalSettings.outputHeight * 0.9) / boundingBox.height;
  const scaleFactor = Math.min(scaleXmm, scaleYmm);
  const offsetX = (globalSettings.outputWidth - boundingBox.width * scaleFactor) / 2 - boundingBox.minX * scaleFactor;
  const offsetY = (globalSettings.outputHeight - boundingBox.height * scaleFactor) / 2 - boundingBox.minY * scaleFactor;
  const centerOffsetX = (width - mmToPixel(globalSettings.outputWidth)) / 2;
  const centerOffsetY = (height - mmToPixel(globalSettings.outputHeight)) / 2;

  // Iterate in reverse (topmost first)
  for (let i = svgParts.length - 1; i >= 0; i--) {
    const part = svgParts[i];
    if (!part || part.visible === false) continue;
    const hit =
      typeof part.hitTestPixel === "function"
        ? part.hitTestPixel(
            mouseX,
            mouseY,
            {
              scaleFactor,
              offsetX,
              offsetY,
              centerOffsetX,
              centerOffsetY,
              canvasWidth: width,
              canvasHeight: height,
              previewScale,
              previewPanX,
              previewPanY,
            },
            {
              handlePx: Math.max(6, 8 / previewScale),
              rotationHandleOffsetPx: Math.max(20, 30 / previewScale),
              allowBodyMove: true,
            },
          )
        : { type: null };
    if (hit && hit.type) {
      hoverPartIndex = i;
      break;
    }
  }
}

function applyPartSettings(part) {
  // Apply stroke settings
  if (part.strokeSettings.enabled && part.strokeSettings.color) {
    setStrokeMode(part.strokeSettings.mode);
    setStrokeSettings({
      stitchLength: part.strokeSettings.stitchLength,
      minStitchLength: part.strokeSettings.minStitchLength,
      resampleNoise: part.strokeSettings.resampleNoise,
      strokeWeight: part.strokeSettings.weight,
    });
    stroke(part.strokeSettings.color[0], part.strokeSettings.color[1], part.strokeSettings.color[2]);
    strokeWeight(part.strokeSettings.weight);
  } else {
    noStroke();
  }

  // Apply fill settings
  if (part.fillSettings.enabled && part.fillSettings.color) {
    setFillMode(part.fillSettings.mode);
    setFillSettings({
      stitchLength: part.fillSettings.stitchLength,
      minStitchLength: part.fillSettings.minStitchLength,
      resampleNoise: part.fillSettings.resampleNoise,
      rowSpacing: part.fillSettings.rowSpacing,
    });
    fill(part.fillSettings.color[0], part.fillSettings.color[1], part.fillSettings.color[2]);
  } else {
    noFill();
  }
}

function usePrimitiveShape(part, scaleFactor, offsetX, offsetY) {
  const params = part.shapeParams;
  if (!params) return false;

  switch (part.elementType) {
    case "circle":
      const circleX = offsetX + params.cx * scaleFactor;
      const circleY = offsetY + params.cy * scaleFactor;
      const circleR = params.r * scaleFactor;
      circle(circleX, circleY, circleR * 2); // p5.js circle uses diameter
      return true;

    case "rect":
      const rectX = offsetX + params.x * scaleFactor;
      const rectY = offsetY + params.y * scaleFactor;
      const rectW = params.w * scaleFactor;
      const rectH = params.h * scaleFactor;
      rect(rectX, rectY, rectW, rectH);
      return true;

    case "ellipse":
      const ellipseX = offsetX + params.cx * scaleFactor;
      const ellipseY = offsetY + params.cy * scaleFactor;
      const ellipseW = params.rx * scaleFactor * 2;
      const ellipseH = params.ry * scaleFactor * 2;
      ellipse(ellipseX, ellipseY, ellipseW, ellipseH);
      return true;

    case "line":
      const lineX1 = offsetX + params.x1 * scaleFactor;
      const lineY1 = offsetY + params.y1 * scaleFactor;
      const lineX2 = offsetX + params.x2 * scaleFactor;
      const lineY2 = offsetY + params.y2 * scaleFactor;
      line(lineX1, lineY1, lineX2, lineY2);
      return true;

    case "polygon":
    case "polyline":
      // For simple polygons/polylines, we could use p5.js shapes, but vertex approach works better for embroidery
      // Fall back to vertex method
      return false;

    default:
      return false;
  }
}

function applyPartSettings(part) {
  // Apply stroke settings
  if (part.strokeSettings.enabled && part.strokeSettings.color) {
    setStrokeMode(part.strokeSettings.mode);
    setStrokeSettings({
      stitchLength: part.strokeSettings.stitchLength,
      minStitchLength: part.strokeSettings.minStitchLength,
      resampleNoise: part.strokeSettings.resampleNoise,
      strokeWeight: part.strokeSettings.weight,
    });
    stroke(part.strokeSettings.color[0], part.strokeSettings.color[1], part.strokeSettings.color[2]);
    strokeWeight(part.strokeSettings.weight);
  } else {
    noStroke();
  }

  // Apply fill settings
  if (part.fillSettings.enabled && part.fillSettings.color) {
    setFillMode(part.fillSettings.mode);
    setFillSettings({
      stitchLength: part.fillSettings.stitchLength,
      minStitchLength: part.fillSettings.minStitchLength,
      resampleNoise: part.fillSettings.resampleNoise,
      rowSpacing: part.fillSettings.rowSpacing,
    });
    fill(part.fillSettings.color[0], part.fillSettings.color[1], part.fillSettings.color[2]);
  } else {
    noFill();
  }
}

function clearSelection() {
  // Clear all selections
  selectedPartIndices = [];
  svgParts.forEach((part) => (part.selected = false));

  // Update UI
  updatePartSettings(null);
  updateSVGPartsList();
  updateInfoTable();
  redraw();
}

function updateMultiPartSettings() {
  const container = select("#part-settings");
  container.html(""); // Clear existing content

  if (selectedPartIndices.length === 0) return;
  // Group Transform (collapsible)
  const groupTransformSec = createCollapsibleSection(container, "Group Transform", true);

  // Compute current group center and representative transform (not unique)
  let gcx = 0,
    gcy = 0;
  selectedParts.forEach((p) => {
    const f = computeEditFrame(p);
    gcx += f.centerMm.x;
    gcy += f.centerMm.y;
  });
  gcx /= selectedParts.length;
  gcy /= selectedParts.length;

  const txInput = createInput(gcx.toFixed(2), "number");
  const tyInput = createInput(gcy.toFixed(2), "number");
  const sxInput = createInput("1.000", "number");
  const syInput = createInput("1.000", "number");
  const rotInput = createInput("0.0", "number");
  [txInput, tyInput].forEach((inp) => {
    inp.attribute("step", "0.1");
    inp.style("width", "80px");
  });
  [sxInput, syInput].forEach((inp) => {
    inp.attribute("step", "0.01");
    inp.style("width", "80px");
  });
  rotInput.attribute("step", "0.1");
  rotInput.style("width", "80px");

  const row1 = createDiv();
  row1.parent(groupTransformSec.content);
  row1.addClass("form-row");
  const row2 = createDiv();
  row2.parent(groupTransformSec.content);
  row2.addClass("form-row");
  const makeLabeled = (row, label, input) => {
    const wrap = createDiv();
    wrap.parent(row);
    wrap.addClass("form-field");
    const lab = createDiv(label);
    lab.parent(wrap);
    lab.addClass("control-label");
    input.parent(wrap);
    input.addClass("value-input");
  };
  makeLabeled(row1, "X", txInput);
  makeLabeled(row1, "Y", tyInput);
  makeLabeled(row2, "Scale X", sxInput);
  makeLabeled(row2, "Scale Y", syInput);
  makeLabeled(row2, "Rotate", rotInput);

  const applyGroup = () => {
    const ntx = parseFloat(txInput.value());
    const nty = parseFloat(tyInput.value());
    const nsx = Math.max(0.01, parseFloat(sxInput.value()));
    const nsy = Math.max(0.01, parseFloat(syInput.value()));
    const nrot = ((parseFloat(rotInput.value()) || 0) * Math.PI) / 180;
    // Apply translation by delta to each part center
    const dx = (isNaN(ntx) ? gcx : ntx) - gcx;
    const dy = (isNaN(nty) ? gcy : nty) - gcy;
    selectedParts.forEach((p) => {
      const f = computeEditFrame(p);
      const newCx = f.centerMm.x + dx;
      const newCy = f.centerMm.y + dy;
      p.tx = newCx - f.base.cx0;
      p.ty = newCy - f.base.cy0;
      p.sx = p.sx * nsx;
      p.sy = p.sy * nsy;
      p.rotation = p.rotation + nrot;
    });
    updateSVGPartsList();
    updateInfoTable();
    redraw();
  };
  txInput.changed(applyGroup);
  tyInput.changed(applyGroup);
  sxInput.changed(applyGroup);
  syInput.changed(applyGroup);
  rotInput.changed(applyGroup);

  // Get common values for controls
  const selectedParts = selectedPartIndices.map((i) => svgParts[i]);

  // Common stroke enable state
  const allStrokeEnabled = selectedParts.every((part) => part.strokeSettings.enabled);
  const someStrokeEnabled = selectedParts.some((part) => part.strokeSettings.enabled);

  // Common fill enable state
  const allFillEnabled = selectedParts.every((part) => part.fillSettings.enabled);
  const someFillEnabled = selectedParts.some((part) => part.fillSettings.enabled);

  // Stroke settings section header
  const strokeHeader = createDiv("Stroke Settings");
  strokeHeader.parent(container);
  strokeHeader.style("font-weight", "600");
  strokeHeader.style("margin", "16px 0 8px 0");
  strokeHeader.style("padding-bottom", "8px");
  strokeHeader.style("border-bottom", "1px solid #ddd");

  // Stroke settings
  createCheckboxControl(container, "Enable Stroke", allStrokeEnabled, (enabled) => {
    selectedParts.forEach((part) => {
      part.strokeSettings.enabled = enabled;
    });
    updateMultiPartSettings(); // Refresh UI
    updateInfoTable();
    redraw();
  });

  if (someStrokeEnabled) {
    const strokeControlsDiv = createDiv();
    strokeControlsDiv.parent(container);
    strokeControlsDiv.id("multi-stroke-controls");

    // Common stroke color
    const commonStrokeColor = selectedParts[0].strokeSettings.color;
    createColorControl(strokeControlsDiv, "Stroke Color", commonStrokeColor, (color) => {
      selectedParts.forEach((part) => {
        if (part.strokeSettings.enabled) {
          part.strokeSettings.color = color;
        }
      });
      updateSVGPartsList();
      updateInfoTable();
      redraw();
    });

    // Common stroke mode
    const commonStrokeMode = selectedParts[0].strokeSettings.mode;
    createSelectControl(
      strokeControlsDiv,
      "Stroke Mode",
      {
        straight: "straight",
        zigzag: "zigzag",
        lines: "lines",
        sashiko: "sashiko",
      },
      commonStrokeMode,
      (value) => {
        selectedParts.forEach((part) => {
          if (part.strokeSettings.enabled) {
            part.strokeSettings.mode = value;
            applyStrokeModeDefaults(part, value);
          }
        });
        updateMultiPartSettings(); // Refresh UI to show new values
        updateInfoTable();
        redraw();
      },
    );

    // Common stroke weight
    const commonStrokeWeight = selectedParts[0].strokeSettings.weight;
    createSliderControl(strokeControlsDiv, "Stroke Weight", 0.5, 10, commonStrokeWeight, 0.5, (value) => {
      selectedParts.forEach((part) => {
        if (part.strokeSettings.enabled) {
          part.strokeSettings.weight = value;
        }
      });
      updateInfoTable();
      redraw();
    });

    // Common stroke stitch length
    const commonStrokeStitchLength = selectedParts[0].strokeSettings.stitchLength;
    createSliderControl(strokeControlsDiv, "Stroke Stitch Length", 0.1, 10, commonStrokeStitchLength, 0.1, (value) => {
      selectedParts.forEach((part) => {
        if (part.strokeSettings.enabled) {
          part.strokeSettings.stitchLength = value;
        }
      });
      updateInfoTable();
      redraw();
    });

    // Common stroke min stitch length
    const commonStrokeMinStitchLength = selectedParts[0].strokeSettings.minStitchLength;
    createSliderControl(strokeControlsDiv, "Min Stitch Length", 0.1, 5, commonStrokeMinStitchLength, 0.1, (value) => {
      selectedParts.forEach((part) => {
        if (part.strokeSettings.enabled) {
          part.strokeSettings.minStitchLength = value;
        }
      });
      updateInfoTable();
      redraw();
    });

    // Common stroke resample noise
    const commonStrokeResampleNoise = selectedParts[0].strokeSettings.resampleNoise;
    createSliderControl(strokeControlsDiv, "Resample Noise", 0.0, 2, commonStrokeResampleNoise, 0.1, (value) => {
      selectedParts.forEach((part) => {
        if (part.strokeSettings.enabled) {
          part.strokeSettings.resampleNoise = value;
        }
      });
      updateInfoTable();
      redraw();
    });
  }

  // Fill settings section header
  const fillHeader = createDiv("Fill Settings");
  fillHeader.parent(container);
  fillHeader.style("font-weight", "600");
  fillHeader.style("margin", "16px 0 8px 0");
  fillHeader.style("padding-bottom", "8px");
  fillHeader.style("border-bottom", "1px solid #ddd");

  // Fill settings
  createCheckboxControl(container, "Enable Fill", allFillEnabled, (enabled) => {
    selectedParts.forEach((part) => {
      part.fillSettings.enabled = enabled;
    });
    updateMultiPartSettings(); // Refresh UI
    updateInfoTable();
    redraw();
  });

  if (someFillEnabled) {
    const fillControlsDiv = createDiv();
    fillControlsDiv.parent(container);
    fillControlsDiv.id("multi-fill-controls");

    // Common fill color
    const commonFillColor = selectedParts[0].fillSettings.color;
    createColorControl(fillControlsDiv, "Fill Color", commonFillColor, (color) => {
      selectedParts.forEach((part) => {
        if (part.fillSettings.enabled) {
          part.fillSettings.color = color;
        }
      });
      updateSVGPartsList();
      updateInfoTable();
      redraw();
    });

    // Common fill mode
    const commonFillMode = selectedParts[0].fillSettings.mode;
    createSelectControl(
      fillControlsDiv,
      "Fill Mode",
      {
        tatami: "Tatami",
        satin: "Satin",
        spiral: "Spiral",
      },
      commonFillMode,
      (value) => {
        selectedParts.forEach((part) => {
          if (part.fillSettings.enabled) {
            part.fillSettings.mode = value;
            applyFillModeDefaults(part, value);
          }
        });
        updateMultiPartSettings(); // Refresh UI to show new values
        updateInfoTable();
        redraw();
      },
    );

    // Common fill stitch length
    const commonFillStitchLength = selectedParts[0].fillSettings.stitchLength;
    createSliderControl(fillControlsDiv, "Fill Stitch Length", 0.5, 10, commonFillStitchLength, 0.1, (value) => {
      selectedParts.forEach((part) => {
        if (part.fillSettings.enabled) {
          part.fillSettings.stitchLength = value;
        }
      });
      updateInfoTable();
      redraw();
    });

    // Common row spacing
    const commonRowSpacing = selectedParts[0].fillSettings.rowSpacing;
    createSliderControl(fillControlsDiv, "Row Spacing", 0.2, 5, commonRowSpacing, 0.1, (value) => {
      selectedParts.forEach((part) => {
        if (part.fillSettings.enabled) {
          part.fillSettings.rowSpacing = value;
        }
      });
      updateInfoTable();
      redraw();
    });

    // Common fill min stitch length
    const commonFillMinStitchLength = selectedParts[0].fillSettings.minStitchLength;
    createSliderControl(fillControlsDiv, "Min Stitch Length", 0.1, 5, commonFillMinStitchLength, 0.1, (value) => {
      selectedParts.forEach((part) => {
        if (part.fillSettings.enabled) {
          part.fillSettings.minStitchLength = value;
        }
      });
      updateInfoTable();
      redraw();
    });

    // Common fill resample noise
    const commonFillResampleNoise = selectedParts[0].fillSettings.resampleNoise;
    createSliderControl(fillControlsDiv, "Resample Noise", 0.0, 2, commonFillResampleNoise, 0.1, (value) => {
      selectedParts.forEach((part) => {
        if (part.fillSettings.enabled) {
          part.fillSettings.resampleNoise = value;
        }
      });
      updateInfoTable();
      redraw();
    });
  }

  // Outline settings for multi-selection
  const outlineHeader = createDiv("Outline Settings");
  outlineHeader.parent(container);
  outlineHeader.style("font-weight", "600");
  outlineHeader.style("margin", "16px 0 8px 0");
  outlineHeader.style("padding-bottom", "8px");
  outlineHeader.style("border-bottom", "1px solid #ddd");

  // Common outline enable state
  const allOutlineEnabled = selectedParts.every((part) => part.addToOutline);
  const someOutlineEnabled = selectedParts.some((part) => part.addToOutline);

  // Add to outline control for multiple parts
  createCheckboxControl(container, "Add to Outline", allOutlineEnabled, (addToOutline) => {
    selectedParts.forEach((part) => {
      part.addToOutline = addToOutline;
      togglePartOutline(part, addToOutline);
    });
    updateSVGPartsList();
    updateInfoTable();
    redraw();
  });

  // Outline type selection
  if (!globalSettings.outlineType) {
    globalSettings.outlineType = "convex"; // Default to convex
  }

  createSelectControl(
    container,
    "Outline Type",
    {
      convex: "Convex Hull",
      bounding: "Bounding Box",
      scale: "Scaled Path",
    },
    globalSettings.outlineType,
    (value) => {
      globalSettings.outlineType = value;
      updateOutlinesForOffset(); // Auto-update all outlines when type changes
    },
  );

  // Outline offset control with automatic outline updates
  createSliderControl(container, "Outline Offset", 0.5, 20, globalSettings.outlineOffset, 0.1, (value) => {
    globalSettings.outlineOffset = value;
    updateOutlinesForOffset(); // Auto-update all outlines when offset changes
  });
}

function updatePartSettings(part, propagateToSelection = false) {
  const container = select("#part-settings");
  container.html(""); // Clear existing content

  if (!part) {
    const msg = createDiv("Select a part to edit its settings");
    msg.parent(container);
    msg.style("color", "#888");
    msg.style("font-style", "italic");
    msg.style("text-align", "center");
    msg.style("padding", "20px");
    return;
  }

  // Editable part name
  const nameLabel = createDiv("Part Name");
  nameLabel.parent(container);
  nameLabel.style("font-weight", "600");
  nameLabel.style("margin-bottom", "2px");
  nameLabel.style("font-size", "10px");
  nameLabel.style("color", "#666");

  const nameInput = createInput(part.name);
  nameInput.parent(container);
  nameInput.style("width", "100%");
  nameInput.style("padding", "8px");
  nameInput.style("border", "1px solid #ddd");
  nameInput.style("border-radius", "4px");
  nameInput.style("font-size", "14px");
  nameInput.style("margin-bottom", "0px");

  nameInput.changed(() => {
    part.name = nameInput.value();
    updateSVGPartsList(); // Update the button text
    updateInfoTable(); // Update the info table
  });

  // Size subsection (Width/Height + Lock Aspect + Scale X/Y)
  const sizeSec = createCollapsibleSection(container, "Size", true);
  (function(){
    const fsz = computeEditFrame(part);
    // Width/Height
    const sizeRow = createDiv(); sizeRow.parent(sizeSec.content); sizeRow.class('form-row');
    const sizeFieldW = createDiv(); sizeFieldW.parent(sizeRow); sizeFieldW.addClass('form-field');
    const sizeLabW = createDiv('Width'); sizeLabW.parent(sizeFieldW); sizeLabW.addClass('control-label');
    const sizeInputW = createInput((fsz.widthMm || 0).toFixed(2), 'number'); sizeInputW.parent(sizeFieldW); sizeInputW.addClass('value-input'); sizeInputW.attribute('step','0.1'); sizeInputW.style('width','80px');
    const sizeFieldH = createDiv(); sizeFieldH.parent(sizeRow); sizeFieldH.addClass('form-field');
    const sizeLabH = createDiv('Height'); sizeLabH.parent(sizeFieldH); sizeLabH.addClass('control-label');
    const sizeInputH = createInput((fsz.heightMm || 0).toFixed(2), 'number'); sizeInputH.parent(sizeFieldH); sizeInputH.addClass('value-input'); sizeInputH.attribute('step','0.1'); sizeInputH.style('width','80px');

    // Lock Aspect aligned with W/H
    const lockField = createDiv(); lockField.parent(sizeRow); lockField.addClass('form-field');
    let lockAspect = true;
    createCheckboxControl(lockField, 'Lock Aspect', lockAspect, (checked) => { lockAspect = checked; });

    const stopEvtLocal = (elt) => { ['keydown','keyup','keypress','wheel','mousedown'].forEach(evt => { elt.addEventListener(evt, (e) => { e.stopPropagation(); }); }); };
    stopEvtLocal(sizeInputW.elt); stopEvtLocal(sizeInputH.elt);

    const applySize = (source) => {
      let vw = parseFloat(sizeInputW.value());
      let vh = parseFloat(sizeInputH.value());
      let hasW = !isNaN(vw);
      let hasH = !isNaN(vh);
      if (lockAspect && (hasW ^ hasH)) {
        // compute live ratio from current frame
        const fcur = computeEditFrame(part);
        const ratio = (fcur.heightMm || 1) / Math.max(1e-6, fcur.widthMm || 1);
        if (hasW && !hasH && source === 'w') { vh = vw * ratio; sizeInputH.value(vh.toFixed(2)); hasH = true; }
        if (hasH && !hasW && source === 'h') { const wr = 1 / Math.max(1e-6, ratio); vw = vh * wr; sizeInputW.value(vw.toFixed(2)); hasW = true; }
      }
      if (!hasW && !hasH) return;
      const applyTo = propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map(i => svgParts[i]) : [part];
      applyTo.forEach(p => {
        const f = computeEditFrame(p);
        const base = f.base;
        if (hasW) { const baseW = Math.max(1e-6, base.w0); p.sx = Math.max(0.01, vw / baseW); }
        if (hasH) { const baseH = Math.max(1e-6, base.h0); p.sy = Math.max(0.01, vh / baseH); }
      });
      updateSVGPartsList(); updateInfoTable(); redraw();
    };
    sizeInputW.changed(() => applySize('w'));
    sizeInputH.changed(() => applySize('h'));

    // Scale X/Y
    const scaleRow = createDiv(); scaleRow.parent(sizeSec.content); scaleRow.class('form-row');
    const scxField = createDiv(); scxField.parent(scaleRow); scxField.addClass('form-field');
    const scxLab = createDiv('Scale X'); scxLab.parent(scxField); scxLab.addClass('control-label');
    const scxInput = createInput((part.sx || 1).toFixed(3), 'number'); scxInput.parent(scxField); scxInput.addClass('value-input'); scxInput.attribute('step','0.01'); scxInput.attribute('min','0.01'); scxInput.style('width','80px');
    const scyField = createDiv(); scyField.parent(scaleRow); scyField.addClass('form-field');
    const scyLab = createDiv('Scale Y'); scyLab.parent(scyField); scyLab.addClass('control-label');
    const scyInput = createInput((part.sy || 1).toFixed(3), 'number'); scyInput.parent(scyField); scyInput.addClass('value-input'); scyInput.attribute('step','0.01'); scyInput.attribute('min','0.01'); scyInput.style('width','80px');
    stopEvtLocal(scxInput.elt); stopEvtLocal(scyInput.elt);
    const applyScale = () => {
      const nsx = parseFloat(scxInput.value());
      const nsy = parseFloat(scyInput.value());
      const hasSX = !isNaN(nsx);
      const hasSY = !isNaN(nsy);
      if (!hasSX && !hasSY) return;
      const applyTo = propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map(i => svgParts[i]) : [part];
      applyTo.forEach(p => {
        if (hasSX) p.sx = Math.max(0.01, nsx);
        if (hasSY) p.sy = Math.max(0.01, nsy);
      });
      updateInfoTable(); redraw();
    };
    scxInput.changed(applyScale);
    scyInput.changed(applyScale);
  })();

  // Transform controls (collapsible)
  const transformSec = createCollapsibleSection(container, "Transform", true);

  // Position controls under Transform
  (function(){
    const frameForPos = computeEditFrame(part);
    const posRow = createDiv(); posRow.parent(transformSec.content); posRow.class('form-row');
    const posFieldX = createDiv(); posFieldX.parent(posRow); posFieldX.addClass('form-field');
    const posLabX = createDiv('Position X'); posLabX.parent(posFieldX); posLabX.addClass('control-label');
    const posInputX = createInput((frameForPos.centerMm.x || 0).toFixed(2), 'number'); posInputX.parent(posFieldX); posInputX.addClass('value-input'); posInputX.attribute('step','0.1'); posInputX.style('width','80px');
    const posFieldY = createDiv(); posFieldY.parent(posRow); posFieldY.addClass('form-field');
    const posLabY = createDiv('Position Y'); posLabY.parent(posFieldY); posLabY.addClass('control-label');
    const posInputY = createInput((frameForPos.centerMm.y || 0).toFixed(2), 'number'); posInputY.parent(posFieldY); posInputY.addClass('value-input'); posInputY.attribute('step','0.1'); posInputY.style('width','80px');
    const stopEvtPos = (elt) => { ['keydown','keyup','keypress','wheel','mousedown'].forEach(evt => { elt.addEventListener(evt, (e) => { e.stopPropagation(); }); }); };
    stopEvtPos(posInputX.elt); stopEvtPos(posInputY.elt);
    const applyPosition = () => {
      const vx = parseFloat(posInputX.value());
      const vy = parseFloat(posInputY.value());
      if (isNaN(vx) || isNaN(vy)) return;
      const applyTo = propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map(i => svgParts[i]) : [part];
      applyTo.forEach(p => {
        const f = computeEditFrame(p);
        const base = f.base;
        p.tx = vx - base.cx0;
        p.ty = vy - base.cy0;
      });
      updateSVGPartsList(); updateInfoTable(); redraw();
    };
    posInputX.changed(applyPosition);
    posInputY.changed(applyPosition);
  })();

  const txInput = createInput((part.tx || 0).toFixed(2), "number");
  const tyInput = createInput((part.ty || 0).toFixed(2), "number");
  const rotInput = createInput((((part.rotation || 0) * 180) / Math.PI).toFixed(1), "number");

  // Steps for smoother editing
  txInput.attribute("step", "0.1");
  tyInput.attribute("step", "0.1");
  rotInput.attribute("step", "0.1");

  // Set reasonable min/max to allow spinner to work
  txInput.attribute("min", "-100000");
  txInput.attribute("max", "100000");
  tyInput.attribute("min", "-100000");
  tyInput.attribute("max", "100000");
  rotInput.attribute("min", "-3600");
  rotInput.attribute("max", "3600");

  // Prevent canvas/global handlers from hijacking input events
  const shieldEvents = (elt) => {
    ["keydown", "keyup", "keypress", "wheel", "mousedown"].forEach((evt) => {
      elt.addEventListener(evt, (e) => {
        e.stopPropagation();
      });
    });
  };
  [txInput, tyInput, rotInput].forEach((inp) => {
    // Compact width per request
    inp.style("width", "80px");
    shieldEvents(inp.elt);
  });

  const row1 = createDiv();
  row1.parent(transformSec.content);
  row1.class("form-row");
  const row2 = createDiv();
  row2.parent(transformSec.content);
  row2.class("form-row");

  const makeLabeled = (row, label, input, unit) => {
    const wrap = createDiv();
    wrap.parent(row);
    wrap.class("form-field");
    const lab = createDiv(label);
    lab.parent(wrap);
    lab.class("control-label");
    input.parent(wrap);
    input.class("value-input");
    // No unit labels requested
  };

  // X and Y in the same row, no units
  makeLabeled(row1, "X", txInput);
  makeLabeled(row1, "Y", tyInput);
  makeLabeled(row2, "Rotate", rotInput);

  const btnRow = createDiv();
  btnRow.parent(transformSec.content);
  btnRow.style("margin", "8px 0 16px");
  const resetBtn = createButton("Reset Transform");
  resetBtn.parent(btnRow);
  resetBtn.mousePressed(() => {
    part.tx = 0;
    part.ty = 0;
    part.sx = 1;
    part.sy = 1;
    part.rotation = 0;
    updatePartSettings(part, propagateToSelection);
    updateInfoTable();
    redraw();
  });

  const parseOrNull = (el) => {
    const s = el.value();
    if (s === "" || s === "-" || s === "." || s === "-.") return null;
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  };

  const applyChanges = (finalize = false) => {
    const txv = parseOrNull(txInput);
    const tyv = parseOrNull(tyInput);
    const rtv = parseOrNull(rotInput);

    let changed = false;
    const applyTo =
      propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
    applyTo.forEach((p) => {
      if (txv !== null) {
        p.tx = txv;
        changed = true;
      }
      if (tyv !== null) {
        p.ty = tyv;
        changed = true;
      }
      if (rtv !== null) {
        p.rotation = (rtv * Math.PI) / 180;
        changed = true;
      }
    });
    if (changed || finalize) {
      updateInfoTable();
      redraw();
    }
  };

  // Live update on input when valid; always commit on change (blur/enter)
  txInput.input(() => applyChanges(false));
  tyInput.input(() => applyChanges(false));
  rotInput.input(() => applyChanges(false));

  txInput.changed(() => applyChanges(true));
  tyInput.changed(() => applyChanges(true));
  rotInput.changed(() => applyChanges(true));

  // Stroke settings (collapsible)
  const strokeSec = createCollapsibleSection(container, "Stroke Settings", true);

  // Move Enable Stroke to be the first control inside Stroke section
  createCheckboxControl(strokeSec.content, "Enable Stroke", part.strokeSettings.enabled, (enabled) => {
    const applyTo =
      propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
    applyTo.forEach((p) => (p.strokeSettings.enabled = enabled));
    updatePartSettings(part, propagateToSelection); // Refresh the UI to show/hide elements
    updateInfoTable();
    redraw();
  });

  // Create stroke controls container
  const strokeControlsDiv = createDiv();
  strokeControlsDiv.parent(strokeSec.content);
  strokeControlsDiv.id("stroke-controls");

  if (part.strokeSettings.enabled) {
    strokeControlsDiv.style("display", "block");

    createColorControl(strokeControlsDiv, "Stroke Color", part.strokeSettings.color, (color) => {
      const applyTo =
        propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
      applyTo.forEach((p) => (p.strokeSettings.color = color));
      updateSVGPartsList();
      updateInfoTable();
      redraw();
    });
    createSelectControl(
      strokeControlsDiv,
      "Stroke Mode",
      {
        straight: "straight",
        zigzag: "zigzag",
        lines: "lines",
        sashiko: "sashiko",
      },
      part.strokeSettings.mode,
      (value) => {
        const applyTo =
          propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
        applyTo.forEach((p) => {
          p.strokeSettings.mode = value;
          applyStrokeModeDefaults(p, value);
        });
        updatePartSettings(part, propagateToSelection); // Refresh UI to show new values
        updateInfoTable();
        redraw();
      },
    );

    createSliderControl(strokeControlsDiv, "Stroke Weight", 0.5, 10, part.strokeSettings.weight, 0.5, (value) => {
      const applyTo =
        propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
      applyTo.forEach((p) => (p.strokeSettings.weight = value));
      updateInfoTable();
      redraw();
    });

    createSliderControl(
      strokeControlsDiv,
      "Stroke Stitch Length",
      0.1,
      10,
      part.strokeSettings.stitchLength,
      0.1,
      (value) => {
        const applyTo =
          propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
        applyTo.forEach((p) => (p.strokeSettings.stitchLength = value));
        updateInfoTable();
        redraw();
      },
    );

    createSliderControl(
      strokeControlsDiv,
      "Min Stitch Length",
      0.1,
      5,
      part.strokeSettings.minStitchLength,
      0.1,
      (value) => {
        const applyTo =
          propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
        applyTo.forEach((p) => (p.strokeSettings.minStitchLength = value));
        updateInfoTable();
        redraw();
      },
    );

    createSliderControl(
      strokeControlsDiv,
      "Resample Noise",
      0.0,
      2,
      part.strokeSettings.resampleNoise,
      0.1,
      (value) => {
        const applyTo =
          propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
        applyTo.forEach((p) => (p.strokeSettings.resampleNoise = value));
        updateInfoTable();
        redraw();
      },
    );

    // Path closure control
    createCheckboxControl(strokeControlsDiv, "Close Path", part.closed, (closed) => {
      part.closed = closed;
      updateSVGPartsList();
      updateInfoTable();
      redraw();
    });
  } else {
    strokeControlsDiv.style("display", "none");
  }

  // Fill settings (collapsible)
  const fillSec = createCollapsibleSection(container, "Fill Settings", false);

  // Fill settings
  createCheckboxControl(container, "Enable Fill", part.fillSettings.enabled, (enabled) => {
    const applyTo =
      propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
    applyTo.forEach((p) => (p.fillSettings.enabled = enabled));
    updatePartSettings(part, propagateToSelection); // Refresh the UI to show/hide elements
    updateInfoTable();
    redraw();
  });

  // Create fill controls container
  const fillControlsDiv = createDiv();
  fillControlsDiv.parent(fillSec.content);
  fillControlsDiv.id("fill-controls");

  if (part.fillSettings.enabled) {
    fillControlsDiv.style("display", "block");

    createColorControl(fillControlsDiv, "Fill Color", part.fillSettings.color, (color) => {
      const applyTo =
        propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
      applyTo.forEach((p) => (p.fillSettings.color = color));
      updateSVGPartsList();
      updateInfoTable();
      redraw();
    });

    createSelectControl(
      fillControlsDiv,
      "Fill Mode",
      {
        tatami: "Tatami",
        satin: "Satin",
        spiral: "Spiral",
      },
      part.fillSettings.mode,
      (value) => {
        const applyTo =
          propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
        applyTo.forEach((p) => {
          p.fillSettings.mode = value;
          applyFillModeDefaults(p, value);
        });
        updatePartSettings(part, propagateToSelection); // Refresh UI to show new values
        updateInfoTable();
        redraw();
      },
    );

    createSliderControl(
      fillControlsDiv,
      "Fill Stitch Length",
      0.5,
      10,
      part.fillSettings.stitchLength,
      0.1,
      (value) => {
        const applyTo =
          propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
        applyTo.forEach((p) => (p.fillSettings.stitchLength = value));
        updateInfoTable();
        redraw();
      },
    );

    createSliderControl(fillControlsDiv, "Row Spacing", 0.2, 5, part.fillSettings.rowSpacing, 0.1, (value) => {
      const applyTo =
        propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
      applyTo.forEach((p) => (p.fillSettings.rowSpacing = value));
      updateInfoTable();
      redraw();
    });

    createSliderControl(
      fillControlsDiv,
      "Min Stitch Length",
      0.1,
      5,
      part.fillSettings.minStitchLength,
      0.1,
      (value) => {
        const applyTo =
          propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
        applyTo.forEach((p) => (p.fillSettings.minStitchLength = value));
        updateInfoTable();
        redraw();
      },
    );

    createSliderControl(fillControlsDiv, "Resample Noise", 0.0, 2, part.fillSettings.resampleNoise, 0.1, (value) => {
      const applyTo =
        propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
      applyTo.forEach((p) => (p.fillSettings.resampleNoise = value));
      updateInfoTable();
      redraw();
    });
  } else {
    fillControlsDiv.style("display", "none");
  }

  // Outline settings (collapsible)
  const outlineSec = createCollapsibleSection(container, "Outline Settings", false);
  // Add to outline control with automatic outline creation/removal
  createCheckboxControl(outlineSec.content, "Add to Outline", part.addToOutline, (addToOutline) => {
    const applyTo =
      propagateToSelection && selectedPartIndices.length > 1 ? selectedPartIndices.map((i) => svgParts[i]) : [part];
    applyTo.forEach((p) => {
      p.addToOutline = addToOutline;
      togglePartOutline(p, addToOutline);
    });
  });

  // Outline type selection
  if (!globalSettings.outlineType) {
    globalSettings.outlineType = "convex"; // Default to convex
  }

  createSelectControl(
    outlineSec.content,
    "Outline Type",
    {
      convex: "Convex Hull",
      bounding: "Bounding Box",
      scale: "Scaled Path",
    },
    globalSettings.outlineType,
    (value) => {
      globalSettings.outlineType = value;
      updateOutlinesForOffset(); // Auto-update all outlines when type changes
    },
  );

  // Outline offset control with automatic outline updates
  createSliderControl(outlineSec.content, "Outline Offset", 0.5, 20, globalSettings.outlineOffset, 0.1, (value) => {
    globalSettings.outlineOffset = value;
    updateOutlinesForOffset(); // Auto-update all outlines when offset changes
  });
}

function updateInfoDisplay() {
  const container = select("#info-display");
  if (!container) return;

  container.html(""); // Clear existing content

  if (svgParts.length === 0) {
    const msg = createDiv("No SVG parts loaded");
    msg.parent(container);
    msg.style("color", "#888");
    msg.style("font-style", "italic");
    msg.style("text-align", "center");
    msg.style("padding", "20px");
    return;
  }

  // Create info table display
  updateInfoTable();
}

function updateInfoTable() {
  const container = document.getElementById("info-display");
  if (!container) return;

  if (svgParts.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: var(--text-muted); padding: var(--space-4);">No SVG parts loaded</p>';
    return;
  }

  let tableHTML = `
    <table class="info-table">
      <thead>
        <tr>
          <th>Part</th>
          <th>Type</th>
          <th>Stroke</th>
          <th>Fill</th>
          <th>Mode</th>
          <th>Stitch Length</th>
          <th>Weight</th>
          <th>Visible</th>
          <th>Outline</th>
        </tr>
      </thead>
      <tbody>
  `;

  svgParts.forEach((part) => {
    const strokeColor = part.strokeSettings.enabled ? `rgb(${part.strokeSettings.color.join(",")})` : "transparent";
    const fillColor = part.fillSettings.enabled ? `rgb(${part.fillSettings.color.join(",")})` : "transparent";

    tableHTML += `
      <tr>
        <td class="part-name">${part.name}</td>
        <td>${part.isOutline ? "outline" : part.elementType}</td>
        <td>
          <div class="color-cell">
            <div class="color-swatch" style="background-color: ${strokeColor}"></div>
            <span>${part.strokeSettings.enabled ? part.strokeSettings.mode : "none"}</span>
          </div>
        </td>
        <td>
          <div class="color-cell">
            <div class="color-swatch" style="background-color: ${fillColor}"></div>
            <span>${part.fillSettings.enabled ? part.fillSettings.mode : "none"}</span>
          </div>
        </td>
        <td>${part.strokeSettings.enabled ? part.strokeSettings.mode : part.fillSettings.enabled ? part.fillSettings.mode : "none"}</td>
        <td>${part.strokeSettings.enabled ? part.strokeSettings.stitchLength.toFixed(1) + "mm" : part.fillSettings.enabled ? part.fillSettings.stitchLength.toFixed(1) + "mm" : "-"}</td>
        <td>${part.strokeSettings.enabled ? part.strokeSettings.weight.toFixed(1) + "mm" : "-"}</td>
        <td>${part.visible ? "✓" : "✗"}</td>
        <td>${part.addToOutline ? "✓" : "✗"}</td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
    
    <h4 style="margin: var(--space-4) 0 var(--space-2) 0; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-secondary);">Global Settings</h4>
    <table class="info-table">
      <thead>
        <tr>
          <th>Setting</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Output Width</td>
          <td>${globalSettings.outputWidth}mm</td>
        </tr>
        <tr>
          <td>Output Height</td>
          <td>${globalSettings.outputHeight}mm</td>
        </tr>
        <tr>
          <td>DPI</td>
          <td>${globalSettings.dpi || 96}</td>
        </tr>
        <tr>
          <td>Adobe Mode</td>
          <td>${globalSettings.adobeDPI ? "✓ (72 dpi)" : "✗"}</td>
        </tr>
        <tr>
          <td>Outline Offset</td>
          <td>${globalSettings.outlineOffset}mm</td>
        </tr>
        <tr>
          <td>Outline Type</td>
          <td>${globalSettings.outlineType === "convex" ? "Convex Hull" : globalSettings.outlineType === "bounding" ? "Bounding Box" : "Scaled Path"}</td>
        </tr>
        <tr>
          <td>Lock Aspect Ratio</td>
          <td>${globalSettings.lockAspectRatio ? "✓" : "✗"}</td>
        </tr>
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

// Export functions
function exportP5Code() {
  if (svgParts.length === 0) {
    console.warn("No SVG parts to export");
    return;
  }

  let code = `// Generated embroidery code using p5.embroider with object-based SVG parts
function setup() {
  createCanvas(400, 400);
  
  // Start embroidery recording
  beginRecord(this);
  
  // Configure p5.embroider settings
  setDrawMode("${drawMode}");

  // SVG Parts Array (${svgParts.length} parts)
`;

  svgParts.forEach((part, index) => {
    code += `
  // ${part.name}
  setStrokeMode("${part.strokeSettings.mode}");
  setFillMode("${part.fillSettings.mode}");
  
  setStrokeSettings({
    stitchLength: ${part.strokeSettings.stitchLength},
    minStitchLength: ${part.strokeSettings.minStitchLength},
    resampleNoise: ${part.strokeSettings.resampleNoise},
    strokeWeight: ${part.strokeSettings.weight}
  });
  
  setFillSettings({
    stitchLength: ${part.fillSettings.stitchLength},
    minStitchLength: ${part.fillSettings.minStitchLength},
    resampleNoise: ${part.fillSettings.resampleNoise},
    rowSpacing: ${part.fillSettings.rowSpacing}
  });
  
  ${
    part.strokeSettings.enabled
      ? `stroke(${part.strokeSettings.color[0]}, ${part.strokeSettings.color[1]}, ${part.strokeSettings.color[2]});
  strokeWeight(${part.strokeSettings.weight});`
      : "noStroke();"
  }
  
  ${
    part.fillSettings.enabled
      ? `fill(${part.fillSettings.color[0]}, ${part.fillSettings.color[1]}, ${part.fillSettings.color[2]});`
      : "noFill();"
  }
  
  `;

    if (part.shapeParams) {
      const params = part.shapeParams;
      const scaleX = globalSettings.outputWidth / boundingBox.width;
      const scaleY = globalSettings.outputHeight / boundingBox.height;
      const scaleFactor = Math.min(scaleX, scaleY);

      const offsetX =
        (globalSettings.outputWidth - boundingBox.width * scaleFactor) / 2 - boundingBox.minX * scaleFactor;
      const offsetY =
        (globalSettings.outputHeight - boundingBox.height * scaleFactor) / 2 - boundingBox.minY * scaleFactor;

      switch (part.elementType) {
        case "circle":
          const circleX = (offsetX + params.cx * scaleFactor).toFixed(1);
          const circleY = (offsetY + params.cy * scaleFactor).toFixed(1);
          const circleD = (params.r * scaleFactor * 2).toFixed(1);
          code += `circle(${circleX}, ${circleY}, ${circleD});`;
          break;
        case "rect":
          const rectX = (offsetX + params.x * scaleFactor).toFixed(1);
          const rectY = (offsetY + params.y * scaleFactor).toFixed(1);
          const rectW = (params.w * scaleFactor).toFixed(1);
          const rectH = (params.h * scaleFactor).toFixed(1);
          code += `rect(${rectX}, ${rectY}, ${rectW}, ${rectH});`;
          break;
        case "ellipse":
          const ellipseX = (offsetX + params.cx * scaleFactor).toFixed(1);
          const ellipseY = (offsetY + params.cy * scaleFactor).toFixed(1);
          const ellipseW = (params.rx * scaleFactor * 2).toFixed(1);
          const ellipseH = (params.ry * scaleFactor * 2).toFixed(1);
          code += `ellipse(${ellipseX}, ${ellipseY}, ${ellipseW}, ${ellipseH});`;
          break;
        case "line":
          const lineX1 = (offsetX + params.x1 * scaleFactor).toFixed(1);
          const lineY1 = (offsetY + params.y1 * scaleFactor).toFixed(1);
          const lineX2 = (offsetX + params.x2 * scaleFactor).toFixed(1);
          const lineY2 = (offsetY + params.y2 * scaleFactor).toFixed(1);
          code += `line(${lineX1}, ${lineY1}, ${lineX2}, ${lineY2});`;
          break;
        default:
          code += `beginShape();`;
          const points = getPathPoints(part.pathData);
          points.forEach((point) => {
            const scaledX = ((point.x - boundingBox.minX) / boundingBox.width) * globalSettings.outputWidth;
            const scaledY = ((point.y - boundingBox.minY) / boundingBox.height) * globalSettings.outputHeight;
            code += `\n  vertex(${scaledX.toFixed(1)}, ${scaledY.toFixed(1)});`;
          });
          code += `\n  endShape${part.closed ? "(CLOSE)" : "()"}`;
      }
    } else {
      code += `beginShape();`;
      const points = getPathPoints(part.pathData);
      points.forEach((point) => {
        const scaledX = ((point.x - boundingBox.minX) / boundingBox.width) * globalSettings.outputWidth;
        const scaledY = ((point.y - boundingBox.minY) / boundingBox.height) * globalSettings.outputHeight;
        code += `\n  vertex(${scaledX.toFixed(1)}, ${scaledY.toFixed(1)});`;
      });
      code += `\n  endShape${part.closed ? "(CLOSE)" : "()"}`;
    }

    code += `\n`;
  });

  code += `  
  endRecord();
  exportEmbroidery("svg_objects.dst");
}`;

  // Create and download file
  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "embroidery_sketch.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSVG() {
  if (svgParts.length === 0) {
    console.warn("No SVG parts to export");
    return;
  }

  let svgContent = `<svg width="${globalSettings.outputWidth}" height="${globalSettings.outputHeight}" xmlns="http://www.w3.org/2000/svg">
`;

  svgParts.forEach((part) => {
    if (!part.visible) return;

    const strokeColor = part.strokeSettings.enabled ? `rgb(${part.strokeSettings.color.join(",")})` : "none";
    const fillColor = part.fillSettings.enabled ? `rgb(${part.fillSettings.color.join(",")})` : "none";
    const strokeWidth = part.strokeSettings.enabled ? part.strokeSettings.weight : 0;

    if (part.shapeParams) {
      const params = part.shapeParams;
      switch (part.elementType) {
        case "circle":
          svgContent += `  <circle cx="${params.cx}" cy="${params.cy}" r="${params.r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>\n`;
          break;
        case "rect":
          svgContent += `  <rect x="${params.x}" y="${params.y}" width="${params.w}" height="${params.h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>\n`;
          break;
        case "ellipse":
          svgContent += `  <ellipse cx="${params.cx}" cy="${params.cy}" rx="${params.rx}" ry="${params.ry}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>\n`;
          break;
        case "line":
          svgContent += `  <line x1="${params.x1}" y1="${params.y1}" x2="${params.x2}" y2="${params.y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>\n`;
          break;
      }
    } else {
      svgContent += `  <path d="${part.pathData}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>\n`;
    }
  });

  svgContent += `</svg>`;

  // Create and download file
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "design.svg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function createOutlineForPart(originalPart) {
  // Create a unique outline for this specific part
  const outlineId = `outline_${originalPart.id}_${globalSettings.outlineOffset}`;

  // Check if outline already exists for this part with this offset
  const existingOutline = svgParts.find((part) => part.id === outlineId);
  if (existingOutline) {
    return existingOutline; // Already exists, return existing
  }

  console.log(`Creating outline for ${originalPart.name} with offset ${globalSettings.outlineOffset}mm`);

  // Convert original part path to stitch data points
  const originalPoints = getPathPoints(originalPart.pathData);
  if (originalPoints.length === 0) {
    console.warn(`No points found for part ${originalPart.name}, cannot create outline`);
    return null;
  }

  // Use embroideryOutlineFromPath to create outline points
  const outlineType = globalSettings.outlineType || "convex";
  const outlinePoints = embroideryOutlineFromPath(
    originalPoints,
    globalSettings.outlineOffset,
    null, // Don't add to threads automatically
    outlineType, // Use selected outline type
    false, // Don't apply transform here
  );

  if (outlinePoints.length === 0) {
    console.warn(`Failed to create outline points for part ${originalPart.name}`);
    return null;
  }

  // Convert outline points back to SVG path data
  let outlinePathData = "";
  if (outlinePoints.length > 0) {
    outlinePathData = `M ${outlinePoints[0].x} ${outlinePoints[0].y}`;
    for (let i = 1; i < outlinePoints.length; i++) {
      outlinePathData += ` L ${outlinePoints[i].x} ${outlinePoints[i].y}`;
    }
    // Close the outline path
    outlinePathData += " Z";
  }

  const outlinePart = {
    id: outlineId,
    name: `${originalPart.name} Outline (${globalSettings.outlineOffset}mm)`,
    elementType: "path",
    pathData: outlinePathData,
    shapeParams: null,
    closed: true, // Outlines are always closed
    sourcePartId: originalPart.id, // Link to original part
    isOutline: true,
    outlineOffset: globalSettings.outlineOffset,
    strokeSettings: {
      enabled: true,
      color: [255, 0, 0], // Red outline
      weight: 1,
      mode: "straight",
      stitchLength: 2,
      minStitchLength: 0.5,
      resampleNoise: 0.0,
    },
    fillSettings: {
      enabled: false,
      color: [0, 0, 0],
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

  svgParts.push(outlinePart);
  console.log(`Outline created for ${originalPart.name} with ${outlinePoints.length} points`);
  return outlinePart;
}

function removeOutlineForPart(originalPart) {
  // Remove all outlines for this part
  const outlinesToRemove = svgParts.filter((part) => part.isOutline && part.sourcePartId === originalPart.id);

  outlinesToRemove.forEach((outline) => {
    const index = svgParts.indexOf(outline);
    if (index > -1) {
      svgParts.splice(index, 1);
      console.log(`Removed outline for ${originalPart.name}`);
    }
  });
}

function updateOutlinesForOffset() {
  // Get all parts that should have outlines
  const partsWithOutlines = svgParts.filter((part) => !part.isOutline && part.addToOutline);

  // Remove all existing outlines
  partsWithOutlines.forEach((part) => {
    removeOutlineForPart(part);
  });

  // Create new outlines with current offset
  partsWithOutlines.forEach((part) => {
    createOutlineForPart(part);
  });

  if (partsWithOutlines.length > 0) {
    updateSVGPartsList();
    updateInfoTable();
    redraw();
  }
}

function togglePartOutline(part, shouldHaveOutline) {
  if (shouldHaveOutline) {
    createOutlineForPart(part);
  } else {
    removeOutlineForPart(part);
  }

  updateSVGPartsList();
  updateInfoTable();
  redraw();
}

function exportOutlineSVG() {
  // Get parts that have "Add to Outline" enabled
  const outlineParts = svgParts.filter((part) => part.addToOutline);

  if (outlineParts.length === 0) {
    console.warn("No parts selected for outline export");
    return;
  }

  let svgContent = `<svg width="${globalSettings.outputWidth}" height="${globalSettings.outputHeight}" xmlns="http://www.w3.org/2000/svg">
`;

  outlineParts.forEach((part) => {
    if (part.shapeParams) {
      const params = part.shapeParams;
      switch (part.elementType) {
        case "circle":
          svgContent += `  <circle cx="${params.cx}" cy="${params.cy}" r="${params.r}" fill="none" stroke="red" stroke-width="1"/>\n`;
          break;
        case "rect":
          svgContent += `  <rect x="${params.x}" y="${params.y}" width="${params.w}" height="${params.h}" fill="none" stroke="red" stroke-width="1"/>\n`;
          break;
        case "ellipse":
          svgContent += `  <ellipse cx="${params.cx}" cy="${params.cy}" rx="${params.rx}" ry="${params.ry}" fill="none" stroke="red" stroke-width="1"/>\n`;
          break;
        case "line":
          svgContent += `  <line x1="${params.x1}" y1="${params.y1}" x2="${params.x2}" y2="${params.y2}" stroke="red" stroke-width="1"/>\n`;
          break;
      }
    } else {
      svgContent += `  <path d="${part.pathData}" fill="none" stroke="red" stroke-width="1"/>\n`;
    }
  });

  svgContent += `</svg>`;

  // Create and download file
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "outline.svg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearCanvas() {
  svgParts = [];
  selectedPartIndices = [];
  svgInput.value("");
  boundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };

  // Clear UI panels
  select("#svg-parts-list").html("");
  select("#part-settings").html("");

  // Update info table
  updateInfoTable();

  // Reset title
  updateCanvasTitle();

  redraw();
}

function exportObjectsAsJSON(filename) {
  const exportData = {
    metadata: {
      created: new Date().toISOString(),
      tool: "p5.embroider SVG Object Importer",
      outputDimensions: {
        width: globalSettings.outputWidth,
        height: globalSettings.outputHeight,
      },
    },
    globalSettings: globalSettings,
    boundingBox: boundingBox,
    parts: svgParts,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "svg_objects.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log(`Objects exported as JSON: ${filename}`);
}

// Helper function to copy text to clipboard
function copyToClipboard(text) {
  try {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Code copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy code: ", err);
      });
  } catch (err) {
    console.error("Clipboard not available: ", err);
  }
}

// Helper functions for UI controls (same as svginput2)
function createSliderControl(container, label, min, max, defaultValue, step, callback) {
  const controlDiv = createDiv();
  controlDiv.parent(container);
  controlDiv.class("slider-control");

  const labelElem = createDiv(label);
  labelElem.parent(controlDiv);
  labelElem.class("control-label");

  const sliderContainer = createDiv();
  sliderContainer.parent(controlDiv);
  sliderContainer.class("slider-container");

  const slider = createSlider(min, max, defaultValue, step);
  slider.parent(sliderContainer);

  // Create input field for manual entry with mm suffix
  const valueInput = createInput(defaultValue.toFixed(1));
  valueInput.parent(sliderContainer);
  valueInput.class("value-input");
  valueInput.attribute("type", "number");
  valueInput.attribute("min", min);
  valueInput.attribute("max", max);
  valueInput.attribute("step", step);

  const mmLabel = createSpan("mm");
  mmLabel.parent(sliderContainer);
  mmLabel.class("unit-label");

  const updateValue = (value) => {
    const clampedValue = Math.max(min, Math.min(max, parseFloat(value) || min));
    slider.value(clampedValue);
    valueInput.value(clampedValue.toFixed(1));
    callback(clampedValue);
  };

  slider.input(() => {
    const value = slider.value();
    valueInput.value(value.toFixed(1));
    callback(value);
  });

  valueInput.input(() => {
    const value = parseFloat(valueInput.value());
    if (!isNaN(value)) {
      updateValue(value);
    }
  });

  return { slider, valueDisplay: valueInput };
}

function createColorControl(container, label, defaultValue, callback) {
  const controlDiv = createDiv();
  controlDiv.parent(container);
  controlDiv.class("color-control");

  const labelElem = createDiv(label);
  labelElem.parent(controlDiv);
  labelElem.class("control-label");

  const colorPicker = createColorPicker(color(defaultValue[0], defaultValue[1], defaultValue[2]));
  colorPicker.parent(controlDiv);

  colorPicker.input(() => {
    const c = colorPicker.color();
    const colorArray = [red(c), green(c), blue(c)];
    callback(colorArray);
  });

  return colorPicker;
}

function createSelectControl(container, label, options, defaultValue, callback) {
  const controlDiv = createDiv();
  controlDiv.parent(container);
  controlDiv.class("select-control");

  const labelElem = createDiv(label);
  labelElem.parent(controlDiv);
  labelElem.class("control-label");

  const select = createSelect();
  select.parent(controlDiv);

  for (let key in options) {
    select.option(options[key], key);
  }

  select.selected(options[defaultValue]);

  select.changed(() => {
    const selectedKey = Object.keys(options).find((key) => options[key] === select.value());
    callback(selectedKey);
  });

  return select;
}

function createCheckboxControl(container, label, defaultValue, callback) {
  const controlDiv = createDiv();
  controlDiv.parent(container);
  controlDiv.class("checkbox-control");

  const checkbox = createCheckbox("", defaultValue);
  checkbox.parent(controlDiv);
  checkbox.id(label.toLowerCase().replace(/\s+/g, "-"));

  const labelElem = createDiv(label);
  labelElem.parent(controlDiv);
  labelElem.class("control-label");
  labelElem.elt.setAttribute("for", label.toLowerCase().replace(/\s+/g, "-"));

  checkbox.changed(() => {
    callback(checkbox.checked());
  });

  return checkbox;
}

function createTextAreaControl(container, label, placeholder, height) {
  const controlDiv = createDiv();
  controlDiv.parent(container);
  controlDiv.class("form-control");

  if (label && label.trim()) {
    const labelElem = createDiv(label);
    labelElem.parent(controlDiv);
    labelElem.elt.style.marginBottom = "8px";
    labelElem.elt.style.fontWeight = "500";
  }

  const textarea = createElement("textarea");
  textarea.parent(controlDiv);
  textarea.attribute("placeholder", placeholder);
  textarea.elt.style.height = height + "px";

  return textarea;
}

// Collapsible section helper
function createCollapsibleSection(parent, title, initiallyOpen = true) {
  const section = createDiv();
  section.parent(parent);
  section.addClass("collapsible-section");

  const header = createDiv(title);
  header.parent(section);
  header.addClass("collapsible-header");
  header.style("cursor", "pointer");
  header.style("user-select", "none");
  header.style("font-weight", "600");
  header.style("margin", "16px 0 8px 0");
  header.style("padding-bottom", "8px");
  header.style("border-bottom", "1px solid #ddd");

  const indicator = createSpan(initiallyOpen ? "▾" : "▸");
  indicator.parent(header);
  indicator.style("float", "right");
  indicator.style("color", "#888");

  const content = createDiv();
  content.parent(section);
  if (!initiallyOpen) content.style("display", "none");

  header.mousePressed(() => {
    const visible = content.elt.style.display !== "none";
    content.style("display", visible ? "none" : "block");
    indicator.html(visible ? "▸" : "▾");
  });

  return { section, header, content };
}

function keyPressed() {
  // Ignore global keybinds when editing a form element
  const ae = document.activeElement;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
  if (key === "l" || key === "L") {
    loadSVGFromTextArea();
  } else if (key === "c" || key === "C") {
    clearCanvas();
  } else if (key === "m" || key === "M") {
    moveKeyHeld = true;
  }
}

function keyReleased() {
  const ae = document.activeElement;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
  if (key === "m" || key === "M") {
    moveKeyHeld = false;
  }
}

function exportOutline() {
  if (svgParts.length === 0) {
    console.warn("No SVG parts to export");
    return;
  }

  // Filter parts that are actual outline parts (not the original parts)
  const outlineParts = svgParts.filter((part) => part.isOutline === true);

  if (outlineParts.length === 0) {
    console.warn("No outline parts found. Use the 'Add to Outline' checkbox in part settings to create outlines.");
    return;
  }

  // Create SVG content for outline
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${globalSettings.outputWidth}" height="${globalSettings.outputHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${globalSettings.outputWidth} ${globalSettings.outputHeight}">`;

  // Add each outline part as SVG elements
  outlineParts.forEach((part, index) => {
    if (part.visible) {
      // For outline export, we typically want just the stroke/outline
      let attributes = "";

      // Use stroke color if available, otherwise use a default outline color
      if (part.strokeSettings.enabled && part.strokeSettings.color) {
        const [r, g, b] = part.strokeSettings.color;
        attributes += ` stroke="rgb(${r},${g},${b})"`;
      } else {
        // Default outline color (black)
        attributes += ' stroke="black"';
      }

      // Set stroke width for outline
      const strokeWidth = part.strokeSettings.enabled ? part.strokeSettings.weight : 2;
      attributes += ` stroke-width="${strokeWidth}"`;

      // No fill for outline export
      attributes += ' fill="none"';

      // Convert path data to SVG path element
      svgContent += `\n  <path d="${part.pathData}"${attributes}/>`;
    }
  });

  svgContent += "\n</svg>";

  // Create download link
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "outline_export.svg";
  a.textContent = "Download Outline SVG";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`Outline exported successfully with ${outlineParts.length} outline parts`);
}
