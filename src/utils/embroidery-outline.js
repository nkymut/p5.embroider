/**
 * Embroidery Outline Utilities
 * Functions for creating outlines around embroidery patterns
 */

// Note: getPathBounds and calculateOffsetCorner functions are defined at the bottom 
// of this file as they are utilities needed by the outline functions

/**
 * Creates and exports a clean outline from a specified thread index with the given offset.
 * Uses embroideryOutlineFromPath internally to generate outline paths without stitch conversion.
 * Exports clean paths without stitch dots for cutting/plotting applications.
 * 
 * @param {number} threadIndex - Index of the thread to create outline from
 * @param {number} offsetDistance - Distance in mm to offset the outline
 * @param {string} filename - Output filename with extension (supports .png, .svg, .gcode, .dst)
 * @param {string} [outlineType='convex'] - Type of outline ('convex', 'bounding', 'scale')
 * @param {Object} embroideryState - Current embroidery state object
 * @returns {Promise<boolean>} Promise that resolves to true if export was successful
 * 
 * @example
 * // Export clean SVG outline (no stitch dots) - perfect for cutting
 * exportOutline(0, 5, "cut-outline.svg", "convex", getEmbroideryState());
 * 
 * // Export bounding box outline as PNG for templates
 * exportOutline(1, 10, "template.png", "bounding", getEmbroideryState());
 * 
 * // Export scaled outline as G-code for CNC cutting
 * exportOutline(0, 8, "cut-path.gcode", "scale", getEmbroideryState());
 */
export async function exportOutline(threadIndex, offsetDistance, filename, outlineType = "convex", embroideryState) {
  const { 
    _stitchData, 
    _DEBUG 
  } = embroideryState;

  if (!_stitchData.threads || _stitchData.threads.length === 0) {
    console.warn("🪡 p5.embroider says: No embroidery data found to create outline");
    return false;
  }

  if (threadIndex < 0 || threadIndex >= _stitchData.threads.length) {
    console.warn(`🪡 p5.embroider says: Invalid thread index ${threadIndex}. Available threads: 0-${_stitchData.threads.length - 1}`);
    return false;
  }

  // Extract file extension to determine export format
  const extension = filename.split('.').pop().toLowerCase();
  const supportedFormats = ['png', 'svg', 'gcode', 'dst'];
  
  if (!supportedFormats.includes(extension)) {
    console.warn(`🪡 p5.embroider says: Unsupported format '${extension}'. Supported formats: ${supportedFormats.join(', ')}`);
    return false;
  }

  if (_DEBUG) {
    console.log(`Creating outline from thread ${threadIndex} with ${offsetDistance}mm offset`);
    console.log(`Export format: ${extension}`);
    console.log(`Outline type: ${outlineType}`);
  }

  // Collect all stitch points from the specified thread
  const threadPoints = [];
  const thread = _stitchData.threads[threadIndex];
  
  if (thread.runs && Array.isArray(thread.runs)) {
    for (const run of thread.runs) {
      if (Array.isArray(run)) {
        for (const stitch of run) {
          if (stitch && typeof stitch.x === 'number' && typeof stitch.y === 'number') {
            threadPoints.push({ x: stitch.x, y: stitch.y });
          }
        }
      }
    }
  }

  if (threadPoints.length === 0) {
    console.warn(`🪡 p5.embroider says: No valid stitch points found in thread ${threadIndex}`);
    return false;
  }

  // Use embroideryOutlineFromPath to get outline points without creating stitches
  const outlinePoints = embroideryOutlineFromPath(
    threadPoints,
    offsetDistance,
    null, // No thread index - we don't want to add to embroidery data
    outlineType,
    false, // Don't apply transform
    0, // No corner radius for export
    embroideryState
  );

  if (!outlinePoints || outlinePoints.length === 0) {
    console.warn("🪡 p5.embroider says: Failed to create outline");
    return false;
  }

  if (_DEBUG) {
    console.log(`Generated outline with ${outlinePoints.length} points`);
  }

  // Export in the specified format
  try {
    switch (extension) {
      case 'dst':
        return await exportOutlinePathAsDST(outlinePoints, filename, embroideryState);
      case 'gcode':
        return await exportOutlinePathAsGCODE(outlinePoints, filename, embroideryState);
      case 'svg':
        return await exportOutlinePathAsSVG(outlinePoints, filename, embroideryState);
      case 'png':
        return await exportOutlinePathAsPNG(outlinePoints, filename, embroideryState);
      default:
        console.warn(`🪡 p5.embroider says: Unsupported export format: ${extension}`);
        return false;
    }
  } catch (error) {
    console.error(`🪡 p5.embroider says: Export failed:`, error);
    return false;
  }
}

