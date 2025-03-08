/**
 * Straight stitch pattern for p5.embroider
 * 
 * This module provides functions for creating straight stitch patterns.
 */

import p5embroider from '../../core/main';

/**
 * Create a straight line stitching pattern
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @param {Object} stitchSettings - Stitch settings
 * @returns {Array} - Array of stitch objects
 */
function straightLineStitching(x1, y1, x2, y2, stitchSettings = p5embroider._embroiderySettings) {
  // Use the convertLineToStitches function from core/shape/stitches.js
  return p5embroider.convertLineToStitches(x1, y1, x2, y2, stitchSettings);
}

// Attach the function to p5embroider
p5embroider.straightLineStitching = straightLineStitching;

export default p5embroider; 