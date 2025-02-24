// p5.js G-code Writer
class GCodeWriter {
  constructor() {
    this.data = [];
    this.currentX = 0;
    this.currentY = 0;
    this.currentZ = 0;
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;
  }

  addComment(comment) {
    this.data.push('(' + comment + ')');
  }

  move(x, y, z = null) {
    let command = 'G0';
    if (x !== null) {
      command += ` X${x.toFixed(3)}`;
      this.currentX = x;
      this.minX = Math.min(this.minX, x);
      this.maxX = Math.max(this.maxX, x);
    }
    if (y !== null) {
      command += ` Y${y.toFixed(3)}`;
      this.currentY = y;
      this.minY = Math.min(this.minY, y);
      this.maxY = Math.max(this.maxY, y);
    }
    if (z !== null) {
      command += ` Z${z.toFixed(1)}`;
      this.currentZ = z;
    }
    this.data.push(command);
  }

  generateGCode(points) {
    this.addComment(`STITCH_COUNT:${points.length}`);
    
    // Generate points
    this.move(0.0, 0.0);
    
    for (let i = 0; i < points.length; i++) {
      let point = points[i];
      this.move(point.x, point.y);
      this.move(null, null, 0.0);
      this.move(point.x, point.y);
      this.move(null, null, 1.0);
    }
    
    // Add final moves
    this.move(0.0, 0.0);
    this.data.push('M30');
    
    // Add extents information at the beginning
    this.data.unshift(
      `(EXTENTS_BOTTOM:${this.minY.toFixed(3)})`,
      `(EXTENTS_RIGHT:${this.maxX.toFixed(3)})`,
      `(EXTENTS_TOP:${this.maxY.toFixed(3)})`,
      `(EXTENTS_LEFT:${this.minX.toFixed(3)})`,
      `(EXTENTS_HEIGHT:${(this.maxY - this.minY).toFixed(3)})`,
      `(EXTENTS_WIDTH:${(this.maxX - this.minX).toFixed(3)})`,
      'G90 (use absolute coordinates)',
      'G21 (coordinates will be specified in millimeters)'
    );
    
    return this.data.join('\n');
  }
}

let writer;
let points = [];

function setup() {
  createCanvas(400, 400);
  writer = new GCodeWriter();
  
  // Create a simple line of points (a circle in this case)
  for (let i = 0; i <= 360; i += 5) {
    let angle = radians(i);
    let x = cos(angle) * 100;
    let y = sin(angle) * 100;
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
    vertex(point.x + width/2, point.y + height/2);
  }
  endShape(CLOSE);
  
  // Draw point markers
  fill(255, 0, 0);
  noStroke();
  for (let point of points) {
    ellipse(point.x + width/2, point.y + height/2, 5, 5);
  }
}

function keyPressed() {
  if (key === 's') {
    // Generate and save the G-code
    let gcode = writer.generateGCode(points);
    saveStrings(gcode.split('\n'), 'myPattern.gcode');
    console.log('G-code file saved!');
  }
}