_DEBUG = true;

let drawMode = "realistic";
let angleSlider, spacingSlider;

function setup() {
    createCanvas(mmToPixel(200), mmToPixel(200));
    
    // UI Controls
    createP('Draw Mode:');
    let drawModeStitchButton = createButton("Stitch View");
    drawModeStitchButton.mousePressed(() => {
      drawMode = "stitch";
      redraw();
    });
  
    let drawModeRealisticButton = createButton("Realistic View");
    drawModeRealisticButton.mousePressed(() => {
      drawMode = "realistic";
      redraw();
    });
  
    let drawModeP5Button = createButton("p5 View");
    drawModeP5Button.mousePressed(() => {
      drawMode = "p5";
      redraw();
    });
  
    createP('Export Options:');
    let exportDstButton = createButton("Export DST");
    exportDstButton.mousePressed(() => {
      exportEmbroidery("concave_fill_test.dst");
    });
  
    let exportGcodeButton = createButton("Export G-code");
    exportGcodeButton.mousePressed(() => {
      exportGcode("concave_fill_test.gcode");
    });
    
    createP('Fill Settings:');
    
    createP('Angle:');
    angleSlider = createSlider(0, 360, 0, 1);
    angleSlider.input(() => {
      redraw();
    });
    
    createP('Spacing (mm):');
    spacingSlider = createSlider(1, 5, 2.2, 0.1);
    spacingSlider.input(() => {
      redraw();
    });

    noLoop(); // Static drawing, redraw on user interaction
}

function draw() {
  background(225);
  
  // Define the complex concave star shape
  let ctrX = 100;
  let ctrY = 100;
  let baseHeight = 40;
  let baseWidth = 80;
  let topHeight = 20;
  
  const pathPoints = [
    {x: ctrX-baseWidth/2, y: ctrY+baseHeight},
    {x: ctrX+baseWidth/2, y: ctrY+baseHeight},
    {x: ctrX+baseWidth*2/3, y: ctrY-topHeight},
    {x: ctrX+baseWidth*1/4, y: ctrY+topHeight},
    {x: ctrX, y: ctrY-topHeight*2},
    {x: ctrX-baseWidth*1/4, y: ctrY+topHeight},
    {x: ctrX-baseWidth*2/3, y: ctrY-topHeight},
    {x: ctrX-baseWidth/2, y: ctrY+baseHeight}
  ];

  // Get current slider values with fallbacks
  const currentAngle = angleSlider ? angleSlider.value() * PI / 180 : 0;
  const currentSpacing = spacingSlider ? spacingSlider.value() : 2.2;
  
  // Define fill settings using slider values
  const fillSettings = {
    angle: currentAngle,
    spacing: currentSpacing,
    stitchLength: 2,
    minStitchLength: 0.5
  };
  
  // Configure the embroidery system
  setDrawMode(drawMode);
  
  // Start recording embroidery
  beginRecord(this);
  
  // Set up fill with red thread
  fill(255, 155, 0);
  setFillMode("tatami");
  setFillSettings(fillSettings);
  
  // Set up outline with blue thread
  stroke(0, 0, 255);
  strokeWeight(1);
  
  // Create the shape - this will automatically generate both fill and stroke
  beginShape();
  for (const pt of pathPoints) {
    vertex(pt.x, pt.y);
  }
  endShape(CLOSE);
  
  // End recording
  endRecord();
  
  // Add informational text
  fill(0);
  noStroke();
  textAlign(LEFT);
  textSize(12);
  text(`Mode: ${drawMode}`, 10, height - 60);
  text(`Angle: ${Math.round(currentAngle * 180 / PI)}°`, 10, height - 45);
  text(`Spacing: ${currentSpacing}mm`, 10, height - 30);
  text(`Algorithm: Two-pass concave optimization`, 10, height - 15);
}

// Redraw when mouse is pressed to show interactivity
function mousePressed() {
  redraw();
}