(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
})((function () { 'use strict';

  // Tajima DST Writer
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
      console.log('=== DSTWriter generateDST ===');
      console.log('Initial state:', {
        currentX: this.currentX,
        currentY: this.currentY
      });

      // Reset data and counters
      this.data = [];
      this.currentX = 0;
      this.currentY = 0;
      this.stitchCount = 0;

      // Calculate border size before transformation
      let border = this.calculateBorderSize(points);
      console.log('Original border size:', border);

      // Transform points to center-origin coordinates
      const centerX = border.width / 2;
      const centerY = border.height / 2;
      
      const transformedPoints = points.map(point => ({
        ...point,
        x: point.x - (border.left + centerX),
        y: point.y - (border.top + centerY)
      }));

      console.log('Coordinate transformation:', {
        centerX,
        centerY,
        originalFirstPoint: points[0],
        transformedFirstPoint: transformedPoints[0]
      });

      // Recalculate border size after transformation
      border = this.calculateBorderSize(transformedPoints);
      console.log('Transformed border size:', border);

      // Generate stitches using transformed points
      for (let i = 0; i < transformedPoints.length; i++) {
        console.log('Processing point:', i, transformedPoints[i]);
        this.move(
          transformedPoints[i].x, 
          transformedPoints[i].y, 
          i === 0 ? DSTWriter.JUMP : DSTWriter.STITCH
        );
        console.log('After move:', {
          currentX: this.currentX,
          currentY: this.currentY
        });
      }

      // Add end of pattern
      this.move(0, 0, DSTWriter.END);

      console.log('Final state:', {
        currentX: this.currentX,
        currentY: this.currentY,
        stitchCount: this.stitchCount
      });

      // Prepare header
      let header = new Array(512).fill(0x20); // Fill with spaces
      let headerString =
        `LA:${title.padEnd(16)}\r` +
        `ST:${this.stitchCount.toString().padStart(7)}\r` +
        `CO:${(1).toString().padStart(3)}\r` +
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
      header[headerString.length] = 0x1A; // EOF character

      // Combine header and data
      return new Uint8Array([...header, ...this.data]);
    }

    saveBytes(data, filename) {
      let blob = new Blob([data], { type: 'application/octet-stream' });
      let link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      
      // Prevent page refresh by handling the click event
      link.onclick = function(e) {
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

    saveDST(points, title, filename) {
      let dstData = this.generateDST(points, title);
      this.saveBytes(dstData, filename);
      console.log('DST file saved!');
    }
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

    saveGcode(points, title, filename) {
      const gcode = this.generateGCode(points, title);
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

  (function (global) {
    const p5embroidery = {};

    // Internal properties
    let _p5Instance;
    let _recording = false;
    let _drawMode = 'stitch'; // 'stitch', 'p5', 'realistic'
    let _stitchData = {
      width: 0,
      height: 0,
      threads: [],
      pixelsPerUnit: 1,
      stitchCount: 0
    };
    let _currentThreadIndex = 0;


    // Embroidery settings
    const _embrSettings = {
      stitchLength: 3, // mm
      minStitchLength: 1, // mm
      resampleNoise: 0, // 0-1 range
      minimumPathLength: 0,
      maximumJoinDistance: 0,
      maximumStitchesPerSquareMm: 0,
      units: 'mm'
    };

    /**
     * Thread class for storing color and stitch data.
     * @private
     */
    class Thread {
      /**
       * Creates a new Thread instance.
       * @param {number} r - Red component (0-255)
       * @param {number} g - Green component (0-255)
       * @param {number} b - Blue component (0-255)
       */
      constructor(r, g, b) {
        this.red = r;
        this.green = g;
        this.blue = b;
        this.runs = [];
      }
    }

    /**
     * Begins recording embroidery data.
     * @param {object} p5Instance - The p5.js sketch instance
     */
    p5embroidery.beginRecord = function (p5Instance) {
      if (!p5Instance) {
        throw new Error("Invalid p5 instance provided to beginRecord().");
      }
      _p5Instance = p5Instance;
      _stitchData.width = p5Instance.width;
      _stitchData.height = p5Instance.height;
      _stitchData.threads = [new Thread(0, 0, 0)]; // Start with a default black thread
      _recording = true;
      overrideP5Functions();
    };

    /**
     * Ends recording and prepares for export.
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
          _stitchData.threads[_currentThreadIndex].runs.push(stitches);

          let prevX = mmToPixel(x1);
          let prevY = mmToPixel(y1);

          if (_drawMode === 'stitch') {
            // Draw stitch lines
            _p5Instance.push();

            for (let stitch of stitches) {
              let currentX = mmToPixel(stitch.x / 10);
              let currentY = mmToPixel(stitch.y / 10);
              _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

              // Draw small dots at stitch points
              _p5Instance.stroke(255, 0, 0); // Red for stitch points
              _p5Instance.strokeWeight(3);
              _p5Instance.point(currentX, currentY);

              prevX = currentX;
              prevY = currentY;
            }
            _p5Instance.pop();
          }else if (_drawMode === 'realistic') {
            _p5Instance.push();
            _p5Instance.strokeCap(ROUND);

            // Draw background dots for thread ends
            _p5Instance.noStroke();
            _p5Instance.fill(255); // White background dots

            for (let stitch of stitches) {
              let currentX = mmToPixel(stitch.x / 10);
              let currentY = mmToPixel(stitch.y / 10);
              _originalEllipseFunc.call(_p5Instance, currentX, currentY, 3); // Small white dots at stitch points

              // Draw three layers of lines with different weights and colors
              // Dark bottom layer
              _p5Instance.stroke(0); // Black
              _p5Instance.strokeWeight(2.5);

              _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

              // Middle layer
              _p5Instance.stroke(80); // Dark gray
              _p5Instance.strokeWeight(1.8);
              _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

              // Top highlight layer
              _p5Instance.stroke(160); // Light gray
              _p5Instance.strokeWeight(1);
              _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);
              prevX = currentX;
              prevY = currentY;
            }

            _p5Instance.pop();
          } else if (_drawMode === 'p5') {
            _originalLineFunc.call(this,
              mmToPixel(x1),
              mmToPixel(y1),
              mmToPixel(x2),
              mmToPixel(y2)
            );
          }
        } else {
          _originalLineFunc.apply(this, arguments);
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
          // Handle different ellipse modes
          if (_p5Instance._renderer._ellipseMode === 'corner') {
            x += w / 2;
            y += h / 2;
          } else if (_p5Instance._renderer._ellipseMode === 'radius') {
            w *= 2;
            h *= 2;
          } else if (_p5Instance._renderer._ellipseMode === 'corners') {
            let px = Math.min(x, w);
            let qx = Math.max(x, w);
            let py = Math.min(y, h);
            let qy = Math.max(y, h);
            x = px;
            y = py;
            w = qx - px;
            h = qy - py;
            x += w / 2;
            y += h / 2;
          }

          // Calculate circumference to determine number of points
          const circumference = Math.PI * Math.sqrt((w * w + h * h) / 2);
          const numPoints = Math.max(8, Math.ceil(circumference / _embrSettings.stitchLength));

          let points = [];
          for (let i = 0; i <= numPoints; i++) {
            let angle = (i * Math.PI * 2) / numPoints;
            let px = x + Math.cos(angle) * (w / 2);
            let py = y + Math.sin(angle) * (h / 2);
            points.push({ x: px, y: py });
          }

          // Add points to stitch data
          _stitchData.threads[_currentThreadIndex].runs.push(points);

          // Draw stitches visually
          if (_drawMode === 'stitch') {
            let prevX = mmToPixel(points[0].x);
            let prevY = mmToPixel(points[0].y);

            // Save current style
            _p5Instance.push();
            _p5Instance.noFill();

            for (let i = 1; i < points.length; i++) {
              let currentX = mmToPixel(points[i].x);
              let currentY = mmToPixel(points[i].y);

              // Draw actual stitch line
              _p5Instance.stroke(0); // Black for stitch line
              _p5Instance.strokeWeight(1);
              _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

              // Draw small dots at stitch points
              _p5Instance.stroke(255, 0, 0); // Red for stitch points
              _p5Instance.strokeWeight(3);
              _p5Instance.point(currentX, currentY);

              prevX = currentX;
              prevY = currentY;
            }

            // Restore original style
            _p5Instance.pop();
          } else if (_drawMode === "realistic") {
            let prevX = mmToPixel(points[0].x);
            let prevY = mmToPixel(points[0].y);
            _p5Instance.push();
            _p5Instance.strokeCap(ROUND);

            // Draw background dots for thread ends
            _p5Instance.noStroke();
            _p5Instance.fill(255); // White background dots
            for (let stitch of points) {
              let currentX = mmToPixel(stitch.x);
              let currentY = mmToPixel(stitch.y);
              _originalEllipseFunc.call(_p5Instance, currentX, currentY, 3); // Small white dots at stitch points

              // Draw three layers of lines with different weights and colors
              // Dark bottom layer
              _p5Instance.stroke(0); // Black
              _p5Instance.strokeWeight(2.5);

              _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

              // Middle layer
              _p5Instance.stroke(80); // Dark gray
              _p5Instance.strokeWeight(1.8);
              _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

              // Top highlight layer
              _p5Instance.stroke(160); // Light gray
              _p5Instance.strokeWeight(1);
              _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);
              prevX = currentX;
              prevY = currentY;
            }

            _p5Instance.pop();

          }
          else if (_drawMode === "p5") {
            _originalEllipseFunc.call(this,
              mmToPixel(x),
              mmToPixel(y),
              mmToPixel(w),
              mmToPixel(h)
            );
          }
        } else {
          _originalEllipseFunc.apply(this, arguments);
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
      // Add more overrides as needed
    }

    /**
     * Restores original p5.js functions.
     * @private
     */
    function restoreP5Functions() {
      window.line = _originalLineFunc;
      window.ellipse = _originalEllipseFunc;
      // Restore other functions as needed
    }

    /**
     * Sets the stitch parameters for embroidery.
     * @param {number} minLength - Minimum stitch length in millimeters
     * @param {number} desiredLength - Desired stitch length in millimeters
     * @param {number} noise - Amount of random variation in stitch length (0-1)
     */
    p5embroidery.setStitch = function (minLength, desiredLength, noise) {
      _embrSettings.minStitchLength = Math.max(0, minLength);
      _embrSettings.stitchLength = Math.max(0.1, desiredLength);
      _embrSettings.resampleNoise = Math.min(1, Math.max(0, noise));
    };

    /**
     * Sets the draw mode for embroidery.
     * @param {string} mode - The draw mode to set ('stitch', 'p5', 'realistic')
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
      console.log('Converting line to stitches (before offset):', {
        from: { x: x1, y: y1 },
        to: { x: x2, y: y2 }
      });

      console.log('Converting line to stitches', {
        from: { x: x1, y: y1 },
        to: { x: x2, y: y2 }
      });

      let stitches = [];
      let dx = x2 - x1;
      let dy = y2 - y1;
      let distance = Math.sqrt(dx * dx + dy * dy);

      console.log('Line properties:', {
        dx, dy,
        distance,
        minStitchLength: _embrSettings.minStitchLength,
        stitchLength: _embrSettings.stitchLength
      });

      // Add first stitch at starting point
      stitches.push({
        x: x1 * 10,
        y: y1 * 10
      });

      // If distance is less than minimum stitch length, we're done
      if (distance < _embrSettings.minStitchLength) {
        return stitches;
      }

      let baseStitchLength = _embrSettings.stitchLength;
      let numStitches = Math.floor(distance / baseStitchLength);
      let currentDistance = 0;

      // Handle full-length stitches
      for (let i = 0; i < numStitches; i++) {
        // Add noise to stitch length if specified
        let stitchLength = baseStitchLength;
        if (_embrSettings.resampleNoise > 0) {
          let noise = (Math.random() * 2 - 1) * _embrSettings.resampleNoise;
          stitchLength *= (1 + noise);
        }

        // update cumulative distance
        currentDistance += stitchLength;
        let t = Math.min(currentDistance / distance, 1);

        stitches.push({
          x: (x1 + dx * t) * 10,
          y: (y1 + dy * t) * 10
        });
      }

      // Add final stitch at end point if needed
      let remainingDistance = distance - currentDistance;
      if (remainingDistance > _embrSettings.minStitchLength || numStitches === 0) {
        stitches.push({
          x: x2 * 10,
          y: y2 * 10
        });
      }

      console.log('Generated stitches:', stitches);
      return stitches;
    }

    p5embroidery.exportEmbroidery = function (filename) {
      const extension = filename.split('.').pop().toLowerCase();

      switch (extension) {
        case 'dst':
          p5embroidery.exportDST(filename);
          break;
        default:
          console.error(`Unsupported embroidery format: ${extension}`);
          break;
      }
    };

    p5embroidery.exportGcode = function (filename) {
      const points = [];
      for (const thread of _stitchData.threads) {
        for (const run of thread.runs) {
          for (const stitch of run) {
            points.push({
              x: stitch.x,
              y: stitch.y
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
     * @param {string} [filename='embroideryPattern.dst'] - Output filename
     */
    p5embroidery.exportDST = function (filename = 'embroideryPattern.dst') {
      const points = [];
      const dstWriter = new DSTWriter();

      console.log('=== Starting DST Export ===');
      console.log('Canvas size:', _stitchData.width, _stitchData.height);

      for (const thread of _stitchData.threads) {
        for (const run of thread.runs) {
          // Check if this is a thread trim command
          if (run.length === 1 && run[0].command === 'trim') {
            console.log('Trim command at:', run[0].x, run[0].y);
            points.push({
              x: 0,
              y: 0,
              jump: true,
              trim: true
            });
            continue;
          }

          // Normal stitches
          console.log('=== New Stitch Run ===');
          for (const stitch of run) {
            console.log('Stitch point:', {
              original: { x: stitch.x / 10, y: stitch.y / 10 },
              dst: { x: stitch.x, y: stitch.y }
            });
            points.push({
              x: stitch.x,
              y: stitch.y
            });
          }
        }
      }

      console.log('=== Final Points Array ===');
      console.log('First point:', points[0]);
      console.log('Last point:', points[points.length - 1]);

      dstWriter.saveDST(points, "EmbroideryPattern", filename);
    };

    /**
     * Inserts a thread trim command at the current position.
     */
    p5embroidery.trimThread = function () {
      if (_recording) {
        // Add a special point to indicate thread trim
        _stitchData.threads[_currentThreadIndex].runs.push([{
          x: 0,
          y: 0,
          command: 'trim'  // Renamed from 'cut' to 'trim'
        }]);
      }
    };

    // Expose public functions
    global.p5embroidery = p5embroidery;
    global.beginRecord = p5embroidery.beginRecord;
    global.endRecord = p5embroidery.endRecord;
    global.exportEmbroidery = p5embroidery.exportEmbroidery;
    global.exportDST = p5embroidery.exportDST;
    global.exportGcode = p5embroidery.exportGcode;
    global.trimThread = p5embroidery.trimThread;  // Renamed from cutThread
    global.setStitch = p5embroidery.setStitch;
    global.setDrawMode = p5embroidery.setDrawMode;

  }) (typeof globalThis !== 'undefined' ? globalThis : window);


  /**
   * Converts millimeters to pixels.
   * @param {number} mm - Millimeters
   * @param {number} [dpi=96] - Dots per inch
   * @returns {number} Pixels
   */
  function mmToPixel(mm, dpi = 96) {

    return ((mm / 25.4) * dpi);
  }

}));
