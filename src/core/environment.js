/**
 * Environment for p5.embroider
 * 
 * This module sets up the environment and handles configuration.
 */

import p5embroider from './main';

// Method to set debug mode
p5embroider.setDebugMode = function(debug) {
  this.DEBUG = !!debug;
  return this;
};

// Method to get the current p5 instance
p5embroider.getP5Instance = function() {
  return this._p5Instance;
};

// Method to set the units for measurements
p5embroider.setUnits = function(units) {
  if (Object.values(this.UNITS).includes(units)) {
    this._embroiderySettings.units = units;
  } else {
    console.warn(`Invalid units: ${units}. Using default: ${this._embroiderySettings.units}`);
  }
  return this;
};

// Method to set the pixels per unit ratio
p5embroider.setPixelsPerUnit = function(pixelsPerUnit) {
  if (typeof pixelsPerUnit === 'number' && pixelsPerUnit > 0) {
    this._stitchData.pixelsPerUnit = pixelsPerUnit;
  } else {
    console.warn(`Invalid pixels per unit: ${pixelsPerUnit}. Using default: ${this._stitchData.pixelsPerUnit}`);
  }
  return this;
};

// Method to get the current stitch count
p5embroider.getStitchCount = function() {
  return this._stitchData.stitchCount;
};

// Method to get the current thread count
p5embroider.getThreadCount = function() {
  return this._stitchData.threads.length;
};

// Method to get the current stitch data
p5embroider.getStitchData = function() {
  return Object.assign({}, this._stitchData);
};

export default p5embroider; 