let drawMode = "stitch";

function setup() {
  createCanvas(mmToPixel(100), mmToPixel(100));
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
    exportEmbroidery("boxtest.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("boxtest.gcode");
  });
  exportGcodeButton.position(90, height + 30);

  //noLoop(); // Stop the draw loop after exporting
}

function draw() {
  background("#FFF5DC");
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);
  noFill();
  beginRecord(this);
  // Draw a 100mm square
  //setStitch(0.1, 0.2, 0);
  setStrokeSettings({
    strokeLength: 0.2,
    noise: 0.0,
  });
  stroke(0, 0, 200);
  strokeWeight(5);

  line(80, 0, 80, 80); // right
  trimThread();

  line(0, 80, 0, 0); // left
  trimThread();

  line(-2.8, 0, 80 + 2.8, 0); // top
  trimThread();

  line(80 + 2.8, 80, -2.8, 80); // bottom
  trimThread();

  // Draw a 200px circle
  strokeWeight(5);

  ellipse(40, 40, 60, 60);

  trimThread();

  // Stop recording and export as DST
  endRecord();
}

function keyPressed() {
  switch (key) {
    case "d":
      exportEmbroidery("boxtest.dst");
      break;
    case "g":
      exportGcode("boxtest.gcode");
      break;
  }
}
