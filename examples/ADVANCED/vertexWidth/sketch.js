/**
 * Variable Width Path Example
 *
 * This example demonstrates three ways to create variable-width embroidery paths:
 * 1. Using vertex(x, y, width) - z-coordinate as width
 * 2. Using vertexWidth(width) before vertex(x, y)
 * 3. Using vertexWidth(x, y, width) - combined function
 */

let drawMode = "realistic";

function setup() {
  createCanvas(mmToPixel(120), mmToPixel(150));

  // UI Buttons
  let drawModeStitchButton = createButton("Draw Mode: Stitch");
  drawModeStitchButton.mousePressed(() => {
    drawMode = "stitch";
    redraw();
  });

  let drawModeRealisticButton = createButton("Draw Mode: Realistic");
  drawModeRealisticButton.mousePressed(() => {
    drawMode = "realistic";
    redraw();
  });

  let drawModeP5Button = createButton("Draw Mode: p5");
  drawModeP5Button.mousePressed(() => {
    drawMode = "p5";
    redraw();
  });

  let exportDstButton = createButton("Export DST");
  exportDstButton.mousePressed(() => {
    exportEmbroidery("variable-width.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("variable-width.gcode");
  });
  exportGcodeButton.position(90, height + 30);

  let exportSVGButton = createButton("Export SVG");
  exportSVGButton.mousePressed(() => {
    exportSVG("variable-width.svg");
  });
  exportSVGButton.position(200, height + 30);

  noLoop();
}

function draw() {
  background("#FFF5DC");
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);
  beginRecord(this);
  //strokeWeight(1);
  setStitch(0.1, 0.2, 0);
  // Example 1: Using vertex(x, y, width) - Tapered stroke
  stroke(255, 0, 100);
  noFill();
  setStrokeMode("zigzag");

  beginShape();
  vertex(10, 10, 1); // Start thin
  vertex(30, 10, 5); // Get thicker
  vertex(50, 10, 8); // Maximum thickness
  vertex(70, 10, 5); // Get thinner
  vertex(90, 10, 1); // End thin
  endShape();
  trimThread();

  // Example 2: Using vertexWidth(w) - Wave pattern
  stroke(0, 150, 255);
  setStrokeMode("zigzag");

  beginShape();
  for (let i = 0; i <= 10; i++) {
    let x = 10 + i * 8;
    let y = 30 + sin(i * 0.8) * 5;
    let width = 2 + sin(i * 0.8) * 4; // Width varies with wave
    vertexWidth(width);
    vertex(x, y);
  }
  endShape();
  trimThread();

  // Example 3: Using vertexWidth(x, y, w) - Calligraphic effect
  stroke(100, 50, 200);
  setStrokeMode("zigzag");

  beginShape();
  vertexWidth(20, 50, 2);
  vertexWidth(30, 55, 6);
  vertexWidth(40, 58, 8);
  vertexWidth(50, 58, 8);
  vertexWidth(60, 55, 6);
  vertexWidth(70, 50, 2);
  vertexWidth(80, 50, 2);
  vertexWidth(90, 55, 6);
  endShape();
  trimThread();

  // Example 4: Bezier curve with variable width
  stroke(255, 150, 0);
  setStrokeMode("zigzag");

  beginShape();
  vertex(10, 70, 2);
  vertexWidth(4);
  bezierVertex(30, 65, 50, 85, 70, 70);
  vertexWidth(2);
  bezierVertex(75, 68, 80, 65, 90, 70);
  endShape();
  trimThread();

  // Example 5: Spiral with increasing width
  stroke(0, 200, 100);
  setStrokeMode("zigzag");

  let centerX = 50;
  let centerY = 115;
  beginShape();
  for (let angle = 0; angle < TWO_PI * 2; angle += 0.2) {
    let radius = angle * 2;
    let x = centerX + cos(angle) * radius;
    let y = centerY + sin(angle) * radius;
    let width = 1 + (angle / (TWO_PI * 2)) * 4; // Width increases with spiral
    vertex(x, y, width);
  }
  endShape();
  trimThread();

  endRecord();

  // Draw labels in p5 mode (not embroidered)
  if (drawMode === "p5" || drawMode === "realistic") {
    push();
    fill(0);
    noStroke();
    textSize(mmToPixel(2));
    text("1. vertex(x,y,w)", mmToPixel(10), mmToPixel(8));
    text("2. vertexWidth(w)", mmToPixel(10), mmToPixel(28));
    text("3. vertexWidth(x,y,w)", mmToPixel(10), mmToPixel(48));
    text("4. Bezier + width", mmToPixel(10), mmToPixel(68));
    text("5. Spiral", mmToPixel(10), mmToPixel(88));
    pop();
  }
}

function keyPressed() {
  switch (key) {
    case "d":
      exportEmbroidery("variable-width.dst");
      break;
    case "g":
      exportGcode("variable-width.gcode");
      break;
    case "s":
      exportSVG("variable-width.svg");
      break;
    case "r":
      redraw();
      break;
  }
}
