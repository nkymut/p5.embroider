// Vertex Contour Example for p5.embroider
// This example demonstrates how to use different vertex types within contours (holes)

let drawMode = "stitch";
let currentSettings = {
  fillAngle: 45,
  rowSpacing: 1.5,
  stitchLength: 3,
  strokeWeight: 1,
};

let currentStrokeMode = "straight";
let currentFillMode = "tatami";

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

  // Create dropdowns and sliders
  let yStart = 80;
  let ySpacing = 45;

  // Fill mode dropdown
  let fillModeDropdown = createLabeledDropdown("Fill Mode", ["tatami", "satin", "spiral"], currentFillMode, yStart);
  fillModeDropdown.changed(() => {
    currentFillMode = fillModeDropdown.value();
    updateSettings();
  });

  // Stroke mode dropdown
  let strokeModeDropdown = createLabeledDropdown(
    "Stroke Mode",
    ["straight", "zigzag", "parallel", "sashiko"],
    currentStrokeMode,
    yStart + ySpacing * 0.5,
  );
  strokeModeDropdown.changed(() => {
    currentStrokeMode = strokeModeDropdown.value();
    updateSettings();
  });

  // Fill angle slider
  let fillAngleControl = createLabeledSlider("Fill Angle", 0, 90, currentSettings.fillAngle, 1, yStart + ySpacing);
  fillAngleControl.slider.input(() => {
    currentSettings.fillAngle = fillAngleControl.slider.value();
    fillAngleControl.valueDisplay.html(currentSettings.fillAngle);
    updateSettings();
  });

  // Row spacing slider
  let rowSpacingControl = createLabeledSlider(
    "Row Spacing (mm)",
    0.5,
    3,
    currentSettings.rowSpacing,
    0.1,
    yStart + ySpacing * 2,
  );
  rowSpacingControl.slider.input(() => {
    currentSettings.rowSpacing = rowSpacingControl.slider.value();
    rowSpacingControl.valueDisplay.html(currentSettings.rowSpacing.toFixed(1));
    updateSettings();
  });

  // Stitch length slider
  let stitchLengthControl = createLabeledSlider(
    "Stitch Length (mm)",
    1,
    5,
    currentSettings.stitchLength,
    0.1,
    yStart + ySpacing * 3,
  );
  stitchLengthControl.slider.input(() => {
    currentSettings.stitchLength = stitchLengthControl.slider.value();
    stitchLengthControl.valueDisplay.html(currentSettings.stitchLength.toFixed(1));
    updateSettings();
  });

  // Stroke weight slider
  let strokeWeightControl = createLabeledSlider(
    "Stroke Weight (mm)",
    0,
    3,
    currentSettings.strokeWeight,
    0.1,
    yStart + ySpacing * 4,
  );
  strokeWeightControl.slider.input(() => {
    currentSettings.strokeWeight = strokeWeightControl.slider.value();
    strokeWeightControl.valueDisplay.html(currentSettings.strokeWeight.toFixed(1));
    updateSettings();
  });

  // Create export buttons container at the bottom
  let exportContainer = createDiv();
  exportContainer.position(width + 10, yStart + ySpacing * 5);
  exportContainer.style("width", "300px");
  exportContainer.style("margin-top", "20px");

  let exportDstButton = createButton("Export DST");
  exportDstButton.parent(exportContainer);
  exportDstButton.mousePressed(() => {
    exportEmbroidery("vertex_contour.dst");
  });

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.parent(exportContainer);
  exportGcodeButton.mousePressed(() => {
    exportGcode("vertex_contour.gcode");
  });
  exportGcodeButton.style("margin-left", "10px");

  noLoop(); // Stop the draw loop, only redraw when settings change
}

function updateSettings() {
  setFillMode(currentFillMode);
  setStrokeMode(currentStrokeMode);
  setFillSettings({
    angle: currentSettings.fillAngle,
    rowSpacing: currentSettings.rowSpacing,
    stitchLength: currentSettings.stitchLength,
    alternateAngle: true,
  });
  setStrokeSettings({
    strokeWeight: currentSettings.strokeWeight,
    stitchLength: currentSettings.stitchLength,
  });
  redraw();
}

function draw() {
  background("#FFF5DC");

  setDrawMode(drawMode);
  beginRecord(this);

  updateSettings();

  drawContourExamples();

  trimThread();
  endRecord();
}

function drawContourExamples() {
  // Example 1: Simple rectangle with rectangular hole
  fill(255, 100, 100);
  stroke(0);
  strokeWeight(currentSettings.strokeWeight);

  beginShape();
  vertex(10, 10);
  vertex(50, 10);
  vertex(50, 50);
  vertex(10, 50);

  beginContour();
  vertex(20, 20);
  vertex(20, 40);
  vertex(40, 40);
  vertex(40, 20);
  endContour();

  endShape(CLOSE);

  // Example 2: Curved shape with bezier contour hole
  fill(100, 255, 100);
  stroke(0, 0, 255);
  strokeWeight(currentSettings.strokeWeight);

  beginShape();
  vertex(60, 10);
  bezierVertex(75, 5, 90, 15, 100, 10);
  bezierVertex(105, 25, 100, 40, 90, 50);
  bezierVertex(75, 55, 65, 50, 60, 40);
  bezierVertex(55, 25, 55, 15, 60, 10);

  beginContour();
  vertex(70, 20);
  bezierVertex(80, 15, 90, 20, 90, 30);
  bezierVertex(90, 40, 80, 40, 70, 35);
  bezierVertex(65, 30, 65, 25, 70, 20);
  endContour();

  endShape(CLOSE);

  // Example 3: Shape with quadratic contour
  fill(100, 100, 255);
  stroke(255, 0, 0);
  strokeWeight(currentSettings.strokeWeight);

  beginShape();
  vertex(10, 60);
  vertex(50, 60);
  vertex(50, 100);
  vertex(10, 100);

  beginContour();
  vertex(20, 70);
  quadraticVertex(35, 65, 40, 80);
  quadraticVertex(35, 95, 20, 90);
  quadraticVertex(15, 80, 20, 70);
  endContour();

  endShape(CLOSE);

  // Example 4: Complex shape with curveVertex contour
  fill(255, 100, 255);
  stroke(255, 165, 0);
  strokeWeight(currentSettings.strokeWeight);

  beginShape();
  curveVertex(60, 60);
  curveVertex(60, 60);
  curveVertex(75, 55);
  curveVertex(90, 60);
  curveVertex(100, 65);
  curveVertex(105, 80);
  curveVertex(100, 95);
  curveVertex(85, 105);
  curveVertex(70, 100);
  curveVertex(55, 95);
  curveVertex(55, 80);
  curveVertex(60, 60);
  curveVertex(60, 60);

  beginContour();
  curveVertex(70, 75);
  curveVertex(70, 75);
  curveVertex(80, 70);
  curveVertex(90, 75);
  curveVertex(90, 85);
  curveVertex(80, 90);
  curveVertex(70, 85);
  curveVertex(65, 80);
  curveVertex(70, 75);
  curveVertex(70, 75);
  endContour();

  endShape(CLOSE);
}
