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
  outlineType: 'convex',
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
  const canvasWrapper = document.getElementById('canvas-wrapper');
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
  sashiko: { weight: 2, stitchLength: 4 }
};

const FILL_MODE_DEFAULTS = {
  tatami: { stitchLength: 3, rowSpacing: 0.8 },
  satin: { stitchLength: 1, rowSpacing: 0.4 },
  spiral: { stitchLength: 2, rowSpacing: 1 }
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
  const mainTabButtons = document.querySelectorAll('.main-tab-button');
  const mainTabPanes = document.querySelectorAll('.main-tab-pane');
  
  mainTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and panes
      mainTabButtons.forEach(btn => btn.classList.remove('active'));
      mainTabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
      
      // Update info table when Info tab is activated
      if (targetTab === 'info') {
        updateInfoTable();
      }
    });
  });
}

function updateCanvasTitle(filename) {
  const titleElement = document.getElementById('canvas-title');
  if (titleElement) {
    if (filename) {
      titleElement.textContent = `SVG2Embroider - ${filename}`;
    } else {
      titleElement.textContent = 'SVG2Embroider';
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
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.svg,image/svg+xml';
      fileInput.style.display = 'none';
      
      fileInput.addEventListener('change', (e) => {
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
  
  createButton("Load SVG")
    .parent(svgButtonsContainer)
    .class("primary")
    .mousePressed(() => loadSVGFromTextArea());
  
  
  createButton("Clear")
    .parent(svgButtonsContainer)
    .class("secondary")
    .mousePressed(() => clearCanvas());

  // Initialize info display in right sidebar
  updateInfoDisplay();

  // Dimension controls
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
    }
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
    }
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
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.svg,image/svg+xml';
      fileInput.style.display = 'none';
      
      fileInput.addEventListener('change', (e) => {
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
    
    // Apply individual part settings
    applyPartSettings(part);
    
    // Draw the part using p5.js primitives when possible
    if (part.shapeParams && usePrimitiveShape(part, scaleFactor, offsetX, offsetY)) {
      // Primitive shape was drawn, continue to next part
      continue;
    }
    
    // Fall back to vertex-based drawing for complex paths
    const points = getPathPoints(part.pathData);
    if (points.length >= 2) {
      beginShape();
      for (let point of points) {
        const x = offsetX + point.x * scaleFactor;
        const y = offsetY + point.y * scaleFactor;
        vertex(x, y);
      }
      if (part.closed) {
        endShape(CLOSE);
      } else {
        endShape();
      }
    }
  }

  pop();
  endRecord();

  // Draw selection highlight in preview only (outside recording)
  drawSelectedOverlay(scaleFactor, offsetX, offsetY);

  // Remove preview-only transforms
  pop();

  // UI overlay (drawn in screen space)
  drawPreviewUIOverlay();
}

// Draw a visual highlight for selected parts in preview only (not recorded)
function drawSelectedOverlay(scaleFactor, offsetX, offsetY) {
  if (!selectedPartIndices || selectedPartIndices.length === 0) return;
  push();
  noFill();

  // Keep overlay thickness constant on screen regardless of previewScale
  const outerW = Math.max(1, 4 / previewScale);
  const innerW = Math.max(1, 2 / previewScale);

  // Helper to draw one outline pass with given stroke
  function drawOutlinePass(strokeColor, weight) {
    stroke(strokeColor[0], strokeColor[1], strokeColor[2], strokeColor[3]);
    strokeWeight(weight);

    for (const idx of selectedPartIndices) {
      const part = svgParts[idx];
      if (!part || part.visible === false) continue;

      if (part.shapeParams) {
        const params = part.shapeParams;
        switch (part.elementType) {
          case "circle": {
            const cx = mmToPixel(offsetX + params.cx * scaleFactor);
            const cy = mmToPixel(offsetY + params.cy * scaleFactor);
            const d = mmToPixel(params.r * scaleFactor * 2);
            ellipse(cx, cy, d, d);
            break;
          }
          case "rect": {
            const x = mmToPixel(offsetX + params.x * scaleFactor);
            const y = mmToPixel(offsetY + params.y * scaleFactor);
            const w = mmToPixel(params.w * scaleFactor);
            const h = mmToPixel(params.h * scaleFactor);
            rect(x, y, w, h);
            break;
          }
          case "ellipse": {
            const cx = mmToPixel(offsetX + params.cx * scaleFactor);
            const cy = mmToPixel(offsetY + params.cy * scaleFactor);
            const w = mmToPixel(params.rx * scaleFactor * 2);
            const h = mmToPixel(params.ry * scaleFactor * 2);
            ellipse(cx, cy, w, h);
            break;
          }
          case "line": {
            const x1 = mmToPixel(offsetX + params.x1 * scaleFactor);
            const y1 = mmToPixel(offsetY + params.y1 * scaleFactor);
            const x2 = mmToPixel(offsetX + params.x2 * scaleFactor);
            const y2 = mmToPixel(offsetY + params.y2 * scaleFactor);
            line(x1, y1, x2, y2);
            break;
          }
          default: {
            // Fallback to path points
            const points = getPathPoints(part.pathData);
            if (points.length >= 2) {
              beginShape();
              for (const point of points) {
                const px = mmToPixel(offsetX + point.x * scaleFactor);
                const py = mmToPixel(offsetY + point.y * scaleFactor);
                vertex(px, py);
              }
              if (part.closed) endShape(CLOSE); else endShape();
            }
          }
        }
      } else {
        // General path
        const points = getPathPoints(part.pathData);
        if (points.length >= 2) {
          beginShape();
          for (const point of points) {
            const px = mmToPixel(offsetX + point.x * scaleFactor);
            const py = mmToPixel(offsetY + point.y * scaleFactor);
            vertex(px, py);
          }
          if (part.closed) endShape(CLOSE); else endShape();
        }
      }
    }
  }

  // White halo then blue line for contrast over any background
  drawOutlinePass([255, 255, 255, 220], outerW);
  drawOutlinePass([0, 120, 255, 230], innerW);

  pop();
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
    const dy = (height-mouseY) - (height-pmouseY);
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
      const worldX = ((mouseX - coX - cx - previewPanX) / oldScale) + cx;
      const worldY = ((mouseY - coY - cy - previewPanY) / oldScale) + cy;

      // Update pan to keep mouse-anchored zoom
      previewPanX -= (oldScale - newScale) * (worldX - cx);
      previewPanY -= (oldScale - newScale) * (worldY - cy);
      previewScale = newScale;
    }
    handled = true;
  }

  //if (keyIsDown(SHIFT)) {
    // Pan follows mouse movement with modest sensitivity
    const dx = mouseX - pmouseX;
    const dy = mouseY - pmouseY;
    const sensitivity = 0.5; // drag sensitivity
    previewPanX += dx * sensitivity;
    previewPanY += dy * sensitivity;
    console.log(previewPanX, previewPanY);
    handled = true;
  //}

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
}

function mouseReleased() {
  isDraggingScale = false;
  isPreviewInteracting = false;
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
    const worldX = ((mouseX - coX - cx - previewPanX) / oldScale) + cx;
    const worldY = ((mouseY - coY - cy - previewPanY) / oldScale) + cy;

    previewPanX -= (oldScale - newScale) * (worldX - cx);
    previewPanY -= (oldScale - newScale) * (worldY - cy);
    previewScale = newScale;

    redraw();
  }

  // Prevent page scroll
  return false;
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
  svgParts.forEach(part => part.selected = false);
  
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

  // Get common values for controls
  const selectedParts = selectedPartIndices.map(i => svgParts[i]);
  
  // Common stroke enable state
  const allStrokeEnabled = selectedParts.every(part => part.strokeSettings.enabled);
  const someStrokeEnabled = selectedParts.some(part => part.strokeSettings.enabled);
  
  // Common fill enable state  
  const allFillEnabled = selectedParts.every(part => part.fillSettings.enabled);
  const someFillEnabled = selectedParts.some(part => part.fillSettings.enabled);

  // Stroke settings section header
  const strokeHeader = createDiv("Stroke Settings");
  strokeHeader.parent(container);
  strokeHeader.style("font-weight", "600");
  strokeHeader.style("margin", "16px 0 8px 0");
  strokeHeader.style("padding-bottom", "8px");
  strokeHeader.style("border-bottom", "1px solid #ddd");

  // Stroke settings
  createCheckboxControl(container, "Enable Stroke", allStrokeEnabled, (enabled) => {
    selectedParts.forEach(part => {
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
      selectedParts.forEach(part => {
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
    createSelectControl(strokeControlsDiv, "Stroke Mode", {
      straight: "straight",
      zigzag: "zigzag", 
      lines: "lines",
      sashiko: "sashiko"
    }, commonStrokeMode, (value) => {
      selectedParts.forEach(part => {
        if (part.strokeSettings.enabled) {
          part.strokeSettings.mode = value;
          applyStrokeModeDefaults(part, value);
        }
      });
      updateMultiPartSettings(); // Refresh UI to show new values
      updateInfoTable();
      redraw();
    });

    // Common stroke weight
    const commonStrokeWeight = selectedParts[0].strokeSettings.weight;
    createSliderControl(strokeControlsDiv, "Stroke Weight", 0.5, 10, commonStrokeWeight, 0.5, (value) => {
      selectedParts.forEach(part => {
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
      selectedParts.forEach(part => {
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
      selectedParts.forEach(part => {
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
      selectedParts.forEach(part => {
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
    selectedParts.forEach(part => {
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
      selectedParts.forEach(part => {
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
    createSelectControl(fillControlsDiv, "Fill Mode", {
      tatami: "Tatami",
      satin: "Satin",
      spiral: "Spiral"
    }, commonFillMode, (value) => {
      selectedParts.forEach(part => {
        if (part.fillSettings.enabled) {
          part.fillSettings.mode = value;
          applyFillModeDefaults(part, value);
        }
      });
      updateMultiPartSettings(); // Refresh UI to show new values
      updateInfoTable();
      redraw();
    });

    // Common fill stitch length
    const commonFillStitchLength = selectedParts[0].fillSettings.stitchLength;
    createSliderControl(fillControlsDiv, "Fill Stitch Length", 0.5, 10, commonFillStitchLength, 0.1, (value) => {
      selectedParts.forEach(part => {
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
      selectedParts.forEach(part => {
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
      selectedParts.forEach(part => {
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
      selectedParts.forEach(part => {
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
  const allOutlineEnabled = selectedParts.every(part => part.addToOutline);
  const someOutlineEnabled = selectedParts.some(part => part.addToOutline);

  // Add to outline control for multiple parts
  createCheckboxControl(container, "Add to Outline", allOutlineEnabled, (addToOutline) => {
    selectedParts.forEach(part => {
      part.addToOutline = addToOutline;
      togglePartOutline(part, addToOutline);
    });
    updateSVGPartsList();
    updateInfoTable();
    redraw();
  });

  // Outline type selection
  if (!globalSettings.outlineType) {
    globalSettings.outlineType = 'convex'; // Default to convex
  }
  
  createSelectControl(container, "Outline Type", {
    convex: "Convex Hull",
    bounding: "Bounding Box",
    scale: "Scaled Path"
  }, globalSettings.outlineType, (value) => {
    globalSettings.outlineType = value;
    updateOutlinesForOffset(); // Auto-update all outlines when type changes
  });

  // Outline offset control with automatic outline updates
  createSliderControl(container, "Outline Offset", 0.5, 20, globalSettings.outlineOffset, 0.1, (value) => {
    globalSettings.outlineOffset = value;
    updateOutlinesForOffset(); // Auto-update all outlines when offset changes
  });
}

function updatePartSettings(part) {
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
  nameLabel.style("margin-bottom", "4px");
  nameLabel.style("font-size", "12px");
  nameLabel.style("color", "#666");

  const nameInput = createInput(part.name);
  nameInput.parent(container);
  nameInput.style("width", "100%");
  nameInput.style("padding", "8px");
  nameInput.style("border", "1px solid #ddd");
  nameInput.style("border-radius", "4px");
  nameInput.style("font-size", "14px");
  nameInput.style("margin-bottom", "16px");
  
  nameInput.changed(() => {
    part.name = nameInput.value();
    updateSVGPartsList(); // Update the button text
    updateInfoTable(); // Update the info table
  });

  // Stroke settings section header
  const strokeHeader = createDiv("Stroke Settings");
  strokeHeader.parent(container);
  strokeHeader.style("font-weight", "600");
  strokeHeader.style("margin", "16px 0 8px 0");
  strokeHeader.style("padding-bottom", "8px");
  strokeHeader.style("border-bottom", "1px solid #ddd");

  // Stroke settings
  createCheckboxControl(container, "Enable Stroke", part.strokeSettings.enabled, (enabled) => {
    part.strokeSettings.enabled = enabled;
    updatePartSettings(part); // Refresh the UI to show/hide elements
    updateInfoTable();
    redraw();
  });

  // Create stroke controls container
  const strokeControlsDiv = createDiv();
  strokeControlsDiv.parent(container);
  strokeControlsDiv.id("stroke-controls");
   

  if (part.strokeSettings.enabled) {
    strokeControlsDiv.style("display", "block");
    
    createColorControl(strokeControlsDiv, "Stroke Color", part.strokeSettings.color, (color) => {
      part.strokeSettings.color = color;
      updateSVGPartsList();
      updateInfoTable();
      redraw();
    });
    createSelectControl(strokeControlsDiv, "Stroke Mode", {
      straight: "straight",
      zigzag: "zigzag", 
      lines: "lines",
      sashiko: "sashiko"
    }, part.strokeSettings.mode, (value) => {
      part.strokeSettings.mode = value;
      applyStrokeModeDefaults(part, value);
      updatePartSettings(part); // Refresh UI to show new values
      updateInfoTable();
      redraw();
    });

    createSliderControl(strokeControlsDiv, "Stroke Weight", 0.5, 10, part.strokeSettings.weight, 0.5, (value) => {
      part.strokeSettings.weight = value;
      updateInfoTable();
      redraw();
    });

    createSliderControl(strokeControlsDiv, "Stroke Stitch Length", 0.1, 10, part.strokeSettings.stitchLength, 0.1, (value) => {
      part.strokeSettings.stitchLength = value;
      updateInfoTable();
      redraw();
    });

    createSliderControl(strokeControlsDiv, "Min Stitch Length", 0.1, 5, part.strokeSettings.minStitchLength, 0.1, (value) => {
      part.strokeSettings.minStitchLength = value;
      updateInfoTable();
      redraw();
    });

    createSliderControl(strokeControlsDiv, "Resample Noise", 0.0, 2, part.strokeSettings.resampleNoise, 0.1, (value) => {
      part.strokeSettings.resampleNoise = value;
      updateInfoTable();
      redraw();
    });

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

  // Fill settings section header
  const fillHeader = createDiv("Fill Settings");
  fillHeader.parent(container);
  fillHeader.style("font-weight", "600");
  fillHeader.style("margin", "16px 0 8px 0");
  fillHeader.style("padding-bottom", "8px");
  fillHeader.style("border-bottom", "1px solid #ddd");

  // Fill settings
  createCheckboxControl(container, "Enable Fill", part.fillSettings.enabled, (enabled) => {
    part.fillSettings.enabled = enabled;
    updatePartSettings(part); // Refresh the UI to show/hide elements
    updateInfoTable();
    redraw();
  });

  // Create fill controls container
  const fillControlsDiv = createDiv();
  fillControlsDiv.parent(container);
  fillControlsDiv.id("fill-controls");

  if (part.fillSettings.enabled) {
    fillControlsDiv.style("display", "block");
    
    createColorControl(fillControlsDiv, "Fill Color", part.fillSettings.color, (color) => {
      part.fillSettings.color = color;
      updateSVGPartsList();
      updateInfoTable();
      redraw();
    });

    createSelectControl(fillControlsDiv, "Fill Mode", {
      tatami: "Tatami",
      satin: "Satin",
      spiral: "Spiral"
    }, part.fillSettings.mode, (value) => {
      part.fillSettings.mode = value;
      applyFillModeDefaults(part, value);
      updatePartSettings(part); // Refresh UI to show new values
      updateInfoTable();
      redraw();
    });

    createSliderControl(fillControlsDiv, "Fill Stitch Length", 0.5, 10, part.fillSettings.stitchLength, 0.1, (value) => {
      part.fillSettings.stitchLength = value;
      updateInfoTable();
      redraw();
    });

    createSliderControl(fillControlsDiv, "Row Spacing", 0.2, 5, part.fillSettings.rowSpacing, 0.1, (value) => {
      part.fillSettings.rowSpacing = value;
      updateInfoTable();
      redraw();
    });

    createSliderControl(fillControlsDiv, "Min Stitch Length", 0.1, 5, part.fillSettings.minStitchLength, 0.1, (value) => {
      part.fillSettings.minStitchLength = value;
      updateInfoTable();
      redraw();
    });

    createSliderControl(fillControlsDiv, "Resample Noise", 0.0, 2, part.fillSettings.resampleNoise, 0.1, (value) => {
      part.fillSettings.resampleNoise = value;
      updateInfoTable();
      redraw();
    });
  } else {
    fillControlsDiv.style("display", "none");
  }


  // Outline controls section
  const outlineHeader = createDiv("Outline Settings");
  outlineHeader.parent(container);
  outlineHeader.style("font-weight", "600");
  outlineHeader.style("margin", "16px 0 8px 0");
  outlineHeader.style("padding-bottom", "8px");
  outlineHeader.style("border-bottom", "1px solid #ddd");
   // Add to outline control with automatic outline creation/removal
 createCheckboxControl(container, "Add to Outline", part.addToOutline, (addToOutline) => {
  part.addToOutline = addToOutline;
  togglePartOutline(part, addToOutline);
});

  // Outline type selection
  if (!globalSettings.outlineType) {
    globalSettings.outlineType = 'convex'; // Default to convex
  }
  
  createSelectControl(container, "Outline Type", {
    convex: "Convex Hull",
    bounding: "Bounding Box",
    scale: "Scaled Path"
  }, globalSettings.outlineType, (value) => {
    globalSettings.outlineType = value;
    updateOutlinesForOffset(); // Auto-update all outlines when type changes
  });

  // Outline offset control with automatic outline updates
  createSliderControl(container, "Outline Offset", 0.5, 20, globalSettings.outlineOffset, 0.1, (value) => {
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
  const container = document.getElementById('info-display');
  if (!container) return;

  if (svgParts.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: var(--space-4);">No SVG parts loaded</p>';
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

  svgParts.forEach(part => {
    const strokeColor = part.strokeSettings.enabled 
      ? `rgb(${part.strokeSettings.color.join(',')})` 
      : 'transparent';
    const fillColor = part.fillSettings.enabled 
      ? `rgb(${part.fillSettings.color.join(',')})` 
      : 'transparent';

    tableHTML += `
      <tr>
        <td class="part-name">${part.name}</td>
        <td>${part.isOutline ? 'outline' : part.elementType}</td>
        <td>
          <div class="color-cell">
            <div class="color-swatch" style="background-color: ${strokeColor}"></div>
            <span>${part.strokeSettings.enabled ? part.strokeSettings.mode : 'none'}</span>
          </div>
        </td>
        <td>
          <div class="color-cell">
            <div class="color-swatch" style="background-color: ${fillColor}"></div>
            <span>${part.fillSettings.enabled ? part.fillSettings.mode : 'none'}</span>
          </div>
        </td>
        <td>${part.strokeSettings.enabled ? part.strokeSettings.mode : (part.fillSettings.enabled ? part.fillSettings.mode : 'none')}</td>
        <td>${part.strokeSettings.enabled ? part.strokeSettings.stitchLength.toFixed(1) + 'mm' : (part.fillSettings.enabled ? part.fillSettings.stitchLength.toFixed(1) + 'mm' : '-')}</td>
        <td>${part.strokeSettings.enabled ? part.strokeSettings.weight.toFixed(1) + 'mm' : '-'}</td>
        <td>${part.visible ? '✓' : '✗'}</td>
        <td>${part.addToOutline ? '✓' : '✗'}</td>
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
          <td>Outline Offset</td>
          <td>${globalSettings.outlineOffset}mm</td>
        </tr>
        <tr>
          <td>Outline Type</td>
          <td>${globalSettings.outlineType === 'convex' ? 'Convex Hull' : globalSettings.outlineType === 'bounding' ? 'Bounding Box' : 'Scaled Path'}</td>
        </tr>
        <tr>
          <td>Lock Aspect Ratio</td>
          <td>${globalSettings.lockAspectRatio ? '✓' : '✗'}</td>
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
  
  ${part.strokeSettings.enabled 
    ? `stroke(${part.strokeSettings.color[0]}, ${part.strokeSettings.color[1]}, ${part.strokeSettings.color[2]});
  strokeWeight(${part.strokeSettings.weight});`
    : "noStroke();"
  }
  
  ${part.fillSettings.enabled 
    ? `fill(${part.fillSettings.color[0]}, ${part.fillSettings.color[1]}, ${part.fillSettings.color[2]});`
    : "noFill();"
  }
  
  `;

    if (part.shapeParams) {
      const params = part.shapeParams;
      const scaleX = globalSettings.outputWidth / boundingBox.width;
      const scaleY = globalSettings.outputHeight / boundingBox.height;
      const scaleFactor = Math.min(scaleX, scaleY);
      
      const offsetX = (globalSettings.outputWidth - boundingBox.width * scaleFactor) / 2 - boundingBox.minX * scaleFactor;
      const offsetY = (globalSettings.outputHeight - boundingBox.height * scaleFactor) / 2 - boundingBox.minY * scaleFactor;

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
          points.forEach(point => {
            const scaledX = ((point.x - boundingBox.minX) / boundingBox.width) * globalSettings.outputWidth;
            const scaledY = ((point.y - boundingBox.minY) / boundingBox.height) * globalSettings.outputHeight;
            code += `\n  vertex(${scaledX.toFixed(1)}, ${scaledY.toFixed(1)});`;
          });
          code += `\n  endShape${part.closed ? "(CLOSE)" : "()"}`;
      }
    } else {
      code += `beginShape();`;
      const points = getPathPoints(part.pathData);
      points.forEach(point => {
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
  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'embroidery_sketch.js';
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

  svgParts.forEach(part => {
    if (!part.visible) return;
    
    const strokeColor = part.strokeSettings.enabled ? 
      `rgb(${part.strokeSettings.color.join(',')})` : 'none';
    const fillColor = part.fillSettings.enabled ? 
      `rgb(${part.fillSettings.color.join(',')})` : 'none';
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
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'design.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function createOutlineForPart(originalPart) {
  // Create a unique outline for this specific part
  const outlineId = `outline_${originalPart.id}_${globalSettings.outlineOffset}`;
  
  // Check if outline already exists for this part with this offset
  const existingOutline = svgParts.find(part => part.id === outlineId);
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
  const outlineType = globalSettings.outlineType || 'convex';
  const outlinePoints = embroideryOutlineFromPath(
    originalPoints, 
    globalSettings.outlineOffset, 
    null, // Don't add to threads automatically
    outlineType, // Use selected outline type
    false // Don't apply transform here
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
    addToOutline: false
  };
  
  svgParts.push(outlinePart);
  console.log(`Outline created for ${originalPart.name} with ${outlinePoints.length} points`);
  return outlinePart;
}

function removeOutlineForPart(originalPart) {
  // Remove all outlines for this part
  const outlinesToRemove = svgParts.filter(part => 
    part.isOutline && part.sourcePartId === originalPart.id
  );
  
  outlinesToRemove.forEach(outline => {
    const index = svgParts.indexOf(outline);
    if (index > -1) {
      svgParts.splice(index, 1);
      console.log(`Removed outline for ${originalPart.name}`);
    }
  });
}

function updateOutlinesForOffset() {
  // Get all parts that should have outlines
  const partsWithOutlines = svgParts.filter(part => !part.isOutline && part.addToOutline);
  
  // Remove all existing outlines
  partsWithOutlines.forEach(part => {
    removeOutlineForPart(part);
  });
  
  // Create new outlines with current offset
  partsWithOutlines.forEach(part => {
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
  const outlineParts = svgParts.filter(part => part.addToOutline);
  
  if (outlineParts.length === 0) {
    console.warn("No parts selected for outline export");
    return;
  }
  
  let svgContent = `<svg width="${globalSettings.outputWidth}" height="${globalSettings.outputHeight}" xmlns="http://www.w3.org/2000/svg">
`;

  outlineParts.forEach(part => {
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
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'outline.svg';
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
        height: globalSettings.outputHeight
      }
    },
    globalSettings: globalSettings,
    boundingBox: boundingBox,
    parts: svgParts
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
    navigator.clipboard.writeText(text).then(() => {
      console.log("Code copied to clipboard!");
    }).catch((err) => {
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
  valueInput.attribute('type', 'number');
  valueInput.attribute('min', min);
  valueInput.attribute('max', max);
  valueInput.attribute('step', step);

  const mmLabel = createSpan('mm');
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

function keyPressed() {
  if (key === "l" || key === "L") {
    loadSVGFromTextArea();
  } else if (key === "c" || key === "C") {
    clearCanvas();
  }
}

function exportOutline() {
  if (svgParts.length === 0) {
    console.warn("No SVG parts to export");
    return;
  }

  // Filter parts that are actual outline parts (not the original parts)
  const outlineParts = svgParts.filter(part => part.isOutline === true);
  
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
      let attributes = '';
      
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

  svgContent += '\n</svg>';

  // Create download link
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'outline_export.svg';
  a.textContent = 'Download Outline SVG';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log(`Outline exported successfully with ${outlineParts.length} outline parts`);
}


