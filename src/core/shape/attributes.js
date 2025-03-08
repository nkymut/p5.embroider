/**
 * Shape attributes for p5.embroider
 * 
 * This module overrides p5.js attribute functions to handle embroidery-specific attributes.
 */

import p5embroider from '../main';

// Import original functions from primitives.js
const _originalFunctions = p5embroider._originalFunctions || {
  stroke: null,
  noStroke: null,
  fill: null,
  noFill: null,
  strokeWeight: null
};

/**
 * Override the stroke function
 */
function overrideStrokeFunction() {
  const p5 = p5embroider._p5Instance;
  
  // Store the original function
  _originalFunctions.stroke = p5.stroke;
  
  // Override the function
  p5.stroke = function() {
    // Call the original function to maintain p5 behavior
    const result = _originalFunctions.stroke.apply(this, arguments);
    
    // If not recording, just return the result
    if (!p5embroider._recording) {
      return result;
    }
    
    // Enable stroke for embroidery
    p5embroider._doStroke = true;
    
    // Get the color from the arguments
    let r, g, b;
    
    if (arguments.length === 1) {
      // Single argument could be a color string, number, or p5.Color
      const color = arguments[0];
      
      if (typeof color === 'string') {
        // Parse color string
        const c = p5.color(color);
        r = p5.red(c);
        g = p5.green(c);
        b = p5.blue(c);
      } else if (typeof color === 'number') {
        // Grayscale value
        r = g = b = color;
      } else if (color && typeof color.levels === 'object') {
        // p5.Color object
        r = color.levels[0];
        g = color.levels[1];
        b = color.levels[2];
      }
    } else if (arguments.length >= 3) {
      // RGB values
      r = arguments[0];
      g = arguments[1];
      b = arguments[2];
    }
    
    // If we have valid color components, create or find a thread
    if (r !== undefined && g !== undefined && b !== undefined) {
      // Check if a thread with this color already exists
      const threads = p5embroider._stitchData.threads;
      let threadIndex = -1;
      
      for (let i = 0; i < threads.length; i++) {
        const thread = threads[i];
        if (thread.color.r === r && thread.color.g === g && thread.color.b === b) {
          threadIndex = i;
          break;
        }
      }
      
      // If no thread with this color exists, create a new one
      if (threadIndex === -1) {
        threadIndex = p5embroider.addThread(r, g, b, p5embroider._strokeSettings.strokeWeight);
      }
      
      // Set the current stroke thread
      p5embroider._strokeThreadIndex = threadIndex;
    }
    
    return result;
  };
}

/**
 * Override the noStroke function
 */
function overrideNoStrokeFunction() {
  const p5 = p5embroider._p5Instance;
  
  // Store the original function
  _originalFunctions.noStroke = p5.noStroke;
  
  // Override the function
  p5.noStroke = function() {
    // Call the original function to maintain p5 behavior
    const result = _originalFunctions.noStroke.apply(this, arguments);
    
    // If not recording, just return the result
    if (!p5embroider._recording) {
      return result;
    }
    
    // Disable stroke for embroidery
    p5embroider._doStroke = false;
    
    return result;
  };
}

/**
 * Override the fill function
 */
function overrideFillFunction() {
  const p5 = p5embroider._p5Instance;
  
  // Store the original function
  _originalFunctions.fill = p5.fill;
  
  // Override the function
  p5.fill = function() {
    // Call the original function to maintain p5 behavior
    const result = _originalFunctions.fill.apply(this, arguments);
    
    // If not recording, just return the result
    if (!p5embroider._recording) {
      return result;
    }
    
    // Enable fill for embroidery
    p5embroider._doFill = true;
    
    // Get the color from the arguments
    let r, g, b;
    
    if (arguments.length === 1) {
      // Single argument could be a color string, number, or p5.Color
      const color = arguments[0];
      
      if (typeof color === 'string') {
        // Parse color string
        const c = p5.color(color);
        r = p5.red(c);
        g = p5.green(c);
        b = p5.blue(c);
      } else if (typeof color === 'number') {
        // Grayscale value
        r = g = b = color;
      } else if (color && typeof color.levels === 'object') {
        // p5.Color object
        r = color.levels[0];
        g = color.levels[1];
        b = color.levels[2];
      }
    } else if (arguments.length >= 3) {
      // RGB values
      r = arguments[0];
      g = arguments[1];
      b = arguments[2];
    }
    
    // If we have valid color components, create or find a thread
    if (r !== undefined && g !== undefined && b !== undefined) {
      // Check if a thread with this color already exists
      const threads = p5embroider._stitchData.threads;
      let threadIndex = -1;
      
      for (let i = 0; i < threads.length; i++) {
        const thread = threads[i];
        if (thread.color.r === r && thread.color.g === g && thread.color.b === b) {
          threadIndex = i;
          break;
        }
      }
      
      // If no thread with this color exists, create a new one
      if (threadIndex === -1) {
        threadIndex = p5embroider.addThread(r, g, b, p5embroider._fillSettings.stitchWidth);
      }
      
      // Set the current fill thread
      p5embroider._fillThreadIndex = threadIndex;
      
      // Update fill settings color
      p5embroider._fillSettings.color = { r, g, b };
    }
    
    return result;
  };
}

/**
 * Override the noFill function
 */
function overrideNoFillFunction() {
  const p5 = p5embroider._p5Instance;
  
  // Store the original function
  _originalFunctions.noFill = p5.noFill;
  
  // Override the function
  p5.noFill = function() {
    // Call the original function to maintain p5 behavior
    const result = _originalFunctions.noFill.apply(this, arguments);
    
    // If not recording, just return the result
    if (!p5embroider._recording) {
      return result;
    }
    
    // Disable fill for embroidery
    p5embroider._doFill = false;
    
    return result;
  };
}

/**
 * Override the strokeWeight function
 */
function overrideStrokeWeightFunction() {
  const p5 = p5embroider._p5Instance;
  
  // Store the original function
  _originalFunctions.strokeWeight = p5.strokeWeight;
  
  // Override the function
  p5.strokeWeight = function(weight) {
    // Call the original function to maintain p5 behavior
    const result = _originalFunctions.strokeWeight.apply(this, arguments);
    
    // If not recording, just return the result
    if (!p5embroider._recording) {
      return result;
    }
    
    // Set the stroke weight for embroidery
    p5embroider._strokeSettings.strokeWeight = weight;
    p5embroider._strokeSettings.stitchWidth = weight;
    
    return result;
  };
}

// Override all attribute functions
function overrideAttributeFunctions() {
  overrideStrokeFunction();
  overrideNoStrokeFunction();
  overrideFillFunction();
  overrideNoFillFunction();
  overrideStrokeWeightFunction();
}

// Attach functions to p5embroider
p5embroider.overrideAttributeFunctions = overrideAttributeFunctions;

// Override attribute functions when initialized
p5embroider.init = (function(originalInit) {
  return function(p5Instance) {
    const result = originalInit.call(this, p5Instance);
    overrideAttributeFunctions();
    return result;
  };
})(p5embroider.init);

export default p5embroider; 