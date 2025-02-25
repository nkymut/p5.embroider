// p5.js G-code Writer
export class GCodeWriter {
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

  saveGcode(filename) {
    const gcode = this.generateGCode();
    const blob = new Blob([gcode], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
    }, 100);
  }
}
