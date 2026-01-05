let drawMode = "stitch";

function setup() {
  createCanvas(mmToPixel(100), mmToPixel(100));
  let drawModeStitchButton = createButton("Draw Mode: Stitch");
  drawModeStitchButton.mousePressed(() => {
    drawMode = "stitch";
    redraw();
  });

  let drawModeLineButton = createButton("Draw Mode: Realistic");
  drawModeLineButton.mousePressed(() => {
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
    exportEmbroidery("simple.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("simple.gcode");
  });
  exportGcodeButton.position(90, height + 30);

  noLoop(); // Stop the draw loop after exporting
}

function draw() {
  background("#FFF5DC");
  //translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);

  noFill();
  beginRecord(this);
  //stroke(0, 200, 0);
  //createCanvas(400, 400);

  // Draw embroidery patterns with concave shape
  stroke(0, 0, 0);
  fill(0, 0, 255);
  strokeWeight(1);
  beginShape();
  vertex(30, 30);
  vertex(70, 30);
  vertex(70, 50);
  vertex(50, 50);
  vertex(50, 70);
  vertex(30, 70);
  endShape(CLOSE);

  embroideryOutline(5); // Add outline around the embroidery with 5mm offset

  // Stop recording and export as DST
  endRecord();
}

function keyPressed() {
  switch (key) {
    case "d":
      exportEmbroidery("simple.dst");
      break;
    case "g":
      exportGcode("simple.gcode");
      break;
  }
}
