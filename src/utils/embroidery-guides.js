/**
 * p5.embroider Embroidery Guide Utilities
 * Reusable functions for drawing paper layouts, hoop guides, grids, and reference marks
 */

// Paper size definitions (in mm)
export const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  A1: { width: 594, height: 841 },
};

// Comprehensive hoop size presets (in mm)
// Based on real-world embroidery hoop specifications
export const HOOP_PRESETS = {
  // Manual Hoops (Round bamboo/wooden hoops for hand embroidery)
  "manual-4": { width: 100, height: 100, description: "4 inch bamboo hoop", shape: "round", type: "manual" },
  "manual-5": { width: 130, height: 130, description: "5 inch bamboo hoop", shape: "round", type: "manual" },
  "manual-6": { width: 150, height: 150, description: "6 inch bamboo hoop", shape: "round", type: "manual" },
  "manual-8": { width: 200, height: 200, description: "8 inch bamboo hoop", shape: "round", type: "manual" },
  "manual-10": { width: 250, height: 250, description: "10 inch bamboo hoop", shape: "round", type: "manual" },

  // Bernina Machine Hoops (Square/rectangular with grids)
  "bernina-small": {
    width: 72,
    height: 50,
    description: "Bernina Small Hoop - Smallest standard hoop",
    brand: "bernina",
    type: "machine",
    shape: "rectangle",
  },
  "bernina-medium": {
    width: 130,
    height: 100,
    description: "Bernina Medium Hoop - Most versatile standard size",
    brand: "bernina",
    type: "machine",
    shape: "rectangle",
  },
  "bernina-large-oval": {
    width: 145,
    height: 255,
    description: "Bernina Large Oval Hoop - Oval shaped for longer designs",
    brand: "bernina",
    type: "machine",
    shape: "rectangle",
  },
  "bernina-mega": {
    width: 150,
    height: 400,
    description: "Bernina Mega Hoop - Longest standard hoop for borders",
    brand: "bernina",
    type: "machine",
    shape: "rectangle",
  },

  // Bernina Specialty Machine Hoops (Ergonomic Twist-lock)
  "bernina-midi": {
    width: 265,
    height: 165,
    description: "Bernina Midi Hoop - Medium specialty with twist-lock",
    brand: "bernina",
    type: "machine",
    shape: "rectangle",
    frameThickness: 10,
  },
  "bernina-maxi": {
    width: 210,
    height: 400,
    description: "Bernina Maxi Hoop - Large specialty for big designs",
    brand: "bernina",
    type: "machine",
    shape: "rectangle",
    frameThickness: 10,
  },
  "bernina-jumbo": {
    width: 400,
    height: 260,
    description: "Bernina Jumbo Hoop - Largest specialty hoop",
    brand: "bernina",
    type: "machine",
    shape: "rectangle",
    frameThickness: 10,
    compatible: ["7-series", "8-series"],
  },

  // Brother Standard Hoops
  "brother-sa431": {
    width: 20,
    height: 60,
    description: "Brother SA431 Small - For monograms, collars, cuffs",
    brand: "brother",
    type: "machine",
    shape: "rectangle",
    model: "SA431",
    physicalSize: "1x2 inches",
  },
  "brother-sa432": {
    width: 100,
    height: 100,
    description: "Brother SA432 Medium - Most popular for left chest",
    brand: "brother",
    type: "machine",
    shape: "rectangle",
    model: "SA432",
    physicalSize: "4x4 inches",
  },
  "brother-sa434": {
    width: 170,
    height: 100,
    description: "Brother SA434 Large - Multi-position hoop",
    brand: "brother",
    model: "SA434",
    physicalSize: "6.7x4 inches",
  },
  "brother-sa444": {
    width: 127,
    height: 178,
    description: "Brother SA444 5x7 - Popular mid-size for larger designs",
    brand: "brother",
    model: "SA444",
    physicalSize: "5x7 inches",
  },
  "brother-sa441": {
    width: 159,
    height: 267,
    description: "Brother SA441 Extra Large - Large hoop for bigger designs",
    brand: "brother",
    model: "SA441",
    physicalSize: "6x10 inches",
  },

  // Brother Jumbo/Commercial Hoops
  "brother-7x12": {
    width: 178,
    height: 305,
    description: "Brother 7x12 Jumbo - Largest Brother hoop size",
    brand: "brother",
    type: "jumbo",
    compatible: ["Innovis 4000D", "5000D", "XV8500D", "PR series"],
  },
  "brother-8x12": {
    width: 203,
    height: 305,
    description: "Brother 8x12 Commercial - Commercial embroidery hoop",
    brand: "brother",
    type: "commercial",
    compatible: ["PR series commercial machines"],
  },

  // Tajima Tubular Hoops (circular)
  "tajima-9cm": {
    width: 90,
    height: 90,
    description: "Tajima 9cm Tubular - Small round tubular hoop",
    brand: "tajima",
    type: "tubular",
    sewingField: "360mm (14 inch)",
  },
  "tajima-12cm": {
    width: 120,
    height: 120,
    description: "Tajima 12cm Tubular - Medium round tubular hoop",
    brand: "tajima",
    type: "tubular",
    sewingField: "360mm (14 inch)",
  },
  "tajima-15cm": {
    width: 150,
    height: 150,
    description: "Tajima 15cm Tubular - Large round tubular hoop",
    brand: "tajima",
    type: "tubular",
    sewingField: "360mm (14 inch)",
  },
  "tajima-18cm": {
    width: 180,
    height: 180,
    description: "Tajima 18cm Tubular - Extra large round tubular hoop",
    brand: "tajima",
    type: "tubular",
    sewingField: "360mm (14 inch)",
  },
  "tajima-21cm": {
    width: 210,
    height: 210,
    description: "Tajima 21cm Tubular - XXL round tubular hoop",
    brand: "tajima",
    type: "tubular",
    sewingField: "360mm (14 inch)",
  },

  // Tajima Rectangular Hoops
  "tajima-24x24": {
    width: 240,
    height: 240,
    description: "Tajima 24x24 Square - Large square hoop",
    brand: "tajima",
    type: "rectangular",
  },
  "tajima-30x30": {
    width: 300,
    height: 300,
    description: "Tajima 30x30 Square - Extra large square hoop",
    brand: "tajima",
    type: "rectangular",
  },
  "tajima-sleeve": {
    width: 360,
    height: 100,
    description: "Tajima 36x10cm Sleeve - Specialized sleeve embroidery hoop",
    brand: "tajima",
    type: "specialty",
    sewingField: "360mm (14 inch)",
  },
  "tajima-large-rect": {
    width: 335,
    height: 329,
    description: "Tajima 335x329 Large Rectangular - Large format rectangular hoop",
    brand: "tajima",
    type: "rectangular",
  },
  "tajima-jumbo": {
    width: 413,
    height: 467,
    description: "Tajima 413x467 Jumbo - Jumbo rectangular hoop for 500mm sewing field",
    brand: "tajima",
    type: "jumbo",
    sewingField: "500mm (19.7 inch)",
  },

  // Dahao Commercial Hoops
  "dahao-standard": {
    width: 400,
    height: 500,
    description: "Dahao Standard Commercial - Standard commercial embroidery area",
    brand: "dahao",
    type: "commercial",
  },
  "dahao-large": {
    width: 450,
    height: 400,
    description: "Dahao Large Commercial - Large format commercial hoop",
    brand: "dahao",
    type: "commercial",
  },
  "dahao-jumbo": {
    width: 500,
    height: 1200,
    description: "Dahao Jumbo Commercial - XXL format for banners and large projects",
    brand: "dahao",
    type: "jumbo",
  },
  "dahao-square": {
    width: 600,
    height: 600,
    description: "Dahao Standard Square - Large square format",
    brand: "dahao",
    type: "commercial",
  },

  // Singer Futura Series Hoops
  "singer-ce-small": {
    width: 100,
    height: 160,
    description: "Singer Futura CE Small - Standard small hoop for CE-100/150/200/250/350",
    brand: "singer",
    type: "standard",
    compatible: ["CE-100", "CE-150", "CE-200", "CE-250", "CE-350"],
  },
  "singer-ce-large": {
    width: 114,
    height: 171,
    description: "Singer Futura CE Large - Large hoop for CE series machines",
    brand: "singer",
    type: "standard",
    model: "#51010",
    compatible: ["CE series"],
  },
  "singer-xl400-small": {
    width: 100,
    height: 100,
    description: "Singer Futura XL-400 Small - Standard 4x4 hoop for XL-400",
    brand: "singer",
    type: "standard",
    compatible: ["XL-400"],
  },
  "singer-xl400-large": {
    width: 152,
    height: 254,
    description: "Singer Futura XL-400 Large - Large format hoop for XL-400",
    brand: "singer",
    type: "standard",
    model: "#416454101",
    compatible: ["XL-400"],
  },
  "singer-se9180": {
    width: 170,
    height: 100,
    description: "Singer SE9180 Standard - Precision hoop for detailed work",
    brand: "singer",
    type: "standard",
    compatible: ["SE9180"],
  },

  // Singer Multi-Hoop Systems
  "singer-xl400-multi": {
    width: 305,
    height: 508,
    description: "Singer XL-400 Multi-Hoop System - Multi-hoop capability for continuous designs",
    brand: "singer",
    type: "multi-hoop",
    compatible: ["XL-400"],
  },
  "singer-xl400-max": {
    width: 470,
    height: 279,
    description: "Singer XL-400 Maximum Multi-Hoop - Maximum multi-hoop design area",
    brand: "singer",
    type: "multi-hoop",
    compatible: ["XL-400"],
  },
};

