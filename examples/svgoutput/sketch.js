let drawMode = "stitch";
let selectedPaperSize = "A4";
let selectedHoopSize = "4x4";
let selectedDPI = 300;
let showHoopInExport = false;
let showGuidesInExport = false;

// Paper size definitions (in mm)
const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  A1: { width: 594, height: 841 },
};

function setup() {
  // Create canvas based on selected paper size
  updateCanvasSize();

  // Draw mode buttons
  let drawModeStitchButton = createButton("Draw Mode: Stitch");
  drawModeStitchButton.mousePressed(() => {
    drawMode = "stitch";
  });

  let drawModeLineButton = createButton("Draw Mode: Realistic");
  drawModeLineButton.mousePressed(() => {
    drawMode = "realistic";
  });

  let drawModeP5Button = createButton("Draw Mode: p5");
  drawModeP5Button.mousePressed(() => {
    drawMode = "p5";
  });

  // Paper size selection
  let paperSizeLabel = createDiv("Paper Size:");
  paperSizeLabel.position(0, height + 60);
  paperSizeLabel.style("font-size", "12px");
  paperSizeLabel.style("color", "#333");

  let paperSizeSelect = createSelect();
  paperSizeSelect.option("A4 (210×297mm)", "A4");
  paperSizeSelect.option("A3 (297×420mm)", "A3");
  paperSizeSelect.option("A2 (420×594mm)", "A2");
  paperSizeSelect.option("A1 (594×841mm)", "A1");
  paperSizeSelect.selected("A4");
  paperSizeSelect.changed(() => {
    selectedPaperSize = paperSizeSelect.value();
    updateCanvasSize();
    updateUIPositions();
  });
  paperSizeSelect.position(0, height + 80);

  // Hoop size selection
  let hoopSizeLabel = createDiv("Hoop Size:");
  hoopSizeLabel.position(120, height + 60);
  hoopSizeLabel.style("font-size", "12px");
  hoopSizeLabel.style("color", "#333");

  let hoopSizeSelect = createSelect();
  hoopSizeSelect.option("4×4 inch (100×100mm)", "4x4");
  hoopSizeSelect.option("5×7 inch (130×180mm)", "5x7");
  hoopSizeSelect.option("6×10 inch (160×250mm)", "6x10");
  hoopSizeSelect.option("8×8 inch (200×200mm)", "8x8");
  hoopSizeSelect.option("8×10 inch (200×250mm)", "8x10");
  hoopSizeSelect.selected("4x4");
  hoopSizeSelect.changed(() => {
    selectedHoopSize = hoopSizeSelect.value();
  });
  hoopSizeSelect.position(120, height + 80);

  // DPI selection
  let dpiLabel = createDiv("DPI:");
  dpiLabel.position(240, height + 60);
  dpiLabel.style("font-size", "12px");
  dpiLabel.style("color", "#333");

  let dpiSelect = createSelect();
  dpiSelect.option("72 DPI (Screen)", 72);
  dpiSelect.option("96 DPI (Inkscape Default)", 96);
  dpiSelect.option("150 DPI (Draft)", 150);
  dpiSelect.option("300 DPI (Print)", 300);
  dpiSelect.option("600 DPI (High Quality)", 600);
  dpiSelect.selected(300);
  dpiSelect.changed(() => {
    selectedDPI = parseInt(dpiSelect.value());
  });
  dpiSelect.position(240, height + 80);

  // Export options checkboxes
  let exportOptionsLabel = createDiv("Export Options:");
  exportOptionsLabel.position(360, height + 60);
  exportOptionsLabel.style("font-size", "12px");
  exportOptionsLabel.style("color", "#333");

  let showHoopCheckbox = createCheckbox("Show Hoop in Export", showHoopInExport);
  showHoopCheckbox.position(360, height + 80);
  showHoopCheckbox.changed(() => {
    showHoopInExport = showHoopCheckbox.checked();
  });

  let showGuidesCheckbox = createCheckbox("Show Guides in Export", showGuidesInExport);
  showGuidesCheckbox.position(360, height + 100);
  showGuidesCheckbox.changed(() => {
    showGuidesInExport = showGuidesCheckbox.checked();
  });

  // Export buttons
  let exportDstButton = createButton("Export DST");
  exportDstButton.mousePressed(() => {
    exportEmbroidery("round-shape.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("round-shape.gcode");
  });
  exportGcodeButton.position(90, height + 30);

  let exportSvgButton = createButton("Export SVG");
  exportSvgButton.mousePressed(() => {
    const options = getSVGExportOptions();
    exportSVG("round-shape.svg", options);
  });
  exportSvgButton.position(180, height + 30);

  let exportPngButton = createButton("Export PNG");
  exportPngButton.mousePressed(() => {
    const options = getSVGExportOptions();
    exportPNG("round-shape.png", options);
  });
  exportPngButton.position(270, height + 30);
}

// Configure SVG export options based on selected paper and hoop sizes
function getSVGExportOptions() {
  const hoopPresets = {
    "4x4": { width: 100, height: 100 },
    "5x7": { width: 130, height: 180 },
    "6x10": { width: 160, height: 250 },
    "8x8": { width: 200, height: 200 },
    "8x10": { width: 200, height: 250 },
  };

  const hoopSize = hoopPresets[selectedHoopSize] || hoopPresets["4x4"];

  return {
    paperSize: selectedPaperSize,
    hoopSize: hoopSize,
    showGuides: showGuidesInExport,  // Use checkbox value
    showHoop: showHoopInExport,      // Use checkbox value
    lifeSize: true,
    dpi: selectedDPI,
  };
}

// Update canvas size based on selected paper size
function updateCanvasSize() {
  const paper = PAPER_SIZES[selectedPaperSize];
  if (!paper) return;
  
  // Use actual paper size in mm - p5.embroider will handle the mm to pixel conversion
  // Scale down for reasonable screen display
  const displayScale = 0.5; // Use 0.5 for better visibility
  const canvasWidthMm = paper.width * displayScale;
  const canvasHeightMm = paper.height * displayScale;
  
  // Convert to pixels using p5.embroider's mmToPixel function
  const canvasWidth = mmToPixel(canvasWidthMm);
  const canvasHeight = mmToPixel(canvasHeightMm);
  
  if (typeof createCanvas === 'function') {
    createCanvas(canvasWidth, canvasHeight);
  } else {
    // If canvas already exists, resize it
    resizeCanvas(canvasWidth, canvasHeight);
  }
}

// Update UI element positions when canvas size changes
function updateUIPositions() {
  // Note: In p5.js, we need to store references to UI elements to reposition them
  // For now, this is a placeholder - in a full implementation, you'd store element references
  console.log("Canvas resized - UI elements may need repositioning");
}

// Get current hoop size for canvas display
function getCurrentHoopSize() {
  const hoopPresets = {
    "4x4": { width: 100, height: 100 },
    "5x7": { width: 130, height: 180 },
    "6x10": { width: 160, height: 250 },
    "8x8": { width: 200, height: 200 },
    "8x10": { width: 200, height: 250 },
  };
  return hoopPresets[selectedHoopSize] || hoopPresets["4x4"];
}

// Draw paper background
function drawPaper() {
  const paper = PAPER_SIZES[selectedPaperSize];
  if (!paper) return;
  
  const displayScale = 0.5; // Same scale as canvas
  const paperWidthMm = paper.width * displayScale;
  const paperHeightMm = paper.height * displayScale;
  const paperWidth = mmToPixel(paperWidthMm);
  const paperHeight = mmToPixel(paperHeightMm);
  
  // Draw paper background
  fill(255, 255, 255); // White paper
  stroke(200, 200, 200); // Light gray border
  strokeWeight(2);
  rect(0, 0, paperWidth, paperHeight);
  
  // Draw paper size label
  fill(150, 150, 150);
  noStroke();
  textAlign(RIGHT, BOTTOM);
  textSize(12);
  text(`${selectedPaperSize} (${paper.width}×${paper.height}mm)`, paperWidth - 10, paperHeight - 10);
  
  return { paperWidthMm, paperHeightMm, displayScale };
}

// Draw embroidery hoop visualization on canvas
function drawHoop(paperInfo) {
  const hoop = getCurrentHoopSize();
  const displayScale = paperInfo.displayScale;
  
  // Hoop dimensions in mm (scaled for display)
  const hoopWidthMm = hoop.width * displayScale;
  const hoopHeightMm = hoop.height * displayScale;
  const hoopPixelWidth = mmToPixel(hoopWidthMm);
  const hoopPixelHeight = mmToPixel(hoopHeightMm);
  
  // Position hoop with margin from paper edge (in mm)
  const marginMm = 15 * displayScale; // 15mm margin scaled
  const marginX = mmToPixel(marginMm);
  const marginY = mmToPixel(marginMm);
  
  const hoopX = marginX;
  const hoopY = marginY;
  const centerX = hoopX + hoopPixelWidth / 2;
  const centerY = hoopY + hoopPixelHeight / 2;
  
  // Draw outer hoop ring (wood/plastic)
  const outerRadius = Math.min(hoopPixelWidth, hoopPixelHeight) / 2;
  const innerRadius = outerRadius - mmToPixel(3 * displayScale); // 3mm thick hoop ring
  
  // Outer ring
  fill(139, 69, 19, 200); // Brown wood color with transparency
  stroke(101, 67, 33);
  strokeWeight(2);
  ellipse(centerX, centerY, outerRadius * 2, outerRadius * 2);
  
  // Inner ring (working area)
  fill(245, 245, 220, 230); // Beige fabric color
  stroke(210, 180, 140);
  strokeWeight(1);
  ellipse(centerX, centerY, innerRadius * 2, innerRadius * 2);
  
  // Add hoop tension screws
  const numScrews = 4;
  for (let i = 0; i < numScrews; i++) {
    const angle = (i * TWO_PI) / numScrews + PI / 4; // Offset by 45 degrees
    const screwRadius = outerRadius + mmToPixel(2 * displayScale);
    const screwX = centerX + screwRadius * cos(angle);
    const screwY = centerY + screwRadius * sin(angle);
    
    // Screw head
    fill(192, 192, 192); // Silver
    stroke(128, 128, 128);
    strokeWeight(1);
    ellipse(screwX, screwY, mmToPixel(3 * displayScale), mmToPixel(3 * displayScale));
    
    // Screw slot
    stroke(64, 64, 64);
    strokeWeight(2);
    line(screwX - mmToPixel(1 * displayScale), screwY, screwX + mmToPixel(1 * displayScale), screwY);
  }
  
  // Add center marks for alignment
  stroke(153, 153, 153, 150);
  strokeWeight(1);
  line(centerX - mmToPixel(2 * displayScale), centerY, centerX + mmToPixel(2 * displayScale), centerY);
  line(centerX, centerY - mmToPixel(2 * displayScale), centerX, centerY + mmToPixel(2 * displayScale));
  
  // Return hoop position for pattern centering (in mm coordinates)
  return { 
    centerX: pixelToMm(centerX), 
    centerY: pixelToMm(centerY), 
    displayScale 
  };
}

function draw() {
  background("#F0F0F0"); // Light gray background
  
  // Draw the paper background and get paper info
  const paperInfo = drawPaper();

  // Draw the embroidery hoop and get its position
  const hoopInfo = drawHoop(paperInfo);

  // Center the embroidery pattern in the hoop
  push();
  // In p5.embroider, coordinates are in mm, so we translate to the hoop center in mm
  // The pattern is about 100mm wide, so we offset by 50mm to center it
  translate(hoopInfo.centerX - 50, hoopInfo.centerY - 50); // Center the pattern (in mm coordinates)
  // No need to scale here - p5.embroider handles the mm to pixel conversion automatically

  setDrawMode(drawMode);

  // Create a simple round shape with embroidery
  beginRecord(this);

  // Set up embroidery settings
  setStitch(1, 2, 0);
  setStrokeSettings({
    stitchLength: 0.8,
    stitchWidth: 3,
    noise: 0.0,
  });

  //   // Draw the main circle with tatami fill
  //   setFillMode("tatami");
  //   noStroke();
  //   fill(255, 0, 0); // Red fill
  //   ellipse(50, 50, 80, 80);

  //   trimThread();

  // Draw an outline around the circle
  setStrokeMode("zigzag");
  noFill();
  stroke(0, 0, 255); // Blue outline
  strokeWeight(3);
  ellipse(50, 50, 80, 80);

  trimThread();

  //   // Draw a smaller circle inside
  //   setFillMode("satin");
  //   noStroke();
  //   fill(0, 255, 0); // Green fill
  //   ellipse(50, 50, 40, 40);

  //   trimThread();

  //   // Draw some decorative elements
  //   setStrokeMode("straight");
  //   stroke(255, 255, 0); // Yellow
  //   strokeWeight(1);
  //   noFill();

  //   // Draw cross pattern
  //   line(30, 50, 70, 50);
  //   line(50, 30, 50, 70);

  //   trimThread();

  // Stop recording
  endRecord();
  
  pop();
}

function keyPressed() {
  switch (key) {
    case "d":
      exportEmbroidery("round-shape.dst");
      break;
    case "g":
      exportGcode("round-shape.gcode");
      break;
    case "s":
      const svgOptions = getSVGExportOptions();
      exportSVG("round-shape.svg", svgOptions);
      break;
    case "p":
      const pngOptions = getSVGExportOptions();
      exportPNG("round-shape.png", pngOptions);
      break;
  }
}
