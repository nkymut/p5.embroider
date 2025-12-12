/**
 * p5.embroider Unit Conversion Utilities
 * Functions for converting between different units (mm, pixels, inches, etc.)
 */

/**
 * Converts millimeters to pixels.
 * @method mmToPixel
 * @param {Number} mm - Millimeters
 * @param {Number} dpi - Dots per inch (default: 96)
 * @return {Number} Pixels
 * @example
 *
 * function setup() {
 *   let pixels = mmToPixel(10); // Convert 10mm to pixels
 *   if(_DEBUG) console.log(pixels);
 * }
 *
 */
export function mmToPixel(mm, dpi = 96) {
  // Guard against invalid DPI to avoid Infinity/NaN propagation in consumers/tests
  if (dpi === 0) return 0;
  return (mm / 25.4) * dpi;
}

/**
 * Converts pixels to millimeters.
 * @method pixelToMm
 * @param {Number} pixels - Pixels
 * @param {Number} dpi - Dots per inch (default: 96)
 * @return {Number} Millimeters
 * @example
 *
 * function setup() {
 *   let mm = pixelToMm(100); // Convert 100 pixels to mm
 *   if(_DEBUG) console.log(mm);
 * }
 *
 */
export function pixelToMm(pixels, dpi = 96) {
  // Guard against invalid DPI to avoid Infinity/NaN propagation in consumers/tests
  if (dpi === 0) return 0;
  return (pixels * 25.4) / dpi;
}

/**
 * Alias for pixelToMm - converts pixels to millimeters.
 * @method px2mm
 * @param {Number} pixels - Pixels
 * @param {Number} dpi - Dots per inch (default: 96)
 * @return {Number} Millimeters
 */
export function px2mm(pixels, dpi = 96) {
  return pixelToMm(pixels, dpi);
}

/**
 * Alias for mmToPixel - converts millimeters to pixels.
 * @method mm2px
 * @param {Number} mm - Millimeters
 * @param {Number} dpi - Dots per inch (default: 96)
 * @return {Number} Pixels
 */
export function mm2px(mm, dpi = 96) {
  return mmToPixel(mm, dpi);
}

/**
 * Converts inches to millimeters.
 * @method inchToMm
 * @param {Number} inches - Inches
 * @return {Number} Millimeters
 */
export function inchToMm(inches) {
  return inches * 25.4;
}

/**
 * Converts millimeters to inches.
 * @method mmToInch
 * @param {Number} mm - Millimeters
 * @return {Number} Inches
 */
export function mmToInch(mm) {
  return mm / 25.4;
}

/**
 * Converts inches to pixels.
 * @method inchToPixel
 * @param {Number} inches - Inches
 * @param {Number} dpi - Dots per inch (default: 96)
 * @return {Number} Pixels
 */
export function inchToPixel(inches, dpi = 96) {
  return inches * dpi;
}

/**
 * Converts pixels to inches.
 * @method pixelToInch
 * @param {Number} pixels - Pixels
 * @param {Number} dpi - Dots per inch (default: 96)
 * @return {Number} Inches
 */
export function pixelToInch(pixels, dpi = 96) {
  return pixels / dpi;
}