/**
 * Export outline path as DST format
 * @private
 */
async function exportOutlinePathAsDST(outlinePoints, filename, embroideryState) {
  // Create embroidery data with outline as simple path
  const embroideryData = {
    width: 200,
    height: 200,
    pixelsPerUnit: 1,
    threads: [{
      color: { r: 0, g: 0, b: 0 },
      weight: 0.2,
      runs: [outlinePoints] // Direct path points without stitch conversion
    }]
  };

  if (typeof window !== 'undefined' && window.exportEmbroidery) {
    window.exportEmbroidery(filename, embroideryData);
    return true;
  } else {
    console.warn("🪡 p5.embroider says: DST export not available");
    return false;
  }
}

/**
 * Export outline as DST format (legacy)
 * @private
 */
async function exportOutlineDST(embroideryData, filename, embroideryState) {
  // Access the DST export functionality from the main embroidery system
  if (typeof window !== 'undefined' && window.exportEmbroidery) {
    window.exportEmbroidery(filename, embroideryData);
    return true;
  } else {
    console.warn("🪡 p5.embroider says: DST export not available");
    return false;
  }
}

/**
 * Export outline path as G-code format
 * @private
 */
async function exportOutlinePathAsGCODE(outlinePoints, filename, embroideryState) {
  // Create embroidery data with outline as simple path
  const embroideryData = {
    width: 200,
    height: 200,
    pixelsPerUnit: 1,
    threads: [{
      color: { r: 0, g: 0, b: 0 },
      weight: 0.2,
      runs: [outlinePoints] // Direct path points without stitch conversion
    }]
  };

  if (typeof window !== 'undefined' && window.exportGcode) {
    window.exportGcode(filename, embroideryData);
    return true;
  } else {
    console.warn("🪡 p5.embroider says: G-code export not available");
    return false;
  }
}

/**
 * Export outline as G-code format (legacy)
 * @private
 */
async function exportOutlineGCODE(embroideryData, filename, embroideryState) {
  // Access the G-code export functionality from the main embroidery system
  if (typeof window !== 'undefined' && window.exportGcode) {
    window.exportGcode(filename, embroideryData);
    return true;
  } else {
    console.warn("🪡 p5.embroider says: G-code export not available");
    return false;
  }
}

/**
 * Export outline path as SVG format (clean paths without stitch dots)
 * @private
 */
async function exportOutlinePathAsSVG(outlinePoints, filename, embroideryState) {
  try {
    // Create a clean SVG with just the outline path
    const svgContent = createCleanOutlineSVG(outlinePoints, filename);
    
    // Save the SVG file
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 100);
    
    return true;
  } catch (error) {
    console.error("🪡 p5.embroider says: SVG outline export failed:", error);
    return false;
  }
}

/**
 * Creates a clean SVG with just the outline path (no stitch dots)
 * @private
 */
function createCleanOutlineSVG(outlinePoints, title) {
  if (!outlinePoints || outlinePoints.length === 0) {
    throw new Error("No outline points to export");
  }

  // Calculate bounds
  let minX = outlinePoints[0].x, maxX = outlinePoints[0].x;
  let minY = outlinePoints[0].y, maxY = outlinePoints[0].y;
  
  for (const point of outlinePoints) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  const margin = 10; // 10mm margin
  
  const svgWidth = width + 2 * margin;
  const svgHeight = height + 2 * margin;
  const offsetX = -minX + margin;
  const offsetY = -minY + margin;

  // Create SVG path data
  let pathData = `M ${outlinePoints[0].x + offsetX} ${outlinePoints[0].y + offsetY}`;
  for (let i = 1; i < outlinePoints.length; i++) {
    pathData += ` L ${outlinePoints[i].x + offsetX} ${outlinePoints[i].y + offsetY}`;
  }
  pathData += ' Z'; // Close the path

  // Generate clean SVG
  const svgLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}mm" height="${svgHeight}mm" viewBox="0 0 ${svgWidth} ${svgHeight}">`,
    `  <!-- ${title} - Clean Outline Export -->`,
    `  <!-- Coordinate system: 1 SVG unit = 1mm -->`,
    `  <!-- Outline bounds: ${width.toFixed(1)}mm x ${height.toFixed(1)}mm -->`,
    `  <g stroke="#000000" stroke-width="0.1" fill="none" stroke-linecap="round" stroke-linejoin="round">`,
    `    <path d="${pathData}"/>`,
    `  </g>`,
    `</svg>`
  ];

  return svgLines.join('\n');
}

