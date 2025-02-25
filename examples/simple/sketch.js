function setup() {
  createCanvas(400, 400);

  background(220);
  beginRecord(this);
  // Draw a 200px square
  setStitch(.5, 10, 0);
  line(0, 0, 200, 0); // top
  trimThread();
  line(200, 0, 200, 200); // right
  trimThread();
  line(200, 200, 0, 200); // bottom
  trimThread();
  line(0, 200, 0, 0); // left
  trimThread();

  // Draw a 200px circle
  ellipse(100, 100, 200, 200);

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