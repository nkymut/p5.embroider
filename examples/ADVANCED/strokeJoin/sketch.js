/**
 * Zigzag Corner Joins Example
 *
 * Zigzag strokes follow strokeJoin() at every corner:
 * - ROUND (default): the stitches fan around the outside of the corner
 * - MITER: both edges meet in a point (becomes BEVEL beyond miterLimit)
 * - BEVEL: the corner is cut straight across
 * Each row draws the same open path (30°, 60°, 90° and 135° turns) and a closed square.
 */

let drawMode = "realistic";
const joins = ["round", "miter", "bevel"];

function setup() {
  createCanvas(mmToPixel(120), mmToPixel(110));

  for (const mode of ["stitch", "realistic", "p5"]) {
    createButton(`Draw Mode: ${mode}`).mousePressed(() => {
      drawMode = mode;
      redraw();
    });
  }
  createButton("Export DST").mousePressed(() => exportEmbroidery("stroke-join.dst"));

  noLoop();
}

function draw() {
  background("#FFF5DC");
  setDrawMode(drawMode);
  beginRecord();
  noFill();
  setStitch(0.1, 0.3, 0);
  setStrokeMode("zigzag");
  strokeWeight(4);

  joins.forEach((join, row) => {
    const y = 15 + row * 35;
    stroke(
      ...[
        [255, 0, 100],
        [0, 150, 255],
        [100, 50, 200],
      ][row],
    );
    strokeJoin(join); // ROUND, MITER or BEVEL also work

    // Open path: turns of 30°, 60°, 90° and 135°
    beginShape();
    let x = 8;
    let py = y;
    let heading = 0;
    vertex(x, py);
    for (const turn of [0, 30, -60, 90, -135]) {
      heading += radians(turn);
      x += cos(heading) * 13;
      py += sin(heading) * 13;
      vertex(x, py);
    }
    endShape();
    trimThread();

    // Closed square
    beginShape();
    vertex(88, y - 5);
    vertex(108, y - 5);
    vertex(108, y + 15);
    vertex(88, y + 15);
    endShape(CLOSE);
    trimThread();
  });

  endRecord();

  if (drawMode !== "stitch") {
    push();
    fill(0);
    noStroke();
    textSize(mmToPixel(3));
    joins.forEach((join, row) => text(`strokeJoin("${join}")`, mmToPixel(8), mmToPixel(6 + row * 35)));
    pop();
  }
}