/**
 * Export outline as SVG format (legacy - with stitch dots)
 * @private
 */
async function exportOutlineSVG(embroideryData, filename, embroideryState) {
  // Access the SVG export functionality from the main embroidery system
  if (typeof window !== 'undefined' && window.exportSVG) {
    window.exportSVG(filename, embroideryData);
    return true;
  } else {
    console.warn("🪡 p5.embroider says: SVG export not available");
    return false;
  }
}

/**
 * Export outline path as PNG format (clean paths without stitch dots)
 * @private
 */
async function exportOutlinePathAsPNG(outlinePoints, filename, embroideryState) {
  try {
    // Create SVG first, then convert to PNG
    const svgContent = createCleanOutlineSVG(outlinePoints, filename);
    
    // Create canvas to convert SVG to PNG
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    // Set canvas size (300 DPI equivalent)
    const dpi = 300;
    const mmToPixels = dpi / 25.4;
    
    // Parse SVG dimensions
    const widthMatch = svgContent.match(/width="([^"]+)mm"/);
    const heightMatch = svgContent.match(/height="([^"]+)mm"/);
    
    if (!widthMatch || !heightMatch) {
      throw new Error("Could not parse SVG dimensions");
    }
    
    const svgWidthMM = parseFloat(widthMatch[1]);
    const svgHeightMM = parseFloat(heightMatch[1]);
    
    canvas.width = svgWidthMM * mmToPixels;
    canvas.height = svgHeightMM * mmToPixels;
    
    // Create image from SVG
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Fill with white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw SVG image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => {
            URL.revokeObjectURL(link.href);
            URL.revokeObjectURL(url);
          }, 100);
          
          resolve(true);
        }, "image/png");
      };
      img.onerror = reject;
      img.src = url;
    });
  } catch (error) {
    console.error("🪡 p5.embroider says: PNG outline export failed:", error);
    return false;
  }
}

/**
 * Export outline as PNG format (legacy - with stitch dots)
 * @private
 */
async function exportOutlinePNG(embroideryData, filename, embroideryState) {
  // Access the PNG export functionality from the main embroidery system
  if (typeof window !== 'undefined' && window.exportPNG) {
    window.exportPNG(filename, embroideryData);
    return true;
  } else {
    console.warn("🪡 p5.embroider says: PNG export not available");
    return false;
  }
}

/**
 * Exports only the specified thread path as SVG without creating an outline.
 * @param {number} threadIndex - Index of the thread to export
 * @param {string} filename - Output filename with .svg extension
 * @param {Object} embroideryState - Current embroidery state object
 * @returns {Promise<boolean>} Promise that resolves to true if export was successful
 * @example
 * // Export thread 0 path as SVG
 * exportSVGFromPath(0, "thread0-path.svg", getEmbroideryState());
 * 
 * // Export thread 1 path as SVG
 * exportSVGFromPath(1, "thread1-path.svg", getEmbroideryState());
 */
