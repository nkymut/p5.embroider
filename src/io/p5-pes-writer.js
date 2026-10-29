const _DEBUG_PES = false;

// PEC moves are 12-bit signed: longer moves are split into steps of at most this many 0.1 mm units
const PEC_MAX_MOVE = 2047;

// Thumbnail drawings are scaled to the icon size less this many pixels, which keeps them inside the frame
const PEC_ICON_MARGIN = 6;

// Empty 48 × 38 PEC thumbnail: the rounded frame only (6 bytes per row, bit 0 = leftmost pixel)
const PEC_BLANK_GRAPHIC = [
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0xff, 0xff, 0xff, 0xff, 0x0f, 0x08, 0x00, 0x00, 0x00, 0x00, 0x10, 0x04,
  0x00, 0x00, 0x00, 0x00, 0x20, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00,
  0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00,
  0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00,
  0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00,
  0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40,
  0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02,
  0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00,
  0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00,
  0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00,
  0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x40, 0x04, 0x00, 0x00, 0x00, 0x00,
  0x20, 0x08, 0x00, 0x00, 0x00, 0x00, 0x10, 0xf0, 0xff, 0xff, 0xff, 0xff, 0x0f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

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
    this.buffer.push(value & 0xff);
  }

  writeInt16LE(value) {
    this.position += 2;
    this.buffer.push(value & 0xff);
    this.buffer.push((value >> 8) & 0xff);
  }

  writeInt16BE(value) {
    this.position += 2;
    this.buffer.push((value >> 8) & 0xff);
    this.buffer.push(value & 0xff);
  }

  writeInt24LE(value) {
    this.position += 3;
    this.buffer.push(value & 0xff);
    this.buffer.push((value >> 8) & 0xff);
    this.buffer.push((value >> 16) & 0xff);
  }

  writeInt32LE(value) {
    this.position += 4;
    this.buffer.push(value & 0xff);
    this.buffer.push((value >> 8) & 0xff);
    this.buffer.push((value >> 16) & 0xff);
    this.buffer.push((value >>> 24) & 0xff);
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
      position: this.position - skip,
    });
    this.buffer = newBuffer;
  }

  writeSpaceHolder16LE(value) {
    const popped = this.streamStack.pop();
    const tempBuffer = this.buffer;
    this.buffer = popped.buffer;

    this.buffer.push(value & 0xff);
    this.buffer.push((value >> 8) & 0xff);
    // Use loop instead of spread to avoid stack overflow on large buffers
    for (let i = 0; i < tempBuffer.length; i++) {
      this.buffer.push(tempBuffer[i]);
    }
  }

  writeSpaceHolder24LE(value) {
    const popped = this.streamStack.pop();
    const tempBuffer = this.buffer;
    this.buffer = popped.buffer;

    this.buffer.push(value & 0xff);
    this.buffer.push((value >> 8) & 0xff);
    this.buffer.push((value >> 16) & 0xff);
    // Use loop instead of spread to avoid stack overflow on large buffers
    for (let i = 0; i < tempBuffer.length; i++) {
      this.buffer.push(tempBuffer[i]);
    }
  }

  writeSpaceHolder32LE(value) {
    const popped = this.streamStack.pop();
    const tempBuffer = this.buffer;
    this.buffer = popped.buffer;

    this.buffer.push(value & 0xff);
    this.buffer.push((value >> 8) & 0xff);
    this.buffer.push((value >> 16) & 0xff);
    this.buffer.push((value >>> 24) & 0xff);
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
      0x1a0a94, 0x0f75ff, 0x00934c, 0xbabdfe, 0xec0000, 0xe4995a, 0xcc48ab, 0xfdc4fa, 0xdd84cd, 0x6bd38a, 0xe4a945,
      0xffbd42, 0xffe600, 0x6cd900, 0xc1a941, 0xb5ad97, 0xba9c5f, 0xfaf59e, 0x808080, 0x000000, 0x001cdf, 0xdf00b8,
      0x626262, 0x69260d, 0xff0060, 0xbf8200, 0xf39178, 0xff6805, 0xf0f0f0, 0xc832cd, 0xb0bf9b, 0x65bfeb, 0xffba04,
      0xfff06c, 0xfeca15, 0xf38101, 0x37a923, 0x23465f, 0xa6a695, 0xcebfa6, 0x96aa02, 0xffe3c6, 0xff99d7, 0x007004,
      0xedccfb, 0xc089d8, 0xe7d9b4, 0xe90e86, 0xcf6829, 0x408615, 0xdb1797, 0xffa704, 0xb9ffff, 0x228927, 0xb612cd,
      0x00aa00, 0xfea9dc, 0xfed510, 0x0097df, 0xffff84, 0xcfe774, 0xffc864, 0xffc8c8, 0xffc8c8,
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
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (let point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    const result = {
      left: Math.floor(minX),
      top: Math.floor(minY),
      right: Math.ceil(maxX),
      bottom: Math.ceil(maxY),
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

  // ===== PEC Commands =====

  /**
   * Turns the centred points into PEC commands at whole 0.1 mm positions:
   * `{ type: "stitch" | "jump", x, y, first }` and `{ type: "color", color }`.
   *
   * Point flags (as set by exportPES): `jump` marks the start of a travel, so the move from this
   * point to the next is a jump; `trim` cuts the thread here, so the move to the next point is a
   * jump even when it has no length. The move to the first stitch and the move after a colour
   * change are jumps too. Every jump lands with a stitch at its destination.
   */
  buildCommands(points) {
    const commands = [];
    let x = 0,
      y = 0;
    let color = null;
    let jumpNext = true; // the move to the next point is a jump
    let trimNext = false; // ... and has to be written even with no length
    let first = true; // no stitch yet: the jump is the move from the origin

    const land = (px, py) => {
      if (jumpNext && (px !== x || py !== y || trimNext)) commands.push({ type: "jump", x: px, y: py, first });
      commands.push({ type: "stitch", x: px, y: py });
      jumpNext = trimNext = first = false;
    };

    for (const point of points) {
      const px = Math.round(point.x);
      const py = Math.round(point.y);
      const pointColor = point.color || 0xff0000;

      if (color !== null && pointColor !== color) {
        commands.push({ type: "color", color: pointColor });
        jumpNext = true;
      }
      color = pointColor;

      if (point.jump || point.trim) {
        // A travel source sits on the last stitch; one elsewhere is sewn there first
        if (px !== x || py !== y) land(px, py);
        jumpNext = true;
        trimNext = trimNext || !!point.trim;
      } else {
        land(px, py);
      }
      x = px;
      y = py;
    }
    return commands;
  }

  // ===== PEC Encoding =====

  /** One axis: short form (7-bit) when it fits and no flag is needed, else 12-bit long form. */
  writeValue(value, long = false, flag = 0) {
    if (!long && value > -64 && value < 63) {
      this.writeInt8(value & this.MASK_07_BIT);
    } else {
      this.writeInt16BE((value & 0x0fff) | ((this.FLAG_LONG | flag) << 8));
    }
  }

  /**
   * Writes the PEC stitch stream. Jumps are long form with the JUMP flag for the first move from the
   * origin and the TRIM flag after that (Brother machines cut on it), split into steps of at most
   * PEC_MAX_MOVE per axis. Colour changes alternate FE B0 02 / FE B0 01.
   */
  pecEncode(commands) {
    let colorTwo = true;
    let xx = 0,
      yy = 0;

    for (const cmd of commands) {
      if (cmd.type === "color") {
        this.writeInt8(0xfe);
        this.writeInt8(0xb0);
        this.writeInt8(colorTwo ? 2 : 1);
        colorTwo = !colorTwo;
        if (_DEBUG_PES) console.log("PEC color change to", cmd.color.toString(16));
        continue;
      }

      let dx = cmd.x - xx;
      let dy = cmd.y - yy;
      const isJump = cmd.type === "jump" || Math.abs(dx) > PEC_MAX_MOVE || Math.abs(dy) > PEC_MAX_MOVE;

      if (isJump) {
        const flag = cmd.first ? this.JUMP_CODE : this.TRIM_CODE;
        // At least one record, so a trim with no travel still cuts
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / PEC_MAX_MOVE));
        let sx = 0,
          sy = 0;
        for (let s = 1; s <= steps; s++) {
          const nx = Math.round((dx * s) / steps);
          const ny = Math.round((dy * s) / steps);
          this.writeValue(nx - sx, true, flag);
          this.writeValue(ny - sy, true, flag);
          sx = nx;
          sy = ny;
        }
      } else {
        this.writeValue(dx);
        this.writeValue(dy);
      }
      xx = cmd.x;
      yy = cmd.y;
    }

    this.writeInt8(0xff); // End marker
  }

  // ===== PEC Header and Blocks =====

  /** Colour blocks `{ color, commands }`, split at the colour changes; the first takes `firstColor`. */
  colorBlocks(commands, firstColor) {
    let block = { color: firstColor, commands: [] };
    const blocks = [block];
    for (const cmd of commands) {
      if (cmd.type === "color") {
        block = { color: cmd.color, commands: [] };
        blocks.push(block);
      } else {
        block.commands.push(cmd);
      }
    }
    return blocks;
  }

  writePecHeader(title, palette) {
    const colorIndexList = [];

    // Title line (16 chars padded, with \r)
    const titleLine = `LA:${title.padEnd(16).substring(0, 16)}\r`;
    this.writeString(titleLine);

    // 12 spaces
    for (let i = 0; i < 12; i++) {
      this.writeInt8(0x20);
    }
    this.writeInt8(0xff);
    this.writeInt8(0x00);

    // Icon dimensions
    this.writeInt8(this.PEC_ICON_WIDTH / 8);
    this.writeInt8(this.PEC_ICON_HEIGHT);

    if (_DEBUG_PES) {
      console.log(
        "PES Color palette:",
        palette.map((c) => c.toString(16)),
      );
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
    for (let i = 0; i < 463 - palette.length; i++) {
      this.writeInt8(0x20);
    }

    return { colorIndexList, palette };
  }

  writePecBlock(bounds, commands) {
    const width = Math.round(bounds.width);
    const height = Math.round(bounds.height);

    const stitchBlockStart = this.tell();
    this.writeInt8(0x00);
    this.writeInt8(0x00);
    this.spaceHolder(3);

    this.writeInt8(0x31);
    this.writeInt8(0xff);
    this.writeInt8(0xf0);

    this.writeInt16LE(width);
    this.writeInt16LE(height);

    this.writeInt16LE(0x1e0);
    this.writeInt16LE(0x1b0);

    // Two more 16-bit fields that most readers (and Brother machines) skip as header, while others
    // decode them as the first record; 0x9000 0x9000 is a zero-length jump, so both agree. The
    // stitch stream then starts with the jump from the origin to the first stitch.
    this.writeInt16BE(0x9000);
    this.writeInt16BE(0x9000);
    this.pecEncode(commands);

    const stitchBlockLength = this.tell() - stitchBlockStart;
    this.writeSpaceHolder24LE(stitchBlockLength);
  }

  /**
   * A 48 × 38 1-bit thumbnail (6 bytes per row, bit 0 = leftmost pixel) of `commands`: the frame
   * plus a line along consecutive stitches, broken at jumps. The design is scaled to fit inside
   * the image less `margin` pixels and centred.
   */
  pecGraphic(commands, bounds, margin) {
    const graphic = PEC_BLANK_GRAPHIC.slice();
    const stride = this.PEC_ICON_WIDTH / 8;
    const { minX, maxX, minY, maxY } = bounds.bounds;
    const scale = Math.min(
      (this.PEC_ICON_WIDTH - margin) / Math.max(1, maxX - minX),
      (this.PEC_ICON_HEIGHT - margin) / Math.max(1, maxY - minY),
    );
    const tx = this.PEC_ICON_WIDTH / 2 - ((minX + maxX) / 2) * scale;
    const ty = this.PEC_ICON_HEIGHT / 2 - ((minY + maxY) / 2) * scale;
    const mark = (x, y) => {
      if (x < 0 || y < 0 || x >= this.PEC_ICON_WIDTH || y >= this.PEC_ICON_HEIGHT) return;
      graphic[y * stride + (x >> 3)] |= 1 << (x & 7);
    };

    let prev = null;
    for (const cmd of commands) {
      if (cmd.type !== "stitch") {
        prev = null;
        continue;
      }
      const p = { x: Math.floor(cmd.x * scale + tx), y: Math.floor(cmd.y * scale + ty) };
      if (!prev) {
        mark(p.x, p.y);
      } else {
        // Bresenham from prev to p
        let x0 = prev.x,
          y0 = prev.y;
        const ddx = Math.abs(p.x - x0),
          ddy = -Math.abs(p.y - y0);
        const sx = x0 < p.x ? 1 : -1,
          sy = y0 < p.y ? 1 : -1;
        let err = ddx + ddy;
        for (;;) {
          mark(x0, y0);
          if (x0 === p.x && y0 === p.y) break;
          const e2 = 2 * err;
          if (e2 >= ddy) {
            err += ddy;
            x0 += sx;
          }
          if (e2 <= ddx) {
            err += ddx;
            y0 += sy;
          }
        }
      }
      prev = p;
    }
    return graphic;
  }

  writePec(title, commands, border, firstColor) {
    const blocks = this.colorBlocks(commands, firstColor);
    const colorInfo = this.writePecHeader(
      title,
      blocks.map((b) => b.color),
    );
    this.writePecBlock(border, commands);

    // One thumbnail of the whole design, then one per colour block
    this.writeBytes(this.pecGraphic(commands, border, PEC_ICON_MARGIN));
    for (const block of blocks) {
      this.writeBytes(this.pecGraphic(block.commands, border, PEC_ICON_MARGIN));
    }

    return colorInfo;
  }

  // Version 1 truncated (PEC-only) - simplest format
  writeTruncatedVersion1(title, commands, border, firstColor) {
    this.writeString("#PES0001");
    this.writeInt8(0x16);
    for (let i = 0; i < 13; i++) {
      this.writeInt8(0x00);
    }
    this.writePec(title, commands, border, firstColor);
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
    const offsetX = border.left + centerX;
    const offsetY = border.top + centerY;

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
      newPoint.x = point.x - offsetX;
      newPoint.y = point.y - offsetY;
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

    // Keep the jump / trim flags: they decide which moves are jumps
    const commands = this.buildCommands(transformedPoints);
    this.writeTruncatedVersion1(title, commands, border, transformedPoints[0].color || 0xff0000);

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
