/**
 * Thread management for p5.embroider
 * 
 * This module provides the Thread class and thread management functions.
 */

import p5embroider from '../core/main';

/**
 * Thread class for managing thread properties
 */
class Thread {
  /**
   * Create a new thread
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   * @param {number} weight - Thread weight (default: 0.2)
   */
  constructor(r, g, b, weight = 0.2) {
    this.color = { r, g, b };
    this.weight = weight;
    this.stitches = [];
  }

  /**
   * Add a stitch to this thread
   * @param {Object} stitch - The stitch to add
   */
  addStitch(stitch) {
    this.stitches.push(stitch);
  }

  /**
   * Get the color as a p5.js color
   * @param {Object} p5Instance - The p5 instance
   * @returns {Object} - The p5.js color object
   */
  getP5Color(p5Instance) {
    return p5Instance.color(this.color.r, this.color.g, this.color.b);
  }

  /**
   * Get the hex color string
   * @returns {string} - The hex color string
   */
  getHexColor() {
    const { r, g, b } = this.color;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Get the number of stitches in this thread
   * @returns {number} - The number of stitches
   */
  getStitchCount() {
    return this.stitches.length;
  }
}

// Method to add a thread to the stitch data
p5embroider.addThread = function(r, g, b, weight = 0.2) {
  const thread = new Thread(r, g, b, weight);
  this._stitchData.threads.push(thread);
  return this._stitchData.threads.length - 1; // Return the index of the new thread
};

// Method to get a thread by index
p5embroider.getThread = function(index) {
  if (index >= 0 && index < this._stitchData.threads.length) {
    return this._stitchData.threads[index];
  }
  return null;
};

// Method to set the current stroke thread
p5embroider.setStrokeThread = function(index) {
  if (index >= 0 && index < this._stitchData.threads.length) {
    this._strokeThreadIndex = index;
  } else {
    console.warn(`Invalid thread index: ${index}`);
  }
  return this;
};

// Method to set the current fill thread
p5embroider.setFillThread = function(index) {
  if (index >= 0 && index < this._stitchData.threads.length) {
    this._fillThreadIndex = index;
  } else {
    console.warn(`Invalid thread index: ${index}`);
  }
  return this;
};

// Export the Thread class
p5embroider.Thread = Thread;

export default p5embroider; 