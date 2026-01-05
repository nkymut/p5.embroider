// Example sketch demonstrating thread color changes in embroidery
// This sketch creates a simple pattern with multiple thread colors

let _drawMode = "stitch";

let roygbiv = ["red", "orange", "yellow", "green", "blue", "indigo"];

function setup() {
  createCanvas(mmToPixel(100), mmToPixel(100));

  let drawModeStitchButton = createButton("Draw Mode: Stitch");
  drawModeStitchButton.mousePressed(() => {
    _drawMode = "stitch";
    redraw();
  });

  let drawModeLineButton = createButton("Draw Mode: Realistic");
  drawModeLineButton.mousePressed(() => {
    _drawMode = "realistic";
    redraw();
  });

  let drawModeP5Button = createButton("Draw Mode: p5");
  drawModeP5Button.mousePressed(() => {
    _drawMode = "p5";
    redraw();
  });

  let exportDstButton = createButton("Export DST");
  exportDstButton.mousePressed(() => {
    exportEmbroidery("colorExample.dst");
  });
  exportDstButton.position(0, height + 60);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("colorExample.gcode");
  });
  exportGcodeButton.position(90, height + 60);

  noLoop();
}

function draw() {
  background("#FFF5DC");
  let stitchWidth = 7;
  // Set the drawing mode to show stitches
  stroke(255, 0, 0);
  noFill();
  setDrawMode(_drawMode);
  //translate(0, 0);
  beginRecord(this);
  strokeWeight(stitchWidth);
  setStitch(0.1, 0.5, 0);
  setStrokeMode("zigzag");
  for (let i = 0; i < roygbiv.length; i++) {
    stroke(roygbiv[roygbiv.length - 1 - i]);
    ellipse(50, 50, stitchWidth * 2 + stitchWidth * 2 * i, stitchWidth * 2 + stitchWidth * 2 * i);
  }

  // End recording
  endRecord();
}
