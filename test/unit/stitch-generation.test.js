const { describe, test, expect, beforeEach } = require('@jest/globals');
const { TestUtils } = require('../helpers/test-utils.js');
const { TEST_PATTERNS, TEST_SETTINGS } = require('../fixtures/test-data.js');

// Mock stitch generation functions based on the library source
const convertLineToStitches = (x1, y1, x2, y2, stitchSettings) => {
  const stitchLength = stitchSettings.stitchLength || 3;
  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const numStitches = Math.max(1, Math.ceil(distance / stitchLength));
  
  const stitches = [];
  for (let i = 0; i <= numStitches; i++) {
    const t = i / numStitches;
    stitches.push({
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t
    });
  }
  
  return stitches;
};

const convertPathToStitches = (pathPoints, stitchSettings) => {
  if (pathPoints.length < 2) return pathPoints;
  
  const allStitches = [];
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const segmentStitches = convertLineToStitches(
      pathPoints[i].x,
      pathPoints[i].y,
      pathPoints[i + 1].x,
      pathPoints[i + 1].y,
      stitchSettings
    );
    
    // Avoid duplicating points at segment connections
    if (i > 0) segmentStitches.shift();
    allStitches.push(...segmentStitches);
  }
  
  return allStitches;
};

// Mock distance calculation
const calculateDistance = (x1, y1, x2, y2) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

// Mock stitch spacing calculation
const calculateStitchSpacing = (distance, stitchLength, minStitchLength) => {
  const numStitches = Math.max(1, Math.ceil(distance / stitchLength));
  const actualSpacing = distance / numStitches;
  
  return {
    numStitches,
    spacing: actualSpacing,
    isValid: actualSpacing >= minStitchLength
  };
};