/**
 * Draw a grid background with specified spacing
 * @param {number} spacing - Grid spacing in mm
 * @param {Object} options - Grid styling options
 * @param {Array} options.color - Grid color [r, g, b] or [r, g, b, a]
 * @param {number} options.weight - Grid line weight in pixels
 * @param {number} options.alpha - Grid transparency (0-255)
 */
export function drawGrid(spacing = 10, options = {}) {
  const { color = [0, 0, 0], weight = 1, alpha = 20 } = options;

  push();

  if (color.length === 3) {
    stroke(color[0], color[1], color[2], alpha);
  } else {
    stroke(color[0], color[1], color[2], color[3] || alpha);
  }

  strokeWeight(weight);

  const spacingPixels = mmToPixel(spacing);
  // Note: width and height should be available from p5.js global context
  // Using globalThis to access p5.js globals safely
  const canvasWidth = (typeof globalThis !== "undefined" && globalThis.width) || 800;
  const canvasHeight = (typeof globalThis !== "undefined" && globalThis.height) || 600;

  // Draw horizontal lines
  for (let i = 0; i <= canvasHeight / spacingPixels; i++) {
    const y = i * spacingPixels;
    line(0, y, canvasWidth, y);
  }

  // Draw vertical lines
  for (let j = 0; j <= canvasWidth / spacingPixels; j++) {
    const x = j * spacingPixels + spacingPixels * 0.5;
    line(x, 0, x, canvasHeight);
  }

  pop();
}

