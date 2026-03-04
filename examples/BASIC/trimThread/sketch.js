/*
  trimThread — thread trimming in p5.embroider.
   
  p5.embroider provides three ways to control trimming:
  
  1. setTrimByShape(true) — Automatically trim between every shape
     Best for: Designs with many separate elements
  
  2. setTrimByDistance(true, threshold) — Trim only when gap exceeds threshold (in mm)
     Best for: Optimizing trim count while preventing long jumps
     Example: setTrimByDistance(true, 15) trims when gap > 15mm
  
  3. trimThread() — Manually insert a trim at the current position
     Best for: Precise control over trim placement
     Works with both stroke and fill threads
  
  This example shows all three methods:

  Row 1: No trim (default) — shapes connected with travel stitches
  Row 2: trimByShape — trim inserted between every shape
  Row 3: trimByDistance (threshold=15mm) — trim only when gap > 15mm
  Row 4: Explicit trimThread() — manual trim between shapes
  Row 5: Mixed stroke + fill with trimThread() — verifies both threads trimmed
*/

let stitchData;

function setup() {
  createCanvas(mmToPixel(150), mmToPixel(150));
  background("#FFF5DC");

  setDrawMode("stitch");
  beginRecord(this);

  setStitch(1.5, 1.5, 0);
  setStrokeMode("straight");
  setFillMode("tatami");

  const rowH = 27;
  const startY = 10;
  const shapeSize = 10;

  // ─── Row 1: No auto-trim (default) ───
  let y = startY;
  setTrimByShape(false);
  setTrimByDistance(false);
  stroke(255, 0, 0);
  noFill();
  circle(15, y + 8, shapeSize);
  circle(40, y + 8, shapeSize);
  fill(255, 0, 0);
  circle(80, y + 8, shapeSize);
  circle(120, y + 8, shapeSize);

  // ─── Row 2: trimByShape ───
  y += rowH;
  setTrimByShape(true);
  setTrimByDistance(false);
  stroke(0, 150, 0);
  noFill();
  circle(15, y + 8, shapeSize);
  circle(40, y + 8, shapeSize);
  fill(0, 150, 0);
  circle(80, y + 8, shapeSize);
  circle(120, y + 8, shapeSize);
  setTrimByShape(false);

  // ─── Row 3: trimByDistance ───
  y += rowH;
  setTrimByDistance(true);
  setTrimThreshold(15);
  stroke(0, 0, 200);
  noFill();
  // gap ~10mm (no trim expected)
  circle(15, y + 8, shapeSize);
  circle(27, y + 8, shapeSize);
  // gap ~35mm (trim expected)
  fill(0, 0, 200);
  circle(65, y + 8, shapeSize);
  // gap ~40mm (trim expected)
  circle(108, y + 8, shapeSize);
  // gap ~20mm (trim expected)
  circle(132, y + 8, shapeSize);
  setTrimByDistance(false);

  // ─── Row 4: Explicit trimThread() ───
  y += rowH;
  stroke(200, 0, 200);
  noFill();
  circle(15, y + 8, shapeSize);
  trimThread();
  circle(50, y + 8, shapeSize);
  trimThread();
  circle(95, y + 8, shapeSize);
  // no trim before last — should connect
  circle(130, y + 8, shapeSize);

  // ─── Row 5: Stroke + fill with trimThread() ───
  y += rowH;
  stroke(80, 40, 0);
  fill(255, 180, 50);
  rect(10, y + 2, 18, 15);
  trimThread();
  rect(50, y + 2, 18, 15);
  trimThread();
  ellipse(100, y + 10, 20, 15);
  noFill();
  noStroke();

  stitchData = endRecord();

  // Export buttons
  select("#exportDST").mousePressed(() => exportDST("trimTest.dst", stitchData));
  select("#exportPES").mousePressed(() => exportPES("trimTest.pes", stitchData));
}
