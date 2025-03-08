/**
 * Stitch pattern generation for p5.embroider
 * 
 * This module provides functions for generating stitch patterns.
 */

import p5embroider from '../main';

/**
 * Draw stitches using the current thread
 * @param {Array} stitches - Array of stitch objects
 * @param {number} threadIndex - Index of the thread to use
 */
p5embroider.drawStitches = function(stitches, threadIndex) {
  // Get the thread
  const thread = this.getThread(threadIndex);
  
  if (!thread || !stitches || stitches.length === 0) {
    return;
  }
  
  // Add stitches to the thread
  for (const stitch of stitches) {
    thread.addStitch(stitch);
    this._stitchData.stitchCount++;
  }
  
  // Draw the stitches if in stitch or realistic mode
  if (this._drawMode !== this.DRAW_MODE.P5) {
    const p5 = this._p5Instance;
    
    if (this._drawMode === this.DRAW_MODE.STITCH) {
      // Draw simple stitch visualization
      p5.push();
      p5.stroke(thread.color.r, thread.color.g, thread.color.b);
      p5.strokeWeight(1);
      
      for (let i = 1; i < stitches.length; i++) {
        const prev = stitches[i - 1];
        const curr = stitches[i];
        
        if (!curr.jump) {
          p5.line(prev.x, prev.y, curr.x, curr.y);
        }
      }
      
      p5.pop();
    } else if (this._drawMode === this.DRAW_MODE.REALISTIC) {
      // Draw realistic thread visualization
      // This will be implemented in rendering/realistic.js
    }
  }
};

/**
 * Convert a line to stitches
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @param {Object} stitchSettings - Stitch settings
 * @returns {Array} - Array of stitch objects
 */
p5embroider.convertLineToStitches = function(x1, y1, x2, y2, stitchSettings = this._embroiderySettings) {
  const stitches = [];
  
  // Calculate the distance between the points
  const distance = this.distance(x1, y1, x2, y2);
  
  // If the distance is too small, just return a single stitch
  if (distance < stitchSettings.minStitchLength) {
    stitches.push({ x: x1, y: y1, jump: false });
    return stitches;
  }
  
  // Calculate the number of stitches needed
  const numStitches = Math.ceil(distance / stitchSettings.stitchLength);
  
  // Calculate the step size
  const stepX = (x2 - x1) / numStitches;
  const stepY = (y2 - y1) / numStitches;
  
  // Generate stitches
  for (let i = 0; i <= numStitches; i++) {
    const x = x1 + stepX * i;
    const y = y1 + stepY * i;
    
    // Add noise if specified
    const nx = this.addNoise(x, stitchSettings.resampleNoise);
    const ny = this.addNoise(y, stitchSettings.resampleNoise);
    
    stitches.push({ x: nx, y: ny, jump: false });
  }
  
  return stitches;
};

/**
 * Create a zigzag pattern from a path
 * @param {Array} pathPoints - Array of point objects
 * @param {number} width - Width of the zigzag
 * @param {number} density - Density of the zigzag
 * @returns {Array} - Array of stitch objects
 */
p5embroider.createZigzagFromPath = function(pathPoints, width, density = this._embroiderySettings.stitchLength) {
  const stitches = [];
  
  if (!pathPoints || pathPoints.length < 2) {
    return stitches;
  }
  
  // For each segment in the path
  for (let i = 1; i < pathPoints.length; i++) {
    const p1 = pathPoints[i - 1];
    const p2 = pathPoints[i];
    
    // Calculate the direction vector
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    
    // Calculate the perpendicular vector
    const length = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / length;
    const perpY = dx / length;
    
    // Calculate the number of zigzags
    const numZigzags = Math.ceil(length / density);
    
    // Generate zigzag stitches
    for (let j = 0; j <= numZigzags; j++) {
      const t = j / numZigzags;
      const x = p1.x + dx * t;
      const y = p1.y + dy * t;
      
      // Alternate between sides
      const side = j % 2 === 0 ? 1 : -1;
      
      // Calculate the zigzag point
      const zigX = x + perpX * width * side;
      const zigY = y + perpY * width * side;
      
      stitches.push({ x: zigX, y: zigY, jump: false });
    }
  }
  
  return stitches;
};

/**
 * Create a tatami fill pattern
 * @param {number} x - X coordinate of the top-left corner
 * @param {number} y - Y coordinate of the top-left corner
 * @param {number} w - Width of the fill area
 * @param {number} h - Height of the fill area
 * @param {Object} stitchSettings - Stitch settings
 * @returns {Array} - Array of stitch objects
 */
p5embroider.createTatamiFill = function(x, y, w, h, stitchSettings = this._fillSettings) {
  const stitches = [];
  
  // Calculate the stitch width (spacing between rows)
  const stitchWidth = stitchSettings.spacing || stitchSettings.stitchWidth;
  
  // Get the angle from settings
  const angle = stitchSettings.angle || 0;
  
  // Calculate sine and cosine of the angle
  const sin_angle = Math.sin(angle);
  const cos_angle = Math.cos(angle);
  
  // Define the rectangle corners
  const points = [
    { x: x, y: y },
    { x: x + w, y: y },
    { x: x + w, y: y + h },
    { x: x, y: y + h },
  ];
  
  // Rotate points
  const rotated = points.map((p) => ({
    x: (p.x - x) * cos_angle - (p.y - y) * sin_angle,
    y: (p.x - x) * sin_angle + (p.y - y) * cos_angle,
  }));
  
  // Find bounds of rotated rectangle
  const minX = Math.min(...rotated.map((p) => p.x));
  const maxX = Math.max(...rotated.map((p) => p.x));
  const minY = Math.min(...rotated.map((p) => p.y));
  const maxY = Math.max(...rotated.map((p) => p.y));
  
  // Calculate number of rows needed
  const numRows = Math.ceil((maxY - minY) / stitchWidth);
  
  // Generate rows of stitches
  let forward = true;
  for (let i = 0; i <= numRows; i++) {
    const rowY = minY + i * stitchWidth;
    
    // Calculate row endpoints
    const rowX1 = forward ? minX : maxX;
    const rowX2 = forward ? maxX : minX;
    
    // Add stitches for this row
    stitches.push(...this.convertLineToStitches(rowX1, rowY, rowX2, rowY, stitchSettings));
    
    forward = !forward; // Alternate direction for next row
  }
  
  return stitches;
};

export default p5embroider; 