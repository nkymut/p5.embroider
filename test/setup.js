// Tolerance for floating point comparisons in embroidery coordinates
global.COORDINATE_TOLERANCE = 0.1; // 0.1mm tolerance

// Helper function for coordinate comparison
global.expectCoordinateToBeCloseTo = (actual, expected, tolerance = global.COORDINATE_TOLERANCE) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};