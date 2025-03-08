/**
 * Shape primitives for p5.embroider
 * 
 * This module overrides p5.js primitive functions to create embroidery stitches.
 */

import p5embroider from '../main';

// Store original p5 functions
const _originalFunctions = {
  line: null,
  rect: null,
  ellipse: null,
  point: null,
  stroke: null,
  noStroke: null,
  fill: null,
  noFill: null,
  strokeWeight: null
};

// Attach to p5embroider for access from other modules
p5embroider._originalFunctions = _originalFunctions;

/**
 * Override the line function
 */
function overrideLineFunction() {
  const p5 = p5embroider._p5Instance;
  
  // Store the original function
  _originalFunctions.line = p5.line;
  
  // Override the function
  p5.line = function(x1, y1, x2, y2) {
    // If not recording, use the original function
    if (!p5embroider._recording) {
      return _originalFunctions.line.call(this, x1, y1, x2, y2);
    }
    
    // If stroke is disabled, do nothing
    if (!p5embroider._doStroke) {
      return;
    }
    
    // Generate stitches based on the current stroke mode
    let stitches = [];
    
    switch (p5embroider._currentStrokeMode) {
      case p5embroider.STROKE_MODE.ZIGZAG:
        stitches = p5embroider.lineZigzagStitching(x1, y1, x2, y2, p5embroider._strokeSettings);
        break;
      case p5embroider.STROKE_MODE.STRAIGHT:
        stitches = p5embroider.straightLineStitching(x1, y1, x2, y2, p5embroider._strokeSettings);
        break;
      case p5embroider.STROKE_MODE.SASHIKO:
        stitches = p5embroider.sashikoStitching(x1, y1, x2, y2, p5embroider._strokeSettings);
        break;
      case p5embroider.STROKE_MODE.MULTILINE:
        stitches = p5embroider.multiLineStitching(x1, y1, x2, y2, p5embroider._strokeSettings);
        break;
      default:
        // Default to straight line stitching
        stitches = p5embroider.straightLineStitching(x1, y1, x2, y2, p5embroider._strokeSettings);
        break;
    }
    
    // Add stitches to the current thread
    p5embroider.drawStitches(stitches, p5embroider._strokeThreadIndex);
    
    // If in p5 draw mode, use the original function
    if (p5embroider._drawMode === p5embroider.DRAW_MODE.P5) {
      return _originalFunctions.line.call(this, x1, y1, x2, y2);
    }
  };
}

/**
 * Override the rect function
 */
function overrideRectFunction() {
  const p5 = p5embroider._p5Instance;
  
  // Store the original function
  _originalFunctions.rect = p5.rect;
  
  // Override the function
  p5.rect = function(x, y, w, h) {
    // If not recording, use the original function
    if (!p5embroider._recording) {
      return _originalFunctions.rect.call(this, x, y, w, h);
    }
    
    // If both stroke and fill are disabled, do nothing
    if (!p5embroider._doStroke && !p5embroider._doFill) {
      return;
    }
    
    // If fill is enabled, create fill stitches
    if (p5embroider._doFill) {
      const fillStitches = p5embroider.createTatamiFill(x, y, w, h, p5embroider._fillSettings);
      p5embroider.drawStitches(fillStitches, p5embroider._fillThreadIndex);
    }
    
    // If stroke is enabled, create stroke stitches
    if (p5embroider._doStroke) {
      // Create the four sides of the rectangle
      const x2 = x + w;
      const y2 = y + h;
      
      let stitches = [];
      
      switch (p5embroider._currentStrokeMode) {
        case p5embroider.STROKE_MODE.ZIGZAG:
          // Create zigzag stitches for each side
          stitches.push(...p5embroider.lineZigzagStitching(x, y, x2, y, p5embroider._strokeSettings));
          stitches.push(...p5embroider.lineZigzagStitching(x2, y, x2, y2, p5embroider._strokeSettings));
          stitches.push(...p5embroider.lineZigzagStitching(x2, y2, x, y2, p5embroider._strokeSettings));
          stitches.push(...p5embroider.lineZigzagStitching(x, y2, x, y, p5embroider._strokeSettings));
          break;
        case p5embroider.STROKE_MODE.STRAIGHT:
        default:
          // Create straight stitches for each side
          stitches.push(...p5embroider.straightLineStitching(x, y, x2, y, p5embroider._strokeSettings));
          stitches.push(...p5embroider.straightLineStitching(x2, y, x2, y2, p5embroider._strokeSettings));
          stitches.push(...p5embroider.straightLineStitching(x2, y2, x, y2, p5embroider._strokeSettings));
          stitches.push(...p5embroider.straightLineStitching(x, y2, x, y, p5embroider._strokeSettings));
          break;
      }
      
      // Draw the stitches
      p5embroider.drawStitches(stitches, p5embroider._strokeThreadIndex);
    }
    
    // If in p5 draw mode, use the original function
    if (p5embroider._drawMode === p5embroider.DRAW_MODE.P5) {
      return _originalFunctions.rect.call(this, x, y, w, h);
    }
  };
}

