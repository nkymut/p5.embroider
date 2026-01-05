let drawMode = "stitch";
let fillMode = "tatami"; // Current fill mode
let shapeType = "rect"; // Current shape to draw
let currentSettings = {
  angle: 0,
  stitchLength: 3,
  stitchWidth: 0.2,
  rowSpacing: 0.8,
  minStitchLength: 0.5,
  resampleNoise: 0.2,
};

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

function setup() {
  createCanvas(mmToPixel(100), mmToPixel(100));

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

  let drawModeLineButton = createButton("Draw Mode: Realistic");
  drawModeLineButton.parent(buttonContainer);
  drawModeLineButton.mousePressed(() => {
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
  }

  // Create fill mode dropdown
  let fillModeContainer = createDiv();
  fillModeContainer.position(width + 10, 80);
  fillModeContainer.style("width", "300px");
  fillModeContainer.style("margin-bottom", "15px");

  let fillModeLabel = createSpan("Fill Mode: ");
  fillModeLabel.parent(fillModeContainer);
  fillModeLabel.style("display", "inline-block");
  fillModeLabel.style("width", "100px");

  let fillModeDropdown = createSelect();
  fillModeDropdown.parent(fillModeContainer);
  fillModeDropdown.option("tatami");
  fillModeDropdown.option("satin");
  fillModeDropdown.option("spiral");
  fillModeDropdown.selected("tatami");
  fillModeDropdown.changed(() => {
    fillMode = fillModeDropdown.value();
    redraw();
  });
  fillModeDropdown.style("width", "150px");
  fillModeDropdown.style("padding", "5px");

  // Create shape type dropdown
  let shapeTypeContainer = createDiv();
  shapeTypeContainer.position(width + 10, 125);
  shapeTypeContainer.style("width", "300px");
  shapeTypeContainer.style("margin-bottom", "20px");

  let shapeTypeLabel = createSpan("Shape Type: ");
  shapeTypeLabel.parent(shapeTypeContainer);
  shapeTypeLabel.style("display", "inline-block");
  shapeTypeLabel.style("width", "100px");

  let shapeTypeDropdown = createSelect();
  shapeTypeDropdown.parent(shapeTypeContainer);
  shapeTypeDropdown.option("rect", "rect");
  shapeTypeDropdown.option("rect-rounded", "rect-rounded");
  shapeTypeDropdown.option("square", "square");
  shapeTypeDropdown.option("circle", "circle");
  shapeTypeDropdown.option("ellipse", "ellipse");
  shapeTypeDropdown.option("triangle", "triangle");
  shapeTypeDropdown.option("quad", "quad");
  shapeTypeDropdown.option("arc-pie", "arc-pie");
  shapeTypeDropdown.option("arc-chord", "arc-chord");
  shapeTypeDropdown.option("vertices", "vertices");
  shapeTypeDropdown.selected("rect");
  shapeTypeDropdown.changed(() => {
    shapeType = shapeTypeDropdown.value();
    redraw();
  });
  shapeTypeDropdown.style("width", "150px");
  shapeTypeDropdown.style("padding", "5px");

  // Create sliders for fill settings
  let yStart = 200;
  let ySpacing = 45;

  let angleControl = createLabeledSlider("Fill Angle (degrees)", 0, 360, currentSettings.angle, 1, yStart);
  angleControl.slider.input(() => {
    currentSettings.angle = angleControl.slider.value();
    angleControl.valueDisplay.html(currentSettings.angle);
    updateFillSettings();
  });

  let rowSpacingControl = createLabeledSlider(
    "Row Spacing (mm)",
    0.2,
    5,
    currentSettings.rowSpacing,
    0.1,
    yStart + ySpacing,
  );
  rowSpacingControl.slider.input(() => {
    currentSettings.rowSpacing = rowSpacingControl.slider.value();
    rowSpacingControl.valueDisplay.html(currentSettings.rowSpacing.toFixed(1));
    updateFillSettings();
  });

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
    updateFillSettings();
  });

  let stitchWidthControl = createLabeledSlider(
    "Thread Width (mm)",
    0.1,
    2,
    currentSettings.stitchWidth,
    0.1,
    yStart + ySpacing * 3,
  );
  stitchWidthControl.slider.input(() => {
    currentSettings.stitchWidth = stitchWidthControl.slider.value();
    stitchWidthControl.valueDisplay.html(currentSettings.stitchWidth.toFixed(1));
    updateFillSettings();
  });

  let minStitchLengthControl = createLabeledSlider(
    "Min Stitch Length (mm)",
    0.1,
    2,
    currentSettings.minStitchLength,
    0.1,
    yStart + ySpacing * 4,
  );
  minStitchLengthControl.slider.input(() => {
    currentSettings.minStitchLength = minStitchLengthControl.slider.value();
    minStitchLengthControl.valueDisplay.html(currentSettings.minStitchLength.toFixed(1));
    updateFillSettings();
  });

  let resampleNoiseControl = createLabeledSlider(
    "Random Variation",
    0,
    1,
    currentSettings.resampleNoise,
    0.05,
    yStart + ySpacing * 5,
  );
  resampleNoiseControl.slider.input(() => {
    currentSettings.resampleNoise = resampleNoiseControl.slider.value();
    resampleNoiseControl.valueDisplay.html(currentSettings.resampleNoise.toFixed(2));
    updateFillSettings();
  });

  // Create export buttons container at the bottom
  let exportContainer = createDiv();
  exportContainer.position(width + 10, yStart + ySpacing * 6);
  exportContainer.style("width", "300px");
  exportContainer.style("margin-top", "20px");

  let exportDstButton = createButton("Export DST");
  exportDstButton.parent(exportContainer);
  exportDstButton.mousePressed(() => {
    exportEmbroidery("filltest.dst");
  });

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.parent(exportContainer);
  exportGcodeButton.mousePressed(() => {
    exportGcode("filltest.gcode");
  });
  exportGcodeButton.style("margin-left", "10px");

  noLoop(); // Stop the draw loop after exporting
}

