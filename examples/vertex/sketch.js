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
    exportEmbroidery("vertextest.dst");
  });
  exportDstButton.position(0, height + 30);

  let exportGcodeButton = createButton("Export Gcode");
  exportGcodeButton.mousePressed(() => {
    exportGcode("vertextest.gcode");
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
    strokeWeight: 4,
    noise: 0.0,
  });
  setStitch(0.1, 0.5, 0);
  stroke(0, 200, 200);
  strokeWeight(2);

  setStrokeMode("zigzag");
  beginShape();
  vertex(0, 0);
  vertex(80, 0);
  vertex(80, 80);
  vertex(0, 80);
  vertex(0, 0);
  endShape(CLOSE);
  trimThread();

  setStrokeMode("straight");
  setStitch(0.1, 1, 0);
  stroke(255, 0, 100);
  strokeWeight(1.4);
  
  const stitchSize = 5;
  
  // Define three colors for the cross-stitches
  const colors = [
    [255, 0, 100],   // Pink
    [0, 150, 255],   // Blue
    [255, 200, 0]    // Yellow
  ];
  
  // Create a 3x3 grid of color groups
  const gridSize = 3;
  const cellSize = 75 / gridSize; // Divide the 70x70 area into a 3x3 grid
  
  // fill the square with cross-stitches
  for (let gridX = 0; gridX < gridSize; gridX++) {
    for (let gridY = 0; gridY < gridSize; gridY++) {
      // Select color based on grid position
      const colorIndex = (gridX + gridY) % 3;
      stroke(colors[colorIndex][0], colors[colorIndex][1], colors[colorIndex][2]);
      
      // Calculate the starting position for this grid cell
      const startX = 5 + gridX * cellSize;
      const startY = 5 + gridY * cellSize;
      
      // Fill this grid cell with cross-stitches
      for (let x = startX; x < startX + cellSize - stitchSize; x += stitchSize) {
        for (let y = startY; y < startY + cellSize - stitchSize; y += stitchSize) {
          // the first diagonal of each cross-stitch
          beginShape();
          vertex(x, y);
          vertex(x + stitchSize, y + stitchSize);
          endShape();
          trimThread();
          // the second diagonal of each cross-stitch
          beginShape();
          vertex(x + stitchSize, y);
          vertex(x, y + stitchSize);
          endShape();
          trimThread();
        }
      }
      
      // Trim thread after completing each color group
      
    }
  }

  endRecord();
}

function keyPressed() {
  switch (key) {
    case "d":
      exportEmbroidery("vertextest.dst");
      break;
    case "g":
      exportGcode("vertextest.gcode");
      break;
  }
}
