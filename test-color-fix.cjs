// Simple test to verify color change fix
const fs = require('fs');

// Mock p5.js environment
global.p5 = {
  prototype: {}
};

// Import the built library
const p5EmbroideryCode = fs.readFileSync('./lib/p5.embroider.js', 'utf8');

// Create a minimal test environment
const mockP5Instance = {
  _strokeSet: true,
  _doStroke: true,
  _strokeWeight: 1,
  _renderer: {
    drawingContext: {
      canvas: { width: 400, height: 400 }
    }
  }
};

// Execute the library code in a controlled environment
const originalConsoleLog = console.log;
let logOutput = [];
console.log = (...args) => {
  logOutput.push(args.join(' '));
  originalConsoleLog(...args);
};

try {
  // Execute the library code
  eval(p5EmbroideryCode);
  
  console.log("=== Testing Color Change Fix ===");
  
  // Test the recording workflow
  if (typeof beginRecord === 'function') {
    beginRecord(mockP5Instance);
    
    // Simulate color changes
    if (typeof stroke === 'function') {
      console.log("Setting first color: red");
      stroke(255, 0, 0);
      
      console.log("Setting second color: green");  
      stroke(0, 255, 0);
      
      console.log("Setting third color: blue");
      stroke(0, 0, 255);
    }
    
    endRecord();
    
    // Check the stitch data
    if (typeof _stitchData !== 'undefined') {
      console.log("=== Stitch Data Analysis ===");
      console.log("Number of threads:", _stitchData.threads.length);
      
      _stitchData.threads.forEach((thread, i) => {
        console.log(`Thread ${i}: RGB(${thread.color.r}, ${thread.color.g}, ${thread.color.b})`);
        console.log(`  - ${thread.runs.length} runs`);
        
        thread.runs.forEach((run, j) => {
          if (run.length === 1 && run[0].command === "trim") {
            console.log(`  - Run ${j}: TRIM command at (${run[0].x}, ${run[0].y})`);
          } else {
            console.log(`  - Run ${j}: ${run.stitches ? run.stitches.length : run.length} stitches`);
          }
        });
      });
      
      // Count trim commands
      let trimCount = 0;
      _stitchData.threads.forEach(thread => {
        thread.runs.forEach(run => {
          if (run.length === 1 && run[0].command === "trim") {
            trimCount++;
          }
        });
      });
      
      console.log(`\nTotal trim commands found: ${trimCount}`);
      console.log("Expected: 0 (trim commands should not be automatically added for color changes)");
      
      if (trimCount === 0) {
        console.log("✅ FIX SUCCESSFUL: No automatic trim commands added for color changes");
      } else {
        console.log("❌ FIX FAILED: Trim commands still being added automatically");
      }
      
    } else {
      console.log("❌ Could not access _stitchData");
    }
    
  } else {
    console.log("❌ Library functions not available");
  }
  
} catch (error) {
  console.error("Error testing library:", error.message);
}

console.log = originalConsoleLog;