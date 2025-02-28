import { DSTWriter } from "./p5-tajima-dst-writer.js";
import { GCodeWriter } from "./p5-gcode-writer.js";

(function (global) {
  const p5embroidery = {};

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
  let _currentThreadIndex = 0;

  // Embroidery settings
  const _embrSettings = {
    stitchLength: 3, // mm
    minStitchLength: 1, // mm
    resampleNoise: 0, // 0-1 range
    minimumPathLength: 0,
    maximumJoinDistance: 0,
    maximumStitchesPerSquareMm: 0,
    jumpThreshold: 10, // mm
    units: "mm",
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

        if (
          _drawMode === "stitch" ||
          _drawMode === "realistic" ||
          _drawMode === "p5"
        ) {
          drawStitches(stitches);
        } else {
          _originalLineFunc.call(
            this,
            mmToPixel(x1),
            mmToPixel(y1),
            mmToPixel(x2),
            mmToPixel(y2),
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

        // Calculate radius values
        let radiusX = w / 2;
        let radiusY = h / 2;

        // Generate stitch points for the ellipse
        let stitches = [];
        let numSteps = Math.max(Math.ceil(Math.PI * (radiusX + radiusY) / _embrSettings.stitchLength), 12);
        
        // Generate points along the ellipse
        for (let i = 0; i <= numSteps; i++) {
          let angle = (i / numSteps) * Math.PI * 2;
          let stitchX = x + Math.cos(angle) * radiusX;
          let stitchY = y + Math.sin(angle) * radiusY;
          
          // Store in tenths of mm (internal format)
          stitches.push({
            x: stitchX * 10,
            y: stitchY * 10
          });
        }

        // Record the stitches if we're recording
        if (_recording) {
          // Get the current position (in tenths of mm)
          let currentX, currentY;
          if (_stitchData.threads[_currentThreadIndex].runs.length === 0 ||
              _stitchData.threads[_currentThreadIndex].runs[_stitchData.threads[_currentThreadIndex].runs.length - 1].length === 0) {
            // If there are no runs or the last run is empty, use the center of the ellipse as the starting point
            currentX = x * 10; // Convert to tenths of mm
            currentY = y * 10; // Convert to tenths of mm
          } else {
            // Otherwise, use the last stitch position (already in tenths of mm)
            let lastRun = _stitchData.threads[_currentThreadIndex].runs[_stitchData.threads[_currentThreadIndex].runs.length - 1];
            let lastStitch = lastRun[lastRun.length - 1];
            currentX = lastStitch.x;
            currentY = lastStitch.y;
          }

          // Add a jump stitch to the first point of the ellipse if needed
          if (Math.sqrt(Math.pow(stitches[0].x - currentX, 2) + Math.pow(stitches[0].y - currentY, 2)) > _embrSettings.jumpThreshold) {
            _stitchData.threads[_currentThreadIndex].runs.push([
              {
                x: currentX,
                y: currentY,
                command: "jump"
              },
              {
                x: stitches[0].x,
                y: stitches[0].y
              }
            ]);
          }

          // Add the ellipse stitches
          _stitchData.threads[_currentThreadIndex].runs.push(stitches);
        }


        // Call drawStitches with the correct format
        drawStitches(stitches); // Convert back to mm for drawStitches

        // Call the original ellipse function if in p5 mode
        if (_drawMode === "p5") {
          _originalEllipseFunc.call(this, mmToPixel(x), mmToPixel(y), mmToPixel(w), mmToPixel(h));
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
    console.log("Converting line to stitches (before offset):", {
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
    });

    console.log("Converting line to stitches", {
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
    });

    let stitches = [];
    let dx = x2 - x1;
    let dy = y2 - y1;
    let distance = Math.sqrt(dx * dx + dy * dy);

    console.log("Line properties:", {
      dx,
      dy,
      distance,
      minStitchLength: _embrSettings.minStitchLength,
      stitchLength: _embrSettings.stitchLength,
    });

    // Add first stitch at starting point
    stitches.push({
      x: x1 * 10,
      y: y1 * 10,
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
        stitchLength *= 1 + noise;
      }

      // update cumulative distance
      currentDistance += stitchLength;
      let t = Math.min(currentDistance / distance, 1);

      stitches.push({
        x: (x1 + dx * t) * 10,
        y: (y1 + dy * t) * 10,
      });
    }

    // Add final stitch at end point if needed
    let remainingDistance = distance - currentDistance;
    if (
      remainingDistance > _embrSettings.minStitchLength ||
      numStitches === 0
    ) {
      stitches.push({
        x: x2 * 10,
        y: y2 * 10,
      });
    }

    console.log("Generated stitches:", stitches);
    return stitches;
  }

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
   * @param {string} [filename='embroideryPattern.dst'] - Output filename
   */
  p5embroidery.exportDST = function (filename = "embroideryPattern.dst") {
    const points = [];
    const dstWriter = new DSTWriter();

    console.log("=== Starting DST Export ===");
    console.log("Canvas size:", _stitchData.width, _stitchData.height);

    for (const thread of _stitchData.threads) {
      for (const run of thread.runs) {
        // Check if this is a thread trim command
        if (run.length === 1 && run[0].command === "trim") {
          console.log("Trim command at:", run[0].x, run[0].y);
          points.push({
            x: 0,
            y: 0,
            jump: true,
            trim: true,
          });
          continue;
        }

        // Normal stitches
        console.log("=== New Stitch Run ===");
        for (const stitch of run) {
          console.log("Stitch point:", {
            original: { x: stitch.x / 10, y: stitch.y / 10 },
            dst: { x: stitch.x, y: stitch.y },
          });
          points.push({
            x: stitch.x,
            y: stitch.y,
          });
        }
      }
    }

    console.log("=== Final Points Array ===");
    console.log("First point:", points[0]);
    console.log("Last point:", points[points.length - 1]);

    dstWriter.saveDST(points, "EmbroideryPattern", filename);
  };

  /**
   * Inserts a thread trim command at the current position.
   */
  p5embroidery.trimThread = function () {
    if (_recording) {
      // Get the current thread
      const currentThread = _stitchData.threads[_currentThreadIndex];
      
      // Get the last run in the current thread
      const lastRun = currentThread.runs[currentThread.runs.length - 1];
      
      // Get the last stitch position from the last run
      // Currently gets the FIRST stitch [0] of the last run, should be the LAST stitch
      let currentX = lastRun[0].x;
      let currentY = lastRun[0].y;
      
      // This should be changed to get the LAST stitch of the last run:
      let lastStitchIndex = lastRun.length - 1;
      currentX = lastRun[lastStitchIndex].x;
      currentY = lastRun[lastStitchIndex].y;
      
      // Add a special point to indicate thread trim
      _stitchData.threads[_currentThreadIndex].runs.push([
        {
          x: currentX,
          y: currentY,
          command: "trim", 
        },
      ]);

      if (_drawMode === "stitch") {
        // draw a scissors emoji at the trim point
        _p5Instance.push();
        _p5Instance.fill(0);
        // Draw 45 degree line
        let lineLength = 10; // Length of diagonal line in pixels
        let endX = mmToPixel(currentX/10) + lineLength;
        let endY = mmToPixel(currentY/10) - lineLength;
        _p5Instance.stroke(255,0,0); // red for line
        _p5Instance.strokeWeight(0.5);

        _originalLineFunc.call(_p5Instance, mmToPixel(currentX/10), mmToPixel(currentY/10), endX, endY);
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
  function drawStitches(stitches) {
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
          _p5Instance.stroke(255, 0, 0); // Red for stitch points
          _p5Instance.strokeWeight(3);
          _p5Instance.point(prevX, prevY);
        }

        _p5Instance.stroke(0); // Black for stitch lines
        _p5Instance.strokeWeight(1);
        _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

        // Draw small dots at stitch points
        _p5Instance.stroke(255, 0, 0); // Red for stitch points
        _p5Instance.strokeWeight(3);
        _p5Instance.point(currentX, currentY);

        prevX = currentX;
        prevY = currentY;
      }
      _p5Instance.pop();
    } else if (_drawMode === "realistic") {
      _p5Instance.push();
      _p5Instance.strokeCap(ROUND);

      // Draw background dots for thread ends
      _p5Instance.noStroke();
      _p5Instance.fill(255); // White background dots

      for (let i = 1; i < stitches.length; i++) {
        let currentX = mmToPixel(stitches[i].x / 10);
        let currentY = mmToPixel(stitches[i].y / 10);
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
    } else if (_drawMode === "p5") {
      // For p5 mode, we need to draw a line from the starting point to each stitch
      if (stitches.length > 0) {
        // prevX and prevY are already in mm, but we need to convert them to pixels
        // For each stitch, draw a line from the previous point
        for (let i = 1; i < stitches.length; i++) {
          // Convert stitch coordinates from tenths of mm to pixels
          const currentX = mmToPixel(stitches[i].x / 10);
          const currentY = mmToPixel(stitches[i].y / 10);
          
          _originalLineFunc.call(
            _p5Instance,
            prevX,
            prevY,
            currentX,
            currentY
          );
          
          // Update the previous point
          prevX = currentX;
          prevY = currentY;
        }
      }
    }

    // Return the last stitch position for chaining
    return stitches.length > 0
      ? {
          x: stitches[stitches.length - 1].x / 10,
          y: stitches[stitches.length - 1].y / 10,
        }
      : { x: startX, y: startY };
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
})(typeof globalThis !== "undefined" ? globalThis : window);

/**
 * Converts millimeters to pixels.
 * @param {number} mm - Millimeters
 * @param {number} [dpi=96] - Dots per inch
 * @returns {number} Pixels
 */
function mmToPixel(mm, dpi = 96) {
  return (mm / 25.4) * dpi;
}

/**
 * Converts pixels to millimeters.
 * @param {number} pixels - Pixels
 * @param {number} [dpi=96] - Dots per inch
 * @returns {number} Millimeters
 */
function pixelToMm(pixels, dpi = 96) {
  return (pixels * 25.4) / dpi;
}
