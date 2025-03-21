/**
 * Class for writing Tajima DST embroidery files.
 * @class DSTWriter
 */

// Debug flag - set to false to disable debug logging
const _DEBUG_DST = true;

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
    if (_DEBUG_DST) {
      console.log("Encoding record:", {
        x,
        y,
        flag:
          flag === DSTWriter.JUMP
            ? "JUMP"
            : flag === DSTWriter.STITCH
              ? "STITCH"
              : flag === DSTWriter.COLOR_CHANGE
                ? "COLOR_CHANGE"
                : flag,
      });
    }

    y = -y; // DST uses a different coordinate system
    let b0 = 0,
      b1 = 0,
      b2 = 0;

    switch (flag) {
      case DSTWriter.JUMP:
        b2 += this.bit(7);
      // fallthrough
      case DSTWriter.STITCH:
        b2 += this.bit(0);
        b2 += this.bit(1);
        if (x > 40) {
          b2 += this.bit(2);
          x -= 81;
        }
        if (x < -40) {
          b2 += this.bit(3);
          x += 81;
        }
        if (x > 13) {
          b1 += this.bit(2);
          x -= 27;
        }
        if (x < -13) {
          b1 += this.bit(3);
          x += 27;
        }
        if (x > 4) {
          b0 += this.bit(2);
          x -= 9;
        }
        if (x < -4) {
          b0 += this.bit(3);
          x += 9;
        }
        if (x > 1) {
          b1 += this.bit(0);
          x -= 3;
        }
        if (x < -1) {
          b1 += this.bit(1);
          x += 3;
        }
        if (x > 0) {
          b0 += this.bit(0);
          x -= 1;
        }
        if (x < 0) {
          b0 += this.bit(1);
          x += 1;
        }
        if (y > 40) {
          b2 += this.bit(5);
          y -= 81;
        }
        if (y < -40) {
          b2 += this.bit(4);
          y += 81;
        }
        if (y > 13) {
          b1 += this.bit(5);
          y -= 27;
        }
        if (y < -13) {
          b1 += this.bit(4);
          y += 27;
        }
        if (y > 4) {
          b0 += this.bit(5);
          y -= 9;
        }
        if (y < -4) {
          b0 += this.bit(4);
          y += 9;
        }
        if (y > 1) {
          b1 += this.bit(7);
          y -= 3;
        }
        if (y < -1) {
          b1 += this.bit(6);
          y += 3;
        }
        if (y > 0) {
          b0 += this.bit(7);
          y -= 1;
        }
        if (y < 0) {
          b0 += this.bit(6);
          y += 1;
        }
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
      if (_DEBUG_DST) {
        console.log("Move called with:", {
          targetX: x,
          targetY: y,
          flag: flag === DSTWriter.JUMP ? "JUMP" : flag === DSTWriter.STITCH ? "STITCH" : flag,
          currentPosition: { x: this.currentX, y: this.currentY },
        });
      }

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

      if (_DEBUG_DST) {
        console.log("After move:", {
          newPosition: { x: this.currentX, y: this.currentY },
          dx: dx,
          dy: dy,
        });
      }
    }
  }

  calculateBorderSize(points) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    // Log all trim points for debugging
    if (_DEBUG_DST) {
      const trimPoints = points.filter((p) => p.trim);
      if (trimPoints.length > 0) {
        console.log("Trim points in calculateBorderSize:", trimPoints);
      }
    }

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
      // Add raw bounds for debugging
      bounds: {
        minX,
        maxX,
        minY,
        maxY,
      },
    };

    if (_DEBUG_DST) {
      console.log("Border calculation:", {
        points: points.length,
        result,
      });
    }

    return result;
  }

  generateDST(points, title) {
    if (_DEBUG_DST) {
      console.log("=== DSTWriter generateDST ===");
      console.log("Initial state:", {
        currentX: this.currentX,
        currentY: this.currentY,
      });
    }

    // Reset data and counters
    this.data = [];
    this.currentX = 0;
    this.currentY = 0;
    this.stitchCount = 0;
    this.colorChangeCount = 0;
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;

    // Calculate border size before transformation
    let border = this.calculateBorderSize(points);
    if (_DEBUG_DST) {
      console.log("Original border size:", border);
    }

    // Transform points to center-origin coordinates
    const centerX = border.width / 2;
    const centerY = border.height / 2;

    if (_DEBUG_DST) {
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
      // Create a new point object with all properties from the original point
      const newPoint = { ...point };

      // Transform coordinates to center-origin
      newPoint.x = point.x - (border.left + centerX);
      newPoint.y = point.y - (border.top + centerY);

      // Log transformation for trim points
      if (_DEBUG_DST && point.trim) {
        console.log("Transforming trim point:", {
          original: { x: point.x, y: point.y },
          transformed: { x: newPoint.x, y: newPoint.y },
          offset: { x: border.left + centerX, y: border.top + centerY },
        });
      }

      return newPoint;
    });

    if (_DEBUG_DST) {
      console.log("Coordinate transformation:", {
        centerX,
        centerY,
        originalFirstPoint: points[0],
        transformedFirstPoint: transformedPoints[0],
      });
    }

    // Recalculate border size after transformation
    border = this.calculateBorderSize(transformedPoints);
    if (_DEBUG_DST) {
      console.log("Transformed border size:", border);
    }

    // Generate stitches using transformed points
    for (let i = 0; i < transformedPoints.length; i++) {
      const point = transformedPoints[i];
      if (_DEBUG_DST) {
        console.log("Processing point:", i, point);
      }

      // Handle color change
      if (point.colorChange) {
        if (_DEBUG_DST) {
          console.log("Color change at point:", i);
        }
        // Add a color change command at the current position
        // In DST, we don't move but just insert a color change command
        this.data.push(...this.encodeRecord(0, 0, DSTWriter.COLOR_CHANGE));
        this.colorChangeCount++;
        continue;
      }

      // Handle thread trim
      if (point.trim) {
        if (_DEBUG_DST) {
          console.log("Thread trim at point:", i, {
            originalPoint: point,
            currentPosition: { x: this.currentX, y: this.currentY },
          });
        }

        // In DST format, thread trimming is signaled by a specific pattern of jump stitches
        // First, ensure we're at the correct position
        this.move(point.x, point.y, DSTWriter.JUMP);

        if (_DEBUG_DST) {
          console.log("After move to trim position:", {
            targetPosition: { x: point.x, y: point.y },
            actualPosition: { x: this.currentX, y: this.currentY },
          });
        }

        // Generate a zigzag pattern of 3 jumps that embroidery machines recognize as a trim command
        // These are small relative movements from the current position

        // First jump: up and right
        this.data.push(...this.encodeRecord(3, 3, DSTWriter.JUMP));
        this.currentX += 3;
        this.currentY += 3;
        this.stitchCount++;

        // Second jump: down and right
        this.data.push(...this.encodeRecord(3, -6, DSTWriter.JUMP));
        this.currentX += 3;
        this.currentY -= 6;
        this.stitchCount++;

        // Third jump: back to original position
        this.data.push(...this.encodeRecord(-6, 3, DSTWriter.JUMP));
        this.currentX -= 6;
        this.currentY += 3;
        this.stitchCount++;

        continue;
      }

      // Handle jump or stitch
      const flag = i === 0 || point.jump ? DSTWriter.JUMP : DSTWriter.STITCH;
      this.move(point.x, point.y, flag);

      if (_DEBUG_DST) {
        console.log("After move:", {
          point: i,
          position: { x: this.currentX, y: this.currentY },
          flag: flag === DSTWriter.JUMP ? "JUMP" : "STITCH",
        });
      }
    }

    // Add end record
    this.move(0, 0, DSTWriter.END);

    if (_DEBUG_DST) {
      console.log("Final state:", {
        stitchCount: this.stitchCount,
        colorChangeCount: this.colorChangeCount,
        bounds: {
          minX: this.minX,
          maxX: this.maxX,
          minY: this.minY,
          maxY: this.maxY,
        },
      });
    }

    // Create header
    let header = new Array(512).fill(0x20); // Fill with spaces
    let headerString =
      `LA:${title.padEnd(16)}\r` +
      `ST:${this.stitchCount.toString().padStart(7)}\r` +
      `CO:${this.colorChangeCount.toString().padStart(3)}\r` +
      `+X:${border.right.toString().padStart(5)}\r` +
      `-X:${Math.abs(border.left).toString().padStart(5)}\r` +
      `+Y:${border.bottom.toString().padStart(5)}\r` +
      `-Y:${Math.abs(border.top).toString().padStart(5)}\r` +
      `AX:+${Math.abs(this.currentX).toString().padStart(5)}\r` +
      `AY:+${Math.abs(this.currentY).toString().padStart(5)}\r` +
      `MX:+${(0).toString().padStart(5)}\r` +
      `MY:+${(0).toString().padStart(5)}\r` +
      `PD:******\r`;

    // Convert header string to byte array
    for (let i = 0; i < headerString.length; i++) {
      header[i] = headerString.charCodeAt(i);
    }
    header[headerString.length] = 0x1a; // EOF character

    // Combine header and data
    return new Uint8Array([...header, ...this.data]);
  }

  saveBytes(data, filename) {
    let blob = new Blob([data], { type: "application/octet-stream" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    // Prevent page refresh by handling the click event
    link.onclick = function (e) {
      // Let download happen, just prevent page refresh
      setTimeout(() => e.preventDefault(), 10);
      //restore download function

      // Clean up after download starts
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 100);
    };

    document.body.appendChild(link);
    link.click();
  }

  /**
   * Saves embroidery data as a DST file.
   * @memberof DSTWriter
   * @param {Array} points - Array of stitch points
   * @param {String} title - Title for the DST file header
   * @param {String} filename - Output filename
   */
  saveDST(points, title, filename) {
    let dstData = this.generateDST(points, title);
    this.saveBytes(dstData, filename);
    if (_DEBUG_DST) {
      console.log("DST file saved!");
    }
  }
}

// Add this check to support both direct browser usage and ES modules
if (typeof exports !== "undefined") {
  exports.DSTWriter = DSTWriter;
} else if (typeof window !== "undefined") {
  window.DSTWriter = DSTWriter;
}
