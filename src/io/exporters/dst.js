/**
 * DST file format exporter for p5.embroider
 * 
 * This module provides functions for exporting embroidery data to the DST file format.
 */

import p5embroider from '../../core/main';

/**
 * DSTWriter class for writing DST files
 */
class DSTWriter {
  /**
   * Create a new DSTWriter
   */
  constructor() {
    this.stitches = [];
    this.minX = Number.MAX_VALUE;
    this.minY = Number.MAX_VALUE;
    this.maxX = Number.MIN_VALUE;
    this.maxY = Number.MIN_VALUE;
  }

  /**
   * Add a stitch to the DST file
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {boolean} jump - Whether this is a jump stitch
   */
  addStitch(x, y, jump = false) {
    this.stitches.push({ x, y, jump });
    
    // Update bounds
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
  }

  /**
   * Generate the DST file header
   * @param {string} name - Design name
   * @returns {Uint8Array} - Header bytes
   */
  generateHeader(name = 'Embroidery') {
    // Create a 512-byte header
    const header = new Uint8Array(512);
    
    // Fill with spaces
    header.fill(0x20);
    
    // LA: design name
    const designName = name.slice(0, 16).padEnd(16, ' ');
    for (let i = 0; i < 16; i++) {
      header[i] = designName.charCodeAt(i);
    }
    
    // Calculate stitch count
    const stitchCount = this.stitches.length;
    
    // PCS: stitch count
    const pcsStr = stitchCount.toString().padStart(7, '0');
    for (let i = 0; i < 7; i++) {
      header[24 + i] = pcsStr.charCodeAt(i);
    }
    
    // CO: color changes
    header[48] = 0x30; // '0'
    header[49] = 0x31; // '1'
    
    // Calculate bounds in 0.1mm units
    const minX = Math.floor(this.minX * 10);
    const minY = Math.floor(this.minY * 10);
    const maxX = Math.ceil(this.maxX * 10);
    const maxY = Math.ceil(this.maxY * 10);
    
    // +X, -X, +Y, -Y: design extents
    const xPlusStr = maxX.toString().padStart(5, '0');
    const xMinusStr = Math.abs(minX).toString().padStart(5, '0');
    const yPlusStr = maxY.toString().padStart(5, '0');
    const yMinusStr = Math.abs(minY).toString().padStart(5, '0');
    
    for (let i = 0; i < 5; i++) {
      header[64 + i] = xPlusStr.charCodeAt(i);
      header[70 + i] = xMinusStr.charCodeAt(i);
      header[76 + i] = yPlusStr.charCodeAt(i);
      header[82 + i] = yMinusStr.charCodeAt(i);
    }
    
    // AX, AY: design center point
    const centerX = Math.round((maxX + minX) / 2);
    const centerY = Math.round((maxY + minY) / 2);
    
    const axStr = centerX.toString().padStart(6, '0');
    const ayStr = centerY.toString().padStart(6, '0');
    
    for (let i = 0; i < 6; i++) {
      header[88 + i] = axStr.charCodeAt(i);
      header[94 + i] = ayStr.charCodeAt(i);
    }
    
    // End of header marker
    header[511] = 0x1A;
    
    return header;
  }

  /**
   * Encode a stitch as a DST stitch record
   * @param {number} dx - X delta in 0.1mm units
   * @param {number} dy - Y delta in 0.1mm units
   * @param {boolean} jump - Whether this is a jump stitch
   * @returns {Uint8Array} - DST stitch record (3 bytes)
   */
  encodeStitch(dx, dy, jump) {
    // Clamp deltas to DST limits (-121 to 121)
    dx = Math.max(-121, Math.min(121, dx));
    dy = Math.max(-121, Math.min(121, dy));
    
    // Convert to DST encoding
    const x = Math.abs(dx);
    const y = Math.abs(dy);
    
    const xsign = dx < 0 ? 1 : 0;
    const ysign = dy < 0 ? 1 : 0;
    
    // Encode stitch record
    const b0 = (y & 0x0F) | ((x & 0x0F) << 4);
    const b1 = (xsign << 2) | (ysign << 3) | ((x & 0x70) >> 4) | ((y & 0x70) >> 4);
    const b2 = 0x03 | (jump ? 0x80 : 0x00);
    
    return new Uint8Array([b0, b1, b2]);
  }

  /**
   * Generate the DST file content
   * @param {string} name - Design name
   * @returns {Uint8Array} - DST file content
   */
  generate(name = 'Embroidery') {
    // Generate header
    const header = this.generateHeader(name);
    
    // Calculate stitch records size
    const stitchRecordsSize = this.stitches.length * 3 + 3; // +3 for end of file marker
    
    // Create output buffer
    const output = new Uint8Array(header.length + stitchRecordsSize);
    
    // Copy header to output
    output.set(header, 0);
    
    // Previous stitch position
    let prevX = 0;
    let prevY = 0;
    
    // Write stitch records
    for (let i = 0; i < this.stitches.length; i++) {
      const stitch = this.stitches[i];
      
      // Convert to 0.1mm units
      const x = Math.round(stitch.x * 10);
      const y = Math.round(stitch.y * 10);
      
      // Calculate delta
      const dx = x - prevX;
      const dy = y - prevY;
      
      // If delta is too large, split into multiple stitches
      if (Math.abs(dx) > 121 || Math.abs(dy) > 121) {
        // Calculate number of jumps needed
        const jumps = Math.max(
          Math.ceil(Math.abs(dx) / 121),
          Math.ceil(Math.abs(dy) / 121)
        );
        
        // Calculate step size
        const stepX = dx / jumps;
        const stepY = dy / jumps;
        
        // Write jumps
        for (let j = 0; j < jumps; j++) {
          const jx = Math.round(prevX + stepX * (j + 1));
          const jy = Math.round(prevY + stepY * (j + 1));
          
          const jdx = jx - prevX;
          const jdy = jy - prevY;
          
          const record = this.encodeStitch(jdx, jdy, true);
          output.set(record, header.length + i * 3 + j * 3);
          
          prevX = jx;
          prevY = jy;
        }
      } else {
        // Write single stitch
        const record = this.encodeStitch(dx, dy, stitch.jump);
        output.set(record, header.length + i * 3);
        
        prevX = x;
        prevY = y;
      }
    }
    
    // Write end of file marker
    output.set(new Uint8Array([0, 0, 0xF3]), header.length + this.stitches.length * 3);
    
    return output;
  }
}

/**
 * Export stitch data to a DST file
 * @param {Object} stitchData - Stitch data object
 * @param {string} name - Design name
 * @returns {Uint8Array} - DST file content
 */
p5embroider.exportDST = function(stitchData, name = 'Embroidery') {
  // Create a new DST writer
  const writer = new DSTWriter();
  
  // Add stitches from all threads
  for (const thread of stitchData.threads) {
    for (const stitch of thread.stitches) {
      writer.addStitch(stitch.x, stitch.y, stitch.jump);
    }
  }
  
  // Generate the DST file
  return writer.generate(name);
};

// Attach the DSTWriter class to p5embroider
p5embroider.DSTWriter = DSTWriter;

export default p5embroider; 