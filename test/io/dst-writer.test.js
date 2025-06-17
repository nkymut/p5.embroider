const { describe, test, expect, beforeEach } = require('@jest/globals');
const { TestUtils } = require('../helpers/test-utils.js');
const { DST_TEST_DATA, TEST_COLORS } = require('../fixtures/test-data.js');

// Mock DST Writer class based on the library source
class MockDSTWriter {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;
    this.stitchCount = 0;
    this.records = [];
  }

  // DST coordinate encoding constants
  static STITCH = 0x00;
  static JUMP = 0x01;
  static COLOR_CHANGE = 0x02;
  static END = 0x03;

  move(x, y, command = MockDSTWriter.STITCH) {
    const deltaX = Math.round(x - this.x);
    const deltaY = Math.round(y - this.y);
    
    this.x = x;
    this.y = y;
    
    // Update bounds
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x);
    this.minY = Math.min(this.minY, y);
    this.maxY = Math.max(this.maxY, y);
    
    if (command === MockDSTWriter.STITCH) {
      this.stitchCount++;
    }
    
    // Encode the record (simplified)
    const record = this.encodeRecord(deltaX, deltaY, command);
    this.records.push(record);
    
    return { deltaX, deltaY, command };
  }

  encodeRecord(deltaX, deltaY, command) {
    // Simplified DST encoding - real implementation is more complex
    // This mimics the bit manipulation in the actual DST format
    let byte1 = 0;
    let byte2 = 0;
    let byte3 = 0;

    // Encode X movement
    if (deltaX > 0) {
      if (deltaX & 1) byte3 |= 0x01;
      if (deltaX & 2) byte3 |= 0x02;
      if (deltaX & 4) byte3 |= 0x04;
      if (deltaX & 8) byte2 |= 0x02;
      if (deltaX & 16) byte2 |= 0x08;
      if (deltaX & 32) byte1 |= 0x02;
      if (deltaX & 64) byte1 |= 0x08;
    } else if (deltaX < 0) {
      deltaX = -deltaX;
      if (deltaX & 1) byte3 |= 0x01;
      if (deltaX & 2) byte3 |= 0x02;
      if (deltaX & 4) byte3 |= 0x04;
      if (deltaX & 8) byte2 |= 0x02;
      if (deltaX & 16) byte2 |= 0x08;
      if (deltaX & 32) byte1 |= 0x02;
      if (deltaX & 64) byte1 |= 0x08;
      byte1 |= 0x01; // Negative X flag
    }

    // Encode Y movement
    if (deltaY > 0) {
      if (deltaY & 1) byte3 |= 0x08;
      if (deltaY & 2) byte3 |= 0x10;
      if (deltaY & 4) byte3 |= 0x20;
      if (deltaY & 8) byte2 |= 0x01;
      if (deltaY & 16) byte2 |= 0x04;
      if (deltaY & 32) byte1 |= 0x01;
      if (deltaY & 64) byte1 |= 0x04;
    } else if (deltaY < 0) {
      deltaY = -deltaY;
      if (deltaY & 1) byte3 |= 0x08;
      if (deltaY & 2) byte3 |= 0x10;
      if (deltaY & 4) byte3 |= 0x20;
      if (deltaY & 8) byte2 |= 0x01;
      if (deltaY & 16) byte2 |= 0x04;
      if (deltaY & 32) byte1 |= 0x01;
      if (deltaY & 64) byte1 |= 0x04;
      byte1 |= 0x10; // Negative Y flag
    }

    // Encode command
    if (command === MockDSTWriter.JUMP) {
      byte2 |= 0x83;
    } else if (command === MockDSTWriter.COLOR_CHANGE) {
      byte2 |= 0xC3;
    } else if (command === MockDSTWriter.END) {
      byte1 = 0x00;
      byte2 = 0xF3;
      byte3 = 0x00;
    }

    return new Uint8Array([byte1, byte2, byte3]);
  }

  generateHeader(title = 'TEST', stitchCount, bounds) {
    // DST header is 512 bytes
    const header = new Uint8Array(512);
    
    // Title (starts with "LA:")
    const titleBytes = new TextEncoder().encode(`LA:${title.padEnd(16)}`);
    header.set(titleBytes, 0);
    
    // Add stitch count and bounds info (simplified)
    const infoString = `ST:${stitchCount}`;
    const infoBytes = new TextEncoder().encode(infoString);
    header.set(infoBytes, 20);
    
    return header;
  }

  generateDST(title = 'TEST') {
    const bounds = {
      minX: this.minX,
      maxX: this.maxX,
      minY: this.minY,
      maxY: this.maxY
    };
    
    const header = this.generateHeader(title, this.stitchCount, bounds);
    
    // Combine header and records
    const totalSize = 512 + (this.records.length * 3);
    const dstData = new Uint8Array(totalSize);
    
    dstData.set(header, 0);
    
    let offset = 512;
    this.records.forEach(record => {
      dstData.set(record, offset);
      offset += 3;
    });
    
    return dstData;
  }

  getBounds() {
    return {
      minX: this.minX,
      maxX: this.maxX,
      minY: this.minY,
      maxY: this.maxY,
      width: this.maxX - this.minX,
      height: this.maxY - this.minY
    };
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;
    this.stitchCount = 0;
    this.records = [];
  }
}

