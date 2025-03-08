/**
 * Sashiko stitch pattern for p5.embroider
 * 
 * This module provides functions for creating sashiko stitch patterns.
 */

import p5embroider from '../../core/main';

/**
 * Create a sashiko stitching pattern
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @param {Object} stitchSettings - Stitch settings
 * @returns {Array} - Array of stitch objects
 */
function sashikoStitching(x1, y1, x2, y2, stitchSettings = p5embroider._embroiderySettings) {
  const stitches = [];
  
  // Calculate the direction vector
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  // Calculate the length of the line
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // If the length is too small, just return a straight line
  if (length < stitchSettings.minStitchLength * 3) {
    return p5embroider.straightLineStitching(x1, y1, x2, y2, stitchSettings);
  }
  
  // Calculate the unit direction vector
  const ux = dx / length;
  const uy = dy / length;
  
  // Calculate the stitch length
  const stitchLength = stitchSettings.stitchLength || 3;
  
  // Calculate the gap length (typically 1/3 of the stitch length for sashiko)
  const gapLength = stitchLength / 3;
  
  // Calculate the total pattern length (stitch + gap)
  const patternLength = stitchLength + gapLength;
  
  // Calculate the number of patterns needed
  const numPatterns = Math.floor(length / patternLength);
  
  // Calculate the remaining length
  const remainingLength = length - numPatterns * patternLength;
  
  // Adjust the stitch length to distribute the remaining length
  const adjustedStitchLength = stitchLength + remainingLength / numPatterns;
  
  // Generate stitches
  let currentX = x1;
  let currentY = y1;
  
  // Add the first stitch
  stitches.push({ x: currentX, y: currentY, jump: false });
  
  for (let i = 0; i < numPatterns; i++) {
    // Calculate the end of the stitch
    const stitchEndX = currentX + ux * adjustedStitchLength;
    const stitchEndY = currentY + uy * adjustedStitchLength;
    
    // Add the stitch end point
    stitches.push({ x: stitchEndX, y: stitchEndY, jump: false });
    
    // Calculate the end of the gap
    currentX = stitchEndX + ux * gapLength;
    currentY = stitchEndY + uy * gapLength;
    
    // Add the gap end point with a jump
    stitches.push({ x: currentX, y: currentY, jump: true });
  }
  
  // Add the final stitch to the end point if needed
  if (Math.abs(currentX - x2) > 0.1 || Math.abs(currentY - y2) > 0.1) {
    stitches.push({ x: x2, y: y2, jump: false });
  }
  
  return stitches;
}

// Attach the function to p5embroider
p5embroider.sashikoStitching = sashikoStitching;

export default p5embroider; 