export async function exportSVGFromPath(threadIndex, filename, embroideryState) {
  const { 
    _stitchData, 
    _DEBUG 
  } = embroideryState;

  if (!_stitchData.threads || _stitchData.threads.length === 0) {
    console.warn("🪡 p5.embroider says: No embroidery data found to export");
    return false;
  }

  if (threadIndex < 0 || threadIndex >= _stitchData.threads.length) {
    console.warn(`🪡 p5.embroider says: Invalid thread index ${threadIndex}. Available threads: 0-${_stitchData.threads.length - 1}`);
    return false;
  }

  // Validate filename extension
  const extension = filename.split('.').pop().toLowerCase();
  if (extension !== 'svg') {
    console.warn(`🪡 p5.embroider says: Invalid file extension '${extension}'. Expected '.svg'`);
    return false;
  }

  if (_DEBUG) {
    console.log(`Exporting thread ${threadIndex} path as SVG: ${filename}`);
  }

  // Get the specified thread
  const thread = _stitchData.threads[threadIndex];
  
  if (!thread.runs || !Array.isArray(thread.runs) || thread.runs.length === 0) {
    console.warn(`🪡 p5.embroider says: Thread ${threadIndex} has no stitch data to export`);
    return false;
  }

  // Create a temporary embroidery data structure with only the specified thread
  const threadEmbroideryData = {
    width: _stitchData.width,
    height: _stitchData.height,
    pixelsPerUnit: _stitchData.pixelsPerUnit,
    threads: [thread] // Only include the specified thread
  };

  if (_DEBUG) {
    console.log(`Thread ${threadIndex} has ${thread.runs.length} runs with total stitches:`, 
      thread.runs.reduce((total, run) => total + (Array.isArray(run) ? run.length : 0), 0));
  }

  // Export using the existing SVG export functionality
  try {
    if (typeof window !== 'undefined' && window.exportSVG) {
      window.exportSVG(filename, threadEmbroideryData);
      if (_DEBUG) {
        console.log(`✅ Successfully exported thread ${threadIndex} path as ${filename}`);
      }
      return true;
    } else {
      console.warn("🪡 p5.embroider says: SVG export not available");
      return false;
    }
  } catch (error) {
    console.error(`🪡 p5.embroider says: SVG export failed:`, error);
    return false;
  }
}

/**
 * Creates an outline around the embroidery at a specified offset distance.
 * @param {number} offsetDistance - Distance in mm to offset the outline from the embroidery
 * @param {number} [threadIndex] - Thread index to add the outline to (defaults to current stroke thread)
 * @param {string} [outlineType='convex'] - Type of outline ('convex', 'bounding')
 * @param {number} [cornerRadius=0] - Corner radius in mm for bounding box outlines (only applies to 'bounding' type)
 * @param {Object} embroideryState - Current embroidery state object
 * @returns {void}
 */
export function embroideryOutline(offsetDistance, threadIndex, outlineType = "convex", cornerRadius = 0, embroideryState) {
  const { 
    _recording, 
    _stitchData, 
    _strokeThreadIndex, 
    _DEBUG, 
    applyCurrentTransformToPoints, 
    convertVerticesToStitches, 
    _strokeSettings, 
    _drawMode, 
    drawStitches 
  } = embroideryState;

  if (!_recording) {
    console.warn("🪡 p5.embroider says: embroideryOutline() can only be called while recording");
    return;
  }

  if (!_stitchData.threads || _stitchData.threads.length === 0) {
    console.warn("🪡 p5.embroider says: No embroidery data found to create outline");
    return;
  }

  // Use provided threadIndex or default to stroke thread
  if (threadIndex === undefined) {
    threadIndex = _strokeThreadIndex;
  }

  // Collect all stitch points from all threads
  const allPoints = [];
  for (const thread of _stitchData.threads) {
    if (thread.runs && Array.isArray(thread.runs)) {
      for (const run of thread.runs) {
        if (Array.isArray(run)) {
          for (const stitch of run) {
            if (stitch && typeof stitch.x === 'number' && typeof stitch.y === 'number') {
              allPoints.push({ x: stitch.x, y: stitch.y });
            }
          }
        }
      }
    }
  }

  if (allPoints.length === 0) {
    console.warn("🪡 p5.embroider says: No valid stitch points found to create outline");
    return;
  }

  if (_DEBUG) {
    console.log("Creating outline from", allPoints.length, "stitch points");
    console.log("Offset distance:", offsetDistance, "mm");
    console.log("Outline type:", outlineType);
  }

  let outlinePoints = [];

  // Create outline based on type
  switch (outlineType) {
    case "bounding":
      outlinePoints = createBoundingBoxOutline(allPoints, offsetDistance, cornerRadius);
      break;
    case "convex":
    default:
      outlinePoints = createConvexHullOutline(allPoints, offsetDistance);
      break;
  }

  if (outlinePoints.length === 0) {
    console.warn("🪡 p5.embroider says: Failed to create outline");
    return;
  }

  // Apply current transformation to outline points
  const transformedOutlinePoints = applyCurrentTransformToPoints(outlinePoints);

  // Convert outline to stitches
  const outlineStitches = convertVerticesToStitches(
    transformedOutlinePoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
    _strokeSettings,
  );

  if (outlineStitches.length > 0) {
    // Ensure we have a valid thread
    if (threadIndex >= _stitchData.threads.length) {
      threadIndex = _strokeThreadIndex;
    }

    // Add outline stitches to the specified thread
    _stitchData.threads[threadIndex].runs.push(outlineStitches);

    // Draw outline if in visual modes
    if (_drawMode === "stitch" || _drawMode === "realistic") {
      drawStitches(outlineStitches, threadIndex);
    }

    if (_DEBUG) {
      console.log("Added outline with", outlineStitches.length, "stitches to thread", threadIndex);
    }
  }
}

