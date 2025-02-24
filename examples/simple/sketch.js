function setup() {
  createCanvas(400, 400);

  background(220);
  beginRecord(this);
  // Draw a 200px square
  line(0, 0, 200, 0); // top
  trimThread();
  line(200, 0, 200, 200); // right
  trimThread();
  line(200, 200, 0, 200); // bottom
  trimThread();
  line(0, 200, 0, 0); // left
  trimThread();
  
  trimThread();

  // Draw a 200px circle
  ellipse(100, 100, 200, 200);

  trimThread();

  // Stop recording and export as DST
  endRecord();
  noLoop(); // Stop the draw loop after exporting
}

function keyPressed() {
  exportEmbroidery('boxtest.dst');
}