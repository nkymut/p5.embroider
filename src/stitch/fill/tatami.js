/**
 * Tatami fill pattern for p5.embroider
 * 
 * This module provides functions for creating tatami fill patterns.
 */

import p5embroider from '../../core/main';

/**
 * Create a tatami fill pattern
 * @param {number} x - X coordinate of the top-left corner
 * @param {number} y - Y coordinate of the top-left corner
 * @param {number} w - Width of the fill area
 * @param {number} h - Height of the fill area
 * @param {Object} stitchSettings - Stitch settings
 * @returns {Array} - Array of stitch objects
 */
function createTatamiFill(x, y, w, h, stitchSettings = p5embroider._fillSettings) {
  // Use the createTatamiFill function from core/shape/stitches.js
  return p5embroider.createTatamiFill(x, y, w, h, stitchSettings);
}

// Attach the function to p5embroider
p5embroider.createTatamiFill = createTatamiFill;

export default p5embroider; 