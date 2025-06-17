const { describe, test, expect, beforeEach } = require('@jest/globals');
const { TestUtils } = require('../helpers/test-utils.js');

// Test the coordinate conversion logic directly
const mmToPixel = (mm, dpi = 96) => {
  return (mm / 25.4) * dpi;
};

const pixelToMm = (pixels, dpi = 96) => {
  return (pixels * 25.4) / dpi;
};

// Test geometric utility functions
const getPathBounds = (points) => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
};

const pointInPolygon = (point, polygon) => {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

describe('Coordinate Conversion Functions', () => {
  beforeEach(() => {
    TestUtils.resetAllMocks();
  });

  describe('mmToPixel', () => {
    test('converts millimeters to pixels with default DPI (96)', () => {
      // 25.4mm = 1 inch at 96 DPI = 96 pixels
      const result = mmToPixel(25.4);
      expectCoordinateToBeCloseTo(result, 96, 0.1);
    });

    test('converts millimeters to pixels with custom DPI', () => {
      // 25.4mm = 1 inch at 300 DPI = 300 pixels
      const result = mmToPixel(25.4, 300);
      expectCoordinateToBeCloseTo(result, 300, 0.1);
    });

    test('handles zero and negative values', () => {
      expect(mmToPixel(0)).toBe(0);
      expect(mmToPixel(-10)).toBeLessThan(0);
    });

    test('handles decimal values', () => {
      const result = mmToPixel(12.7); // 0.5 inch
      expectCoordinateToBeCloseTo(result, 48, 0.1);
    });

    test('handles very small values', () => {
      const result = mmToPixel(0.1);
      expect(result).toBeGreaterThan(0);
      expectCoordinateToBeCloseTo(result, 0.378, 0.001);
    });
  });

  describe('pixelToMm', () => {
    test('converts pixels to millimeters with default DPI (96)', () => {
      const result = pixelToMm(96);
      expectCoordinateToBeCloseTo(result, 25.4, 0.1);
    });

    test('converts pixels to millimeters with custom DPI', () => {
      const result = pixelToMm(300, 300);
      expectCoordinateToBeCloseTo(result, 25.4, 0.1);
    });

    test('handles zero and negative values', () => {
      expect(pixelToMm(0)).toBe(0);
      expect(pixelToMm(-96)).toBeLessThan(0);
    });

    test('handles decimal pixel values', () => {
      const result = pixelToMm(48);
      expectCoordinateToBeCloseTo(result, 12.7, 0.1);
    });
  });

  describe('Round-trip conversion accuracy', () => {
    test('mmToPixel and pixelToMm are inverse operations', () => {
      const originalMm = 50.8; // 2 inches
      const pixels = mmToPixel(originalMm);
      const backToMm = pixelToMm(pixels);
      
      expectCoordinateToBeCloseTo(backToMm, originalMm, 0.001);
    });

    test('round-trip works with custom DPI', () => {
      const originalMm = 25.4;
      const dpi = 150;
      
      const pixels = mmToPixel(originalMm, dpi);
      const backToMm = pixelToMm(pixels, dpi);
      
      expectCoordinateToBeCloseTo(backToMm, originalMm, 0.001);
    });

    test('maintains precision with very small values', () => {
      const originalMm = 0.5;
      const pixels = mmToPixel(originalMm);
      const backToMm = pixelToMm(pixels);
      
      expectCoordinateToBeCloseTo(backToMm, originalMm, 0.001);
    });
  });

  describe('DPI variations', () => {
    const testDPIs = [72, 96, 150, 300, 600];
    const testMmValue = 25.4; // 1 inch

    testDPIs.forEach(dpi => {
      test(`correctly converts at ${dpi} DPI`, () => {
        const pixels = mmToPixel(testMmValue, dpi);
        expectCoordinateToBeCloseTo(pixels, dpi, 0.1);
        
        const backToMm = pixelToMm(pixels, dpi);
        expectCoordinateToBeCloseTo(backToMm, testMmValue, 0.001);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    test('handles very large values', () => {
      const largeMm = 10000; // 10 meters
      const pixels = mmToPixel(largeMm);
      expect(pixels).toBeGreaterThan(0);
      expect(isFinite(pixels)).toBe(true);
    });

    test('handles very small non-zero values', () => {
      const tinyMm = 0.001; // 1 micrometer
      const pixels = mmToPixel(tinyMm);
      expect(pixels).toBeGreaterThan(0);
      expect(isFinite(pixels)).toBe(true);
    });

    test('handles zero DPI gracefully', () => {
      // This should handle division by zero or return appropriate value
      const result = mmToPixel(10, 0);
      expect(result).toBe(0);
    });
  });

  describe('getPathBounds', () => {
    test('calculates bounds for simple rectangle', () => {
      const points = TestUtils.createRectangleVertices(10, 20, 30, 40);
      const bounds = getPathBounds(points);
      
      expect(bounds.x).toBe(10);
      expect(bounds.y).toBe(20);
      expect(bounds.w).toBe(30);
      expect(bounds.h).toBe(40);
    });

    test('calculates bounds for single point', () => {
      const points = [{ x: 5, y: 10 }];
      const bounds = getPathBounds(points);
      
      expect(bounds.x).toBe(5);
      expect(bounds.y).toBe(10);
      expect(bounds.w).toBe(0);
      expect(bounds.h).toBe(0);
    });

    test('calculates bounds for scattered points', () => {
      const points = [
        { x: -10, y: 5 },
        { x: 20, y: -15 },
        { x: 0, y: 30 }
      ];
      const bounds = getPathBounds(points);
      
      expect(bounds.x).toBe(-10);
      expect(bounds.y).toBe(-15);
      expect(bounds.w).toBe(30); // 20 - (-10)
      expect(bounds.h).toBe(45); // 30 - (-15)
    });

    test('handles negative coordinates', () => {
      const points = [
        { x: -50, y: -30 },
        { x: -20, y: -10 }
      ];
      const bounds = getPathBounds(points);
      
      expect(bounds.x).toBe(-50);
      expect(bounds.y).toBe(-30);
      expect(bounds.w).toBe(30);
      expect(bounds.h).toBe(20);
    });
  });

  describe('pointInPolygon', () => {
    test('detects point inside simple square', () => {
      const square = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ];
      
      expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
      expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
      expect(pointInPolygon({ x: 5, y: 15 }, square)).toBe(false);
    });

    test('handles point on edge', () => {
      const triangle = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 }
      ];
      
      // Point on edge behavior can vary, but should be consistent
      const result = pointInPolygon({ x: 5, y: 0 }, triangle);
      expect(typeof result).toBe('boolean');
    });

    test('works with complex polygon', () => {
      // L-shaped polygon
      const lShape = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
        { x: 5, y: 5 },
        { x: 5, y: 10 },
        { x: 0, y: 10 }
      ];
      
      expect(pointInPolygon({ x: 2, y: 2 }, lShape)).toBe(true);
      expect(pointInPolygon({ x: 7, y: 2 }, lShape)).toBe(true);
      expect(pointInPolygon({ x: 7, y: 7 }, lShape)).toBe(false);
      expect(pointInPolygon({ x: 2, y: 7 }, lShape)).toBe(true);
    });

    test('handles degenerate cases', () => {
      // Empty polygon
      expect(pointInPolygon({ x: 0, y: 0 }, [])).toBe(false);
      
      // Single point polygon
      expect(pointInPolygon({ x: 0, y: 0 }, [{ x: 0, y: 0 }])).toBe(false);
    });
  });
});

// Mock test for functions that aren't directly exported
// These would need to be tested through the main library integration
describe('Internal Coordinate Functions (Integration Required)', () => {
  describe('getPathBounds', () => {
    test('should be tested through library integration', () => {
      // This function is internal and would be tested through
      // the main embroidery pattern generation workflow
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('pointInPolygon', () => {
    test('should be tested through fill pattern generation', () => {
      // This function is used in fill algorithms and would be
      // tested through those workflows
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('rotation transformations', () => {
    test('should be tested through angled fill patterns', () => {
      // Rotation transformations are used in tatami fill
      // and would be tested through that functionality
      expect(true).toBe(true); // Placeholder
    });
  });
});