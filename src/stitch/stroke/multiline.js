/**
 * Multiline stitch pattern for p5.embroider
 * 
 * This module provides functions for creating multiline stitch patterns.
 */

import p5embroider from '../../core/main';

/**
 * Create a multiline stitching pattern
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @param {Object} stitchSettings - Stitch settings
 * @returns {Array} - Array of stitch objects
 */
function multiLineStitching(x1, y1, x2, y2, stitchSettings = p5embroider._embroiderySettings) {
  const stitches = [];
  
  // Calculate the direction vector
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  // Calculate the length of the line
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // If the length is too small, just return a straight line
  if (length < stitchSettings.minStitchLength) {
    return p5embroider.straightLineStitching(x1, y1, x2, y2, stitchSettings);
  }
  
  // Calculate the perpendicular vector
  const perpX = -dy / length;
  const perpY = dx / length;
  
  // Calculate the width of the multiline
  const width = stitchSettings.stitchWidth || 2;
  
  // Number of parallel lines
  const numLines = 3; // Default to 3 lines
  
  // Calculate the spacing between lines
  const spacing = width / (numLines - 1);
  
  // Generate stitches for each line
  for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
    // Calculate the offset for this line
    const offset = lineIndex * spacing - width / 2;
    
    // Calculate the start and end points for this line
    const startX = x1 + perpX * offset;
    const startY = y1 + perpY * offset;
    const endX = x2 + perpX * offset;
    const endY = y2 + perpY * offset;
    
    // Generate stitches for this line
    const lineStitches = p5embroider.straightLineStitching(startX, startY, endX, endY, stitchSettings);
    
    // Add a jump stitch if this is not the first line
    if (lineIndex > 0 && lineStitches.length > 0) {
      lineStitches[0].jump = true;
    }
    
    // Add the stitches to the result
    stitches.push(...lineStitches);
  }
  
  return stitches;
}

// Attach the function to p5embroider
p5embroider.multiLineStitching = multiLineStitching;

export default p5embroider; 