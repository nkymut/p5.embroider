// SVG Object-Based Input Example for p5.embroider
// This example demonstrates loading SVGs as structured objects with individual settings

let svgInput;
let p5jsOutput;
let objectDisplay;
let svgParts = []; // Array of SVG part objects
let selectedPartIndex = -1;
let drawMode = "stitch";

// Global default settings
let globalSettings = {
  outputWidth: 100,
  outputHeight: 100,
  lockAspectRatio: true,
};

let boundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
let outputWidthControl, outputHeightControl;

// SVG Presets with colored elements
const presets = {
  1: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="80" height="80" fill="#ff6b6b" stroke="#4ecdc4" stroke-width="2"/>
  <circle cx="50" cy="50" r="25" fill="#45b7d1" stroke="#f7dc6f" stroke-width="3"/>
</svg>`,
  2: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <path d="M 20 20 L 80 20 L 80 80 L 20 80 Z" fill="#e74c3c" stroke="#2ecc71" stroke-width="2"/>
  <path d="M 20 20 L 80 80 M 80 20 L 20 80" fill="none" stroke="#9b59b6" stroke-width="3"/>
</svg>`,
  3: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="50,10 90,80 10,80" fill="#f39c12" stroke="#34495e" stroke-width="2"/>
  <circle cx="50" cy="50" r="15" fill="#1abc9c" stroke="#e67e22" stroke-width="2"/>
</svg>`,
};

function setup() {
  // Create canvas
  let canvas = createCanvas(mmToPixel(200), mmToPixel(200));
  canvas.parent("canvas-wrapper");

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
  const svgPartsContainer = select("#svg-parts-list");
  const partSettingsContainer = select("#part-settings");
  const objectDisplayContainer = select("#object-display-container");
  const dimensionControlsContainer = select("#dimension-controls");
  const codeOutputContainer = select("#code-output-container");
  const exportButtonsContainer = select("#export-buttons");

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

  // Object array display
  objectDisplay = createTextAreaControl(objectDisplayContainer, "", "SVG objects array will appear here...", 200);
  objectDisplay.attribute("readonly", "true");
  objectDisplay.elt.style.backgroundColor = "#f8f8f8";
  objectDisplay.elt.style.fontFamily = "monospace";
  objectDisplay.elt.style.fontSize = "11px";

  // Code output
  p5jsOutput = createTextAreaControl(codeOutputContainer, "", "Generated p5.js code will appear here...", 150);
  p5jsOutput.attribute("readonly", "true");
  p5jsOutput.elt.style.backgroundColor = "#f8f8f8";

  createButton("Copy Code")
    .parent(codeOutputContainer)
    .class("small secondary")
    .mousePressed(() => {
      copyToClipboard(p5jsOutput.value());
    });

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
      updateObjectDisplay();
      generateP5jsCode();
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
      updateObjectDisplay();
      generateP5jsCode();
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
    updateObjectDisplay();
    generateP5jsCode();
    redraw();
  });

  // Export buttons
  createButton("Export DST")
    .parent(exportButtonsContainer)
    .mousePressed(() => {
      if (svgParts.length > 0) {
        exportEmbroidery("svg_objects.dst");
      } else {
        console.warn("No SVG loaded to export");
      }
    });
    
  createButton("Export JSON")
    .parent(exportButtonsContainer)
    .class("secondary")
    .mousePressed(() => {
      exportObjectsAsJSON("svg_objects.json");
    });
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

  // Start embroidery recording
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
      if (part.pathData.toLowerCase().includes("z")) {
        endShape(CLOSE);
      } else {
        endShape();
      }
    }
  }

  pop();
  endRecord();
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

function loadPreset(num) {
  if (presets[num]) {
    svgInput.value(presets[num]);
    loadSVGFromTextArea();
  }
}

function loadSVGFromTextArea() {
  const svgText = svgInput.value().trim();
  if (!svgText) return;

  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");

    if (!svgElement) {
      console.error("No <svg> element found");
      return;
    }

    svgParts = [];
    const allElements = svgElement.querySelectorAll("path, circle, rect, line, polyline, polygon, ellipse");

    allElements.forEach((element, index) => {
      const part = createSVGPartObject(element, index);
      if (part) {
        svgParts.push(part);
      }
    });

    if (svgParts.length > 0) {
      boundingBox = calculateBoundingBoxForParts(svgParts);
      updateSVGPartsList();
      updateObjectDisplay();
      generateP5jsCode();
      redraw();
      console.log(`Loaded ${svgParts.length} SVG parts as objects`);
    }
  } catch (error) {
    console.error("Error loading SVG:", error);
  }
}

function createSVGPartObject(element, index) {
  let pathData = "";
  let shapeParams = null;
  const tagName = element.tagName.toLowerCase();

  // Store original shape parameters and convert to path data
  switch (tagName) {
    case "path":
      pathData = element.getAttribute("d");
      break;
    case "circle":
      const cx = parseFloat(element.getAttribute("cx") || 0);
      const cy = parseFloat(element.getAttribute("cy") || 0);
      const r = parseFloat(element.getAttribute("r") || 0);
      if (r > 0) {
        shapeParams = { cx, cy, r };
        pathData = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
      }
      break;
    case "rect":
      const x = parseFloat(element.getAttribute("x") || 0);
      const y = parseFloat(element.getAttribute("y") || 0);
      const w = parseFloat(element.getAttribute("width") || 0);
      const h = parseFloat(element.getAttribute("height") || 0);
      if (w > 0 && h > 0) {
        shapeParams = { x, y, w, h };
        pathData = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
      }
      break;
    case "ellipse":
      const ex = parseFloat(element.getAttribute("cx") || 0);
      const ey = parseFloat(element.getAttribute("cy") || 0);
      const rx = parseFloat(element.getAttribute("rx") || 0);
      const ry = parseFloat(element.getAttribute("ry") || 0);
      if (rx > 0 && ry > 0) {
        shapeParams = { cx: ex, cy: ey, rx, ry };
        pathData = `M ${ex - rx} ${ey} A ${rx} ${ry} 0 1 1 ${ex + rx} ${ey} A ${rx} ${ry} 0 1 1 ${ex - rx} ${ey} Z`;
      }
      break;
    case "line":
      const x1 = parseFloat(element.getAttribute("x1") || 0);
      const y1 = parseFloat(element.getAttribute("y1") || 0);
      const x2 = parseFloat(element.getAttribute("x2") || 0);
      const y2 = parseFloat(element.getAttribute("y2") || 0);
      shapeParams = { x1, y1, x2, y2 };
      pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
      break;
    case "polygon":
    case "polyline":
      const points = element.getAttribute("points") || "";
      const coords = points.trim().split(/[\s,]+/).map(parseFloat);
      if (coords.length >= 4) {
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

  // Parse SVG attributes for colors
  const stroke = element.getAttribute('stroke');
  const fill = element.getAttribute('fill');
  const strokeWidth = parseFloat(element.getAttribute('stroke-width')) || 2;

  // Create structured object
  const partObject = {
    id: `part_${index}`,
    name: `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} ${index + 1}`,
    elementType: tagName,
    pathData: pathData,
    shapeParams: shapeParams,
    originalAttributes: {
      stroke: stroke,
      fill: fill,
      'stroke-width': strokeWidth,
    },
    strokeSettings: {
      enabled: stroke && stroke !== 'none',
      color: parseColor(stroke) || [0, 0, 0],
      weight: strokeWidth,
      mode: "straight",
      stitchLength: 2,
      minStitchLength: 0.5,
      resampleNoise: 0.2,
    },
    fillSettings: {
      enabled: fill && fill !== 'none',
      color: parseColor(fill) || [255, 0, 155],
      mode: "tatami",
      stitchLength: 3,
      minStitchLength: 0.5,
      resampleNoise: 0.2,
      rowSpacing: 0.8,
    },
    visible: true,
    selected: false,
  };

  return partObject;
}

function parseColor(colorStr) {
  if (!colorStr || colorStr === 'none') return null;
  
  // Handle hex colors
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16)
      ];
    } else if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }
  }
  
  // Handle RGB colors
  const rgbMatch = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  
  // Handle common color names
  const colorMap = {
    'black': [0, 0, 0],
    'white': [255, 255, 255],
    'red': [255, 0, 0],
    'green': [0, 255, 0],
    'blue': [0, 0, 255],
    'yellow': [255, 255, 0],
    'cyan': [0, 255, 255],
    'magenta': [255, 0, 255]
  };
  
  return colorMap[colorStr.toLowerCase()] || null;
}

function getPathPoints(pathData) {
  const points = [];
  const commands = pathData.match(/[MmLlHhVvZz][^MmLlHhVvZz]*/g);

  if (commands) {
    let currentX = 0, currentY = 0;

    for (let command of commands) {
      const type = command[0];
      const coords = command.slice(1).trim().split(/[\s,]+/).map(parseFloat);

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

function calculateBoundingBoxForParts(parts) {
  if (!parts || parts.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let part of parts) {
    const points = getPathPoints(part.pathData);
    for (let point of points) {
      minX = min(minX, point.x);
      minY = min(minY, point.y);
      maxX = max(maxX, point.x);
      maxY = max(maxY, point.y);
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

  svgParts.forEach((part, index) => {
    const partDiv = createDiv();
    partDiv.parent(container);
    partDiv.class("part-item");
    partDiv.style("padding", "8px");
    partDiv.style("margin", "4px 0");
    partDiv.style("border", "1px solid #ddd");
    partDiv.style("background", part.selected ? "#e3f2fd" : "#fff");
    partDiv.style("cursor", "pointer");
    partDiv.style("font-size", "12px");

    const nameDiv = createDiv(`${part.name}`);
    nameDiv.parent(partDiv);
    nameDiv.style("font-weight", "bold");
    nameDiv.style("margin-bottom", "4px");

    const infoDiv = createDiv(`Type: ${part.elementType}`);
    infoDiv.parent(partDiv);
    infoDiv.style("color", "#666");

    const colorDiv = createDiv();
    colorDiv.parent(partDiv);
    colorDiv.style("margin-top", "4px");
    colorDiv.style("display", "flex");
    colorDiv.style("gap", "8px");

    if (part.strokeSettings.enabled) {
      const strokeBox = createDiv();
      strokeBox.parent(colorDiv);
      strokeBox.style("width", "12px");
      strokeBox.style("height", "12px");
      strokeBox.style("border", "1px solid #000");
      strokeBox.style("background", `rgb(${part.strokeSettings.color.join(',')})`);
      strokeBox.attribute("title", "Stroke");
    }

    if (part.fillSettings.enabled) {
      const fillBox = createDiv();
      fillBox.parent(colorDiv);
      fillBox.style("width", "12px");
      fillBox.style("height", "12px");
      fillBox.style("border", "1px solid #000");
      fillBox.style("background", `rgb(${part.fillSettings.color.join(',')})`);
      fillBox.attribute("title", "Fill");
    }

    partDiv.mousePressed(() => selectPart(index));
  });
}

function selectPart(index) {
  // Deselect all parts
  svgParts.forEach(part => part.selected = false);
  
  // Select the clicked part
  if (index >= 0 && index < svgParts.length) {
    svgParts[index].selected = true;
    selectedPartIndex = index;
    updatePartSettings(svgParts[index]);
  }
  
  updateSVGPartsList();
  updateObjectDisplay();
  redraw();
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

  // Part name
  const nameDiv = createDiv(`Editing: ${part.name}`);
  nameDiv.parent(container);
  nameDiv.style("font-weight", "bold");
  nameDiv.style("margin-bottom", "12px");
  nameDiv.style("padding-bottom", "8px");
  nameDiv.style("border-bottom", "1px solid #ddd");

  // Stroke settings
  createCheckboxControl(container, "Enable Stroke", part.strokeSettings.enabled, (enabled) => {
    part.strokeSettings.enabled = enabled;
    updateObjectDisplay();
    redraw();
  });

  if (part.strokeSettings.enabled) {
    createColorControl(container, "Stroke Color", part.strokeSettings.color, (color) => {
      part.strokeSettings.color = color;
      updateSVGPartsList();
      updateObjectDisplay();
      redraw();
    });
    createSelectControl(container, "Stroke Mode", {
      straight: "straight",
      zigzag: "zigzag", 
      lines: "lines",
      sashiko: "sashiko"
    }, part.strokeSettings.mode, (value) => {
      part.strokeSettings.mode = value;
      updateObjectDisplay();
      redraw();
    });

    createSliderControl(container, "Stroke Weight", 0.5, 10, part.strokeSettings.weight, 0.5, (value) => {
      part.strokeSettings.weight = value;
      updateObjectDisplay();
      redraw();
    });

 

    createSliderControl(container, "Stroke Stitch Length", 0.1, 10, part.strokeSettings.stitchLength, 0.1, (value) => {
      part.strokeSettings.stitchLength = value;
      updateObjectDisplay();
      redraw();
    });
  }

  // Fill settings
  createCheckboxControl(container, "Enable Fill", part.fillSettings.enabled, (enabled) => {
    part.fillSettings.enabled = enabled;
    updateObjectDisplay();
    redraw();
  });

  if (part.fillSettings.enabled) {
    createColorControl(container, "Fill Color", part.fillSettings.color, (color) => {
      part.fillSettings.color = color;
      updateSVGPartsList();
      updateObjectDisplay();
      redraw();
    });

    createSelectControl(container, "Fill Mode", {
      tatami: "Tatami",
      satin: "Satin",
      spiral: "Spiral"
    }, part.fillSettings.mode, (value) => {
      part.fillSettings.mode = value;
      updateObjectDisplay();
      redraw();
    });

    createSliderControl(container, "Fill Stitch Length", 0.5, 10, part.fillSettings.stitchLength, 0.1, (value) => {
      part.fillSettings.stitchLength = value;
      updateObjectDisplay();
      redraw();
    });

    createSliderControl(container, "Row Spacing", 0.2, 5, part.fillSettings.rowSpacing, 0.1, (value) => {
      part.fillSettings.rowSpacing = value;
      updateObjectDisplay();
      redraw();
    });
  }
}

function updateObjectDisplay() {
  const displayObject = {
    globalSettings: globalSettings,
    boundingBox: boundingBox,
    parts: svgParts.map(part => ({
      id: part.id,
      name: part.name,
      elementType: part.elementType,
      strokeSettings: part.strokeSettings,
      fillSettings: part.fillSettings,
      visible: part.visible
    }))
  };

  objectDisplay.value(JSON.stringify(displayObject, null, 2));
}

function generateP5jsCode() {
  if (svgParts.length === 0) {
    p5jsOutput.value("// No SVG parts loaded yet");
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

    // Use p5.js primitives when possible
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
          // Fall back to vertex method for complex shapes
          code += `beginShape();`;
          const points = getPathPoints(part.pathData);
          points.forEach(point => {
            const scaledX = ((point.x - boundingBox.minX) / boundingBox.width) * globalSettings.outputWidth;
            const scaledY = ((point.y - boundingBox.minY) / boundingBox.height) * globalSettings.outputHeight;
            code += `\n  vertex(${scaledX.toFixed(1)}, ${scaledY.toFixed(1)});`;
          });
          code += `\n  endShape${part.pathData.toLowerCase().includes("z") ? "(CLOSE)" : "()"}`;
      }
    } else {
      // Fall back to vertex method for paths without shape parameters
      code += `beginShape();`;
      const points = getPathPoints(part.pathData);
      points.forEach(point => {
        const scaledX = ((point.x - boundingBox.minX) / boundingBox.width) * globalSettings.outputWidth;
        const scaledY = ((point.y - boundingBox.minY) / boundingBox.height) * globalSettings.outputHeight;
        code += `\n  vertex(${scaledX.toFixed(1)}, ${scaledY.toFixed(1)});`;
      });
      code += `\n  endShape${part.pathData.toLowerCase().includes("z") ? "(CLOSE)" : "()"}`;
    }
    
    code += `\n`;
  });

  code += `  
  endRecord();
  exportEmbroidery("svg_objects.dst");
}`;

  p5jsOutput.value(code);
}

function clearCanvas() {
  svgParts = [];
  selectedPartIndex = -1;
  svgInput.value("");
  p5jsOutput.value("Generated p5.js code will appear here...");
  objectDisplay.value("SVG objects array will appear here...");
  boundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  
  // Clear UI panels
  select("#svg-parts-list").html("");
  select("#part-settings").html("");
  
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