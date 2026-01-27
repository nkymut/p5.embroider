const _DEBUG_PES = true;

export class PESWriter {
  constructor() {
    this.VERSION = 1;
    this.TRUNCATED = false;
    
    this.MASK_07_BIT = 0b01111111;
    this.JUMP_CODE = 0b00010000;
    this.TRIM_CODE = 0b00100000;
    this.FLAG_LONG = 0b10000000;
    
    this.PEC_ICON_WIDTH = 48;
    this.PEC_ICON_HEIGHT = 38;
    
    this.position = 0;
    this.buffer = [];
    this.streamStack = [];
  }
  
  // ===== Binary Writing Methods =====
  
  writeInt8(value) {
    this.position += 1;
    this.buffer.push(value & 0xFF);
  }
  
  writeInt16LE(value) {
    this.position += 2;
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
  }
  
  writeInt16BE(value) {
    this.position += 2;
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push(value & 0xFF);
  }
  
  writeInt24LE(value) {
    this.position += 3;
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push((value >> 16) & 0xFF);
  }
  
  writeInt32LE(value) {
    this.position += 4;
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push((value >> 16) & 0xFF);
    this.buffer.push((value >>> 24) & 0xFF);
  }
  
  floatToIntBits(float) {
    const buffer = new ArrayBuffer(4);
    const floatView = new Float32Array(buffer);
    const intView = new Int32Array(buffer);
    floatView[0] = float;
    return intView[0];
  }
  
  writeInt32LEFloat(value) {
    const bits = this.floatToIntBits(value);
    this.writeInt32LE(bits);
  }
  
  tell() {
    return this.position;
  }
  
  writeString(string) {
    this.position += string.length;
    for (let i = 0; i < string.length; i++) {
      this.buffer.push(string.charCodeAt(i));
    }
  }
  
  writeBytes(bytes) {
    this.position += bytes.length;
    this.buffer.push(...bytes);
  }
  
  spaceHolder(skip) {
    this.position += skip;
    const newBuffer = [];
    this.streamStack.push({
      buffer: this.buffer,
      position: this.position - skip
    });
    this.buffer = newBuffer;
  }
  
  writeSpaceHolder16LE(value) {
    const popped = this.streamStack.pop();
    const tempBuffer = this.buffer;
    this.buffer = popped.buffer;
    
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    // Use loop instead of spread to avoid stack overflow on large buffers
    for (let i = 0; i < tempBuffer.length; i++) {
      this.buffer.push(tempBuffer[i]);
    }
  }
  
  writeSpaceHolder24LE(value) {
    const popped = this.streamStack.pop();
    const tempBuffer = this.buffer;
    this.buffer = popped.buffer;
    
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push((value >> 16) & 0xFF);
    // Use loop instead of spread to avoid stack overflow on large buffers
    for (let i = 0; i < tempBuffer.length; i++) {
      this.buffer.push(tempBuffer[i]);
    }
  }
  
  writeSpaceHolder32LE(value) {
    const popped = this.streamStack.pop();
    const tempBuffer = this.buffer;
    this.buffer = popped.buffer;
    
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push((value >> 16) & 0xFF);
    this.buffer.push((value >>> 24) & 0xFF);
    // Use loop instead of spread to avoid stack overflow on large buffers
    for (let i = 0; i < tempBuffer.length; i++) {
      this.buffer.push(tempBuffer[i]);
    }
  }
  
  
  // ===== PEC Color Palette Matching =====
  
  findColor(color) {
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    
    const std = [
      0x1a0a94,0x0f75ff,0x00934c,0xbabdfe,0xec0000,0xe4995a,0xcc48ab,0xfdc4fa,0xdd84cd,0x6bd38a,
      0xe4a945,0xffbd42,0xffe600,0x6cd900,0xc1a941,0xb5ad97,0xba9c5f,0xfaf59e,0x808080,0x000000,
      0x001cdf,0xdf00b8,0x626262,0x69260d,0xff0060,0xbf8200,0xf39178,0xff6805,0xf0f0f0,0xc832cd,
      0xb0bf9b,0x65bfeb,0xffba04,0xfff06c,0xfeca15,0xf38101,0x37a923,0x23465f,0xa6a695,0xcebfa6,
      0x96aa02,0xffe3c6,0xff99d7,0x007004,0xedccfb,0xc089d8,0xe7d9b4,0xe90e86,0xcf6829,0x408615,
      0xdb1797,0xffa704,0xb9ffff,0x228927,0xb612cd,0x00aa00,0xfea9dc,0xfed510,0x0097df,0xffff84,
      0xcfe774,0xffc864,0xffc8c8,0xffc8c8
    ];
    
    let minDist = 195075;
    let minIndex = 0;
    
    for (let i = 0; i < std.length; i++) {
      const r0 = (std[i] >> 16) & 255;
      const g0 = (std[i] >> 8) & 255;
      const b0 = std[i] & 255;
      const dist = Math.pow(r - r0, 2) + Math.pow(g - g0, 2) + Math.pow(b - b0, 2);
      
      if (dist < minDist) {
        minDist = dist;
        minIndex = i;
      }
    }
    
    return minIndex + 1;
  }
  
