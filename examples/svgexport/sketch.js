_DEBUG = true;

// UI Controls
let paperSizeSelect;
let hoopWidthInput, hoopHeightInput;
let marginTopInput, marginRightInput, marginBottomInput, marginLeftInput;
let dpiInput;
let showGuidesCheckbox, showHoopCheckbox, centerPatternCheckbox, stitchDotsCheckbox, lifeSizeCheckbox;
let threadInput;
let filenameInput;
let exportButton;

function setup() {
  // Get the UI container from HTML
  let uiContainer = select("#uiContainer");
  if (!uiContainer) {
    uiContainer = createDiv();
    uiContainer.id("uiContainer");
    select("#sidePane").child(uiContainer);
  }
  
  // Paper Size
  let paperSizeLabel = createP("Paper Size:");
  paperSizeLabel.parent(uiContainer);
  paperSizeSelect = createSelect();
  paperSizeSelect.option("A4");
  paperSizeSelect.option("A3");
  paperSizeSelect.option("A2");
  paperSizeSelect.option("A1");
  paperSizeSelect.selected("A4");
  paperSizeSelect.parent(uiContainer);
  
  // Hoop Size
  let hoopLabel = createP("Hoop Size (mm):");
  hoopLabel.parent(uiContainer);
  let hoopContainer = createDiv();
  hoopContainer.style("display", "grid");
  hoopContainer.style("grid-template-columns", "1fr 1fr");
  hoopContainer.style("gap", "10px");
  hoopContainer.parent(uiContainer);
  hoopWidthInput = createInput("200", "number");
  hoopWidthInput.attribute("placeholder", "Width");
  hoopWidthInput.parent(hoopContainer);
  hoopHeightInput = createInput("200", "number");
  hoopHeightInput.attribute("placeholder", "Height");
  hoopHeightInput.parent(hoopContainer);
  
  // Margins
  let marginsLabel = createP("Margins (mm):");
  marginsLabel.parent(uiContainer);
  let marginsContainer = createDiv();
  marginsContainer.style("display", "grid");
  marginsContainer.style("grid-template-columns", "1fr 1fr");
  marginsContainer.style("gap", "10px");
  marginsContainer.parent(uiContainer);
  
  let topLabel = createSpan("Top:");
  topLabel.parent(marginsContainer);
  marginTopInput = createInput("15", "number");
  marginTopInput.attribute("placeholder", "Top");
  marginTopInput.parent(marginsContainer);
  
  let rightLabel = createSpan("Right:");
  rightLabel.parent(marginsContainer);
  marginRightInput = createInput("15", "number");
  marginRightInput.attribute("placeholder", "Right");
  marginRightInput.parent(marginsContainer);
  
  let bottomLabel = createSpan("Bottom:");
  bottomLabel.parent(marginsContainer);
  marginBottomInput = createInput("15", "number");
  marginBottomInput.attribute("placeholder", "Bottom");
  marginBottomInput.parent(marginsContainer);
  
  let leftLabel = createSpan("Left:");
  leftLabel.parent(marginsContainer);
  marginLeftInput = createInput("15", "number");
  marginLeftInput.attribute("placeholder", "Left");
  marginLeftInput.parent(marginsContainer);
  
  // DPI
  let dpiLabel = createP("DPI:");
  dpiLabel.parent(uiContainer);
  dpiInput = createInput("300", "number");
  dpiInput.parent(uiContainer);
  
  // Checkboxes
  showGuidesCheckbox = createCheckbox("Show Guides", true);
  showGuidesCheckbox.parent(uiContainer);
  showHoopCheckbox = createCheckbox("Show Hoop", false);
  showHoopCheckbox.parent(uiContainer);
  centerPatternCheckbox = createCheckbox("Center Pattern", false);
  centerPatternCheckbox.parent(uiContainer);
  stitchDotsCheckbox = createCheckbox("Show Stitch Dots", true);
  stitchDotsCheckbox.parent(uiContainer);
  lifeSizeCheckbox = createCheckbox("Life Size", true);
  lifeSizeCheckbox.parent(uiContainer);
  
  // Thread selection (optional)
  let threadLabel = createP("Thread Selection:");
  threadLabel.parent(uiContainer);
  let threadHint = createP("(leave empty for all threads)");
  threadHint.style("font-size", "12px");
  threadHint.style("color", "#999");
  threadHint.style("margin-top", "-5px");
  threadHint.parent(uiContainer);
  threadInput = createInput("");
  threadInput.attribute("placeholder", "e.g., 0,1,2");
  threadInput.parent(uiContainer);
  
  // Filename
  let filenameLabel = createP("Filename:");
  filenameLabel.parent(uiContainer);
  filenameInput = createInput("embroidery-pattern.svg");
  filenameInput.parent(uiContainer);
  
  // Export button
  exportButton = createButton("Export SVG");
  exportButton.mousePressed(exportWithOptions);
  exportButton.parent(uiContainer);
  
  // Create canvas in the canvas container
  let canvasContainer = select("#canvasContainer");
  
  createCanvas(mmToPixel(200), mmToPixel(200)).parent(canvasContainer);

  noLoop();
}

