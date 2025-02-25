import { DSTWriter } from './p5-tajima-dst-writer.js';
import { GCodeWriter } from './p5-gcode-writer.js';

(function (global) {
  const p5embroidery = {};

  // Internal properties
  let _p5Instance;
  let _recording = false;
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

  // Thread class
  class Thread {
    constructor(r, g, b) {
      this.red = r;
      this.green = g;
      this.blue = b;
      this.runs = [];
    }
  }

  // Begin recording embroidery data
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

  // End recording and export embroidery file
  p5embroidery.endRecord = function () {
    _recording = false;
    restoreP5Functions();
    //exportEmbroidery(format);
  };

  // Example override for line()
  let _originalLineFunc;
  function overrideLineFunction() {
    _originalLineFunc = window.line;
    window.line = function(x1, y1, x2, y2) {
      if (_recording) {
        let stitches = convertLineToStitches(x1, y1, x2, y2);
        _stitchData.threads[_currentThreadIndex].runs.push(stitches);
        
        // Draw stitches visually
        let prevX = x1;
        let prevY = y1;
        
        // Save current style
        //let originalStroke = _p5Instance.stroke();
        //let originalStrokeWeight = _p5Instance.strokeWeight();
        
        // Draw stitch lines
        _p5Instance.push();
  
        for (let stitch of stitches) {
          // Convert back from 0.1mm units
          let currentX = stitch.x / 10;
          let currentY = stitch.y / 10;
          
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
        _p5Instance.pop();
        // Restore original style
        //_p5Instance.stroke(originalStroke);
        //_p5Instance.strokeWeight(originalStrokeWeight);
      } else {
        _originalLineFunc.apply(this, arguments);
      }
    };
  }

  // Example override for ellipse()
  let _originalEllipseFunc;
  function overrideEllipseFunction() {
    _originalEllipseFunc = window.ellipse;
    window.ellipse = function(x, y, w, h) {
      if (_recording) {
        // Handle different ellipse modes
        if (_p5Instance._renderer._ellipseMode === 'corner') {
          x += w/2;
          y += h/2;
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
          x += w/2;
          y += h/2;
        }

        // Calculate circumference to determine number of points
        const circumference = Math.PI * Math.sqrt((w * w + h * h) / 2);
        const numPoints = Math.max(8, Math.ceil(circumference / _embrSettings.stitchLength));
        
        let points = [];
        for (let i = 0; i <= numPoints; i++) {
          let angle = (i * Math.PI * 2) / numPoints;
          let px = x + Math.cos(angle) * (w/2);
          let py = y + Math.sin(angle) * (h/2);
          points.push({x: px * 10, y: py * 10}); // Convert to 0.1mm units
        }
        
        // Add points to stitch data
        _stitchData.threads[_currentThreadIndex].runs.push(points);

        // Draw stitches visually
        let prevX = points[0].x / 10;
        let prevY = points[0].y / 10;
        
        // Save current style
        _p5Instance.push();
        _p5Instance.noFill();
        
        for (let i = 1; i < points.length; i++) {
          let currentX = points[i].x / 10;
          let currentY = points[i].y / 10;
          
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
      }
      //_originalEllipseFunc.apply(this, arguments);
    };
  }

  // Override p5.js functions
  function overrideP5Functions() {
    overrideLineFunction();
    overrideEllipseFunction();
    // Add more overrides as needed
  }

  function restoreP5Functions() {
    window.line = _originalLineFunc;
    window.ellipse = _originalEllipseFunc;
    // Restore other functions as needed
  }

  // Add setStitch function
  p5embroidery.setStitch = function (minLength, desiredLength, noise) {
    _embrSettings.minStitchLength = Math.max(0, minLength);
    _embrSettings.stitchLength = Math.max(0.1, desiredLength);
    _embrSettings.resampleNoise = Math.min(1, Math.max(0, noise));
  };

  function convertLineToStitches(x1, y1, x2, y2) {
    let stitches = [];
    let dx = x2 - x1;
    let dy = y2 - y1;
    let distance = Math.sqrt(dx * dx + dy * dy);

    // If distance is less than minimum stitch length, skip
    if (distance < _embrSettings.minStitchLength) {
      return stitches;
    }

    let baseStitchLength = _embrSettings.stitchLength;
    let numStitches = Math.floor(distance / baseStitchLength);
    let remainingDistance = distance % baseStitchLength;

    // Handle full-length stitches
    let currentDistance = 0;
    for (let i = 0; i < numStitches; i++) {
      // Add noise to stitch length if specified
      let stitchLength = baseStitchLength;
      if (_embrSettings.resampleNoise > 0) {
        let noise = (Math.random() * 2 - 1) * _embrSettings.resampleNoise;
        stitchLength *= (1 + noise);
      }

      currentDistance += stitchLength;

      let t = Math.min(currentDistance / distance, 1);

      stitches.push({
        x: (x1 + dx * t) * 10,
        y: (y1 + dy * t) * 10
      });
    }

    // Add final stitch at the end point if there's enough remaining distance
    if (remainingDistance > _embrSettings.minStitchLength || numStitches === 0) {
      stitches.push({
        x: x2 * 10,
        y: y2 * 10
      });
    }
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
  }

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
    gcodeWriter.saveGcode(filename);
  }


  p5embroidery.exportDST = function (filename = 'embroideryPattern.dst') {
    const points = [];
    const dstWriter = new DSTWriter();

    for (const thread of _stitchData.threads) {
      for (const run of thread.runs) {
        // Check if this is a thread trim command
        if (run.length === 1 && run[0].command === 'trim') {
          points.push({
            x: 0,
            y: 0,
            jump: true,
            trim: true
          });
          continue;
        }

        // Normal stitches
        for (const stitch of run) {
          points.push({
            x: stitch.x,
            y: stitch.y
          });
        }
      }
    }


    dstWriter.saveDST(points, "EmbroideryPattern", filename);
  }

  // Rename cutThread to trimThread
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

})(typeof globalThis !== 'undefined' ? globalThis : window); 