/**
 * Draw embroidery hoop guides with circular outline and center marks
 * @param {number} x - Center X position in mm
 * @param {number} y - Center Y position in mm
 * @param {Object} hoopSize - Hoop dimensions {width, height} in mm
 * @param {Object} options - Guide styling options
 */
export function drawHoopGuides(x, y, hoopSize, options = {}) {
  const {
    showOutline = true,
    showCenterMarks = true,
    showPunchPoints = true,
    outlineColor = [102, 102, 102],
    centerMarkColor = [204, 204, 204],
    punchPointColor = [102, 102, 102],
    outlineWeight = 0.5,
    centerMarkWeight = 0.2,
    numPunchPoints = 12,
    alpha = 128,
  } = options;

  const radius = Math.min(hoopSize.width, hoopSize.height) / 2;
  const centerX = x;
  const centerY = y;

  push();

  // Draw circular hoop outline
  if (showOutline) {
    stroke(outlineColor[0], outlineColor[1], outlineColor[2], alpha);
    strokeWeight(mmToPixel(outlineWeight));
    noFill();
    circle(mmToPixel(centerX), mmToPixel(centerY), mmToPixel(radius * 2));
  }

  // Draw center cross marks
  if (showCenterMarks) {
    stroke(centerMarkColor[0], centerMarkColor[1], centerMarkColor[2], alpha);
    strokeWeight(mmToPixel(centerMarkWeight));

    // Vertical center line
    line(mmToPixel(centerX), mmToPixel(centerY - radius), mmToPixel(centerX), mmToPixel(centerY + radius));

    // Horizontal center line
    line(mmToPixel(centerX - radius), mmToPixel(centerY), mmToPixel(centerX + radius), mmToPixel(centerY));
  }

  // Draw punch needle points around the circle
  if (showPunchPoints) {
    stroke(punchPointColor[0], punchPointColor[1], punchPointColor[2], alpha + 75);
    fill(punchPointColor[0], punchPointColor[1], punchPointColor[2], alpha + 75);

    for (let i = 0; i < numPunchPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPunchPoints;
      const pointX = centerX + radius * Math.cos(angle);
      const pointY = centerY + radius * Math.sin(angle);

      // Draw punch needle point (small circle)
      circle(mmToPixel(pointX), mmToPixel(pointY), mmToPixel(1));

      // Draw small line extending outward from the point
      const outerRadius = radius + 3;
      const outerX = centerX + outerRadius * Math.cos(angle);
      const outerY = centerY + outerRadius * Math.sin(angle);

      strokeWeight(mmToPixel(0.3));
      stroke(punchPointColor[0], punchPointColor[1], punchPointColor[2], alpha + 25);
      line(mmToPixel(pointX), mmToPixel(pointY), mmToPixel(outerX), mmToPixel(outerY));
    }
  }

  pop();
}

