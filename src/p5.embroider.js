import { DSTWriter } from "./io/p5-tajima-dst-writer.js";
import { GCodeWriter } from "./io/p5-gcode-writer.js";

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
  let _currentFill = null; // Store current fill color and properties
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

        // Add to appropriate container based on contour state
        if (_isContour) {
          _currentContour.push({ x, y });
          if (_DEBUG) console.log("Added to contour:", { x, y });
        } else {
          _vertices.push(vert);
          if (_DEBUG) console.log("Added to vertices:", vert);
        }
      } else {
        let args = [mmToPixel(x), mmToPixel(y), moveTo, u, v];
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

        // Generate bezier curve points
        const bezierPoints = generateBezierPoints(x1, y1, x2, y2, x3, y3, x4, y4);

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
              // Call bezierVertex with p5 for the first segment
              _originalBezierVertexFunc.call(
                _p5Instance,
                mmToPixel(x2),
                mmToPixel(y2),
                mmToPixel(x3),
                mmToPixel(y3),
                mmToPixel(x4),
                mmToPixel(y4),
              );
            }
          }
        }

        _isBezier = true;
        if (_DEBUG) console.log("bezierVertex added points:", bezierPoints.length - 1);
      } else {
        _originalBezierVertexFunc.apply(this, arguments);
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

        // Generate quadratic bezier curve points (convert to cubic bezier)
        const quadraticPoints = generateQuadraticPoints(x1, y1, cx, cy, x3, y3);

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
              // Call quadraticVertex with p5 for the first segment
              _originalQuadraticVertexFunc.call(
                _p5Instance,
                mmToPixel(cx),
                mmToPixel(cy),
                mmToPixel(x3),
                mmToPixel(y3),
              );
            }
          }
        }

        _isQuadratic = true;
        if (_DEBUG) console.log("quadraticVertex added points:", quadraticPoints.length - 1);
      } else {
        _originalQuadraticVertexFunc.apply(this, arguments);
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
        // Add to contour vertices for curve calculation
        _contourVertices.push({ x, y });

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
          _originalCurveVertexFunc.call(_p5Instance, mmToPixel(x), mmToPixel(y));
        }

        _isCurve = true;
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
          let stitches = convertLineToStitches(x1, y1, x2, y2, _strokeSettings);
          _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

          if (_drawMode === "stitch" || _drawMode === "realistic") {
            drawStitches(stitches, _strokeThreadIndex);
          } else if (_drawMode === "p5") {
            _originalStrokeWeightFunc.call(_p5Instance, mmToPixel(_strokeSettings.strokeWeight));
            _originalLineFunc.call(_p5Instance, mmToPixel(x1), mmToPixel(y1), mmToPixel(x2), mmToPixel(y2));
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
          // Generate curve points using Catmull-Rom spline
          const curvePoints = generateCurvePoints(x1, y1, x2, y2, x3, y3, x4, y4);
          let stitches = p5embroidery.convertVerticesToStitches(
            curvePoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
            _strokeSettings,
          );
          _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

          if (_drawMode === "stitch" || _drawMode === "realistic") {
            drawStitches(stitches, _strokeThreadIndex);
          } else if (_drawMode === "p5") {
            _originalStrokeWeightFunc.call(_p5Instance, mmToPixel(_strokeSettings.strokeWeight));
            _originalCurveFunc.call(
              _p5Instance,
              mmToPixel(x1),
              mmToPixel(y1),
              mmToPixel(x2),
              mmToPixel(y2),
              mmToPixel(x3),
              mmToPixel(y3),
              mmToPixel(x4),
              mmToPixel(y4),
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
          // Generate bezier curve points
          const bezierPoints = generateBezierPoints(x1, y1, x2, y2, x3, y3, x4, y4);
          let stitches = p5embroidery.convertVerticesToStitches(
            bezierPoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
            _strokeSettings,
          );
          _stitchData.threads[_strokeThreadIndex].runs.push(stitches);

          if (_drawMode === "stitch" || _drawMode === "realistic") {
            drawStitches(stitches, _strokeThreadIndex);
          } else if (_drawMode === "p5") {
            _originalStrokeWeightFunc.call(_p5Instance, mmToPixel(_strokeSettings.strokeWeight));
            _originalBezierFunc.call(
              _p5Instance,
              mmToPixel(x1),
              mmToPixel(y1),
              mmToPixel(x2),
              mmToPixel(y2),
              mmToPixel(x3),
              mmToPixel(y3),
              mmToPixel(x4),
              mmToPixel(y4),
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
          if (_doFill) {
            // Convert vertices to pathPoints format for the fill function
            const fillStitches = createTatamiFillFromPath(pathPoints, _fillSettings);
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

        if (_doFill) {
          let fillStitches = [];

          switch (_currentFillMode) {
            case FILL_MODE.TATAMI:
              fillStitches = createTatamiFillFromPath(pathPoints, _fillSettings);
              break;
            // Add other fill modes here as they are implemented
            default:
              fillStitches = createTatamiFillFromPath(pathPoints, _fillSettings);
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
            pathPoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
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
          _originalStrokeWeightFunc.call(_p5Instance, mmToPixel(_strokeSettings.strokeWeight));
          _originalRectFunc.call(
            _p5Instance,
            mmToPixel(x),
            mmToPixel(y),
            mmToPixel(w),
            mmToPixel(h),
            ...cornerRs.map((r) => mmToPixel(r)),
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
        // Fill
        if (_doFill) {
          let fillStitches = [];
          switch (_currentFillMode) {
            case FILL_MODE.TATAMI:
              fillStitches = createTatamiFillFromPath(pathPoints, _fillSettings);
              break;
            default:
              fillStitches = createTatamiFillFromPath(pathPoints, _fillSettings);
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
            pathPoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
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
          _originalStrokeWeightFunc.call(_p5Instance, mmToPixel(_strokeSettings.strokeWeight));
          _originalTriangleFunc.call(
            _p5Instance,
            mmToPixel(x1),
            mmToPixel(y1),
            mmToPixel(x2),
            mmToPixel(y2),
            mmToPixel(x3),
            mmToPixel(y3),
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
        // Fill
        if (_doFill) {
          let fillStitches = [];
          switch (_currentFillMode) {
            case FILL_MODE.TATAMI:
              fillStitches = createTatamiFillFromPath(pathPoints, _fillSettings);
              break;
            default:
              fillStitches = createTatamiFillFromPath(pathPoints, _fillSettings);
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
            pathPoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
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
          _originalStrokeWeightFunc.call(_p5Instance, mmToPixel(_strokeSettings.strokeWeight));
          _originalQuadFunc.call(
            _p5Instance,
            mmToPixel(x1),
            mmToPixel(y1),
            mmToPixel(x2),
            mmToPixel(y2),
            mmToPixel(x3),
            mmToPixel(y3),
            mmToPixel(x4),
            mmToPixel(y4),
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

        // Fill - handle all modes, not just PIE and CHORD
        if (_doFill) {
          let fillPathPoints = [...pathPoints];

          if (mode === window.PIE || mode === "pie") {
            // PIE mode: close to center and back to start
            fillPathPoints.push({ x, y });
            fillPathPoints.push(pathPoints[0]);
          } else if (mode === window.CHORD || mode === "chord") {
            // CHORD mode: close with straight line from end to start
            if (pathPoints.length > 1) {
              fillPathPoints.push(pathPoints[0]); // Close the path
            }
          } else {
            // For OPEN mode or undefined, create a pie-like fill (common expectation)
            fillPathPoints.push({ x, y });
            fillPathPoints.push(pathPoints[0]);
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

        // Stroke (uses original arc points, not closed fill path)
        if (_doStroke) {
          let strokePathPoints = pathPoints;

          // For PIE mode, include lines to center for stroke
          if (mode === window.PIE || mode === "pie") {
            strokePathPoints = [
              { x, y }, // Start at center
              ...pathPoints, // Arc points
              { x, y }, // Back to center
            ];
          } else if (mode === window.CHORD || mode === "chord") {
            // For CHORD mode, add the chord line
            strokePathPoints = [
              ...pathPoints,
              pathPoints[0], // Close with chord
            ];
          }
          // For OPEN mode, use pathPoints as-is

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
          _originalStrokeWeightFunc.call(_p5Instance, mmToPixel(_strokeSettings.strokeWeight));
          _originalArcFunc.call(_p5Instance, mmToPixel(x), mmToPixel(y), mmToPixel(w), mmToPixel(h), start, stop, mode);
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
    overrideVertexFunction();
    overrideBezierVertexFunction();
    overrideQuadraticVertexFunction();
    overrideCurveVertexFunction();
    overrideBeginShapeFunction();
    overrideEndShapeFunction();
    overrideBeginContourFunction();
    overrideEndContourFunction();
    // Add more overrides as needed
  }

  /**
   * Restores original p5.js functions.
   * @private
   */
  function restoreP5Functions() {
    window.line = _originalLineFunc;
    window.curve = _originalCurveFunc;
    window.bezier = _originalBezierFunc;
    window.ellipse = _originalEllipseFunc;
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
    window.vertex = _originalVertexFunc;
    window.bezierVertex = _originalBezierVertexFunc;
    window.quadraticVertex = _originalQuadraticVertexFunc;
    window.curveVertex = _originalCurveVertexFunc;
    window.beginShape = _originalBeginShapeFunc;
    window.endShape = _originalEndShapeFunc;
    window.beginContour = _originalBeginContourFunc;
    window.endContour = _originalEndContourFunc;
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
    const result = [];

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
      const next = pathPoints[i + 1];

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
   * Creates join stitches at corners between path segments.
   * @private
   * @param {Object} p1 - First point {x, y}
   * @param {Object} p2 - Corner point {x, y}
   * @param {Object} p3 - Third point {x, y}
   * @param {Object} stitchSettings - Settings for the stitches
   * @returns {Array<{x: number, y: number}>} Array of join stitch points in mm
   */
  function createJoinStitches(p1, p2, p3, stitchSettings) {
    const joinType = stitchSettings.strokeJoin || _currentStrokeJoin;
    const strokeWeight = stitchSettings.strokeWeight;
    const joinStitches = [];

    if (strokeWeight <= 0) {
      return joinStitches;
    }

    // Calculate vectors for the two segments
    const v1 = {
      x: p2.x - p1.x,
      y: p2.y - p1.y,
    };
    const v2 = {
      x: p3.x - p2.x,
      y: p3.y - p2.y,
    };

    // Normalize vectors
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (len1 === 0 || len2 === 0) {
      return joinStitches; // Skip if zero-length segments
    }

    const n1 = { x: v1.x / len1, y: v1.y / len1 };
    const n2 = { x: v2.x / len2, y: v2.y / len2 };

    // Calculate perpendicular vectors
    const perp1 = { x: -n1.y, y: n1.x };
    const perp2 = { x: -n2.y, y: n2.x };

    // Calculate angle between segments
    const dot = n1.x * n2.x + n1.y * n2.y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    // Skip join if angle is very small (nearly straight line)
    if (angle < 0.1) {
      return joinStitches;
    }

    const halfStroke = strokeWeight / 2;

    switch (joinType) {
      case STROKE_JOIN.ROUND:
        return createRoundJoin(p2, perp1, perp2, halfStroke, angle, stitchSettings);

      case STROKE_JOIN.MITER:
        return createMiterJoin(p2, perp1, perp2, halfStroke, angle, stitchSettings);

      case STROKE_JOIN.BEVEL:
        return createBevelJoin(p2, perp1, perp2, halfStroke, stitchSettings);

      default:
        return createRoundJoin(p2, perp1, perp2, halfStroke, angle, stitchSettings);
    }
  }

  /**
   * Creates round join stitches.
   * @private
   */
  function createRoundJoin(center, perp1, perp2, radius, angle, stitchSettings) {
    const joinStitches = [];
    const numSteps = Math.max(3, Math.ceil((angle * radius) / stitchSettings.stitchLength));

    // Determine the direction of the arc (clockwise or counterclockwise)
    const cross = perp1.x * perp2.y - perp1.y * perp2.x;
    const direction = cross > 0 ? 1 : -1;

    // Start and end points of the join
    const startPoint = {
      x: center.x + perp1.x * radius,
      y: center.y + perp1.y * radius,
    };
    const endPoint = {
      x: center.x + perp2.x * radius,
      y: center.y + perp2.y * radius,
    };

    // Calculate start angle for the arc
    const startAngle = Math.atan2(perp1.y, perp1.x);

    // Create arc stitches
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const currentAngle = startAngle + angle * direction * t;

      joinStitches.push({
        x: center.x + Math.cos(currentAngle) * radius,
        y: center.y + Math.sin(currentAngle) * radius,
      });
    }

    return joinStitches;
  }

  /**
   * Creates miter join stitches.
   * @private
   */
  function createMiterJoin(center, perp1, perp2, radius, angle, stitchSettings) {
    const joinStitches = [];

    // Calculate the miter point
    const miterLength = radius / Math.sin(angle / 2);

    // Limit miter length to prevent extreme spikes
    const maxMiterLength = radius * 4; // Miter limit
    const actualMiterLength = Math.min(miterLength, maxMiterLength);

    // Calculate bisector direction
    const bisectorX = (perp1.x + perp2.x) / 2;
    const bisectorY = (perp1.y + perp2.y) / 2;
    const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY);

    if (bisectorLen === 0) {
      // Fall back to bevel if bisector calculation fails
      return createBevelJoin(center, perp1, perp2, radius, stitchSettings);
    }

    const normalizedBisectorX = bisectorX / bisectorLen;
    const normalizedBisectorY = bisectorY / bisectorLen;

    // Create miter point
    const miterPoint = {
      x: center.x + normalizedBisectorX * actualMiterLength,
      y: center.y + normalizedBisectorY * actualMiterLength,
    };

    // Add stitches from end of first segment to miter point to start of second segment
    const startPoint = {
      x: center.x + perp1.x * radius,
      y: center.y + perp1.y * radius,
    };
    const endPoint = {
      x: center.x + perp2.x * radius,
      y: center.y + perp2.y * radius,
    };

    // Create stitches for the miter
    const stitches1 = straightLineStitch(startPoint.x, startPoint.y, miterPoint.x, miterPoint.y, stitchSettings);
    const stitches2 = straightLineStitch(miterPoint.x, miterPoint.y, endPoint.x, endPoint.y, stitchSettings);

    joinStitches.push(...stitches1, ...stitches2);

    return joinStitches;
  }

  /**
   * Creates bevel join stitches.
   * @private
   */
  function createBevelJoin(center, perp1, perp2, radius, stitchSettings) {
    const joinStitches = [];

    // Simple bevel: straight line between the two perpendicular points
    const startPoint = {
      x: center.x + perp1.x * radius,
      y: center.y + perp1.y * radius,
    };
    const endPoint = {
      x: center.x + perp2.x * radius,
      y: center.y + perp2.y * radius,
    };

    const bevelStitches = straightLineStitch(startPoint.x, startPoint.y, endPoint.x, endPoint.y, stitchSettings);
    joinStitches.push(...bevelStitches);

    return joinStitches;
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
        pathPoints,
        { x: startX, y: startY },
        { x: endX, y: endY },
      );

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
    const intraRegionJumpThreshold = 8; // mm - threshold for trim within region

    // Start with the first segment
    let currentSegIndex = 0;
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
    const stitchLength = settings.stitchLength || 3;

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
      const validSegments = findValidSegmentsWithContours(allIntersections, mainPath, contours, scanLine, scanLineEnd);

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
  global.trimThread = p5embroidery.trimThread; // Renamed from cutThread
  global.setStitch = p5embroidery.setStitch;
  global.setDrawMode = p5embroidery.setDrawMode;
  global.drawStitches = p5embroidery.drawStitches;
  global.mmToPixel = mmToPixel;
  global.pixelToMm = pixelToMm;
  global.setStrokeMode = p5embroidery.setStrokeMode;
  global.setStrokeJoin = p5embroidery.setStrokeJoin;
  global.STROKE_MODE = STROKE_MODE;
  global.STROKE_JOIN = STROKE_JOIN;
  global.FILL_MODE = FILL_MODE;
  global.setFillMode = p5embroidery.setFillMode;
  global.setFillSettings = p5embroidery.setFillSettings;
  global.setStrokeSettings = p5embroidery.setStrokeSettings;

  // Expose new path-based functions
  global.convertPathToStitches = convertPathToStitches;
  global.multiLineStitchingFromPath = multiLineStitchFromPath;
  global.sashikoStitchingFromPath = sashikoStitchFromPath;
  global.zigzagStitchFromPath = zigzagStitchFromPath;

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