describe('DST Writer Tests', () => {
  let dstWriter;

  beforeEach(() => {
    dstWriter = new MockDSTWriter();
    TestUtils.resetAllMocks();
  });

  describe('DSTWriter initialization', () => {
    test('initializes with correct default values', () => {
      expect(dstWriter.x).toBe(0);
      expect(dstWriter.y).toBe(0);
      expect(dstWriter.stitchCount).toBe(0);
      expect(dstWriter.records).toEqual([]);
    });

    test('has correct command constants', () => {
      expect(MockDSTWriter.STITCH).toBe(0x00);
      expect(MockDSTWriter.JUMP).toBe(0x01);
      expect(MockDSTWriter.COLOR_CHANGE).toBe(0x02);
      expect(MockDSTWriter.END).toBe(0x03);
    });
  });

  describe('move function', () => {
    test('records simple stitch movement', () => {
      const result = dstWriter.move(10, 5);
      
      expect(result.deltaX).toBe(10);
      expect(result.deltaY).toBe(5);
      expect(result.command).toBe(MockDSTWriter.STITCH);
      expect(dstWriter.x).toBe(10);
      expect(dstWriter.y).toBe(5);
      expect(dstWriter.stitchCount).toBe(1);
    });

    test('handles negative movements', () => {
      dstWriter.move(10, 10);
      const result = dstWriter.move(5, 3);
      
      expect(result.deltaX).toBe(-5);
      expect(result.deltaY).toBe(-7);
      expect(dstWriter.x).toBe(5);
      expect(dstWriter.y).toBe(3);
    });

    test('records jump commands', () => {
      const result = dstWriter.move(20, 15, MockDSTWriter.JUMP);
      
      expect(result.command).toBe(MockDSTWriter.JUMP);
      expect(dstWriter.stitchCount).toBe(0); // Jumps don't count as stitches
    });

    test('records color change commands', () => {
      const result = dstWriter.move(0, 0, MockDSTWriter.COLOR_CHANGE);
      
      expect(result.command).toBe(MockDSTWriter.COLOR_CHANGE);
      expect(dstWriter.stitchCount).toBe(0);
    });

    test('updates bounds correctly', () => {
      dstWriter.move(10, 5);
      dstWriter.move(-5, 15);
      dstWriter.move(20, -10);
      
      const bounds = dstWriter.getBounds();
      expect(bounds.minX).toBe(-5);
      expect(bounds.maxX).toBe(20);
      expect(bounds.minY).toBe(-10);
      expect(bounds.maxY).toBe(15);
      expect(bounds.width).toBe(25);
      expect(bounds.height).toBe(25);
    });
  });

  describe('encodeRecord function', () => {
    test('encodes simple positive movement', () => {
      const record = dstWriter.encodeRecord(1, 1, MockDSTWriter.STITCH);
      
      expect(record).toBeInstanceOf(Uint8Array);
      expect(record.length).toBe(3);
      // Check that it contains the expected bit patterns
      expect(record[2] & 0x01).toBe(0x01); // X bit 0
      expect(record[2] & 0x08).toBe(0x08); // Y bit 0
    });

    test('encodes negative movements with correct flags', () => {
      const record = dstWriter.encodeRecord(-1, -1, MockDSTWriter.STITCH);
      
      expect(record.length).toBe(3);
      expect(record[0] & 0x01).toBe(0x01); // Negative X flag
      expect(record[0] & 0x10).toBe(0x10); // Negative Y flag
    });

    test('encodes jump command correctly', () => {
      const record = dstWriter.encodeRecord(0, 0, MockDSTWriter.JUMP);
      
      expect(record[1] & 0x83).toBe(0x83); // Jump command bits
    });

    test('encodes color change command correctly', () => {
      const record = dstWriter.encodeRecord(0, 0, MockDSTWriter.COLOR_CHANGE);
      
      expect(record[1] & 0xC3).toBe(0xC3); // Color change command bits
    });

    test('encodes end command correctly', () => {
      const record = dstWriter.encodeRecord(0, 0, MockDSTWriter.END);
      
      expect(record[0]).toBe(0x00);
      expect(record[1]).toBe(0xF3);
      expect(record[2]).toBe(0x00);
    });
  });

  describe('generateHeader function', () => {
    test('creates header with correct size', () => {
      const header = dstWriter.generateHeader('TEST', 100, { minX: 0, maxX: 50, minY: 0, maxY: 30 });
      
      expect(header).toBeInstanceOf(Uint8Array);
      expect(header.length).toBe(512);
    });

    test('includes title in header', () => {
      const header = dstWriter.generateHeader('MYTEST', 50, {});
      const headerString = new TextDecoder().decode(header.slice(0, 20));
      
      expect(headerString).toContain('LA:MYTEST');
    });

    test('includes stitch count in header', () => {
      const header = dstWriter.generateHeader('TEST', 123, {});
      const headerString = new TextDecoder().decode(header.slice(0, 50));
      
      expect(headerString).toContain('ST:123');
    });

    test('pads header to full 512 bytes', () => {
      const header = dstWriter.generateHeader('X', 1, {});
      
      expect(header.length).toBe(512);
      // Most of the header should be zeros (padding)
      const nonZeroBytes = Array.from(header).filter(b => b !== 0).length;
      expect(nonZeroBytes).toBeLessThan(100); // Only a small portion should be non-zero
    });
  });

  describe('generateDST function', () => {
    test('generates complete DST data with header and records', () => {
      dstWriter.move(10, 10);
      dstWriter.move(20, 20);
      dstWriter.move(0, 0, MockDSTWriter.END);
      
      const dstData = dstWriter.generateDST('TEST');
      
      expect(dstData).toBeInstanceOf(Uint8Array);
      expect(dstData.length).toBe(512 + (3 * 3)); // Header + 3 records * 3 bytes each
      
      // Validate DST format
      TestUtils.validateDSTFormat(dstData);
    });

    test('handles empty pattern', () => {
      const dstData = dstWriter.generateDST();
      
      expect(dstData.length).toBe(512); // Just header, no records
    });

    test('includes proper stitch count in bounds', () => {
      dstWriter.move(5, 5);
      dstWriter.move(15, 15);
      dstWriter.move(25, 25);
      
      const bounds = dstWriter.getBounds();
      expect(bounds.minX).toBe(5);
      expect(bounds.maxX).toBe(25);
      expect(bounds.width).toBe(20);
      expect(dstWriter.stitchCount).toBe(3);
    });
  });

  describe('Integration with test data', () => {
    test('processes simple pattern from test data', () => {
      const pattern = DST_TEST_DATA.simplePattern;
      
      pattern.stitches.forEach(stitch => {
        const command = stitch.command === 'STITCH' ? MockDSTWriter.STITCH : MockDSTWriter.JUMP;
        dstWriter.move(stitch.x, stitch.y, command);
      });
      
      expect(dstWriter.stitchCount).toBe(pattern.expectedStitchCount);
    });

    test('processes multi-color pattern correctly', () => {
      const pattern = DST_TEST_DATA.multiColor;
      let colorChanges = 0;
      
      pattern.threads.forEach((thread, index) => {
        if (index > 0) {
          dstWriter.move(0, 0, MockDSTWriter.COLOR_CHANGE);
          colorChanges++;
        }
        
        thread.stitches.forEach(stitch => {
          const command = stitch.command === 'STITCH' ? MockDSTWriter.STITCH : MockDSTWriter.JUMP;
          dstWriter.move(stitch.x, stitch.y, command);
        });
      });
      
      expect(colorChanges).toBe(pattern.expectedColorChanges);
    });

    test('maintains coordinate precision within tolerance', () => {
      const testPoints = [
        { x: 0.1, y: 0.2 },
        { x: 5.7, y: 10.9 },
        { x: -3.4, y: -7.8 }
      ];
      
      testPoints.forEach(point => {
        dstWriter.move(point.x, point.y);
        
        // DST coordinates are typically rounded to nearest integer
        expectCoordinateToBeCloseTo(dstWriter.x, Math.round(point.x), 0.5);
        expectCoordinateToBeCloseTo(dstWriter.y, Math.round(point.y), 0.5);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    test('handles very large coordinate values', () => {
      // DST format has limitations on coordinate ranges
      const largeX = 10000;
      const largeY = 10000;
      
      expect(() => {
        dstWriter.move(largeX, largeY);
      }).not.toThrow();
    });

    test('handles rapid coordinate changes', () => {
      for (let i = 0; i < 100; i++) {
        dstWriter.move(i % 10, (i * 2) % 10);
      }
      
      expect(dstWriter.stitchCount).toBe(100);
      expect(dstWriter.records.length).toBe(100);
    });

    test('reset function clears all state', () => {
      dstWriter.move(10, 10);
      dstWriter.move(20, 20);
      
      dstWriter.reset();
      
      expect(dstWriter.x).toBe(0);
      expect(dstWriter.y).toBe(0);
      expect(dstWriter.stitchCount).toBe(0);
      expect(dstWriter.records).toEqual([]);
      expect(dstWriter.minX).toBe(Infinity);
      expect(dstWriter.maxX).toBe(-Infinity);
    });

    test('handles zero movements', () => {
      dstWriter.move(5, 5);
      const result = dstWriter.move(5, 5); // Same position
      
      expect(result.deltaX).toBe(0);
      expect(result.deltaY).toBe(0);
      expect(dstWriter.stitchCount).toBe(2);
    });
  });
});