/**
 * Draw machine hoop (rectangular) with grid
 * @param {number} x - Center X position in mm
 * @param {number} y - Center Y position in mm
 * @param {Object} hoopSize - Hoop dimensions {width, height} in mm
 * @param {Object} options - Hoop styling options
 */
export function drawMachineHoop(x, y, hoopSize, options = {}) {
  const {
    frameColor = [80, 80, 80], // Dark gray frame
    gridColor = [150, 150, 150], // Light gray grid
    frameWeight = 2,
    gridWeight = 0.5,
    gridSpacing = 10, // Grid spacing in mm
    alpha = 180,
  } = options;

  const halfWidth = hoopSize.width / 2;
  const halfHeight = hoopSize.height / 2;
  const left = x - halfWidth;
  const top = y - halfHeight;
  const right = x + halfWidth;
  const bottom = y + halfHeight;

  push();

  // Draw machine hoop frame (rectangular)
  stroke(frameColor[0], frameColor[1], frameColor[2], alpha);
  strokeWeight(mmToPixel(frameWeight));
  noFill();
  rect(mmToPixel(left), mmToPixel(top), mmToPixel(hoopSize.width), mmToPixel(hoopSize.height));

  // Draw grid inside the hoop
  stroke(gridColor[0], gridColor[1], gridColor[2], alpha * 0.6);
  strokeWeight(mmToPixel(gridWeight));

  // Vertical grid lines
  for (let gridX = left + gridSpacing; gridX < right; gridX += gridSpacing) {
    line(mmToPixel(gridX), mmToPixel(top), mmToPixel(gridX), mmToPixel(bottom));
  }

  // Horizontal grid lines
  for (let gridY = top + gridSpacing; gridY < bottom; gridY += gridSpacing) {
    line(mmToPixel(left), mmToPixel(gridY), mmToPixel(right), mmToPixel(gridY));
  }

  // Draw center crosshairs
  stroke(gridColor[0] - 50, gridColor[1] - 50, gridColor[2] - 50, alpha);
  strokeWeight(mmToPixel(gridWeight * 1.5));
  line(mmToPixel(x - 5), mmToPixel(y), mmToPixel(x + 5), mmToPixel(y)); // Horizontal
  line(mmToPixel(x), mmToPixel(y - 5), mmToPixel(x), mmToPixel(y + 5)); // Vertical

  pop();
}

