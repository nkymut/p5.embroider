let drawMode = "stitch";

function setup() {
  createCanvas(800, 600);
  
  // UI Controls
  createElement('h1', 'Preview Viewport Demo');
  
  // Instructions
  let instructionsDiv = createDiv();
  instructionsDiv.addClass('instructions');
  instructionsDiv.html(`
    <h3>Interactive Controls:</h3>
    <ul>
      <li><strong>Mouse Wheel:</strong> Zoom in/out</li>
      <li><strong>Click + Drag:</strong> Pan around</li>
      <li><strong>R Key:</strong> Reset view</li>
      <li><strong>F Key:</strong> Fit to content</li>
    </ul>
  `);
  
  let controlsDiv = createDiv();
  controlsDiv.addClass('controls');
  
  createElement('h3', 'Drawing Mode:').parent(controlsDiv);
  
  let stitchButton = createButton("Stitch View");
  stitchButton.parent(controlsDiv);
  stitchButton.mousePressed(() => {
    drawMode = "stitch";
    setDrawMode(drawMode);
    redraw();
  });

  let realisticButton = createButton("Realistic View");
  realisticButton.parent(controlsDiv);
  realisticButton.mousePressed(() => {
    drawMode = "realistic";
    setDrawMode(drawMode);
    redraw();
  });

  let p5Button = createButton("p5 View");
  p5Button.parent(controlsDiv);
  p5Button.mousePressed(() => {
    drawMode = "p5";
    setDrawMode(drawMode);
    redraw();
  });

  createElement('h3', 'Viewport Controls:').parent(controlsDiv);
  
  let resetButton = createButton("Reset Viewport");
  resetButton.parent(controlsDiv);
  resetButton.mousePressed(() => {
    resetPreviewViewport();
    redraw();
  });
  
  let fitButton = createButton("Fit to Content");
  fitButton.parent(controlsDiv);
  fitButton.mousePressed(() => {
    // Fit to a reasonable content area (100x100mm design)
    fitPreviewToContent({ x: 0, y: 0, width: 100, height: 100 });
    redraw();
  });

  createElement('h3', 'Export:').parent(controlsDiv);
  
  let exportButton = createButton("Export DST");
  exportButton.parent(controlsDiv);
  exportButton.mousePressed(() => {
    exportEmbroidery("viewport_demo.dst");
  });

  //noLoop();
}

function draw() {
  background(240);
  
  // IMPORTANT: Setup preview viewport before beginRecord
  setupPreviewViewport({
    scale: 1,
    minScale: 0.2,
    maxScale: 8
  });
  
  // Draw background grid in world coordinates
  drawGrid(10, { color: [200, 200, 200], alpha: 100 });
  
  // Draw hoop guide
  drawHoopGuides(50, 50, { width: 100, height: 100 });
  
  // Begin recording embroidery
  beginRecord(this);

  // All embroidery drawing happens here in world coordinates
  // This content will be scrollable and zoomable
  
  // Set embroidery settings
  stroke('red');
  strokeWeight(1);
  setStitch(2, 4, 0);
  
  // Draw some embroidery content
  push();
  translate(mmToPixel(20), mmToPixel(20));
  
  // Draw a flower pattern
  for (let i = 0; i < 8; i++) {
    push();
    rotate(TWO_PI * i / 8);
    
    // Petal
    stroke('red');
    beginShape();
    vertex(0, 0);
    bezierVertex(mmToPixel(5), mmToPixel(-15), mmToPixel(15), mmToPixel(-15), mmToPixel(20), 0);
    bezierVertex(mmToPixel(15), mmToPixel(5), mmToPixel(5), mmToPixel(5), 0, 0);
    endShape();
    
    pop();
  }
  
  // Center circle
  stroke('yellow');
  circle(0, 0, mmToPixel(8));
  
  pop();
  
  // Draw some text
  push();
  translate(mmToPixel(10), mmToPixel(70));
  stroke('blue');
  strokeWeight(0.5);
  setStitch(1, 2, 0);
  
  // Simple text outline
  textSize(mmToPixel(8));
  fill('blue');
  text("EMBROIDERY", 0, 0);
  
  pop();
  
  // Draw decorative border
  stroke('green');
  strokeWeight(0.8);
  setStitch(1.5, 3, 0);
  
  noFill();
  rect(mmToPixel(5), mmToPixel(5), mmToPixel(90), mmToPixel(90));
  
  // Corner decorations
  for (let corner = 0; corner < 4; corner++) {
    push();
    let x = corner % 2 === 0 ? mmToPixel(10) : mmToPixel(90);
    let y = corner < 2 ? mmToPixel(10) : mmToPixel(90);
    translate(x, y);
    
    stroke('purple');
    line(-mmToPixel(3), 0, mmToPixel(3), 0);
    line(0, -mmToPixel(3), 0, mmToPixel(3));
    
    pop();
  }

  endRecord();
  
  // IMPORTANT: End preview viewport after endRecord
  endPreviewViewport();
  
  // Draw viewport controls in screen space (not affected by pan/zoom)
  drawPreviewControls({
    x: 10,
    y: 10,
    showZoomLevel: true,
    showResetButton: true,
    showFitButton: true
  });
  
  // Draw info
  push();
  fill(0);
  textAlign(LEFT, TOP);
  textSize(12);
  const state = getPreviewState();
  text(`Zoom: ${(state.scale * 100).toFixed(1)}%`, 10, height - 60);
  text(`Pan: (${state.panX.toFixed(0)}, ${state.panY.toFixed(0)})`, 10, height - 45);
  text(`Mouse in world: (${pixelToMm((mouseX - state.centerX - state.panX) / state.scale + state.centerX).toFixed(1)}mm, ${pixelToMm((mouseY - state.centerY - state.panY) / state.scale + state.centerY).toFixed(1)}mm)`, 10, height - 30);
  text("Use mouse wheel to zoom, click and drag to pan", 10, height - 15);
  pop();
}

// Handle mouse wheel zooming
function mouseWheel(event) {
  handlePreviewZoom(event);
  redraw();
  return false;
}

// Handle mouse interactions
function mousePressed() {
  // First check if the mouse press was handled by the preview controls
  if (handlePreviewControlsPressed(mouseX, mouseY)) {
    redraw();
    return;
  }
  
  // Otherwise handle as pan
  startPreviewPan();
}

function mouseDragged() {
  // Handle slider dragging
  handlePreviewControlsDragged(mouseY);
  
  // Handle panning
  handlePreviewPan();
  redraw();
}

function mouseReleased() {
  handlePreviewControlsReleased();
  stopPreviewPan();
}

// Handle keyboard shortcuts
function keyPressed() {
  if (key === 'r' || key === 'R') {
    resetPreviewViewport();
    redraw();
  } else if (key === 'f' || key === 'F') {
    fitPreviewToContent({ x: 0, y: 0, width: 100, height: 100 });
    redraw();
  }
}