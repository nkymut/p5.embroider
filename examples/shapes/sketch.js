let drawMode = "stitch";

function setup() {
  createCanvas(mmToPixel(250), mmToPixel(200));
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

  strokeCap(SQUARE);
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
  fill(0,200,0)
  ellipse(25, 25, 50, 50);
  trimThread();
  circle(25, 25, 25);
  trimThread();
  rectMode(CENTER);
  rect(100, 25, 50, 50, 5);
  trimThread();
  square(175, 25, 50);
  trimThread();

  triangle(25, 75, 50, 125, 5, 125);
  trimThread();
  arc(100, 75, 50, 100, 0, PI);
  trimThread();
  quad(175, 75, 200, 100, 175, 125, 150, 100);
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
