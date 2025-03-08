/**
 * Stitch rendering for p5.embroider
 * 
 * This module provides functions for rendering stitches.
 */

import p5embroider from '../core/main';

/**
 * Render stitches
 * @param {Array} stitches - Array of stitch objects
 * @param {Object} thread - Thread object
 * @param {Object} p5Instance - p5 instance
 */
function renderStitches(stitches, thread, p5Instance) {
  if (!stitches || stitches.length === 0 || !thread) {
    return;
  }
  
  const p5 = p5Instance || p5embroider._p5Instance;
  
  if (!p5) {
    return;
  }
  
  // Set up drawing style
  p5.push();
  p5.stroke(thread.color.r, thread.color.g, thread.color.b);
  p5.strokeWeight(1);
  p5.noFill();
  
  // Draw stitches as lines
  for (let i = 1; i < stitches.length; i++) {
    const prev = stitches[i - 1];
    const curr = stitches[i];
    
    if (!curr.jump) {
      p5.line(prev.x, prev.y, curr.x, curr.y);
    }
  }
  
  // Draw stitch points
  p5.strokeWeight(3);
  for (const stitch of stitches) {
    if (stitch.jump) {
      p5.stroke(255, 0, 0); // Red for jump stitches
    } else {
      p5.stroke(thread.color.r, thread.color.g, thread.color.b);
    }
    p5.point(stitch.x, stitch.y);
  }
  
  p5.pop();
}

/**
 * Render all stitches in the stitch data
 * @param {Object} stitchData - Stitch data object
 * @param {Object} p5Instance - p5 instance
 */
function renderAllStitches(stitchData, p5Instance) {
  if (!stitchData || !stitchData.threads) {
    return;
  }
  
  const p5 = p5Instance || p5embroider._p5Instance;
  
  if (!p5) {
    return;
  }
  
  // Render each thread's stitches
  for (const thread of stitchData.threads) {
    renderStitches(thread.stitches, thread, p5);
  }
}

// Attach the functions to p5embroider
p5embroider.renderStitches = renderStitches;
p5embroider.renderAllStitches = renderAllStitches;

export default p5embroider; 