/**
 * Creates an outline around specified stitch data at a specified offset distance.
 * @param {Array} stitchDataArray - Array of stitch data objects (each with x, y coordinates)
 * @param {number} offsetDistance - Distance in mm to offset the outline from the path
 * @param {number} [threadIndex] - Thread index to add the outline to (defaults to current stroke thread)
 * @param {string} [outlineType='convex'] - Type of outline ('convex', 'bounding', 'scale')
 * @param {boolean} [applyTransform=true] - Whether to apply current transformation to the outline
 * @param {number} [cornerRadius=0] - Corner radius in mm for bounding box outlines (only applies to 'bounding' type)
 * @param {Object} embroideryState - Current embroidery state object
 * @returns {Array} Array of outline points {x, y}
 */
export function embroideryOutlineFromPath(
  stitchDataArray,
  offsetDistance,
  threadIndex,
  outlineType = "convex",
  applyTransform = true,
  cornerRadius = 0,
  embroideryState
) {
  const { 
    _recording, 
    _strokeThreadIndex, 
    _DEBUG, 
    applyCurrentTransformToPoints, 
    convertVerticesToStitches, 
    _strokeSettings, 
    _stitchData,
    _drawMode, 
    drawStitches 
  } = embroideryState;

  if (!stitchDataArray || !Array.isArray(stitchDataArray)) {
    console.warn("🪡 p5.embroider says: embroideryOutlineFromPath() requires a valid array of stitch data");
    return [];
  }

  if (stitchDataArray.length === 0) {
    console.warn("🪡 p5.embroider says: No stitch data provided to create outline");
    return [];
  }

  // Use provided threadIndex or default to stroke thread
  if (threadIndex === undefined) {
    threadIndex = _strokeThreadIndex;
  }

  // Extract points from the provided stitch data
  const allPoints = [];
  for (const item of stitchDataArray) {
    if (item && typeof item.x === 'number' && typeof item.y === 'number') {
      allPoints.push({ x: item.x, y: item.y });
    } else if (Array.isArray(item)) {
      // Handle nested arrays (runs of stitches)
      for (const stitch of item) {
        if (stitch && typeof stitch.x === 'number' && typeof stitch.y === 'number') {
          allPoints.push({ x: stitch.x, y: stitch.y });
        }
      }
    }
  }

  if (allPoints.length === 0) {
    console.warn("🪡 p5.embroider says: No valid stitch points found in provided data to create outline");
    return [];
  }

  if (_DEBUG) {
    console.log("Creating outline from", allPoints.length, "stitch points from provided data");
    console.log("Offset distance:", offsetDistance, "mm");
    console.log("Outline type:", outlineType);
  }

  let outlinePoints = [];

  // Create outline based on type
  switch (outlineType) {
    case "bounding":
      outlinePoints = createBoundingBoxOutline(allPoints, offsetDistance, cornerRadius);
      break;
    case "scale":
      outlinePoints = createScaledOutline(allPoints, offsetDistance);
      break;
    case "convex":
    default:
      outlinePoints = createConvexHullOutline(allPoints, offsetDistance);
      break;
  }

  if (outlinePoints.length === 0) {
    console.warn("🪡 p5.embroider says: Failed to create outline from provided data");
    return [];
  }

  // Apply current transformation to outline points if requested and recording
  let finalOutlinePoints = outlinePoints;
  if (applyTransform && _recording) {
    finalOutlinePoints = applyCurrentTransformToPoints(outlinePoints);
  }

  // If recording and thread index provided, add to embroidery data
  if (_recording && threadIndex != null) {
    // Convert outline to stitches
    const outlineStitches = convertVerticesToStitches(
      finalOutlinePoints.map((p) => ({ x: p.x, y: p.y, isVert: true })),
      _strokeSettings,
    );

    if (outlineStitches.length > 0) {
      // Ensure we have a valid thread
      if (threadIndex >= _stitchData.threads.length) {
        threadIndex = _strokeThreadIndex;
      }

      // Add outline stitches to the specified thread
      _stitchData.threads[threadIndex].runs.push(outlineStitches);

      // Draw outline if in visual modes
      if (_drawMode === "stitch" || _drawMode === "realistic") {
        drawStitches(outlineStitches, threadIndex);
      }

      if (_DEBUG) {
        console.log("Added outline with", outlineStitches.length, "stitches to thread", threadIndex);
      }
    }
  }

  return finalOutlinePoints;
}