/**
 * Draw manual hoop (round bamboo style) with realistic appearance
 * @param {number} x - Center X position in mm
 * @param {number} y - Center Y position in mm
 * @param {Object} hoopSize - Hoop dimensions {width, height} in mm
 * @param {Object} options - Hoop styling options
 */
export function drawManualHoop(x, y, hoopSize, options = {}) {
  const {
    outerColor = [139, 69, 19], // Saddle brown bamboo
    innerColor = [245, 245, 220], // Beige fabric area
    ringColor = [101, 67, 33], // Dark brown
    centerMarkColor = [153, 153, 153],
    outerStroke = 0.5,
    innerStroke = 0.3,
    centerMarkWeight = 0.2,
    ringThickness = 3,
    showCenterMarks = true,
    alpha = 204,
  } = options;

  const centerX = x;
  const centerY = y;
  const outerRadius = Math.min(hoopSize.width, hoopSize.height) / 2;
  const innerRadius = outerRadius - ringThickness;

  push();

  // Draw outer bamboo hoop ring
  fill(outerColor[0], outerColor[1], outerColor[2], alpha);
  stroke(ringColor[0], ringColor[1], ringColor[2], alpha);
  strokeWeight(mmToPixel(outerStroke));
  circle(mmToPixel(centerX), mmToPixel(centerY), mmToPixel(outerRadius * 2));

  // Draw inner working area (fabric)
  fill(innerColor[0], innerColor[1], innerColor[2], alpha + 25);
  stroke(innerColor[0] - 25, innerColor[1] - 25, innerColor[2] - 25, alpha);
  strokeWeight(mmToPixel(innerStroke));
  circle(mmToPixel(centerX), mmToPixel(centerY), mmToPixel(innerRadius * 2));

  // Add center marks for alignment
  if (showCenterMarks) {
    stroke(centerMarkColor[0], centerMarkColor[1], centerMarkColor[2], alpha - 50);
    strokeWeight(mmToPixel(centerMarkWeight));

    // Horizontal center mark
    line(mmToPixel(centerX - 2), mmToPixel(centerY), mmToPixel(centerX + 2), mmToPixel(centerY));

    // Vertical center mark
    line(mmToPixel(centerX), mmToPixel(centerY - 2), mmToPixel(centerX), mmToPixel(centerY + 2));
  }

  pop();
}

/**
 * Draw hoop based on type (automatically chooses manual or machine hoop)
 * @param {number} x - Center X position in mm
 * @param {number} y - Center Y position in mm
 * @param {Object} hoopSize - Hoop object with dimensions and type info
 * @param {Object} options - Hoop styling options
 */
export function drawHoop(x, y, hoopSize, options = {}) {
  if (hoopSize.type === "manual" || hoopSize.shape === "round") {
    drawManualHoop(x, y, hoopSize, options);
  } else {
    drawMachineHoop(x, y, hoopSize, options);
  }
}

/**
 * Draw corner marks for rectangular reference frames
 * @param {number} x - Top-left X position in mm
 * @param {number} y - Top-left Y position in mm
 * @param {number} w - Width in mm
 * @param {number} h - Height in mm
 * @param {Object} options - Corner mark styling options
 */
export function drawCornerMarks(x, y, w, h, options = {}) {
  const { markSize = 5, color = [102, 102, 102], weight = 0.2, alpha = 128 } = options;

  push();

  stroke(color[0], color[1], color[2], alpha);
  strokeWeight(mmToPixel(weight));

  // Top-left corner
  line(mmToPixel(x), mmToPixel(y), mmToPixel(x + markSize), mmToPixel(y));
  line(mmToPixel(x), mmToPixel(y), mmToPixel(x), mmToPixel(y + markSize));

  // Top-right corner
  line(mmToPixel(x + w), mmToPixel(y), mmToPixel(x + w - markSize), mmToPixel(y));
  line(mmToPixel(x + w), mmToPixel(y), mmToPixel(x + w), mmToPixel(y + markSize));

  // Bottom-left corner
  line(mmToPixel(x), mmToPixel(y + h), mmToPixel(x + markSize), mmToPixel(y + h));
  line(mmToPixel(x), mmToPixel(y + h), mmToPixel(x), mmToPixel(y + h - markSize));

  // Bottom-right corner
  line(mmToPixel(x + w), mmToPixel(y + h), mmToPixel(x + w - markSize), mmToPixel(y + h));
  line(mmToPixel(x + w), mmToPixel(y + h), mmToPixel(x + w), mmToPixel(y + h - markSize));

  pop();
}

