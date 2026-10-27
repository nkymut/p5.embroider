/**
 * Zigzag Corner Spacing: sew-out test
 *
 * At a ROUND or BEVEL corner the zigzag fans around the outside, so the needle keeps returning to
 * the inside of the corner. p5.embroider spreads those inner points along the inner edge and merges
 * any that land closer than `cornerSpacing` (mm) to the previous one. Too small: thread piles up and
 * the needle can deflect or break thread. Too large: the inside of the corner opens up.
 *
 * Rows: one cornerSpacing value each (the left margin has 1, 2, 3 … running-stitch bars, so the rows
 * can be told apart on the fabric). Columns: corners turning 60°, 90°, 120° and 150°.
 * Sew the DST on the fabric you use, then pick the smallest value that does not pile up.
 */

let drawMode = "realistic";
let join = "round";

const SPACINGS = [0, 0.1, 0.2, 0.3, 0.45, 0.6]; // mm, one row each
const TURNS = [60, 90, 120, 150]; // degrees, one column each
const WIDTH = 5; // mm, zigzag width
const DENSITY = 0.3; // mm between needle points along the path
const LEG = 12; // mm, length of each leg of the corner
const COL_W = 28;
const ROW_H = 22;
const LEFT = 14;
const TOP = 10;

function setup() {
  createCanvas(mmToPixel(LEFT + TURNS.length * COL_W), mmToPixel(TOP + SPACINGS.length * ROW_H));

  for (const mode of ["stitch", "realistic", "p5"]) {
    createButton(`Draw Mode: ${mode}`).mousePressed(() => {
      drawMode = mode;
      redraw();
    });
  }
  for (const j of ["round", "bevel"]) {
    createButton(`Join: ${j}`).mousePressed(() => {
      join = j;
      redraw();
    });
  }
  createButton("Export DST").mousePressed(() => exportEmbroidery(`zigzag-corner-spacing-${join}.dst`));

  noLoop();
}

function draw() {
  background("#FFF5DC");
  setDrawMode(drawMode);
  beginRecord();
  noFill();
  stroke(0, 90, 160);
  setStitch(0.1, DENSITY, 0);

  SPACINGS.forEach((spacing, row) => {
    const y0 = TOP + row * ROW_H;

    // Row marker: row + 1 short running-stitch bars
    setStrokeMode("straight");
    strokeWeight(0.5);
    for (let k = 0; k <= row; k++) {
      line(2 + k * 1.5, y0 + 4, 2 + k * 1.5, y0 + 10);
      trimThread();
    }

    setStrokeMode("zigzag");
    strokeWeight(WIDTH);
    strokeJoin(join);
    setStrokeSettings({ cornerSpacing: spacing });

    TURNS.forEach((turn, col) => {
      // A V opening upwards, the corner at the bottom; its inside (where holes pile up) faces up
      const half = radians((180 - turn) / 2);
      const cx = LEFT + col * COL_W + COL_W / 2;
      const cy = y0 + ROW_H - WIDTH / 2 - 2;
      beginShape();
      vertex(cx - LEG * sin(half), cy - LEG * cos(half));
      vertex(cx, cy);
      vertex(cx + LEG * sin(half), cy - LEG * cos(half));
      endShape();
      trimThread();
    });
  });

  endRecord();

  if (drawMode !== "stitch") {
    push();
    fill(0);
    noStroke();
    textSize(mmToPixel(2.5));
    TURNS.forEach((turn, col) => text(`${turn}°`, mmToPixel(LEFT + col * COL_W + COL_W / 2 - 3), mmToPixel(6)));
    SPACINGS.forEach((s, row) => text(`${s}`, mmToPixel(2), mmToPixel(TOP + row * ROW_H + 15)));
    text(`join: ${join}`, mmToPixel(2), mmToPixel(3));
    pop();
  }
}