/**
 * Creates a convex hull outline around the given points.
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @param {number} offsetDistance - Distance to offset the outline
 * @returns {Array<{x: number, y: number}>} Array of outline points
 */
export function createConvexHullOutline(points, offsetDistance) {
  // Find convex hull of all points
  const hullPoints = getConvexHull(points);

  if (hullPoints.length < 3) {
    console.warn("Insufficient points for convex hull, falling back to bounding box");
    return createBoundingBoxOutline(points, offsetDistance);
  }

  // Reverse the hull points to ensure clockwise ordering for outward expansion
  const reversedHull = [...hullPoints].reverse();

  // Expand the hull outward by the offset distance
  const expandedHull = expandPolygon(reversedHull, offsetDistance);

  // Close the polygon
  if (expandedHull.length > 0) {
    expandedHull.push({ x: expandedHull[0].x, y: expandedHull[0].y });
  }

  return expandedHull;
}

/**
 * Creates a bounding box outline around the given points.
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @param {number} offsetDistance - Distance to offset the outline
 * @param {number} [cornerRadius=0] - Corner radius in mm for rounded corners
 * @returns {Array<{x: number, y: number}>} Array of outline points
 */
export function createBoundingBoxOutline(points, offsetDistance, cornerRadius = 0) {
  const bounds = getPathBounds(points);

  // Expand bounds by offset distance
  const expandedBounds = {
    x: bounds.x - offsetDistance,
    y: bounds.y - offsetDistance,
    w: bounds.w + 2 * offsetDistance,
    h: bounds.h + 2 * offsetDistance,
  };

  // If no corner radius, return simple rectangle
  if (cornerRadius <= 0) {
    return [
      { x: expandedBounds.x, y: expandedBounds.y },
      { x: expandedBounds.x + expandedBounds.w, y: expandedBounds.y },
      { x: expandedBounds.x + expandedBounds.w, y: expandedBounds.y + expandedBounds.h },
      { x: expandedBounds.x, y: expandedBounds.y + expandedBounds.h },
      { x: expandedBounds.x, y: expandedBounds.y }, // Close the rectangle
    ];
  }

  // Limit corner radius to half the smaller dimension
  const maxRadius = Math.min(expandedBounds.w, expandedBounds.h) / 2;
  const r = Math.min(cornerRadius, maxRadius);

  // Create rounded rectangle points (clockwise)
  const outlinePoints = [];
  const segments = 8; // Number of segments per quarter circle

  // Define corner centers
  const corners = [
    { x: expandedBounds.x + r, y: expandedBounds.y + r }, // Top-left
    { x: expandedBounds.x + expandedBounds.w - r, y: expandedBounds.y + r }, // Top-right
    { x: expandedBounds.x + expandedBounds.w - r, y: expandedBounds.y + expandedBounds.h - r }, // Bottom-right
    { x: expandedBounds.x + r, y: expandedBounds.y + expandedBounds.h - r }, // Bottom-left
  ];

  // Define start angles for each corner (clockwise from top-left)
  const startAngles = [Math.PI, Math.PI * 1.5, 0, Math.PI * 0.5];

  for (let cornerIndex = 0; cornerIndex < 4; cornerIndex++) {
    const corner = corners[cornerIndex];
    const startAngle = startAngles[cornerIndex];

    // Add corner arc points
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (i / segments) * (Math.PI / 2);
      const x = corner.x + Math.cos(angle) * r;
      const y = corner.y + Math.sin(angle) * r;
      outlinePoints.push({ x, y });
    }
  }

  // Close the path
  if (outlinePoints.length > 0) {
    outlinePoints.push({ x: outlinePoints[0].x, y: outlinePoints[0].y });
  }

  return outlinePoints;
}

/**
 * Creates a scaled outline by scaling the original path outward from its centroid.
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @param {number} offsetDistance - Distance to offset the outline
 * @returns {Array<{x: number, y: number}>} Array of outline points
 */