describe('Stitch Generation Functions', () => {
  beforeEach(() => {
    TestUtils.resetAllMocks();
  });

  describe('convertLineToStitches', () => {
    test('generates correct number of stitches for simple line', () => {
      const x1 = 0, y1 = 0, x2 = 30, y2 = 0; // 30mm horizontal line
      const settings = { stitchLength: 3 }; // 3mm stitch length
      
      const stitches = convertLineToStitches(x1, y1, x2, y2, settings);
      
      // Should generate 11 stitches (0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30)
      expect(stitches.length).toBe(11);
      expect(stitches[0]).toEqual({ x: 0, y: 0 });
      expect(stitches[stitches.length - 1]).toEqual({ x: 30, y: 0 });
    });

    test('handles diagonal lines correctly', () => {
      const x1 = 0, y1 = 0, x2 = 3, y2 = 4; // 5mm diagonal line (3-4-5 triangle)
      const settings = { stitchLength: 2.5 };
      
      const stitches = convertLineToStitches(x1, y1, x2, y2, settings);
      
      // 5mm / 2.5mm = 2 segments, so 3 stitches
      expect(stitches.length).toBe(3);
      expect(stitches[0]).toEqual({ x: 0, y: 0 });
      expectCoordinateToBeCloseTo(stitches[1].x, 1.5, 0.01);
      expectCoordinateToBeCloseTo(stitches[1].y, 2, 0.01);
      expect(stitches[2]).toEqual({ x: 3, y: 4 });
    });

    test('handles very short lines', () => {
      const x1 = 0, y1 = 0, x2 = 0.5, y2 = 0; // 0.5mm line
      const settings = { stitchLength: 3 };
      
      const stitches = convertLineToStitches(x1, y1, x2, y2, settings);
      
      // Should always generate at least 2 stitches (start and end)
      expect(stitches.length).toBe(2);
      expect(stitches[0]).toEqual({ x: 0, y: 0 });
      expect(stitches[1]).toEqual({ x: 0.5, y: 0 });
    });

    test('handles zero-length lines', () => {
      const x1 = 5, y1 = 10, x2 = 5, y2 = 10; // Same point
      const settings = { stitchLength: 3 };
      
      const stitches = convertLineToStitches(x1, y1, x2, y2, settings);
      
      expect(stitches.length).toBe(2);
      expect(stitches[0]).toEqual({ x: 5, y: 10 });
      expect(stitches[1]).toEqual({ x: 5, y: 10 });
    });

    test('respects different stitch lengths', () => {
      const x1 = 0, y1 = 0, x2 = 20, y2 = 0; // 20mm line
      
      const settings1 = { stitchLength: 2 }; // 2mm stitches
      const settings2 = { stitchLength: 5 }; // 5mm stitches
      
      const stitches1 = convertLineToStitches(x1, y1, x2, y2, settings1);
      const stitches2 = convertLineToStitches(x1, y1, x2, y2, settings2);
      
      expect(stitches1.length).toBe(11); // 20/2 = 10 segments + 1
      expect(stitches2.length).toBe(5);  // 20/5 = 4 segments + 1
    });
  });

  describe('convertPathToStitches', () => {
    test('handles simple rectangle path', () => {
      const rectangle = TestUtils.createRectangleVertices(0, 0, 20, 15);
      const settings = { stitchLength: 5 };
      
      const stitches = convertPathToStitches(rectangle, settings);
      
      // Rectangle perimeter: 2*(20+15) = 70mm
      // At 5mm stitch length: approximately 70/5 = 14 segments
      expect(stitches.length).toBeGreaterThan(10);
      expect(stitches.length).toBeLessThan(20);
      
      // Should start and end at the same point as the path
      expect(stitches[0]).toEqual(rectangle[0]);
      expectCoordinateToBeCloseTo(stitches[stitches.length - 1].x, rectangle[rectangle.length - 1].x, 0.01);
      expectCoordinateToBeCloseTo(stitches[stitches.length - 1].y, rectangle[rectangle.length - 1].y, 0.01);
    });

    test('handles single point path', () => {
      const singlePoint = [{ x: 10, y: 20 }];
      const settings = { stitchLength: 3 };
      
      const stitches = convertPathToStitches(singlePoint, settings);
      
      expect(stitches).toEqual(singlePoint);
    });

    test('handles two-point path', () => {
      const twoPoints = [{ x: 0, y: 0 }, { x: 15, y: 0 }];
      const settings = { stitchLength: 3 };
      
      const stitches = convertPathToStitches(twoPoints, settings);
      
      // Should be equivalent to convertLineToStitches
      expect(stitches.length).toBe(6); // 15/3 = 5 segments + 1
      expect(stitches[0]).toEqual({ x: 0, y: 0 });
      expect(stitches[stitches.length - 1]).toEqual({ x: 15, y: 0 });
    });

    test('avoids duplicate points at connections', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 }
      ];
      const settings = { stitchLength: 5 };
      
      const stitches = convertPathToStitches(path, settings);
      
      // Check that the connection point (10, 0) doesn't appear twice
      const connectionPoints = stitches.filter(s => s.x === 10 && s.y === 0);
      expect(connectionPoints.length).toBe(1);
    });

    test('handles complex curved path approximation', () => {
      const circle = TestUtils.createCircleVertices(25, 25, 20, 8); // 8-sided approximation
      const settings = { stitchLength: 4 };
      
      const stitches = convertPathToStitches(circle, settings);
      
      // Circle circumference ≈ 2πr = 2π*20 ≈ 125mm
      // At 4mm stitch length: approximately 125/4 ≈ 31 stitches
      expect(stitches.length).toBeGreaterThan(25);
      expect(stitches.length).toBeLessThan(40);
      
      TestUtils.validateStitchSequence(stitches);
    });
  });

  describe('calculateDistance', () => {
    test('calculates horizontal distance correctly', () => {
      const distance = calculateDistance(0, 0, 10, 0);
      expect(distance).toBe(10);
    });

    test('calculates vertical distance correctly', () => {
      const distance = calculateDistance(0, 0, 0, 5);
      expect(distance).toBe(5);
    });

    test('calculates diagonal distance correctly', () => {
      const distance = calculateDistance(0, 0, 3, 4);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    test('handles negative coordinates', () => {
      const distance = calculateDistance(-5, -3, 7, 1);
      expectCoordinateToBeCloseTo(distance, Math.sqrt(144 + 16), 0.01); // sqrt(12² + 4²)
    });

    test('handles same point', () => {
      const distance = calculateDistance(5, 10, 5, 10);
      expect(distance).toBe(0);
    });
  });

  describe('calculateStitchSpacing', () => {
    test('calculates correct number of stitches for exact multiples', () => {
      const result = calculateStitchSpacing(15, 3, 1); // 15mm, 3mm stitches, 1mm min
      
      expect(result.numStitches).toBe(5);
      expect(result.spacing).toBe(3);
      expect(result.isValid).toBe(true);
    });

    test('rounds up for non-exact distances', () => {
      const result = calculateStitchSpacing(14, 3, 1); // 14mm, 3mm stitches
      
      expect(result.numStitches).toBe(5);
      expectCoordinateToBeCloseTo(result.spacing, 2.8, 0.01);
      expect(result.isValid).toBe(true);
    });

    test('respects minimum stitch length', () => {
      const result = calculateStitchSpacing(1, 3, 2); // 1mm distance, 3mm target, 2mm min
      
      expect(result.numStitches).toBe(1);
      expect(result.spacing).toBe(1);
      expect(result.isValid).toBe(false); // 1mm < 2mm minimum
    });

    test('handles very small distances', () => {
      const result = calculateStitchSpacing(0.1, 3, 0.5);
      
      expect(result.numStitches).toBe(1);
      expect(result.spacing).toBe(0.1);
      expect(result.isValid).toBe(false);
    });

    test('always generates at least one stitch', () => {
      const result = calculateStitchSpacing(0, 3, 1);
      
      expect(result.numStitches).toBe(1);
      expect(result.spacing).toBe(0);
    });
  });

  describe('Integration with test patterns', () => {
    test('generates expected stitch count for simple line', () => {
      const pattern = TEST_PATTERNS.simpleLine;
      const settings = TEST_SETTINGS.default;
      
      const stitches = convertLineToStitches(
        pattern.vertices[0].x,
        pattern.vertices[0].y,
        pattern.vertices[1].x,
        pattern.vertices[1].y,
        settings
      );
      
      // 100mm line with 3mm stitches should generate ~34 stitches
      expect(stitches.length).toBeGreaterThan(30);
      expect(stitches.length).toBeLessThan(40);
    });

    test('generates stitches within expected bounds', () => {
      const pattern = TEST_PATTERNS.rectangle;
      const settings = TEST_SETTINGS.fine; // 1mm stitch length
      
      const stitches = convertPathToStitches(pattern.vertices, settings);
      
      // All stitches should be within the rectangle bounds
      stitches.forEach(stitch => {
        expect(stitch.x).toBeGreaterThanOrEqual(pattern.expectedBounds.minX);
        expect(stitch.x).toBeLessThanOrEqual(pattern.expectedBounds.maxX);
        expect(stitch.y).toBeGreaterThanOrEqual(pattern.expectedBounds.minY);
        expect(stitch.y).toBeLessThanOrEqual(pattern.expectedBounds.maxY);
      });
    });

    test('validates stitch sequence properties', () => {
      const pattern = TEST_PATTERNS.circle;
      const circle = TestUtils.createCircleVertices(
        pattern.center.x,
        pattern.center.y,
        pattern.radius,
        pattern.segments
      );
      const settings = TEST_SETTINGS.default;
      
      const stitches = convertPathToStitches(circle, settings);
      
      TestUtils.validateStitchSequence(stitches);
      
      // Check that consecutive stitches aren't too far apart
      for (let i = 1; i < stitches.length; i++) {
        const distance = calculateDistance(
          stitches[i-1].x,
          stitches[i-1].y,
          stitches[i].x,
          stitches[i].y
        );
        expect(distance).toBeLessThanOrEqual(settings.stitchLength * 1.1); // Allow 10% tolerance
      }
    });
  });
});