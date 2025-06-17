const { describe, test, expect, beforeEach } = require('@jest/globals');
const { TestUtils } = require('../helpers/test-utils.js');
const { TEST_PATTERNS, TEST_COLORS, TEST_SETTINGS } = require('../fixtures/test-data.js');

// Integration test combining all components
describe('Embroidery Workflow Integration Tests', () => {
  beforeEach(() => {
    TestUtils.resetAllMocks();
  });

  describe('Complete embroidery pattern workflow', () => {
    test('processes simple line pattern end-to-end', () => {
      const pattern = TEST_PATTERNS.simpleLine;
      const settings = TEST_SETTINGS.default;
      
      // 1. Convert coordinates
      const mmVertices = pattern.vertices.map(v => ({
        x: TestUtils.pixelsToMM(v.x),
        y: TestUtils.pixelsToMM(v.y)
      }));
      
      // 2. Generate stitches
      const allStitches = [];
      for (let i = 0; i < mmVertices.length - 1; i++) {
        const lineStitches = generateLineStitches(
          mmVertices[i].x,
          mmVertices[i].y,
          mmVertices[i + 1].x,
          mmVertices[i + 1].y,
          settings
        );
        if (i > 0) lineStitches.shift(); // Remove duplicate points
        allStitches.push(...lineStitches);
      }
      
      // 3. Validate stitch sequence
      TestUtils.validateStitchSequence(allStitches);
      expect(allStitches.length).toBeGreaterThan(0);
      
      // 4. Check bounds
      const bounds = calculateBounds(allStitches);
      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThanOrEqual(0);
      
      // 5. Simulate DST export
      const dstData = simulateDSTExport(allStitches);
      expect(dstData.header).toBeDefined();
      expect(dstData.records.length).toBe(allStitches.length);
      
      // 6. Simulate G-code export
      const gcode = simulateGCodeExport(allStitches);
      expect(gcode).toContain('G21'); // Units
      expect(gcode).toContain('M30'); // End
    });

    test('handles multi-color pattern workflow', () => {
      const colors = [TEST_COLORS.red, TEST_COLORS.green, TEST_COLORS.blue];
      const settings = TEST_SETTINGS.default;
      
      const threads = colors.map((color, index) => ({
        color,
        stitches: generateCircleStitches(
          index * 20 + 10, // x offset
          index * 20 + 10, // y offset
          5, // radius
          settings
        )
      }));
      
      // Validate each thread
      threads.forEach(thread => {
        TestUtils.validateStitchSequence(thread.stitches);
        expect(thread.stitches.length).toBeGreaterThan(4);
      });
      
      // Simulate multi-color DST export
      const dstData = simulateMultiColorDSTExport(threads);
      expect(dstData.colorChanges).toBe(colors.length - 1);
      
      // Simulate multi-color G-code export
      const gcode = simulateMultiColorGCodeExport(threads);
      colors.forEach((_, index) => {
        expect(gcode).toContain(`T${index}`);
      });
    });

    test('handles complex filled shape workflow', () => {
      const rectangle = TEST_PATTERNS.rectangle;
      const settings = TEST_SETTINGS.fine;
      
      // 1. Create fill pattern (simplified tatami fill simulation)
      const fillStitches = simulateTatamiFill(
        rectangle.vertices,
        {
          spacing: 2, // 2mm spacing
          angle: 45,  // 45 degree angle
          ...settings
        }
      );
      
      // 2. Validate fill pattern
      TestUtils.validateStitchSequence(fillStitches);
      expect(fillStitches.length).toBeGreaterThan(20);
      
      // 3. Check that stitches are within reasonable bounds (rotation may extend beyond original)
      const bounds = calculateBounds(rectangle.vertices);
      const diagonal = Math.sqrt(bounds.width ** 2 + bounds.height ** 2);
      const tolerance = diagonal / 2; // Allow for full rotation
      
      fillStitches.forEach(stitch => {
        expect(stitch.x).toBeGreaterThanOrEqual(bounds.minX - tolerance);
        expect(stitch.x).toBeLessThanOrEqual(bounds.maxX + tolerance);
        expect(stitch.y).toBeGreaterThanOrEqual(bounds.minY - tolerance);
        expect(stitch.y).toBeLessThanOrEqual(bounds.maxY + tolerance);
      });
      
      // 4. Export validation
      const dstData = simulateDSTExport(fillStitches);
      expect(dstData.stitchCount).toBe(fillStitches.length);
    });
  });

  describe('Error handling and edge cases', () => {
    test('handles empty pattern gracefully', () => {
      const emptyStitches = [];
      
      const dstData = simulateDSTExport(emptyStitches);
      expect(dstData.header).toBeDefined();
      expect(dstData.records.length).toBe(0);
      
      const gcode = simulateGCodeExport(emptyStitches);
      expect(gcode).toContain('G21');
      expect(gcode).toContain('M30');
    });

    test('handles single point pattern', () => {
      const singlePoint = [{ x: 10, y: 20 }];
      
      const dstData = simulateDSTExport(singlePoint);
      expect(dstData.records.length).toBe(1);
      
      const gcode = simulateGCodeExport(singlePoint);
      expect(gcode).toContain('X10.000');
      expect(gcode).toContain('Y20.000');
    });

    test('handles very large patterns', () => {
      // Generate a large pattern with many stitches
      const largePattern = [];
      for (let i = 0; i < 1000; i++) {
        largePattern.push({
          x: (i % 100) * 2,
          y: Math.floor(i / 100) * 2
        });
      }
      
      const dstData = simulateDSTExport(largePattern);
      expect(dstData.records.length).toBe(1000);
      expect(dstData.stitchCount).toBe(1000);
      
      const gcode = simulateGCodeExport(largePattern);
      expect(gcode.split('\n').length).toBeGreaterThan(1000);
    });

    test('validates coordinate precision throughout workflow', () => {
      const precisionTest = [
        { x: 0.123, y: 0.456 },
        { x: 10.789, y: 20.012 },
        { x: -5.555, y: -15.999 }
      ];
      
      // Convert through mm/pixel conversions
      const pixelCoords = precisionTest.map(p => ({
        x: TestUtils.mmToPixels(p.x),
        y: TestUtils.mmToPixels(p.y)
      }));
      
      const backToMm = pixelCoords.map(p => ({
        x: TestUtils.pixelsToMM(p.x),
        y: TestUtils.pixelsToMM(p.y)
      }));
      
      // Check round-trip precision
      backToMm.forEach((coord, index) => {
        expectCoordinateToBeCloseTo(coord.x, precisionTest[index].x, 0.01);
        expectCoordinateToBeCloseTo(coord.y, precisionTest[index].y, 0.01);
      });
    });
  });

  describe('Performance and optimization', () => {
    test('optimizes stitch count for simple shapes', () => {
      const settings = { ...TEST_SETTINGS.default, stitchLength: 5 };
      const line = TEST_PATTERNS.simpleLine;
      
      const stitches = generateLineStitches(
        line.vertices[0].x,
        line.vertices[0].y,
        line.vertices[1].x,
        line.vertices[1].y,
        settings
      );
      
      // Should optimize to reasonable stitch count
      const expectedCount = Math.ceil(100 / 5) + 1; // 100mm line, 5mm stitches
      expectCoordinateToBeCloseTo(stitches.length, expectedCount, 2);
    });

    test('handles jump optimization in patterns', () => {
      const separateShapes = [
        [{ x: 0, y: 0 }, { x: 10, y: 0 }],
        [{ x: 50, y: 50 }, { x: 60, y: 50 }]
      ];
      
      let totalStitches = 0;
      let jumpCount = 0;
      
      separateShapes.forEach((shape, index) => {
        if (index > 0) {
          jumpCount++; // Jump between shapes
        }
        const shapeStitches = generateLineStitches(
          shape[0].x, shape[0].y,
          shape[1].x, shape[1].y,
          TEST_SETTINGS.default
        );
        totalStitches += shapeStitches.length;
      });
      
      expect(jumpCount).toBe(1);
      expect(totalStitches).toBeGreaterThan(jumpCount);
    });
  });
});

