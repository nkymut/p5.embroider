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
  beginRecord(this);

  // Draw a 200px circle
  strokeWeight(1);
  setFillMode("tatami");
  setFillSettings({
    angle: 0,        // 45 degree angle
    spacing: 0.5,       // 3mm between rows
    tieDistance: 15,  // Tie-down every 15mm
    alternateAngle: true
  });
  fill(0, 0, 200);
  stroke(0, 0, 0);
  rect(0, 0, 80, 80);

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
