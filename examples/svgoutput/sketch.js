let drawMode = "stitch";
let selectedPaperSize = "A4";
let selectedHoopSize = "4x4";
let selectedDPI = 300;

function setup() {
  createCanvas(mmToPixel(120), mmToPixel(120));

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
    showGuides: true,
    lifeSize: true,
    dpi: selectedDPI,
  };
}

function draw() {
  background("#FFF5DC");
  translate(mmToPixel(10), mmToPixel(10));

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
