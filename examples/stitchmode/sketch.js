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
  background("navy");
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);
  noFill();
  beginRecord(this);

  setStitch(0.2, 0.4, 0);
  stroke(200, 200, 200);
  strokeWeight(5);

  setStrokeMode("zigzag");
  line(0, 0, 80, 0); // top
  trimThread();


  setStitch(0.1, 3, 0);
  setStrokeMode("lines");

  line(0, 10, 80, 10); // right
  trimThread();


  setStitch(0.1, 5, 0);
  strokeWeight(2);
  setStrokeMode("sashiko");

  line(0, 20, 80, 20); // left
  trimThread();

  // Diagonal line with zigzag
  setStitch(0.2, 0.4, 0);
  strokeWeight(5);
  setStrokeMode("zigzag");
  line(5, 30, 25, 50); // vertical
  trimThread();

  // Diagonal line with lines
  setStitch(0.5, 0.8, 0);
  strokeWeight(5);
  setStrokeMode("lines");
  line(30, 30, 50, 50); // vertical
  trimThread();

  // Diagonal line with sashiko
  setStitch(0.5, 5, 0);
  strokeWeight(2);
  setStrokeMode("sashiko");
  line(55, 30, 75, 50); // vertical
  trimThread();


  // Vertical line with zigzag 
  setStitch(0.2, 0.4, 0);
  strokeWeight(5);
  setStrokeMode("zigzag");
  line(15, 60, 15, 80); // vertical
  trimThread();

  // Vertical line with lines
  setStitch(0.5, 0.8, 0);
  strokeWeight(5);
  setStrokeMode("lines");
  line(40, 60, 40, 80); // vertical
  trimThread();

  // Vertical line with sashiko 
  setStitch(0.5, 5, 0);
  strokeWeight(2);
  setStrokeMode("sashiko");
  line(63, 60, 63, 80); // vertical
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
