let drawMode = "stitch";

function setup() {
  createCanvas(mmToPixel(200), mmToPixel(200));
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
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);
  noFill();
  beginRecord(this);
  // Draw a 100mm square
  setStitch(0.1, 0.2, 0);
  setStrokeSettings({
    strokeLength: 0.2,
    noise: 0.0,
  });
  stroke(0, 0, 200);
  strokeWeight(5);
  setStrokeMode("zigzag");


  strokeWeight(5);

  ellipse(25, 25, 50, 50);
  trimThread();
  circle(25, 25, 25);
  trimThread();
  rectMode(CENTER);
  rect(100, 25, 50, 50);
  trimThread();
  square(100, 25, 25);

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
