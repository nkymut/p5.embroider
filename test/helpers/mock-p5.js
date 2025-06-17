// Mock p5.js functions

// Mock p5.js instance and functions
export const mockP5 = {
  // Canvas and graphics
  width: 400,
  height: 400,
  _renderer: {
    drawingContext: {
      canvas: { width: 400, height: 400 }
    }
  },
  
  // Drawing functions
  line: () => {},
  rect: () => {},
  ellipse: () => {},
  point: () => {},
  beginShape: () => {},
  vertex: () => {},
  bezierVertex: () => {},
  quadraticVertex: () => {},
  curveVertex: () => {},
  endShape: () => {},
  
  // Style functions
  stroke: () => {},
  strokeWeight: () => {},
  noStroke: () => {},
  fill: () => {},
  noFill: () => {},
  
  // Transform functions
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  
  // Color functions
  color: (r, g, b) => ({ levels: [r, g, b, 255] }),
  red: (c) => c.levels[0],
  green: (c) => c.levels[1],
  blue: (c) => c.levels[2],
  
  // State
  _strokeSet: true,
  _fillSet: false,
  _doStroke: true,
  _doFill: false,
  _strokeWeight: 1,
  _strokeColor: { levels: [0, 0, 0, 255] },
  _fillColor: { levels: [255, 255, 255, 255] }
};

// Mock p5 constants
global.CLOSE = 'close';
global.OPEN = 'open';

// Make mock available globally for tests
global.mockP5 = mockP5;