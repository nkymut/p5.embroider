/**
 * Zigzag stitch pattern for p5.embroider
 * 
 * This module provides functions for creating zigzag stitch patterns.
 */

import p5embroider from '../../core/main';

/**
 * Create a zigzag line stitching pattern
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @param {Object} stitchSettings - Stitch settings
 * @returns {Array} - Array of stitch objects
 */
function lineZigzagStitching(x1, y1, x2, y2, stitchSettings = p5embroider._embroiderySettings) {
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
  
  // Calculate the width of the zigzag
  const width = stitchSettings.stitchWidth || 2;
  
  // Calculate the number of zigzags
  const numZigzags = Math.ceil(length / stitchSettings.stitchLength);
  
  // Generate zigzag stitches
  for (let i = 0; i <= numZigzags; i++) {
    const t = i / numZigzags;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    
    // Alternate between sides
    const side = i % 2 === 0 ? 1 : -1;
    
    // Calculate the zigzag point
    const zigX = x + perpX * width * side;
    const zigY = y + perpY * width * side;
    
    // Add noise if specified
    const nx = p5embroider.addNoise(zigX, stitchSettings.resampleNoise);
    const ny = p5embroider.addNoise(zigY, stitchSettings.resampleNoise);
    
    stitches.push({ x: nx, y: ny, jump: false });
  }
  
  return stitches;
}

/**
 * Create zigzag stitches from a set of straight stitches
 * @param {Array} stitches - Array of stitch objects
 * @param {number} width - Width of the zigzag
 * @returns {Array} - Array of zigzag stitch objects
 */
function zigzagStitches(stitches, width) {
  if (!stitches || stitches.length < 2) {
    return stitches;
  }
  
  const zigzagStitches = [];
  
  // For each segment in the path
  for (let i = 1; i < stitches.length; i++) {
    const p1 = stitches[i - 1];
    const p2 = stitches[i];
    
    // Calculate the direction vector
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    
    // Calculate the length of the segment
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // If the length is zero, skip this segment
    if (length === 0) {
      continue;
    }
    
    // Calculate the perpendicular vector
    const perpX = -dy / length;
    const perpY = dx / length;
    
    // Calculate the zigzag points
    const side = i % 2 === 0 ? 1 : -1;
    
    const zigX = p1.x + perpX * width * side;
    const zigY = p1.y + perpY * width * side;
    
    zigzagStitches.push({ x: zigX, y: zigY, jump: p1.jump });
  }
  
  // Add the last point
  if (stitches.length > 0) {
    zigzagStitches.push(stitches[stitches.length - 1]);
  }
  
  return zigzagStitches;
}

// Attach the functions to p5embroider
p5embroider.lineZigzagStitching = lineZigzagStitching;
p5embroider.zigzagStitches = zigzagStitches;

export default p5embroider; 