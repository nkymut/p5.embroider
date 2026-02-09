// Vertex Mode Example - Direct vertex-to-stitch mapping
// Each vertex becomes exactly one stitch point without interpolation

let drawMode = "stitch";

function setup() {
  createCanvas(mmToPixel(100), mmToPixel(100));

  // Create UI buttons
  let drawModeStitchButton = createButton("Draw Mode: Stitch");
  drawModeStitchButton.mousePressed(() => {
    drawMode = "stitch";
  });

  let drawModeRealisticButton = createButton("Draw Mode: Realistic");
  drawModeRealisticButton.mousePressed(() => {
    drawMode = "realistic";
  });

  let drawModeP5Button = createButton("Draw Mode: p5");
  drawModeP5Button.mousePressed(() => {
    drawMode = "p5";
  });

  let exportDstButton = createButton("Export DST");
  exportDstButton.mousePressed(() => {
    exportEmbroidery("vertexmode.dst");
  });
  exportDstButton.position(0, height + 40);

  let exportPesButton = createButton("Export PES");
  exportPesButton.mousePressed(() => {
    exportEmbroidery("vertexmode.pes");
  });
  exportPesButton.position(90, height + 40);

  let exportSvgButton = createButton("Export SVG");
  exportSvgButton.mousePressed(() => {
    exportSVG("vertexmode.svg");
  });
  exportSvgButton.position(180, height + 40);
}

function draw() {
  background(20);
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);
  noFill();
  beginRecord(this);

  // Example 1: Custom star pattern with vertex mode
  // Each vertex becomes exactly one stitch - no interpolation
  stroke(255, 100, 100);
  setStrokeMode("vertex");
  strokeWeight(1);
  
  beginShape();
  // Outer points of star
  vertex(10, 5);
  vertex(13, 15);
  vertex(23, 15);
  vertex(15, 22);
  vertex(18, 32);
  vertex(10, 25);
  vertex(2, 32);
  vertex(5, 22);
  vertex(-3, 15);
  vertex(7, 15);
  vertex(10, 5); // Close the shape
  endShape();
  trimThread();

  // Example 2: Algorithmic pattern - spiral
  stroke(100, 255, 100);
  beginShape();
  let numPoints = 20;
  let centerX = 50;
  let centerY = 20;
  for (let i = 0; i <= numPoints; i++) {
    let angle = (i / numPoints) * Math.PI * 4; // 2 full rotations
    let radius = (i / numPoints) * 15;
    let x = centerX + Math.cos(angle) * radius;
    let y = centerY + Math.sin(angle) * radius;
    vertex(x, y);
  }
  endShape();
  trimThread();

  // Example 3: Custom wave pattern
  stroke(100, 100, 255);
  beginShape();
  for (let i = 0; i <= 20; i++) {
    let x = 10 + i * 3;
    let y = 50 + Math.sin(i * 0.5) * 8;
    vertex(x, y);
  }
  endShape();
  trimThread();

  // Example 4: Comparison with straight mode (interpolated)
  // Switch to straight mode to show the difference
  stroke(255, 200, 100);
  setStrokeMode("straight");
  setStitch(0.5, 2, 0); // Will interpolate stitches
  
  beginShape();
  vertex(10, 70);
  vertex(30, 70);
  vertex(30, 80);
  vertex(10, 80);
  vertex(10, 70);
  endShape();
  trimThread();

  // Example 5: Back to vertex mode - same shape, no interpolation
  stroke(255, 100, 255);
  setStrokeMode("vertex");
  
  beginShape();
  vertex(40, 70);
  vertex(60, 70);
  vertex(60, 80);
  vertex(40, 80);
  vertex(40, 70);
  endShape();
  trimThread();

  // Add text labels (won't be embroidered)
  endRecord();
  
  // Draw labels for comparison
  push();
  fill(255);
  noStroke();
  textSize(mmToPixel(2));
  text("VERTEX MODE", mmToPixel(10), mmToPixel(-2));
  text("Star (custom)", mmToPixel(5), mmToPixel(35));
  text("Spiral (algorithmic)", mmToPixel(40), mmToPixel(18));
  text("Wave (sine)", mmToPixel(10), mmToPixel(62));
  text("Straight (interpolated)", mmToPixel(5), mmToPixel(87));
  text("Vertex (direct)", mmToPixel(40), mmToPixel(87));
  pop();
}

function keyPressed() {
  switch (key) {
    case "d":
      exportEmbroidery("vertexmode.dst");
      break;
    case "s":
      exportSVG("vertexmode.svg");
      break;
    case "g":
      exportGcode("vertexmode.gcode");
      break;
  }
}
