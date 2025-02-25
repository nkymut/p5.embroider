// Tajima DST Writer
export class DSTWriter {
  constructor() {
    this.data = [];
    this.currentX = 0;
    this.currentY = 0;
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;
    this.stitchCount = 0;
  }

  static JUMP = 1;
  static STITCH = 0;
  static COLOR_CHANGE = 2;
  static END = 3;

  bit(b) {
    return 1 << b;
  }

  encodeRecord(x, y, flag) {
    y = -y;  // DST uses a different coordinate system
    let b0 = 0, b1 = 0, b2 = 0;

    switch (flag) {
      case DSTWriter.JUMP:
        b2 += this.bit(7);
      // fallthrough
      case DSTWriter.STITCH:
        b2 += this.bit(0);
        b2 += this.bit(1);
        if (x > 40) { b2 += this.bit(2); x -= 81; }
        if (x < -40) { b2 += this.bit(3); x += 81; }
        if (x > 13) { b1 += this.bit(2); x -= 27; }
        if (x < -13) { b1 += this.bit(3); x += 27; }
        if (x > 4) { b0 += this.bit(2); x -= 9; }
        if (x < -4) { b0 += this.bit(3); x += 9; }
        if (x > 1) { b1 += this.bit(0); x -= 3; }
        if (x < -1) { b1 += this.bit(1); x += 3; }
        if (x > 0) { b0 += this.bit(0); x -= 1; }
        if (x < 0) { b0 += this.bit(1); x += 1; }
        if (y > 40) { b2 += this.bit(5); y -= 81; }
        if (y < -40) { b2 += this.bit(4); y += 81; }
        if (y > 13) { b1 += this.bit(5); y -= 27; }
        if (y < -13) { b1 += this.bit(4); y += 27; }
        if (y > 4) { b0 += this.bit(5); y -= 9; }
        if (y < -4) { b0 += this.bit(4); y += 9; }
        if (y > 1) { b1 += this.bit(7); y -= 3; }
        if (y < -1) { b1 += this.bit(6); y += 3; }
        if (y > 0) { b0 += this.bit(7); y -= 1; }
        if (y < 0) { b0 += this.bit(6); y += 1; }
        break;
      case DSTWriter.COLOR_CHANGE:
        b2 = 0b11000011;
        break;
      case DSTWriter.END:
        b2 = 0b11110011;
        break;
    }
    return [b0, b1, b2];
  }

  move(x, y, flag = DSTWriter.STITCH) {
    if (x !== null && y !== null) {
      let dx = Math.round(x) - this.currentX;
      let dy = Math.round(y) - this.currentY;

      while (Math.abs(dx) > 121 || Math.abs(dy) > 121) {
        let stepX = dx > 0 ? Math.min(dx, 121) : Math.max(dx, -121);
        let stepY = dy > 0 ? Math.min(dy, 121) : Math.max(dy, -121);

        let command = this.encodeRecord(stepX, stepY, DSTWriter.JUMP);
        this.data.push(...command);
        this.currentX += stepX;
        this.currentY += stepY;
        this.stitchCount++;

        dx -= stepX;
        dy -= stepY;
      }

      if (dx !== 0 || dy !== 0) {
        let command = this.encodeRecord(dx, dy, flag);
        this.data.push(...command);
        this.currentX += dx;
        this.currentY += dy;
        this.stitchCount++;
      }

      this.minX = Math.min(this.minX, this.currentX);
      this.maxX = Math.max(this.maxX, this.currentX);
      this.minY = Math.min(this.minY, this.currentY);
      this.maxY = Math.max(this.maxY, this.currentY);
    }
  }

  calculateBorderSize(points) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    return {
      left: Math.abs(Math.floor(minX)),
      top: Math.abs(Math.floor(minY)),
      right: Math.abs(Math.ceil(maxX)),
      bottom: Math.abs(Math.ceil(maxY)),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY)
    };
  }

  generateDST(points, title) {
    // Reset data and counters
    this.data = [];
    this.currentX = 0;
    this.currentY = 0;
    this.stitchCount = 0;

    // Calculate border size
    let border = this.calculateBorderSize(points);

    // Generate stitches
    for (let i = 0; i < points.length; i++) {
      this.move(points[i].x, points[i].y, i === 0 ? DSTWriter.JUMP : DSTWriter.STITCH);
    }

    // Add end of pattern
    this.move(points[0].x, points[0].y, DSTWriter.STITCH);  // Close the circle
    this.move(0, 0, DSTWriter.END);

    // Prepare header
    let header = new Array(512).fill(0x20); // Fill with spaces
    let headerString =
      `LA:${title.padEnd(16)}\r` +
      `ST:${this.stitchCount.toString().padStart(7)}\r` +
      `CO:${(1).toString().padStart(3)}\r` +
      `+X:${border.right.toString().padStart(5)}\r` +
      `-X:${border.left.toString().padStart(5)}\r` +
      `+Y:${border.bottom.toString().padStart(5)}\r` +
      `-Y:${border.top.toString().padStart(5)}\r` +
      `AX:+${Math.abs(this.currentX).toString().padStart(5)}\r` +
      `AY:+${Math.abs(this.currentY).toString().padStart(5)}\r` +
      `MX:+${(0).toString().padStart(5)}\r` +
      `MY:+${(0).toString().padStart(5)}\r` +
      `PD:******\r`;

    // Convert header string to byte array
    for (let i = 0; i < headerString.length; i++) {
      header[i] = headerString.charCodeAt(i);
    }
    header[headerString.length] = 0x1A; // EOF character

    // Combine header and data
    return new Uint8Array([...header, ...this.data]);
  }

  saveBytes(data, filename) {
    let blob = new Blob([data], { type: 'application/octet-stream' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
    }, 100);
  }

  saveDST(points, title, filename) {
    let dstData = this.generateDST(points, title);
    this.saveBytes(dstData, filename);
    console.log('DST file saved!');
  }
}




