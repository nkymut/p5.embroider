function setup() {
  createCanvas(800, 800);

  background(220);

  setDrawMode('realistic');
  beginRecord(this);
  // Draw a 90mm square
  setStitch(.5, 6, 0);

  line(10, 10, 100, 10); // top
  trimThread();
  line(100, 10, 100, 100); // right
  trimThread();
  line(100, 100, 10, 100); // bottom
  trimThread();
  line(10, 100, 10, 10); // left
  trimThread();

  // Draw a 200px circle

  ellipse(55, 55, 80, 80);

  trimThread();

  // Stop recording and export as DST
  endRecord();
  noLoop(); // Stop the draw loop after exporting
}

function keyPressed() {
  switch (key) {
    case 'd':
      exportEmbroidery('boxtest.dst');
      break;
    case 'g':
      exportGcode('boxtest.gcode');
      break;
  }
}