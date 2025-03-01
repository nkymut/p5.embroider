import { DSTWriter } from "./p5-tajima-dst-writer.js";
import { GCodeWriter } from "./p5-gcode-writer.js";

let _DEBUG = false;

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
    stitchWidth: 0,
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
    _stitchData.threads = [new Thread(0, 0, 0)]; // Start with a default black thread
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
        _stitchData.threads[_currentThreadIndex].runs.push(stitches);

        if (_drawMode === "stitch" || _drawMode === "realistic") {
          drawStitches(stitches);
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
          const thread = _stitchData.threads[i];
          if (thread.red === r && thread.green === g && thread.blue === b) {
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
        if (_currentThreadIndex !== threadIndex && _stitchData.threads[_currentThreadIndex] !== undefined) {
          trimThread();
        }

        // Set the current thread index
        _currentThreadIndex = threadIndex;
        _originalStrokeFunc.apply(this, arguments);
      } else {
        _originalStrokeFunc.apply(this, arguments);
      }
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
            _stitchData.threads[_currentThreadIndex].runs.length === 0 ||
            _stitchData.threads[_currentThreadIndex].runs[_stitchData.threads[_currentThreadIndex].runs.length - 1]
              .length === 0
          ) {
            // If there are no runs or the last run is empty, use the first point on the ellipse
            // (at 0 degrees) as the starting point, not the center
            currentX = (x + radiusX) * 10; // Point at 0 degrees (right side of ellipse)
            currentY = y * 10; // Convert to tenths of mm
          } else {
            // Otherwise, use the last stitch position (already in tenths of mm)
            let lastRun =
              _stitchData.threads[_currentThreadIndex].runs[_stitchData.threads[_currentThreadIndex].runs.length - 1];
            let lastStitch = lastRun[lastRun.length - 1];
            currentX = lastStitch.x;
            currentY = lastStitch.y;
          }

          // Add a jump stitch to the first point of the ellipse if needed
          if (
            Math.sqrt(Math.pow(stitches[0].x - currentX, 2) + Math.pow(stitches[0].y - currentY, 2)) >
            _embrSettings.jumpThreshold
          ) {
            _stitchData.threads[_currentThreadIndex].runs.push([
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
          _stitchData.threads[_currentThreadIndex].runs.push(stitches);
        }

        // Call the original ellipse function if in p5 mode
        if (_drawMode === "p5") {
          _originalEllipseFunc.call(this, mmToPixel(x), mmToPixel(y), mmToPixel(w), mmToPixel(h));
        } else {
          drawStitches(stitches);
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
        _stitchData.threads[_currentThreadIndex].runs.push(stitches);

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
   * Overrides necessary p5.js functions for embroidery recording.
   * @private
   */
  function overrideP5Functions() {
    overrideLineFunction();
    overrideEllipseFunction();
    overrideStrokeWeightFunction();
    overridePointFunction();
    overrideStrokeFunction();
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
        minStitchLength: _embrSettings.minStitchLength,
        stitchLength: _embrSettings.stitchLength,
        stitchWidth: _embrSettings.stitchWidth,
      });

    if (_embrSettings.stitchWidth > 0) {
      return lineZigzagStitching(x1, y1, x2, y2, distance);
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

    if (_DEBUG) console.log("Generated zigzag stitches:", stitches);
    return stitches;
  }

  /**
   * Creates straight line stitches (直線縫い - Chokusen Nui)
   * @private
   * @param {number} x1 - Starting x-coordinate
   * @param {number} y1 - Starting y-coordinate
   * @param {number} x2 - Ending x-coordinate
   * @param {number} y2 - Ending y-coordinate
   * @param {number} distance - Distance between points
   * @returns {Array<{x: number, y: number}>} Array of stitch points in 0.1mm units
   */
  function straightLineStitching(x1, y1, x2, y2, distance) {
    let stitches = [];
    let dx = x2 - x1;
    let dy = y2 - y1;

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
    if (remainingDistance > _embrSettings.minStitchLength || numStitches === 0) {
      stitches.push({
        x: x2 * 10,
        y: y2 * 10,
      });
    }

    if (_DEBUG) console.log("Generated straight line stitches:", stitches);
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

    if (_DEBUG) console.log("Generated zigzag from existing stitches:", zigzagResult);
    return zigzagResult;
  }

  /**
   * Creates a more advanced zigzag pattern with control over density
   * @method createZigzagFromPath
   * @for p5
   * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
   * @param {Number} width - Width of the zigzag in mm
   * @param {Number} [density=_embrSettings.stitchLength] - Distance between zigzag points in mm
   * @returns {Array<{x: number, y: number}>} Array of zigzag stitch points in 0.1mm units
   */
  function createZigzagFromPath(pathPoints, width, density = _embrSettings.stitchLength) {
    if (!pathPoints || pathPoints.length < 2) {
      console.warn("Cannot create zigzag from insufficient path points");
      return [];
    }

    const zigzagResult = [];
    const halfWidth = width / 2;
    let side = 1; // Start with one side

    // Process each segment between consecutive points
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];

      // Calculate segment direction vector
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Skip if points are too close
      if (distance < 0.1) continue;

      // Calculate perpendicular vector
      const perpX = -dy / distance;
      const perpY = dx / distance;

      // Calculate number of zigzag points for this segment
      const numPoints = Math.max(2, Math.ceil(distance / density));

      // Add zigzag points along the segment
      for (let j = 0; j <= numPoints; j++) {
        const t = j / numPoints;

        // Alternate sides for zigzag effect
        if (j > 0) side = -side;

        const pointX = p1.x + dx * t + perpX * halfWidth * side;
        const pointY = p1.y + dy * t + perpY * halfWidth * side;

        zigzagResult.push({
          x: pointX * 10,
          y: pointY * 10,
        });
      }
    }

    if (_DEBUG) console.log("Generated zigzag from path:", zigzagResult);
    return zigzagResult;
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

    if (_DEBUG) console.log("=== Starting DST Export ===");
    if (_DEBUG) console.log("Canvas size:", _stitchData.width, _stitchData.height);

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
          if (_DEBUG) console.log("Trim command at:", run[0].x, run[0].y);

          points.push({
            x: run[0].x,
            y: run[0].y,
            jump: true,
            trim: true,
          });
          continue;
        }

        // Normal stitches
        if (_DEBUG) console.log("=== New Stitch Run ===");
        for (const stitch of run) {
          if (_DEBUG)
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

    // Skip export if no points
    if (points.length === 0) {
      console.warn("No embroidery points to export");
      return;
    }

    if (_DEBUG) console.log("=== Final Points Array ===");
    if (_DEBUG) console.log("First point:", points[0]);
    if (_DEBUG) console.log("Last point:", points[points.length - 1]);

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
  p5embroidery.trimThread = function () {
    if (_recording) {
      // Get the current thread
      const currentThread = _stitchData.threads[_currentThreadIndex];

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
          _originalStrokeFunc.call(_p5Instance, 255, 0, 0); // Red for stitch points
          _originalStrokeWeightFunc.call(_p5Instance, 3);
          _originalPointFunc.call(_p5Instance, prevX, prevY);
        }

        // Use the current thread color if defined, otherwise black
        _originalStrokeFunc.call(
          _p5Instance,
          _stitchData.threads[_currentThreadIndex].red,
          _stitchData.threads[_currentThreadIndex].green,
          _stitchData.threads[_currentThreadIndex].blue,
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
      _p5Instance.noStroke();
      _p5Instance.fill(255); // White background dots

      for (let i = 1; i < stitches.length; i++) {
        let currentX = mmToPixel(stitches[i].x / 10);
        let currentY = mmToPixel(stitches[i].y / 10);
        _originalEllipseFunc.call(_p5Instance, currentX, currentY, 3); // Small white dots at stitch points

        // Draw three layers of lines with different weights and colors
        // Dark bottom layer - darkened thread color
        _originalStrokeFunc.call(
          _p5Instance,
          _stitchData.threads[_currentThreadIndex].red * 0.4,
          _stitchData.threads[_currentThreadIndex].green * 0.4,
          _stitchData.threads[_currentThreadIndex].blue * 0.4,
        );
        _originalStrokeWeightFunc.call(_p5Instance, 2.5);
        _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

        // Middle layer - thread color
        _originalStrokeFunc.call(
          _p5Instance,
          _stitchData.threads[_currentThreadIndex].red,
          _stitchData.threads[_currentThreadIndex].green,
          _stitchData.threads[_currentThreadIndex].blue,
        );
        _originalStrokeWeightFunc.call(_p5Instance, 1.8);
        _originalLineFunc.call(_p5Instance, prevX, prevY, currentX, currentY);

        // Top highlight layer - lightened thread color
        _originalStrokeFunc.call(
          _p5Instance,
          _stitchData.threads[_currentThreadIndex].red * 1.8,
          _stitchData.threads[_currentThreadIndex].green * 1.8,
          _stitchData.threads[_currentThreadIndex].blue * 1.8,
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
