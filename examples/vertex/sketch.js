let drawMode = "realistic";

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
    exportEmbroidery("boxtest.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("boxtest.gcode");
  });
  exportGcodeButton.position(90, height + 30);

  noLoop(); // Stop the draw loop after exporting
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
  setStitch(0.1, 2, 0);
  stroke(0, 200, 200);
  strokeWeight(2);

  beginShape();
  vertex(0, 0);
  vertex(80, 0);
  vertex(80, 80);
  vertex(0, 80);
  vertex(0, 0);
  endShape(CLOSE);
  trimThread();

  for (let i = 0; i < 10; i++) {
  beginShape();
  //random 10 vertex within 100x100

  for (let i = 0; i < 3; i++) {
    vertex(5+random(60), 5+random(60));
  }
  endShape(CLOSE);
  trimThread();
  }

  

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
