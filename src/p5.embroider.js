import { DSTWriter } from "./io/p5-tajima-dst-writer.js";
import { GCodeWriter } from "./io/p5-gcode-writer.js";

let _DEBUG = true;

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
   * @param {number} [settings.stitchLength] - Length of each stitch in mm
   * @param {number} [settings.stitchWidth] - Width of each stitch in mm
   * @param {number} [settings.minStitchLength] - Minimum stitch length in mm
   * @param {number} [settings.resampleNoise] - Amount of random variation (0-1)
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
        console.log("endShape", _vertices, _vertices.length);
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
        if(_doFill) {
          // Convert vertices to pathPoints format for the fill function
          const pathPoints = _vertices.map((v) => ({
            x: v.x,
            y: v.y,
          }));
          const fillStitches = createTatamiFillFromPath(pathPoints, _fillSettings);
          _stitchData.threads[_fillThreadIndex].runs.push(fillStitches);
          
          // Draw fill stitches in visual modes
          if (_drawMode === "stitch" || _drawMode === "realistic") {
            drawStitches(fillStitches, _fillThreadIndex);
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
        _originalVertexFunc.apply(this, args);
      }
    };
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
          _originalStrokeWeightFunc.call(this, mmToPixel(_strokeSettings.strokeWeight));
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
                stitches = zigzagStitchFromPath(pathPoints, _strokeSettings);
                break;
              case STROKE_MODE.LINES:
                stitches = multiLineStitchFromPath(pathPoints, _strokeSettings);
                break;
              case STROKE_MODE.SASHIKO:
                stitches = sashikoStitchFromPath(pathPoints, _strokeSettings);
                break;
              default:
                stitches = straightLineStitchFromPath(pathPoints, _strokeSettings);
            }
          } else {
            // If no stroke weight specified, use straight line stitching
            stitches = straightLineStitchFromPath(pathPoints, _strokeSettings);
          }

          // Add the ellipse stitches
          _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

          // Draw the stitches
          if (_drawMode === "p5") {
            console.log("_strokeSettings.strokeWeight", _strokeSettings.strokeWeight);
            _originalStrokeWeightFunc.call(this, mmToPixel(_strokeSettings.strokeWeight));
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
          _originalStrokeFunc.call(_p5Instance, 255, 0, 0); // Red for stitch points
          _originalStrokeWeightFunc.call(_p5Instance, 3);
          _originalPointFunc.call(_p5Instance, mmToPixel(x), mmToPixel(y));
          _p5Instance.pop();
        }
      } else {
        _originalStrokeWeightFunc.call(this, mmToPixel(_strokeSettings.strokeWeight));
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
      let fillStitches = [];
      let strokeStitches = [];

      if (_recording) {
        // Get the current rectMode from p5 instance
        const mode = _p5Instance._renderer._rectMode;
        
        // Convert coordinates based on rectMode
        let x1, y1, x2, y2;
        
        if (mode === _p5Instance.CENTER) {
          x1 = x - w/2;
          y1 = y - h/2;
          x2 = x + w/2;
          y2 = y + h/2;
        } else if (mode === _p5Instance.CORNERS) {
          x1 = x;
          y1 = y;
          x2 = w;  // w is actually x2 in CORNERS mode
          y2 = h;  // h is actually y2 in CORNERS mode
          w = x2 - x1;
          h = y2 - y1;
        } else { // CORNER mode (default)
          x1 = x;
          y1 = y;
          x2 = x + w;
          y2 = y + h;
        }

        // Handle fill first if enabled
        if (_doFill) {
          switch (_currentFillMode) {
            case FILL_MODE.TATAMI:
              fillStitches = createTatamiFill(x1, y1, w, h, _fillSettings);
              break;
            // Add other fill modes here
            default:
              fillStitches = createTatamiFill(x, y, w, h, _fillSettings);
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
          strokeStitches.push(...convertLineToStitches(x1, y1, x2, y1, _strokeSettings));
          strokeStitches.push(...convertLineToStitches(x2, y1, x2, y2, _strokeSettings));
          strokeStitches.push(...convertLineToStitches(x2, y2, x1, y2, _strokeSettings));
          strokeStitches.push(...convertLineToStitches(x1, y2, x1, y1, _strokeSettings));

          if (strokeStitches && strokeStitches.length > 0) {
            _stitchData.threads[_strokeThreadIndex].runs.push(strokeStitches);
          }
        }

        // Draw the stitches
        if (_drawMode === "stitch" || _drawMode === "realistic") {
          if (fillStitches && fillStitches.length > 0) {
            drawStitches(fillStitches, _fillThreadIndex);
          }
          if (strokeStitches && strokeStitches.length > 0) {
            drawStitches(strokeStitches, _strokeThreadIndex);
          }
        } else {
          _originalStrokeWeightFunc.call(this, mmToPixel(_strokeSettings.strokeWeight));
          _originalRectFunc.call(this, mmToPixel(x), mmToPixel(y), mmToPixel(w), mmToPixel(h));
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
   * Overrides necessary p5.js functions for embroidery recording.
   * @private
   */
  function overrideP5Functions() {
    overrideLineFunction();
    overrideEllipseFunction();
    overrideCircleFunction();
    overrideStrokeWeightFunction();
    overridePointFunction();
    overrideStrokeFunction();
    overrideNoStrokeFunction();
    overrideFillFunction();
    overrideNoFillFunction();
    overrideRectFunction();
    overrideSquareFunction();
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
          return straightLineStitch(x1, y1, x2, y2, stitchSettings);
        case STROKE_MODE.ZIGZAG:
          return zigzagStitch(x1, y1, x2, y2, stitchSettings);
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

    // Check for zero distance to prevent division by zero
    if (distance === 0 || distance < 0.001) {
      // If points are the same or very close, just return the start point
      if (_DEBUG) console.log("Zero distance detected in zigzagStitch, returning single point");
      return [{
        x: x1,
        y: y1,
      }];
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
    const width = stitchSettings.strokeWeight > 0 ? stitchSettings.strokeWeight : 2;

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
   * @method exportEmbroidery
   * @for p5
   * @param {String} filename - Output filename with extension
   * @example
   *
   *
   * function setup() {
   *   createCanvas(400, 400);
   *   beginRecord(this);
   *   // Draw embroidery patterns here
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
          if (run[0].x == null || run[0].y == null || 
              !isFinite(run[0].x) || !isFinite(run[0].y)) {
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
          if (stitch.x == null || stitch.y == null || 
              !isFinite(stitch.x) || !isFinite(stitch.y)) {
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
   * @method createTatamiFill
   * @private
   * @param {number} x - X coordinate of the rectangle in mm
   * @param {number} y - Y coordinate of the rectangle in mm
   * @param {number} w - Width of the rectangle in mm
   * @param {number} h - Height of the rectangle in mm
   * @param {Object} [stitchSettings=_fillSettings] - Fill settings object
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
        stitches.push(...straightLineStitch(rowX1, rowY, rowX2, rowY, stitchSettings));
      } else {
        stitches.push(...straightLineStitch(rowX2, rowY, rowX1, rowY, stitchSettings));
      }

      forward = !forward; // Alternate direction for next row
    }

    return stitches;
  }
  
  function getPathBounds(points) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
    };
  }

  function createTatamiFillFromPath(pathPoints, settings) {
    // Default settings
    const angle = settings.angle || 0;
    const spacing = settings.spacing || 4;
    const stitchLength = settings.stitchLength || 3;
    
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
    for (let d = -diagonal/2; d <= diagonal/2; d += spacing) {
      // Calculate start and end points for the scan line
      const startX = centerX - diagonal/2 * Math.cos(angle) - d * Math.sin(angle);
      const startY = centerY - diagonal/2 * Math.sin(angle) + d * Math.cos(angle);
      const endX = centerX + diagonal/2 * Math.cos(angle) - d * Math.sin(angle);
      const endY = centerY + diagonal/2 * Math.sin(angle) + d * Math.cos(angle);
      
      // Find intersections with the polygon
      const intersections = segmentIntersectPolygon({x: startX, y: startY}, {x: endX, y: endY}, pathPoints);
      
      // Sort intersections by distance from start
      intersections.sort((a, b) => {
        const distA = Math.sqrt((a.x - startX) * (a.x - startX) + (a.y - startY) * (a.y - startY));
        const distB = Math.sqrt((b.x - startX) * (b.x - startX) + (b.y - startY) * (b.y - startY));
        return distA - distB;
      });
      
      // Find valid segments for this scan line
      const validSegments = findValidSegments(intersections, pathPoints, {x: startX, y: startY}, {x: endX, y: endY});
      
      // Store segments with their scan line info
      for (const segment of validSegments) {
        scanLineSegments.push({
          start: segment.start,
          end: segment.end,
          scanLineIndex: scanLineSegments.length,
          forward: forward
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
            Math.sqrt((currentSeg.start.x - testSeg.start.x) * (currentSeg.start.x - testSeg.start.x) + (currentSeg.start.y - testSeg.start.y) * (currentSeg.start.y - testSeg.start.y)),
            Math.sqrt((currentSeg.start.x - testSeg.end.x) * (currentSeg.start.x - testSeg.end.x) + (currentSeg.start.y - testSeg.end.y) * (currentSeg.start.y - testSeg.end.y)),
            Math.sqrt((currentSeg.end.x - testSeg.start.x) * (currentSeg.end.x - testSeg.start.x) + (currentSeg.end.y - testSeg.start.y) * (currentSeg.end.y - testSeg.start.y)),
            Math.sqrt((currentSeg.end.x - testSeg.end.x) * (currentSeg.end.x - testSeg.end.x) + (currentSeg.end.y - testSeg.end.y) * (currentSeg.end.y - testSeg.end.y))
          );
          
          // If segments are close (within 2 scan line spacings), add to region
          if (minDist < 20) { // Adjust this threshold as needed
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
          (firstStitch.y - lastStitch.y) * (firstStitch.y - lastStitch.y)
        );
        
        // Insert trim command if jump is too long
        if (jumpDistance > jumpThreshold) {
          stitches.push({
            x: lastStitch.x,
            y: lastStitch.y,
            command: "trim"
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
      resampleNoise: settings.resampleNoise || 0
    };
    
    if (regionSegments.length === 0) return [];
    if (regionSegments.length === 1) {
      const seg = regionSegments[0];
      const segmentPath = [
        { x: seg.forward ? seg.start.x : seg.end.x, y: seg.forward ? seg.start.y : seg.end.y },
        { x: seg.forward ? seg.end.x : seg.start.x, y: seg.forward ? seg.end.y : seg.start.y }
      ];
      // Convert path to individual stitches
      return convertPathToStitches(segmentPath, stitchSettings);
    }
    
    const stitches = [];
    const used = new Array(regionSegments.length).fill(false);
    const intraRegionJumpThreshold = 8; // mm - threshold for trim within region
    
    // Start with the first segment
    let currentSegIndex = 0;
    used[0] = true;
    
    let currentSeg = regionSegments[0];
    const firstSegmentPath = [
      { x: currentSeg.forward ? currentSeg.start.x : currentSeg.end.x, y: currentSeg.forward ? currentSeg.start.y : currentSeg.end.y },
      { x: currentSeg.forward ? currentSeg.end.x : currentSeg.start.x, y: currentSeg.forward ? currentSeg.end.y : currentSeg.start.y }
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
        const distToStart = Math.sqrt((lastStitch.x - testSeg.start.x) * (lastStitch.x - testSeg.start.x) + (lastStitch.y - testSeg.start.y) * (lastStitch.y - testSeg.start.y));
        const distToEnd = Math.sqrt((lastStitch.x - testSeg.end.x) * (lastStitch.x - testSeg.end.x) + (lastStitch.y - testSeg.end.y) * (lastStitch.y - testSeg.end.y));
        
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
        const distToStart = Math.sqrt((lastStitch.x - nextSeg.start.x) * (lastStitch.x - nextSeg.start.x) + (lastStitch.y - nextSeg.start.y) * (lastStitch.y - nextSeg.start.y));
        const distToEnd = Math.sqrt((lastStitch.x - nextSeg.end.x) * (lastStitch.x - nextSeg.end.x) + (lastStitch.y - nextSeg.end.y) * (lastStitch.y - nextSeg.end.y));
        
        const useForwardDirection = distToStart <= distToEnd;
        
        // Create path for this segment
        const segmentPath = [
          { x: useForwardDirection ? nextSeg.start.x : nextSeg.end.x, y: useForwardDirection ? nextSeg.start.y : nextSeg.end.y },
          { x: useForwardDirection ? nextSeg.end.x : nextSeg.start.x, y: useForwardDirection ? nextSeg.end.y : nextSeg.start.y }
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
      
      if (pointInPolygon({x: midX, y: midY}, polygon)) {
        validSegments.push({
          start: segStart,
          end: segEnd
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
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
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
    
    const denominator = ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));
    
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
   * Creates a more advanced zigzag pattern with control over density.
   * @method createZigzagFromPath
   * @private
   * @param {Array<{x: number, y: number}>} pathPoints - Array of path points in mm
   * @param {number} width - Width of the zigzag in mm
   * @param {number} [density=_embrSettings.stitchLength] - Distance between zigzag points in mm
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

      // Prevent division by zero for zero-length segments
      if (distance === 0) {
        console.warn("Zero distance detected, skipping segment");
        continue;
      }

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
  global.multiLineStitchingFromPath = multiLineStitchFromPath;
  global.sashikoStitchingFromPath = sashikoStitchFromPath;
  global.zigzagStitchFromPath = zigzagStitchFromPath;

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
