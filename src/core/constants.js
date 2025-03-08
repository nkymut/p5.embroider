/**
 * Constants for p5.embroider
 */

import p5embroider from './main';

// Debug mode flag
p5embroider.DEBUG = false;

// Stroke mode constants
p5embroider.STROKE_MODE = {
  ZIGZAG: 'zigzag',
  LINES: 'lines',
  SASHIKO: 'sashiko',
  STRAIGHT: 'straight',
  MULTILINE: 'multiline'
};

// Fill mode constants
p5embroider.FILL_MODE = {
  TATAMI: 'tatami',
  SATIN: 'satin',
  SPIRAL: 'spiral'
};

// Draw mode constants
p5embroider.DRAW_MODE = {
  STITCH: 'stitch',
  P5: 'p5',
  REALISTIC: 'realistic'
};

// Units constants
p5embroider.UNITS = {
  MM: 'mm',
  INCH: 'inch',
  PIXEL: 'px'
};

// Default DPI value for unit conversions
p5embroider.DEFAULT_DPI = 96;

export default p5embroider; 