/**
 * Draw paper boundary guides
 * @param {string} paperSize - Paper size key (A4, A3, A2, A1)
 * @param {Object} margins - Margin settings {top, right, bottom, left} in mm
 * @param {Object} options - Paper guide styling options
 */
export function drawPaperGuides(paperSize = "A4", margins = {}, options = {}) {
  const { top = 15, right = 15, bottom = 15, left = 15 } = margins;

  const {
    boundaryColor = [128, 128, 128],
    marginColor = [192, 192, 192],
    weight = 0.3,
    alpha = 100,
    showMargins = true,
  } = options;

  const paper = PAPER_SIZES[paperSize];
  if (!paper) {
    console.warn(`Invalid paper size: ${paperSize}`);
    return;
  }

  push();

  // Draw paper boundary
  stroke(boundaryColor[0], boundaryColor[1], boundaryColor[2], alpha);
  strokeWeight(mmToPixel(weight));
  noFill();
  rect(0, 0, mmToPixel(paper.width), mmToPixel(paper.height));

  // Draw margin guides
  if (showMargins) {
    stroke(marginColor[0], marginColor[1], marginColor[2], alpha);
    strokeWeight(mmToPixel(weight * 0.7));
    rect(
      mmToPixel(left),
      mmToPixel(top),
      mmToPixel(paper.width - left - right),
      mmToPixel(paper.height - top - bottom),
    );
  }

  pop();
}

/**
 * Get hoop preset by name
 * @param {string} presetName - Hoop preset name (4x4, 5x7, etc.)
 * @returns {Object} Hoop size object {width, height} in mm
 */
export function getHoopPreset(presetName) {
  const preset = HOOP_PRESETS[presetName];
  if (!preset) {
    console.warn(`Invalid hoop preset: ${presetName}. Available presets:`, Object.keys(HOOP_PRESETS));
    return HOOP_PRESETS["4x4"]; // Default fallback
  }
  return preset;
}

/**
 * Get hoops by brand
 * @param {string} brand - Brand name (bernina, brother)
 * @returns {Array} Array of hoop objects with their keys
 */
export function getHoopsByBrand(brand) {
  return Object.entries(HOOP_PRESETS)
    .filter(([key, hoop]) => hoop.brand === brand)
    .map(([key, hoop]) => ({ key, ...hoop }));
}

/**
 * Get hoops by type
 * @param {string} type - Hoop type (standard, specialty, jumbo, commercial)
 * @returns {Array} Array of hoop objects with their keys
 */
export function getHoopsByType(type) {
  return Object.entries(HOOP_PRESETS)
    .filter(([key, hoop]) => hoop.type === type)
    .map(([key, hoop]) => ({ key, ...hoop }));
}

/**
 * Get hoops by size range
 * @param {number} minWidth - Minimum width in mm
 * @param {number} maxWidth - Maximum width in mm
 * @param {number} minHeight - Minimum height in mm
 * @param {number} maxHeight - Maximum height in mm
 * @returns {Array} Array of hoop objects with their keys that fit the size criteria
 */
export function getHoopsBySize(minWidth = 0, maxWidth = Infinity, minHeight = 0, maxHeight = Infinity) {
  return Object.entries(HOOP_PRESETS)
    .filter(
      ([key, hoop]) =>
        hoop.width >= minWidth && hoop.width <= maxWidth && hoop.height >= minHeight && hoop.height <= maxHeight,
    )
    .map(([key, hoop]) => ({ key, ...hoop }));
}