export function createScaledOutline(points, offsetDistance) {
  if (points.length === 0) return [];

  // Calculate the centroid of the path
  let centroidX = 0,
    centroidY = 0;
  for (const point of points) {
    centroidX += point.x;
    centroidY += point.y;
  }
  centroidX /= points.length;
  centroidY /= points.length;

  // Calculate the average distance from centroid to points
  let avgDistance = 0;
  for (const point of points) {
    const dx = point.x - centroidX;
    const dy = point.y - centroidY;
    avgDistance += Math.sqrt(dx * dx + dy * dy);
  }
  avgDistance /= points.length;

  // Calculate scale factor to achieve the desired offset
  // If avgDistance is 0 (all points at centroid), use a default scale
  const scaleFactor = avgDistance > 0 ? (avgDistance + offsetDistance) / avgDistance : 1 + offsetDistance;

  // Scale each point outward from the centroid
  const scaledPoints = [];
  for (const point of points) {
    const dx = point.x - centroidX;
    const dy = point.y - centroidY;

    const scaledX = centroidX + dx * scaleFactor;
    const scaledY = centroidY + dy * scaleFactor;

    scaledPoints.push({ x: scaledX, y: scaledY });
  }

  // Close the path if it has more than 2 points
  if (scaledPoints.length > 2 && scaledPoints.length > 0) {
    const firstPoint = scaledPoints[0];
    const lastPoint = scaledPoints[scaledPoints.length - 1];

    // Only add closing point if it's not already closed
    const distance = Math.sqrt(Math.pow(lastPoint.x - firstPoint.x, 2) + Math.pow(lastPoint.y - firstPoint.y, 2));

    if (distance > 0.1) {
      // Small threshold to avoid duplicate points
      scaledPoints.push({ x: firstPoint.x, y: firstPoint.y });
    }
  }

  return scaledPoints;
}

/**
 * Computes the convex hull of a set of 2D points using Graham scan algorithm.
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @returns {Array<{x: number, y: number}>} Array of convex hull points
 */
