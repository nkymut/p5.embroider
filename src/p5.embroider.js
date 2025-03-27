import { DSTWriter } from "./io/p5-tajima-dst-writer.js";
import { GCodeWriter } from "./io/p5-gcode-writer.js";

let _DEBUG = false;

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
  let _isBezier = false;
  let _isCurve = false;
  let _isQuadratic = false;
  let _isContour = false;
  let _isFirstContour = true;

  let _strokeThreadIndex = 0;
  let _fillThreadIndex = 0;

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
  let _currentStrokeMode = STROKE_MODE.STRAIGHT;

  let _doFill = false; // Track if fill is enabled
  let _currentFill = null; // Store current fill color and properties
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

  // Add a stroke settings object to match the other settings objects
  let _strokeSettings = {
    stitchLength: 3, // mm
    stitchWidth: 0.2,
    minStitchLength: 1, // mm
    resampleNoise: 0, // 0-1 range
    strokeWeight: 0, // Width of the embroidery line
    strokeMode: STROKE_MODE.STRAIGHT,
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
      _strokeSettings.strokeMode = mode;
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
        console.log("🌸 p5.embroider says: You can not have less than one instance");
        count = 1;
      }
      if (_recording) {
        console.log("endShape", _vertices, _vertices.length);
        if (_vertices.length === 0) {
          console.log("🌸 p5.embroider says: No vertices to draw");
          return this;
        }
        console.log("_doStroke", _doStroke);
        console.log("_doFill", _doFill);
        if (!_doStroke && !_doFill) {
          console.log("🌸 p5.embroider says: _doStroke and _doFill are both false");
          return this;
        }

        const closeShape = mode === window.CLOSE;

        if (closeShape && !_isContour) {
          _vertices.push(_vertices[0]);
        }

        //convert vertices to embroidery stitches
        const stitches = p5embroidery.convertVerticesToStitches(_vertices, _strokeSettings);

        // Debug log
        console.log("Converted vertices to stitches:", {
          vertices: _vertices.length,
          stitches: stitches.length,
          shapeKind: _shapeKind,
          mode: _drawMode,
        });

        //add stitches to the embroidery data
        _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

        if (_drawMode === "stitch" || _drawMode === "realistic") {
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

        _isCurve = false;
        _isBezier = false;
        _isQuadratic = false;
        _isContour = false;
        _isFirstContour = true;

        // If the shape is closed, the first element was added as last element.
        // We must remove it again to prevent the list of vertices from growing
        // over successive calls to endShape(CLOSE)
        if (closeShape) {
          _vertices.pop();
        }

        // After drawing both shapes
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
        // Create a vertex object with named properties instead of an array
        const vert = {
          x: x,
          y: y,
          u: u || 0,
          v: v || 0,
          isVert: true,
        };

        if (moveTo) {
          vert.moveTo = moveTo;
        }

        if (_drawMode === "p5") {
          _originalVertexFunc.call(_p5Instance, mmToPixel(x), mmToPixel(y), moveTo, u, v);
        }

        _vertices.push(vert);
        if (_DEBUG) console.log("_vertices", _vertices);
      } else {
        let args = [mmToPixel(x), mmToPixel(y), moveTo, u, v];
        _originalVertexFunc.apply(this, arguments);
      }
    };
  }

  p5embroidery.convertVerticesToStitches = function (vertices, strokeSettings) {
    let stitches = [];

    if (!vertices || vertices.length < 2) {
      return stitches;
    }

    // Extract x,y coordinates from vertex objects for compatibility with path functions
    const pathPoints = vertices.map((v) => ({
      x: v.x,
      y: v.y,
    }));

    // If we have a stroke weight, use the appropriate path-based function
    if (strokeSettings.strokeWeight > 0) {
      switch (strokeSettings.strokeMode) {
        case STROKE_MODE.STRAIGHT:
          return straightLineStitchingFromPath(pathPoints, strokeSettings);
        case STROKE_MODE.ZIGZAG:
          return lineZigzagStitchingFromPath(pathPoints, strokeSettings);
        case STROKE_MODE.LINES:
          return multiLineStitchingFromPath(pathPoints, strokeSettings);
        case STROKE_MODE.SASHIKO:
          return sashikoStitchingFromPath(pathPoints, strokeSettings);
        default:
          // For simple paths, use the convertPathToStitches function
          return convertPathToStitches(pathPoints, strokeSettings);
      }
    } else {
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
        let stitches = convertLineToStitches(x1, y1, x2, y2, _strokeSettings);
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
        _currentFill = null;
      }
      _p5Instance.noFill.apply(this, arguments);
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

        // Record the stitches if we're recording
        if (_recording) {
          // Get the current position (in mm)
          let currentX, currentY;
          if (
            _stitchData.threads[_strokeThreadIndex].runs.length === 0 ||
            _stitchData.threads[_strokeThreadIndex].runs[_stitchData.threads[_strokeThreadIndex].runs.length - 1]
              .length === 0
          ) {
            // If there are no runs or the last run is empty, use the first point on the ellipse
            // (at 0 degrees) as the starting point, not the center
            currentX = pathPoints[0].x;
            currentY = pathPoints[0].y;
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
            Math.sqrt(Math.pow(pathPoints[0].x - currentX, 2) + Math.pow(pathPoints[0].y - currentY, 2)) >
            _embroiderySettings.jumpThreshold
          ) {
            _stitchData.threads[_strokeThreadIndex].runs.push([
              {
                x: currentX,
                y: currentY,
                command: "jump",
              },
              {
                x: pathPoints[0].x,
                y: pathPoints[0].y,
              },
            ]);
          }

          // Convert path points to stitches based on current stroke mode
          let stitches;
          if (_strokeSettings.strokeWeight > 0) {
            switch (_strokeSettings.strokeMode) {
              case STROKE_MODE.ZIGZAG:
                stitches = lineZigzagStitchingFromPath(pathPoints, _strokeSettings);
                break;
              case STROKE_MODE.LINES:
                stitches = multiLineStitchingFromPath(pathPoints, _strokeSettings);
                break;
              case STROKE_MODE.SASHIKO:
                stitches = sashikoStitchingFromPath(pathPoints, _strokeSettings);
                break;
              default:
                stitches = straightLineStitchingFromPath(pathPoints, _strokeSettings);
            }
          } else {
            // If no stroke weight specified, use straight line stitching
            stitches = straightLineStitchingFromPath(pathPoints, _strokeSettings);
          }

          // Add the ellipse stitches
          _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

          // Draw the stitches
          if (_drawMode === "p5") {
            _originalEllipseFunc.call(this, mmToPixel(x), mmToPixel(y), mmToPixel(w), mmToPixel(h));
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
            x: x,
            y: y,
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
          const stitches = [];

          strokeStitches.push(...convertLineToStitches(x, y, x + w, y, _strokeSettings));
          strokeStitches.push(...convertLineToStitches(x + w, y, x + w, y + h, _strokeSettings));
          strokeStitches.push(...convertLineToStitches(x + w, y + h, x, y + h, _strokeSettings));
          strokeStitches.push(...convertLineToStitches(x, y + h, x, y, _strokeSettings));

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
    overrideVertexFunction();
    overrideBeginShapeFunction();
    overrideEndShapeFunction();
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
    window.vertex = _originalVertexFunc;
    window.beginShape = _originalBeginShapeFunc;
    window.endShape = _originalEndShapeFunc;
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
          return straightLineStitching(x1, y1, x2, y2, stitchSettings);
        case STROKE_MODE.ZIGZAG:
          return lineZigzagStitching(x1, y1, x2, y2, stitchSettings);
        case STROKE_MODE.LINES:
          return multiLineStitching(x1, y1, x2, y2, stitchSettings);
        case STROKE_MODE.SASHIKO:
          return sashikoStitching(x1, y1, x2, y2, stitchSettings);
        default:
          return straightLineStitching(x1, y1, x2, y2, stitchSettings);
      }
    } else {
      return straightLineStitching(x1, y1, x2, y2, stitchSettings);
    }
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
        case STROKE_MODE.ZIGZAG:
          return lineZigzagStitchingFromPath(pathPoints, stitchSettings);
        case STROKE_MODE.LINES:
          return multiLineStitchingFromPath(pathPoints, stitchSettings);
        case STROKE_MODE.SASHIKO:
          return sashikoStitchingFromPath(pathPoints, stitchSettings);
        default:
          // For simple straight stitches, we'll need to break this down segment by segment
          const result = [];
          for (let i = 0; i < pathPoints.length - 1; i++) {
            const p1 = pathPoints[i];
            const p2 = pathPoints[i + 1];
            const segmentStitches = straightLineStitching(p1.x, p1.y, p2.x, p2.y, stitchSettings);
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
        const segmentStitches = straightLineStitching(p1.x, p1.y, p2.x, p2.y, stitchSettings);
        result.push(...segmentStitches);
      }
      return result;
    }
  }

  /**
   * Creates zigzag stitches
   * @private
   * @param {number} x1 - Starting x-coordinate in mm
   * @param {number} y1 - Starting y-coordinate in mm
   * @param {number} x2 - Ending x-coordinate in mm
   * @param {number} y2 - Ending y-coordinate in mm
   * @param {Object} stitchSettings - Settings for the stitches
   * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
   */
  function lineZigzagStitching(x1, y1, x2, y2, stitchSettings) {
    // This is now a wrapper function that calls the path-based implementation
    const pathPoints = [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];

    // For a simple straight line, we can implement the zigzag directly
    // instead of calling the path-based version
    let stitches = [];
    let dx = x2 - x1;
    let dy = y2 - y1;
    let distance = Math.sqrt(dx * dx + dy * dy);

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
    let side = 1; // Start with one side

    // Add first point
    stitches.push({
      x: x1 + perpX * halfWidth * side,
      y: y1 + perpY * halfWidth * side,
    });

    // Add zigzag points
    for (let i = 1; i <= numZigzags; i++) {
      let t = i / numZigzags;
      side = -side; // Alternate sides

      let pointX = x1 + dx * t + perpX * halfWidth * side;
      let pointY = y1 + dy * t + perpY * halfWidth * side;

      stitches.push({
        x: pointX,
        y: pointY,
      });
    }

    // Make sure we end at the endpoint
    if (side !== -1) {
      // If we didn't end on the opposite side
      stitches.push({
        x: x2 + perpX * halfWidth * -1, // End on opposite side
        y: y2 + perpY * halfWidth * -1,
      });
    }

    if (_DEBUG) console.log("Generated zigzag stitches:", stitches);
    return stitches;
  }

  /**
   * Creates straight line stitches (直線縫い - Chokusen Nui)
   * @private
   * @param {number} x1 - Starting x-coordinate in mm
   * @param {number} y1 - Starting y-coordinate in mm
   * @param {number} x2 - Ending x-coordinate in mm
   * @param {number} y2 - Ending y-coordinate in mm
   * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
   */
  function straightLineStitching(x1, y1, x2, y2, stitchSettings = _embroiderySettings) {
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
   * Converts an array of stitches into a zigzag pattern
   * @method zigzagStitches
   * @for p5
   * @param {Array<{x: number, y: number}>} stitches - Array of stitch points in mm
   * @param {Number} width - Width of the zigzag in mm
   * @returns {Array<{x: number, y: number}>} Array of zigzag stitch points in mm
   */
  function zigzagStitches(stitches, width) {
    if (!stitches || stitches.length < 2) {
      console.warn("Cannot create zigzag from insufficient stitch points");
      return stitches;
    }

    const zigzagResult = [];
    const halfWidth = width / 2;
    let side = 1; // Start with one side

    // Process each segment between consecutive points
    for (let i = 0; i < stitches.length - 1; i++) {
      const p1 = stitches[i];
      const p2 = stitches[i + 1];

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
          x: p1.x + perpX * halfWidth * side,
          y: p1.y + perpY * halfWidth * side,
        });
      }

      // Add the second point with opposite offset
      side = -side;
      zigzagResult.push({
        x: p2.x + perpX * halfWidth * side,
        y: p2.y + perpY * halfWidth * side,
      });
    }

    // If we have an odd number of points, add the last point with opposite offset
    if (stitches.length % 2 === 0) {
      const lastPoint = stitches[stitches.length - 1];
      const secondLastPoint = stitches[stitches.length - 2];

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
        x: lastPoint.x + perpX * halfWidth * side,
        y: lastPoint.y + perpY * halfWidth * side,
      });
    }

    if (_DEBUG) console.log("Generated zigzag from existing stitches:", zigzagResult);
    return zigzagResult;
  }

  /**
   * Creates line zigzag stitches that takes an array of path points
   * @private
   * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
   * @param {Object} stitchSettings - Settings for the stitches
   * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
   */
  function lineZigzagStitchingFromPath(pathPoints, stitchSettings) {
    if (!pathPoints || pathPoints.length < 2) {
      console.warn("Cannot create zigzag stitching from insufficient path points");
      return [];
    }

    const result = [];
    const width = stitchSettings.strokeWeight > 0 ? stitchSettings.strokeWeight : 2;

    // Process each segment between consecutive points
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];

      // Get zigzag stitches for this segment
      const segmentStitches = lineZigzagStitching(p1.x, p1.y, p2.x, p2.y, stitchSettings);
      result.push(...segmentStitches);
    }

    return result;
  }

  // Implement the new stitching methods
  function multiLineStitching(x1, y1, x2, y2, stitchSettings) {
    // This is now a wrapper function that calls the path-based implementation
    const pathPoints = [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
    return multiLineStitchingFromPath(pathPoints, stitchSettings);
  }

  /**
   * Creates multi-line stitches from an array of stitch points
   * @private
   * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
   * @param {Object} stitchSettings - Settings for the stitches
   * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
   */
  function multiLineStitchingFromPath(pathPoints, stitchSettings) {
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
            perpX = -dy / distance;
            perpY = dx / distance;
          } else {
            // For last point, use direction from previous point
            const dx = pathPoints[j].x - pathPoints[j - 1].x;
            const dy = pathPoints[j].y - pathPoints[j - 1].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
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
          const lineStitches = straightLineStitching(start.x, start.y, end.x, end.y, stitchSettings);
          result.push(...lineStitches);
        }
      } else {
        for (let j = offsetPath.length - 1; j > 0; j--) {
          const start = offsetPath[j];
          const end = offsetPath[j - 1];
          const lineStitches = straightLineStitching(start.x, start.y, end.x, end.y, stitchSettings);
          result.push(...lineStitches);
        }
      }
    }

    return result;
  }

  function sashikoStitching(x1, y1, x2, y2, stitchSettings) {
    // This is now a wrapper function that calls the path-based implementation
    const pathPoints = [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
    return sashikoStitchingFromPath(pathPoints, stitchSettings);
  }

  /**
   * Creates sashiko stitches from an array of path points
   * @private
   * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
   * @param {Object} stitchSettings - Settings for the stitches
   * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
   */
  function sashikoStitchingFromPath(pathPoints, stitchSettings) {
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
          const lineStitches = multiLineStitchingFromPath(segmentPoints, stitchSettings);
          result.push(...lineStitches);
        } else {
          // Create single straight line for this segment
          const lineStitches = straightLineStitching(segStartX, segStartY, segEndX, segEndY, stitchSettings);
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
          if (_DEBUG) {
            console.log("Trim command at:", run[0].x, run[0].y);
            console.log("Canvas size:", _stitchData.width, _stitchData.height);
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
        for (const stitch of run) {
          if (_DEBUG)
            console.log("Stitch point:", {
              mm: { x: stitch.x, y: stitch.y },
              dst: { x: stitch.x * 10, y: stitch.y * 10 }, // Convert to DST units (0.1mm) for logging
            });

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
        let endX = mmToPixel(currentX) + lineLength;
        let endY = mmToPixel(currentY) - lineLength;
        _originalStrokeFunc.call(_p5Instance, 255, 0, 0); // red for line
        _originalStrokeWeightFunc.call(_p5Instance, 0.5);

        _originalLineFunc.call(_p5Instance, mmToPixel(currentX), mmToPixel(currentY), endX, endY);
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
   * Draws stitches according to the current draw mode
   * @param {Array} stitches - Array of stitch objects with x and y coordinates in mm
   */
  function drawStitches(stitches, threadIndex) {
    let prevX = mmToPixel(stitches[0].x);
    let prevY = mmToPixel(stitches[0].y);

    if (_drawMode === "stitch") {
      // Draw stitch lines
      _p5Instance.push();

      for (let i = 1; i < stitches.length; i++) {
        let currentX = mmToPixel(stitches[i].x);
        let currentY = mmToPixel(stitches[i].y);

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
        let currentX = mmToPixel(stitches[i].x);
        let currentY = mmToPixel(stitches[i].y);
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

  /**
   * Creates a tatami fill pattern for a rectangular area.
   * @private
   * @param {number} x - X coordinate of the rectangle in mm
   * @param {number} y - Y coordinate of the rectangle in mm
   * @param {number} w - Width of the rectangle in mm
   * @param {number} h - Height of the rectangle in mm
   * @param {Object} stitchSettings - Fill settings object
   * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
   */
  function createTatamiFill(x, y, w, h, stitchSettings = _fillSettings) {
    const stitches = [];
    const angle = stitchSettings.angle;
    const stitchLength = stitchSettings.stitchLength;
    const stitchWidth = stitchSettings.stitchWidth;
    const minStitchLength = stitchSettings.minStitchLength;
    const resampleNoise = stitchSettings.resampleNoise;
    const tieDistance = stitchSettings.tieDistance;

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

      // Calculate number of stitches in this row
      const rowLength = Math.abs(rowX2 - rowX1);

      if (i % 2 === 0) {
        stitches.push(...straightLineStitching(rowX1, rowY, rowX2, rowY, stitchSettings));
      } else {
        stitches.push(...straightLineStitching(rowX2, rowY, rowX1, rowY, stitchSettings));
      }

      forward = !forward; // Alternate direction for next row
    }

    return stitches;
  }

  /**
   * Creates a more advanced zigzag pattern with control over density
   * @method createZigzagFromPath
   * @for p5
   * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
   * @param {Number} width - Width of the zigzag in mm
   * @param {Number} [density=_embrSettings.stitchLength] - Distance between zigzag points in mm
   * @returns {Array<{x: number, y: number}>} Array of zigzag stitch points in mm
   */
  function createZigzagFromPath(pathPoints, width, density = _embroiderySettings.stitchLength) {
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
          x: pointX,
          y: pointY,
        });
      }
    }

    if (_DEBUG) console.log("Generated zigzag from path:", zigzagResult);
    return zigzagResult;
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
  global.setStrokeSettings = p5embroidery.setStrokeSettings;

  // Expose new path-based functions
  global.convertPathToStitches = convertPathToStitches;
  global.multiLineStitchingFromPath = multiLineStitchingFromPath;
  global.sashikoStitchingFromPath = sashikoStitchingFromPath;
  global.lineZigzagStitchingFromPath = lineZigzagStitchingFromPath;
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

/**
 * Creates straight line stitches from an array of path points
 * @private
 * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
 * @param {Object} stitchSettings - Settings for the stitches
 * @returns {Array<{x: number, y: number}>} Array of stitch points in mm
 */
function straightLineStitchingFromPath(pathPoints, stitchSettings = _embroiderySettings) {
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
