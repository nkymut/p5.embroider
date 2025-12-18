let drawMode = "stitch";
let currentSettings = {
  strokeWeight: 2,
  stitchLength: 3,
  stitchWidth: 0.2,
  minStitchLength: 0.5,
  resampleNoise: 0.2,
  curveDetail: 20,
  bezierDetail: 20,
};

let currentStrokeMode = "straight";
let showCurveType = "all"; // "line", "bezier", "curve", "vertex", "all"

function createLabeledSlider(label, min, max, value, step, yOffset) {
  let container = createDiv();
  container.position(width + 10, yOffset);
  container.style("width", "300px");
  container.style("height", "30px");
  container.style("margin-bottom", "10px");

  let labelElem = createSpan(label + ": ");
  labelElem.parent(container);
  labelElem.style("display", "inline-block");
  labelElem.style("width", "140px");

  let slider = createSlider(min, max, value, step);
  slider.parent(container);
  slider.style("width", "100px");
  slider.style("display", "inline-block");
  slider.style("vertical-align", "middle");

  let valueDisplay = createSpan(value);
  valueDisplay.parent(container);
  valueDisplay.style("margin-left", "10px");
  valueDisplay.style("display", "inline-block");
  valueDisplay.style("width", "40px");
  valueDisplay.style("text-align", "right");

  return { slider, valueDisplay };
}

function createLabeledDropdown(label, options, defaultValue, yOffset) {
  let container = createDiv();
  container.position(width + 10, yOffset);
  container.style("width", "300px");
  container.style("height", "30px");
  container.style("margin-bottom", "10px");

  let labelElem = createSpan(label + ": ");
  labelElem.parent(container);
  labelElem.style("display", "inline-block");
  labelElem.style("width", "140px");

  let dropdown = createSelect();
  dropdown.parent(container);
  dropdown.style("width", "100px");
  dropdown.style("display", "inline-block");

  for (let option of options) {
    dropdown.option(option);
  }
  dropdown.selected(defaultValue);

  return dropdown;
}

function setup() {
  createCanvas(mmToPixel(120), mmToPixel(120));

  // Create mode buttons
  let buttonContainer = createDiv();
  buttonContainer.position(width + 10, 10);
  buttonContainer.style("width", "300px");
  buttonContainer.style("margin-bottom", "20px");

  let drawModeStitchButton = createButton("Draw Mode: Stitch");
  drawModeStitchButton.parent(buttonContainer);
  drawModeStitchButton.mousePressed(() => {
    drawMode = "stitch";
    redraw();
  });

  let drawModeRealisticButton = createButton("Draw Mode: Realistic");
  drawModeRealisticButton.parent(buttonContainer);
  drawModeRealisticButton.mousePressed(() => {
    drawMode = "realistic";
    redraw();
  });

  let drawModeP5Button = createButton("Draw Mode: p5");
  drawModeP5Button.parent(buttonContainer);
  drawModeP5Button.mousePressed(() => {
    drawMode = "p5";
    redraw();
  });

  // Style the buttons
  let buttons = buttonContainer.elt.getElementsByTagName("button");
  for (let button of buttons) {
    button.style.marginRight = "10px";
    button.style.marginBottom = "10px";
    button.style.fontSize = "12px";
    button.style.padding = "5px 8px";
  }

  // Create dropdowns and sliders for curve settings
  let yStart = 80;
  let ySpacing = 45;

  // Stroke mode dropdown
  let strokeModeDropdown = createLabeledDropdown(
    "Stroke Mode",
    ["straight", "zigzag", "lines", "sashiko"],
    currentStrokeMode,
    yStart,
  );
  strokeModeDropdown.changed(() => {
    currentStrokeMode = strokeModeDropdown.value();
    updateStrokeSettings();
  });

  // Curve type dropdown
  let curveTypeDropdown = createLabeledDropdown(
    "Show Curves",
    ["all", "line", "bezier", "curve", "vertex"],
    showCurveType,
    yStart + ySpacing * 0.5,
  );
  curveTypeDropdown.changed(() => {
    showCurveType = curveTypeDropdown.value();
    redraw();
  });

  // Stroke weight slider
  let strokeWeightControl = createLabeledSlider(
    "Stroke Weight (mm)",
    0.5,
    10,
    currentSettings.strokeWeight,
    0.1,
    yStart + ySpacing,
  );
  strokeWeightControl.slider.input(() => {
    currentSettings.strokeWeight = strokeWeightControl.slider.value();
    strokeWeightControl.valueDisplay.html(currentSettings.strokeWeight.toFixed(1));
    updateStrokeSettings();
  });

  // Stitch length slider
  let stitchLengthControl = createLabeledSlider(
    "Stitch Length (mm)",
    0.5,
    10,
    currentSettings.stitchLength,
    0.1,
    yStart + ySpacing * 2,
  );
  stitchLengthControl.slider.input(() => {
    currentSettings.stitchLength = stitchLengthControl.slider.value();
    stitchLengthControl.valueDisplay.html(currentSettings.stitchLength.toFixed(1));
    updateStrokeSettings();
  });

  // Stitch width slider
  let stitchWidthControl = createLabeledSlider(
    "Stitch Width (mm)",
    0.1,
    2,
    currentSettings.stitchWidth,
    0.1,
    yStart + ySpacing * 3,
  );
  stitchWidthControl.slider.input(() => {
    currentSettings.stitchWidth = stitchWidthControl.slider.value();
    stitchWidthControl.valueDisplay.html(currentSettings.stitchWidth.toFixed(1));
    updateStrokeSettings();
  });

  // Curve detail slider
  let curveDetailControl = createLabeledSlider(
    "Curve Detail",
    5,
    50,
    currentSettings.curveDetail,
    1,
    yStart + ySpacing * 4,
  );
  curveDetailControl.slider.input(() => {
    currentSettings.curveDetail = curveDetailControl.slider.value();
    curveDetailControl.valueDisplay.html(currentSettings.curveDetail);
    updateCurveSettings();
  });

  // Bezier detail slider
  let bezierDetailControl = createLabeledSlider(
    "Bezier Detail",
    5,
    50,
    currentSettings.bezierDetail,
    1,
    yStart + ySpacing * 5,
  );
  bezierDetailControl.slider.input(() => {
    currentSettings.bezierDetail = bezierDetailControl.slider.value();
    bezierDetailControl.valueDisplay.html(currentSettings.bezierDetail);
    updateCurveSettings();
  });

  // Random variation slider
  let resampleNoiseControl = createLabeledSlider(
    "Random Variation",
    0,
    1,
    currentSettings.resampleNoise,
    0.05,
    yStart + ySpacing * 6,
  );
  resampleNoiseControl.slider.input(() => {
    currentSettings.resampleNoise = resampleNoiseControl.slider.value();
    resampleNoiseControl.valueDisplay.html(currentSettings.resampleNoise.toFixed(2));
    updateStrokeSettings();
  });

  // Create export buttons container at the bottom
  let exportContainer = createDiv();
  exportContainer.position(width + 10, yStart + ySpacing * 7);
  exportContainer.style("width", "300px");
  exportContainer.style("margin-top", "20px");

  let exportDstButton = createButton("Export DST");
  exportDstButton.parent(exportContainer);
  exportDstButton.mousePressed(() => {
    exportEmbroidery("curve_test.dst");
  });

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.parent(exportContainer);
  exportGcodeButton.mousePressed(() => {
    exportGcode("curve_test.gcode");
  });
  exportGcodeButton.style("margin-left", "10px");

  noLoop(); // Stop the draw loop, only redraw when settings change
}