export function getConvexHull(points) {
  if (points.length < 3) return points;

  // Remove duplicate points
  const uniquePoints = [];
  const seen = new Set();
  for (const point of points) {
    const key = `${Math.round(point.x * 1000)},${Math.round(point.y * 1000)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePoints.push(point);
    }
  }

  if (uniquePoints.length < 3) return uniquePoints;

  // Find the bottom-most point (and left-most if tie)
  let bottom = uniquePoints[0];
  for (let i = 1; i < uniquePoints.length; i++) {
    if (uniquePoints[i].y < bottom.y || (uniquePoints[i].y === bottom.y && uniquePoints[i].x < bottom.x)) {
      bottom = uniquePoints[i];
    }
  }

  // Sort points by polar angle with respect to bottom point
  const sortedPoints = uniquePoints.filter((p) => p !== bottom);
  sortedPoints.sort((a, b) => {
    // Use p5.Vector for angle calculations
    const vA = createVector(a.x - bottom.x, a.y - bottom.y);
    const vB = createVector(b.x - bottom.x, b.y - bottom.y);

    const angleA = vA.heading();
    const angleB = vB.heading();

    if (angleA !== angleB) {
      return angleA - angleB;
    }

    // If angles are equal, sort by distance using p5.Vector
    const distA = vA.magSq(); // magSq() is faster than mag() for comparisons
    const distB = vB.magSq();
    return distA - distB;
  });

  // Build convex hull using Graham scan
  const hull = [bottom];

  for (const point of sortedPoints) {
    // Remove points that would create a clockwise turn
    while (hull.length > 1 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
      hull.pop();
    }
    hull.push(point);
  }

  return hull;
}

/**
 * Computes the cross product to determine turn direction using p5.Vector.
 * @param {Object} O - Origin point {x, y}
 * @param {Object} A - Point A {x, y}
 * @param {Object} B - Point B {x, y}
 * @returns {number} Cross product z-component
 */
export function crossProduct(O, A, B) {
  const v1 = createVector(A.x - O.x, A.y - O.y);
  const v2 = createVector(B.x - O.x, B.y - O.y);
  // Use p5.Vector.cross(v1, v2).z to get the z-component of the cross product
  return p5.Vector.cross(v1, v2).z;
}

/**
 * Expands a polygon outward by a specified distance.
 * @param {Array<{x: number, y: number}>} polygon - Array of polygon points
 * @param {number} distance - Distance to expand the polygon
 * @returns {Array<{x: number, y: number}>} Array of expanded polygon points
 */
export function expandPolygon(polygon, distance) {
  if (polygon.length < 3) return polygon;

  const expandedPoints = [];

  for (let i = 0; i < polygon.length; i++) {
    const prev = polygon[(i - 1 + polygon.length) % polygon.length];
    const curr = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    // Calculate the offset point - use true for isLeft to expand outward
    // (works with clockwise-ordered polygons)
    const offsetPoint = calculateOffsetCorner(prev, curr, next, distance, true);
    expandedPoints.push(offsetPoint);
  }

  return expandedPoints;
}

/**
 * Helper function to get path bounds (needs to be imported or defined)
 * This is a placeholder - the actual implementation should be imported from the main file
 */
function getPathBounds(points) {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  
  let minX = points[0].x, maxX = points[0].x;
  let minY = points[0].y, maxY = points[0].y;
  
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
}

/**
 * Helper function to calculate offset corner (needs to be imported or defined)
 * This is a placeholder - the actual implementation should be imported from the main file
 */
function calculateOffsetCorner(p1, p2, p3, offset, isLeft) {
  // Calculate direction vectors
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  // Normalize
  const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  // Handle very short segments (common in curved corners)
  if (len1 < 0.1 || len2 < 0.1) {
    // Use simple perpendicular offset for tiny segments
    const avgVecX = (v1.x + v2.x) / 2;
    const avgVecY = (v1.y + v2.y) / 2;
    const avgLen = Math.sqrt(avgVecX * avgVecX + avgVecY * avgVecY);

    if (avgLen > 0) {
      const actualOffset = isLeft ? offset : -offset;
      const perpX = (-avgVecY / avgLen) * actualOffset;
      const perpY = (avgVecX / avgLen) * actualOffset;
      return { x: p2.x + perpX, y: p2.y + perpY };
    } else {
      return { x: p2.x, y: p2.y };
    }
  }

  const n1 = { x: v1.x / len1, y: v1.y / len1 };
  const n2 = { x: v2.x / len2, y: v2.y / len2 };

  // Calculate perpendiculars (90-degree rotation)
  const perp1 = { x: -n1.y, y: n1.x };
  const perp2 = { x: -n2.y, y: n2.x };

  // Apply offset direction
  const actualOffset = isLeft ? offset : -offset;
  const offsetPerp1 = { x: perp1.x * actualOffset, y: perp1.y * actualOffset };
  const offsetPerp2 = { x: perp2.x * actualOffset, y: perp2.y * actualOffset };

  // Find intersection of offset lines
  const line1Start = { x: p1.x + offsetPerp1.x, y: p1.y + offsetPerp1.y };
  const line1End = { x: p2.x + offsetPerp1.x, y: p2.y + offsetPerp1.y };
  const line2Start = { x: p2.x + offsetPerp2.x, y: p2.y + offsetPerp2.y };
  const line2End = { x: p3.x + offsetPerp2.x, y: p3.y + offsetPerp2.y };

  // Calculate intersection
  const denom = (line1Start.x - line1End.x) * (line2Start.y - line2End.y) - 
                (line1Start.y - line1End.y) * (line2Start.x - line2End.x);

  if (Math.abs(denom) < 1e-10) {
    // Lines are parallel, use average
    return {
      x: p2.x + (offsetPerp1.x + offsetPerp2.x) / 2,
      y: p2.y + (offsetPerp1.y + offsetPerp2.y) / 2
    };
  }

  const t = ((line1Start.x - line2Start.x) * (line2Start.y - line2End.y) - 
             (line1Start.y - line2Start.y) * (line2Start.x - line2End.x)) / denom;

  const intersectionX = line1Start.x + t * (line1End.x - line1Start.x);
  const intersectionY = line1Start.y + t * (line1End.y - line1Start.y);

  // Check if intersection is reasonable (not too far from original point)
  const distanceFromOriginal = Math.sqrt(
    Math.pow(intersectionX - p2.x, 2) + Math.pow(intersectionY - p2.y, 2)
  );

  const maxReasonableDistance = Math.abs(offset) * 10; // Allow up to 10x the offset distance

  if (distanceFromOriginal > maxReasonableDistance) {
    // Fall back to simple perpendicular offset
    return {
      x: p2.x + (offsetPerp1.x + offsetPerp2.x) / 2,
      y: p2.y + (offsetPerp1.y + offsetPerp2.y) / 2
    };
  }

  return { x: intersectionX, y: intersectionY };
}
