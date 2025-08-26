let drawMode = "stitch";

function setup() {
  createCanvas(mmToPixel(120), mmToPixel(150));
  
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

  let exportDstButton = createButton("Export DST");
  exportDstButton.mousePressed(() => {
    exportEmbroidery("strokemode.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("strokemode.gcode");
  });
  exportGcodeButton.position(90, height + 30);

  // Create sliders for interactive control
  createSliderLabel("Stitch Length:", 0, height + 60);
  stitchLengthSlider = createSlider(0.5, 5, 2.5, 0.1);
  stitchLengthSlider.position(0, height + 80);
  stitchLengthSlider.style('width', '120px');
  
  createSliderLabel("Stroke Weight:", 0, height + 110);
  strokeWeightSlider = createSlider(1, 10, 4, 0.5);
  strokeWeightSlider.position(0, height + 130);
  strokeWeightSlider.style('width', '120px');
}

// Helper function to create slider labels
function createSliderLabel(text, x, y) {
  let label = createDiv(text);
  label.position(x, y);
  label.style('color', 'white');
  label.style('font-size', '12px');
  label.style('font-family', 'Arial, sans-serif');
}

// Base settings for all patterns
let baseSettings = {
  minStitchLength: 0.1,
  stitchLength: 2.5,
  strokeWeight: 4,
};

function draw() {
  background("navy");
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);
  noFill();
  beginRecord(this);
  strokeCap(SQUARE);

  // Reset to no fill for lines
  noFill();
  stroke(255);

  // ZIGZAG PATTERN - 3 rows showing different entry/exit positions
  // Zigzag - Left entry/exit
  setStitch(baseSettings.minStitchLength, stitchLengthSlider.value(), 0);
  setStrokeEntryExit("left", "left");
  strokeWeight(strokeWeightSlider.value());
  stroke(255, 200, 200);
  setStrokeMode("zigzag");
  line(0, 10, 90, 10);
  trimThread();
  
  // Zigzag - Middle entry/exit
  setStrokeEntryExit("middle", "middle");
  stroke(200, 255, 200);
  line(0, 20, 90, 20);
  trimThread();
  
  // Zigzag - Right entry/exit
  setStrokeEntryExit("right", "right");
  stroke(200, 200, 255);
  line(0, 30, 90, 30);
  trimThread();

  // RAMP PATTERN - 3 rows showing different entry/exit positions
  // Ramp - Left entry/exit
  setStitch(baseSettings.minStitchLength, stitchLengthSlider.value(), 0);
  setStrokeEntryExit("left", "left");
  strokeWeight(strokeWeightSlider.value());
  stroke(255, 200, 200);
  setStrokeMode("ramp");
  line(0, 45, 90, 45);
  trimThread();
  
  // Ramp - Middle entry/exit
  setStrokeEntryExit("middle", "middle");
  stroke(200, 255, 200);
  line(0, 55, 90, 55);
  trimThread();
  
  // Ramp - Right entry/exit
  setStrokeEntryExit("right", "right");
  stroke(200, 200, 255);
  line(0, 65, 90, 65);
  trimThread();

  // SQUARE PATTERN - 3 rows showing different entry/exit positions
  // Square - Left entry/exit
  setStitch(baseSettings.minStitchLength, stitchLengthSlider.value(), 0);
  setStrokeEntryExit("left", "left");
  strokeWeight(strokeWeightSlider.value());
  stroke(255, 200, 200);
  setStrokeMode("square");
  line(0, 80, 90, 80);
  trimThread();
  
  // Square - Middle entry/exit
  setStrokeEntryExit("middle", "middle");
  stroke(200, 255, 200);
  line(0, 90, 90, 90);
  trimThread();
  
  // Square - Right entry/exit
  setStrokeEntryExit("right", "right");
  stroke(200, 200, 255);
  line(0, 100, 90, 100);
  trimThread();

  // Stop recording
  endRecord();
}

function keyPressed() {
  switch (key) {
    case "d":
      exportEmbroidery("strokemode.dst");
      break;
    case "g":
      exportGcode("strokemode.gcode");
      break;
  }
}
