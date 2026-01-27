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

  let exportPesButton = createButton("Export PES");
  exportPesButton.mousePressed(() => {
    exportEmbroidery("simple.pes");
  });
  exportPesButton.position(0, height + 30);

  let exportDstButton = createButton("Export DST");
  exportDstButton.mousePressed(() => {
    exportEmbroidery("simple.dst");
  });
  exportDstButton.position(90, height + 30);

  //noLoop(); // Stop the draw loop after exporting
}

function draw() {
  background("#FFF5DC");
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);
  strokeCap(SQUARE);

  beginRecord(this);
  // Draw a 100mm square
  setStitch(1, 2, 0);
  setStrokeSettings({
    stitchLength: 3,
    stitchWidth: 1,
    noise: 0.0,
    stitchInterpolate: true,
  });
  stroke(0, 0, 200);
  strokeWeight(5);
  setStrokeMode("parallel");
  noFill();
  rect(0, 0, 80, 80, 2);
  trimThread();

  // Draw a 200px circle
  strokeWeight(5);

  setFillMode("tatami");
  setStrokeMode("parallel");
  fill(220, 220, 0);
  ellipse(40, 40, 60, 60);

  trimThread();

  // Stop recording and export
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