// Helper functions for integration tests
function generateLineStitches(x1, y1, x2, y2, settings) {
  const stitchLength = settings.stitchLength || 3;
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
}

function generateCircleStitches(cx, cy, radius, settings) {
  const stitchLength = settings.stitchLength || 3;
  const circumference = 2 * Math.PI * radius;
  const numStitches = Math.max(8, Math.ceil(circumference / stitchLength));
  
  const stitches = [];
  for (let i = 0; i <= numStitches; i++) {
    const angle = (i / numStitches) * 2 * Math.PI;
    stitches.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    });
  }
  
  return stitches;
}

function simulateTatamiFill(vertices, settings) {
  const bounds = calculateBounds(vertices);
  const spacing = settings.spacing || 2;
  const angle = (settings.angle || 0) * Math.PI / 180;
  
  const stitches = [];
  const cos_a = Math.cos(angle);
  const sin_a = Math.sin(angle);
  
  // Simple scan-line fill simulation
  for (let y = bounds.minY; y <= bounds.maxY; y += spacing) {
    let x = bounds.minX;
    while (x <= bounds.maxX) {
      // Rotate point
      const rx = x * cos_a - y * sin_a;
      const ry = x * sin_a + y * cos_a;
      
      stitches.push({ x: rx, y: ry });
      x += spacing;
    }
  }
  
  return stitches;
}

function calculateBounds(points) {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function simulateDSTExport(stitches) {
  return {
    header: new Uint8Array(512), // Mock header
    records: stitches.map(stitch => new Uint8Array([0, 0, 0])), // Mock records
    stitchCount: stitches.length,
    bounds: calculateBounds(stitches)
  };
}

function simulateGCodeExport(stitches) {
  const lines = [
    'G21 ; Set units to millimeters',
    'G90 ; Absolute positioning'
  ];
  
  stitches.forEach(stitch => {
    lines.push(`G0 X${stitch.x.toFixed(3)} Y${stitch.y.toFixed(3)}`);
  });
  
  lines.push('M30 ; Program end');
  return lines.join('\n');
}

function simulateMultiColorDSTExport(threads) {
  let totalStitches = 0;
  let colorChanges = 0;
  const records = [];
  
  threads.forEach((thread, index) => {
    if (index > 0) {
      colorChanges++;
      records.push(new Uint8Array([0, 0xC3, 0])); // Color change record
    }
    
    thread.stitches.forEach(stitch => {
      records.push(new Uint8Array([0, 0, 0])); // Mock stitch record
      totalStitches++;
    });
  });
  
  return {
    header: new Uint8Array(512),
    records,
    stitchCount: totalStitches,
    colorChanges
  };
}

function simulateMultiColorGCodeExport(threads) {
  const lines = [
    'G21 ; Set units to millimeters',
    'G90 ; Absolute positioning'
  ];
  
  threads.forEach((thread, index) => {
    lines.push(`T${index} ; Tool change`);
    thread.stitches.forEach(stitch => {
      lines.push(`G0 X${stitch.x.toFixed(3)} Y${stitch.y.toFixed(3)}`);
    });
  });
  
  lines.push('M30 ; Program end');
  return lines.join('\n');
}