/**
 * Math utilities for embroidery
 * 
 * This module provides mathematical functions for embroidery calculations.
 */

import p5embroider from '../core/main';

/**
 * Calculate the angle between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} - Angle in radians
 */
p5embroider.calculateAngle = function(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
};

/**
 * Calculate a point at a given distance and angle from another point
 * @param {number} x - X coordinate of the starting point
 * @param {number} y - Y coordinate of the starting point
 * @param {number} distance - Distance to the new point
 * @param {number} angle - Angle in radians
 * @returns {Object} - Object with x and y properties
 */
p5embroider.calculatePoint = function(x, y, distance, angle) {
  return {
    x: x + Math.cos(angle) * distance,
    y: y + Math.sin(angle) * distance
  };
};

/**
 * Calculate the perpendicular vector to a line
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {Object} - Object with x and y properties (unit vector)
 */
p5embroider.calculatePerpendicular = function(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: -dy / length,
    y: dx / length
  };
};

/**
 * Calculate the intersection point of two lines
 * @param {number} x1 - X coordinate of first line's first point
 * @param {number} y1 - Y coordinate of first line's first point
 * @param {number} x2 - X coordinate of first line's second point
 * @param {number} y2 - Y coordinate of first line's second point
 * @param {number} x3 - X coordinate of second line's first point
 * @param {number} y3 - Y coordinate of second line's first point
 * @param {number} x4 - X coordinate of second line's second point
 * @param {number} y4 - Y coordinate of second line's second point
 * @returns {Object|null} - Object with x and y properties, or null if no intersection
 */
p5embroider.calculateIntersection = function(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Calculate the denominator
  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  
  // If the denominator is zero, the lines are parallel
  if (denominator === 0) {
    return null;
  }
  
  // Calculate the ua and ub parameters
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
  
  // If ua and ub are between 0 and 1, the intersection is within both line segments
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    // Calculate the intersection point
    const x = x1 + ua * (x2 - x1);
    const y = y1 + ua * (y2 - y1);
    
    return { x, y };
  }
  
  // Otherwise, the line segments don't intersect
  return null;
};

/**
 * Calculate the distance from a point to a line
 * @param {number} px - X coordinate of the point
 * @param {number} py - Y coordinate of the point
 * @param {number} x1 - X coordinate of the line's first point
 * @param {number} y1 - Y coordinate of the line's first point
 * @param {number} x2 - X coordinate of the line's second point
 * @param {number} y2 - Y coordinate of the line's second point
 * @returns {number} - Distance from the point to the line
 */
p5embroider.calculateDistanceToLine = function(px, py, x1, y1, x2, y2) {
  // Calculate the length of the line
  const lineLength = this.distance(x1, y1, x2, y2);
  
  // If the line has zero length, return the distance to the point
  if (lineLength === 0) {
    return this.distance(px, py, x1, y1);
  }
  
  // Calculate the projection of the point onto the line
  const t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (lineLength * lineLength);
  
  // If t is outside [0, 1], the closest point is one of the endpoints
  if (t < 0) {
    return this.distance(px, py, x1, y1);
  }
  if (t > 1) {
    return this.distance(px, py, x2, y2);
  }
  
  // Calculate the closest point on the line
  const closestX = x1 + t * (x2 - x1);
  const closestY = y1 + t * (y2 - y1);
  
  // Return the distance to the closest point
  return this.distance(px, py, closestX, closestY);
};

/**
 * Calculate the area of a polygon
 * @param {Array} points - Array of point objects with x and y properties
 * @returns {number} - Area of the polygon
 */
p5embroider.calculatePolygonArea = function(points) {
  if (!points || points.length < 3) {
    return 0;
  }
  
  let area = 0;
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
};

/**
 * Calculate the centroid of a polygon
 * @param {Array} points - Array of point objects with x and y properties
 * @returns {Object} - Object with x and y properties
 */
p5embroider.calculatePolygonCentroid = function(points) {
  if (!points || points.length < 3) {
    return { x: 0, y: 0 };
  }
  
  let area = 0;
  let cx = 0;
  let cy = 0;
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const factor = points[i].x * points[j].y - points[j].x * points[i].y;
    
    area += factor;
    cx += (points[i].x + points[j].x) * factor;
    cy += (points[i].y + points[j].y) * factor;
  }
  
  area /= 2;
  cx /= 6 * area;
  cy /= 6 * area;
  
  return { x: cx, y: cy };
};

export default p5embroider; 