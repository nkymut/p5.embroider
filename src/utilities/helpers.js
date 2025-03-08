/**
 * Helper functions for p5.embroider
 * 
 * This module provides utility functions used throughout the library.
 */

import p5embroider from '../core/main';

/**
 * Convert millimeters to pixels
 * @param {number} mm - Value in millimeters
 * @param {number} dpi - DPI value (default: 96)
 * @returns {number} - Value in pixels
 */
p5embroider.mmToPixel = function(mm, dpi = this.DEFAULT_DPI) {
  // 1 inch = 25.4 mm
  // pixels = mm * (dpi / 25.4)
  return mm * (dpi / 25.4);
};

/**
 * Convert pixels to millimeters
 * @param {number} pixels - Value in pixels
 * @param {number} dpi - DPI value (default: 96)
 * @returns {number} - Value in millimeters
 */
p5embroider.pixelToMm = function(pixels, dpi = this.DEFAULT_DPI) {
  // 1 inch = 25.4 mm
  // mm = pixels * (25.4 / dpi)
  return pixels * (25.4 / dpi);
};

/**
 * Calculate the distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} - Distance between the points
 */
p5embroider.distance = function(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} amt - Amount to interpolate (0-1)
 * @returns {number} - Interpolated value
 */
p5embroider.lerp = function(start, end, amt) {
  return start + (end - start) * amt;
};

/**
 * Map a value from one range to another
 * @param {number} value - The value to map
 * @param {number} start1 - Start of the input range
 * @param {number} stop1 - End of the input range
 * @param {number} start2 - Start of the output range
 * @param {number} stop2 - End of the output range
 * @returns {number} - Mapped value
 */
p5embroider.map = function(value, start1, stop1, start2, stop2) {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
};

/**
 * Constrain a value to a range
 * @param {number} value - The value to constrain
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Constrained value
 */
p5embroider.constrain = function(value, min, max) {
  return Math.min(Math.max(value, min), max);
};

/**
 * Add noise to a value
 * @param {number} value - The value to add noise to
 * @param {number} amount - Amount of noise (0-1)
 * @returns {number} - Value with noise added
 */
p5embroider.addNoise = function(value, amount) {
  if (amount <= 0) return value;
  return value + (Math.random() * 2 - 1) * amount;
};

export default p5embroider; 