/**
 * Override the ellipse function
 */
function overrideEllipseFunction() {
  const p5 = p5embroider._p5Instance;
  
  // Store the original function
  _originalFunctions.ellipse = p5.ellipse;
  
  // Override the function
  p5.ellipse = function(x, y, w, h) {
    // If h is not provided, use w
    h = h || w;
    
    // If not recording, use the original function
    if (!p5embroider._recording) {
      return _originalFunctions.ellipse.call(this, x, y, w, h);
    }
    
    // If both stroke and fill are disabled, do nothing
    if (!p5embroider._doStroke && !p5embroider._doFill) {
      return;
    }
    
    // If fill is enabled, create fill stitches
    if (p5embroider._doFill) {
      const fillStitches = p5embroider.createTatamiFill(x - w/2, y - h/2, w, h, p5embroider._fillSettings);
      p5embroider.drawStitches(fillStitches, p5embroider._fillThreadIndex);
    }
    
    // If stroke is enabled, create stroke stitches
    if (p5embroider._doStroke) {
      // Create points around the ellipse
      const numPoints = Math.max(24, Math.floor(Math.max(w, h) / 5));
      const points = [];
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const px = x + Math.cos(angle) * (w / 2);
        const py = y + Math.sin(angle) * (h / 2);
        points.push({ x: px, y: py });
      }
      
      // Connect the points with stitches
      const stitches = [];
      
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        
        switch (p5embroider._currentStrokeMode) {
          case p5embroider.STROKE_MODE.ZIGZAG:
            stitches.push(...p5embroider.lineZigzagStitching(p1.x, p1.y, p2.x, p2.y, p5embroider._strokeSettings));
            break;
          case p5embroider.STROKE_MODE.STRAIGHT:
          default:
            stitches.push(...p5embroider.straightLineStitching(p1.x, p1.y, p2.x, p2.y, p5embroider._strokeSettings));
            break;
        }
      }
      
      // Draw the stitches
      p5embroider.drawStitches(stitches, p5embroider._strokeThreadIndex);
    }
    
    // If in p5 draw mode, use the original function
    if (p5embroider._drawMode === p5embroider.DRAW_MODE.P5) {
      return _originalFunctions.ellipse.call(this, x, y, w, h);
    }
  };
}

/**
 * Override the point function
 */
function overridePointFunction() {
  const p5 = p5embroider._p5Instance;
  
  // Store the original function
  _originalFunctions.point = p5.point;
  
  // Override the function
  p5.point = function(x, y) {
    // If not recording, use the original function
    if (!p5embroider._recording) {
      return _originalFunctions.point.call(this, x, y);
    }
    
    // If stroke is disabled, do nothing
    if (!p5embroider._doStroke) {
      return;
    }
    
    // Add a single stitch at the point
    const stitch = { x, y, jump: false };
    
    // Get the current thread
    const thread = p5embroider.getThread(p5embroider._strokeThreadIndex);
    
    // Add the stitch to the thread
    if (thread) {
      thread.addStitch(stitch);
      p5embroider._stitchData.stitchCount++;
    }
    
    // If in p5 draw mode, use the original function
    if (p5embroider._drawMode === p5embroider.DRAW_MODE.P5) {
      return _originalFunctions.point.call(this, x, y);
    }
  };
}

/**
 * Override all p5 functions
 */
function overrideP5Functions() {
  // Override shape functions
  overrideLineFunction();
  overrideRectFunction();
  overrideEllipseFunction();
  overridePointFunction();
}

/**
 * Restore original p5 functions
 */
function restoreP5Functions() {
  const p5 = p5embroider._p5Instance;
  
  // Restore all overridden functions
  for (const [name, func] of Object.entries(_originalFunctions)) {
    if (func) {
      p5[name] = func;
    }
  }
}

// Attach functions to p5embroider
p5embroider.overrideP5Functions = overrideP5Functions;
p5embroider.restoreP5Functions = restoreP5Functions;

export default p5embroider; 