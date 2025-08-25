let drawMode = "stitch";
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

  // Create sliders for fill settings
  let yStart = 80;
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
  setFillMode("tatami");
  updateFillSettings();

  setStrokeSettings({
    stitchLength: 0.3,
    stitchWidth: 5,
    resampleNoise: 0.1,
  });

  setStrokeMode("zigzag");
  strokeWeight(2);
  stroke(0, 0, 0);
  fill(0, 0, 200);

  rectMode(CENTER);
  rect(50, 50, 40, 40, 5);

  trimThread();
  endRecord();
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
