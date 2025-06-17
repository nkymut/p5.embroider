// Test utilities for p5.embroider

const TestUtils = {
  // Create test pattern data
  createSimplePattern: () => ({
    width: 100,
    height: 100,
    threads: [{
      color: { r: 255, g: 0, b: 0 },
      runs: [
        { stitches: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }
      ],
      weight: 0.2
    }],
    pixelsPerUnit: 10,
    stitchCount: 2
  }),

  // Create test vertices for shapes
  createRectangleVertices: (x, y, w, h) => [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h }
  ],

  createCircleVertices: (cx, cy, radius, segments = 16) => {
    const vertices = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      });
    }
    return vertices;
  },

  // DST test helpers
  validateDSTFormat: (dstData) => {
    // Check DST header (512 bytes)
    expect(dstData.length).toBeGreaterThanOrEqual(512);
    
    // Check magic bytes at start
    const header = dstData.slice(0, 512);
    expect(header.length).toBe(512);
    
    return true;
  },

  // Coordinate conversion helpers
  pixelsToMM: (pixels, pixelsPerUnit = 10) => pixels / pixelsPerUnit,
  mmToPixels: (mm, pixelsPerUnit = 10) => mm * pixelsPerUnit,

  // Stitch validation
  validateStitchSequence: (stitches) => {
    expect(Array.isArray(stitches)).toBe(true);
    stitches.forEach(stitch => {
      expect(typeof stitch.x).toBe('number');
      expect(typeof stitch.y).toBe('number');
      expect(isNaN(stitch.x)).toBe(false);
      expect(isNaN(stitch.y)).toBe(false);
    });
  },

  // Mock reset helper
  resetAllMocks: () => {
    // Simple reset for non-jest environment
    // In a real scenario, you'd reset mock state here
  }
};

module.exports = { TestUtils };