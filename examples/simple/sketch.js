let drawMode = "stitch";

function setup() {
  createCanvas(500, 500);
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
  background(220);
  translate(50, 50);
  setDrawMode(drawMode);
  beginRecord(this);
  // Draw a 100mm square
  setStitch(0.5, 6, 0);

  line(0, 0, 100, 0); // top
  trimThread();
  line(100, 0, 100, 100); // right
  trimThread();
  line(100, 100, 0, 100); // bottom
  trimThread();
  line(0, 100, 0, 0); // left
  trimThread();

  // Draw a 200px circle

  ellipse(50, 50, 80, 80);

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
