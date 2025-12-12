// Test data for p5.embroider tests

export const TEST_PATTERNS = {
  // Simple line pattern
  simpleLine: {
    vertices: [
      { x: 0, y: 0 },
      { x: 100, y: 0 }
    ],
    expectedStitches: 11, // 100mm / 10mm stitch length + 1
    expectedBounds: { minX: 0, minY: 0, maxX: 100, maxY: 0 }
  },

  // Rectangle pattern
  rectangle: {
    vertices: [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 30 },
      { x: 0, y: 30 },
      { x: 0, y: 0 }
    ],
    expectedPerimeter: 160,
    expectedBounds: { minX: 0, minY: 0, maxX: 50, maxY: 30 }
  },

  // Circle pattern (approximated)
  circle: {
    center: { x: 25, y: 25 },
    radius: 25,
    segments: 16,
    expectedBounds: { minX: 0, minY: 0, maxX: 50, maxY: 50 }
  }
};

export const TEST_COLORS = {
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 255, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 }
};

export const TEST_SETTINGS = {
  default: {
    stitchLength: 3,
    stitchWidth: 0,
    minStitchLength: 1,
    resampleNoise: 0,
    minimumPathLength: 0,
    maximumJoinDistance: 0,
    maximumStitchesPerSquareMm: 0,
    jumpThreshold: 10,
    units: "mm"
  },
  
  fine: {
    stitchLength: 1,
    stitchWidth: 0,
    minStitchLength: 0.5,
    resampleNoise: 0,
    minimumPathLength: 0,
    maximumJoinDistance: 0,
    maximumStitchesPerSquareMm: 0,
    jumpThreshold: 5,
    units: "mm"
  }
};

// DST format test data
export const DST_TEST_DATA = {
  // Simple 2-stitch pattern
  simplePattern: {
    stitches: [
      { x: 0, y: 0, command: 'STITCH' },
      { x: 10, y: 0, command: 'STITCH' }
    ],
    expectedHeader: 'LA:                                                                                                                                                                                                                                                                                                                                                                                                             ',
    expectedStitchCount: 2
  },

  // Multi-color pattern
  multiColor: {
    threads: [
      {
        color: { r: 255, g: 0, b: 0 },
        stitches: [
          { x: 0, y: 0, command: 'STITCH' },
          { x: 10, y: 0, command: 'STITCH' }
        ]
      },
      {
        color: { r: 0, g: 255, b: 0 },
        stitches: [
          { x: 0, y: 10, command: 'STITCH' },
          { x: 10, y: 10, command: 'STITCH' }
        ]
      }
    ],
    expectedColorChanges: 1
  }
};

// (named exports above)