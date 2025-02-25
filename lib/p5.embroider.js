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
      // Reset data and counters
      this.data = [];
      this.currentX = 0;
      this.currentY = 0;
      this.stitchCount = 0;

      // Calculate border size
      let border = this.calculateBorderSize(points);

      // Generate stitches
      for (let i = 0; i < points.length; i++) {
        this.move(points[i].x, points[i].y, i === 0 ? DSTWriter.JUMP : DSTWriter.STITCH);
      }

      // Add end of pattern
      this.move(points[0].x, points[0].y, DSTWriter.STITCH);  // Close the circle
      this.move(0, 0, DSTWriter.END);

      // Prepare header
      let header = new Array(512).fill(0x20); // Fill with spaces
      let headerString =
        `LA:${title.padEnd(16)}\r` +
        `ST:${this.stitchCount.toString().padStart(7)}\r` +
        `CO:${(1).toString().padStart(3)}\r` +
        `+X:${border.right.toString().padStart(5)}\r` +
        `-X:${border.left.toString().padStart(5)}\r` +
        `+Y:${border.bottom.toString().padStart(5)}\r` +
        `-Y:${border.top.toString().padStart(5)}\r` +
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
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 100);
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

    generateGCode(points) {
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

    saveGcode(filename) {
      //const gcode = this.generateGCode();
      const blob = new Blob([this.data.join('\n')], { type: 'text/plain' });
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

  (function(global) {
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
      stitchLength: 3};

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
    p5embroidery.beginRecord = function(p5Instance) {
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
    p5embroidery.endRecord = function() {
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
        }
        _originalLineFunc.apply(this, arguments);
        console.log("line",_stitchData);
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

          // Convert ellipse to points
          const numPoints = 72; // 5度ごとに点を打つ
          let points = [];
          for (let i = 0; i < numPoints; i++) {
            let angle = (i * Math.PI * 2) / numPoints;
            let px = x + Math.cos(angle) * (w/2);
            let py = y + Math.sin(angle) * (h/2);
            points.push({x: px * 10, y: py * 10}); // Convert to 0.1mm units
          }
          
          // Add points to stitch data
          _stitchData.threads[_currentThreadIndex].runs.push(points);
        }
        _originalEllipseFunc.apply(this, arguments);
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

    function convertLineToStitches(x1, y1, x2, y2) {
      let stitches = [];
      let dx = x2 - x1;
      let dy = y2 - y1;
      let distance = Math.sqrt(dx * dx + dy * dy);
      let numStitches = Math.floor(distance / _embrSettings.stitchLength);
      let remainingDistance = distance % _embrSettings.stitchLength;
      
      // Handle full-length stitches
      for (let i = 0; i < numStitches; i++) {
        let t = (i * _embrSettings.stitchLength) / distance;
        stitches.push({
          x: (x1 + dx * t) * 10,
          y: (y1 + dy * t) * 10
        });
      }
      
      // Add final stitch at the end point if there's any remaining distance
      if (remainingDistance > 0 || numStitches === 0) {
        stitches.push({
          x: x2 * 10,
          y: y2 * 10
        });
      }
      return stitches;
    }

    p5embroidery.exportEmbroidery = function(filename) {
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

    p5embroidery.exportGcode  = function(filename) {
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
    };


    p5embroidery.exportDST = function(filename = 'embroideryPattern.dst') {
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
    };

    // Rename cutThread to trimThread
    p5embroidery.trimThread = function() {
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

  })(typeof globalThis !== 'undefined' ? globalThis : window);

}));
