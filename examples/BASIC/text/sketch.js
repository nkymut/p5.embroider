let font;
let drawMode = "realistic";

function preload() {
  font = loadFont("assets/SourceSansPro-Regular.otf");
}

function setup() {
  createCanvas(mmToPixel(100), mmToPixel(120));

  // Load a font
  //font = loadFont('./assets/CloisterBlack.ttf');

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
    exportEmbroidery("text-basic.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("text-basic.gcode");
  });
  exportGcodeButton.position(90, height + 30);
}

function draw() {
  background("#6c757d");
  //translate(mmToPixel(10), mmToPixel(50+30));

  setDrawMode(drawMode);

  beginRecord(this);

  // Configure embroidery settings
  setStitch(0.1, 0.5, 0);
  setFillSettings({
    stitchLength: 15,
    stitchWidth: 0.2,
    rowSpacing: 0.2,
    noise: 0.0,
    stitchInterpolate: true,
  });

  textFont(font);
  textSize(80);
  noStroke();
  strokeWeight(1);
  fill("#39c5bb");
  text("p5", 5, 80);

  // End recording
  endRecord();
}

function keyPressed() {
  switch (key) {
    case "d":
      exportEmbroidery("text-basic.dst");
      break;
    case "g":
      exportGcode("text-basic.gcode");
      break;
  }
}
