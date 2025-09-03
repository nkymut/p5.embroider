(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
})((function () { 'use strict';

  /**
   * Class for writing Tajima DST embroidery files.
   * @class DSTWriter
   */


  class DSTWriter {
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
      {
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
        {
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

        {
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
      {
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

      {
        console.log("Border calculation:", {
          points: points.length,
          result,
        });
      }

      return result;
    }

    generateDST(points, title) {
      {
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
      {
        console.log("Original border size:", border);
      }

      // Transform points to center-origin coordinates
      const centerX = border.width / 2;
      const centerY = border.height / 2;

      {
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
        if (point.trim) {
          console.log("Transforming trim point:", {
            original: { x: point.x, y: point.y },
            transformed: { x: newPoint.x, y: newPoint.y },
            offset: { x: border.left + centerX, y: border.top + centerY },
          });
        }

        return newPoint;
      });

      {
        console.log("Coordinate transformation:", {
          centerX,
          centerY,
          originalFirstPoint: points[0],
          transformedFirstPoint: transformedPoints[0],
        });
      }

      // Recalculate border size after transformation
      border = this.calculateBorderSize(transformedPoints);
      {
        console.log("Transformed border size:", border);
      }

      // Generate stitches using transformed points
      for (let i = 0; i < transformedPoints.length; i++) {
        const point = transformedPoints[i];
        {
          console.log("Processing point:", i, point);
        }

        // Handle color change
        if (point.colorChange) {
          {
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
          {
            console.log("Thread trim at point:", i, {
              originalPoint: point,
              currentPosition: { x: this.currentX, y: this.currentY },
            });
          }

          // In DST format, thread trimming is signaled by a specific pattern of jump stitches
          // First, ensure we're at the correct position
          this.move(point.x, point.y, DSTWriter.JUMP);

          {
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

        {
          console.log("After move:", {
            point: i,
            position: { x: this.currentX, y: this.currentY },
            flag: flag === DSTWriter.JUMP ? "JUMP" : "STITCH",
          });
        }
      }

      // Add end record
      this.move(0, 0, DSTWriter.END);

      {
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
      {
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
      this.data.push("(" + comment + ")");
    }

    move(x, y, z = null) {
      let command = "G0";
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

    generateGCode(points, title) {
      this.addComment(`TITLE:${title}`);
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
      this.data.push("M30");

      // Add extents information at the beginning
      this.data.unshift(
        `(EXTENTS_BOTTOM:${this.minY.toFixed(3)})`,
        `(EXTENTS_RIGHT:${this.maxX.toFixed(3)})`,
        `(EXTENTS_TOP:${this.maxY.toFixed(3)})`,
        `(EXTENTS_LEFT:${this.minX.toFixed(3)})`,
        `(EXTENTS_HEIGHT:${(this.maxY - this.minY).toFixed(3)})`,
        `(EXTENTS_WIDTH:${(this.maxX - this.minX).toFixed(3)})`,
        "G90 (use absolute coordinates)",
        "G21 (coordinates will be specified in millimeters)",
      );

      return this.data.join("\n");
    }

    saveGcode(points, title, filename) {
      const gcode = this.generateGCode(points, title);
      const blob = new Blob([gcode], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 100);
    }
  }

  /**
   * p5.embroider Embroidery Guide Utilities
   * Reusable functions for drawing paper layouts, hoop guides, grids, and reference marks
   */

  // Paper size definitions (in mm)
  const PAPER_SIZES = {
    A4: { width: 210, height: 297 },
    A3: { width: 297, height: 420 },
    A2: { width: 420, height: 594 },
    A1: { width: 594, height: 841 },
  };

  // Comprehensive hoop size presets (in mm)
  // Based on real-world embroidery hoop specifications
  const HOOP_PRESETS = {
    // Manual Hoops (Round bamboo/wooden hoops for hand embroidery)
    "manual-4": { width: 100, height: 100, description: "4 inch bamboo hoop", shape: "round", type: "manual" },
    "manual-5": { width: 130, height: 130, description: "5 inch bamboo hoop", shape: "round", type: "manual" },
    "manual-6": { width: 150, height: 150, description: "6 inch bamboo hoop", shape: "round", type: "manual" },
    "manual-8": { width: 200, height: 200, description: "8 inch bamboo hoop", shape: "round", type: "manual" },
    "manual-10": { width: 250, height: 250, description: "10 inch bamboo hoop", shape: "round", type: "manual" },
    
    // Bernina Machine Hoops (Square/rectangular with grids)
    "bernina-small": { 
      width: 72, height: 50, 
      description: "Bernina Small Hoop - Smallest standard hoop",
      brand: "bernina",
      type: "machine",
      shape: "rectangle"
    },
    "bernina-medium": { 
      width: 130, height: 100, 
      description: "Bernina Medium Hoop - Most versatile standard size",
      brand: "bernina", 
      type: "machine",
      shape: "rectangle"
    },
    "bernina-large-oval": { 
      width: 145, height: 255, 
      description: "Bernina Large Oval Hoop - Oval shaped for longer designs",
      brand: "bernina",
      type: "machine",
      shape: "rectangle"
    },
    "bernina-mega": { 
      width: 150, height: 400, 
      description: "Bernina Mega Hoop - Longest standard hoop for borders",
      brand: "bernina",
      type: "machine",
      shape: "rectangle"
    },
    
    // Bernina Specialty Machine Hoops (Ergonomic Twist-lock)
    "bernina-midi": { 
      width: 265, height: 165, 
      description: "Bernina Midi Hoop - Medium specialty with twist-lock",
      brand: "bernina",
      type: "machine",
      shape: "rectangle",
      frameThickness: 10
    },
    "bernina-maxi": { 
      width: 210, height: 400, 
      description: "Bernina Maxi Hoop - Large specialty for big designs",
      brand: "bernina",
      type: "machine", 
      shape: "rectangle",
      frameThickness: 10
    },
    "bernina-jumbo": { 
      width: 400, height: 260, 
      description: "Bernina Jumbo Hoop - Largest specialty hoop",
      brand: "bernina",
      type: "machine",
      shape: "rectangle",
      frameThickness: 10,
      compatible: ["7-series", "8-series"]
    },
    
    // Brother Standard Hoops
    "brother-sa431": { 
      width: 20, height: 60, 
      description: "Brother SA431 Small - For monograms, collars, cuffs",
      brand: "brother",
      type: "machine",
      shape: "rectangle",
      model: "SA431",
      physicalSize: "1x2 inches"
    },
    "brother-sa432": { 
      width: 100, height: 100, 
      description: "Brother SA432 Medium - Most popular for left chest",
      brand: "brother",
      type: "machine",
      shape: "rectangle",
      model: "SA432", 
      physicalSize: "4x4 inches"
    },
    "brother-sa434": { 
      width: 170, height: 100, 
      description: "Brother SA434 Large - Multi-position hoop",
      brand: "brother",
      model: "SA434",
      physicalSize: "6.7x4 inches"
    },
    "brother-sa444": { 
      width: 127, height: 178, 
      description: "Brother SA444 5x7 - Popular mid-size for larger designs",
      brand: "brother",
      model: "SA444",
      physicalSize: "5x7 inches"
    },
    "brother-sa441": { 
      width: 159, height: 267, 
      description: "Brother SA441 Extra Large - Large hoop for bigger designs",
      brand: "brother",
      model: "SA441",
      physicalSize: "6x10 inches"
    },
    
    // Brother Jumbo/Commercial Hoops
    "brother-7x12": { 
      width: 178, height: 305, 
      description: "Brother 7x12 Jumbo - Largest Brother hoop size",
      brand: "brother",
      type: "jumbo",
      compatible: ["Innovis 4000D", "5000D", "XV8500D", "PR series"]
    },
    "brother-8x12": { 
      width: 203, height: 305, 
      description: "Brother 8x12 Commercial - Commercial embroidery hoop",
      brand: "brother",
      type: "commercial", 
      compatible: ["PR series commercial machines"]
    },
    
    // Tajima Tubular Hoops (circular)
    "tajima-9cm": { 
      width: 90, height: 90, 
      description: "Tajima 9cm Tubular - Small round tubular hoop",
      brand: "tajima",
      type: "tubular",
      sewingField: "360mm (14 inch)"
    },
    "tajima-12cm": { 
      width: 120, height: 120, 
      description: "Tajima 12cm Tubular - Medium round tubular hoop",
      brand: "tajima",
      type: "tubular",
      sewingField: "360mm (14 inch)"
    },
    "tajima-15cm": { 
      width: 150, height: 150, 
      description: "Tajima 15cm Tubular - Large round tubular hoop",
      brand: "tajima",
      type: "tubular",
      sewingField: "360mm (14 inch)"
    },
    "tajima-18cm": { 
      width: 180, height: 180, 
      description: "Tajima 18cm Tubular - Extra large round tubular hoop",
      brand: "tajima",
      type: "tubular",
      sewingField: "360mm (14 inch)"
    },
    "tajima-21cm": { 
      width: 210, height: 210, 
      description: "Tajima 21cm Tubular - XXL round tubular hoop",
      brand: "tajima",
      type: "tubular",
      sewingField: "360mm (14 inch)"
    },
    
    // Tajima Rectangular Hoops
    "tajima-24x24": { 
      width: 240, height: 240, 
      description: "Tajima 24x24 Square - Large square hoop",
      brand: "tajima",
      type: "rectangular"
    },
    "tajima-30x30": { 
      width: 300, height: 300, 
      description: "Tajima 30x30 Square - Extra large square hoop",
      brand: "tajima",
      type: "rectangular"
    },
    "tajima-sleeve": { 
      width: 360, height: 100, 
      description: "Tajima 36x10cm Sleeve - Specialized sleeve embroidery hoop",
      brand: "tajima",
      type: "specialty",
      sewingField: "360mm (14 inch)"
    },
    "tajima-large-rect": { 
      width: 335, height: 329, 
      description: "Tajima 335x329 Large Rectangular - Large format rectangular hoop",
      brand: "tajima",
      type: "rectangular"
    },
    "tajima-jumbo": { 
      width: 413, height: 467, 
      description: "Tajima 413x467 Jumbo - Jumbo rectangular hoop for 500mm sewing field",
      brand: "tajima",
      type: "jumbo",
      sewingField: "500mm (19.7 inch)"
    },
    
    // Dahao Commercial Hoops
    "dahao-standard": { 
      width: 400, height: 500, 
      description: "Dahao Standard Commercial - Standard commercial embroidery area",
      brand: "dahao",
      type: "commercial"
    },
    "dahao-large": { 
      width: 450, height: 400, 
      description: "Dahao Large Commercial - Large format commercial hoop",
      brand: "dahao",
      type: "commercial"
    },
    "dahao-jumbo": { 
      width: 500, height: 1200, 
      description: "Dahao Jumbo Commercial - XXL format for banners and large projects",
      brand: "dahao",
      type: "jumbo"
    },
    "dahao-square": { 
      width: 600, height: 600, 
      description: "Dahao Standard Square - Large square format",
      brand: "dahao",
      type: "commercial"
    },
    
    // Singer Futura Series Hoops
    "singer-ce-small": { 
      width: 100, height: 160, 
      description: "Singer Futura CE Small - Standard small hoop for CE-100/150/200/250/350",
      brand: "singer",
      type: "standard",
      compatible: ["CE-100", "CE-150", "CE-200", "CE-250", "CE-350"]
    },
    "singer-ce-large": { 
      width: 114, height: 171, 
      description: "Singer Futura CE Large - Large hoop for CE series machines",
      brand: "singer",
      type: "standard",
      model: "#51010",
      compatible: ["CE series"]
    },
    "singer-xl400-small": { 
      width: 100, height: 100, 
      description: "Singer Futura XL-400 Small - Standard 4x4 hoop for XL-400",
      brand: "singer",
      type: "standard",
      compatible: ["XL-400"]
    },
    "singer-xl400-large": { 
      width: 152, height: 254, 
      description: "Singer Futura XL-400 Large - Large format hoop for XL-400",
      brand: "singer",
      type: "standard",
      model: "#416454101",
      compatible: ["XL-400"]
    },
    "singer-se9180": { 
      width: 170, height: 100, 
      description: "Singer SE9180 Standard - Precision hoop for detailed work",
      brand: "singer",
      type: "standard",
      compatible: ["SE9180"]
    },
    
    // Singer Multi-Hoop Systems
    "singer-xl400-multi": { 
      width: 305, height: 508, 
      description: "Singer XL-400 Multi-Hoop System - Multi-hoop capability for continuous designs",
      brand: "singer",
      type: "multi-hoop",
      compatible: ["XL-400"]
    },
    "singer-xl400-max": { 
      width: 470, height: 279, 
      description: "Singer XL-400 Maximum Multi-Hoop - Maximum multi-hoop design area",
      brand: "singer",
      type: "multi-hoop",
      compatible: ["XL-400"]
    }
  };

  /**
   * Draw a grid background with specified spacing
   * @param {number} spacing - Grid spacing in mm
   * @param {Object} options - Grid styling options
   * @param {Array} options.color - Grid color [r, g, b] or [r, g, b, a]
   * @param {number} options.weight - Grid line weight in pixels
   * @param {number} options.alpha - Grid transparency (0-255)
   */
  function drawGrid(spacing = 10, options = {}) {
    const {
      color = [0, 0, 0],
      weight = 1,
      alpha = 20
    } = options;

    push();
    
    if (color.length === 3) {
      stroke(color[0], color[1], color[2], alpha);
    } else {
      stroke(color[0], color[1], color[2], color[3] || alpha);
    }
    
    strokeWeight(weight);
    
    const spacingPixels = mmToPixel(spacing);
    // Note: width and height should be available from p5.js global context
    // Using globalThis to access p5.js globals safely
    const canvasWidth = (typeof globalThis !== 'undefined' && globalThis.width) || 800;
    const canvasHeight = (typeof globalThis !== 'undefined' && globalThis.height) || 600;
    
    // Draw horizontal lines
    for (let i = 0; i <= canvasHeight / spacingPixels; i++) {
      const y = i * spacingPixels;
      line(0, y, canvasWidth, y);
    }
    
    // Draw vertical lines  
    for (let j = 0; j <= canvasWidth / spacingPixels; j++) {
      const x = j * spacingPixels + spacingPixels * 0.5;
      line(x, 0, x, canvasHeight);
    }
    
    pop();
  }

  /**
   * Draw embroidery hoop guides with circular outline and center marks
   * @param {number} x - Center X position in mm
   * @param {number} y - Center Y position in mm  
   * @param {Object} hoopSize - Hoop dimensions {width, height} in mm
   * @param {Object} options - Guide styling options
   */
  function drawHoopGuides(x, y, hoopSize, options = {}) {
    const {
      showOutline = true,
      showCenterMarks = true, 
      showPunchPoints = true,
      outlineColor = [102, 102, 102],
      centerMarkColor = [204, 204, 204],
      punchPointColor = [102, 102, 102],
      outlineWeight = 0.5,
      centerMarkWeight = 0.2,
      numPunchPoints = 12,
      alpha = 128
    } = options;

    const radius = Math.min(hoopSize.width, hoopSize.height) / 2;
    const centerX = x;
    const centerY = y;
    
    push();
    
    // Draw circular hoop outline
    if (showOutline) {
      stroke(outlineColor[0], outlineColor[1], outlineColor[2], alpha);
      strokeWeight(mmToPixel(outlineWeight));
      noFill();
      circle(mmToPixel(centerX), mmToPixel(centerY), mmToPixel(radius * 2));
    }
    
    // Draw center cross marks
    if (showCenterMarks) {
      stroke(centerMarkColor[0], centerMarkColor[1], centerMarkColor[2], alpha);
      strokeWeight(mmToPixel(centerMarkWeight));
      
      // Vertical center line
      line(
        mmToPixel(centerX), mmToPixel(centerY - radius),
        mmToPixel(centerX), mmToPixel(centerY + radius)
      );
      
      // Horizontal center line  
      line(
        mmToPixel(centerX - radius), mmToPixel(centerY),
        mmToPixel(centerX + radius), mmToPixel(centerY)
      );
    }
    
    // Draw punch needle points around the circle
    if (showPunchPoints) {
      stroke(punchPointColor[0], punchPointColor[1], punchPointColor[2], alpha + 75);
      fill(punchPointColor[0], punchPointColor[1], punchPointColor[2], alpha + 75);
      
      for (let i = 0; i < numPunchPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPunchPoints;
        const pointX = centerX + radius * Math.cos(angle);
        const pointY = centerY + radius * Math.sin(angle);
        
        // Draw punch needle point (small circle)
        circle(mmToPixel(pointX), mmToPixel(pointY), mmToPixel(1));
        
        // Draw small line extending outward from the point
        const outerRadius = radius + 3;
        const outerX = centerX + outerRadius * Math.cos(angle);
        const outerY = centerY + outerRadius * Math.sin(angle);
        
        strokeWeight(mmToPixel(0.3));
        stroke(punchPointColor[0], punchPointColor[1], punchPointColor[2], alpha + 25);
        line(
          mmToPixel(pointX), mmToPixel(pointY),
          mmToPixel(outerX), mmToPixel(outerY)
        );
      }
    }
    
    pop();
  }

  /**
   * Draw machine hoop (rectangular) with grid
   * @param {number} x - Center X position in mm
   * @param {number} y - Center Y position in mm
   * @param {Object} hoopSize - Hoop dimensions {width, height} in mm
   * @param {Object} options - Hoop styling options
   */
  function drawMachineHoop(x, y, hoopSize, options = {}) {
    const {
      frameColor = [80, 80, 80], // Dark gray frame
      gridColor = [150, 150, 150], // Light gray grid
      frameWeight = 2,
      gridWeight = 0.5,
      gridSpacing = 10, // Grid spacing in mm
      alpha = 180
    } = options;
    
    const halfWidth = hoopSize.width / 2;
    const halfHeight = hoopSize.height / 2;
    const left = x - halfWidth;
    const top = y - halfHeight;
    const right = x + halfWidth;
    const bottom = y + halfHeight;
    
    push();
    
    // Draw machine hoop frame (rectangular)
    stroke(frameColor[0], frameColor[1], frameColor[2], alpha);
    strokeWeight(mmToPixel(frameWeight));
    noFill();
    rect(mmToPixel(left), mmToPixel(top), mmToPixel(hoopSize.width), mmToPixel(hoopSize.height));
    
    // Draw grid inside the hoop
    stroke(gridColor[0], gridColor[1], gridColor[2], alpha * 0.6);
    strokeWeight(mmToPixel(gridWeight));
    
    // Vertical grid lines
    for (let gridX = left + gridSpacing; gridX < right; gridX += gridSpacing) {
      line(mmToPixel(gridX), mmToPixel(top), mmToPixel(gridX), mmToPixel(bottom));
    }
    
    // Horizontal grid lines
    for (let gridY = top + gridSpacing; gridY < bottom; gridY += gridSpacing) {
      line(mmToPixel(left), mmToPixel(gridY), mmToPixel(right), mmToPixel(gridY));
    }
    
    // Draw center crosshairs
    stroke(gridColor[0] - 50, gridColor[1] - 50, gridColor[2] - 50, alpha);
    strokeWeight(mmToPixel(gridWeight * 1.5));
    line(mmToPixel(x - 5), mmToPixel(y), mmToPixel(x + 5), mmToPixel(y)); // Horizontal
    line(mmToPixel(x), mmToPixel(y - 5), mmToPixel(x), mmToPixel(y + 5)); // Vertical
    
    pop();
  }

  /**
   * Draw manual hoop (round bamboo style) with realistic appearance
   * @param {number} x - Center X position in mm
   * @param {number} y - Center Y position in mm
   * @param {Object} hoopSize - Hoop dimensions {width, height} in mm
   * @param {Object} options - Hoop styling options
   */
  function drawManualHoop(x, y, hoopSize, options = {}) {
    const {
      outerColor = [139, 69, 19], // Saddle brown bamboo
      innerColor = [245, 245, 220], // Beige fabric area
      ringColor = [101, 67, 33], // Dark brown
      centerMarkColor = [153, 153, 153],
      outerStroke = 0.5,
      innerStroke = 0.3,
      centerMarkWeight = 0.2,
      ringThickness = 3,
      showCenterMarks = true,
      alpha = 204
    } = options;
    
    const centerX = x;
    const centerY = y;
    const outerRadius = Math.min(hoopSize.width, hoopSize.height) / 2;
    const innerRadius = outerRadius - ringThickness;
    
    push();
    
    // Draw outer bamboo hoop ring
    fill(outerColor[0], outerColor[1], outerColor[2], alpha);
    stroke(ringColor[0], ringColor[1], ringColor[2], alpha);
    strokeWeight(mmToPixel(outerStroke));
    circle(mmToPixel(centerX), mmToPixel(centerY), mmToPixel(outerRadius * 2));
    
    // Draw inner working area (fabric)
    fill(innerColor[0], innerColor[1], innerColor[2], alpha + 25);
    stroke(innerColor[0] - 25, innerColor[1] - 25, innerColor[2] - 25, alpha);
    strokeWeight(mmToPixel(innerStroke));
    circle(mmToPixel(centerX), mmToPixel(centerY), mmToPixel(innerRadius * 2));
    
    // Add center marks for alignment
    if (showCenterMarks) {
      stroke(centerMarkColor[0], centerMarkColor[1], centerMarkColor[2], alpha - 50);
      strokeWeight(mmToPixel(centerMarkWeight));
      
      // Horizontal center mark
      line(
        mmToPixel(centerX - 2), mmToPixel(centerY),
        mmToPixel(centerX + 2), mmToPixel(centerY)
      );
      
      // Vertical center mark
      line(
        mmToPixel(centerX), mmToPixel(centerY - 2),
        mmToPixel(centerX), mmToPixel(centerY + 2)
      );
    }
    
    pop();
  }

  /**
   * Draw hoop based on type (automatically chooses manual or machine hoop)
   * @param {number} x - Center X position in mm
   * @param {number} y - Center Y position in mm
   * @param {Object} hoopSize - Hoop object with dimensions and type info
   * @param {Object} options - Hoop styling options
   */
  function drawHoop(x, y, hoopSize, options = {}) {
    if (hoopSize.type === "manual" || hoopSize.shape === "round") {
      drawManualHoop(x, y, hoopSize, options);
    } else {
      drawMachineHoop(x, y, hoopSize, options);
    }
  }

  /**
   * Draw corner marks for rectangular reference frames
   * @param {number} x - Top-left X position in mm
   * @param {number} y - Top-left Y position in mm
   * @param {number} w - Width in mm
   * @param {number} h - Height in mm
   * @param {Object} options - Corner mark styling options
   */
  function drawCornerMarks(x, y, w, h, options = {}) {
    const {
      markSize = 5,
      color = [102, 102, 102],
      weight = 0.2,
      alpha = 128
    } = options;
    
    push();
    
    stroke(color[0], color[1], color[2], alpha);
    strokeWeight(mmToPixel(weight));
    
    // Top-left corner
    line(mmToPixel(x), mmToPixel(y), mmToPixel(x + markSize), mmToPixel(y));
    line(mmToPixel(x), mmToPixel(y), mmToPixel(x), mmToPixel(y + markSize));
    
    // Top-right corner  
    line(mmToPixel(x + w), mmToPixel(y), mmToPixel(x + w - markSize), mmToPixel(y));
    line(mmToPixel(x + w), mmToPixel(y), mmToPixel(x + w), mmToPixel(y + markSize));
    
    // Bottom-left corner
    line(mmToPixel(x), mmToPixel(y + h), mmToPixel(x + markSize), mmToPixel(y + h));
    line(mmToPixel(x), mmToPixel(y + h), mmToPixel(x), mmToPixel(y + h - markSize));
    
    // Bottom-right corner
    line(mmToPixel(x + w), mmToPixel(y + h), mmToPixel(x + w - markSize), mmToPixel(y + h));
    line(mmToPixel(x + w), mmToPixel(y + h), mmToPixel(x + w), mmToPixel(y + h - markSize));
    
    pop();
  }

  /**
   * Draw paper boundary guides
   * @param {string} paperSize - Paper size key (A4, A3, A2, A1)
   * @param {Object} margins - Margin settings {top, right, bottom, left} in mm
   * @param {Object} options - Paper guide styling options
   */
  function drawPaperGuides(paperSize = "A4", margins = {}, options = {}) {
    const {
      top = 15,
      right = 15, 
      bottom = 15,
      left = 15
    } = margins;
    
    const {
      boundaryColor = [128, 128, 128],
      marginColor = [192, 192, 192],
      weight = 0.3,
      alpha = 100,
      showMargins = true
    } = options;
    
    const paper = PAPER_SIZES[paperSize];
    if (!paper) {
      console.warn(`Invalid paper size: ${paperSize}`);
      return;
    }
    
    push();
    
    // Draw paper boundary
    stroke(boundaryColor[0], boundaryColor[1], boundaryColor[2], alpha);
    strokeWeight(mmToPixel(weight));
    noFill();
    rect(0, 0, mmToPixel(paper.width), mmToPixel(paper.height));
    
    // Draw margin guides
    if (showMargins) {
      stroke(marginColor[0], marginColor[1], marginColor[2], alpha);
      strokeWeight(mmToPixel(weight * 0.7));
      rect(
        mmToPixel(left),
        mmToPixel(top), 
        mmToPixel(paper.width - left - right),
        mmToPixel(paper.height - top - bottom)
      );
    }
    
    pop();
  }

  /**
   * Get hoop preset by name
   * @param {string} presetName - Hoop preset name (4x4, 5x7, etc.)
   * @returns {Object} Hoop size object {width, height} in mm
   */
  function getHoopPreset(presetName) {
    const preset = HOOP_PRESETS[presetName];
    if (!preset) {
      console.warn(`Invalid hoop preset: ${presetName}. Available presets:`, Object.keys(HOOP_PRESETS));
      return HOOP_PRESETS["4x4"]; // Default fallback
    }
    return preset;
  }

  /**
   * Get hoops by brand
   * @param {string} brand - Brand name (bernina, brother)
   * @returns {Array} Array of hoop objects with their keys
   */
  function getHoopsByBrand(brand) {
    return Object.entries(HOOP_PRESETS)
      .filter(([key, hoop]) => hoop.brand === brand)
      .map(([key, hoop]) => ({ key, ...hoop }));
  }

  /**
   * Get hoops by type  
   * @param {string} type - Hoop type (standard, specialty, jumbo, commercial)
   * @returns {Array} Array of hoop objects with their keys
   */
  function getHoopsByType(type) {
    return Object.entries(HOOP_PRESETS)
      .filter(([key, hoop]) => hoop.type === type)
      .map(([key, hoop]) => ({ key, ...hoop }));
  }

  /**
   * Get hoops by size range
   * @param {number} minWidth - Minimum width in mm
   * @param {number} maxWidth - Maximum width in mm  
   * @param {number} minHeight - Minimum height in mm
   * @param {number} maxHeight - Maximum height in mm
   * @returns {Array} Array of hoop objects with their keys that fit the size criteria
   */
  function getHoopsBySize(minWidth = 0, maxWidth = Infinity, minHeight = 0, maxHeight = Infinity) {
    return Object.entries(HOOP_PRESETS)
      .filter(([key, hoop]) => 
        hoop.width >= minWidth && hoop.width <= maxWidth &&
        hoop.height >= minHeight && hoop.height <= maxHeight
      )
      .map(([key, hoop]) => ({ key, ...hoop }));
  }

  /**
   * Find the best hoop for a given design size
   * @param {number} designWidth - Design width in mm
   * @param {number} designHeight - Design height in mm
   * @param {Object} options - Search options
   * @param {string} options.brand - Preferred brand (optional)
   * @param {string} options.type - Preferred type (optional)
   * @param {number} options.margin - Extra margin around design in mm (default: 5)
   * @returns {Object|null} Best matching hoop or null if no suitable hoop found
   */
  function findBestHoop(designWidth, designHeight, options = {}) {
    const { brand, type, margin = 5 } = options;
    const requiredWidth = designWidth + margin * 2;
    const requiredHeight = designHeight + margin * 2;
    
    // Get candidate hoops
    let candidates = Object.entries(HOOP_PRESETS)
      .filter(([key, hoop]) => 
        hoop.width >= requiredWidth && hoop.height >= requiredHeight
      )
      .map(([key, hoop]) => ({ key, ...hoop }));
    
    // Filter by brand if specified
    if (brand) {
      candidates = candidates.filter(hoop => hoop.brand === brand);
    }
    
    // Filter by type if specified
    if (type) {
      candidates = candidates.filter(hoop => hoop.type === type);
    }
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort by total area (smallest suitable hoop first)
    candidates.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    
    return candidates[0];
  }

  /**
   * Get all available hoop brands
   * @returns {Array} Array of unique brand names
   */
  function getHoopBrands() {
    const brands = new Set();
    Object.values(HOOP_PRESETS).forEach(hoop => {
      if (hoop.brand) brands.add(hoop.brand);
    });
    return Array.from(brands).sort();
  }

  /**
   * Get all available hoop types
   * @returns {Array} Array of unique hoop types
   */
  function getHoopTypes() {
    const types = new Set();
    Object.values(HOOP_PRESETS).forEach(hoop => {
      if (hoop.type) types.add(hoop.type);
    });
    return Array.from(types).sort();
  }

  /**
   * Get paper size by name
   * @param {string} paperName - Paper size name (A4, A3, etc.)
   * @returns {Object} Paper size object {width, height} in mm
   */
  function getPaperSize(paperName) {
    const paper = PAPER_SIZES[paperName];
    if (!paper) {
      console.warn(`Invalid paper size: ${paperName}. Available sizes:`, Object.keys(PAPER_SIZES));
      return PAPER_SIZES["A4"]; // Default fallback
    }
    return paper;
  }

  /**
   * Draw a complete embroidery workspace with hoop, grid, and guides
   * @param {Object} config - Workspace configuration
   */
  function drawEmbroideryWorkspace(config = {}) {
    const {
      hoopPreset = "4x4",
      hoopPosition = null, // Auto-center if null
      gridSpacing = 10,
      showGrid = true,
      showHoopGuides = true,
      showHoop = false,
      showCornerMarks = true,
      paperSize = "A4",
      margins = { top: 15, right: 15, bottom: 15, left: 15 }
    } = config;
    
    // Get hoop and paper sizes
    const hoop = getHoopPreset(hoopPreset);
    const paper = getPaperSize(paperSize);
    
    // Calculate hoop position (center by default)
    let hoopX, hoopY;
    if (hoopPosition) {
      hoopX = hoopPosition.x;
      hoopY = hoopPosition.y;
    } else {
      // Center hoop in the available area
      const availableWidth = paper.width - margins.left - margins.right;
      const availableHeight = paper.height - margins.top - margins.bottom;
      hoopX = margins.left + availableWidth / 2;
      hoopY = margins.top + availableHeight / 2;
    }
    
    // Draw components in order
    if (showGrid) {
      drawGrid(gridSpacing);
    }
    
    if (showHoop) {
      drawHoop(hoopX, hoopY, hoop);
    }
    
    if (showHoopGuides) {
      drawHoopGuides(hoopX, hoopY, hoop);
    }
    
    if (showCornerMarks) {
      drawCornerMarks(margins.left, margins.top, 
        paper.width - margins.left - margins.right,
        paper.height - margins.top - margins.bottom);
    }
  }

  // p5.js SVG Writer for Embroidery Patterns

  class SVGWriter {
    constructor() {
      this.data = [];
      this.currentX = 0;
      this.currentY = 0;
      this.minX = Infinity;
      this.maxX = -Infinity;
      this.minY = Infinity;
      this.maxY = -Infinity;
      this.options = {
        paperSize: "A4",
        dpi: 300,
        hoopSize: { width: 100, height: 100 },
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        showGuides: true,
        showHoop: true,
        lifeSize: true,
      };
    }

    // Use imported constants
    static PAPER_SIZES = PAPER_SIZES;
    static HOOP_PRESETS = HOOP_PRESETS;

    setOptions(options = {}) {
      this.options = { ...this.options, ...options };
    }

    addComment(comment) {
      this.data.push(`<!-- ${comment} -->`);
    }

    move(x, y) {
      if (x !== null && y !== null) {
        this.currentX = x;
        this.currentY = y;
        this.minX = Math.min(this.minX, x);
        this.maxX = Math.max(this.maxX, x);
        this.minY = Math.min(this.minY, y);
        this.maxY = Math.max(this.maxY, y);
      }
    }

    generateSVG(stitchData, title) {
      const paper = SVGWriter.PAPER_SIZES[this.options.paperSize];
      if (!paper) {
        throw new Error(`Invalid paper size: ${this.options.paperSize}`);
      }

      // Calculate coordinate system
      const mmToUnits = this.options.dpi / 25.4; // 25.4mm = 1 inch
      const paperWidth = paper.width * mmToUnits;
      const paperHeight = paper.height * mmToUnits;
      const marginLeft = this.options.margins.left * mmToUnits;
      const marginTop = this.options.margins.top * mmToUnits;

      // Start SVG
      this.data = [];
      this.data.push('<?xml version="1.0" encoding="UTF-8"?>');
      this.data.push(`<svg xmlns="http://www.w3.org/2000/svg" 
      width="${paperWidth}" height="${paperHeight}" 
      viewBox="0 0 ${paperWidth} ${paperHeight}">`);

      // Add title and metadata
      this.addComment(`TITLE: ${title}`);
      this.addComment(`PAPER_SIZE: ${this.options.paperSize}`);
      this.addComment(`DPI: ${this.options.dpi}`);
      this.addComment(`HOOP_SIZE: ${this.options.hoopSize.width}x${this.options.hoopSize.height}mm`);

      // Add coordinate system transformation
      this.data.push(`<g transform="translate(${marginLeft}, ${marginTop}) scale(${mmToUnits}, ${mmToUnits})">`);

      // Draw embroidery hoop if enabled
      if (this.options.showHoop) {
        this.drawHoop();
      }

      // Draw guides if enabled
      if (this.options.showGuides) {
        this.drawGuides();
      }

      // Draw embroidery patterns
      this.drawEmbroideryPatterns(stitchData);

      // Close groups
      this.data.push("</g>");
      this.data.push("</svg>");

      return this.data.join("\n");
    }

    drawGuides() {
      const hoop = this.options.hoopSize;
      const centerX = hoop.width / 2;
      const centerY = hoop.height / 2;
      const radius = Math.min(hoop.width, hoop.height) / 2;

      // Draw circular hoop outline
      this.data.push(`<circle cx="${centerX}" cy="${centerY}" r="${radius}" 
      fill="none" stroke="#666666" stroke-width="0.5" opacity="0.5"/>`);

      // Draw center cross marks
      this.data.push(`<line x1="${centerX}" y1="${centerY - radius}" x2="${centerX}" y2="${centerY + radius}" 
      stroke="#cccccc" stroke-width="0.2" opacity="0.5"/>`);
      this.data.push(`<line x1="${centerX - radius}" y1="${centerY}" x2="${centerX + radius}" y2="${centerY}" 
      stroke="#cccccc" stroke-width="0.2" opacity="0.5"/>`);

      // Draw punch needle points around the circle
      const numPoints = 12; // Number of punch needle points
      for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        // Draw punch needle point (small circle)
        this.data.push(`<circle cx="${x}" cy="${y}" r="1" 
        fill="#666666" stroke="none" opacity="0.8"/>`);

        // Draw small line extending outward from the point
        const outerRadius = radius + 3;
        const outerX = centerX + outerRadius * Math.cos(angle);
        const outerY = centerY + outerRadius * Math.sin(angle);
        this.data.push(`<line x1="${x}" y1="${y}" x2="${outerX}" y2="${outerY}" 
        stroke="#666666" stroke-width="0.3" opacity="0.6"/>`);
      }

      // Draw corner marks for rectangular reference
      const markSize = 5;
      this.data.push(`<line x1="0" y1="0" x2="${markSize}" y2="0" stroke="#666666" stroke-width="0.2"/>`);
      this.data.push(`<line x1="0" y1="0" x2="0" y2="${markSize}" stroke="#666666" stroke-width="0.2"/>`);
      this.data.push(
        `<line x1="${hoop.width}" y1="0" x2="${hoop.width - markSize}" y2="0" stroke="#666666" stroke-width="0.2"/>`,
      );
      this.data.push(
        `<line x1="${hoop.width}" y1="0" x2="${hoop.width}" y2="${markSize}" stroke="#666666" stroke-width="0.2"/>`,
      );
      this.data.push(
        `<line x1="0" y1="${hoop.height}" x2="${markSize}" y2="${hoop.height}" stroke="#666666" stroke-width="0.2"/>`,
      );
      this.data.push(
        `<line x1="0" y1="${hoop.height}" x2="0" y2="${hoop.height - markSize}" stroke="#666666" stroke-width="0.2"/>`,
      );
      this.data.push(
        `<line x1="${hoop.width}" y1="${hoop.height}" x2="${hoop.width - markSize}" y2="${hoop.height}" stroke="#666666" stroke-width="0.2"/>`,
      );
      this.data.push(
        `<line x1="${hoop.width}" y1="${hoop.height}" x2="${hoop.width}" y2="${hoop.height - markSize}" stroke="#666666" stroke-width="0.2"/>`,
      );
    }

    drawHoop() {
      const hoop = this.options.hoopSize;
      const centerX = hoop.width / 2;
      const centerY = hoop.height / 2;

      // Draw outer hoop ring (wood/plastic)
      const outerRadius = Math.min(hoop.width, hoop.height) / 2;
      const innerRadius = outerRadius - 3; // 3mm thick hoop ring

      // Outer ring
      this.data.push(`<circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" 
      fill="#8B4513" stroke="#654321" stroke-width="0.5" opacity="0.8"/>`);

      // Inner ring (working area)
      this.data.push(`<circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" 
      fill="#F5F5DC" stroke="#D2B48C" stroke-width="0.3" opacity="0.9"/>`);

      // Add center marks for alignment
      this.data.push(`<line x1="${centerX - 2}" y1="${centerY}" x2="${centerX + 2}" y2="${centerY}" 
      stroke="#999999" stroke-width="0.2" opacity="0.6"/>`);
      this.data.push(`<line x1="${centerX}" y1="${centerY - 2}" x2="${centerX}" y2="${centerY + 2}" 
      stroke="#999999" stroke-width="0.2" opacity="0.6"/>`);
    }

    drawEmbroideryPatterns(stitchData) {
      if (!stitchData || !stitchData.threads) {
        this.addComment("No embroidery data to draw");
        return;
      }

      // Get pattern bounds to center it in the hoop
      const bounds = this.getPatternBounds(stitchData);
      const hoop = this.options.hoopSize;
      const hoopCenterX = hoop.width / 2;
      const hoopCenterY = hoop.height / 2;
      const patternCenterX = bounds.x + bounds.width / 2;
      const patternCenterY = bounds.y + bounds.height / 2;

      // Calculate offset to center pattern in hoop
      const offsetX = hoopCenterX - patternCenterX;
      const offsetY = hoopCenterY - patternCenterY;

      for (let threadIndex = 0; threadIndex < stitchData.threads.length; threadIndex++) {
        const thread = stitchData.threads[threadIndex];

        // Set thread color
        const color = this.getThreadColor(thread.color);

        for (const run of thread.runs) {
          if (run.length < 2) continue;

          // Create path for stitch run with centering offset
          let pathData = `M ${run[0].x + offsetX} ${run[0].y + offsetY}`;
          for (let i = 1; i < run.length; i++) {
            pathData += ` L ${run[i].x + offsetX} ${run[i].y + offsetY}`;
          }

          this.data.push(
            `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="0.1" stroke-linecap="round"/>`,
          );

          // Draw red dots for each stitch point with centering offset
          for (const stitch of run) {
            this.data.push(`<circle cx="${stitch.x + offsetX}" cy="${stitch.y + offsetY}" r="0.3" 
            fill="#ff0000" stroke="none" opacity="0.8"/>`);
          }
        }
      }
    }

    getThreadColor(threadColor) {
      if (threadColor && threadColor.r !== undefined && threadColor.g !== undefined && threadColor.b !== undefined) {
        return `rgb(${threadColor.r}, ${threadColor.g}, ${threadColor.b})`;
      }
      return "#000000"; // Default black
    }

    saveSVG(stitchData, title, filename) {
      try {
        const svgContent = this.generateSVG(stitchData, title);
        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename || "embroidery-pattern.svg";
        link.click();
        setTimeout(() => {
          URL.revokeObjectURL(link.href);
          document.body.removeChild(link);
        }, 100);

        console.log(`🪡 p5.embroider says: SVG exported successfully: ${filename}`);
      } catch (error) {
        console.error("🪡 p5.embroider says: Error exporting SVG:", error);
        throw error;
      }
    }

    // Generate PNG from SVG using canvas
    async generatePNG(stitchData, title, filename) {
      try {
        const svgContent = this.generateSVG(stitchData, title);

        // Create canvas to convert SVG to PNG
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas size based on paper size
        const paper = SVGWriter.PAPER_SIZES[this.options.paperSize];
        const mmToUnits = this.options.dpi / 25.4;
        canvas.width = paper.width * mmToUnits;
        canvas.height = paper.height * mmToUnits;

        // Create image from SVG
        const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        return new Promise((resolve, reject) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = filename || "embroidery-pattern.png";
              link.click();
              setTimeout(() => {
                URL.revokeObjectURL(link.href);
                document.body.removeChild(link);
              }, 100);

              console.log(`🪡 p5.embroider says: PNG exported successfully: ${filename}`);
              resolve();
            }, "image/png");
          };
          img.onerror = reject;
          img.src = url;
        });
      } catch (error) {
        console.error("🪡 p5.embroider says: Error exporting PNG:", error);
        throw error;
      }
    }

    // Get pattern bounds
    getPatternBounds(stitchData) {
      if (!stitchData || !stitchData.threads) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }

      let minX = Infinity,
        minY = Infinity;
      let maxX = -Infinity,
        maxY = -Infinity;

      for (const thread of stitchData.threads) {
        for (const run of thread.runs) {
          for (const stitch of run) {
            minX = Math.min(minX, stitch.x);
            minY = Math.min(minY, stitch.y);
            maxX = Math.max(maxX, stitch.x);
            maxY = Math.max(maxY, stitch.y);
          }
        }
      }

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    // Validate options
    validateOptions() {
      const paper = SVGWriter.PAPER_SIZES[this.options.paperSize];
      if (!paper) {
        throw new Error(`Invalid paper size: ${this.options.paperSize}`);
      }

      if (this.options.dpi < 72 || this.options.dpi > 600) {
        throw new Error(`DPI must be between 72 and 600, got: ${this.options.dpi}`);
      }

      if (this.options.hoopSize.width <= 0 || this.options.hoopSize.height <= 0) {
        throw new Error(`Invalid hoop size: ${this.options.hoopSize.width}x${this.options.hoopSize.height}`);
      }

      // Check if hoop fits on paper
      const hoopArea = this.options.hoopSize.width * this.options.hoopSize.height;
      const paperArea = paper.width * paper.height;
      const marginArea =
        (this.options.margins.top + this.options.margins.bottom) *
        (this.options.margins.left + this.options.margins.right);

      if (hoopArea > paperArea - marginArea) {
        console.warn(`🪡 p5.embroider says: Hoop size may be too large for selected paper size`);
      }
    }
  }

  // p5.js JSON Writer for Embroidery Patterns
  class JSONWriter {
    constructor() {
      this.options = {
        includeBounds: true,
        includeMetadata: true,
        precision: 2,
        compactOutput: false,
      };
    }

    setOptions(options = {}) {
      this.options = { ...this.options, ...options };
    }

    generateJSON(stitchData, title = "Untitled Pattern") {
      if (!stitchData || !stitchData.threads) {
        throw new Error("Invalid stitch data: threads array is required");
      }

      const jsonData = {
        format: "p5.embroider",
        version: "1.0",
        title: title,
        timestamp: new Date().toISOString(),
      };

      // Add metadata if enabled
      if (this.options.includeMetadata) {
        jsonData.metadata = this.generateMetadata(stitchData);
      }

      // Add bounds if enabled
      if (this.options.includeBounds) {
        jsonData.bounds = this.calculateBounds(stitchData);
      }

      // Process threads
      jsonData.threads = this.processThreads(stitchData.threads);

      // Add statistics
      jsonData.statistics = this.calculateStatistics(stitchData);

      return this.options.compactOutput ? JSON.stringify(jsonData) : JSON.stringify(jsonData, null, 2);
    }

    generateMetadata(stitchData) {
      return {
        totalThreads: stitchData.threads ? stitchData.threads.length : 0,
        totalStitches: this.getTotalStitchCount(stitchData),
        totalRuns: this.getTotalRunCount(stitchData),
        createdBy: "p5.embroider",
        units: "pixels",
        coordinateSystem: "cartesian",
      };
    }

    processThreads(threads) {
      return threads.map((thread, threadIndex) => {
        const threadData = {
          id: threadIndex,
          color: this.processColor(thread.color),
          weight: thread.weight || 0.2,
          runs: [],
          statistics: {
            totalStitches: 0,
            totalRuns: thread.runs ? thread.runs.length : 0,
            totalDistance: 0,
          },
        };

        if (thread.runs) {
          threadData.runs = thread.runs.map((run, runIndex) => {
            const runData = {
              id: runIndex,
              stitches: this.processStitches(run),
              statistics: {
                stitchCount: run.length,
                distance: this.calculateRunDistance(run),
              },
            };

            threadData.statistics.totalStitches += run.length;
            threadData.statistics.totalDistance += runData.statistics.distance;

            return runData;
          });
        }

        return threadData;
      });
    }

    processColor(color) {
      if (!color) {
        return { r: 0, g: 0, b: 0, hex: "#000000" };
      }

      if (typeof color === "string") {
        return { hex: color };
      }

      if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
        return {
          r: Math.round(color.r),
          g: Math.round(color.g),
          b: Math.round(color.b),
          hex: this.rgbToHex(color.r, color.g, color.b),
        };
      }

      return { r: 0, g: 0, b: 0, hex: "#000000" };
    }

    processStitches(run) {
      if (!Array.isArray(run)) {
        return [];
      }

      return run.map((stitch, index) => ({
        index: index,
        x: this.roundToPrecision(stitch.x),
        y: this.roundToPrecision(stitch.y),
        type: stitch.type || "normal",
      }));
    }

    calculateBounds(stitchData) {
      if (!stitchData.threads || stitchData.threads.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
      }

      let minX = Infinity,
        minY = Infinity;
      let maxX = -Infinity,
        maxY = -Infinity;

      for (const thread of stitchData.threads) {
        if (thread.runs) {
          for (const run of thread.runs) {
            for (const stitch of run) {
              minX = Math.min(minX, stitch.x);
              minY = Math.min(minY, stitch.y);
              maxX = Math.max(maxX, stitch.x);
              maxY = Math.max(maxY, stitch.y);
            }
          }
        }
      }

      return {
        minX: this.roundToPrecision(minX),
        minY: this.roundToPrecision(minY),
        maxX: this.roundToPrecision(maxX),
        maxY: this.roundToPrecision(maxY),
        width: this.roundToPrecision(maxX - minX),
        height: this.roundToPrecision(maxY - minY),
      };
    }

    calculateStatistics(stitchData) {
      const stats = {
        totalThreads: 0,
        totalRuns: 0,
        totalStitches: 0,
        totalDistance: 0,
        averageStitchLength: 0,
        colorPalette: [],
      };

      if (!stitchData.threads) {
        return stats;
      }

      stats.totalThreads = stitchData.threads.length;
      const colors = new Set();

      for (const thread of stitchData.threads) {
        if (thread.color) {
          const colorHex = this.processColor(thread.color).hex;
          colors.add(colorHex);
        }

        if (thread.runs) {
          stats.totalRuns += thread.runs.length;

          for (const run of thread.runs) {
            stats.totalStitches += run.length;
            stats.totalDistance += this.calculateRunDistance(run);
          }
        }
      }

      stats.colorPalette = Array.from(colors);
      stats.averageStitchLength =
        stats.totalStitches > 1
          ? this.roundToPrecision(stats.totalDistance / (stats.totalStitches - stats.totalRuns))
          : 0;
      stats.totalDistance = this.roundToPrecision(stats.totalDistance);

      return stats;
    }

    calculateRunDistance(run) {
      if (!Array.isArray(run) || run.length < 2) {
        return 0;
      }

      let distance = 0;
      for (let i = 1; i < run.length; i++) {
        const dx = run[i].x - run[i - 1].x;
        const dy = run[i].y - run[i - 1].y;
        distance += Math.sqrt(dx * dx + dy * dy);
      }

      return distance;
    }

    getTotalStitchCount(stitchData) {
      if (!stitchData.threads) return 0;

      return stitchData.threads.reduce((total, thread) => {
        if (!thread.runs) return total;
        return total + thread.runs.reduce((threadTotal, run) => threadTotal + run.length, 0);
      }, 0);
    }

    getTotalRunCount(stitchData) {
      if (!stitchData.threads) return 0;

      return stitchData.threads.reduce((total, thread) => {
        return total + (thread.runs ? thread.runs.length : 0);
      }, 0);
    }

    roundToPrecision(value) {
      const factor = Math.pow(10, this.options.precision);
      return Math.round(value * factor) / factor;
    }

    rgbToHex(r, g, b) {
      const toHex = (c) => {
        const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    saveJSON(stitchData, title, filename) {
      try {
        const jsonContent = this.generateJSON(stitchData, title);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename || "embroidery-pattern.json";
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          URL.revokeObjectURL(link.href);
          document.body.removeChild(link);
        }, 100);

        console.log(`🪡 p5.embroider says: JSON exported successfully: ${filename}`);
        return jsonContent;
      } catch (error) {
        console.error("🪡 p5.embroider says: Error exporting JSON:", error);
        throw error;
      }
    }

    // Parse JSON back to stitch data format
    parseJSON(jsonString) {
      try {
        const data = JSON.parse(jsonString);

        if (data.format !== "p5.embroider") {
          console.warn("🪡 p5.embroider says: JSON format may not be compatible");
        }

        const stitchData = {
          threads: [],
        };

        if (data.threads && Array.isArray(data.threads)) {
          stitchData.threads = data.threads.map((thread) => ({
            color: thread.color,
            weight: thread.weight || 0.2,
            runs: thread.runs
              ? thread.runs.map((run) =>
                  run.stitches
                    ? run.stitches.map((stitch) => ({
                        x: stitch.x,
                        y: stitch.y,
                        type: stitch.type,
                      }))
                    : [],
                )
              : [],
          }));
        }

        return stitchData;
      } catch (error) {
        console.error("🪡 p5.embroider says: Error parsing JSON:", error);
        throw error;
      }
    }

    // Validate JSON structure
    validateJSON(jsonData) {
      const errors = [];

      if (typeof jsonData !== "object") {
        errors.push("Root must be an object");
        return errors;
      }

      if (!jsonData.threads || !Array.isArray(jsonData.threads)) {
        errors.push("Missing or invalid threads array");
      }

      if (jsonData.threads) {
        jsonData.threads.forEach((thread, threadIndex) => {
          if (!thread.runs || !Array.isArray(thread.runs)) {
            errors.push(`Thread ${threadIndex}: Missing or invalid runs array`);
          }

          if (thread.runs) {
            thread.runs.forEach((run, runIndex) => {
              if (!run.stitches || !Array.isArray(run.stitches)) {
                errors.push(`Thread ${threadIndex}, Run ${runIndex}: Missing or invalid stitches array`);
              }

              if (run.stitches) {
                run.stitches.forEach((stitch, stitchIndex) => {
                  if (typeof stitch.x !== "number" || typeof stitch.y !== "number") {
                    errors.push(`Thread ${threadIndex}, Run ${runIndex}, Stitch ${stitchIndex}: Invalid coordinates`);
                  }
                });
              }
            });
          }
        });
      }

      return errors;
    }
  }

  /**
   * p5.embroider Preview Viewport Utilities
   * Provides scrollable and scalable preview viewport for embroidery design
   * Call setupPreviewViewport() before beginRecord() to enable pan/zoom preview
   */

  // Global preview state
  let _previewState = {
    enabled: false,
    scale: 1,
    panX: 0,
    panY: 0,
    minScale: 0.1,
    maxScale: 10,
    isDragging: false,
    isDraggingSlider: false,
    lastMouseX: 0,
    lastMouseY: 0,
    centerX: 0,
    centerY: 0
  };

  /**
   * Initialize preview viewport system  
   * Call this at the start of draw() to enable pan/zoom functionality
   * @param {Object} options - Viewport configuration
   * @param {number} options.scale - Initial scale (default: 1)
   * @param {number} options.panX - Initial pan X offset (default: 0)
   * @param {number} options.panY - Initial pan Y offset (default: 0) 
   * @param {number} options.minScale - Minimum zoom scale (default: 0.1)
   * @param {number} options.maxScale - Maximum zoom scale (default: 10)
   * @param {number} options.centerX - Center X for scaling (default: width/2)
   * @param {number} options.centerY - Center Y for scaling (default: height/2)
   */
  function setupPreviewViewport(options = {}) {
    // Update state but don't apply transformation yet
    if (!_previewState.enabled) {
      _previewState.enabled = true;
      _previewState.scale = options.scale || _previewState.scale || 1;
      _previewState.panX = options.panX !== undefined ? options.panX : _previewState.panX;
      _previewState.panY = options.panY !== undefined ? options.panY : _previewState.panY;
      _previewState.minScale = options.minScale || 0.1;
      _previewState.maxScale = options.maxScale || 10;
      _previewState.centerX = options.centerX || (typeof width !== 'undefined' ? width / 2 : 400);
      _previewState.centerY = options.centerY || (typeof height !== 'undefined' ? height / 2 : 300);
    }
    
    // Apply the preview transformation
    push();
    translate(_previewState.centerX + _previewState.panX, _previewState.centerY + _previewState.panY);
    scale(_previewState.scale);
    translate(-_previewState.centerX, -_previewState.centerY);
  }

  /**
   * End preview viewport transformation
   * Call this at the end of draw() to restore normal coordinate system
   */
  function endPreviewViewport() {
    if (_previewState.enabled) {
      pop();
    }
  }

  /**
   * Handle mouse wheel zooming (call from mouseWheel event)
   * @param {Object} event - Mouse wheel event
   */
  function handlePreviewZoom(event) {
    if (!_previewState.enabled) return;
    
    // Prevent default scrolling
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    
    const zoomFactor = 1.1;
    const delta = event ? event.delta : 0;
    const oldScale = _previewState.scale;
    
    // Calculate new scale
    let newScale;
    if (delta > 0) {
      newScale = oldScale / zoomFactor;
    } else {
      newScale = oldScale * zoomFactor;
    }
    
    // Clamp scale to limits
    newScale = Math.max(_previewState.minScale, Math.min(_previewState.maxScale, newScale));
    
    if (newScale !== oldScale) {
      // Get mouse position relative to canvas center
      const mouseFromCenterX = mouseX - _previewState.centerX;
      const mouseFromCenterY = mouseY - _previewState.centerY;
      
      // Calculate world position under mouse cursor before zoom
      const worldX = (mouseFromCenterX - _previewState.panX) / oldScale;
      const worldY = (mouseFromCenterY - _previewState.panY) / oldScale;
      
      // Update scale
      _previewState.scale = newScale;
      
      // Adjust pan so the same world point is still under the mouse
      _previewState.panX = mouseFromCenterX - worldX * newScale;
      _previewState.panY = mouseFromCenterY - worldY * newScale;
    }
    
    return false; // Prevent default
  }

  /**
   * Handle mouse dragging for panning (call from mouseDragged event)
   */
  function handlePreviewPan() {
    if (!_previewState.enabled) return;
    
    if (_previewState.isDragging) {
      const dx = mouseX - _previewState.lastMouseX;
      const dy = mouseY - _previewState.lastMouseY;
      
      _previewState.panX += dx;
      _previewState.panY += dy;
    }
    
    _previewState.lastMouseX = mouseX;
    _previewState.lastMouseY = mouseY;
  }

  /**
   * Start panning (call from mousePressed event)
   * @param {boolean} condition - Optional condition to enable panning (e.g., specific key held)
   */
  function startPreviewPan(condition = true) {
    if (!_previewState.enabled || !condition) return;
    
    _previewState.isDragging = true;
    _previewState.lastMouseX = mouseX;
    _previewState.lastMouseY = mouseY;
  }

  /**
   * Stop panning (call from mouseReleased event)
   */
  function stopPreviewPan() {
    _previewState.isDragging = false;
  }

  /**
   * Reset viewport to default position and scale
   */
  function resetPreviewViewport() {
    _previewState.scale = 1;
    _previewState.panX = 0;
    _previewState.panY = 0;
  }

  /**
   * Fit content to viewport
   * @param {Object} bounds - Content bounds {x, y, width, height} in mm
   * @param {number} padding - Padding around content in pixels (default: 50)
   */
  function fitPreviewToContent(bounds, padding = 50) {
    if (!bounds) return;
    
    const canvasWidth = typeof width !== 'undefined' ? width : 800;
    const canvasHeight = typeof height !== 'undefined' ? height : 600;
    
    // Convert bounds to pixels
    const contentWidthPx = mmToPixel(bounds.width);
    const contentHeightPx = mmToPixel(bounds.height);
    
    // Calculate scale to fit content with padding
    const scaleX = (canvasWidth - padding * 2) / contentWidthPx;
    const scaleY = (canvasHeight - padding * 2) / contentHeightPx;
    const fitScale = Math.min(scaleX, scaleY);
    
    // Clamp to limits
    _previewState.scale = Math.max(_previewState.minScale, Math.min(_previewState.maxScale, fitScale));
    
    // Center the content
    const contentCenterXPx = mmToPixel(bounds.x + bounds.width / 2);
    const contentCenterYPx = mmToPixel(bounds.y + bounds.height / 2);
    
    _previewState.panX = -contentCenterXPx * _previewState.scale + _previewState.centerX;
    _previewState.panY = -contentCenterYPx * _previewState.scale + _previewState.centerY;
  }

  /**
   * Get current preview state (for debugging or UI display)
   */
  function getPreviewState() {
    return { ..._previewState };
  }

  /**
   * Convert screen coordinates to world coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object} World coordinates {x, y}
   */
  function screenToWorld(screenX, screenY) {
    if (!_previewState.enabled) {
      return { x: screenX, y: screenY };
    }
    
    const worldX = (screenX - _previewState.centerX - _previewState.panX) / _previewState.scale + _previewState.centerX;
    const worldY = (screenY - _previewState.centerY - _previewState.panY) / _previewState.scale + _previewState.centerY;
    
    return { x: worldX, y: worldY };
  }

  /**
   * Convert world coordinates to screen coordinates  
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Object} Screen coordinates {x, y}
   */
  function worldToScreen(worldX, worldY) {
    if (!_previewState.enabled) {
      return { x: worldX, y: worldY };
    }
    
    const screenX = _previewState.centerX + (worldX - _previewState.centerX) * _previewState.scale + _previewState.panX;
    const screenY = _previewState.centerY + (worldY - _previewState.centerY) * _previewState.scale + _previewState.panY;
    
    return { x: screenX, y: screenY };
  }

  /**
   * Draw preview controls - call AFTER endPreviewViewport()
   * Styled like SVG input example with vertical slider and reset button
   * @param {Object} options - UI options
   */
  function drawPreviewControls(options = {}) {
    const {
      showSlider = true,
      showResetButton = true
    } = options;
    
    if (!_previewState.enabled) return;
    
    // Get UI layout (matching SVG input exactly)
    const ui = getPreviewUIRects();
    
    noStroke();
    
    // Draw reset/recenter button (matching SVG input style)
    if (showResetButton) {
      fill(245);
      rect(ui.recenter.x, ui.recenter.y, ui.recenter.w, ui.recenter.h, 4);
      
      // Draw crosshair icon
      fill(50);
      const cx = ui.recenter.x + ui.recenter.w / 2;
      const cy = ui.recenter.y + ui.recenter.h / 2;
      rect(cx - 6, cy - 1, 12, 2, 1);
      rect(cx - 1, cy - 6, 2, 12, 1);
    }
    
    // Draw vertical zoom slider (matching SVG input style)
    if (showSlider) {
      // Slider track
      fill(235);
      rect(ui.sliderTrack.x, ui.sliderTrack.y, ui.sliderTrack.w, ui.sliderTrack.h, 4);
      
      // Calculate knob position based on scale (matching SVG input mapping)
      const t = Math.max(0, Math.min(1, (_previewState.scale - _previewState.minScale) / (_previewState.maxScale - _previewState.minScale)));
      const knobY = ui.sliderTrack.y + (1 - t) * (ui.sliderTrack.h - 14);
      
      // Slider knob
      fill(80);
      rect(ui.sliderTrack.x - 4, knobY, ui.sliderTrack.w + 8, 14, 6);
    }
    
    return ui;
  }

  /**
   * Get preview UI layout rectangles (matching SVG input exactly)
   * @returns {Object} UI element rectangles
   */
  function getPreviewUIRects() {
    const canvasWidth = (typeof globalThis !== 'undefined' && globalThis.width) || 800;
    const canvasHeight = (typeof globalThis !== 'undefined' && globalThis.height) || 600;
    
    const margin = 40;
    const sliderWidth = 10;
    const knobHeight = 14;
    const recenterSize = 24;
    const recenterX = canvasWidth - margin - recenterSize;
    const recenterY = margin;
    const spacing = 8;
    
    // Center slider under recenter button
    const sliderX = recenterX + (recenterSize - sliderWidth) / 2;
    const sliderY = recenterY + recenterSize + spacing;
    const sliderHeight = Math.max(100, canvasHeight - sliderY - margin);
    
    return {
      sliderTrack: { x: sliderX, y: sliderY, w: sliderWidth, h: sliderHeight },
      sliderKnob: { x: sliderX - 4, y: sliderY, w: sliderWidth + 8, h: knobHeight },
      recenter: { x: recenterX, y: recenterY, w: recenterSize, h: recenterSize }
    };
  }

  /**
   * Check if point is inside rectangle
   * @param {number} px - Point X
   * @param {number} py - Point Y  
   * @param {Object} rect - Rectangle {x, y, w, h}
   * @returns {boolean} True if point is inside rectangle
   */
  function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  /**
   * Handle mouse press on preview controls
   * Call this from mousePressed() after checking if mouse is over controls
   * @param {number} mouseX - Mouse X coordinate
   * @param {number} mouseY - Mouse Y coordinate
   * @returns {boolean} True if controls handled the event
   */
  function handlePreviewControlsPressed(mouseX, mouseY) {
    if (!_previewState.enabled) return false;
    
    const ui = getPreviewUIRects();
    
    // Check recenter button
    if (pointInRect(mouseX, mouseY, ui.recenter)) {
      resetPreviewViewport();
      return true;
    }
    
    // Check slider track
    if (pointInRect(mouseX, mouseY, ui.sliderTrack)) {
      updateScaleFromMouse(mouseY);
      _previewState.isDraggingSlider = true;
      return true;
    }
    
    return false;
  }

  /**
   * Handle mouse drag on preview controls
   * Call this from mouseDragged() 
   * @param {number} mouseY - Mouse Y coordinate
   */
  function handlePreviewControlsDragged(mouseY) {
    if (!_previewState.enabled || !_previewState.isDraggingSlider) return;
    
    updateScaleFromMouse(mouseY);
  }

  /**
   * Handle mouse release on preview controls
   * Call this from mouseReleased()
   */
  function handlePreviewControlsReleased() {
    _previewState.isDraggingSlider = false;
  }

  /**
   * Update scale from mouse Y position on slider
   * @param {number} mouseY - Mouse Y coordinate
   */
  function updateScaleFromMouse(mouseY) {
    const ui = getPreviewUIRects();
    const t = Math.max(0, Math.min(1, (mouseY - ui.sliderTrack.y) / (ui.sliderTrack.h - 14)));
    const targetScale = _previewState.maxScale + t * (_previewState.minScale - _previewState.maxScale);
    
    const oldScale = _previewState.scale;
    const newScale = Math.max(_previewState.minScale, Math.min(_previewState.maxScale, targetScale));
    
    if (newScale !== oldScale) {
      // For slider zoom, keep the current view center stable
      // This provides predictable behavior when using the slider
      const scaleDelta = newScale / oldScale;
      
      // Adjust pan to keep current view centered
      _previewState.panX *= scaleDelta;
      _previewState.panY *= scaleDelta;
      _previewState.scale = newScale;
    }
  }

  let _DEBUG = false;

  // Allow external control of debug mode
  if (typeof window !== "undefined" && window._DEBUG !== undefined) {
    _DEBUG = window._DEBUG;
  }

  // Expose debug control
  function setDebugMode(enabled) {
    _DEBUG = enabled;
    if (typeof window !== "undefined") {
      window._DEBUG = enabled;
    }
  }

  (function (global) {
    const p5embroidery = global.p5embroidery || {};

    // Internal properties
    let _p5Instance;
    let _recording = false;
    let _drawMode = "stitch"; // 'stitch', 'p5', 'realistic'
    let _stitchData = {
      width: 0,
      height: 0,
      threads: [],
      pixelsPerUnit: 1,
      stitchCount: 0,
    };

    // Vertex properties
    let _shapeKind = null;
    let _vertices = [];
    let _contourVertices = [];
    let _contours = [];
    let _currentContour = [];
    let _isContour = false;

    let _strokeThreadIndex = 0;
    let _fillThreadIndex = 0;

    // Transformation system
    let _transformStack = [];
    let _currentTransform = {
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1]};

    // Embroidery settings
    const _embroiderySettings = {
      stitchLength: 3, // mm
      stitchWidth: 0,
      minStitchLength: 1, // mm
      resampleNoise: 0, // 0-1 range
      minimumPathLength: 0,
      maximumJoinDistance: 0,
      maximumStitchesPerSquareMm: 0,
      jumpThreshold: 10, // mm
      units: "mm",
    };

    // stroke mode constants
    const STROKE_MODE = {
      STRAIGHT: "straight",
      ZIGZAG: "zigzag",
      RAMP: "ramp",
      SQUARE: "square",
      LINES: "lines",
      SASHIKO: "sashiko",
    };

    // Add fill mode constants
    const FILL_MODE = {
      TATAMI: "tatami",
      SATIN: "satin",
      SPIRAL: "spiral",
    };

    // Add stroke join constants
    const STROKE_JOIN = {
      ROUND: "round",
      MITER: "miter",
      BEVEL: "bevel",
    };

    let _doStroke = false; // Track if stroke is enabled
    let _currentStrokeMode = STROKE_MODE.STRAIGHT;
    let _currentStrokeJoin = STROKE_JOIN.ROUND; // Default to round joins

    let _doFill = false; // Track if fill is enabled
    let _currentFillMode = FILL_MODE.TATAMI;
    let _fillSettings = {
      stitchLength: 3, // mm
      stitchWidth: 0.2,
      minStitchLength: 0.5, // mm
      resampleNoise: 0, // 0-1 range
      angle: 0, // Angle in radians
      rowSpacing: 0.8, // Space between rows in mm
      tieDistance: 15, // Distance between tie-down stitches in mm
      alternateAngle: false, // Whether to alternate angles between shapes
      color: { r: 0, g: 0, b: 0 },
    };

    // Add a stroke settings object to match the other settings objects
    let _strokeSettings = {
      stitchLength: 3, // mm
      stitchWidth: 0.2,
      minStitchLength: 1, // mm
      resampleNoise: 0, // 0-1 range
      strokeWeight: 0, // Width of the embroidery line
      strokeMode: STROKE_MODE.STRAIGHT,
      strokeJoin: STROKE_JOIN.ROUND, // Add join setting
      strokeEntry: "right", // "right","left","middle"
      strokeExit: "right", // "right","left","middle"
    };

    /**
     * Multiply two 3x3 matrices (column-major order)
     * @private
     */
    function multiplyMatrix(a, b) {
      const result = new Array(9);

      result[0] = a[0] * b[0] + a[3] * b[1] + a[6] * b[2];
      result[1] = a[1] * b[0] + a[4] * b[1] + a[7] * b[2];
      result[2] = a[2] * b[0] + a[5] * b[1] + a[8] * b[2];

      result[3] = a[0] * b[3] + a[3] * b[4] + a[6] * b[5];
      result[4] = a[1] * b[3] + a[4] * b[4] + a[7] * b[5];
      result[5] = a[2] * b[3] + a[5] * b[4] + a[8] * b[5];

      result[6] = a[0] * b[6] + a[3] * b[7] + a[6] * b[8];
      result[7] = a[1] * b[6] + a[4] * b[7] + a[7] * b[8];
      result[8] = a[2] * b[6] + a[5] * b[7] + a[8] * b[8];

      return result;
    }

    /**
     * Create a translation matrix
     * @private
     */
    function createTranslationMatrix(x, y) {
      return [1, 0, 0, 0, 1, 0, x, y, 1];
    }

    /**
     * Create a rotation matrix
     * @private
     */
    function createRotationMatrix(angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [cos, sin, 0, -sin, cos, 0, 0, 0, 1];
    }

    /**
     * Create a scale matrix
     * @private
     */
    function createScaleMatrix(sx, sy = sx) {
      return [sx, 0, 0, 0, sy, 0, 0, 0, 1];
    }

    /**
     * Apply transformation matrix to a point
     * @private
     */
    function transformPoint(point, matrix) {
      const x = point.x * matrix[0] + point.y * matrix[3] + matrix[6];
      const y = point.x * matrix[1] + point.y * matrix[4] + matrix[7];
      return { x, y };
    }

    /**
     * Apply transformation matrix to an array of points
     * @private
     */
    function transformPoints(points, matrix) {
      return points.map((point) => transformPoint(point, matrix));
    }

    /**
     * Helper function to apply current transformation to coordinates if recording
     * Only applies transformation in stitch/realistic modes, not in p5 mode
     * @private
     */
    function applyCurrentTransform(x, y) {
      if (_recording && _drawMode !== "p5") {
        return transformPoint({ x, y }, _currentTransform.matrix);
      }
      return { x, y };
    }

    /**
     * Helper function to apply current transformation to an array of coordinates
     * Only applies transformation in stitch/realistic modes, not in p5 mode
     * @private
     */
    function applyCurrentTransformToPoints(points) {
      if (_recording && _drawMode !== "p5") {
        return transformPoints(points, _currentTransform.matrix);
      }
      return points;
    }

    /**
     * Sets the stroke mode for embroidery stitches.
     * @method setStrokeMode
     * @for p5
     * @param {string} mode - The stroke mode to use ('zigzag', 'lines', or 'sashiko')
     * @example
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   setStrokeMode('zigzag');
     *   line(10, 10, 50, 50); // Will use zigzag stitch pattern
     * }
     */

    p5embroidery.setStrokeMode = function (mode) {
      if (Object.values(STROKE_MODE).includes(mode)) {
        _currentStrokeMode = mode;
        _strokeSettings.strokeMode = mode;
      } else {
        console.warn(`Invalid stroke mode: ${mode}. Using default: ${_currentStrokeMode}`);
      }
    };

    /**
     * Sets the stroke join mode for embroidery stitches.
     * @method setStrokeJoin
     * @for p5
     * @param {string} join - The stroke join mode to use ('round', 'miter', or 'bevel')
     * @example
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   setStrokeJoin('miter');
     *   beginShape();
     *   vertex(20, 20);
     *   vertex(50, 20);
     *   vertex(50, 50);
     *   endShape();
     * }
     */
    p5embroidery.setStrokeJoin = function (join) {
      if (Object.values(STROKE_JOIN).includes(join)) {
        _currentStrokeJoin = join;
        _strokeSettings.strokeJoin = join;
      } else {
        console.warn(`Invalid stroke join: ${join}. Using default: ${_currentStrokeJoin}`);
      }
    };

    /**
     * Sets the fill mode for embroidery fills.
     * @method setFillMode
     * @for p5
     * @param {string} mode - The fill mode to use ('tatami', 'satin', or 'spiral')
     */
    p5embroidery.setFillMode = function (mode) {
      if (Object.values(FILL_MODE).includes(mode)) {
        _currentFillMode = mode;
      } else {
        console.warn(`Invalid fill mode: ${mode}. Using default: ${_currentFillMode}`);
      }
    };

    /**
     * Sets the stroke chirality for embroidery stitches.
     * @method setStrokeEntryExit
     * @for p5
     * @param {string} entry - The entry direction to use ('right' or 'left')
     * @param {string} exit - The exit direction to use ('right' or 'left')
     */
    p5embroidery.setStrokeEntryExit = function (entry = "right", exit = "left") {
      if (entry === "right" || entry === "left" || entry === "middle") {
        _strokeSettings.strokeEntry = entry;
      } else {
        console.warn(`Invalid entry: ${entry}. Using default: ${_strokeSettings.strokeEntry}`);
      }
      if (exit === "right" || exit === "left" || exit === "middle") {
        _strokeSettings.strokeExit = exit;
      } else {
        console.warn(`Invalid exit: ${exit}. Using default: ${_strokeSettings.strokeExit}`);
      }
    };

    /**
     * Sets the fill settings for embroidery.
     * @method setFillSettings
     * @for p5
     * @param {Object} settings - Fill settings object
     * @param {number} [settings.stitchLength] - Length of each stitch in mm
     * @param {number} [settings.stitchWidth] - Width of each stitch in mm
     * @param {number} [settings.minStitchLength] - Minimum stitch length in mm
     * @param {number} [settings.resampleNoise] - Amount of random variation (0-1)
     * @param {number} [settings.angle] - Fill angle in degrees
     * @param {number} [settings.rowSpacing] - Space between rows in mm
     * @param {number} [settings.tieDistance] - Distance between tie-down stitches in mm
     * @param {boolean} [settings.alternateAngle] - Whether to alternate angles between shapes
     */
    p5embroidery.setFillSettings = function (settings) {
      if (settings.stitchLength !== undefined) {
        _fillSettings.stitchLength = settings.stitchLength;
      }
      if (settings.stitchWidth !== undefined) {
        _fillSettings.stitchWidth = settings.stitchWidth;
      }
      if (settings.minStitchLength !== undefined) {
        _fillSettings.minStitchLength = settings.minStitchLength;
      }
      if (settings.resampleNoise !== undefined) {
        _fillSettings.resampleNoise = settings.resampleNoise;
      }

      if (settings.angle !== undefined) {
        _fillSettings.angle = (settings.angle * Math.PI) / 180; // Convert to radians
      }
      if (settings.rowSpacing !== undefined) {
        _fillSettings.rowSpacing = settings.rowSpacing;
      }
      if (settings.tieDistance !== undefined) {
        _fillSettings.tieDistance = settings.tieDistance;
      }
      if (settings.alternateAngle !== undefined) {
        _fillSettings.alternateAngle = settings.alternateAngle;
      }
    };

    /**
     * Thread class for storing color and stitch data.
     * @class Thread
     * @private
     */
    class Thread {
      /**
       * Creates a new Thread instance.
       * @constructor
       * @param {number} r - Red component (0-255)
       * @param {number} g - Green component (0-255)
       * @param {number} b - Blue component (0-255)
       * @param {number} [weight=0.2] - Weight of the thread in mm
       */
      constructor(r, g, b, weight = 0.2) {
        this.color = { r, g, b };
        this.runs = [];
        this.weight = weight;
      }
    }

    /**
     * Begins recording embroidery data.
     * @method beginRecord
     * @for p5
     * @param {p5} p5Instance - The p5.js sketch instance
     * @example
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns here
     *   endRecord();
     * }
     */
    p5embroidery.beginRecord = function (p5Instance) {
      if (!p5Instance) {
        throw new Error("Invalid p5 instance provided to beginRecord().");
      }
      _p5Instance = p5Instance;
      _stitchData.width = p5Instance.width;
      _stitchData.height = p5Instance.height;
      _stitchData.threads = [new Thread(0, 0, 0, 0.2)]; // Start with a default black thread
      _recording = true;
      overrideP5Functions();
    };

    /**
     * Ends recording and prepares for export.
     * @method endRecord
     * @for p5
     * @example
     *
     *
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns
     *   endRecord();
     * }
     *
     *
     */
    p5embroidery.endRecord = function () {
      _recording = false;
      restoreP5Functions();
      //exportEmbroidery(format);
    };

    let _originalBeginShapeFunc;
    function overrideBeginShapeFunction() {
      _originalBeginShapeFunc = window.beginShape;

      window.beginShape = function (kind) {
        if (_recording) {
          if (
            kind === window.POINTS ||
            kind === window.LINES ||
            kind === window.TRIANGLES ||
            kind === window.TRIANGLE_FAN ||
            kind === window.TRIANGLE_STRIP ||
            kind === window.QUADS ||
            kind === window.QUAD_STRIP
          ) {
            _shapeKind = kind;
          } else {
            _shapeKind = null;
          }

          _vertices = [];
          _contourVertices = [];
          _contours = [];
          _currentContour = [];

          if (_drawMode === "p5") {
            _originalBeginShapeFunc.apply(this, arguments);
          }
        } else {
          _originalBeginShapeFunc.apply(this, arguments);
        }
      };
    }

    let _originalEndShapeFunc;
    function overrideEndShapeFunction() {
      _originalEndShapeFunc = window.endShape;

      window.endShape = function (mode, count = 1) {
        if (count < 1) {
          console.log("🪡 p5.embroider says: You can not have less than one instance");
          count = 1;
        }
        if (_recording) {
          if (_vertices.length === 0) {
            console.log("🪡 p5.embroider says: No vertices to draw");
            return this;
          }
          if (_DEBUG) {
            console.log("endShape", _vertices, _vertices.length);
            console.log("_doStroke", _doStroke);
            console.log("_doFill", _doFill);
          }
          if (!_doStroke && !_doFill) {
            console.log("🪡 p5.embroider says: _doStroke and _doFill are both false");
            return this;
          }

          const closeShape = mode === window.CLOSE;

          if (closeShape && !_isContour) {
            _vertices.push(_vertices[0]);
          }
          if (_doFill) {
            // Convert vertices to pathPoints format for the fill function
            const mainPath = _vertices.map((v) => ({
              x: v.x,
              y: v.y,
            }));

            let fillStitches = [];

            if (_contours.length > 0) {
              // Fill with contours
              if (_DEBUG) console.log("Filling shape with", _contours.length, "contours");
              fillStitches = createTatamiFillWithContours(mainPath, _contours, _fillSettings);
            } else {
              // Simple fill without contours
              fillStitches = createTatamiFillFromPath(mainPath, _fillSettings);
            }

            if (fillStitches && fillStitches.length > 0) {
              _stitchData.threads[_fillThreadIndex].runs.push(fillStitches);

              // Draw fill stitches in visual modes
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(fillStitches, _fillThreadIndex);
              }
            }
          }

          //convert vertices to embroidery stitches
          const stitches = p5embroidery.convertVerticesToStitches(_vertices, _strokeSettings);

          // Debug log
          if (_DEBUG) {
            console.log("endShape: Converted vertices to stitches:", {
              vertices: _vertices.length,
              stitches: stitches.length,
              shapeKind: _shapeKind,
              mode: _drawMode,
            });
          }

          //add stitches to the embroidery data
          _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

          if (_drawMode === "stitch" || _drawMode === "realistic") {
            if (_DEBUG)
              console.log("Drawing stitches:", {
                count: stitches.length,
                threadIndex: _strokeThreadIndex,
                mode: _drawMode,
                firstStitch: stitches.length > 0 ? stitches[0] : null,
                lastStitch: stitches.length > 0 ? stitches[stitches.length - 1] : null,
              });
            drawStitches(stitches, _strokeThreadIndex);
          } else if (_drawMode === "p5") {
            _originalEndShapeFunc.call(_p5Instance, mode, count);
          }
          _isContour = false;

          // Reset contour vertices for next shape
          _contourVertices = [];
          _contours = [];
          _currentContour = [];

          // If the shape is closed, the first element was added as last element.
          // We must remove it again to prevent the list of vertices from growing
          // over successive calls to endShape(CLOSE)
          if (closeShape) {
            _vertices.pop();
          }

          // After drawing both shapes
          if (_DEBUG)
            console.log(
              "Thread runs:",
              _stitchData.threads[_strokeThreadIndex].runs.map((run) => ({
                length: run.length,
                first: run.length > 0 ? { x: run[0].x, y: run[0].y } : null,
                last: run.length > 0 ? { x: run[run.length - 1].x, y: run[run.length - 1].y } : null,
              })),
            );
        } else {
          _originalEndShapeFunc.apply(this, arguments);
        }

        return this;
      };
    }

    let _originalVertexFunc;
    function overrideVertexFunction() {
      _originalVertexFunc = window.vertex;

      window.vertex = function (x, y, moveTo, u, v) {
        if (_recording) {
          // Apply current transformation to the vertex coordinates
          const transformedPoint = transformPoint({ x, y }, _currentTransform.matrix);

          // Create a vertex object with named properties instead of an array
          const vert = {
            x: transformedPoint.x,
            y: transformedPoint.y,
            u: u || 0,
            v: v || 0,
            isVert: true,
          };

          if (moveTo) {
            vert.moveTo = moveTo;
          }

          if (_drawMode === "p5") {
            _originalVertexFunc.call(_p5Instance, mmToPixel$1(x), mmToPixel$1(y), moveTo, u, v);
          }

          // Add to appropriate container based on contour state
          if (_isContour) {
            _currentContour.push({ x: transformedPoint.x, y: transformedPoint.y });
            if (_DEBUG) console.log("Added to contour (transformed):", { x: transformedPoint.x, y: transformedPoint.y });
          } else {
            _vertices.push(vert);
            if (_DEBUG) console.log("Added to vertices (transformed):", vert);
          }
        } else {
          let args = [mmToPixel$1(x), mmToPixel$1(y), moveTo, u, v];
          _originalVertexFunc.apply(this, args);
        }
      };
    }

    /**
     * Overrides p5.js bezierVertex() function.
     * @private
     */
    let _originalBezierVertexFunc;
    function overrideBezierVertexFunction() {
      _originalBezierVertexFunc = window.bezierVertex;

      window.bezierVertex = function (x2, y2, x3, y3, x4, y4) {
        if (_recording) {
          // Apply current transformation to control points
          const cp1 = transformPoint({ x: x2, y: y2 }, _currentTransform.matrix);
          const cp2 = transformPoint({ x: x3, y: y3 }, _currentTransform.matrix);
          const endPoint = transformPoint({ x: x4, y: y4 }, _currentTransform.matrix);

          // Get the last vertex as the starting point - check both main vertices and current contour
          let lastVertex;
          if (_isContour) {
            if (_currentContour.length === 0) {
              console.warn("bezierVertex() called without a previous vertex in contour");
              return;
            }
            lastVertex = _currentContour[_currentContour.length - 1];
          } else {
            if (_vertices.length === 0) {
              console.warn("bezierVertex() called without a previous vertex");
              return;
            }
            lastVertex = _vertices[_vertices.length - 1];
          }
          const x1 = lastVertex.x;
          const y1 = lastVertex.y;

          // Generate bezier curve points using transformed control points
          const bezierPoints = generateBezierPoints(x1, y1, cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);

          // Add all points except the first one (which is the last vertex)
          for (let i = 1; i < bezierPoints.length; i++) {
            const point = bezierPoints[i];

            if (_isContour) {
              _currentContour.push({ x: point.x, y: point.y });
            } else {
              const vert = {
                x: point.x,
                y: point.y,
                u: 0,
                v: 0,
                isVert: true,
                isBezier: true,
              };
              _vertices.push(vert);
            }

            if (_drawMode === "p5") {
              if (i === 1) {
                // Call bezierVertex with p5 for the first segment using transformed coordinates
                _originalBezierVertexFunc.call(
                  _p5Instance,
                  mmToPixel$1(cp1.x),
                  mmToPixel$1(cp1.y),
                  mmToPixel$1(cp2.x),
                  mmToPixel$1(cp2.y),
                  mmToPixel$1(endPoint.x),
                  mmToPixel$1(endPoint.y),
                );
              }
            }
          }
          if (_DEBUG) console.log("bezierVertex added points:", bezierPoints.length - 1);
        } else {
          let args = [mmToPixel$1(x2), mmToPixel$1(y2), mmToPixel$1(x3), mmToPixel$1(y3), mmToPixel$1(x4), mmToPixel$1(y4)];
          _originalBezierVertexFunc.apply(this, args);
        }
      };
    }

    /**
     * Overrides p5.js quadraticVertex() function.
     * @private
     */
    let _originalQuadraticVertexFunc;
    function overrideQuadraticVertexFunction() {
      _originalQuadraticVertexFunc = window.quadraticVertex;

      window.quadraticVertex = function (cx, cy, x3, y3) {
        if (_recording) {
          // Apply current transformation to control points
          const controlPoint = transformPoint({ x: cx, y: cy }, _currentTransform.matrix);
          const endPoint = transformPoint({ x: x3, y: y3 }, _currentTransform.matrix);

          // Get the last vertex as the starting point - check both main vertices and current contour
          let lastVertex;
          if (_isContour) {
            if (_currentContour.length === 0) {
              console.warn("quadraticVertex() called without a previous vertex in contour");
              return;
            }
            lastVertex = _currentContour[_currentContour.length - 1];
          } else {
            if (_vertices.length === 0) {
              console.warn("quadraticVertex() called without a previous vertex");
              return;
            }
            lastVertex = _vertices[_vertices.length - 1];
          }
          const x1 = lastVertex.x;
          const y1 = lastVertex.y;

          // Generate quadratic bezier curve points using transformed control points
          const quadraticPoints = generateQuadraticPoints(x1, y1, controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);

          // Add all points except the first one (which is the last vertex)
          for (let i = 1; i < quadraticPoints.length; i++) {
            const point = quadraticPoints[i];

            if (_isContour) {
              _currentContour.push({ x: point.x, y: point.y });
            } else {
              const vert = {
                x: point.x,
                y: point.y,
                u: 0,
                v: 0,
                isVert: true,
                isQuadratic: true,
              };
              _vertices.push(vert);
            }

            if (_drawMode === "p5") {
              if (i === 1) {
                // Call quadraticVertex with p5 for the first segment using transformed coordinates
                _originalQuadraticVertexFunc.call(
                  _p5Instance,
                  mmToPixel$1(controlPoint.x),
                  mmToPixel$1(controlPoint.y),
                  mmToPixel$1(endPoint.x),
                  mmToPixel$1(endPoint.y),
                );
              }
            }
          }
          if (_DEBUG) console.log("quadraticVertex added points:", quadraticPoints.length - 1);
        } else {
          let args = [mmToPixel$1(cx), mmToPixel$1(cy), mmToPixel$1(x3), mmToPixel$1(y3)];
          _originalQuadraticVertexFunc.apply(this, args);
        }
      };
    }

    /**
     * Overrides p5.js curveVertex() function.
     * @private
     */
    let _originalCurveVertexFunc;
    function overrideCurveVertexFunction() {
      _originalCurveVertexFunc = window.curveVertex;

      window.curveVertex = function (x, y) {
        if (_recording) {
          // Apply current transformation to the curve vertex
          const transformedPoint = transformPoint({ x, y }, _currentTransform.matrix);

          // Add to contour vertices for curve calculation using transformed coordinates
          _contourVertices.push({ x: transformedPoint.x, y: transformedPoint.y });

          // For curve vertices, we need at least 4 points to generate a curve segment
          if (_contourVertices.length >= 4) {
            const len = _contourVertices.length;
            const p0 = _contourVertices[len - 4];
            const p1 = _contourVertices[len - 3];
            const p2 = _contourVertices[len - 2];
            const p3 = _contourVertices[len - 1];

            // Generate curve points for this segment
            const curvePoints = generateCurvePoints(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

            // If this is the first curve segment, add all points
            // Otherwise, add all points except the first (to avoid duplication)
            let startIdx;
            if (_isContour) {
              startIdx = _currentContour.length === 0 ? 0 : 1;
            } else {
              startIdx = _vertices.length === 0 ? 0 : 1;
            }

            for (let i = startIdx; i < curvePoints.length; i++) {
              const point = curvePoints[i];

              if (_isContour) {
                _currentContour.push({ x: point.x, y: point.y });
              } else {
                const vert = {
                  x: point.x,
                  y: point.y,
                  u: 0,
                  v: 0,
                  isVert: true,
                  isCurve: true,
                };
                _vertices.push(vert);
              }
            }
          }

          if (_drawMode === "p5") {
            _originalCurveVertexFunc.call(_p5Instance, mmToPixel$1(transformedPoint.x), mmToPixel$1(transformedPoint.y));
          }
          if (_DEBUG) console.log("curveVertex added, contour length:", _contourVertices.length);
        } else {
          _originalCurveVertexFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Generates points along a quadratic Bezier curve.
     * @private
     */
    function generateQuadraticPoints(x1, y1, cx, cy, x3, y3) {
      const points = [];
      const bezierDetail = _p5Instance._bezierDetail || 20;

      for (let i = 0; i <= bezierDetail; i++) {
        const t = i / bezierDetail;
        const x = quadraticBezierPoint(x1, cx, x3, t);
        const y = quadraticBezierPoint(y1, cy, y3, t);
        points.push({ x, y });
      }

      return points;
    }

    /**
     * Calculate a point on a quadratic Bezier curve.
     * @private
     */
    function quadraticBezierPoint(a, b, c, t) {
      const mt = 1 - t;
      const mt2 = mt * mt;
      const t2 = t * t;
      return a * mt2 + 2 * b * mt * t + c * t2;
    }

    /**
     * Converts vertices to embroidery stitches.
     * @method convertVerticesToStitches
     * @private
     * @param {Array} vertices - Array of vertex objects
     * @param {Object} strokeSettings - Settings for the stroke
     * @returns {Array} Array of stitch points
     */
    p5embroidery.convertVerticesToStitches = function (vertices, strokeSettings) {
      let stitches = [];

      if (!vertices || vertices.length < 2) {
        if (_DEBUG) console.log("convertVerticesToStitches: insufficient vertices", vertices);
        return stitches;
      }

      // Extract x,y coordinates from vertex objects for compatibility with path functions
      const pathPoints = vertices.map((v) => ({
        x: v.x,
        y: v.y,
      }));

      if (_DEBUG) {
        console.log("convertVerticesToStitches input:", {
          vertexCount: vertices.length,
          pathPoints: pathPoints,
          strokeWeight: strokeSettings.strokeWeight,
          strokeMode: strokeSettings.strokeMode,
          strokeJoin: strokeSettings.strokeJoin,
        });
      }

      // If we have a stroke weight and multiple vertices, use join-aware stitching
      if (strokeSettings.strokeWeight > 0 && vertices.length > 2) {
        if (_DEBUG) console.log("Using convertPathToStitchesWithJoins");
        return convertPathToStitchesWithJoins(pathPoints, strokeSettings);
      }
      // If we have a stroke weight, use the appropriate path-based function
      else if (strokeSettings.strokeWeight > 0) {
        if (_DEBUG) console.log("Using stroke mode:", strokeSettings.strokeMode);
        switch (strokeSettings.strokeMode) {
          case STROKE_MODE.STRAIGHT:
            return straightLineStitchFromPath(pathPoints, strokeSettings);
          case STROKE_MODE.ZIGZAG:
            return zigzagStitchFromPath(pathPoints, strokeSettings);
          case STROKE_MODE.LINES:
            return multiLineStitchFromPath(pathPoints, strokeSettings);
          case STROKE_MODE.SASHIKO:
            return sashikoStitchFromPath(pathPoints, strokeSettings);
          default:
            // For simple paths, use the convertPathToStitches function
            return convertPathToStitches(pathPoints, strokeSettings);
        }
      } else {
        if (_DEBUG) console.log("Using generic convertPathToStitches");
        // For normal width lines, just use the generic path to stitches conversion
        return convertPathToStitches(pathPoints, strokeSettings);
      }
    };

    /**
     * Overrides p5.js line() function to record embroidery stitches.
     * @private
     */
    let _originalLineFunc;
    function overrideLineFunction() {
      _originalLineFunc = window.line;
      window.line = function (x1, y1, x2, y2) {
        if (_recording) {
          if (_doStroke) {
            // Apply current transformation to coordinates
            const p1 = applyCurrentTransform(x1, y1);
            const p2 = applyCurrentTransform(x2, y2);

            let stitches = convertLineToStitches(p1.x, p1.y, p2.x, p2.y, _strokeSettings);
            _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

            if (_drawMode === "stitch" || _drawMode === "realistic") {
              drawStitches(stitches, _strokeThreadIndex);
            } else if (_drawMode === "p5") {
              _originalStrokeWeightFunc.call(_p5Instance, mmToPixel$1(_strokeSettings.strokeWeight));
              _originalLineFunc.call(_p5Instance, mmToPixel$1(x1), mmToPixel$1(y1), mmToPixel$1(x2), mmToPixel$1(y2));
            }
          }
        } else {
          _originalLineFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js curve() function to record embroidery stitches.
     * @private
     */
    let _originalCurveFunc;
    function overrideCurveFunction() {
      _originalCurveFunc = window.curve;
      window.curve = function (x1, y1, x2, y2, x3, y3, x4, y4) {
        if (_recording) {
          if (_doStroke) {
            // Apply current transformation to control points
            const p1 = applyCurrentTransform(x1, y1);
            const p2 = applyCurrentTransform(x2, y2);
            const p3 = applyCurrentTransform(x3, y3);
            const p4 = applyCurrentTransform(x4, y4);

            // Generate curve points using Catmull-Rom spline with transformed coordinates
            const curvePoints = generateCurvePoints(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y);
            let stitches = p5embroidery.convertVerticesToStitches(
              curvePoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
              _strokeSettings,
            );
            _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

            if (_drawMode === "stitch" || _drawMode === "realistic") {
              drawStitches(stitches, _strokeThreadIndex);
            } else if (_drawMode === "p5") {
              _originalStrokeWeightFunc.call(_p5Instance, mmToPixel$1(_strokeSettings.strokeWeight));
              _originalCurveFunc.call(
                _p5Instance,
                mmToPixel$1(x1),
                mmToPixel$1(y1),
                mmToPixel$1(x2),
                mmToPixel$1(y2),
                mmToPixel$1(x3),
                mmToPixel$1(y3),
                mmToPixel$1(x4),
                mmToPixel$1(y4),
              );
            }
          }
        } else {
          _originalCurveFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js bezier() function to record embroidery stitches.
     * @private
     */
    let _originalBezierFunc;
    function overrideBezierFunction() {
      _originalBezierFunc = window.bezier;
      window.bezier = function (x1, y1, x2, y2, x3, y3, x4, y4) {
        if (_recording) {
          if (_doStroke) {
            // Apply current transformation to control points
            const p1 = applyCurrentTransform(x1, y1);
            const p2 = applyCurrentTransform(x2, y2);
            const p3 = applyCurrentTransform(x3, y3);
            const p4 = applyCurrentTransform(x4, y4);

            // Generate bezier curve points with transformed coordinates
            const bezierPoints = generateBezierPoints(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y);
            let stitches = p5embroidery.convertVerticesToStitches(
              bezierPoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
              _strokeSettings,
            );
            _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

            if (_drawMode === "stitch" || _drawMode === "realistic") {
              drawStitches(stitches, _strokeThreadIndex);
            } else if (_drawMode === "p5") {
              _originalStrokeWeightFunc.call(_p5Instance, mmToPixel$1(_strokeSettings.strokeWeight));
              _originalBezierFunc.call(
                _p5Instance,
                mmToPixel$1(x1),
                mmToPixel$1(y1),
                mmToPixel$1(x2),
                mmToPixel$1(y2),
                mmToPixel$1(x3),
                mmToPixel$1(y3),
                mmToPixel$1(x4),
                mmToPixel$1(y4),
              );
            }
          }
        } else {
          _originalBezierFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Generates points along a Catmull-Rom curve.
     * @private
     */
    function generateCurvePoints(x1, y1, x2, y2, x3, y3, x4, y4) {
      const points = [];
      const curveDetail = _p5Instance._curveDetail || 20;

      for (let i = 0; i <= curveDetail; i++) {
        const t = i / curveDetail;
        const x = curvePoint(x1, x2, x3, x4, t);
        const y = curvePoint(y1, y2, y3, y4, t);
        points.push({ x, y });
      }

      return points;
    }

    /**
     * Generates points along a cubic Bezier curve.
     * @private
     */
    function generateBezierPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
      const points = [];
      const bezierDetail = _p5Instance._bezierDetail || 20;

      for (let i = 0; i <= bezierDetail; i++) {
        const t = i / bezierDetail;
        const x = bezierPoint(x1, x2, x3, x4, t);
        const y = bezierPoint(y1, y2, y3, y4, t);
        points.push({ x, y });
      }

      return points;
    }

    /**
     * Calculate a point on a Catmull-Rom curve.
     * @private
     */
    function curvePoint(a, b, c, d, t) {
      const t2 = t * t;
      const t3 = t2 * t;
      return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    }

    /**
     * Calculate a point on a cubic Bezier curve.
     * @private
     */
    function bezierPoint(a, b, c, d, t) {
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      return a * mt3 + 3 * b * mt2 * t + 3 * c * mt * t2 + d * t3;
    }

    /**
     * Overrides p5.js stroke() function to select thread color.
     * @private
     */
    let _originalStrokeFunc;
    function overrideStrokeFunction() {
      _originalStrokeFunc = window.stroke;
      window.stroke = function () {
        if (_recording) {
          // Get color values from arguments
          let r, g, b;

          if (arguments.length === 1) {
            // Single value or string color
            if (typeof arguments[0] === "string") {
              // Parse color string (e.g., '#FF0000' or 'red')
              const colorObj = _p5Instance.color(arguments[0]);
              r = _p5Instance.red(colorObj);
              g = _p5Instance.green(colorObj);
              b = _p5Instance.blue(colorObj);
            } else {
              // Grayscale value
              r = g = b = arguments[0];
            }
          } else if (arguments.length === 3) {
            // RGB values
            r = arguments[0];
            g = arguments[1];
            b = arguments[2];
          } else {
            // Default to black if invalid arguments
            r = g = b = 0;
          }

          // Check if we already have a thread with this color
          let threadIndex = -1;
          for (let i = 0; i < _stitchData.threads.length; i++) {
            const threadColor = _stitchData.threads[i].color;
            if (threadColor.r === r && threadColor.g === g && threadColor.b === b) {
              threadIndex = i;
              break;
            }
          }

          if (threadIndex === -1) {
            // Create a new thread with this color
            _stitchData.threads.push(new Thread(r, g, b));
            threadIndex = _stitchData.threads.length - 1;
          }

          // If we're changing to a different thread and have existing stitches,
          // add a thread trim command at the current position
          // if (_strokeThreadIndex !== threadIndex && _stitchData.threads[_strokeThreadIndex] !== undefined) {
          //   trimThread();
          // }

          // Set the current thread index
          _strokeThreadIndex = threadIndex;
          _doStroke = true;

          _originalStrokeFunc.apply(this, arguments);
        } else {
          _originalStrokeFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js noStroke() function to disable embroidery strokes.
     * @private
     */
    let _originalNoStrokeFunc;
    function overrideNoStrokeFunction() {
      _originalNoStrokeFunc = window.noStroke;
      window.noStroke = function () {
        if (_recording) {
          _doStroke = false;
        }
        _originalNoStrokeFunc.apply(this, arguments);
      };
    }

    /**
     * Overrides p5.js fill() function to handle embroidery fills.
     * @private
     */
    let _originalFillFunc;
    function overrideFillFunction() {
      _originalFillFunc = window.fill;
      window.fill = function () {
        if (_recording) {
          // Get color values from arguments
          let r, g, b;

          if (arguments.length === 1) {
            // Single value or string color
            if (typeof arguments[0] === "string") {
              // Parse color string (e.g., '#FF0000' or 'red')
              const colorObj = _p5Instance.color(arguments[0]);
              r = _p5Instance.red(colorObj);
              g = _p5Instance.green(colorObj);
              b = _p5Instance.blue(colorObj);
            } else {
              // Grayscale value
              r = g = b = arguments[0];
            }
          } else if (arguments.length === 3) {
            // RGB values
            r = arguments[0];
            g = arguments[1];
            b = arguments[2];
          } else {
            // Default to black if invalid arguments
            r = g = b = 0;
          }

          // Check if we already have a thread with this color
          let threadIndex = -1;
          for (let i = 0; i < _stitchData.threads.length; i++) {
            const thread = _stitchData.threads[i];
            if (thread.color.r === r && thread.color.g === g && thread.color.b === b) {
              threadIndex = i;
              break;
            }
          }

          if (threadIndex === -1) {
            // Create a new thread with this color
            _stitchData.threads.push(new Thread(r, g, b));
            threadIndex = _stitchData.threads.length - 1;
          }

          // Set the current thread index
          _fillThreadIndex = threadIndex;

          // Store the fill state and color
          _doFill = true;
          _fillSettings.color = { r, g, b };

          _originalFillFunc.apply(this, arguments);
        } else {
          _originalFillFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js noFill() function to disable embroidery fills.
     * @private
     */
    let _originalNoFillFunc;
    function overrideNoFillFunction() {
      _originalNoFillFunc = window.noFill;
      window.noFill = function () {
        if (_recording) {
          _doFill = false;
          _fillSettings.color = null;
        }
        _originalNoFillFunc.apply(this, arguments);
      };
    }

    /**
     * Overrides p5.js strokeWeight() function to record embroidery stitches.
     * @private
     */
    let _originalStrokeWeightFunc;
    function overrideStrokeWeightFunction() {
      _originalStrokeWeightFunc = window.strokeWeight;

      window.strokeWeight = function (weight) {
        if (_recording) {
          // Set the stroke weight in the stroke settings
          _strokeSettings.strokeWeight = weight;
          //_embroiderySettings.stitchWidth = weight;

          _originalStrokeWeightFunc.call(this, weight);
        } else {
          _originalStrokeWeightFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js strokeJoin() function to set embroidery stroke join mode.
     * @private
     */
    let _originalStrokeJoinFunc;
    function overrideStrokeJoinFunction() {
      _originalStrokeJoinFunc = window.strokeJoin;

      window.strokeJoin = function (join) {
        if (_recording) {
          // Map p5.js constants to our internal format
          let mappedJoin;
          if (join === window.ROUND || join === "round") {
            mappedJoin = STROKE_JOIN.ROUND;
          } else if (join === window.MITER || join === "miter") {
            mappedJoin = STROKE_JOIN.MITER;
          } else if (join === window.BEVEL || join === "bevel") {
            mappedJoin = STROKE_JOIN.BEVEL;
          } else {
            console.warn(`Invalid stroke join: ${join}. Using default: ${_currentStrokeJoin}`);
            mappedJoin = _currentStrokeJoin;
          }

          _currentStrokeJoin = mappedJoin;
          _strokeSettings.strokeJoin = mappedJoin;

          _originalStrokeJoinFunc.call(this, join);
        } else {
          _originalStrokeJoinFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js push() function to save embroidery state.
     * @private
     */
    let _originalPushFunc;
    function overridePushFunction() {
      _originalPushFunc = window.push;

      window.push = function () {
        if (_recording) {
          // Save current embroidery transformation state
          _transformStack.push({
            matrix: [..._currentTransform.matrix],
            strokeSettings: { ..._strokeSettings },
            fillSettings: { ..._fillSettings },
            strokeThreadIndex: _strokeThreadIndex,
            fillThreadIndex: _fillThreadIndex,
            doStroke: _doStroke,
            doFill: _doFill,
            drawMode: _drawMode,
            strokeMode: _currentStrokeMode,
            fillMode: _currentFillMode,
          });

          if (_DEBUG) {
            console.log("Embroidery push - saved state", {
              stackSize: _transformStack.length,
              matrix: _currentTransform.matrix,
            });
          }
        }

        // Always call original p5.js push for visual modes
        _originalPushFunc.apply(this, arguments);
      };
    }

    /**
     * Overrides p5.js pop() function to restore embroidery state.
     * @private
     */
    let _originalPopFunc;
    function overridePopFunction() {
      _originalPopFunc = window.pop;

      window.pop = function () {
        if (_recording) {
          if (_transformStack.length === 0) {
            console.warn("🪡 p5.embroider says: pop() called without matching push()");
            return;
          }

          // Restore embroidery transformation state
          const state = _transformStack.pop();
          _currentTransform.matrix = state.matrix;
          _strokeSettings = state.strokeSettings;
          _fillSettings = state.fillSettings;
          _strokeThreadIndex = state.strokeThreadIndex;
          _fillThreadIndex = state.fillThreadIndex;
          _doStroke = state.doStroke;
          _doFill = state.doFill;
          _drawMode = state.drawMode;
          _currentStrokeMode = state.strokeMode;
          _currentFillMode = state.fillMode;

          if (_DEBUG) {
            console.log("Embroidery pop - restored state", {
              stackSize: _transformStack.length,
              matrix: _currentTransform.matrix,
            });
          }
        }

        // Always call original p5.js pop for visual modes
        _originalPopFunc.apply(this, arguments);
      };
    }

    /**
     * Overrides p5.js translate() function to apply embroidery transformations.
     * @private
     */
    let _originalTranslateFunc;
    function overrideTranslateFunction() {
      _originalTranslateFunc = window.translate;

      window.translate = function (x, y, z) {
        if (_recording) {
          // Apply translation to current transformation matrix
          const translationMatrix = createTranslationMatrix(x, y || 0);
          _currentTransform.matrix = multiplyMatrix(_currentTransform.matrix, translationMatrix);

          if (_DEBUG) {
            console.log("Embroidery translate", { x, y, matrix: _currentTransform.matrix });
          }
          if (_drawMode == "p5") {
            _originalTranslateFunc.call(this, mmToPixel$1(x), mmToPixel$1(y));
            //_originalTranslateFunc.call(this, x, y);
          }
        } else {
          _originalTranslateFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js rotate() function to apply embroidery transformations.
     * @private
     */
    let _originalRotateFunc;
    function overrideRotateFunction() {
      _originalRotateFunc = window.rotate;

      window.rotate = function (angle, axis) {
        if (_recording) {
          // Convert angle to radians if needed (p5.js handles this internally)
          const radians = _p5Instance._angleMode === _p5Instance.DEGREES ? angle * (Math.PI / 180) : angle;

          // Apply rotation to current transformation matrix
          const rotationMatrix = createRotationMatrix(radians);
          _currentTransform.matrix = multiplyMatrix(_currentTransform.matrix, rotationMatrix);

          if (_DEBUG) {
            console.log("Embroidery rotate", { angle, radians, matrix: _currentTransform.matrix });
          }
        }

        // Call original p5.js rotate for visual modes
        if (_drawMode === "p5" || !_recording) {
          _originalRotateFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js scale() function to apply embroidery transformations.
     * @private
     */
    let _originalScaleFunc;
    function overrideScaleFunction() {
      _originalScaleFunc = window.scale;

      window.scale = function (x, y, z) {
        if (_recording) {
          // Handle different parameter formats like p5.js
          let sx = x,
            sy = y;

          if (x instanceof p5.Vector) {
            sx = x.x;
            sy = x.y;
          } else if (Array.isArray(x)) {
            sx = x[0];
            sy = x[1] || x[0];
          } else {
            if (y === undefined) sy = sx;
          }

          // Apply scale to current transformation matrix
          const scaleMatrix = createScaleMatrix(sx, sy);
          _currentTransform.matrix = multiplyMatrix(_currentTransform.matrix, scaleMatrix);

          if (_DEBUG) {
            console.log("Embroidery scale", { sx, sy, matrix: _currentTransform.matrix });
          }
        }

        // Call original p5.js scale for visual modes
        if (_drawMode === "p5" || !_recording) {
          _originalScaleFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js ellipse() function to record embroidery stitches.
     * @private
     */
    let _originalEllipseFunc;
    function overrideEllipseFunction() {
      _originalEllipseFunc = window.ellipse;
      window.ellipse = function (x, y, w, h) {
        if (_recording) {
          // Calculate radius values
          let radiusX = w / 2;
          let radiusY = h / 2;

          // Generate path points for the ellipse
          let pathPoints = [];
          let numSteps = Math.max(Math.ceil((Math.PI * (radiusX + radiusY)) / _embroiderySettings.stitchLength), 12);

          // Generate points along the ellipse, starting at 0 degrees (right side of ellipse)
          for (let i = 0; i <= numSteps; i++) {
            let angle = (i / numSteps) * Math.PI * 2;
            let pointX = x + Math.cos(angle) * radiusX;
            let pointY = y + Math.sin(angle) * radiusY;

            // Store in mm (internal format)
            pathPoints.push({
              x: pointX,
              y: pointY,
            });
          }

          // Close the path by adding the first point again
          pathPoints.push({
            x: pathPoints[0].x,
            y: pathPoints[0].y,
          });

          // Apply current transformation to all pathPoints
          const transformedPathPoints = applyCurrentTransformToPoints(pathPoints);

          // Record the stitches if we're recording
          if (_recording) {
            if (_doFill) {
              // Convert vertices to pathPoints format for the fill function
              const fillStitches = createTatamiFillFromPath(transformedPathPoints, _fillSettings);
              _stitchData.threads[_fillThreadIndex].runs.push(fillStitches);

              // Draw fill stitches in visual modes
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(fillStitches, _fillThreadIndex);
              }
            }

            // Get the current position (in mm)
            let currentX, currentY;
            if (
              _stitchData.threads[_strokeThreadIndex].runs.length === 0 ||
              _stitchData.threads[_strokeThreadIndex].runs[_stitchData.threads[_strokeThreadIndex].runs.length - 1]
                .length === 0
            ) {
              // If there are no runs or the last run is empty, use the first point on the ellipse
              // (at 0 degrees) as the starting point, not the center
              currentX = transformedPathPoints[0].x;
              currentY = transformedPathPoints[0].y;
            } else {
              // Otherwise, use the last stitch position (already in mm)
              let lastRun =
                _stitchData.threads[_strokeThreadIndex].runs[_stitchData.threads[_strokeThreadIndex].runs.length - 1];
              let lastStitch = lastRun[lastRun.length - 1];
              currentX = lastStitch.x;
              currentY = lastStitch.y;
            }

            // Add a jump stitch to the first point of the ellipse if needed
            if (
              Math.sqrt(
                Math.pow(transformedPathPoints[0].x - currentX, 2) + Math.pow(transformedPathPoints[0].y - currentY, 2),
              ) > _embroiderySettings.jumpThreshold
            ) {
              _stitchData.threads[_strokeThreadIndex].runs.push([
                {
                  x: currentX,
                  y: currentY,
                  command: "jump",
                },
                {
                  x: transformedPathPoints[0].x,
                  y: transformedPathPoints[0].y,
                },
              ]);
            }

            // Convert path points to stitches based on current stroke mode
            let stitches;
            if (_strokeSettings.strokeWeight > 0) {
              switch (_strokeSettings.strokeMode) {
                case STROKE_MODE.ZIGZAG:
                  stitches = zigzagStitchFromPath(transformedPathPoints, _strokeSettings);
                  break;
                case STROKE_MODE.LINES:
                  stitches = multiLineStitchFromPath(transformedPathPoints, _strokeSettings);
                  break;
                case STROKE_MODE.SASHIKO:
                  stitches = sashikoStitchFromPath(transformedPathPoints, _strokeSettings);
                  break;
                default:
                  stitches = straightLineStitchFromPath(transformedPathPoints, _strokeSettings);
              }
            } else {
              // If no stroke weight specified, use straight line stitching
              stitches = straightLineStitchFromPath(transformedPathPoints, _strokeSettings);
            }

            // Add the ellipse stitches
            _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

            // Draw the stitches
            if (_drawMode === "p5") {
              _originalStrokeWeightFunc.call(this, mmToPixel$1(_strokeSettings.strokeWeight));
              _originalEllipseFunc.call(this, mmToPixel$1(x), mmToPixel$1(y), mmToPixel$1(w), mmToPixel$1(h));
            } else {
              drawStitches(stitches, _strokeThreadIndex);
            }
          }
        } else {
          _originalEllipseFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js circle() function to record embroidery stitches.
     * @private
     */
    let _originalCircleFunc;
    function overrideCircleFunction() {
      _originalCircleFunc = window.circle;
      window.circle = function (x, y, r) {
        if (_recording) {
          window.ellipse.call(this, x, y, r, r);
        } else {
          _originalCircleFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js point() function to record embroidery stitches.
     * @private
     */
    let _originalPointFunc;
    function overridePointFunction() {
      _originalPointFunc = window.point;
      window.point = function (x, y) {
        if (_recording) {
          // Apply current transformation to coordinates
          const p = applyCurrentTransform(x, y);

          // For point, we just add a single stitch
          let stitches = [
            {
              x: p.x,
              y: p.y,
            },
          ];
          _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

          if (_drawMode === "stitch" || _drawMode === "realistic" || _drawMode === "p5") {
            _p5Instance.push();
            _originalStrokeFunc.call(_p5Instance, 255, 0, 0); // Red for stitch points
            _originalStrokeWeightFunc.call(_p5Instance, 3);
            _originalPointFunc.call(_p5Instance, mmToPixel$1(x), mmToPixel$1(y));
            _p5Instance.pop();
          }
        } else {
          _originalStrokeWeightFunc.call(this, mmToPixel$1(_strokeSettings.strokeWeight));
          _originalPointFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js rect() function to handle embroidery fills.
     * @private
     */
    let _originalRectFunc;
    function overrideRectFunction() {
      _originalRectFunc = window.rect;
      window.rect = function (x, y, w, h, ...cornerRs) {
        if (_recording) {
          const mode = _p5Instance._renderer._rectMode;
          let x1, y1;

          if (mode === _p5Instance.CENTER) {
            x1 = x - w / 2;
            y1 = y - h / 2;
          } else if (mode === _p5Instance.CORNERS) {
            // In CORNERS mode, w is x2 and h is y2. Re-calculate w and h to be width and height.
            w = w - x;
            h = h - y;
            x1 = x;
            y1 = y;
          } else {
            // CORNER mode (default)
            x1 = x;
            y1 = y;
          }

          const x2 = x1 + w;
          const y2 = y1 + h;

          let tl = 0,
            tr = 0,
            br = 0,
            bl = 0;
          if (cornerRs.length === 1 && cornerRs[0] !== undefined) {
            tl = tr = br = bl = cornerRs[0];
          } else if (cornerRs.length >= 4) {
            tl = cornerRs[0] || 0;
            tr = cornerRs[1] || 0;
            br = cornerRs[2] || 0;
            bl = cornerRs[3] || 0;
          }

          const halfW = Math.abs(w) / 2;
          const halfH = Math.abs(h) / 2;
          tl = Math.min(tl, halfW, halfH);
          tr = Math.min(tr, halfW, halfH);
          br = Math.min(br, halfW, halfH);
          bl = Math.min(bl, halfW, halfH);

          const pathPoints = [];

          // Check if we have any corner radii
          const hasCorners = tl > 0 || tr > 0 || br > 0 || bl > 0;

          if (!hasCorners) {
            // Simple rectangle - use 4 corners like triangle/quad for consistent handling
            pathPoints.push({ x: x1, y: y1 });
            pathPoints.push({ x: x2, y: y1 });
            pathPoints.push({ x: x2, y: y2 });
            pathPoints.push({ x: x1, y: y2 });
            pathPoints.push({ x: x1, y: y1 }); // close

            if (_DEBUG) {
              console.log("Simple rectangle path:", pathPoints);
            }
          } else {
            // Complex rectangle with corner radii - use fewer points for better zigzag handling
            const arcDetail = Math.max(3, Math.min(8, Math.ceil(Math.max(tl, tr, br, bl) / 3))); // Limit arc detail

            pathPoints.push({ x: x1 + tl, y: y1 });
            pathPoints.push({ x: x2 - tr, y: y1 });
            if (tr > 0) {
              for (let i = 1; i <= arcDetail; i++) {
                const angle = -Math.PI / 2 + (i / arcDetail) * (Math.PI / 2);
                pathPoints.push({ x: x2 - tr + Math.cos(angle) * tr, y: y1 + tr + Math.sin(angle) * tr });
              }
            }

            pathPoints.push({ x: x2, y: y1 + tr });
            pathPoints.push({ x: x2, y: y2 - br });
            if (br > 0) {
              for (let i = 1; i <= arcDetail; i++) {
                const angle = (i / arcDetail) * (Math.PI / 2);
                pathPoints.push({ x: x2 - br + Math.cos(angle) * br, y: y2 - br + Math.sin(angle) * br });
              }
            }

            pathPoints.push({ x: x2 - br, y: y2 });
            pathPoints.push({ x: x1 + bl, y: y2 });
            if (bl > 0) {
              for (let i = 1; i <= arcDetail; i++) {
                const angle = Math.PI / 2 + (i / arcDetail) * (Math.PI / 2);
                pathPoints.push({ x: x1 + bl + Math.cos(angle) * bl, y: y2 - bl + Math.sin(angle) * bl });
              }
            }

            pathPoints.push({ x: x1, y: y2 - bl });
            pathPoints.push({ x: x1, y: y1 + tl });
            if (tl > 0) {
              for (let i = 1; i <= arcDetail; i++) {
                const angle = Math.PI + (i / arcDetail) * (Math.PI / 2);
                pathPoints.push({ x: x1 + tl + Math.cos(angle) * tl, y: y1 + tl + Math.sin(angle) * tl });
              }
            }
            pathPoints.push({ x: x1 + tl, y: y1 });

            if (_DEBUG) {
              console.log("Complex rectangle path with corners:", pathPoints.length, "points, arcDetail:", arcDetail);
            }
          }

          // Apply current transformation to all pathPoints
          const transformedPathPoints = applyCurrentTransformToPoints(pathPoints);

          if (_doFill) {
            let fillStitches = [];

            switch (_currentFillMode) {
              case FILL_MODE.TATAMI:
                fillStitches = createTatamiFillFromPath(transformedPathPoints, _fillSettings);
                break;
              // Add other fill modes here as they are implemented
              default:
                fillStitches = createTatamiFillFromPath(transformedPathPoints, _fillSettings);
            }

            if (fillStitches && fillStitches.length > 0) {
              // Add the stitches to the current thread
              _stitchData.threads[_fillThreadIndex].runs.push(fillStitches);

              // Draw fill stitches if in appropriate mode
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(fillStitches, _fillThreadIndex);
              }
            }
          }

          if (_doStroke) {
            // Use the path-based stroke approach for consistency
            const strokeStitches = p5embroidery.convertVerticesToStitches(
              transformedPathPoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
              _strokeSettings,
            );

            if (strokeStitches && strokeStitches.length > 0) {
              _stitchData.threads[_strokeThreadIndex].runs.push(strokeStitches);

              // Draw stroke stitches if in appropriate mode
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(strokeStitches, _strokeThreadIndex);
              }
            }
          }

          // Handle p5 drawing mode
          if (_drawMode === "p5") {
            _originalStrokeWeightFunc.call(_p5Instance, mmToPixel$1(_strokeSettings.strokeWeight));
            _originalRectFunc.call(
              _p5Instance,
              mmToPixel$1(x),
              mmToPixel$1(y),
              mmToPixel$1(w),
              mmToPixel$1(h),
              ...cornerRs.map((r) => mmToPixel$1(r)),
            );
          }
        } else {
          _originalRectFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js square() function to record embroidery stitches.
     * @private
     */
    let _originalSquareFunc;
    function overrideSquareFunction() {
      _originalSquareFunc = window.square;
      window.square = function (x, y, w) {
        if (_recording) {
          window.rect.call(this, x, y, w, w);
        } else {
          _originalSquareFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js triangle() function to record embroidery stitches.
     * @private
     */
    let _originalTriangleFunc;
    function overrideTriangleFunction() {
      _originalTriangleFunc = window.triangle;
      window.triangle = function (x1, y1, x2, y2, x3, y3) {
        if (_recording) {
          // Build path points for triangle
          const pathPoints = [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
            { x: x3, y: y3 },
            { x: x1, y: y1 }, // close
          ];

          // Apply current transformation to all pathPoints
          const transformedPathPoints = applyCurrentTransformToPoints(pathPoints);

          // Fill
          if (_doFill) {
            let fillStitches = [];
            switch (_currentFillMode) {
              case FILL_MODE.TATAMI:
                fillStitches = createTatamiFillFromPath(transformedPathPoints, _fillSettings);
                break;
              default:
                fillStitches = createTatamiFillFromPath(transformedPathPoints, _fillSettings);
            }
            if (fillStitches && fillStitches.length > 0) {
              _stitchData.threads[_fillThreadIndex].runs.push(fillStitches);
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(fillStitches, _fillThreadIndex);
              }
            }
          }
          // Stroke
          if (_doStroke) {
            const strokeStitches = p5embroidery.convertVerticesToStitches(
              transformedPathPoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
              _strokeSettings,
            );
            if (strokeStitches && strokeStitches.length > 0) {
              _stitchData.threads[_strokeThreadIndex].runs.push(strokeStitches);
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(strokeStitches, _strokeThreadIndex);
              }
            }
          }
          if (_drawMode === "p5") {
            _originalStrokeWeightFunc.call(_p5Instance, mmToPixel$1(_strokeSettings.strokeWeight));
            _originalTriangleFunc.call(
              _p5Instance,
              mmToPixel$1(x1),
              mmToPixel$1(y1),
              mmToPixel$1(x2),
              mmToPixel$1(y2),
              mmToPixel$1(x3),
              mmToPixel$1(y3),
            );
          }
        } else {
          _originalTriangleFunc.apply(this, arguments);
        }
      };
    }
    /**
     * Overrides p5.js quad() function to record embroidery stitches.
     * @private
     */
    let _originalQuadFunc;
    function overrideQuadFunction() {
      _originalQuadFunc = window.quad;
      window.quad = function (x1, y1, x2, y2, x3, y3, x4, y4) {
        if (_recording) {
          const pathPoints = [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
            { x: x3, y: y3 },
            { x: x4, y: y4 },
            { x: x1, y: y1 }, // close
          ];

          // Apply current transformation to all pathPoints
          const transformedPathPoints = applyCurrentTransformToPoints(pathPoints);

          // Fill
          if (_doFill) {
            let fillStitches = [];
            switch (_currentFillMode) {
              case FILL_MODE.TATAMI:
                fillStitches = createTatamiFillFromPath(transformedPathPoints, _fillSettings);
                break;
              default:
                fillStitches = createTatamiFillFromPath(transformedPathPoints, _fillSettings);
            }
            if (fillStitches && fillStitches.length > 0) {
              _stitchData.threads[_fillThreadIndex].runs.push(fillStitches);
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(fillStitches, _fillThreadIndex);
              }
            }
          }
          // Stroke
          if (_doStroke) {
            const strokeStitches = p5embroidery.convertVerticesToStitches(
              transformedPathPoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
              _strokeSettings,
            );
            if (strokeStitches && strokeStitches.length > 0) {
              _stitchData.threads[_strokeThreadIndex].runs.push(strokeStitches);
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(strokeStitches, _strokeThreadIndex);
              }
            }
          }
          if (_drawMode === "p5") {
            _originalStrokeWeightFunc.call(_p5Instance, mmToPixel$1(_strokeSettings.strokeWeight));
            _originalQuadFunc.call(
              _p5Instance,
              mmToPixel$1(x1),
              mmToPixel$1(y1),
              mmToPixel$1(x2),
              mmToPixel$1(y2),
              mmToPixel$1(x3),
              mmToPixel$1(y3),
              mmToPixel$1(x4),
              mmToPixel$1(y4),
            );
          }
        } else {
          _originalQuadFunc.apply(this, arguments);
        }
      };
    }
    /**
     * Overrides p5.js arc() function to record embroidery stitches.
     * @private
     */
    let _originalArcFunc;
    function overrideArcFunction() {
      _originalArcFunc = window.arc;
      window.arc = function (x, y, w, h, start, stop, mode) {
        if (_recording) {
          if (_DEBUG) {
            console.log("Arc called with:", { x, y, w, h, start, stop, mode, _doFill, _doStroke });
          }

          // Default mode to OPEN if not specified
          if (mode === undefined) {
            mode = window.OPEN || "open";
          }

          // Approximate arc as polyline
          const numSteps = Math.max(
            12,
            Math.ceil((Math.abs(stop - start) * Math.max(w, h)) / (_embroiderySettings.stitchLength * 2)),
          );
          const pathPoints = [];

          // Generate arc points
          for (let i = 0; i <= numSteps; i++) {
            const theta = start + (i / numSteps) * (stop - start);
            pathPoints.push({
              x: x + (Math.cos(theta) * w) / 2,
              y: y + (Math.sin(theta) * h) / 2,
            });
          }

          if (_DEBUG) {
            console.log("Generated arc points:", pathPoints.length);
          }

          // Apply current transformation to all pathPoints
          const transformedPathPoints = applyCurrentTransformToPoints(pathPoints);
          // Also transform the center point
          const transformedCenter = applyCurrentTransform(x, y);

          // Fill - handle all modes, not just PIE and CHORD
          if (_doFill) {
            let fillPathPoints = [...transformedPathPoints];

            if (mode === window.PIE || mode === "pie") {
              // PIE mode: close to center and back to start
              fillPathPoints.push({ x: transformedCenter.x, y: transformedCenter.y });
              fillPathPoints.push(transformedPathPoints[0]);
            } else if (mode === window.CHORD || mode === "chord") {
              // CHORD mode: close with straight line from end to start
              if (transformedPathPoints.length > 1) {
                fillPathPoints.push(transformedPathPoints[0]); // Close the path
              }
            } else {
              // For OPEN mode or undefined, create a pie-like fill (common expectation)
              fillPathPoints.push({ x: transformedCenter.x, y: transformedCenter.y });
              fillPathPoints.push(transformedPathPoints[0]);
            }

            if (_DEBUG) {
              console.log("Fill path points:", fillPathPoints.length, "Mode:", mode);
            }

            let fillStitches = [];

            switch (_currentFillMode) {
              case FILL_MODE.TATAMI:
                fillStitches = createTatamiFillFromPath(fillPathPoints, _fillSettings);
                break;
              case FILL_MODE.SATIN:
                fillStitches = createSatinFillFromPath(fillPathPoints, _fillSettings);
                break;
              case FILL_MODE.SPIRAL:
                fillStitches = createSpiralFillFromPath(fillPathPoints, _fillSettings);
                break;
              default:
                fillStitches = createTatamiFillFromPath(fillPathPoints, _fillSettings);
            }

            if (_DEBUG) {
              console.log("Fill stitches generated:", fillStitches.length);
            }

            if (fillStitches && fillStitches.length > 0) {
              _stitchData.threads[_fillThreadIndex].runs.push(fillStitches);
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(fillStitches, _fillThreadIndex);
              }
            }
          }

          // Stroke (uses transformed arc points, not closed fill path)
          if (_doStroke) {
            let strokePathPoints = transformedPathPoints;

            // For PIE mode, include lines to center for stroke
            if (mode === window.PIE || mode === "pie") {
              strokePathPoints = [
                { x: transformedCenter.x, y: transformedCenter.y }, // Start at center
                ...transformedPathPoints, // Arc points
                { x: transformedCenter.x, y: transformedCenter.y }, // Back to center
              ];
            } else if (mode === window.CHORD || mode === "chord") {
              // For CHORD mode, add the chord line
              strokePathPoints = [
                ...transformedPathPoints,
                transformedPathPoints[0], // Close with chord
              ];
            }
            // For OPEN mode, use transformedPathPoints as-is

            const strokeStitches = p5embroidery.convertVerticesToStitches(
              strokePathPoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
              _strokeSettings,
            );

            if (strokeStitches && strokeStitches.length > 0) {
              _stitchData.threads[_strokeThreadIndex].runs.push(strokeStitches);
              if (_drawMode === "stitch" || _drawMode === "realistic") {
                drawStitches(strokeStitches, _strokeThreadIndex);
              }
            }
          }

          if (_drawMode === "p5") {
            _originalStrokeWeightFunc.call(_p5Instance, mmToPixel$1(_strokeSettings.strokeWeight));
            _originalArcFunc.call(_p5Instance, mmToPixel$1(x), mmToPixel$1(y), mmToPixel$1(w), mmToPixel$1(h), start, stop, mode);
          }
        } else {
          _originalArcFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js beginContour() function.
     * @private
     */
    let _originalBeginContourFunc;
    function overrideBeginContourFunction() {
      _originalBeginContourFunc = window.beginContour;

      window.beginContour = function () {
        if (_recording) {
          if (_DEBUG) console.log("beginContour called");
          _isContour = true;
          _currentContour = []; // Start a new contour

          if (_drawMode === "p5") {
            _originalBeginContourFunc.call(_p5Instance);
          }
        } else {
          _originalBeginContourFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides p5.js endContour() function.
     * @private
     */
    let _originalEndContourFunc;
    function overrideEndContourFunction() {
      _originalEndContourFunc = window.endContour;

      window.endContour = function () {
        if (_recording) {
          if (_DEBUG) console.log("endContour called, current contour length:", _currentContour.length);

          if (_currentContour.length > 0) {
            // Close the contour if it's not already closed
            const firstPoint = _currentContour[0];
            const lastPoint = _currentContour[_currentContour.length - 1];
            const distance = Math.sqrt(Math.pow(lastPoint.x - firstPoint.x, 2) + Math.pow(lastPoint.y - firstPoint.y, 2));

            // If the contour isn't closed, close it
            if (distance > 0.1) {
              _currentContour.push({ x: firstPoint.x, y: firstPoint.y });
            }

            // Add the completed contour to the contours array
            _contours.push([..._currentContour]);
            if (_DEBUG) console.log("Added contour with", _currentContour.length, "points");
          }

          _currentContour = [];
          _isContour = false;

          if (_drawMode === "p5") {
            _originalEndContourFunc.call(_p5Instance);
          }
        } else {
          _originalEndContourFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides necessary p5.js functions for embroidery recording.
     * @private
     */
    function overrideP5Functions() {
      // Transformation functions
      overridePushFunction();
      overridePopFunction();
      overrideTranslateFunction();
      overrideRotateFunction();
      overrideScaleFunction();

      // Drawing functions
      overrideLineFunction();
      overrideCurveFunction();
      overrideBezierFunction();
      overrideEllipseFunction();
      overrideCircleFunction();
      overrideStrokeWeightFunction();
      overrideStrokeJoinFunction();
      overridePointFunction();
      overrideStrokeFunction();
      overrideNoStrokeFunction();
      overrideFillFunction();
      overrideNoFillFunction();
      overrideRectFunction();
      overrideSquareFunction();
      overrideTriangleFunction();
      overrideQuadFunction();
      overrideArcFunction();

      // Shape vertex functions
      overrideVertexFunction();
      overrideBezierVertexFunction();
      overrideQuadraticVertexFunction();
      overrideCurveVertexFunction();
      overrideBeginShapeFunction();
      overrideEndShapeFunction();
      overrideBeginContourFunction();
      overrideEndContourFunction();
    }

    /**
     * Restores original p5.js functions.
     * @private
     */
    function restoreP5Functions() {
      // Restore transformation functions
      window.push = _originalPushFunc;
      window.pop = _originalPopFunc;
      window.translate = _originalTranslateFunc;
      window.rotate = _originalRotateFunc;
      window.scale = _originalScaleFunc;

      // Restore drawing functions
      window.line = _originalLineFunc;
      window.curve = _originalCurveFunc;
      window.bezier = _originalBezierFunc;
      window.ellipse = _originalEllipseFunc;
      window.circle = _originalCircleFunc;
      window.strokeWeight = _originalStrokeWeightFunc;
      window.strokeJoin = _originalStrokeJoinFunc;
      window.point = _originalPointFunc;
      window.stroke = _originalStrokeFunc;
      window.noStroke = _originalNoStrokeFunc;
      window.fill = _originalFillFunc;
      window.noFill = _originalNoFillFunc;
      window.rect = _originalRectFunc;
      window.square = _originalSquareFunc;
      window.triangle = _originalTriangleFunc;
      window.quad = _originalQuadFunc;
      window.arc = _originalArcFunc;

      // Restore shape vertex functions
      window.vertex = _originalVertexFunc;
      window.bezierVertex = _originalBezierVertexFunc;
      window.quadraticVertex = _originalQuadraticVertexFunc;
      window.curveVertex = _originalCurveVertexFunc;
      window.beginShape = _originalBeginShapeFunc;
      window.endShape = _originalEndShapeFunc;
      window.beginContour = _originalBeginContourFunc;
      window.endContour = _originalEndContourFunc;
    }

    /**
     * Sets the stitch parameters for embroidery.
     * @method setStitch
     * @for p5
     * @param {Number} minLength - Minimum stitch length in millimeters
     * @param {Number} desiredLength - Desired stitch length in millimeters
     * @param {Number} noise - Amount of random variation in stitch length (0-1)
     * @example
     *
     *
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   setStitch(1, 3, 0.2); // min 1mm, desired 3mm, 20% noise
     *   // Draw embroidery patterns
     * }
     *
     *
     */
    p5embroidery.setStitch = function (minLength, desiredLength, noise) {
      _embroiderySettings.minStitchLength = Math.max(0, minLength);
      _embroiderySettings.stitchLength = Math.max(0.1, desiredLength);
      _embroiderySettings.resampleNoise = Math.min(1, Math.max(0, noise));

      _strokeSettings.minStitchLength = _embroiderySettings.minStitchLength;
      _strokeSettings.stitchLength = _embroiderySettings.stitchLength;
      _strokeSettings.resampleNoise = _embroiderySettings.resampleNoise;
    };

    /**
     * Sets the stroke settings for embroidery.
     * @method setStrokeSettings
     * @for p5
     * @param {Object} settings - The settings for the stroke
     */

    p5embroidery.setStrokeSettings = function (settings) {
      // Merge default settings with provided settings
      Object.assign(_strokeSettings, settings);
    };

    /**
     * Sets the fill settings for embroidery.
     * @method setFillSettings
     * @for p5
     * @param {Object} settings - The settings for the fill
     */

    p5embroidery.setFillSettings = function (settings) {
      // Merge default settings with provided settings
      Object.assign(_fillSettings, settings);
    };

    /**
     * Sets the draw mode for embroidery.
     * @method setDrawMode
     * @for p5
     * @param {String} mode - The draw mode to set ('stitch', 'p5', 'realistic')
     * @example
     *
     *
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   setDrawMode('stitch'); // Show stitch points and lines
     *   // Draw embroidery patterns
     * }
     *
     *
     */
    p5embroidery.setDrawMode = function (mode) {
      _drawMode = mode;
    };

    /**
     * Converts a line segment into a series of stitches.
     * @private
     * @param {number} x1 - Starting x-coordinate in mm
     * @param {number} y1 - Starting y-coordinate in mm
     * @param {number} x2 - Ending x-coordinate in mm
     * @param {number} y2 - Ending y-coordinate in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function convertLineToStitches(x1, y1, x2, y2, stitchSettings = _embroiderySettings) {
      if (_DEBUG)
        console.log("Converting line to stitches (before offset):", {
          from: { x: x1, y: y1 },
          to: { x: x2, y: y2 },
        });

      if (_DEBUG)
        console.log("Converting line to stitches", {
          from: { x: x1, y: y1 },
          to: { x: x2, y: y2 },
        });

      let dx = x2 - x1;
      let dy = y2 - y1;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (_DEBUG)
        console.log("Line properties:", {
          dx,
          dy,
          distance,
          minStitchLength: stitchSettings.minStitchLength,
          stitchLength: stitchSettings.stitchLength,
          strokeWeight: stitchSettings.strokeWeight,
        });

      if (stitchSettings.strokeWeight > 0) {
        switch (_currentStrokeMode) {
          case STROKE_MODE.STRAIGHT:
            return straightLineStitch(x1, y1, x2, y2, stitchSettings);
          case STROKE_MODE.ZIGZAG:
            return zigzagStitch(x1, y1, x2, y2, stitchSettings);
          case STROKE_MODE.RAMP:
            return rampStitch(x1, y1, x2, y2, stitchSettings);
          case STROKE_MODE.SQUARE:
            return squareStitch(x1, y1, x2, y2, stitchSettings);
          case STROKE_MODE.LINES:
            return multiLineStitch(x1, y1, x2, y2, stitchSettings);
          case STROKE_MODE.SASHIKO:
            return sashikoStitch(x1, y1, x2, y2, stitchSettings);
          default:
            return straightLineStitch(x1, y1, x2, y2, stitchSettings);
        }
      } else {
        return straightLineStitch(x1, y1, x2, y2, stitchSettings);
      }
    }

    /**
     * Converts a path into a series of stitches with proper corner joins.
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function convertPathToStitchesWithJoins(pathPoints, stitchSettings = _embroiderySettings) {
      if (!pathPoints || pathPoints.length < 2) {
        console.warn("Cannot convert path to stitches from insufficient path points");
        return [];
      }

      const strokeWeight = stitchSettings.strokeWeight;
      const joinType = stitchSettings.strokeJoin || _currentStrokeJoin;

      if (_DEBUG) {
        console.log("convertPathToStitchesWithJoins:", {
          pathPointsCount: pathPoints.length,
          strokeWeight: strokeWeight,
          strokeMode: stitchSettings.strokeMode,
          joinType: joinType,
        });
      }

      // For zigzag and other wide stroke modes, use a different approach
      switch (stitchSettings.strokeMode) {
        case STROKE_MODE.ZIGZAG:
          if (_DEBUG) console.log("Creating zigzag with joins...");
          const zigzagResult = createZigzagWithJoins(pathPoints, stitchSettings);
          if (_DEBUG) console.log("Zigzag result:", zigzagResult.length, "stitches");
          return zigzagResult;
        case STROKE_MODE.LINES:
          return multiLineStitchFromPath(pathPoints, stitchSettings);
        case STROKE_MODE.SASHIKO:
          return sashikoStitchFromPath(pathPoints, stitchSettings);
        default:
          return straightLineStitchFromPath(pathPoints, stitchSettings);
      }
    }

    /**
     * Creates a continuous zigzag pattern with proper corner joins.
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function createZigzagWithJoins(pathPoints, stitchSettings) {
      if (!pathPoints || pathPoints.length < 2) {
        return [];
      }

      const width = stitchSettings.strokeWeight;
      const density = stitchSettings.stitchLength;
      const result = [];

      // Create parallel paths offset to each side
      const leftPath = createOffsetPath(pathPoints, width / 2, true);
      const rightPath = createOffsetPath(pathPoints, width / 2, false);

      if (leftPath.length === 0 || rightPath.length === 0) {
        // Fall back to simple zigzag if offset calculation fails
        return zigzagStitchFromPath(pathPoints, stitchSettings);
      }

      if (_DEBUG) {
        console.log("Original path:", pathPoints);
        console.log("Left path:", leftPath);
        console.log("Right path:", rightPath);
      }

      // Calculate total path length for zigzag spacing
      let totalLength = 0;
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const dx = pathPoints[i + 1].x - pathPoints[i].x;
        const dy = pathPoints[i + 1].y - pathPoints[i].y;
        totalLength += Math.sqrt(dx * dx + dy * dy);
      }

      const numZigzags = Math.max(2, Math.floor(totalLength / density));

      // Start from left side and ensure we always get valid points
      let currentSide = leftPath;
      let isOnLeftSide = true;

      // Interpolate between left and right paths to create zigzag
      for (let i = 0; i <= numZigzags; i++) {
        const t = i / numZigzags;

        // Alternate between sides for each stitch
        currentSide = isOnLeftSide ? leftPath : rightPath;
        const point = getPointAtRatio(currentSide, t);

        if (point) {
          result.push(point);
          if (_DEBUG && i < 5) {
            console.log(`Zigzag point ${i}: side=${isOnLeftSide ? "left" : "right"}, t=${t}, point=`, point);
          }
        } else {
          // If we can't get a point from one side, try the other
          const alternateSide = isOnLeftSide ? rightPath : leftPath;
          const alternatePoint = getPointAtRatio(alternateSide, t);
          if (alternatePoint) {
            result.push(alternatePoint);
          }
        }

        // Toggle sides for next iteration
        isOnLeftSide = !isOnLeftSide;
      }

      if (_DEBUG) {
        console.log("Zigzag result:", result.slice(0, 10));
      }

      return result;
    }

    /**
     * Simplifies a path by removing redundant points that are too close together.
     * @private
     */
    function simplifyPath(pathPoints, tolerance = 0.1) {
      if (pathPoints.length <= 2) return pathPoints;

      const simplified = [pathPoints[0]]; // Always keep first point

      for (let i = 1; i < pathPoints.length - 1; i++) {
        const prev = simplified[simplified.length - 1];
        const curr = pathPoints[i];
        pathPoints[i + 1];

        // Calculate distance from current point to previous
        const distToPrev = Math.sqrt((curr.x - prev.x) * (curr.x - prev.x) + (curr.y - prev.y) * (curr.y - prev.y));

        // Keep point if it's far enough from previous point
        if (distToPrev >= tolerance) {
          simplified.push(curr);
        }
      }

      // Always keep last point
      simplified.push(pathPoints[pathPoints.length - 1]);

      if (_DEBUG && simplified.length !== pathPoints.length) {
        console.log(`Path simplified: ${pathPoints.length} -> ${simplified.length} points`);
      }

      return simplified;
    }

    /**
     * Creates an offset path parallel to the original path.
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Original path points
     * @param {number} offset - Offset distance (positive = left, negative = right)
     * @param {boolean} isLeft - Whether this is the left side offset
     * @returns {Array<{x: number, y: number}>} Offset path points
     */
    function createOffsetPath(pathPoints, offset, isLeft) {
      const offsetPath = [];

      // Simplify the path first to remove closely spaced points
      const simplifiedPath = simplifyPath(pathPoints, 0.2);

      // Check if this is a closed path (first and last points are the same or very close)
      const isClosedPath =
        simplifiedPath.length > 2 &&
        Math.abs(simplifiedPath[0].x - simplifiedPath[simplifiedPath.length - 1].x) < 0.1 &&
        Math.abs(simplifiedPath[0].y - simplifiedPath[simplifiedPath.length - 1].y) < 0.1;

      for (let i = 0; i < simplifiedPath.length; i++) {
        const curr = simplifiedPath[i];
        let prev, next;

        if (isClosedPath) {
          // For closed paths, wrap around for prev/next calculation
          prev = i > 0 ? simplifiedPath[i - 1] : simplifiedPath[simplifiedPath.length - 2]; // Skip duplicate end point
          next = i < simplifiedPath.length - 1 ? simplifiedPath[i + 1] : simplifiedPath[1]; // Skip duplicate start point
        } else {
          // For open paths, use normal indexing
          prev = i > 0 ? simplifiedPath[i - 1] : null;
          next = i < simplifiedPath.length - 1 ? simplifiedPath[i + 1] : null;
        }

        let offsetPoint;

        if (prev === null) {
          // First point of open path - use direction to next point
          const dx = next.x - curr.x;
          const dy = next.y - curr.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const perpX = (-dy / len) * (isLeft ? offset : -offset);
            const perpY = (dx / len) * (isLeft ? offset : -offset);
            offsetPoint = { x: curr.x + perpX, y: curr.y + perpY };
          } else {
            offsetPoint = { x: curr.x, y: curr.y };
          }
        } else if (next === null) {
          // Last point of open path - use direction from previous point
          const dx = curr.x - prev.x;
          const dy = curr.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const perpX = (-dy / len) * (isLeft ? offset : -offset);
            const perpY = (dx / len) * (isLeft ? offset : -offset);
            offsetPoint = { x: curr.x + perpX, y: curr.y + perpY };
          } else {
            offsetPoint = { x: curr.x, y: curr.y };
          }
        } else {
          // Middle point or closed path vertex - calculate proper join
          offsetPoint = calculateOffsetCorner(prev, curr, next, offset, isLeft);
        }

        offsetPath.push(offsetPoint);
      }

      return offsetPath;
    }

    /**
     * Calculates the offset corner point with proper join handling.
     * @private
     */
    function calculateOffsetCorner(p1, p2, p3, offset, isLeft) {
      // Calculate direction vectors
      const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

      // Normalize
      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

      // Handle very short segments (common in curved corners)
      if (len1 < 0.1 || len2 < 0.1) {
        // Use simple perpendicular offset for tiny segments
        const avgVecX = (v1.x + v2.x) / 2;
        const avgVecY = (v1.y + v2.y) / 2;
        const avgLen = Math.sqrt(avgVecX * avgVecX + avgVecY * avgVecY);

        if (avgLen > 0) {
          const actualOffset = isLeft ? offset : -offset;
          const perpX = (-avgVecY / avgLen) * actualOffset;
          const perpY = (avgVecX / avgLen) * actualOffset;
          return { x: p2.x + perpX, y: p2.y + perpY };
        }
        return { x: p2.x, y: p2.y };
      }

      const n1 = { x: v1.x / len1, y: v1.y / len1 };
      const n2 = { x: v2.x / len2, y: v2.y / len2 };

      // Check angle between vectors to handle sharp turns
      const dot = n1.x * n2.x + n1.y * n2.y;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

      // Calculate perpendiculars
      const actualOffset = isLeft ? offset : -offset;
      const perp1 = { x: -n1.y * actualOffset, y: n1.x * actualOffset };
      const perp2 = { x: -n2.y * actualOffset, y: n2.x * actualOffset };

      // For very small angles (nearly straight line), use simple averaging
      if (angle < 0.1) {
        const avgPerpX = (perp1.x + perp2.x) / 2;
        const avgPerpY = (perp1.y + perp2.y) / 2;
        return { x: p2.x + avgPerpX, y: p2.y + avgPerpY };
      }

      // For sharp angles (< 30 degrees), limit the miter to prevent extreme spikes
      if (angle < Math.PI / 6) {
        const avgPerpX = (perp1.x + perp2.x) / 2;
        const avgPerpY = (perp1.y + perp2.y) / 2;
        return { x: p2.x + avgPerpX, y: p2.y + avgPerpY };
      }

      // Calculate intersection of offset lines
      const line1Start = { x: p1.x + perp1.x, y: p1.y + perp1.y };
      const line1End = { x: p2.x + perp1.x, y: p2.y + perp1.y };
      const line2Start = { x: p2.x + perp2.x, y: p2.y + perp2.y };
      const line2End = { x: p3.x + perp2.x, y: p3.y + perp2.y };

      const intersection = lineLineIntersection(line1Start, line1End, line2Start, line2End);

      if (intersection) {
        // Limit miter length to prevent extreme spikes
        const miterDistance = Math.sqrt(
          (intersection.x - p2.x) * (intersection.x - p2.x) + (intersection.y - p2.y) * (intersection.y - p2.y),
        );
        const maxMiterDistance = Math.abs(offset) * 3; // Reduced miter limit for stability

        if (miterDistance <= maxMiterDistance) {
          return intersection;
        }
      }

      // Fall back to averaged perpendicular for failed intersections or extreme miters
      const avgPerpX = (perp1.x + perp2.x) / 2;
      const avgPerpY = (perp1.y + perp2.y) / 2;
      const avgLen = Math.sqrt(avgPerpX * avgPerpX + avgPerpY * avgPerpY);

      if (avgLen > 0) {
        // Normalize and scale to proper offset
        const scale = Math.abs(offset) / avgLen;
        return {
          x: p2.x + avgPerpX * scale,
          y: p2.y + avgPerpY * scale,
        };
      } else {
        return { x: p2.x, y: p2.y };
      }
    }

    /**
     * Gets a point at a specific ratio along a path.
     * @private
     */
    function getPointAtRatio(pathPoints, ratio) {
      if (!pathPoints || pathPoints.length === 0) return null;
      if (pathPoints.length === 1) return pathPoints[0];

      // Calculate total path length
      let totalLength = 0;
      const segments = [];

      for (let i = 0; i < pathPoints.length - 1; i++) {
        const dx = pathPoints[i + 1].x - pathPoints[i].x;
        const dy = pathPoints[i + 1].y - pathPoints[i].y;
        const length = Math.sqrt(dx * dx + dy * dy);
        segments.push(length);
        totalLength += length;
      }

      if (totalLength === 0) return pathPoints[0];

      // Find target distance along path
      const targetDistance = ratio * totalLength;
      let currentDistance = 0;

      // Find which segment contains the target point
      for (let i = 0; i < segments.length; i++) {
        if (currentDistance + segments[i] >= targetDistance) {
          // Interpolate within this segment
          const segmentRatio = (targetDistance - currentDistance) / segments[i];
          const p1 = pathPoints[i];
          const p2 = pathPoints[i + 1];

          return {
            x: p1.x + (p2.x - p1.x) * segmentRatio,
            y: p1.y + (p2.y - p1.y) * segmentRatio,
          };
        }
        currentDistance += segments[i];
      }

      // If we get here, return the last point
      return pathPoints[pathPoints.length - 1];
    }

    /**
     * Converts a path into a series of stitches.
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function convertPathToStitches(pathPoints, stitchSettings = _embroiderySettings) {
      if (!pathPoints || pathPoints.length < 2) {
        console.warn("Cannot convert path to stitches from insufficient path points");
        return [];
      }

      if (stitchSettings.strokeWeight > 0) {
        switch (_currentStrokeMode) {
          case STROKE_MODE.STRAIGHT:
            return straightLineStitchFromPath(pathPoints, stitchSettings);
          case STROKE_MODE.ZIGZAG:
            return zigzagStitchFromPath(pathPoints, stitchSettings);
          case STROKE_MODE.RAMP:
            return rampStitchFromPath(pathPoints, stitchSettings);
          case STROKE_MODE.SQUARE:
            return squareStitchFromPath(pathPoints, stitchSettings);
          case STROKE_MODE.LINES:
            return multiLineStitchFromPath(pathPoints, stitchSettings);
          case STROKE_MODE.SASHIKO:
            return sashikoStitchFromPath(pathPoints, stitchSettings);
          default:
            // For simple straight stitches, we'll need to break this down segment by segment
            const result = [];
            for (let i = 0; i < pathPoints.length - 1; i++) {
              const p1 = pathPoints[i];
              const p2 = pathPoints[i + 1];
              const segmentStitches = straightLineStitch(p1.x, p1.y, p2.x, p2.y, stitchSettings);
              result.push(...segmentStitches);
            }
            return result;
        }
      } else {
        // For simple straight stitches, we'll need to break this down segment by segment
        const result = [];
        for (let i = 0; i < pathPoints.length - 1; i++) {
          const p1 = pathPoints[i];
          const p2 = pathPoints[i + 1];
          const segmentStitches = straightLineStitch(p1.x, p1.y, p2.x, p2.y, stitchSettings);
          result.push(...segmentStitches);
        }
        return result;
      }
    }

    /**
     * Creates zigzag stitches.
     * @method zigzagStitch
     * @private
     * @param {number} x1 - Starting x-coordinate in mm
     * @param {number} y1 - Starting y-coordinate in mm
     * @param {number} x2 - Ending x-coordinate in mm
     * @param {number} y2 - Ending y-coordinate in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function zigzagStitch(x1, y1, x2, y2, stitchSettings) {

      // For a simple straight line, we can implement the zigzag directly
      // instead of calling the path-based version
      let stitches = [];
      let dx = x2 - x1;
      let dy = y2 - y1;
      let distance = Math.sqrt(dx * dx + dy * dy);

      // Check for zero distance to prevent division by zero
      if (distance === 0 || distance < 0.001) {
        // If points are the same or very close, just return the start point
        if (_DEBUG) console.log("Zero distance detected in zigzagStitch, returning single point");
        return [
          {
            x: x1,
            y: y1,
          },
        ];
      }

      // Calculate perpendicular vector for zigzag
      let perpX = -dy / distance;
      let perpY = dx / distance;

      // Use strokeWeight for the width of the zigzag
      let width = stitchSettings.strokeWeight > 0 ? stitchSettings.strokeWeight : 2;

      // Calculate number of zigzag segments
      let zigzagDistance = stitchSettings.stitchLength;
      let numZigzags = Math.max(2, Math.floor(distance / zigzagDistance));

      // Create zigzag pattern
      let halfWidth = width / 2;
      let entry = stitchSettings.strokeEntry;
      let exit = stitchSettings.strokeExit;
      let side = 1;

      if (entry === "right") {
        side = -1;
      } else if (entry === "left") {
        side = 1;
      } else if (entry === "middle") {
        side = 0;
      }

      // Add first point
      stitches.push({
        x: x1 + perpX * halfWidth * side,
        y: y1 + perpY * halfWidth * side,
      });

      // Add zigzag points
      for (let i = 1; i <= numZigzags; i++) {
        let t = i / numZigzags;
        if (side == 0) {
          side = 1;
        } else {
          side = -side; // Alternate sides
        }
        if (i == numZigzags) {
          if (exit == "right") {
            side = -1;
          } else if (exit == "left") {
            side = 1;
          } else if (exit == "middle") {
            side = 0;
          }
        }

        let pointX = x1 + dx * t + perpX * halfWidth * side;
        let pointY = y1 + dy * t + perpY * halfWidth * side;

        stitches.push({
          x: pointX,
          y: pointY,
        });
      }

      if (_DEBUG) console.log("Generated zigzag stitches:", stitches);
      return stitches;
    }

    /**
     * Creates ramp stitches (sawtooth wave pattern).
     * @method rampStitch
     * @private
     * @param {number} x1 - Starting x-coordinate in mm
     * @param {number} y1 - Starting y-coordinate in mm
     * @param {number} x2 - Ending x-coordinate in mm
     * @param {number} y2 - Ending y-coordinate in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function rampStitch(x1, y1, x2, y2, stitchSettings) {
      let stitches = [];
      let dx = x2 - x1;
      let dy = y2 - y1;
      let distance = Math.sqrt(dx * dx + dy * dy);

      // Check for zero distance to prevent division by zero
      if (distance === 0 || distance < 0.001) {
        if (_DEBUG) console.log("Zero distance detected in rampStitch, returning single point");
        return [{ x: x1, y: y1 }];
      }

      // Calculate perpendicular vector for ramp
      let perpX = -dy / distance;
      let perpY = dx / distance;

      // Use strokeWeight for the width of the ramp
      let width = stitchSettings.strokeWeight > 0 ? stitchSettings.strokeWeight : 2;
      let halfWidth = width / 2;

      // Calculate number of ramp segments
      let rampDistance = stitchSettings.stitchLength;
      let numRamps = Math.max(2, Math.floor(distance / rampDistance));

      let entry = stitchSettings.strokeEntry;
      stitchSettings.strokeExit;
      let currentSide = 1;

      if (entry === "right") {
        currentSide = 1;
      } else if (entry === "left") {
        currentSide = -1;
      }

      // Add first point
      stitches.push({
        x: x1 + perpX * halfWidth * currentSide,
        y: y1 + perpY * halfWidth * currentSide,
      });

      // Create ramp pattern - sawtooth wave (gradual rise, sharp drop)
      for (let i = 1; i <= numRamps; i++) {
        let t = i / numRamps;

        if (i % 1 === 0) {
          currentSide = -currentSide;
        }
        let pointX = x1 + dx * t + perpX * halfWidth * currentSide;
        let pointY = y1 + dy * t + perpY * halfWidth * currentSide;
        let pointX1 = x1 + dx * t + perpX * halfWidth * -currentSide;
        let pointY1 = y1 + dy * t + perpY * halfWidth * -currentSide;

        stitches.push({
          x: pointX,
          y: pointY,
        });

        if (entry === "right") {
          if (currentSide === -1) {
            stitches.push({
              x: pointX1,
              y: pointY1,
            });
          }
        } else if (entry === "left") {
          if (currentSide === 1) {
            stitches.push({
              x: pointX1,
              y: pointY1,
            });

            //ellipse(pointX1, pointY1, 5, 5)
          }
        }
      }

      if (_DEBUG) console.log("Generated ramp stitches:", stitches);
      return stitches;
    }

    /**
     * Creates square stitches (square wave pattern).
     * @method squareStitch
     * @private
     * @param {number} x1 - Starting x-coordinate in mm
     * @param {number} y1 - Starting y-coordinate in mm
     * @param {number} x2 - Ending x-coordinate in mm
     * @param {number} y2 - Ending y-coordinate in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function squareStitch(x1, y1, x2, y2, stitchSettings) {
      let stitches = [];
      let dx = x2 - x1;
      let dy = y2 - y1;
      let distance = Math.sqrt(dx * dx + dy * dy);

      // Check for zero distance to prevent division by zero
      if (distance === 0 || distance < 0.001) {
        if (_DEBUG) console.log("Zero distance detected in squareStitch, returning single point");
        return [{ x: x1, y: y1 }];
      }

      // Calculate perpendicular vector for square wave
      let perpX = -dy / distance;
      let perpY = dx / distance;

      // Use strokeWeight for the width of the square wave
      let width = stitchSettings.strokeWeight > 0 ? stitchSettings.strokeWeight : 2;
      let halfWidth = width / 2;

      // Calculate number of square wave segments
      let squareDistance = stitchSettings.stitchLength;
      let numSquares = Math.max(2, Math.floor(distance / squareDistance));

      let entry = stitchSettings.strokeEntry;
      let exit = stitchSettings.strokeExit;
      let currentSide = 1;

      if (entry === "right") {
        currentSide = -1;
      } else if (entry === "left") {
        currentSide = 1;
      } else if (entry === "middle") {
        currentSide = 0;
      }

      // Add first point
      if (entry === "middle") {
        stitches.push({
          x: x1 + perpX * halfWidth * currentSide,
          y: y1 + perpY * halfWidth * currentSide,
        });
      } else {
        stitches.push({
          x: x1 + perpX * halfWidth * currentSide,
          y: y1 + perpY * halfWidth * currentSide,
        });
        stitches.push({
          x: x1 + perpX * halfWidth * -currentSide,
          y: y1 + perpY * halfWidth * -currentSide,
        });
      }

      // Create square wave pattern - abrupt transitions between high and low states
      for (let i = 1; i <= numSquares - 1; i++) {
        let t = i / numSquares;
        let pointX;
        let pointY;
        let pointX1;
        let pointY1;

        // Square wave: stay at current level for half the period, then jump to opposite
        if (i % 1 === 0) {
          currentSide = -currentSide; // Abrupt transition
        }

        if (entry === "middle") {
          if (i === 1) currentSide = 0;
          if (i === 2) currentSide = -1;
        }

        pointX = x1 + dx * t + perpX * halfWidth * currentSide;
        pointY = y1 + dy * t + perpY * halfWidth * currentSide;
        pointX1 = x1 + dx * t + perpX * halfWidth * -currentSide;
        pointY1 = y1 + dy * t + perpY * halfWidth * -currentSide;

        if (exit === "middle") {
          if (i == 1) {
            currentSide = -1;
            pointX = x1 + dx * t;
            pointY = y1 + dy * t;
            pointX1 = x1 + dx * t + perpX * halfWidth * currentSide;
            pointY1 = y1 + dy * t + perpY * halfWidth * currentSide;
          } else if (i == numSquares - 1) {
            pointX = x1 + dx * t + perpX * halfWidth * currentSide;
            pointY = y1 + dy * t + perpY * halfWidth * currentSide;
            pointX1 = x1 + dx * t;
            pointY1 = y1 + dy * t;
          }

          stitches.push({
            x: pointX,
            y: pointY,
          });
          stitches.push({
            x: pointX1,
            y: pointY1,
          });
        } else {
          stitches.push({
            x: pointX,
            y: pointY,
          });
          stitches.push({
            x: pointX1,
            y: pointY1,
          });
        }
      }

      // Add last point
      if (exit === "middle") {
        stitches.push({
          x: x2,
          y: y2,
        });
      } else {
        currentSide = -currentSide;
        stitches.push({
          x: x2 + perpX * halfWidth * currentSide,
          y: y2 + perpY * halfWidth * currentSide,
        });
        stitches.push({
          x: x2 + perpX * halfWidth * -currentSide,
          y: y2 + perpY * halfWidth * -currentSide,
        });
      }

      if (_DEBUG) console.log("Generated square stitches:", stitches);
      return stitches;
    }

    /**
     * Creates straight line stitches.
     * @method straightLineStitch
     * @private
     * @param {number} x1 - Starting x-coordinate in mm
     * @param {number} y1 - Starting y-coordinate in mm
     * @param {number} x2 - Ending x-coordinate in mm
     * @param {number} y2 - Ending y-coordinate in mm
     * @param {Object} [stitchSettings=_embroiderySettings] - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function straightLineStitch(x1, y1, x2, y2, stitchSettings = _embroiderySettings) {
      let stitches = [];
      let dx = x2 - x1;
      let dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Add first stitch at starting point
      stitches.push({
        x: x1,
        y: y1,
      });

      // If distance is less than minimum stitch length, we're done
      if (distance < stitchSettings.minStitchLength) {
        return stitches;
      }

      let baseStitchLength = stitchSettings.stitchLength;
      let numStitches = Math.floor(distance / baseStitchLength);
      let currentDistance = 0;

      //console.log("numStitches",numStitches)
      // Handle full-length stitches
      for (let i = 0; i < numStitches; i++) {
        // Add noise to stitch length if specified
        let stitchLength = baseStitchLength;
        if (stitchSettings.resampleNoise > 0) {
          let noise = (Math.random() * 2 - 1) * stitchSettings.resampleNoise;
          stitchLength *= 1 + noise;
        }

        // update cumulative distance
        currentDistance += stitchLength;
        let t = Math.min(currentDistance / distance, 1);
        //console.log("t",t)
        stitches.push({
          x: x1 + dx * t,
          y: y1 + dy * t,
        });
      }

      // Add final stitch at end point if needed
      let remainingDistance = distance - currentDistance;
      if (remainingDistance > stitchSettings.minStitchLength || numStitches === 0) {
        stitches.push({
          x: x2,
          y: y2,
        });
      }

      if (_DEBUG) console.log("Generated straight line stitches:", stitches);
      return stitches;
    }

    /**
     * Creates line zigzag stitches that takes an array of path points
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function zigzagStitchFromPath(pathPoints, stitchSettings) {
      if (!pathPoints || pathPoints.length < 2) {
        console.warn("Cannot create zigzag stitching from insufficient path points");
        return [];
      }

      const result = [];
      stitchSettings.strokeWeight > 0 ? stitchSettings.strokeWeight : 2;

      // Process each segment between consecutive points
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];

        // Get zigzag stitches for this segment
        const segmentStitches = zigzagStitch(p1.x, p1.y, p2.x, p2.y, stitchSettings);
        result.push(...segmentStitches);
      }

      return result;
    }

    /**
     * Creates ramp stitches from a path (sawtooth wave pattern).
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function rampStitchFromPath(pathPoints, stitchSettings) {
      if (!pathPoints || pathPoints.length < 2) {
        console.warn("Cannot create ramp stitching from insufficient path points");
        return [];
      }

      const result = [];

      // Process each segment between consecutive points
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];

        // Get ramp stitches for this segment
        const segmentStitches = rampStitch(p1.x, p1.y, p2.x, p2.y, stitchSettings);
        result.push(...segmentStitches);
      }

      return result;
    }

    /**
     * Creates square stitches from a path (square wave pattern).
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function squareStitchFromPath(pathPoints, stitchSettings) {
      if (!pathPoints || pathPoints.length < 2) {
        console.warn("Cannot create square stitching from insufficient path points");
        return [];
      }

      const result = [];

      // Process each segment between consecutive points
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];

        // Get square stitches for this segment
        const segmentStitches = squareStitch(p1.x, p1.y, p2.x, p2.y, stitchSettings);
        result.push(...segmentStitches);
      }

      return result;
    }

    function multiLineStitch(x1, y1, x2, y2, stitchSettings) {
      // This is now a wrapper function that calls the path-based implementation
      const pathPoints = [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ];
      return multiLineStitchFromPath(pathPoints, stitchSettings);
    }

    /**
     * Creates multi-line stitches from an array of stitch points
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function multiLineStitchFromPath(pathPoints, stitchSettings) {
      if (!pathPoints || pathPoints.length < 2) {
        console.warn("Cannot create multi-line stitching from insufficient path points");
        return [];
      }

      const threadWeight = stitchSettings.stitchWidth || 0.2;
      const width = stitchSettings.strokeWeight || 2;
      const numLines = Math.max(2, Math.floor(width / threadWeight));
      const result = [];

      // Calculate the spacing between lines
      const spacing = width / (numLines - 1);

      // Generate multiple parallel paths
      for (let i = 0; i < numLines; i++) {
        // Calculate offset from center
        const offset = i * spacing - width / 2;
        const offsetPath = [];

        // Calculate perpendicular vectors for each segment and apply offset
        for (let j = 0; j < pathPoints.length; j++) {
          // For first point or when calculating new perpendicular
          if (j === 0 || j === pathPoints.length - 1) {
            let perpX, perpY;

            if (j === 0) {
              // For first point, use direction to next point
              const dx = pathPoints[1].x - pathPoints[0].x;
              const dy = pathPoints[1].y - pathPoints[0].y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance === 0 || distance < 0.001) {
                // Skip this point if distance is zero
                continue;
              }
              perpX = -dy / distance;
              perpY = dx / distance;
            } else {
              // For last point, use direction from previous point
              const dx = pathPoints[j].x - pathPoints[j - 1].x;
              const dy = pathPoints[j].y - pathPoints[j - 1].y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance === 0 || distance < 0.001) {
                // Skip this point if distance is zero
                continue;
              }
              perpX = -dy / distance;
              perpY = dx / distance;
            }

            offsetPath.push({
              x: pathPoints[j].x + perpX * offset,
              y: pathPoints[j].y + perpY * offset,
            });
          } else {
            // For interior points, average the perpendiculars of adjacent segments
            const prevDx = pathPoints[j].x - pathPoints[j - 1].x;
            const prevDy = pathPoints[j].y - pathPoints[j - 1].y;
            const prevDistance = Math.sqrt(prevDx * prevDx + prevDy * prevDy);

            const nextDx = pathPoints[j + 1].x - pathPoints[j].x;
            const nextDy = pathPoints[j + 1].y - pathPoints[j].y;
            const nextDistance = Math.sqrt(nextDx * nextDx + nextDy * nextDy);

            // Calculate perpendicular vectors
            const prevPerpX = -prevDy / prevDistance;
            const prevPerpY = prevDx / prevDistance;

            const nextPerpX = -nextDy / nextDistance;
            const nextPerpY = nextDx / nextDistance;

            // Average the perpendicular vectors
            const perpX = (prevPerpX + nextPerpX) / 2;
            const perpY = (prevPerpY + nextPerpY) / 2;

            // Normalize the averaged vector
            const length = Math.sqrt(perpX * perpX + perpY * perpY);

            offsetPath.push({
              x: pathPoints[j].x + (perpX / length) * offset,
              y: pathPoints[j].y + (perpY / length) * offset,
            });
          }
        }

        // For even lines, go from start to end
        // For odd lines, go from end to start (back and forth pattern)
        if (i % 2 === 0) {
          for (let j = 0; j < offsetPath.length - 1; j++) {
            const start = offsetPath[j];
            const end = offsetPath[j + 1];
            const lineStitches = straightLineStitch(start.x, start.y, end.x, end.y, stitchSettings);
            result.push(...lineStitches);
          }
        } else {
          for (let j = offsetPath.length - 1; j > 0; j--) {
            const start = offsetPath[j];
            const end = offsetPath[j - 1];
            const lineStitches = straightLineStitch(start.x, start.y, end.x, end.y, stitchSettings);
            result.push(...lineStitches);
          }
        }
      }

      return result;
    }

    function sashikoStitch(x1, y1, x2, y2, stitchSettings) {
      // This is now a wrapper function that calls the path-based implementation
      const pathPoints = [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ];
      return sashikoStitchFromPath(pathPoints, stitchSettings);
    }

    /**
     * Creates sashiko stitches from an array of path points
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} stitchSettings - Settings for the stitches
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function sashikoStitchFromPath(pathPoints, stitchSettings) {
      if (!pathPoints || pathPoints.length < 2) {
        console.warn("Cannot create sashiko stitching from insufficient path points");
        return [];
      }

      const result = [];

      // Process each segment between consecutive points
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];

        // Calculate direction and distance
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction vector
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Sashiko stitch length (longer than regular stitches)
        const sashikoStitchLength = stitchSettings.stitchLength * 2;
        const multilineLength = sashikoStitchLength * 0.5;
        const straightLength = sashikoStitchLength * 0.5;

        let currentDist = 0;
        let isMultiline = true;

        // Create segments along this path section
        while (currentDist < distance) {
          const segmentLength = isMultiline ? multilineLength : straightLength;
          const endDist = Math.min(currentDist + segmentLength, distance);

          // Calculate segment start and end points
          const segStartX = p1.x + dirX * currentDist;
          const segStartY = p1.y + dirY * currentDist;
          const segEndX = p1.x + dirX * endDist;
          const segEndY = p1.y + dirY * endDist;

          // Create segment pathPoints
          const segmentPoints = [
            { x: segStartX, y: segStartY },
            { x: segEndX, y: segEndY },
          ];

          if (isMultiline) {
            // Use the pathPoints version of multiLine stitching
            const lineStitches = multiLineStitchFromPath(segmentPoints, stitchSettings);
            result.push(...lineStitches);
          } else {
            // Create single straight line for this segment
            const lineStitches = straightLineStitch(segStartX, segStartY, segEndX, segEndY, stitchSettings);
            result.push(...lineStitches);
          }

          // Move to next segment
          currentDist = endDist;
          isMultiline = !isMultiline; // Toggle between multiline and straight line
        }
      }

      return result;
    }

    /**
     * Exports the recorded embroidery data as a file.
     * Supported formats: DST (.dst), SVG (.svg), PNG (.png), JSON (.json)
     * @method exportEmbroidery
     * @for p5
     * @param {String} filename - Output filename with extension (dst, svg, png, or json)
     * @example
     *
     *
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns here
     *   circle(50, 50, 20);
     *   line(10, 10, 90, 90);
     *   endRecord();
     *   exportEmbroidery('pattern.dst');  // or .svg, .png, .json
     * }
     *
     *
     */
    p5embroidery.exportEmbroidery = function (filename) {
      const extension = filename.split(".").pop().toLowerCase();

      switch (extension) {
        case "dst":
          p5embroidery.exportDST(filename);
          break;
        case "svg":
          p5embroidery.exportSVG(filename);
          break;
        case "png":
          p5embroidery.exportPNG(filename);
          break;
        case "json":
          p5embroidery.exportJSON(filename);
          break;
        default:
          console.error(`Unsupported embroidery format: ${extension}`);
          break;
      }
    };

    /**
     * Exports the recorded embroidery data as a G-code file.
     * @method exportGcode
     * @for p5
     * @param {String} filename - Output filename
     * @example
     *
     *
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns
     *   endRecord();
     *   exportGcode('pattern.gcode');
     * }
     *
     *
     */
    p5embroidery.exportGcode = function (filename) {
      const points = [];
      for (const thread of _stitchData.threads) {
        for (const run of thread.runs) {
          for (const stitch of run) {
            points.push({
              x: stitch.x,
              y: stitch.y,
              command: stitch.command,
            });
          }
        }
      }

      const gcodeWriter = new GCodeWriter();
      gcodeWriter.addComment("Embroidery Pattern");
      if (points.length > 0) {
        gcodeWriter.move(points[0].x, points[0].y);
        for (const point of points) {
          gcodeWriter.move(point.x, point.y);
        }
      }
      gcodeWriter.saveGcode(points, "EmbroideryPattern", filename);
    };

    /**
     * Exports embroidery pattern as SVG for printing templates.
     * @method exportSVG
     * @for p5
     * @param {string} filename - Output filename
     * @param {Object} [options={}] - Export options
     * @param {string} [options.paperSize='A4'] - Paper size (A4, A3, A2, A1)
     * @param {number} [options.dpi=300] - Print resolution in DPI
     * @param {Object} [options.hoopSize] - Hoop size in mm {width, height}
     * @param {Object} [options.margins] - Margins in mm {top, right, bottom, left}
     * @param {boolean} [options.showGuides=true] - Show hoop guides and center marks
     * @param {boolean} [options.lifeSize=true] - Export at life-size scale
     * @example
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns
     *   circle(50, 50, 20);
     *   endRecord();
     *   exportSVG('my-pattern.svg', {
     *     paperSize: 'A4',
     *     hoopSize: {width: 100, height: 100}
     *   });
     * }
     */
    //TODO Add bounding box to SVG so that SVG can be previewed in browser and not cropped
    p5embroidery.exportSVG = function (filename = "embroidery-pattern.svg", options = {}) {
      if (!_stitchData || !_stitchData.threads) {
        console.warn("🪡 p5.embroider says: No embroidery data to export");
        return;
      }

      try {
        // Create SVG writer instance
        const svgWriter = new SVGWriter();
        svgWriter.setOptions(options);
        svgWriter.validateOptions();

        // Generate title from filename or use default
        const title = filename ? filename.replace(/\.[^/.]+$/, "") : "Embroidery Pattern";

        // Save SVG using the writer
        svgWriter.saveSVG(_stitchData, title, filename);
      } catch (error) {
        console.error("🪡 p5.embroider says: Error exporting SVG:", error);
      }
    };

    /**
     * Exports embroidery pattern as PNG for printing templates.
     * @method exportPNG
     * @for p5
     * @param {string} filename - Output filename
     * @param {Object} [options={}] - Export options
     * @param {string} [options.paperSize='A4'] - Paper size (A4, A3, A2, A1)
     * @param {number} [options.dpi=300] - Print resolution in DPI
     * @param {Object} [options.hoopSize] - Hoop size in mm {width, height}
     * @param {Object} [options.margins] - Margins in mm {top, right, bottom, left}
     * @param {boolean} [options.showGuides=true] - Show hoop guides and center marks
     * @param {boolean} [options.lifeSize=true] - Export at life-size scale
     * @example
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns
     *   circle(50, 50, 20);
     *   endRecord();
     *   exportPNG('my-pattern.png', {
     *     paperSize: 'A4',
     *     hoopSize: {width: 100, height: 100}
     *   });
     * }
     */
    p5embroidery.exportPNG = function (filename = "embroidery-pattern.png", options = {}) {
      if (!_stitchData || !_stitchData.threads) {
        console.warn("🪡 p5.embroider says: No embroidery data to export");
        return;
      }

      try {
        // Create SVG writer instance
        const svgWriter = new SVGWriter();
        svgWriter.setOptions(options);
        svgWriter.validateOptions();

        // Generate title from filename or use default
        const title = filename ? filename.replace(/\.[^/.]+$/, "") : "Embroidery Pattern";

        // Generate PNG using the writer
        svgWriter.generatePNG(_stitchData, title, filename);
      } catch (error) {
        console.error("🪡 p5.embroider says: Error exporting PNG:", error);
      }
    };

    /**
     * Exports the recorded embroidery data as a DST file.
     * @method exportDST
     * @for p5
     * @param {String} [filename='embroideryPattern.dst'] - Output filename
     * @example
     *
     *
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns
     *   endRecord();
     *   exportDST('pattern.dst');
     * }
     *
     *
     */
    p5embroidery.exportDST = function (filename = "embroideryPattern.dst") {
      const points = [];
      const dstWriter = new DSTWriter();

      if (_DEBUG) console.log("=== Starting DST Export ===");
      if (_DEBUG) console.log("Canvas size:", _stitchData.width, _stitchData.height);
      if (_DEBUG) console.log("Stitch data:", _stitchData);

      let currentThreadIndex = -1;

      for (let threadIndex = 0; threadIndex < _stitchData.threads.length; threadIndex++) {
        const thread = _stitchData.threads[threadIndex];

        // Skip threads with no stitches
        if (thread.runs.length === 0 || !thread.runs.some((run) => run.length > 0)) {
          continue;
        }

        // If we're changing threads and have previous stitches, add a color change command
        if (currentThreadIndex !== -1 && threadIndex !== currentThreadIndex && points.length > 0) {
          // Get the last stitch position
          const lastPoint = points[points.length - 1];

          // Add a color change command at the same position
          points.push({
            x: lastPoint.x,
            y: lastPoint.y,
            colorChange: true,
          });

          if (_DEBUG) console.log("Color change at:", lastPoint.x, lastPoint.y);
        }

        currentThreadIndex = threadIndex;

        for (const run of thread.runs) {
          // Check if this is a thread trim command
          if (run.length === 1 && run[0].command === "trim") {
            if (_DEBUG) {
              console.log("Trim command at:", run[0].x, run[0].y);
              console.log("Canvas size:", _stitchData.width, _stitchData.height);
            }

            // Validate trim command coordinates
            if (run[0].x == null || run[0].y == null || !isFinite(run[0].x) || !isFinite(run[0].y)) {
              if (_DEBUG) console.warn("Skipping invalid trim command with null/NaN coordinates:", run[0]);
              continue;
            }

            // Convert from mm to 0.1mm for DST format
            points.push({
              x: run[0].x * 10, // Convert from mm to 0.1mm for DST format
              y: run[0].y * 10, // Convert from mm to 0.1mm for DST format
              jump: true,
              trim: true,
            });
            continue;
          }

          // Normal stitches
          if (_DEBUG) console.log("=== New Stitch Run ===");
          if (_DEBUG) console.log("Run:", run);
          for (const stitch of run) {
            // Validate stitch coordinates before processing
            if (stitch.x == null || stitch.y == null || !isFinite(stitch.x) || !isFinite(stitch.y)) {
              if (_DEBUG) console.warn("Skipping invalid stitch with null/NaN coordinates:", stitch);
              continue;
            }

            // if (_DEBUG)
            //   console.log("Stitch point:", {
            //     mm: { x: stitch.x, y: stitch.y },
            //     dst: { x: stitch.x * 10, y: stitch.y * 10 }, // Convert to DST units (0.1mm) for logging
            //   });

            // Convert from mm to 0.1mm for DST format
            points.push({
              x: stitch.x * 10, // Convert to DST units (0.1mm)
              y: stitch.y * 10, // Convert to DST units (0.1mm)
              command: stitch.command,
              jump: stitch.command === "jump",
            });
          }
        }
      }

      // Skip export if no points
      if (points.length === 0) {
        console.warn("No embroidery points to export");
        return;
      }

      if (_DEBUG) {
        console.log("=== Final Points Array ===");
        console.log("Total points:", points.length);
        console.log("First point:", points[0]);
        console.log("Last point:", points[points.length - 1]);

        // Log bounding box
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        for (const point of points) {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }
        console.log("Bounding box (0.1mm):", {
          minX,
          maxX,
          minY,
          maxY,
          width: maxX - minX,
          height: maxY - minY,
        });
      }

      dstWriter.saveDST(points, "EmbroideryPattern", filename);
    };

    /**
     * Exports the recorded embroidery data as a JSON file with detailed stitch information organized by thread ID.
     * @method exportJSON
     * @for p5
     * @param {string} [filename='embroidery-pattern.json'] - Output filename
     * @param {Object} [options={}] - Export options
     * @param {boolean} [options.includeBounds=true] - Include pattern bounds information
     * @param {boolean} [options.includeMetadata=true] - Include metadata and statistics
     * @param {number} [options.precision=2] - Decimal precision for coordinates
     * @param {boolean} [options.compactOutput=false] - Export in compact JSON format
     * @example
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns
     *   circle(50, 50, 20);
     *   line(10, 10, 90, 90);
     *   endRecord();
     *   exportJSON('my-pattern.json', {
     *     precision: 3,
     *     includeMetadata: true
     *   });
     * }
     */
    p5embroidery.exportJSON = function (filename = "embroidery-pattern.json", options = {}) {
      if (!_stitchData || !_stitchData.threads) {
        console.warn("🪡 p5.embroider says: No embroidery data to export");
        return null;
      }

      try {
        // Create JSON writer instance
        const jsonWriter = new JSONWriter();
        jsonWriter.setOptions(options);

        // Generate title from filename or use default
        const title = filename ? filename.replace(/\.[^/.]+$/, "") : "Embroidery Pattern";

        // Save JSON using the writer and return the content
        const jsonContent = jsonWriter.saveJSON(_stitchData, title, filename);

        return JSON.parse(jsonContent); // Return parsed JSON object for potential use
      } catch (error) {
        console.error("🪡 p5.embroider says: Error exporting JSON:", error);
        return null;
      }
    };

    /**
     * Inserts a thread trim command at the current position.
     * @method trimThread
     * @for p5
     * @example
     *
     *
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   line(10, 10, 50, 50);
     *   trimThread(); // Cut thread at current position
     *   line(60, 60, 100, 100);
     * }
     *
     *
     */
    p5embroidery.trimThread = function (threadIndex = _strokeThreadIndex) {
      if (_recording) {
        // Get the current thread
        const currentThread = _stitchData.threads[threadIndex];

        // // Check if there are any runs in the current thread
        // if (!currentThread || currentThread.runs.length === 0) {
        //   console.warn("trimThread: No runs found for thread", threadIndex);

        //   return; // Nothing to trim
        // }

        // Get the last run in the current thread
        const lastRun = currentThread.runs[currentThread.runs.length - 1];

        // Check if the last run has any stitches
        if (!lastRun || lastRun.length === 0) {
          console.warn("trimThread: No stitches to trim for thread", threadIndex);
          console.trace("Call stack for trimThread:"); // Add this line
    
          return; // No stitches to trim
        }

        // Get the last stitch position from the last run (in mm)
        let lastStitchIndex = lastRun.length - 1;
        let currentX = lastRun[lastStitchIndex].x;
        let currentY = lastRun[lastStitchIndex].y;

        if (_DEBUG) console.log("Adding trim at position:", currentX, currentY);

        // Add a special point to indicate thread trim (in mm)
        _stitchData.threads[threadIndex].runs.push([
          {
            x: currentX,
            y: currentY,
            command: "trim",
          },
        ]);

        if (_drawMode === "stitch") {
          // draw a scissors emoji at the trim point
          _p5Instance.push();
          _originalFillFunc.call(_p5Instance, 0);
          let lineLength = 10;
          let endX = mmToPixel$1(currentX) + lineLength;
          let endY = mmToPixel$1(currentY) - lineLength;
          _originalStrokeFunc.call(_p5Instance, 255, 0, 0); // red for line
          _originalStrokeWeightFunc.call(_p5Instance, 0.5);

          _originalLineFunc.call(_p5Instance, mmToPixel$1(currentX), mmToPixel$1(currentY), endX, endY);
          // Place translucent white circle at the center of the scissors
          _p5Instance.push();
          _originalNoStrokeFunc.call(_p5Instance);
          _originalFillFunc.call(_p5Instance, 255, 255, 255, 150);
          _p5Instance.ellipseMode(CENTER);
          _originalEllipseFunc.call(_p5Instance, endX + 6, endY - 5, 20, 20);
          _p5Instance.pop();
          // Place scissors at end of line
          _p5Instance.text("✂️", endX, endY);
          _p5Instance.pop();
        }
      }
    };

    /**
     * Draws stitches according to the current draw mode.
     * @method drawStitches
     * @private
     * @param {Array} stitches - Array of stitch objects with x and y coordinates in mm
     * @param {number} threadIndex - Index of the current thread
     */
    function drawStitches(stitches, threadIndex) {
      // Check for empty stitches array
      if (!stitches || stitches.length === 0) {
        console.warn("drawStitches: Empty stitches array");
        return;
      }

      let prevX = mmToPixel$1(stitches[0].x);
      let prevY = mmToPixel$1(stitches[0].y);

      if (_drawMode === "stitch") {
        // Draw stitch lines
        _p5Instance.push();

        for (let i = 1; i < stitches.length; i++) {
          let currentX = mmToPixel$1(stitches[i].x);
          let currentY = mmToPixel$1(stitches[i].y);

          if (i === 1) {
            // Draw small dots at stitch points
            _originalStrokeFunc.call(_p5Instance, 255, 0, 0); // Red for stitch points
            _originalStrokeWeightFunc.call(_p5Instance, 3);
            _originalPointFunc.call(_p5Instance, prevX, prevY);
          }

          // Use the current thread color if defined, otherwise black
          _originalStrokeFunc.call(
            _p5Instance,
            _stitchData.threads[threadIndex].color.r,
            _stitchData.threads[threadIndex].color.g,
            _stitchData.threads[threadIndex].color.b,
          );
          _originalStrokeWeightFunc.call(_p5Instance, 1);
          _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

          // Draw small dots at stitch points
          _originalStrokeFunc.call(_p5Instance, 255, 0, 0); // Red for stitch points
          _originalStrokeWeightFunc.call(_p5Instance, 3);
          _originalPointFunc.call(_p5Instance, currentX, currentY);

          prevX = currentX;
          prevY = currentY;
        }
        _p5Instance.pop();
      } else if (_drawMode === "realistic") {
        _p5Instance.push();
        _p5Instance.strokeCap(ROUND);

        // Draw background dots for thread ends

        for (let i = 1; i < stitches.length; i++) {
          let currentX = mmToPixel$1(stitches[i].x);
          let currentY = mmToPixel$1(stitches[i].y);
          _originalNoStrokeFunc.call(_p5Instance);
          _originalFillFunc.call(_p5Instance, 15); // White background dots

          _originalEllipseFunc.call(_p5Instance, currentX, currentY, 3); // Small white dots at stitch points

          // Draw three layers of lines with different weights and colors
          // Dark bottom layer - darkened thread color
          _originalStrokeFunc.call(
            _p5Instance,
            _stitchData.threads[threadIndex].color.r * 0.4,
            _stitchData.threads[threadIndex].color.g * 0.4,
            _stitchData.threads[threadIndex].color.b * 0.4,
          );
          _originalStrokeWeightFunc.call(_p5Instance, 2.5);
          _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

          // Middle layer - thread color
          _originalStrokeFunc.call(
            _p5Instance,
            _stitchData.threads[threadIndex].color.r,
            _stitchData.threads[threadIndex].color.g,
            _stitchData.threads[threadIndex].color.b,
          );
          _originalStrokeWeightFunc.call(_p5Instance, 1.8);
          _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

          // Top highlight layer - lightened thread color
          _originalStrokeFunc.call(
            _p5Instance,
            _stitchData.threads[threadIndex].color.r * 1.8,
            _stitchData.threads[threadIndex].color.g * 1.8,
            _stitchData.threads[threadIndex].color.b * 1.8,
          );
          _originalStrokeWeightFunc.call(_p5Instance, 1);
          _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);
          prevX = currentX;
          prevY = currentY;
        }
        _p5Instance.strokeCap(SQUARE);
        _p5Instance.pop();
      }

      // Return the last stitch position for chaining
      return stitches.length > 0
        ? {
            x: stitches[stitches.length - 1].x,
            y: stitches[stitches.length - 1].y,
          }
        : { x: startX, y: startY };
    }

    function getPathBounds(points) {
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      };
    }

    function createTatamiFillFromPath(pathPoints, settings) {
      // Default settings
      const angle = settings.angle || 0;
      const spacing = settings.rowSpacing || 0.8;
      settings.stitchLength || 3;

      // Calculate bounds of the polygon
      const bounds = getPathBounds(pathPoints);

      // Calculate the center of the path
      const centerX = bounds.x + bounds.w / 2;
      const centerY = bounds.y + bounds.h / 2;

      // Expand bounds to ensure we cover rotated shape
      const diagonal = Math.sqrt(bounds.w * bounds.w + bounds.h * bounds.h) * 1.2;

      // First pass: collect all valid segments organized by scan line
      const scanLineSegments = [];
      let forward = true;

      // Generate scan lines at the specified angle
      for (let d = -diagonal / 2; d <= diagonal / 2; d += spacing) {
        // Calculate start and end points for the scan line
        const startX = centerX - (diagonal / 2) * Math.cos(angle) - d * Math.sin(angle);
        const startY = centerY - (diagonal / 2) * Math.sin(angle) + d * Math.cos(angle);
        const endX = centerX + (diagonal / 2) * Math.cos(angle) - d * Math.sin(angle);
        const endY = centerY + (diagonal / 2) * Math.sin(angle) + d * Math.cos(angle);

        // Find intersections with the polygon
        const intersections = segmentIntersectPolygon({ x: startX, y: startY }, { x: endX, y: endY }, pathPoints);

        // Sort intersections by distance from start
        intersections.sort((a, b) => {
          const distA = Math.sqrt((a.x - startX) * (a.x - startX) + (a.y - startY) * (a.y - startY));
          const distB = Math.sqrt((b.x - startX) * (b.x - startX) + (b.y - startY) * (b.y - startY));
          return distA - distB;
        });

        // Find valid segments for this scan line
        const validSegments = findValidSegments(
          intersections,
          pathPoints);

        // Store segments with their scan line info
        for (const segment of validSegments) {
          scanLineSegments.push({
            start: segment.start,
            end: segment.end,
            scanLineIndex: scanLineSegments.length,
            forward: forward,
          });
        }

        // Alternate direction for next row
        forward = !forward;
      }

      // Second pass: group segments by proximity and create optimized stitch paths
      const stitches = createOptimizedStitchPaths(scanLineSegments, settings);

      return stitches;
    }

    // Function to create optimized stitch paths by grouping nearby segments
    function createOptimizedStitchPaths(segments, settings = {}) {
      if (segments.length === 0) return [];

      const stitches = [];
      const used = new Array(segments.length).fill(false);
      const jumpThreshold = 10; // mm - threshold for inserting trim commands

      // Process segments in groups to minimize jumps
      for (let i = 0; i < segments.length; i++) {
        if (used[i]) continue;

        // Start a new region from this segment
        const currentRegion = [];
        const stack = [i];

        // Find all segments connected to this region
        while (stack.length > 0) {
          const currentIndex = stack.pop();
          if (used[currentIndex]) continue;

          used[currentIndex] = true;
          currentRegion.push(segments[currentIndex]);

          // Find nearby segments (within reasonable distance)
          for (let j = 0; j < segments.length; j++) {
            if (used[j]) continue;

            const currentSeg = segments[currentIndex];
            const testSeg = segments[j];

            // Check if segments are close enough to be in same region
            const minDist = Math.min(
              Math.sqrt(
                (currentSeg.start.x - testSeg.start.x) * (currentSeg.start.x - testSeg.start.x) +
                  (currentSeg.start.y - testSeg.start.y) * (currentSeg.start.y - testSeg.start.y),
              ),
              Math.sqrt(
                (currentSeg.start.x - testSeg.end.x) * (currentSeg.start.x - testSeg.end.x) +
                  (currentSeg.start.y - testSeg.end.y) * (currentSeg.start.y - testSeg.end.y),
              ),
              Math.sqrt(
                (currentSeg.end.x - testSeg.start.x) * (currentSeg.end.x - testSeg.start.x) +
                  (currentSeg.end.y - testSeg.start.y) * (currentSeg.end.y - testSeg.start.y),
              ),
              Math.sqrt(
                (currentSeg.end.x - testSeg.end.x) * (currentSeg.end.x - testSeg.end.x) +
                  (currentSeg.end.y - testSeg.end.y) * (currentSeg.end.y - testSeg.end.y),
              ),
            );

            // If segments are close (within 2 scan line spacings), add to region
            if (minDist < 20) {
              // Adjust this threshold as needed
              stack.push(j);
            }
          }
        }

        // Sort segments in current region for optimal stitching order
        const optimizedRegion = optimizeRegionStitchOrder(currentRegion, settings);

        // Add trim command before this region if it's not the first region and there are existing stitches
        if (stitches.length > 0 && optimizedRegion.length > 0) {
          // Get the last stitch position
          const lastStitch = stitches[stitches.length - 1];
          const firstStitch = optimizedRegion[0];

          // Calculate distance to first stitch of new region
          const jumpDistance = Math.sqrt(
            (firstStitch.x - lastStitch.x) * (firstStitch.x - lastStitch.x) +
              (firstStitch.y - lastStitch.y) * (firstStitch.y - lastStitch.y),
          );

          // Insert trim command if jump is too long
          if (jumpDistance > jumpThreshold) {
            stitches.push({
              x: lastStitch.x,
              y: lastStitch.y,
              command: "trim",
            });
          }
        }

        // Add region stitches to final array
        stitches.push(...optimizedRegion);
      }

      return stitches;
    }

    // Function to optimize stitch order within a region
    function optimizeRegionStitchOrder(regionSegments, settings = {}) {
      const stitchSettings = {
        stitchLength: settings.stitchLength || 2,
        minStitchLength: settings.minStitchLength || 0.5,
        resampleNoise: settings.resampleNoise || 0,
      };

      if (regionSegments.length === 0) return [];
      if (regionSegments.length === 1) {
        const seg = regionSegments[0];
        const segmentPath = [
          { x: seg.forward ? seg.start.x : seg.end.x, y: seg.forward ? seg.start.y : seg.end.y },
          { x: seg.forward ? seg.end.x : seg.start.x, y: seg.forward ? seg.end.y : seg.start.y },
        ];
        // Convert path to individual stitches
        return convertPathToStitches(segmentPath, stitchSettings);
      }

      const stitches = [];
      const used = new Array(regionSegments.length).fill(false);
      used[0] = true;

      let currentSeg = regionSegments[0];
      const firstSegmentPath = [
        {
          x: currentSeg.forward ? currentSeg.start.x : currentSeg.end.x,
          y: currentSeg.forward ? currentSeg.start.y : currentSeg.end.y,
        },
        {
          x: currentSeg.forward ? currentSeg.end.x : currentSeg.start.x,
          y: currentSeg.forward ? currentSeg.end.y : currentSeg.start.y,
        },
      ];
      // Convert first segment to stitches
      const firstSegmentStitches = convertPathToStitches(firstSegmentPath, stitchSettings);
      stitches.push(...firstSegmentStitches);

      // Find the nearest unused segment for each subsequent stitch
      for (let i = 1; i < regionSegments.length; i++) {
        let nearestIndex = -1;
        let nearestDist = Infinity;

        const lastStitch = stitches[stitches.length - 1];

        for (let j = 0; j < regionSegments.length; j++) {
          if (used[j]) continue;

          const testSeg = regionSegments[j];

          // Calculate distance from end of last stitch to start of test segment
          const distToStart = Math.sqrt(
            (lastStitch.x - testSeg.start.x) * (lastStitch.x - testSeg.start.x) +
              (lastStitch.y - testSeg.start.y) * (lastStitch.y - testSeg.start.y),
          );
          const distToEnd = Math.sqrt(
            (lastStitch.x - testSeg.end.x) * (lastStitch.x - testSeg.end.x) +
              (lastStitch.y - testSeg.end.y) * (lastStitch.y - testSeg.end.y),
          );

          const minDist = Math.min(distToStart, distToEnd);

          if (minDist < nearestDist) {
            nearestDist = minDist;
            nearestIndex = j;
          }
        }

        if (nearestIndex !== -1) {
          used[nearestIndex] = true;
          const nextSeg = regionSegments[nearestIndex];

          // // Check if we need a trim command for a long jump within the region
          // if (nearestDist > intraRegionJumpThreshold) {
          //   stitches.push({
          //     x: lastStitch.x,
          //     y: lastStitch.y,
          //     command: "trim"
          //   });
          // }

          // Determine orientation based on which end is closer
          const distToStart = Math.sqrt(
            (lastStitch.x - nextSeg.start.x) * (lastStitch.x - nextSeg.start.x) +
              (lastStitch.y - nextSeg.start.y) * (lastStitch.y - nextSeg.start.y),
          );
          const distToEnd = Math.sqrt(
            (lastStitch.x - nextSeg.end.x) * (lastStitch.x - nextSeg.end.x) +
              (lastStitch.y - nextSeg.end.y) * (lastStitch.y - nextSeg.end.y),
          );

          const useForwardDirection = distToStart <= distToEnd;

          // Create path for this segment
          const segmentPath = [
            {
              x: useForwardDirection ? nextSeg.start.x : nextSeg.end.x,
              y: useForwardDirection ? nextSeg.start.y : nextSeg.end.y,
            },
            {
              x: useForwardDirection ? nextSeg.end.x : nextSeg.start.x,
              y: useForwardDirection ? nextSeg.end.y : nextSeg.start.y,
            },
          ];

          // Convert segment to individual stitches
          const segmentStitches = convertPathToStitches(segmentPath, stitchSettings);
          stitches.push(...segmentStitches);
        }
      }

      return stitches;
    }

    // Function to find valid segments that are inside the polygon
    function findValidSegments(intersections, polygon, lineStart, lineEnd) {
      const validSegments = [];

      // For each pair of intersections, check if the segment between them is inside the polygon
      for (let i = 0; i < intersections.length - 1; i += 2) {
        if (i + 1 >= intersections.length) break;

        const segStart = intersections[i];
        const segEnd = intersections[i + 1];

        // Check if the midpoint of this segment is inside the polygon
        const midX = (segStart.x + segEnd.x) / 2;
        const midY = (segStart.y + segEnd.y) / 2;

        if (pointInPolygon({ x: midX, y: midY }, polygon)) {
          validSegments.push({
            start: segStart,
            end: segEnd,
          });
        }
      }

      return validSegments;
    }

    // Point-in-polygon test using ray casting algorithm
    function pointInPolygon(point, polygon) {
      let inside = false;

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;

        if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }

      return inside;
    }

    // Function to find intersections between a line segment and a polygon
    function segmentIntersectPolygon(p1, p2, polygon) {
      const intersections = [];

      // Check each edge of the polygon
      for (let i = 0; i < polygon.length - 1; i++) {
        const p3 = polygon[i];
        const p4 = polygon[i + 1];

        // Check if the line segments intersect
        const intersection = lineLineIntersection(p1, p2, p3, p4);
        if (intersection) {
          intersections.push(intersection);
        }
      }

      // Check the last edge (connecting the last point to the first)
      if (polygon.length > 0) {
        const p3 = polygon[polygon.length - 1];
        const p4 = polygon[0];
        const intersection = lineLineIntersection(p1, p2, p3, p4);
        if (intersection) {
          intersections.push(intersection);
        }
      }

      return intersections;
    }

    // Function to calculate the intersection point of two line segments
    function lineLineIntersection(p1, p2, p3, p4) {
      // Line segment 1: p1 to p2
      // Line segment 2: p3 to p4

      const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

      // Lines are parallel or coincident
      if (denominator === 0) {
        return null;
      }

      const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
      const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

      // Check if intersection is within both line segments
      if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        const intersectionX = p1.x + ua * (p2.x - p1.x);
        const intersectionY = p1.y + ua * (p2.y - p1.y);
        return { x: intersectionX, y: intersectionY };
      }

      // No intersection within the line segments
      return null;
    }

    /**
     * Creates satin fill stitches from a path.
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} settings - Fill settings
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function createSatinFillFromPath(pathPoints, settings) {
      // For now, fall back to tatami fill
      // TODO: Implement proper satin fill algorithm
      return createTatamiFillFromPath(pathPoints, settings);
    }

    /**
     * Creates spiral fill stitches from a path.
     * @private
     * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
     * @param {Object} settings - Fill settings
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function createSpiralFillFromPath(pathPoints, settings) {
      if (!pathPoints || pathPoints.length < 3) {
        if (_DEBUG) console.log("createSpiralFillFromPath: insufficient pathPoints", pathPoints?.length);
        return [];
      }

      const stitches = [];
      const bounds = getPathBounds(pathPoints);
      const centerX = bounds.x + bounds.w / 2;
      const centerY = bounds.y + bounds.h / 2;

      // Calculate maximum radius to ensure we fill the entire shape
      const maxRadius = (Math.max(bounds.w, bounds.h) / 2) * 1.2;

      // Spiral parameters
      const spiralSpacing = settings.rowSpacing || 0.8;
      const stitchLength = settings.stitchLength || 2;

      let currentRadius = 0;
      let currentAngle = 0;
      let lastPoint = null;

      if (_DEBUG) {
        console.log("Spiral fill params:", { bounds, centerX, centerY, maxRadius, spiralSpacing, stitchLength });
      }

      // Generate spiral points from center outward
      while (currentRadius <= maxRadius) {
        const x = centerX + Math.cos(currentAngle) * currentRadius;
        const y = centerY + Math.sin(currentAngle) * currentRadius;

        // Check if point is inside the polygon
        if (pointInPolygon({ x, y }, pathPoints)) {
          if (lastPoint) {
            // Add stitches along the path from last point to current point
            const segmentStitches = straightLineStitch(lastPoint.x, lastPoint.y, x, y, {
              stitchLength: stitchLength,
              minStitchLength: settings.minStitchLength || 0.5,
              resampleNoise: settings.resampleNoise || 0,
            });
            stitches.push(...segmentStitches);
          } else {
            // First point
            stitches.push({ x, y });
          }
          lastPoint = { x, y };
        }

        // Update angle and radius for next iteration
        const angleIncrement = stitchLength / Math.max(currentRadius, 1); // Prevent division by zero
        currentAngle += angleIncrement;
        currentRadius += (spiralSpacing * angleIncrement) / (2 * Math.PI);

        // Safety break to prevent infinite loops
        if (currentAngle > 100 * Math.PI) {
          if (_DEBUG) console.log("Spiral fill: breaking due to too many iterations");
          break;
        }
      }

      if (_DEBUG) {
        console.log("Spiral fill generated stitches:", stitches.length);
      }

      return stitches;
    }

    /**
     * Creates tatami fill with contours (holes).
     * @private
     * @param {Array<{x: number, y: number}>} mainPath - Main outline path
     * @param {Array<Array<{x: number, y: number}>>} contours - Array of contour paths (holes)
     * @param {Object} settings - Fill settings
     * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
     */
    function createTatamiFillWithContours(mainPath, contours, settings) {
      if (!mainPath || mainPath.length < 3) {
        if (_DEBUG) console.log("createTatamiFillWithContours: insufficient mainPath points");
        return [];
      }

      // Default settings
      const angle = settings.angle || 0;
      const spacing = settings.rowSpacing || 0.8;
      settings.stitchLength || 3;

      // Calculate bounds of the main polygon
      const bounds = getPathBounds(mainPath);

      // Calculate the center of the path
      const centerX = bounds.x + bounds.w / 2;
      const centerY = bounds.y + bounds.h / 2;

      // Expand bounds to ensure we cover rotated shape
      const diagonal = Math.sqrt(bounds.w * bounds.w + bounds.h * bounds.h) * 1.2;

      // First pass: collect all valid segments organized by scan line
      const scanLineSegments = [];
      let forward = true;

      // Generate scan lines at the specified angle
      for (let d = -diagonal / 2; d <= diagonal / 2; d += spacing) {
        // Calculate start and end points for the scan line
        const startX = centerX - (diagonal / 2) * Math.cos(angle) - d * Math.sin(angle);
        const startY = centerY - (diagonal / 2) * Math.sin(angle) + d * Math.cos(angle);
        const endX = centerX + (diagonal / 2) * Math.cos(angle) - d * Math.sin(angle);
        const endY = centerY + (diagonal / 2) * Math.sin(angle) + d * Math.cos(angle);

        const scanLine = { x: startX, y: startY };
        const scanLineEnd = { x: endX, y: endY };

        // Find intersections with the main polygon
        const mainIntersections = segmentIntersectPolygon(scanLine, scanLineEnd, mainPath);

        // Find intersections with all contour polygons
        let allContourIntersections = [];
        for (const contour of contours) {
          const contourIntersections = segmentIntersectPolygon(scanLine, scanLineEnd, contour);
          allContourIntersections = allContourIntersections.concat(contourIntersections);
        }

        // Combine and sort all intersections by distance from start
        const allIntersections = mainIntersections.concat(allContourIntersections);
        allIntersections.sort((a, b) => {
          const distA = Math.sqrt((a.x - startX) * (a.x - startX) + (a.y - startY) * (a.y - startY));
          const distB = Math.sqrt((b.x - startX) * (b.x - startX) + (b.y - startY) * (b.y - startY));
          return distA - distB;
        });

        // Find valid segments considering contours
        const validSegments = findValidSegmentsWithContours(allIntersections, mainPath, contours);

        // Store segments with their scan line info
        for (const segment of validSegments) {
          scanLineSegments.push({
            start: segment.start,
            end: segment.end,
            scanLineIndex: scanLineSegments.length,
            forward: forward,
          });
        }

        // Alternate direction for next row
        forward = !forward;
      }

      // Second pass: group segments by proximity and create optimized stitch paths
      const stitches = createOptimizedStitchPaths(scanLineSegments, settings);

      return stitches;
    }

    /**
     * Find valid segments that are inside the main polygon but outside any contours.
     * @private
     */
    function findValidSegmentsWithContours(intersections, mainPolygon, contours, lineStart, lineEnd) {
      const validSegments = [];

      // For each pair of intersections, check if the segment between them is valid
      for (let i = 0; i < intersections.length - 1; i += 2) {
        if (i + 1 >= intersections.length) break;

        const segStart = intersections[i];
        const segEnd = intersections[i + 1];

        // Check if the midpoint of this segment is inside the main polygon
        const midX = (segStart.x + segEnd.x) / 2;
        const midY = (segStart.y + segEnd.y) / 2;
        const midpoint = { x: midX, y: midY };

        // Must be inside main polygon
        if (!pointInPolygon(midpoint, mainPolygon)) {
          continue;
        }

        // Must not be inside any contour
        let insideContour = false;
        for (const contour of contours) {
          if (pointInPolygon(midpoint, contour)) {
            insideContour = true;
            break;
          }
        }

        if (!insideContour) {
          validSegments.push({
            start: segStart,
            end: segEnd,
          });
        }
      }

      return validSegments;
    }

    // Expose public functions
    global.p5embroidery = p5embroidery;
    global.beginRecord = p5embroidery.beginRecord;
    global.endRecord = p5embroidery.endRecord;
    global.exportEmbroidery = p5embroidery.exportEmbroidery;
    global.exportDST = p5embroidery.exportDST;
    global.exportGcode = p5embroidery.exportGcode;
    global.exportSVG = p5embroidery.exportSVG;
    global.exportPNG = p5embroidery.exportPNG;
    global.trimThread = p5embroidery.trimThread; // Renamed from cutThread
    global.embroideryOutline = p5embroidery.embroideryOutline;
    global.setStitch = p5embroidery.setStitch;
    global.setDrawMode = p5embroidery.setDrawMode;
    global.drawStitches = p5embroidery.drawStitches;
    global.mmToPixel = mmToPixel$1;
    global.pixelToMm = pixelToMm;
    global.setStrokeMode = p5embroidery.setStrokeMode;
    global.setStrokeJoin = p5embroidery.setStrokeJoin;
    global.STROKE_MODE = STROKE_MODE;
    global.STROKE_JOIN = STROKE_JOIN;
    global.FILL_MODE = FILL_MODE;
    global.setFillMode = p5embroidery.setFillMode;
    global.setFillSettings = p5embroidery.setFillSettings;
    global.setStrokeSettings = p5embroidery.setStrokeSettings;
    global.setStrokeEntryExit = p5embroidery.setStrokeEntryExit;

    // Expose new path-based functions
    global.convertPathToStitches = convertPathToStitches;
    global.multiLineStitchingFromPath = multiLineStitchFromPath;
    global.sashikoStitchingFromPath = sashikoStitchFromPath;
    
    // Expose embroidery guide utilities
    global.drawGrid = drawGrid;
    global.drawHoopGuides = drawHoopGuides;
    global.drawHoop = drawHoop;
    global.drawManualHoop = drawManualHoop;
    global.drawMachineHoop = drawMachineHoop;
    global.drawCornerMarks = drawCornerMarks;
    global.drawPaperGuides = drawPaperGuides;
    global.drawEmbroideryWorkspace = drawEmbroideryWorkspace;
    global.PAPER_SIZES = PAPER_SIZES;
    global.HOOP_PRESETS = HOOP_PRESETS;
    global.getHoopPreset = getHoopPreset;
    global.getPaperSize = getPaperSize;
    global.getHoopsByBrand = getHoopsByBrand;
    global.getHoopsByType = getHoopsByType;
    global.getHoopsBySize = getHoopsBySize;
    global.findBestHoop = findBestHoop;
    global.getHoopBrands = getHoopBrands;
    global.getHoopTypes = getHoopTypes;
    
    // Expose preview viewport utilities  
    global.setupPreviewViewport = setupPreviewViewport;
    global.endPreviewViewport = endPreviewViewport;
    global.handlePreviewZoom = handlePreviewZoom;
    global.handlePreviewPan = handlePreviewPan;
    global.startPreviewPan = startPreviewPan;
    global.stopPreviewPan = stopPreviewPan;
    global.resetPreviewViewport = resetPreviewViewport;
    global.fitPreviewToContent = fitPreviewToContent;
    global.getPreviewState = getPreviewState;
    global.screenToWorld = screenToWorld;
    global.worldToScreen = worldToScreen;
    global.drawPreviewControls = drawPreviewControls;
    global.handlePreviewControlsPressed = handlePreviewControlsPressed;
    global.handlePreviewControlsDragged = handlePreviewControlsDragged;
    global.handlePreviewControlsReleased = handlePreviewControlsReleased;
    
    global.zigzagStitchFromPath = zigzagStitchFromPath;
    global.rampStitchFromPath = rampStitchFromPath;
    global.squareStitchFromPath = squareStitchFromPath;

    // Expose debug function
    global.setDebugMode = setDebugMode;

    // Expose contour functions
    global.beginContour =
      p5embroidery.beginContour ||
      function () {
        if (window.beginContour && typeof window.beginContour === "function") {
          return window.beginContour.apply(this, arguments);
        }
      };
    global.endContour =
      p5embroidery.endContour ||
      function () {
        if (window.endContour && typeof window.endContour === "function") {
          return window.endContour.apply(this, arguments);
        }
      };

    /**
     * Adds an outline around the embroidery at a specified offset distance.
     * @method embroideryOutline
     * @for p5
     * @param {number} offsetDistance - Distance in mm to offset the outline from the embroidery
     * @param {number} [threadIndex] - Thread index to add the outline to (defaults to current stroke thread)
     * @param {string} [outlineType='convex'] - Type of outline ('convex', 'bounding')
     * @example
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns
     *   circle(50, 50, 20);
     *   embroideryOutline(5); // Add 5mm outline around the embroidery
     *   endRecord();
     * }
     */
    global.embroideryOutline = function (offsetDistance, threadIndex = _strokeThreadIndex, outlineType = "convex") {
      if (!_recording) {
        console.warn("🪡 p5.embroider says: embroideryOutline() can only be called while recording");
        return;
      }

      if (!_stitchData.threads || _stitchData.threads.length === 0) {
        console.warn("🪡 p5.embroider says: No embroidery data found to create outline");
        return;
      }

      // Collect all stitch points from all threads and runs
      const allPoints = [];
      for (const thread of _stitchData.threads) {
        for (const run of thread.runs) {
          for (const stitch of run) {
            // Skip invalid points and special commands
            if (stitch.x != null && stitch.y != null && isFinite(stitch.x) && isFinite(stitch.y) && !stitch.command) {
              allPoints.push({ x: stitch.x, y: stitch.y });
            }
          }
        }
      }

      if (allPoints.length === 0) {
        console.warn("🪡 p5.embroider says: No valid stitch points found to create outline");
        return;
      }

      if (_DEBUG) {
        console.log("Creating outline from", allPoints.length, "stitch points");
        console.log("Offset distance:", offsetDistance, "mm");
        console.log("Outline type:", outlineType);
      }

      let outlinePoints = [];

      // Create outline based on type
      switch (outlineType) {
        case "bounding":
          outlinePoints = createBoundingBoxOutline(allPoints, offsetDistance);
          break;
        case "convex":
        default:
          outlinePoints = createConvexHullOutline(allPoints, offsetDistance);
          break;
      }

      if (outlinePoints.length === 0) {
        console.warn("🪡 p5.embroider says: Failed to create outline");
        return;
      }

      // Apply current transformation to outline points
      const transformedOutlinePoints = applyCurrentTransformToPoints(outlinePoints);

      // Convert outline to stitches
      const outlineStitches = p5embroidery.convertVerticesToStitches(
        transformedOutlinePoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
        _strokeSettings,
      );

      if (outlineStitches.length > 0) {
        // Ensure we have a valid thread
        if (threadIndex >= _stitchData.threads.length) {
          threadIndex = _strokeThreadIndex;
        }

        // Add outline stitches to the specified thread
        _stitchData.threads[threadIndex].runs.push(outlineStitches);

        // Draw outline if in visual modes
        if (_drawMode === "stitch" || _drawMode === "realistic") {
          drawStitches(outlineStitches, threadIndex);
        }

        if (_DEBUG) {
          console.log("Added outline with", outlineStitches.length, "stitches to thread", threadIndex);
        }
      }
    };

    /**
     * Creates an outline around specified stitch data at a specified offset distance.
     * @method embroideryOutlineFromPath
     * @for p5
     * @param {Array} stitchDataArray - Array of stitch data objects (each with x, y coordinates)
     * @param {number} offsetDistance - Distance in mm to offset the outline from the path
     * @param {number} [threadIndex] - Thread index to add the outline to (defaults to current stroke thread)
     * @param {string} [outlineType='convex'] - Type of outline ('convex', 'bounding', 'scale')
     * @param {boolean} [applyTransform=true] - Whether to apply current transformation to the outline
     * @returns {Array} Array of outline points {x, y}
     * @example
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Create some stitch data
     *   let pathData = [{x: 50, y: 50}, {x: 100, y: 50}, {x: 100, y: 100}];
     *   let outlinePoints = embroideryOutlineFromPath(pathData, 5); // Add 5mm outline
     *   // Use the outline points for further processing
     *   endRecord();
     * }
     */
    global.embroideryOutlineFromPath = function (
      stitchDataArray,
      offsetDistance,
      threadIndex = _strokeThreadIndex,
      outlineType = "convex",
      applyTransform = true,
    ) {
      if (!stitchDataArray || !Array.isArray(stitchDataArray)) {
        console.warn("🪡 p5.embroider says: embroideryOutlineFromPath() requires a valid array of stitch data");
        return [];
      }

      if (stitchDataArray.length === 0) {
        console.warn("🪡 p5.embroider says: No stitch data provided to create outline");
        return [];
      }

      // Extract valid points from the stitch data array
      const allPoints = [];
      for (const stitch of stitchDataArray) {
        // Handle different possible stitch data formats
        if (stitch && typeof stitch === "object") {
          let x, y;

          // Check for direct x, y properties
          if (stitch.x != null && stitch.y != null) {
            x = stitch.x;
            y = stitch.y;
          }
          // Check for pathData property (for SVG-style data)
          else if (stitch.pathData && Array.isArray(stitch.pathData)) {
            // Process pathData array - take the first valid point
            for (const pathPoint of stitch.pathData) {
              if (pathPoint && pathPoint.x != null && pathPoint.y != null) {
                x = pathPoint.x;
                y = pathPoint.y;
                break;
              }
            }
          }

          // Add point if valid and not a special command
          if (x != null && y != null && isFinite(x) && isFinite(y) && !stitch.command) {
            allPoints.push({ x: x, y: y });
          }
        }
      }

      if (allPoints.length === 0) {
        console.warn("🪡 p5.embroider says: No valid stitch points found in provided data to create outline");
        return [];
      }

      if (_DEBUG) {
        console.log("Creating outline from", allPoints.length, "stitch points from provided data");
        console.log("Offset distance:", offsetDistance, "mm");
        console.log("Outline type:", outlineType);
      }

      let outlinePoints = [];

      // Create outline based on type
      switch (outlineType) {
        case "bounding":
          outlinePoints = createBoundingBoxOutline(allPoints, offsetDistance);
          break;
        case "scale":
          outlinePoints = createScaledOutline(allPoints, offsetDistance);
          break;
        case "convex":
        default:
          outlinePoints = createConvexHullOutline(allPoints, offsetDistance);
          break;
      }

      if (outlinePoints.length === 0) {
        console.warn("🪡 p5.embroider says: Failed to create outline from provided data");
        return [];
      }

      // Apply current transformation to outline points if requested and recording
      let finalOutlinePoints = outlinePoints;
      if (applyTransform && _recording) {
        finalOutlinePoints = applyCurrentTransformToPoints(outlinePoints);
      }

      // If recording and thread index provided, add to embroidery data
      if (_recording && threadIndex != null) {
        // Convert outline to stitches
        const outlineStitches = p5embroidery.convertVerticesToStitches(
          finalOutlinePoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
          _strokeSettings,
        );

        if (outlineStitches.length > 0) {
          // Ensure we have a valid thread
          if (threadIndex >= _stitchData.threads.length) {
            threadIndex = _strokeThreadIndex;
          }

          // Add outline stitches to the specified thread
          _stitchData.threads[threadIndex].runs.push(outlineStitches);

          // Draw outline if in visual modes
          if (_drawMode === "stitch" || _drawMode === "realistic") {
            drawStitches(outlineStitches, threadIndex);
          }

          if (_DEBUG) {
            console.log("Added outline with", outlineStitches.length, "stitches to thread", threadIndex);
          }
        }
      }

      return finalOutlinePoints;
    };

    /**
     * Creates a convex hull outline around the given points.
     * @private
     */
    function createConvexHullOutline(points, offsetDistance) {
      // Find convex hull of all points
      const hullPoints = getConvexHull(points);

      if (hullPoints.length < 3) {
        console.warn("Insufficient points for convex hull, falling back to bounding box");
        return createBoundingBoxOutline(points, offsetDistance);
      }

      // Reverse the hull points to ensure clockwise ordering for outward expansion
      const reversedHull = [...hullPoints].reverse();

      // Expand the hull outward by the offset distance
      const expandedHull = expandPolygon(reversedHull, offsetDistance);

      // Close the polygon
      if (expandedHull.length > 0) {
        expandedHull.push({ x: expandedHull[0].x, y: expandedHull[0].y });
      }

      return expandedHull;
    }

    /**
     * Creates a bounding box outline around the given points.
     * @private
     */
    function createBoundingBoxOutline(points, offsetDistance) {
      const bounds = getPathBounds(points);

      // Expand bounds by offset distance
      const expandedBounds = {
        x: bounds.x - offsetDistance,
        y: bounds.y - offsetDistance,
        w: bounds.w + 2 * offsetDistance,
        h: bounds.h + 2 * offsetDistance,
      };

      // Create rectangle points (clockwise)
      return [
        { x: expandedBounds.x, y: expandedBounds.y },
        { x: expandedBounds.x + expandedBounds.w, y: expandedBounds.y },
        { x: expandedBounds.x + expandedBounds.w, y: expandedBounds.y + expandedBounds.h },
        { x: expandedBounds.x, y: expandedBounds.y + expandedBounds.h },
        { x: expandedBounds.x, y: expandedBounds.y }, // Close the rectangle
      ];
    }

    /**
     * Creates a scaled outline by scaling the original path outward from its centroid.
     * @private
     */
    function createScaledOutline(points, offsetDistance) {
      if (points.length === 0) return [];

      // Calculate the centroid of the path
      let centroidX = 0,
        centroidY = 0;
      for (const point of points) {
        centroidX += point.x;
        centroidY += point.y;
      }
      centroidX /= points.length;
      centroidY /= points.length;

      // Calculate the average distance from centroid to points
      let avgDistance = 0;
      for (const point of points) {
        const dx = point.x - centroidX;
        const dy = point.y - centroidY;
        avgDistance += Math.sqrt(dx * dx + dy * dy);
      }
      avgDistance /= points.length;

      // Calculate scale factor to achieve the desired offset
      // If avgDistance is 0 (all points at centroid), use a default scale
      const scaleFactor = avgDistance > 0 ? (avgDistance + offsetDistance) / avgDistance : 1 + offsetDistance;

      // Scale each point outward from the centroid
      const scaledPoints = [];
      for (const point of points) {
        const dx = point.x - centroidX;
        const dy = point.y - centroidY;

        const scaledX = centroidX + dx * scaleFactor;
        const scaledY = centroidY + dy * scaleFactor;

        scaledPoints.push({ x: scaledX, y: scaledY });
      }

      // Close the path if it has more than 2 points
      if (scaledPoints.length > 2 && scaledPoints.length > 0) {
        const firstPoint = scaledPoints[0];
        const lastPoint = scaledPoints[scaledPoints.length - 1];

        // Only add closing point if it's not already closed
        const distance = Math.sqrt(Math.pow(lastPoint.x - firstPoint.x, 2) + Math.pow(lastPoint.y - firstPoint.y, 2));

        if (distance > 0.1) {
          // Small threshold to avoid duplicate points
          scaledPoints.push({ x: firstPoint.x, y: firstPoint.y });
        }
      }

      return scaledPoints;
    }

    /**
     * Computes the convex hull of a set of 2D points using Graham scan algorithm.
     * @private
     */
    function getConvexHull(points) {
      if (points.length < 3) return points;

      // Remove duplicate points
      const uniquePoints = [];
      const seen = new Set();
      for (const point of points) {
        const key = `${Math.round(point.x * 1000)},${Math.round(point.y * 1000)}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePoints.push(point);
        }
      }

      if (uniquePoints.length < 3) return uniquePoints;

      // Find the bottom-most point (and left-most if tie)
      let bottom = uniquePoints[0];
      for (let i = 1; i < uniquePoints.length; i++) {
        if (uniquePoints[i].y < bottom.y || (uniquePoints[i].y === bottom.y && uniquePoints[i].x < bottom.x)) {
          bottom = uniquePoints[i];
        }
      }

      // Sort points by polar angle with respect to bottom point
      const sortedPoints = uniquePoints.filter((p) => p !== bottom);
      sortedPoints.sort((a, b) => {
        // Use p5.Vector for angle calculations
        const vA = createVector(a.x - bottom.x, a.y - bottom.y);
        const vB = createVector(b.x - bottom.x, b.y - bottom.y);

        const angleA = vA.heading();
        const angleB = vB.heading();

        if (angleA !== angleB) {
          return angleA - angleB;
        }

        // If angles are equal, sort by distance using p5.Vector
        const distA = vA.magSq(); // magSq() is faster than mag() for comparisons
        const distB = vB.magSq();
        return distA - distB;
      });

      // Build convex hull using Graham scan
      const hull = [bottom];

      for (const point of sortedPoints) {
        // Remove points that would create a clockwise turn
        while (hull.length > 1 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
          hull.pop();
        }
        hull.push(point);
      }

      return hull;
    }

    /**
     * Computes the cross product to determine turn direction using p5.Vector.
     * @private
     */
    function crossProduct(O, A, B) {
      const v1 = createVector(A.x - O.x, A.y - O.y);
      const v2 = createVector(B.x - O.x, B.y - O.y);
      // Use p5.Vector.cross(v1, v2).z to get the z-component of the cross product
      return p5.Vector.cross(v1, v2).z;
    }

    /**
     * Expands a polygon outward by a specified distance.
     * @private
     */
    function expandPolygon(polygon, distance) {
      if (polygon.length < 3) return polygon;

      const expandedPoints = [];

      for (let i = 0; i < polygon.length; i++) {
        const prev = polygon[(i - 1 + polygon.length) % polygon.length];
        const curr = polygon[i];
        const next = polygon[(i + 1) % polygon.length];

        // Calculate the offset point - use true for isLeft to expand outward
        // (works with clockwise-ordered polygons)
        const offsetPoint = calculateOffsetCorner(prev, curr, next, distance, true);
        expandedPoints.push(offsetPoint);
      }

      return expandedPoints;
    }
  })(typeof globalThis !== "undefined" ? globalThis : window);

  /**
   * Converts millimeters to pixels.
   * @method mmToPixel
   * @for p5
   * @param {Number} mm - Millimeters
   * @param {Number} [dpi=96] - Dots per inch
   * @return {Number} Pixels
   * @example
   *
   *
   * function setup() {
   *   let pixels = mmToPixel(10); // Convert 10mm to pixels
   *   if(_DEBUG) console.log(pixels);
   * }
   *
   *
   */
  function mmToPixel$1(mm, dpi = 96) {
    return (mm / 25.4) * dpi;
  }

  /**
   * Converts pixels to millimeters.
   * @method pixelToMm
   * @for p5
   * @param {Number} pixels - Pixels
   * @param {Number} [dpi=96] - Dots per inch
   * @return {Number} Millimeters
   * @example
   *
   *
   * function setup() {
   *   let mm = pixelToMm(100); // Convert 100 pixels to mm
   *   if(_DEBUG) console.log(mm);
   * }
   *
   *
   */
  function pixelToMm(pixels, dpi = 96) {
    return (pixels * 25.4) / dpi;
  }

  /**
   * Creates straight line stitches from an array of path points
   * @private
   * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
   * @param {Object} stitchSettings - Settings for the stitches
   * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
   */
  function straightLineStitchFromPath(pathPoints, stitchSettings = _embroiderySettings) {
    if (!pathPoints || pathPoints.length < 2) {
      console.warn("Cannot create straight stitching from insufficient path points");
      return [];
    }

    const result = [];

    // Process each segment between consecutive points
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];

      // For the first segment, include the starting point
      if (i === 0) {
        result.push({
          x: p1.x,
          y: p1.y,
        });
      }

      // Calculate segment properties
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Skip if the segment is too short
      if (distance < stitchSettings.minStitchLength) {
        // Still include the endpoint
        result.push({
          x: p2.x,
          y: p2.y,
        });
        continue;
      }

      // Calculate number of stitches for this segment
      let baseStitchLength = stitchSettings.stitchLength;
      let numStitches = Math.floor(distance / baseStitchLength);
      let currentDistance = 0;

      // Create intermediate stitches along this segment
      for (let j = 0; j < numStitches; j++) {
        // Add noise to stitch length if specified
        let stitchLength = baseStitchLength;
        if (stitchSettings.resampleNoise > 0) {
          let noise = (Math.random() * 2 - 1) * stitchSettings.resampleNoise;
          stitchLength *= 1 + noise;
        }

        // Update cumulative distance
        currentDistance += stitchLength;
        let t = Math.min(currentDistance / distance, 1);

        // Add the stitch point
        result.push({
          x: p1.x + dx * t,
          y: p1.y + dy * t,
        });
      }

      // Add endpoint of this segment
      let remainingDistance = distance - currentDistance;
      if (remainingDistance > stitchSettings.minStitchLength || numStitches === 0) {
        result.push({
          x: p2.x,
          y: p2.y,
        });
      }
    }

    if (_DEBUG) console.log("Generated straight line path stitches:", result);
    return result;
  }

}));
