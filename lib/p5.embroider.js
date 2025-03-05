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
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
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
        height: Math.ceil(maxY - minY),
      };
    }

    generateDST(points, title) {
      console.log("=== DSTWriter generateDST ===");
      console.log("Initial state:", {
        currentX: this.currentX,
        currentY: this.currentY,
      });

      // Reset data and counters
      this.data = [];
      this.currentX = 0;
      this.currentY = 0;
      this.stitchCount = 0;
      this.colorChangeCount = 0;

      // Calculate border size before transformation
      let border = this.calculateBorderSize(points);
      console.log("Original border size:", border);

      // Transform points to center-origin coordinates
      const centerX = border.width / 2;
      const centerY = border.height / 2;

      const transformedPoints = points.map((point) => ({
        ...point,
        x: point.x - (border.left + centerX),
        y: point.y - (border.top + centerY),
      }));

      console.log("Coordinate transformation:", {
        centerX,
        centerY,
        originalFirstPoint: points[0],
        transformedFirstPoint: transformedPoints[0],
      });

      // Recalculate border size after transformation
      border = this.calculateBorderSize(transformedPoints);
      console.log("Transformed border size:", border);

      // Generate stitches using transformed points
      for (let i = 0; i < transformedPoints.length; i++) {
        const point = transformedPoints[i];
        console.log("Processing point:", i, point);

        // Handle color change
        if (point.colorChange) {
          console.log("Color change at point:", i);
          // Add a color change command at the current position
          // In DST, we don't move but just insert a color change command
          this.data.push(...this.encodeRecord(0, 0, DSTWriter.COLOR_CHANGE));
          this.colorChangeCount++;
          continue;
        }

        // Handle thread trim
        if (point.trim) {
          console.log("Thread trim at point:", i);
          // In DST format, thread trimming is signaled by a specific pattern of jump stitches
          // Generate a zigzag pattern of 3 jumps that embroidery machines recognize as a trim command

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

        console.log("After move:", {
          currentX: this.currentX,
          currentY: this.currentY,
        });
      }

      // Add end of pattern
      this.move(0, 0, DSTWriter.END);

      console.log("Final state:", {
        currentX: this.currentX,
        currentY: this.currentY,
        stitchCount: this.stitchCount,
        colorChangeCount: this.colorChangeCount,
      });

      // Prepare header
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
      console.log("DST file saved!");
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

  (function (global) {
    const p5embroidery = {};

    // Internal properties
    let _p5Instance;
    let _recording = false;
    let _drawMode = "stitch"; // 'stitch', 'p5', 'realistic'
    let _stitchData = {
      width: 0,
      height: 0,
      threads: []};
    let _strokeThreadIndex = 0;
    let _fillThreadIndex = 0;

    // Embroidery settings
    const _embrSettings = {
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
      ZIGZAG: "zigzag",
      LINES: "lines",
      SASHIKO: "sashiko",
    };

    // Add fill mode constants
    const FILL_MODE = {
      TATAMI: "tatami",
      SATIN: "satin",
      SPIRAL: "spiral",
    };

    let _doStroke = false; // Track if stroke is enabled
    let _currentStrokeMode = STROKE_MODE.ZIGZAG;

    let _doFill = false; // Track if fill is enabled
    let _currentFillMode = FILL_MODE.TATAMI;
    let _fillSettings = {
      stitchLength: 3, // mm
      stitchWidth: 0.2,
      minStitchLength: 0.5, // mm
      resampleNoise: 0, // 0-1 range
      angle: 0, // Angle in radians
      spacing: 3, // Space between rows in mm
      tieDistance: 15, // Distance between tie-down stitches in mm
      alternateAngle: false, // Whether to alternate angles between shapes
      color: { r: 0, g: 0, b: 0 },
    };

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
      } else {
        console.warn(`Invalid stroke mode: ${mode}. Using default: ${_currentStrokeMode}`);
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
     * Sets the fill settings for embroidery.
     * @method setFillSettings
     * @for p5
     * @param {Object} settings - Fill settings object
     * @param {number} [settings.angle] - Fill angle in degrees
     * @param {number} [settings.spacing] - Space between rows in mm
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
      if (settings.spacing !== undefined) {
        _fillSettings.spacing = settings.spacing;
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
     * @private
     */
    class Thread {
      /**
       * Creates a new Thread instance.
       * @param {number} color - Color object with r, g, b components (0-255)
       * @param {number} weight - Weight of the thread in mm
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

    /**
     * Overrides p5.js line() function to record embroidery stitches.
     * @private
     */
    let _originalLineFunc;
    function overrideLineFunction() {
      _originalLineFunc = window.line;
      window.line = function (x1, y1, x2, y2) {
        if (_recording) {
          let stitches = convertLineToStitches(x1, y1, x2, y2);
          _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

          if (_drawMode === "stitch" || _drawMode === "realistic") {
            drawStitches(stitches, _strokeThreadIndex);
          } else {
            _originalLineFunc.call(this, mmToPixel(x1), mmToPixel(y1), mmToPixel(x2), mmToPixel(y2));
          }
        } else {
          _originalLineFunc.apply(this, arguments);
        }
      };
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
          if (_strokeThreadIndex !== threadIndex && _stitchData.threads[_strokeThreadIndex] !== undefined) {
            trimThread();
          }

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

          // Store the fill state
          _doFill = true;

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
        }
        _originalNoFillFunc.apply(this, arguments);
      };
    }

    /**
     * Overrides p5.js line() function to record embroidery stitches.
     * @private
     */
    let _originalStrokeWeightFunc;
    function overrideStrokeWeightFunction() {
      _originalStrokeWeightFunc = window.strokeWeight;
      window.strokeWeight = function (weight) {
        if (_recording) {
          _embrSettings.stitchWidth = weight;
          //_stitchData.threads[_currentThreadIndex].weight = weight;
          _originalStrokeWeightFunc.call(this, mmToPixel(weight));
        } else {
          _originalStrokeWeightFunc.apply(this, arguments);
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

          // Generate stitch points for the ellipse
          let stitches = [];
          let numSteps = Math.max(Math.ceil((Math.PI * (radiusX + radiusY)) / _embrSettings.stitchLength), 12);

          // Generate points along the ellipse, starting at 0 degrees (right side of ellipse)
          for (let i = 0; i <= numSteps; i++) {
            let angle = (i / numSteps) * Math.PI * 2;
            let stitchX = x + Math.cos(angle) * radiusX;
            let stitchY = y + Math.sin(angle) * radiusY;

            // Store in tenths of mm (internal format)
            stitches.push({
              x: stitchX * 10,
              y: stitchY * 10,
            });
          }

          // Record the stitches if we're recording
          if (_recording) {
            // Get the current position (in tenths of mm)
            let currentX, currentY;
            if (
              _stitchData.threads[_strokeThreadIndex].runs.length === 0 ||
              _stitchData.threads[_strokeThreadIndex].runs[_stitchData.threads[_strokeThreadIndex].runs.length - 1]
                .length === 0
            ) {
              // If there are no runs or the last run is empty, use the first point on the ellipse
              // (at 0 degrees) as the starting point, not the center
              currentX = (x + radiusX) * 10; // Point at 0 degrees (right side of ellipse)
              currentY = y * 10; // Convert to tenths of mm
            } else {
              // Otherwise, use the last stitch position (already in tenths of mm)
              let lastRun =
                _stitchData.threads[_strokeThreadIndex].runs[_stitchData.threads[_strokeThreadIndex].runs.length - 1];
              let lastStitch = lastRun[lastRun.length - 1];
              currentX = lastStitch.x;
              currentY = lastStitch.y;
            }

            // Add a jump stitch to the first point of the ellipse if needed
            if (
              Math.sqrt(Math.pow(stitches[0].x - currentX, 2) + Math.pow(stitches[0].y - currentY, 2)) >
              _embrSettings.jumpThreshold
            ) {
              _stitchData.threads[_strokeThreadIndex].runs.push([
                {
                  x: currentX,
                  y: currentY,
                  command: "jump",
                },
                {
                  x: stitches[0].x,
                  y: stitches[0].y,
                },
              ]);
            }

            if (_embrSettings.stitchWidth > 0) {
              stitches = zigzagStitches(stitches, _embrSettings.stitchWidth);
            }

            // Add the ellipse stitches
            _stitchData.threads[_strokeThreadIndex].runs.push(stitches);
          }

          // Call the original ellipse function if in p5 mode
          if (_drawMode === "p5") {
            _originalEllipseFunc.call(this, mmToPixel(x), mmToPixel(y), mmToPixel(w), mmToPixel(h));
          } else {
            drawStitches(stitches, _strokeThreadIndex);
          }
        } else {
          _originalEllipseFunc.apply(this, arguments);
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
          // For point, we just add a single stitch
          let stitches = [
            {
              x: x * 10,
              y: y * 10,
            },
          ];
          _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

          if (_drawMode === "stitch" || _drawMode === "realistic" || _drawMode === "p5") {
            _p5Instance.push();
            _originalStrokeFunc.stroke(255, 0, 0); // Red for stitch points
            _originalStrokeWeightFunc.call(_p5Instance, 3);
            _originalPointFunc.call(_p5Instance, mmToPixel(x), mmToPixel(y));
            _p5Instance.pop();
          }
        } else {
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
      window.rect = function (x, y, w, h) {
        let stitches = [];
        let fillStitches = [];
        let strokeStitches = [];

        if (_recording) {
          if (_doFill) {
            switch (_currentFillMode) {
              case FILL_MODE.TATAMI:
                fillStitches = createTatamiFill(x, y, w, h, _fillSettings);
                break;
              // Add other fill modes here
              default:
                fillStitches = createTatamiFill(x, y, w, h, _fillSettings);
            }

            stitches.push(...fillStitches);
            // Add the stitches to the current thread
            _stitchData.threads[_fillThreadIndex].runs.push(fillStitches);
          }

          if (_doStroke) {
            

            strokeStitches.push(...convertLineToStitches(x, y, x + w, y));
            strokeStitches.push(...convertLineToStitches(x + w, y, x + w, y + h));
            strokeStitches.push(...convertLineToStitches(x + w, y + h, x, y + h));
            strokeStitches.push(...convertLineToStitches(x, y + h, x, y));

            //stitches.push(...strokeStitches);
            _stitchData.threads[_strokeThreadIndex].runs.push(strokeStitches);
          }

          // Draw the stitches
          if (_drawMode === "stitch" || _drawMode === "realistic") {
            ///drawStitches(stitches,_strokeThreadIndex);
            //console.log("fillThreadIndex", _fillThreadIndex);
            //console.log("strokeThreadIndex", _strokeThreadIndex);

            drawStitches(fillStitches, _fillThreadIndex);
            drawStitches(strokeStitches, _strokeThreadIndex);
          } else {
            _originalRectFunc.call(this, mmToPixel(x), mmToPixel(y), mmToPixel(w), mmToPixel(h));
          }
        } else {
          _originalRectFunc.apply(this, arguments);
        }
      };
    }

    /**
     * Overrides necessary p5.js functions for embroidery recording.
     * @private
     */
    function overrideP5Functions() {
      overrideLineFunction();
      overrideEllipseFunction();
      overrideStrokeWeightFunction();
      overridePointFunction();
      overrideStrokeFunction();
      overrideNoStrokeFunction();
      overrideFillFunction();
      overrideNoFillFunction();
      overrideRectFunction();
      // Add more overrides as needed
    }

    /**
     * Restores original p5.js functions.
     * @private
     */
    function restoreP5Functions() {
      window.line = _originalLineFunc;
      window.ellipse = _originalEllipseFunc;
      window.strokeWeight = _originalStrokeWeightFunc;
      window.point = _originalPointFunc;
      window.stroke = _originalStrokeFunc;
      window.noStroke = _originalNoStrokeFunc;
      window.fill = _originalFillFunc;
      window.noFill = _originalNoFillFunc;
      window.rect = _originalRectFunc;
      // Restore other functions as needed
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
      _embrSettings.minStitchLength = Math.max(0, minLength);
      _embrSettings.stitchLength = Math.max(0.1, desiredLength);
      _embrSettings.resampleNoise = Math.min(1, Math.max(0, noise));
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
     * @param {number} x1 - Starting x-coordinate
     * @param {number} y1 - Starting y-coordinate
     * @param {number} x2 - Ending x-coordinate
     * @param {number} y2 - Ending y-coordinate
     * @returns {Array<{x: number, y: number}>} Array of stitch points in 0.1mm units
     */
    function convertLineToStitches(x1, y1, x2, y2) {

      let dx = x2 - x1;
      let dy = y2 - y1;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (_embrSettings.stitchWidth > 0) {
        //return lineZigzagStitching(x1, y1, x2, y2, distance);

        switch (_currentStrokeMode) {
          case STROKE_MODE.ZIGZAG:
            return lineZigzagStitching(x1, y1, x2, y2, distance);
          case STROKE_MODE.LINES:
            return multiLineStitching(x1, y1, x2, y2, _embrSettings.stitchWidth, _embrSettings.stitchLength);
          case STROKE_MODE.SASHIKO:
            return sashikoStitching(x1, y1, x2, y2, _embrSettings.stitchWidth, _embrSettings.stitchLength);
          default:
            return straightLineStitching(x1, y1, x2, y2, distance);
        }
      } else {
        return straightLineStitching(x1, y1, x2, y2, distance);
      }
    }

    /**
     * Creates zigzag stitches
     * @private
     * @param {number} x1 - Starting x-coordinate
     * @param {number} y1 - Starting y-coordinate
     * @param {number} x2 - Ending x-coordinate
     * @param {number} y2 - Ending y-coordinate
     * @param {number} distance - Distance between points
     * @returns {Array<{x: number, y: number}>} Array of stitch points in 0.1mm units
     */
    function lineZigzagStitching(x1, y1, x2, y2, distance) {
      let stitches = [];
      let dx = x2 - x1;
      let dy = y2 - y1;

      // Calculate perpendicular vector for zigzag
      let perpX = -dy / distance;
      let perpY = dx / distance;

      // Determine the width to use (either stitch width or default)
      let width = _embrSettings.stitchWidth > 0 ? _embrSettings.stitchWidth : 2;

      // Calculate number of zigzag segments
      let zigzagDistance = _embrSettings.stitchLength;
      let numZigzags = Math.max(2, Math.floor(distance / zigzagDistance));

      // Create zigzag pattern
      let halfWidth = width / 2;
      let side = 1; // Start with one side

      // Add first point
      stitches.push({
        x: (x1 + perpX * halfWidth * side) * 10,
        y: (y1 + perpY * halfWidth * side) * 10,
      });

      // Add zigzag points
      for (let i = 1; i <= numZigzags; i++) {
        let t = i / numZigzags;
        side = -side; // Alternate sides

        let pointX = x1 + dx * t + perpX * halfWidth * side;
        let pointY = y1 + dy * t + perpY * halfWidth * side;

        stitches.push({
          x: pointX * 10,
          y: pointY * 10,
        });
      }

      // Make sure we end at the endpoint
      if (side !== -1) {
        // If we didn't end on the opposite side
        stitches.push({
          x: (x2 + perpX * halfWidth * -1) * 10, // End on opposite side
          y: (y2 + perpY * halfWidth * -1) * 10,
        });
      }
      return stitches;
    }

    /**
     * Creates straight line stitches (直線縫い - Chokusen Nui)
     * @private
     * @param {number} x1 - Starting x-coordinate
     * @param {number} y1 - Starting y-coordinate
     * @param {number} x2 - Ending x-coordinate
     * @param {number} y2 - Ending y-coordinate
     * @returns {Array<{x: number, y: number}>} Array of stitch points in 0.1mm units
     */
    function straightLineStitching(x1, y1, x2, y2, stitchSettings = _embrSettings) {
      let stitches = [];
      let dx = x2 - x1;
      let dy = y2 - y1;
      const distance = _p5Instance.dist(x1, y1, x2, y2);
      // Add first stitch at starting point
      stitches.push({
        x: x1 * 10,
        y: y1 * 10,
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
          x: (x1 + dx * t) * 10,
          y: (y1 + dy * t) * 10,
        });
      }

      // Add final stitch at end point if needed
      let remainingDistance = distance - currentDistance;
      if (remainingDistance > stitchSettings.minStitchLength || numStitches === 0) {
        stitches.push({
          x: x2 * 10,
          y: y2 * 10,
        });
      }
      return stitches;
    }

    /**
     * Converts an array of stitches into a zigzag pattern
     * @method zigzagStitches
     * @for p5
     * @param {Array<{x: number, y: number}>} stitches - Array of stitch points in 0.1mm units
     * @param {Number} width - Width of the zigzag in mm
     * @returns {Array<{x: number, y: number}>} Array of zigzag stitch points in 0.1mm units
     * @example
     *
     *
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Create a straight line
     *   let straightStitches = straightLineStitching(10, 10, 50, 10, 40);
     *   // Convert to zigzag with 3mm width
     *   let zigzagStitches = zigzagStitches(straightStitches, 3);
     *   // Add to embroidery
     *   _stitchData.threads[_currentThreadIndex].runs.push(zigzagStitches);
     * }
     *
     *
     */
    function zigzagStitches(stitches, width) {
      if (!stitches || stitches.length < 2) {
        console.warn("Cannot create zigzag from insufficient stitch points");
        return stitches;
      }

      // Convert from 0.1mm units to mm for calculations
      const mmStitches = stitches.map((stitch) => ({
        x: stitch.x / 10,
        y: stitch.y / 10,
      }));

      const zigzagResult = [];
      const halfWidth = width / 2;
      let side = 1; // Start with one side

      // Process each segment between consecutive points
      for (let i = 0; i < mmStitches.length - 1; i++) {
        const p1 = mmStitches[i];
        const p2 = mmStitches[i + 1];

        // Calculate segment direction vector
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Skip if points are too close
        if (distance < 0.1) continue;

        // Calculate perpendicular vector
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // If this is the first point, add it with offset
        if (i === 0) {
          zigzagResult.push({
            x: (p1.x + perpX * halfWidth * side) * 10,
            y: (p1.y + perpY * halfWidth * side) * 10,
          });
        }

        // Add the second point with opposite offset
        side = -side;
        zigzagResult.push({
          x: (p2.x + perpX * halfWidth * side) * 10,
          y: (p2.y + perpY * halfWidth * side) * 10,
        });
      }

      // If we have an odd number of points, add the last point with opposite offset
      if (mmStitches.length % 2 === 0) {
        const lastPoint = mmStitches[mmStitches.length - 1];
        const secondLastPoint = mmStitches[mmStitches.length - 2];

        // Calculate direction for the last segment
        const dx = lastPoint.x - secondLastPoint.x;
        const dy = lastPoint.y - secondLastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate perpendicular vector
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Add the last point with opposite offset
        side = -side;
        zigzagResult.push({
          x: (lastPoint.x + perpX * halfWidth * side) * 10,
          y: (lastPoint.y + perpY * halfWidth * side) * 10,
        });
      }
      return zigzagResult;
    }

    // Implement the new stitching methods
    function multiLineStitching(x1, y1, x2, y2, width, stitchSettings = _embrSettings) {
      // Calculate the number of lines based on stroke weight
      //console.log("width", width);
      //console.log("stitchLength", stitchLength);
      const threadWeight = _stitchData.threads[_strokeThreadIndex]?.weight || 0.2;
      const numLines = Math.max(2, Math.floor(width / threadWeight));
      const stitches = [];
      _p5Instance.dist(x1, y1, x2, y2);

      // Calculate the direction vector and perpendicular vector
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);

      // Normalize direction vector
      const dirX = dx / len;
      const dirY = dy / len;

      // Calculate perpendicular vector
      const perpX = -dirY;
      const perpY = dirX;

      // Calculate the spacing between lines
      const spacing = width / (numLines - 1);

      // Generate multiple parallel lines
      for (let i = 0; i < numLines; i++) {
        // Calculate offset from center
        const offset = i * spacing - width / 2;

        // Calculate start and end points for this line
        const startX = x1 + perpX * offset;
        const startY = y1 + perpY * offset;
        const endX = x2 + perpX * offset;
        const endY = y2 + perpY * offset;

        // For even lines, go from start to end
        // For odd lines, go from end to start (back and forth pattern)

        if (i % 2 === 0) {
          const lineStitches = straightLineStitching(startX, startY, endX, endY, stitchSettings);
          stitches.push(...lineStitches);
        } else {
          const lineStitches = straightLineStitching(endX, endY, startX, startY, stitchSettings);
          stitches.push(...lineStitches);
        }
      }

      return stitches;
    }

    function sashikoStitching(x1, y1, x2, y2, stitchWidth, stitchSettings = _embrSettings) {
      // Sashiko is a traditional Japanese embroidery technique with evenly spaced running stitches
      // This implementation creates a pattern of dashed lines
      const stitches = [];
      _stitchData.threads[_strokeThreadIndex]?.weight || 0.2;

      // Calculate direction and perpendicular vectors
      const dx = x2 - x1;
      const dy = y2 - y1;
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

      while (currentDist < distance) {
        const segmentLength = isMultiline ? multilineLength : straightLength;
        const endDist = Math.min(currentDist + segmentLength, distance);

        // Calculate segment start and end points
        const segStartX = x1 + dirX * currentDist;
        const segStartY = y1 + dirY * currentDist;
        const segEndX = x1 + dirX * endDist;
        const segEndY = y1 + dirY * endDist;

        if (isMultiline) {
          const lineStitches = multiLineStitching(segStartX, segStartY, segEndX, segEndY, stitchWidth, stitchSettings);
          stitches.push(...lineStitches);
        } else {
          // Create single straight line for this segment
          const lineStitches = straightLineStitching(segStartX, segStartY, segEndX, segEndY, stitchSettings);
          stitches.push(...lineStitches);
        }

        // Move to next segment)
        currentDist = endDist;
        isMultiline = !isMultiline; // Toggle between multiline and straight line
      }
      // Convert coordinates to internal format (tenths of mm)
      return stitches.map((stitch) => ({
        x: stitch.x,
        y: stitch.y,
      }));
    }

    /**
     * Exports the recorded embroidery data as a file.
     * @method exportEmbroidery
     * @for p5
     * @param {String} filename - Output filename with extension
     * @example
     *
     *
     * function setup() {
     *   createCanvas(400, 400);
     *   beginRecord(this);
     *   // Draw embroidery patterns
     *   endRecord();
     *   exportEmbroidery('pattern.dst');
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
            });
          }
        }
      }

      const gcodeWriter = new GCodeWriter();
      gcodeWriter.addComment("Embroidery Pattern");
      gcodeWriter.move(points[0].x, points[0].y);
      for (const point of points) {
        gcodeWriter.move(point.x, point.y);
      }
      gcodeWriter.saveGcode(points, "EmbroideryPattern", filename);
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
        }

        currentThreadIndex = threadIndex;

        for (const run of thread.runs) {
          // Check if this is a thread trim command
          if (run.length === 1 && run[0].command === "trim") {

            points.push({
              x: run[0].x,
              y: run[0].y,
              jump: true,
              trim: true,
            });
            continue;
          }
          for (const stitch of run) {
            points.push({
              x: stitch.x,
              y: stitch.y,
            });
          }
        }
      }

      // Skip export if no points
      if (points.length === 0) {
        console.warn("No embroidery points to export");
        return;
      }

      dstWriter.saveDST(points, "EmbroideryPattern", filename);
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

        // Check if there are any runs in the current thread
        if (!currentThread || currentThread.runs.length === 0) {
          return; // Nothing to trim
        }

        // Get the last run in the current thread
        const lastRun = currentThread.runs[currentThread.runs.length - 1];

        // Check if the last run has any stitches
        if (!lastRun || lastRun.length === 0) {
          return; // No stitches to trim
        }

        // Get the last stitch position from the last run
        let lastStitchIndex = lastRun.length - 1;
        let currentX = lastRun[lastStitchIndex].x;
        let currentY = lastRun[lastStitchIndex].y;

        // Add a special point to indicate thread trim
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
          let endX = mmToPixel(currentX / 10) + lineLength;
          let endY = mmToPixel(currentY / 10) - lineLength;
          _originalStrokeFunc.call(_p5Instance, 255, 0, 0); // red for line
          _originalStrokeWeightFunc.call(_p5Instance, 0.5);

          _originalLineFunc.call(_p5Instance, mmToPixel(currentX / 10), mmToPixel(currentY / 10), endX, endY);
          // Place scissors at end of line
          _p5Instance.text("✂️", endX, endY);
          _p5Instance.pop();
        }
      }
    };

    /**
     * Draws stitches according to the current draw mode
     * @param {Array} stitches - Array of stitch objects with x and y coordinates
     */
    function drawStitches(stitches, threadIndex) {
      let prevX = mmToPixel(stitches[0].x / 10);
      let prevY = mmToPixel(stitches[0].y / 10);

      if (_drawMode === "stitch") {
        // Draw stitch lines
        _p5Instance.push();

        for (let i = 1; i < stitches.length; i++) {
          let currentX = mmToPixel(stitches[i].x / 10);
          let currentY = mmToPixel(stitches[i].y / 10);

          if (i === 0) {
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
          let currentX = mmToPixel(stitches[i].x / 10);
          let currentY = mmToPixel(stitches[i].y / 10);
          _p5Instance.noStroke();
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

        _p5Instance.pop();
      }
      // else if (_drawMode === "p5") {
      //   // For p5 mode, we need to draw a line from the starting point to each stitch
      //   if (stitches.length > 0) {
      //     // prevX and prevY are already in mm, but we need to convert them to pixels
      //     // For each stitch, draw a line from the previous point
      //     for (let i = 1; i < stitches.length; i++) {
      //       // Convert stitch coordinates from tenths of mm to pixels
      //       const currentX = mmToPixel(stitches[i].x / 10);
      //       const currentY = mmToPixel(stitches[i].y / 10);

      //       _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

      //       // Update the previous point
      //       prevX = currentX;
      //       prevY = currentY;
      //     }
      //   }
      // }

      // Return the last stitch position for chaining
      return stitches.length > 0
        ? {
            x: stitches[stitches.length - 1].x / 10,
            y: stitches[stitches.length - 1].y / 10,
          }
        : { x: startX, y: startY };
    }

    /**
     * Creates a tatami fill pattern for a rectangular area.
     * @private
     * @param {number} x - X coordinate of the rectangle
     * @param {number} y - Y coordinate of the rectangle
     * @param {number} w - Width of the rectangle
     * @param {number} h - Height of the rectangle
     * @returns {Array<{x: number, y: number}>} Array of stitch points
     */
    function createTatamiFill(x, y, w, h, stitchSettings = _fillSettings) {
      const stitches = [];
      const angle = stitchSettings.angle;
      stitchSettings.stitchLength;
      const stitchWidth = stitchSettings.stitchWidth;
      stitchSettings.minStitchLength;
      stitchSettings.resampleNoise;
      stitchSettings.tieDistance;

      // Convert rectangle to rotated coordinates
      const cos_angle = Math.cos(angle);
      const sin_angle = Math.sin(angle);

      // Calculate rotated bounds
      const points = [
        { x: x, y: y },
        { x: x + w, y: y },
        { x: x + w, y: y + h },
        { x: x, y: y + h },
      ];

      // Rotate points
      const rotated = points.map((p) => ({
        x: (p.x - x) * cos_angle - (p.y - y) * sin_angle,
        y: (p.x - x) * sin_angle + (p.y - y) * cos_angle,
      }));

      // Find bounds of rotated rectangle
      const minX = Math.min(...rotated.map((p) => p.x));
      const maxX = Math.max(...rotated.map((p) => p.x));
      const minY = Math.min(...rotated.map((p) => p.y));
      const maxY = Math.max(...rotated.map((p) => p.y));

      // Calculate number of rows needed
      const numRows = Math.ceil((maxY - minY) / stitchWidth);

      // Generate rows of stitches
      let forward = true;
      for (let i = 0; i <= numRows; i++) {
        const rowY = minY + i * stitchWidth;

        // Calculate row endpoints
        const rowX1 = forward ? minX : maxX;
        const rowX2 = forward ? maxX : minX;

        stitches.push(...straightLineStitching(rowX1, rowY, rowX2, rowY, stitchSettings));

        forward = !forward; // Alternate direction for next row
      }

      return stitches;
    }

    // Expose public functions
    global.p5embroidery = p5embroidery;
    global.beginRecord = p5embroidery.beginRecord;
    global.endRecord = p5embroidery.endRecord;
    global.exportEmbroidery = p5embroidery.exportEmbroidery;
    global.exportDST = p5embroidery.exportDST;
    global.exportGcode = p5embroidery.exportGcode;
    global.trimThread = p5embroidery.trimThread; // Renamed from cutThread
    global.setStitch = p5embroidery.setStitch;
    global.setDrawMode = p5embroidery.setDrawMode;
    global.drawStitches = p5embroidery.drawStitches;
    global.mmToPixel = mmToPixel;
    global.pixelToMm = pixelToMm;
    global.setStrokeMode = p5embroidery.setStrokeMode;
    global.STROKE_MODE = STROKE_MODE;
    global.FILL_MODE = FILL_MODE;
    global.setFillMode = p5embroidery.setFillMode;
    global.setFillSettings = p5embroidery.setFillSettings;
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
  function mmToPixel(mm, dpi = 96) {
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

}));