/**
 * Find the best hoop for a given design size
 * @param {number} designWidth - Design width in mm
 * @param {number} designHeight - Design height in mm
 * @param {Object} options - Search options
 * @param {string} options.brand - Preferred brand (optional)
 * @param {string} options.type - Preferred type (optional)
 * @param {number} options.margin - Extra margin around design in mm (default: 5)
 * @returns {Object|null} Best matching hoop or null if no suitable hoop found
 */
export function findBestHoop(designWidth, designHeight, options = {}) {
  const { brand, type, margin = 5 } = options;
  const requiredWidth = designWidth + margin * 2;
  const requiredHeight = designHeight + margin * 2;

  // Get candidate hoops
  let candidates = Object.entries(HOOP_PRESETS)
    .filter(([key, hoop]) => hoop.width >= requiredWidth && hoop.height >= requiredHeight)
    .map(([key, hoop]) => ({ key, ...hoop }));

  // Filter by brand if specified
  if (brand) {
    candidates = candidates.filter((hoop) => hoop.brand === brand);
  }

  // Filter by type if specified
  if (type) {
    candidates = candidates.filter((hoop) => hoop.type === type);
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort by total area (smallest suitable hoop first)
  candidates.sort((a, b) => a.width * a.height - b.width * b.height);

  return candidates[0];
}

/**
 * Get all available hoop brands
 * @returns {Array} Array of unique brand names
 */
export function getHoopBrands() {
  const brands = new Set();
  Object.values(HOOP_PRESETS).forEach((hoop) => {
    if (hoop.brand) brands.add(hoop.brand);
  });
  return Array.from(brands).sort();
}

/**
 * Get all available hoop types
 * @returns {Array} Array of unique hoop types
 */
export function getHoopTypes() {
  const types = new Set();
  Object.values(HOOP_PRESETS).forEach((hoop) => {
    if (hoop.type) types.add(hoop.type);
  });
  return Array.from(types).sort();
}

/**
 * Get paper size by name
 * @param {string} paperName - Paper size name (A4, A3, etc.)
 * @returns {Object} Paper size object {width, height} in mm
 */
export function getPaperSize(paperName) {
  const paper = PAPER_SIZES[paperName];
  if (!paper) {
    console.warn(`Invalid paper size: ${paperName}. Available sizes:`, Object.keys(PAPER_SIZES));
    return PAPER_SIZES["A4"]; // Default fallback
  }
  return paper;
}

/**
 * Draw a complete embroidery workspace with hoop, grid, and guides
 * @param {Object} config - Workspace configuration
 */
export function drawEmbroideryWorkspace(config = {}) {
  const {
    hoopPreset = "4x4",
    hoopPosition = null, // Auto-center if null
    gridSpacing = 10,
    showGrid = true,
    showHoopGuides = true,
    showHoop = false,
    showCornerMarks = true,
    paperSize = "A4",
    margins = { top: 15, right: 15, bottom: 15, left: 15 },
  } = config;

  // Get hoop and paper sizes
  const hoop = getHoopPreset(hoopPreset);
  const paper = getPaperSize(paperSize);

  // Calculate hoop position (center by default)
  let hoopX, hoopY;
  if (hoopPosition) {
    hoopX = hoopPosition.x;
    hoopY = hoopPosition.y;
  } else {
    // Center hoop in the available area
    const availableWidth = paper.width - margins.left - margins.right;
    const availableHeight = paper.height - margins.top - margins.bottom;
    hoopX = margins.left + availableWidth / 2;
    hoopY = margins.top + availableHeight / 2;
  }

  // Draw components in order
  if (showGrid) {
    drawGrid(gridSpacing);
  }

  if (showHoop) {
    drawHoop(hoopX, hoopY, hoop);
  }

  if (showHoopGuides) {
    drawHoopGuides(hoopX, hoopY, hoop);
  }

  if (showCornerMarks) {
    drawCornerMarks(
      margins.left,
      margins.top,
      paper.width - margins.left - margins.right,
      paper.height - margins.top - margins.bottom,
    );
  }
}
