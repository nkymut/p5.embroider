/**
 * Unit conversion utilities for p5.embroider
 * 
 * This module provides functions for converting between different units.
 */

import p5embroider from '../core/main';

/**
 * Convert millimeters to inches
 * @param {number} mm - Value in millimeters
 * @returns {number} - Value in inches
 */
p5embroider.mmToInch = function(mm) {
  // 1 inch = 25.4 mm
  return mm / 25.4;
};

/**
 * Convert inches to millimeters
 * @param {number} inch - Value in inches
 * @returns {number} - Value in millimeters
 */
p5embroider.inchToMm = function(inch) {
  // 1 inch = 25.4 mm
  return inch * 25.4;
};

/**
 * Convert inches to pixels
 * @param {number} inch - Value in inches
 * @param {number} dpi - DPI value (default: 96)
 * @returns {number} - Value in pixels
 */
p5embroider.inchToPixel = function(inch, dpi = this.DEFAULT_DPI) {
  return inch * dpi;
};

/**
 * Convert pixels to inches
 * @param {number} pixels - Value in pixels
 * @param {number} dpi - DPI value (default: 96)
 * @returns {number} - Value in inches
 */
p5embroider.pixelToInch = function(pixels, dpi = this.DEFAULT_DPI) {
  return pixels / dpi;
};

/**
 * Convert a value from one unit to another
 * @param {number} value - The value to convert
 * @param {string} fromUnit - The unit to convert from ('mm', 'inch', 'px')
 * @param {string} toUnit - The unit to convert to ('mm', 'inch', 'px')
 * @param {number} dpi - DPI value (default: 96)
 * @returns {number} - Converted value
 */
p5embroider.convertUnits = function(value, fromUnit, toUnit, dpi = this.DEFAULT_DPI) {
  // Normalize units
  fromUnit = fromUnit.toLowerCase();
  toUnit = toUnit.toLowerCase();
  
  // If units are the same, return the value
  if (fromUnit === toUnit) return value;
  
  // Convert to mm as an intermediate step
  let mmValue;
  
  switch (fromUnit) {
    case 'mm':
      mmValue = value;
      break;
    case 'inch':
      mmValue = this.inchToMm(value);
      break;
    case 'px':
      mmValue = this.pixelToMm(value, dpi);
      break;
    default:
      console.warn(`Invalid from unit: ${fromUnit}`);
      return value;
  }
  
  // Convert from mm to the target unit
  switch (toUnit) {
    case 'mm':
      return mmValue;
    case 'inch':
      return this.mmToInch(mmValue);
    case 'px':
      return this.mmToPixel(mmValue, dpi);
    default:
      console.warn(`Invalid to unit: ${toUnit}`);
      return value;
  }
};

export default p5embroider; 