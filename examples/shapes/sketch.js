let drawMode = "stitch";

function setup() {
  createCanvas(mmToPixel(180), mmToPixel(140));
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
    exportEmbroidery("simple.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("simple.gcode");
  });
  exportGcodeButton.position(90, height + 30);

  //noLoop(); // Stop the draw loop after exporting
}

function draw() {
  background("#FFF5DC");

  strokeCap(SQUARE);
  setDrawMode(drawMode);
  // noFill();
  beginRecord(this);
  fill(0, 200, 0);
  setFillSettings({
    noise: 0.4,
  });

  setStitch(0.5, 0.2, 0);
  setStrokeSettings({
    strokeLength: 0.4,
    stitchWidth: 1.8,
    noise: 0.2,
  });

  stroke(0, 0, 200);
  strokeWeight(5);
  setStrokeMode("zigzag");

  strokeJoin(BEVEL);
  strokeWeight(3);

  ellipse(40, 40, 40, 40);
  trimThread();
  circle(40, 40, 20);
  trimThread();
  rectMode(CENTER);
  rect(90, 40, 40, 40, 2);
  trimThread();
  square(140, 40, 40);
  trimThread();

  triangle(40, 80, 60, 110, 20, 110);
  trimThread();
  arc(90, 80, 40, 60, 0, PI);
  trimThread();
  quad(140, 80, 155, 95, 140, 110, 125, 95);
  trimThread();

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
