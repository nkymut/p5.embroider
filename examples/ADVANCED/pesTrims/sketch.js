/**
 * PES Trims: sew-out test for jumps, trims and thumbnails in PES files
 *
 * Row 1: four squares with trimThread() after each. The PES file writes each trim as a jump with
 *        the trim flag, so a machine with an automatic thread cutter should cut between them.
 * Row 2: the same squares without trimThread(). Reference: the travel between them is sewn.
 * Row 3: four circles 20 mm apart. ellipse() inserts a jump when the gap is over 10 mm
 *        (jumpThreshold); PES writes it with the trim flag too.
 * Frame: a second colour, so the file has a colour change and one thumbnail per colour.
 *
 * Export PES and DST, load both on the machine, and compare: thumbnail, position in the hoop,
 * and which travels are cut.
 */

let drawMode = "realistic";

const W = 90; // mm
const H = 80; // mm
const SIZE = 10; // mm, square side and circle diameter
const PITCH = 20; // mm between shape centres
const LEFT = 15; // mm, centre of the first shape

function setup() {
  createCanvas(mmToPixel(W), mmToPixel(H));

  for (const mode of ["stitch", "realistic", "p5"]) {
    createButton(`Draw Mode: ${mode}`).mousePressed(() => {
      drawMode = mode;
      redraw();
    });
  }
  createButton("Export PES").mousePressed(() => exportEmbroidery("pes-trims.pes"));
  createButton("Export DST").mousePressed(() => exportEmbroidery("pes-trims.dst"));

  noLoop();
}

function draw() {
  background("#FFF5DC");
  setDrawMode(drawMode);
  beginRecord();
  noFill();
  setStrokeMode("straight");
  setStitch(0.1, 2, 0);
  strokeWeight(1);
  stroke(0, 90, 160);
  rectMode(CENTER);

  // Row 1: trimmed after each square
  for (let k = 0; k < 4; k++) {
    rect(LEFT + k * PITCH, 15, SIZE, SIZE);
    trimThread();
  }

  // Row 2: no trims (travel is sewn)
  for (let k = 0; k < 4; k++) {
    rect(LEFT + k * PITCH, 35, SIZE, SIZE);
  }
  trimThread();

  // Row 3: circles, jumps inserted by the library
  for (let k = 0; k < 4; k++) {
    circle(LEFT + k * PITCH, 57, SIZE);
  }
  trimThread();

  // Frame in a second colour
  stroke(200, 30, 30);
  rectMode(CORNER);
  rect(3, 3, W - 6, H - 6);

  endRecord();

  if (drawMode !== "stitch") {
    push();
    fill(0);
    noStroke();
    textSize(mmToPixel(2.5));
    text("trimThread()", mmToPixel(6), mmToPixel(25));
    text("no trim", mmToPixel(6), mmToPixel(45));
    text("auto jump", mmToPixel(6), mmToPixel(68));
    pop();
  }
}