function updateStrokeSettings() {
  setStrokeMode(currentStrokeMode);
  setStrokeSettings({
    stitchLength: currentSettings.stitchLength,
    stitchWidth: currentSettings.stitchWidth,
    minStitchLength: currentSettings.minStitchLength,
    resampleNoise: currentSettings.resampleNoise,
    strokeWeight: currentSettings.strokeWeight,
    strokeMode: currentStrokeMode,
  });
  redraw();
}

function updateCurveSettings() {
  // Update p5.js curve detail settings if they exist
  if (typeof curveDetail === "function") {
    curveDetail(currentSettings.curveDetail);
  }
  if (typeof bezierDetail === "function") {
    bezierDetail(currentSettings.bezierDetail);
  }
  redraw();
}

function draw() {
  background("#FFF5DC");

  setDrawMode(drawMode);
  beginRecord(this);

  updateStrokeSettings();
  updateCurveSettings();

  strokeWeight(currentSettings.strokeWeight);

  // Test line function with stroke
  if (showCurveType === "all" || showCurveType === "line") {
    stroke(255, 0, 0); // red
    line(10, 15, 50, 15);
  }

  // Test bezier curve
  if (showCurveType === "all" || showCurveType === "bezier") {
    stroke(0, 255, 0); // green
    bezier(10, 30, 25, 25, 35, 40, 50, 30);
  }

  // Test curve (Catmull-Rom)
  if (showCurveType === "all" || showCurveType === "curve") {
    stroke(0, 0, 255); // blue
    curve(5, 50, 15, 45, 35, 55, 55, 45);
  }

  // Test vertex-based curves
  if (showCurveType === "all" || showCurveType === "vertex") {
    // Bezier vertex test
    stroke(255, 0, 255); // magenta
    beginShape();
    vertex(10, 65);
    bezierVertex(20, 60, 30, 75, 40, 65);
    bezierVertex(45, 60, 50, 70, 55, 65);
    endShape();

    // Quadratic vertex test
    stroke(255, 165, 0); // orange
    beginShape();
    vertex(10, 85);
    quadraticVertex(25, 80, 40, 85);
    quadraticVertex(50, 90, 60, 85);
    endShape();

    // Curve vertex test
    stroke(0, 255, 255); // cyan
    beginShape();
    curveVertex(15, 105);
    curveVertex(20, 100);
    curveVertex(30, 110);
    curveVertex(40, 105);
    curveVertex(50, 108);
    curveVertex(55, 102);
    endShape();
  }

  trimThread();
  endRecord();
}
