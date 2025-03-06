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
    exportEmbroidery("filltest.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("filltest.gcode");
  });
  exportGcodeButton.position(90, height + 30);

  noLoop(); // Stop the draw loop after exporting
}

function draw() {
  background("#FFF5DC");
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);
  beginRecord(this);

  // Draw a 200px circle
  strokeWeight(1);
  setFillMode("tatami");
  setFillSettings({
    stitchLength: 4,
    stitchWidth: 0.5,
    minStitchLength: 0.5,
    resampleNoise: 0.2,
    angle: 0, // 45 degree angle
    tieDistance: 15, // Tie-down every 15mm
    alternateAngle: true,
  });
  fill(0, 0, 200);
  setStitch(0.1, 0.2, 0);
  strokeWeight(3);
  stroke(0, 0, 0);
  rect(0, 0, 40, 40);

  trimThread();

  // Stop recording and export as DST
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
