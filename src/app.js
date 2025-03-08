// Core
import p5embroider from './core/main';
import './core/constants';
import './core/environment';
import './core/settings';

// Shape
import './core/shape/primitives';
import './core/shape/attributes';
import './core/shape/stitches';

// IO
import './io/exporters/dst';
import './io/exporters/gcode';
// import './io/exporters/svg'; // To be implemented

// Math
import './math/calculation';
import './math/conversion';

// Rendering
import './rendering/stitch';
// import './rendering/realistic'; // To be implemented

// Stitch patterns
import './stitch/fill/tatami';
// import './stitch/fill/satin'; // To be implemented
// import './stitch/fill/spiral'; // To be implemented
import './stitch/stroke/zigzag';
import './stitch/stroke/straight';
import './stitch/stroke/sashiko';
import './stitch/stroke/multiline';

// Utilities
import './utilities/thread';
import './utilities/helpers';

// Initialize p5embroider when loaded
if (typeof window !== 'undefined') {
  window.p5embroider = p5embroider;
  
  // Override p5 functions when p5 is loaded
  if (window.p5) {
    p5embroider.init(window.p5);
    p5embroider.overrideP5Functions();
    p5embroider.overrideAttributeFunctions();
  } else {
    // If p5 is not loaded yet, wait for it
    window.addEventListener('load', () => {
      if (window.p5) {
        p5embroider.init(window.p5);
        p5embroider.overrideP5Functions();
        p5embroider.overrideAttributeFunctions();
      }
    });
  }
}

export default p5embroider; 