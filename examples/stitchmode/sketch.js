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

let zigzagSettings = {
  minStitchLength: 0.1,
  stitchLength: 0.2,
  strokeWeight: 5,
};

let linesSettings = {
  minStitchLength: 0.1,
  stitchLength: 3,
  strokeWeight: 5,
};

let sashikoSettings = {
  minStitchLength: 0.5,
  stitchLength: 3.2,
  strokeWeight: 0.8,
};

function draw() {
  background("navy");
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);
  noFill();
  beginRecord(this);
  strokeCap(SQUARE);

  setStitch(zigzagSettings.minStitchLength, zigzagSettings.stitchLength, 0);
  stroke(200, 200, 200);
  strokeWeight(zigzagSettings.strokeWeight);

  setStrokeMode("zigzag");
  line(0, 0, 80, 0); // top
  trimThread();

  setStitch(linesSettings.minStitchLength, linesSettings.stitchLength, 0);
  strokeWeight(linesSettings.strokeWeight);
  setStrokeMode("lines");
  line(0, 10, 80, 10); // right
  trimThread();

  setStitch(sashikoSettings.minStitchLength, sashikoSettings.stitchLength, 0);
  strokeWeight(sashikoSettings.strokeWeight);
  setStrokeMode("sashiko");

  line(0, 20, 80, 20); // left
  trimThread();

  // Diagonal line with zigzag
  setStitch(zigzagSettings.minStitchLength, zigzagSettings.stitchLength, 0);
  strokeWeight(zigzagSettings.strokeWeight);
  setStrokeMode("zigzag");
  line(5, 30, 25, 50); // vertical
  trimThread();

  // Diagonal line with lines
  setStitch(linesSettings.minStitchLength, linesSettings.stitchLength, 0);
  strokeWeight(linesSettings.strokeWeight);
  setStrokeMode("lines");
  line(30, 30, 50, 50); // vertical
  trimThread();

  // Diagonal line with sashiko
  setStitch(sashikoSettings.minStitchLength, sashikoSettings.stitchLength, 0);
  strokeWeight(sashikoSettings.strokeWeight);
  setStrokeMode("sashiko");
  line(55, 30, 75, 50); // vertical
  trimThread();

  // Vertical line with zigzag
  setStitch(zigzagSettings.minStitchLength, zigzagSettings.stitchLength, 0);
  strokeWeight(zigzagSettings.strokeWeight);
  setStrokeMode("zigzag");
  line(15, 60, 15, 80); // vertical
  trimThread();

  // Vertical line with lines
  setStitch(linesSettings.minStitchLength, linesSettings.stitchLength, 0);
  strokeWeight(linesSettings.strokeWeight);
  setStrokeMode("lines");
  line(40, 60, 40, 80); // vertical
  trimThread();

  // Vertical line with sashiko
  setStitch(sashikoSettings.minStitchLength, sashikoSettings.stitchLength, 0);
  strokeWeight(sashikoSettings.strokeWeight);
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
