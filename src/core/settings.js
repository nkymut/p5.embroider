/**
 * Settings for p5.embroider
 * 
 * This module manages global settings for embroidery.
 */

import p5embroider from './main';

// Default embroidery settings
const _embroiderySettings = {
  stitchLength: 3, // mm
  stitchWidth: 0, // mm
  minStitchLength: 1, // mm
  resampleNoise: 0, // 0-1 range
  minimumPathLength: 0,
  maximumJoinDistance: 0,
  maximumStitchesPerSquareMm: 0,
  jumpThreshold: 10, // mm
  units: 'mm'
};

// Default fill settings
const _fillSettings = {
  stitchLength: 3, // mm
  stitchWidth: 0.2, // mm
  minStitchLength: 0.5, // mm
  resampleNoise: 0, // 0-1 range
  angle: 0, // Angle in radians
  spacing: 3, // Space between rows in mm
  tieDistance: 15, // Distance between tie-down stitches in mm
  alternateAngle: false, // Whether to alternate angles between shapes
  color: { r: 0, g: 0, b: 0 }
};

// Default stroke settings
const _strokeSettings = {
  stitchLength: 3, // mm
  stitchWidth: 0.2, // mm
  minStitchLength: 1, // mm
  resampleNoise: 0, // 0-1 range
  strokeWeight: 0 // Width of the embroidery line
};

// Attach settings to p5embroider
p5embroider._embroiderySettings = _embroiderySettings;
p5embroider._fillSettings = _fillSettings;
p5embroider._strokeSettings = _strokeSettings;

// Track if stroke and fill are enabled
p5embroider._doStroke = false;
p5embroider._doFill = false;

// Track current stroke and fill modes
p5embroider._currentStrokeMode = p5embroider.STROKE_MODE.ZIGZAG;
p5embroider._currentFillMode = p5embroider.FILL_MODE.TATAMI;

// Track current stroke and fill thread indices
p5embroider._strokeThreadIndex = 0;
p5embroider._fillThreadIndex = 0;

// Method to set embroidery settings
p5embroider.setEmbroiderySettings = function(settings) {
  Object.assign(this._embroiderySettings, settings);
  return this;
};

// Method to set fill settings
p5embroider.setFillSettings = function(settings) {
  Object.assign(this._fillSettings, settings);
  return this;
};

// Method to set stroke settings
p5embroider.setStrokeSettings = function(settings) {
  Object.assign(this._strokeSettings, settings);
  return this;
};

// Method to set stroke mode
p5embroider.setStrokeMode = function(mode) {
  if (Object.values(this.STROKE_MODE).includes(mode)) {
    this._currentStrokeMode = mode;
  } else {
    console.warn(`Invalid stroke mode: ${mode}. Using default: ${this._currentStrokeMode}`);
  }
  return this;
};

// Method to set fill mode
p5embroider.setFillMode = function(mode) {
  if (Object.values(this.FILL_MODE).includes(mode)) {
    this._currentFillMode = mode;
  } else {
    console.warn(`Invalid fill mode: ${mode}. Using default: ${this._currentFillMode}`);
  }
  return this;
};

export default p5embroider; 