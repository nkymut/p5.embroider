let font;
let drawMode = "stitch";

function preload() {
  // Load a font
  //font = loadFont('./assets/CloisterBlack.ttf',
  font = loadFont('./assets/grotesk.otf',

    () => {
      console.log('Font loaded successfully');
      console.log('Font object:', font);
      console.log('Has font.font?', font.font);
    },
    (err) => console.error('Error loading font:', err)
  );
}

// Enable debug mode
window._DEBUG = true;

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
  background("#FFF5DC");
  translate(mmToPixel(10), mmToPixel(10));

  setDrawMode(drawMode);

  beginRecord(this);
  
  // Configure embroidery settings
  setStitch(0.1, 0.5, 0);
  
  // Example 1: Stroke-only text (outline)
  textFont(font);
  textSize(50);
  stroke(0);
  strokeWeight(1);
  noFill();
  text('A', 5, 40);
  
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