function updateFillSettings() {
  setFillSettings({
    angle: currentSettings.angle,
    stitchLength: currentSettings.stitchLength,
    stitchWidth: currentSettings.stitchWidth,
    spacing: currentSettings.rowSpacing,
    minStitchLength: currentSettings.minStitchLength,
    resampleNoise: currentSettings.resampleNoise,
    alternateAngle: true,
  });
  redraw();
}

function draw() {
  background("#FFF5DC");

  setDrawMode(drawMode);
  beginRecord(this);

  strokeWeight(1);
  setFillMode(fillMode);
  updateFillSettings();

  setStrokeSettings({
    stitchLength: 0.3,
    stitchWidth: 5,
    resampleNoise: 0.1,
  });

  setStrokeMode("zigzag");
  strokeWeight(2);
  fill(0, 0, 200);
  stroke(100, 100, 100);

  // Draw the selected shape
  drawSelectedShape();

  //trimThread();
  endRecord();
}

function drawSelectedShape() {
  console.log("shapeType: ", shapeType);
  switch (shapeType) {
    case "rect":
      rectMode(CENTER);
      rect(50, 50, 40, 40);
      break;

    case "rect-rounded":
      rectMode(CENTER);
      rect(50, 50, 40, 40, 5);
      break;

    case "square":
      rectMode(CENTER);
      square(50, 50, 35);
      break;

    case "circle":
      circle(50, 50, 40);
      break;

    case "ellipse":
      ellipse(50, 50, 50, 30);
      break;

    case "triangle":
      triangle(50, 25, 30, 65, 70, 65);
      break;

    case "quad":
      quad(30, 30, 70, 35, 65, 70, 25, 65);
      break;

    case "arc-pie":
      arc(50, 50, 40, 40, 0, PI + QUARTER_PI, PIE);
      break;

    case "arc-chord":
      arc(50, 50, 40, 40, 0, PI + QUARTER_PI, CHORD);
      break;

    case "vertices":
      beginShape();
      vertex(30, 30);
      bezierVertex(70, 20, 70, 60, 50, 70);
      vertex(30, 60);
      vertex(30, 30);
      endShape(CLOSE);
      break;
  }
}

function keyPressed() {
  switch (key) {
    case "d":
      exportEmbroidery("filltest.dst");
      break;
    case "g":
      exportGcode("filltest.gcode");
      break;
  }
}