function exportWithOptions() {
  // Collect all options from UI
  let options = {
    paperSize: paperSizeSelect.value(),
    hoopSize: {
      width: parseFloat(hoopWidthInput.value()) || 200,
      height: parseFloat(hoopHeightInput.value()) || 200
    },
    margins: {
      top: parseFloat(marginTopInput.value()) || 15,
      right: parseFloat(marginRightInput.value()) || 15,
      bottom: parseFloat(marginBottomInput.value()) || 15,
      left: parseFloat(marginLeftInput.value()) || 15
    },
    dpi: parseFloat(dpiInput.value()) || 300,
    showGuides: showGuidesCheckbox.checked(),
    showHoop: showHoopCheckbox.checked(),
    centerPattern: centerPatternCheckbox.checked(),
    stitchDots: stitchDotsCheckbox.checked(),
    lifeSize: lifeSizeCheckbox.checked()
  };
  
  // Handle thread selection
  let threadValue = threadInput.value().trim();
  if (threadValue) {
    try {
      options.threads = threadValue.split(",").map(t => parseInt(t.trim())).filter(t => !isNaN(t));
      if (options.threads.length === 0) {
        options.threads = null;
      }
    } catch (e) {
      console.warn("Invalid thread selection, exporting all threads");
      options.threads = null;
    }
  } else {
    options.threads = null;
  }
  
  // Get filename
  let filename = filenameInput.value().trim() || "embroidery-pattern.svg";
  if (!filename.endsWith(".svg")) {
    filename += ".svg";
  }
  
  // Export
  exportSVG(filename, options);
  console.log("✅ Exported SVG with options:", options);
}

function draw() {
  background(255);
  
  // Draw grid for reference
  stroke(0, 0, 0, 20);
  strokeWeight(1);
  let u = mmToPixel(10);
  for (let i = 0; i < height / u; i++) {
    line(0, i * u, width, i * u);
  }
  for (let j = 0; j < width / u; j++) {
    line(j * u + u * 0.5, 0, j * u + u * 0.5, height);
  }

  //setDrawMode("realistic");
  beginRecord(this);
  
  // Draw shapes at specific coordinates to test positioning
  stroke(255, 0, 0);
  setStitch(1.5, 1.5, 0);
  setStrokeMode("straight");
  strokeWeight(1);
  
  // Circle at 30mm, 30mm
  push();
  translate(30,30);
  circle(0, 0, 50);
  pop();
  
  // Square at 60mm, 5mm
  stroke(0, 0, 255);
  push();
  translate(60, 5);
  rect(0,0, 50, 50);
  pop();
  
  // Triangle at 120mm, 5mm
  stroke(0, 255, 0);
  push();
  translate(120+25, 5+25);
  triangle(-25, 25, 25, 25, 0, -25);
  pop();
  
  // Path at 30mm, 100mm

  stroke(0, 0, 255);
  push();
  translate(5, 100);
  beginShape();
  vertex(0, 0);
  vertex(25, 25);
  vertex(50, 0);
  vertex(25, -25);
  vertex(0, 0);
  endShape();
  pop();



  endRecord();
  
  // // Draw coordinate labels
  // fill(0);
  // noStroke();
  // textAlign(CENTER);
  // text("100,25", mmToPixel(100), mmToPixel(25-10));
  // text("50,75", mmToPixel(50), mmToPixel(75-15));
  // text("150,125", mmToPixel(150), mmToPixel(125-15));
}

function mousePressed() {
  redraw();
}