  // ===== Bounds Calculation (matching DST) =====
  
  calculateBorderSize(points) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    const result = {
      left: Math.abs(Math.floor(minX)),
      top: Math.abs(Math.floor(minY)),
      right: Math.abs(Math.ceil(maxX)),
      bottom: Math.abs(Math.ceil(maxY)),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY),
      bounds: { minX, maxX, minY, maxY },
    };

    if (_DEBUG_PES) {
      console.log("PES Border calculation:", {
        points: points.length,
        result,
      });
    }

    return result;
  }
  
  // ===== PEC Encoding =====
  
  encodeLongForm(value) {
    value &= 0b0000111111111111;
    value |= 0b1000000000000000;
    return value;
  }
  
  flagTrim(longForm) {
    return longForm | (this.TRIM_CODE << 8);
  }
  
  pecEncode(stitches, colors) {
    let colorTwo = true;
    let xx = 0, yy = 0;
    
    for (let i = 0; i < stitches.length; i++) {
      // Check for color change
      if (i > 0 && colors[i] !== colors[i - 1]) {
        this.writeInt8(0xfe);
        this.writeInt8(0xb0);
        this.writeInt8(colorTwo ? 2 : 1);
        colorTwo = !colorTwo;
        
        if (_DEBUG_PES) {
          console.log("PEC color change at stitch", i);
        }
      }
      
      const x = stitches[i].x;
      const y = stitches[i].y;
      
      let dx = Math.round(x - xx);
      let dy = Math.round(y - yy);
      xx += dx;
      yy += dy;
      
      // First stitch special handling
      if (i === 0) {
        dx = this.encodeLongForm(dx);
        dx = this.flagTrim(dx);
        dy = this.encodeLongForm(dy);
        dy = this.flagTrim(dy);
        this.writeInt16BE(dx);
        this.writeInt16BE(dy);
        this.writeInt8(0x00);
        this.writeInt8(0x00);
        dx = 0;
        dy = 0;
      }
      
      // Short form: -64 to 63
      if (dx < 63 && dx > -64 && dy < 63 && dy > -64) {
        this.writeInt8(dx & this.MASK_07_BIT);
        this.writeInt8(dy & this.MASK_07_BIT);
      } else {
        // Long form
        dx = this.encodeLongForm(dx);
        dy = this.encodeLongForm(dy);
        this.writeInt16BE(dx);
        this.writeInt16BE(dy);
      }
    }
    
    this.writeInt8(0xff); // End marker
  }
  
  // ===== PEC Header and Blocks =====
  
  writePecHeader(title, colors) {
    const colorIndexList = [];
    
    // Title line (16 chars padded, with \r)
    const titleLine = `LA:${title.padEnd(16).substring(0, 16)}\r`;
    this.writeString(titleLine);
    
    // 12 spaces
    for (let i = 0; i < 12; i++) {
      this.writeInt8(0x20);
    }
    this.writeInt8(0xFF);
    this.writeInt8(0x00);
    
    // Icon dimensions
    this.writeInt8(this.PEC_ICON_WIDTH / 8);
    this.writeInt8(this.PEC_ICON_HEIGHT);
    
    // Build palette - unique consecutive colors
    const palette = [];
    for (let i = 0; i < colors.length; i++) {
      if (i === 0 || colors[i] !== colors[i - 1]) {
        palette.push(colors[i]);
      }
    }
    
    if (_DEBUG_PES) {
      console.log("PES Color palette:", palette.map(c => c.toString(16)));
    }
    
    // 12 more spaces
    for (let i = 0; i < 12; i++) {
      this.writeInt8(0x20);
    }
    
    // Write color count and indices
    colorIndexList.push(palette.length - 1);
    this.writeInt8(palette.length - 1);
    
    for (let i = 0; i < palette.length; i++) {
      const idx = this.findColor(palette[i]);
      colorIndexList.push(idx);
      this.writeInt8(idx);
    }
    
    // Padding (463 - palette.length spaces)
    for (let i = 0; i < (463 - palette.length); i++) {
      this.writeInt8(0x20);
    }
    
    return { colorIndexList, palette };
  }
  
  writePecBlock(bounds, stitches, colors) {
    const width = Math.round(bounds.width);
    const height = Math.round(bounds.height);
    
    const stitchBlockStart = this.tell();
    this.writeInt8(0x00);
    this.writeInt8(0x00);
    this.spaceHolder(3);
    
    this.writeInt8(0x31);
    this.writeInt8(0xFF);
    this.writeInt8(0xF0);
    
    this.writeInt16LE(width);
    this.writeInt16LE(height);
    
    this.writeInt16LE(0x1E0);
    this.writeInt16LE(0x1B0);
    
    // Use the actual bounds, not [0] and [1] indices
    this.writeInt16BE(0x9000 | (-Math.round(bounds.minX) & 0xFFFF));
    this.writeInt16BE(0x9000 | (-Math.round(bounds.minY) & 0xFFFF));
    
    this.pecEncode(stitches, colors);
    
    const stitchBlockLength = this.tell() - stitchBlockStart;
    this.writeSpaceHolder24LE(stitchBlockLength);
  }
  
  writePecGraphics() {
    this.writeBytes([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xF0, 0xFF, 0xFF, 0xFF, 0xFF, 0x0F,
      0x08, 0x00, 0x00, 0x00, 0x00, 0x10,
      0x04, 0x00, 0x00, 0x00, 0x00, 0x20,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
      0x04, 0x00, 0x00, 0x00, 0x00, 0x20,
      0x08, 0x00, 0x00, 0x00, 0x00, 0x10,
      0xF0, 0xFF, 0xFF, 0xFF, 0xFF, 0x0F,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
  }
  
  writePec(title, stitches, colors, border) {
    const colorInfo = this.writePecHeader(title, colors);
    this.writePecBlock(border, stitches, colors);
    
    // Write graphics for each color
    this.writePecGraphics();
    this.writePecGraphics();
    
    for (let i = 1; i < colors.length; i++) {
      if (colors[i] !== colors[i - 1]) {
        this.writePecGraphics();
      }
    }
    
    return colorInfo;
  }
  
  // Version 1 truncated (PEC-only) - simplest format
  writeTruncatedVersion1(title, stitches, colors, border) {
    this.writeString("#PES0001");
    this.writeInt8(0x16);
    for (let i = 0; i < 13; i++) {
      this.writeInt8(0x00);
    }
    this.writePec(title, stitches, colors, border);
  }
  
  // ===== Main Generation Function (matching DST pattern) =====
  
  generatePES(points, title) {
    if (_DEBUG_PES) {
      console.log("=== PESWriter generatePES ===");
      console.log("Points to process:", points.length);
    }

    // Reset state
    this.position = 0;
    this.buffer = [];
    this.streamStack = [];

    // Calculate border size BEFORE transformation (same as DST)
    let border = this.calculateBorderSize(points);
    if (_DEBUG_PES) {
      console.log("Original border size:", border);
    }

    // need to shift by minX
    const centerX = border.width / 2;
    const centerY = border.height / 2;

    if (_DEBUG_PES) {
      console.log("Transformation values:", {
        centerX,
        centerY,
        left: border.left,
        top: border.top,
        offset: {
          x: border.left + centerX,
          y: border.top + centerY,
        },
      });
    }

    const transformedPoints = points.map((point) => {
      const newPoint = { ...point };
      // Transform coordinates to center-origin
      newPoint.x = point.x + border.left;
      newPoint.y = point.y + border.top;
      return newPoint;
    });

    if (_DEBUG_PES) {
      console.log("Coordinate transformation:", {
        centerX,
        centerY,
        originalFirstPoint: points[0],
        transformedFirstPoint: transformedPoints[0],
      });
    }

    // Recalculate border size after transformation
    border = this.calculateBorderSize(transformedPoints);
    if (_DEBUG_PES) {
      console.log("Transformed border size:", border);
    }

    // Extract stitches and colors arrays from transformed points
    const stitches = transformedPoints.map(p => ({ x: p.x, y: p.y }));
    const colors = transformedPoints.map(p => p.color || 0xFF0000);
    
    // Write the file
    this.writeTruncatedVersion1(title, stitches, colors, border);
    
    return new Uint8Array(this.buffer);
  }
  
  // ===== Save Function (matching DST pattern) =====
  
  saveBytes(data, filename) {
    let blob = new Blob([data], { type: "application/octet-stream" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    link.onclick = function (e) {
      setTimeout(() => e.preventDefault(), 10);
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 100);
    };

    document.body.appendChild(link);
    link.click();
  }

  /**
   * Saves embroidery data as a PES file.
   * @memberof PESWriter
   * @param {Array} points - Array of stitch points with x, y, color properties
   * @param {String} title - Title for the PES file header
   * @param {String} filename - Output filename
   */
  savePES(points, title, filename) {
    let pesData = this.generatePES(points, title);
    this.saveBytes(pesData, filename);
    if (_DEBUG_PES) {
      console.log("PES file saved!");
      console.log("File size:", pesData.length, "bytes");
    }
  }
}

// Add this check to support both direct browser usage and ES modules
if (typeof exports !== "undefined") {
  exports.PESWriter = PESWriter;
} else if (typeof window !== "undefined") {
  window.PESWriter = PESWriter;
}
