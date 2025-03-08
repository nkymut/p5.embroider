/**
 * p5.embroider
 * An embroidery library for p5.js
 * 
 * This is the main module that initializes the library and sets up the global namespace.
 */

const p5embroider = {};

// This will be our namespace for the library
// We'll attach all public methods and properties to this object
(function() {
  // Store reference to p5 instance
  let _p5Instance;
  
  // Initialize the library with a p5 instance
  p5embroider.init = function(p5Instance) {
    _p5Instance = p5Instance || window;
    
    // Override p5.js functions with embroidery versions
    if (_p5Instance) {
      // This will be implemented in shape/primitives.js
      // overrideP5Functions();
    }
    
    return this;
  };
  
  // Method to begin recording embroidery stitches
  p5embroider.beginRecord = function(p5Instance) {
    this.init(p5Instance);
    
    // Set recording flag to true
    this._recording = true;
    
    // Initialize stitch data
    this._stitchData = {
      width: _p5Instance.width,
      height: _p5Instance.height,
      threads: [],
      pixelsPerUnit: 1,
      stitchCount: 0
    };
    
    return this;
  };
  
  // Method to end recording and return stitch data
  p5embroider.endRecord = function() {
    // Set recording flag to false
    this._recording = false;
    
    // Return a copy of the stitch data
    return Object.assign({}, this._stitchData);
  };
  
  // Method to set the draw mode
  p5embroider.setDrawMode = function(mode) {
    if (['stitch', 'p5', 'realistic'].includes(mode)) {
      this._drawMode = mode;
    } else {
      console.warn(`Invalid draw mode: ${mode}. Using default: ${this._drawMode}`);
    }
    
    return this;
  };
  
  // Expose internal properties with getters/setters
  Object.defineProperties(p5embroider, {
    _recording: {
      value: false,
      writable: true
    },
    _drawMode: {
      value: 'stitch',
      writable: true
    },
    _stitchData: {
      value: {
        width: 0,
        height: 0,
        threads: [],
        pixelsPerUnit: 1,
        stitchCount: 0
      },
      writable: true
    }
  });
})();

// Automatically initialize if p5 is available in the global scope
if (typeof window !== 'undefined' && window.p5) {
  p5embroider.init(window.p5);
}

export default p5embroider; 