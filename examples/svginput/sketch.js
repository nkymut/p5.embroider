// SVG Input Example for p5.embroider
// This example demonstrates how to load SVG files and convert them to embroidery

let svgInput;
let p5jsOutput;
let svgPaths = [];
let currentSettings = {
  strokeWeight: 2,
  fillColor: [255, 0, 155],
  strokeColor: [0, 0, 0],
  strokeMode: "straight",
  fillMode: "tatami",
  stitchLength: 3,
  rowSpacing: 0.8,
  minStitchLength: 0.5,
  resampleNoise: 0.2,
  outputWidth: 100,
  outputHeight: 100,
  lockAspectRatio: true,
  strokeEnabled: true,
  fillEnabled: true,
};

let boundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
let drawMode = "stitch";
let outputWidthControl, outputHeightControl;
let currentShape = null;

// SVG Presets
const presets = {
  1: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="80" height="80" fill="none" stroke="black" stroke-width="2"/>
  <circle cx="50" cy="50" r="25" fill="none" stroke="black" stroke-width="2"/>
</svg>`,
  2: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <path d="M 20 20 L 80 20 L 80 80 L 20 80 Z" fill="none" stroke="black" stroke-width="2"/>
  <path d="M 20 20 L 80 80 M 80 20 L 20 80" fill="none" stroke="black" stroke-width="2"/>
</svg>`,
  3: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="50,10 90,80 10,80" fill="none" stroke="black" stroke-width="2"/>
  <circle cx="50" cy="50" r="15" fill="none" stroke="black" stroke-width="2"/>
</svg>`,
};

function setup() {
  // Create canvas
  let canvas = createCanvas(mmToPixel(200), mmToPixel(200));
  canvas.parent("canvas-wrapper");

  // Initialize dimensions
  currentSettings.outputWidth = 100; // mm
  currentSettings.outputHeight = 100; // mm

  // Use noLoop since embroidery only needs to render when changed
  noLoop();

  createUI();

  // Load default SVG
  loadPreset(1);
}

function createUI() {
  // Get container elements
  const modeButtonsContainer = select("#mode-buttons");
  const svgPresetsContainer = select("#svg-presets");
  const svgInputContainer = select("#svg-input-container");
  const svgButtonsContainer = select("#svg-buttons");
  const embroideryControlsContainer = select("#embroidery-controls");
  const dimensionControlsContainer = select("#dimension-controls");
  const codeOutputContainer = select("#code-output-container");
  const exportButtonsContainer = select("#export-buttons");

  // Mode buttons with active state tracking
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

  // Set initial active state
  function updateModeButtonStates() {
    // Reset all button classes
    stitchButton.removeClass("active");
    realisticButton.removeClass("active");
    p5Button.removeClass("active");

    // Add active class to current mode
    if (drawMode === "stitch") stitchButton.addClass("active");
    else if (drawMode === "realistic") realisticButton.addClass("active");
    else if (drawMode === "p5") p5Button.addClass("active");
  }

  // Set initial active button
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

  // SVG input
  svgInput = createTextAreaControl(svgInputContainer, "", "Paste your SVG code here...", 80);

  // SVG buttons
  createButton("Load SVG")
    .parent(svgButtonsContainer)
    .mousePressed(() => loadSVGFromTextArea());
  createButton("Clear")
    .parent(svgButtonsContainer)
    .class("secondary")
    .mousePressed(() => clearCanvas());

  // Embroidery controls
  createCheckboxControl(embroideryControlsContainer, "Stroke", currentSettings.strokeEnabled, (enabled) => {
    currentSettings.strokeEnabled = enabled;
    redraw();
  });

  createSelectControl(
    embroideryControlsContainer,
    "Stroke Mode",
    {
      straight: "Straight",
      zigzag: "Zigzag",
      lines: "Lines",
      sashiko: "Sashiko",
    },
    currentSettings.strokeMode,
    (value) => {
      currentSettings.strokeMode = value;
      redraw();
    },
  );

  createSliderControl(
    embroideryControlsContainer,
    "Stroke Weight",
    0.5,
    10,
    currentSettings.strokeWeight,
    0.5,
    (value) => {
      currentSettings.strokeWeight = value;
      redraw();
    },
  );

  createColorControl(embroideryControlsContainer, "Stroke Color", currentSettings.strokeColor, (color) => {
    currentSettings.strokeColor = color;
    redraw();
  });

  createCheckboxControl(embroideryControlsContainer, "Fill", currentSettings.fillEnabled, (enabled) => {
    currentSettings.fillEnabled = enabled;
    redraw();
  });

  createSelectControl(
    embroideryControlsContainer,
    "Fill Mode",
    {
      tatami: "Tatami",
      satin: "Satin",
      spiral: "Spiral",
    },
    currentSettings.fillMode,
    (value) => {
      currentSettings.fillMode = value;
      redraw();
    },
  );

  createColorControl(embroideryControlsContainer, "Fill Color", currentSettings.fillColor, (color) => {
    currentSettings.fillColor = color;
    redraw();
  });

  createSliderControl(
    embroideryControlsContainer,
    "Stitch Length",
    0.5,
    10,
    currentSettings.stitchLength,
    0.1,
    (value) => {
      currentSettings.stitchLength = value;
      redraw();
    },
  );

  createSliderControl(embroideryControlsContainer, "Row Spacing", 0.2, 5, currentSettings.rowSpacing, 0.1, (value) => {
    currentSettings.rowSpacing = value;
    redraw();
  });

  // Code output
  p5jsOutput = createTextAreaControl(codeOutputContainer, "", "Generated p5.js code will appear here...", 100);
  p5jsOutput.attribute("readonly", "true");
  p5jsOutput.elt.style.backgroundColor = "#f8f8f8";

  createButton("Copy Code")
    .parent(codeOutputContainer)
    .class("small secondary")
    .mousePressed(() => {
      copyToClipboard(p5jsOutput.value());
    });

  createButton("Export p5.js")
    .parent(codeOutputContainer)
    .class("small secondary")
    .mousePressed(() => {
      exportP5jsCode("embroidery_code.js");
    });

  // Dimension controls
  outputWidthControl = createSliderControl(
    dimensionControlsContainer,
    "Width (mm)",
    10,
    300,
    currentSettings.outputWidth,
    5,
    (value) => {
      currentSettings.outputWidth = value;
      if (currentSettings.lockAspectRatio && boundingBox.width > 0 && boundingBox.height > 0) {
        const aspectRatio = boundingBox.width / boundingBox.height;
        currentSettings.outputHeight = currentSettings.outputWidth / aspectRatio;
        if (outputHeightControl) {
          outputHeightControl.slider.value(currentSettings.outputHeight);
          outputHeightControl.valueDisplay.html(Math.round(currentSettings.outputHeight));
        }
      }
      generateP5jsCode();
      redraw();
    },
  );

  outputHeightControl = createSliderControl(
    dimensionControlsContainer,
    "Height (mm)",
    10,
    300,
    currentSettings.outputHeight,
    5,
    (value) => {
      currentSettings.outputHeight = value;
      if (currentSettings.lockAspectRatio && boundingBox.width > 0 && boundingBox.height > 0) {
        const aspectRatio = boundingBox.width / boundingBox.height;
        currentSettings.outputWidth = currentSettings.outputHeight * aspectRatio;
        if (outputWidthControl) {
          outputWidthControl.slider.value(currentSettings.outputWidth);
          outputWidthControl.valueDisplay.html(Math.round(currentSettings.outputWidth));
        }
      }
      generateP5jsCode();
      redraw();
    },
  );

  createCheckboxControl(dimensionControlsContainer, "Lock Aspect Ratio", currentSettings.lockAspectRatio, (checked) => {
    currentSettings.lockAspectRatio = checked;
    if (currentSettings.lockAspectRatio && boundingBox.width > 0 && boundingBox.height > 0) {
      const aspectRatio = boundingBox.width / boundingBox.height;
      currentSettings.outputHeight = currentSettings.outputWidth / aspectRatio;
      if (outputHeightControl) {
        outputHeightControl.slider.value(currentSettings.outputHeight);
        outputHeightControl.valueDisplay.html(Math.round(currentSettings.outputHeight));
      }
    }
    generateP5jsCode();
    redraw();
  });

  // Export buttons
  createButton("Export DST")
    .parent(exportButtonsContainer)
    .mousePressed(() => {
      if (svgPaths.length > 0) {
        exportEmbroidery("svg_embroidery.dst");
      } else {
        console.warn("No SVG loaded to export");
      }
    });
  createButton("Export G-code")
    .parent(exportButtonsContainer)
    .class("secondary")
    .mousePressed(() => {
      if (svgPaths.length > 0) {
        exportGcode("svg_embroidery.gcode");
      } else {
        console.warn("No SVG loaded to export");
      }
    });
  createButton("Export SVG")
    .parent(exportButtonsContainer)
    .class("secondary")
    .mousePressed(() => {
      exportSVG("svg_embroidery.svg");
    });
  createButton("Export PNG")
    .parent(exportButtonsContainer)
    .class("secondary")
    .mousePressed(() => {
      exportPNG("svg_embroidery.png");
    });
}

function draw() {
  background(255, 255, 100);

  if (!currentShape) {
    noStroke();
    fill(150);
    textAlign(CENTER, CENTER);
    textSize(16);
    text("No SVG loaded", width / 2, height / 2);
    return;
  }

  // Start embroidery recording
  beginRecord(this);

  // Configure p5.embroider settings
  setDrawMode(drawMode); // "stitch", "realistic", or "p5"
  setStrokeMode(currentSettings.strokeMode); // "straight", "zigzag", "lines", "sashiko"
  setFillMode(currentSettings.fillMode); // "tatami", "satin", "spiral"

  // Set embroidery stitch parameters (uses numeric args)
  setStitch(currentSettings.minStitchLength, currentSettings.stitchLength, currentSettings.resampleNoise);

  // Set stroke and fill
  if (currentSettings.strokeEnabled) {
    stroke(currentSettings.strokeColor[0], currentSettings.strokeColor[1], currentSettings.strokeColor[2]);
    strokeWeight(currentSettings.strokeWeight);
  } else {
    noStroke();
  }

  if (currentSettings.fillEnabled) {
    fill(currentSettings.fillColor[0], currentSettings.fillColor[1], currentSettings.fillColor[2]);
  } else {
    noFill();
  }

  // Draw embroidery using transforms for scaling
  push();

  // Render the current shape at the requested output size
  currentShape.setSize(currentSettings.outputWidth, currentSettings.outputHeight);
  currentShape.draw();

  pop();

  // End embroidery recording
  endRecord();
}

function drawEmbroideryPaths() {
  // Convert SVG paths to embroidery shapes using p5.js drawing functions
  // p5.embroider will automatically convert these to stitches based on the current modes

  for (let pathData of svgPaths) {
    const points = getPathPoints(pathData);

    if (points.length < 2) continue;

    // Use beginShape/endShape for embroidery generation
    beginShape();
    for (let point of points) {
      vertex(point.x, point.y);
    }

    // Check if path should be closed
    if (pathData.toLowerCase().includes("z")) {
      endShape(CLOSE);
    } else {
      endShape();
    }
  }
}

function getPathPoints(pathData) {
  const points = [];
  const commands = pathData.match(/[MmLlHhVvZz][^MmLlHhVvZz]*/g);

  if (commands) {
    let currentX = 0,
      currentY = 0;

    for (let command of commands) {
      const type = command[0];
      const coords = command
        .slice(1)
        .trim()
        .split(/[\s,]+/)
        .map(parseFloat);

      switch (type.toLowerCase()) {
        case "m":
        case "l":
          if (coords.length >= 2) {
            currentX = type === type.toUpperCase() ? coords[0] : currentX + coords[0];
            currentY = type === type.toUpperCase() ? coords[1] : currentY + coords[1];
            points.push({ x: currentX, y: currentY });
          }
          break;
        case "h":
          if (coords.length >= 1) {
            currentX = type === "H" ? coords[0] : currentX + coords[0];
            points.push({ x: currentX, y: currentY });
          }
          break;
        case "v":
          if (coords.length >= 1) {
            currentY = type === "V" ? coords[0] : currentY + coords[0];
            points.push({ x: currentX, y: currentY });
          }
          break;
      }
    }
  }

  return points;
}

function loadPreset(num) {
  if (presets[num]) {
    svgInput.value(presets[num]);
    loadSVGFromTextArea();
  }
}

class EmbroiderySVG {
  constructor(paths, bbox, outputWidthMm, outputHeightMm) {
    this.paths = paths;
    this.bbox = bbox;
    this.outputWidthMm = outputWidthMm;
    this.outputHeightMm = outputHeightMm;
  }

  setSize(widthMm, heightMm) {
    if (typeof widthMm === "number") this.outputWidthMm = widthMm;
    if (typeof heightMm === "number") this.outputHeightMm = heightMm;
  }

  draw() {
    if (!this.paths || this.paths.length === 0) return;
    // Compute a mm-based scale factor (no pixel transforms while recording)
    const scaleXmm = (this.outputWidthMm * 0.9) / this.bbox.width;
    const scaleYmm = (this.outputHeightMm * 0.9) / this.bbox.height;
    const scaleFactor = min(scaleXmm, scaleYmm);

    // Center within the requested output rectangle in mm
    const offsetX = (this.outputWidthMm - this.bbox.width * scaleFactor) / 2 - this.bbox.minX * scaleFactor;
    const offsetY = (this.outputHeightMm - this.bbox.height * scaleFactor) / 2 - this.bbox.minY * scaleFactor;

    for (let pathData of this.paths) {
      const points = getPathPoints(pathData);
      if (points.length < 2) continue;
      beginShape();
      for (let point of points) {
        const x = offsetX + point.x * scaleFactor;
        const y = offsetY + point.y * scaleFactor;
        vertex(x, y);
      }
      if (pathData.toLowerCase().includes("z")) {
        endShape(CLOSE);
      } else {
        endShape();
      }
    }
  }
}

function loadSVG(svgText, widthMm, heightMm) {
  const text = (svgText || "").trim();
  if (!text) {
    console.warn("No SVG text provided");
    return null;
  }

  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(text, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");

    if (!svgElement) {
      console.error("No <svg> element found");
      return null;
    }

    const paths = [];
    const allElements = svgElement.querySelectorAll("path, circle, rect, line, polyline, polygon, ellipse");

    allElements.forEach((element) => {
      let pathData = "";

      switch (element.tagName.toLowerCase()) {
        case "path": {
          pathData = element.getAttribute("d");
          break;
        }
        case "circle": {
          const cx = parseFloat(element.getAttribute("cx") || 0);
          const cy = parseFloat(element.getAttribute("cy") || 0);
          const r = parseFloat(element.getAttribute("r") || 0);
          if (r > 0) {
            pathData = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
          }
          break;
        }
        case "rect": {
          const x = parseFloat(element.getAttribute("x") || 0);
          const y = parseFloat(element.getAttribute("y") || 0);
          const w = parseFloat(element.getAttribute("width") || 0);
          const h = parseFloat(element.getAttribute("height") || 0);
          if (w > 0 && h > 0) {
            pathData = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
          }
          break;
        }
        case "line": {
          const x1 = parseFloat(element.getAttribute("x1") || 0);
          const y1 = parseFloat(element.getAttribute("y1") || 0);
          const x2 = parseFloat(element.getAttribute("x2") || 0);
          const y2 = parseFloat(element.getAttribute("y2") || 0);
          pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
          break;
        }
        case "polygon":
        case "polyline": {
          const points = element.getAttribute("points") || "";
          const coords = points
            .trim()
            .split(/[\s,]+/)
            .map(parseFloat);
          if (coords.length >= 4) {
            pathData = `M ${coords[0]} ${coords[1]}`;
            for (let i = 2; i < coords.length; i += 2) {
              pathData += ` L ${coords[i]} ${coords[i + 1]}`;
            }
            if (element.tagName.toLowerCase() === "polygon") {
              pathData += " Z";
            }
          }
          break;
        }
      }

      if (pathData) {
        paths.push(pathData);
      }
    });

    const bbox = calculateBoundingBoxForPaths(paths);
    const w = typeof widthMm === "number" ? widthMm : currentSettings ? currentSettings.outputWidth : 100;
    const h = typeof heightMm === "number" ? heightMm : currentSettings ? currentSettings.outputHeight : 100;

    return new EmbroiderySVG(paths, bbox, w, h);
  } catch (error) {
    console.error("Error loading SVG:", error);
    return null;
  }
}

// Convenience for the example UI: reads from textarea and wires state
function loadSVGFromTextArea() {
  const svgText = svgInput.value().trim();
  const shape = loadSVG(svgText, currentSettings.outputWidth, currentSettings.outputHeight);
  if (!shape) return;

  currentShape = shape;
  svgPaths = shape.paths.slice();
  boundingBox = { ...shape.bbox };

  console.log(`Loaded ${svgPaths.length} paths`);
  console.log("Bounding box:", boundingBox);

  generateP5jsCode();
  redraw();
}

function calculateBoundingBoxForPaths(paths) {
  if (!paths || paths.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (let pathData of paths) {
    const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

    if (commands) {
      let currentX = 0,
        currentY = 0;

      for (let command of commands) {
        const type = command[0];
        const coords = command
          .slice(1)
          .trim()
          .split(/[\s,]+/)
          .map(parseFloat);

        switch (type.toLowerCase()) {
          case "m":
          case "l":
            if (coords.length >= 2) {
              currentX = type === type.toUpperCase() ? coords[0] : currentX + coords[0];
              currentY = type === type.toUpperCase() ? coords[1] : currentY + coords[1];
              minX = min(minX, currentX);
              minY = min(minY, currentY);
              maxX = max(maxX, currentX);
              maxY = max(maxY, currentY);
            }
            break;
          case "h":
            if (coords.length >= 1) {
              currentX = type === "H" ? coords[0] : currentX + coords[0];
              minX = min(minX, currentX);
              maxX = max(maxX, currentX);
            }
            break;
          case "v":
            if (coords.length >= 1) {
              currentY = type === "V" ? coords[0] : currentY + coords[0];
              minY = min(minY, currentY);
              maxY = max(maxY, currentY);
            }
            break;
        }
      }
    }
  }

  if (minX !== Infinity) {
    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } else {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }
}

function loadSVG_OLD_REFERENCE_ONLY() {
  /* intentionally left for reference in docs, replaced by loadSVG */
}

function calculateBoundingBox() {
  if (svgPaths.length === 0) {
    boundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    return;
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (let pathData of svgPaths) {
    const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

    if (commands) {
      let currentX = 0,
        currentY = 0;

      for (let command of commands) {
        const type = command[0];
        const coords = command
          .slice(1)
          .trim()
          .split(/[\s,]+/)
          .map(parseFloat);

        switch (type.toLowerCase()) {
          case "m":
          case "l":
            if (coords.length >= 2) {
              currentX = type === type.toUpperCase() ? coords[0] : currentX + coords[0];
              currentY = type === type.toUpperCase() ? coords[1] : currentY + coords[1];
              minX = min(minX, currentX);
              minY = min(minY, currentY);
              maxX = max(maxX, currentX);
              maxY = max(maxY, currentY);
            }
            break;
          case "h":
            if (coords.length >= 1) {
              currentX = type === "H" ? coords[0] : currentX + coords[0];
              minX = min(minX, currentX);
              maxX = max(maxX, currentX);
            }
            break;
          case "v":
            if (coords.length >= 1) {
              currentY = type === "V" ? coords[0] : currentY + coords[0];
              minY = min(minY, currentY);
              maxY = max(maxY, currentY);
            }
            break;
        }
      }
    }
  }

  if (minX !== Infinity) {
    boundingBox = {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } else {
    boundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }
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

// Helper function to export p5.js code
function exportP5jsCode(filename) {
  const code = p5jsOutput.value();
  if (code) {
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "embroidery_code.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`p5.js code exported as ${filename}`);
  }
}

// Helper function to create slider controls
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

  const valueDisplay = createSpan(Math.round(defaultValue));
  valueDisplay.parent(sliderContainer);
  valueDisplay.class("value-display");

  slider.input(() => {
    const value = slider.value();
    valueDisplay.html(Math.round(value));
    callback(value);
  });

  return { slider, valueDisplay };
}

// Helper function to create color controls
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

// Helper function to create select controls
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

// Helper function to create checkbox controls
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

// Helper function to create textarea
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

function generateP5jsCode() {
  if (svgPaths.length === 0) {
    p5jsOutput.value("// No SVG loaded yet");
    return;
  }

  let code = `// Generated embroidery code using p5.embroider
function setup() {
  createCanvas(400, 400);
  
  // Start embroidery recording
  beginRecord(this);
  
  // Configure p5.embroider settings
  setDrawMode("${drawMode}");
  setStrokeMode("${currentSettings.strokeMode}");
  setFillMode("${currentSettings.fillMode}");
  
  // Set embroidery stitch parameters
  setStitch({
    stitchLength: ${currentSettings.stitchLength},
    rowSpacing: ${currentSettings.rowSpacing},
    minStitchLength: ${currentSettings.minStitchLength},
    resampleNoise: ${currentSettings.resampleNoise}
  });
  
  // Set stroke and fill
  ${
    currentSettings.strokeEnabled
      ? `stroke(${currentSettings.strokeColor[0]}, ${currentSettings.strokeColor[1]}, ${currentSettings.strokeColor[2]});
  strokeWeight(${currentSettings.strokeWeight});`
      : "noStroke();"
  }
  
  ${
    currentSettings.fillEnabled
      ? `fill(${currentSettings.fillColor[0]}, ${currentSettings.fillColor[1]}, ${currentSettings.fillColor[2]});`
      : "noFill();"
  }
  
  // Draw SVG shapes as embroidery
`;

  svgPaths.forEach((pathData, index) => {
    code += `  // Shape ${index + 1}
  beginShape();
`;

    // Simple path parsing for code generation
    const commands = pathData.match(/[MmLlHhVvZz][^MmLlHhVvZz]*/g);
    if (commands) {
      let currentX = 0,
        currentY = 0;

      for (let command of commands) {
        const type = command[0];
        const coords = command
          .slice(1)
          .trim()
          .split(/[\s,]+/)
          .map(parseFloat);

        if (type.toLowerCase() === "m" || type.toLowerCase() === "l") {
          if (coords.length >= 2) {
            currentX = type === type.toUpperCase() ? coords[0] : currentX + coords[0];
            currentY = type === type.toUpperCase() ? coords[1] : currentY + coords[1];

            // Scale to output dimensions
            const scaledX = ((currentX - boundingBox.minX) / boundingBox.width) * currentSettings.outputWidth;
            const scaledY = ((currentY - boundingBox.minY) / boundingBox.height) * currentSettings.outputHeight;

            code += `  vertex(${scaledX.toFixed(1)}, ${scaledY.toFixed(1)});
`;
          }
        }
      }
    }

    code += `  endShape();
`;
  });

  code += `  
  endRecord();
  exportEmbroidery("embroidery.dst");
}`;

  p5jsOutput.value(code);
}

function clearCanvas() {
  svgPaths = [];
  svgInput.value("");
  p5jsOutput.value("Generated p5.js code will appear here...");
  boundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  currentShape = null;
  redraw();
}

function keyPressed() {
  if (key === "l" || key === "L") {
    loadSVGFromTextArea();
  } else if (key === "c" || key === "C") {
    clearCanvas();
  }
}

// Export functions
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

function exportP5jsCode(filename) {
  const code = p5jsOutput.value();
  if (code) {
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "embroidery_code.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`p5.js code exported as ${filename}`);
  }
}

function exportPNG(filename) {
  try {
    save(canvas, filename || "svg_embroidery.png");
    console.log(`PNG exported as ${filename}`);
  } catch (error) {
    console.error("Error exporting PNG:", error);
  }
}

function exportSVG(filename) {
  if (svgPaths.length === 0) {
    console.warn("No paths loaded to export.");
    return;
  }

  try {
    let svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${currentSettings.outputWidth}mm" height="${currentSettings.outputHeight}mm" 
     viewBox="0 0 ${currentSettings.outputWidth} ${currentSettings.outputHeight}" 
     xmlns="http://www.w3.org/2000/svg">
`;

    svgPaths.forEach((pathData, pathIndex) => {
      const fillColor = currentSettings.fillEnabled
        ? `rgb(${currentSettings.fillColor[0]}, ${currentSettings.fillColor[1]}, ${currentSettings.fillColor[2]})`
        : "none";
      const strokeColor = currentSettings.strokeEnabled
        ? `rgb(${currentSettings.strokeColor[0]}, ${currentSettings.strokeColor[1]}, ${currentSettings.strokeColor[2]})`
        : "none";

      // Scale path data (simplified)
      let scaledPathData = pathData;

      svgString += `  <path d="${scaledPathData}" 
                      fill="${fillColor}" 
                      stroke="${strokeColor}" 
                      stroke-width="${currentSettings.strokeWeight}" />
`;
    });

    svgString += "</svg>";

    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "svg_embroidery.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`SVG exported as ${filename}`);
  } catch (error) {
    console.error("Error exporting SVG:", error);
  }
}
