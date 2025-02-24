let writer;
let points = [];

function setup() {
  createCanvas(400, 400);
  writer = new DSTWriter();
  
  // Create a perfect circle with 75 points
  let radius = 689; // 68.9 mm * 10 to match the scale in the reference
  for (let i = 0; i < 75; i++) {
    let angle = map(i, 0, 75, 0, TWO_PI);
    let x = cos(angle) * radius;
    let y = sin(angle) * radius;
    points.push(createVector(x, y));
  }
}

function draw() {
  background(220);
  
  // Draw the points
  stroke(0);
  noFill();
  beginShape();
  for (let point of points) {
    vertex(point.x / 10 + width/2, point.y / 10 + height/2);
  }
  endShape(CLOSE);
  
  // Draw point markers
  fill(255, 0, 0);
  noStroke();
  for (let point of points) {
    ellipse(point.x / 10 + width/2, point.y / 10 + height/2, 5, 5);
  }
}

function keyPressed() {
  if (key === 's') {
    // Generate and save the DST file
    writer.saveDST(points, "CirclePattern", 'myPattern.dst');
  }
}