// p5.js SVG Reader for Embroidery Patterns
// Parses SVG files into embroidery part objects for use with p5.embroider
import { px2mm } from "../utils/unit-conversion.js";

export class SVGReader {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.dpi = options.dpi || 96;
  }

  /**
   * Debug logging helper - only outputs when debug mode is enabled
   * @private
   */
  _log() {
    if (this.debug) {
      console.log.apply(console, arguments);
    }
  }

  /**
   * Parse SVG text into an array of embroidery part objects.
   * @param {string} svgText - Raw SVG markup string
   * @param {Object} [options] - Parse options
   * @param {number} [options.dpi=96] - DPI for px-to-mm conversion
   * @returns {{ parts: Array, boundingBox: Object }} Parsed parts and their bounding box
   */
  parseSVG(svgText, options = {}) {
    const dpi = options.dpi || this.dpi;

    if (!svgText || typeof svgText !== "string") {
      console.warn("🪡 p5.embroider SVGReader: No SVG text provided");
      return { parts: [], boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 } };
    }

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");

    if (!svgElement) {
      console.error("🪡 p5.embroider SVGReader: No <svg> element found");
      return { parts: [], boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 } };
    }

    // Parse CSS styles from <defs><style> section
    const cssStyles = this.parseCSSStyles(svgDoc);
    this._log("Parsed CSS styles:", cssStyles);

    const allElements = svgElement.querySelectorAll("path, circle, rect, line, polyline, polygon, ellipse");
    this._log(
      `Found ${allElements.length} SVG elements:`,
      Array.from(allElements).map((el) => el.tagName.toLowerCase()),
    );

    const parts = [];
    allElements.forEach((element, index) => {
      const part = this.parseElement(element, index, cssStyles, dpi);
      if (part) {
        // Ensure closed is set for shapes that are inherently closed
        if (
          part.elementType === "circle" ||
          part.elementType === "ellipse" ||
          part.elementType === "rect" ||
          part.elementType === "polygon"
        ) {
          part.closed = true;
        }
        parts.push(part);
      }
    });

    const boundingBox = this.calculateBoundingBox(parts);

    this._log(`Parsed ${parts.length} SVG parts`);
    return { parts, boundingBox };
  }

  /**
   * Parse CSS styles from SVG <defs><style> sections.
   * @param {Document} svgDoc - Parsed SVG document
   * @returns {Object} Map of CSS selectors to style objects
   */
  parseCSSStyles(svgDoc) {
    const styles = {};
    const styleElements = svgDoc.querySelectorAll("defs style, style");

    styleElements.forEach((styleElement) => {
      const cssText = styleElement.textContent || styleElement.innerHTML;
      this._log("Found CSS style element:", cssText.substring(0, 200) + "...");

      // Use regex to find CSS rules: selector { properties }
      const ruleRegex = /([^{]+)\{([^}]+)\}/g;
      let match;

      while ((match = ruleRegex.exec(cssText)) !== null) {
        const selector = match[1].trim();
        const properties = match[2].trim();

        // Parse properties
        const styleObj = {};
        properties.split(";").forEach((prop) => {
          const trimmedProp = prop.trim();
          if (trimmedProp) {
            const colonIndex = trimmedProp.indexOf(":");
            if (colonIndex > 0) {
              const property = trimmedProp.substring(0, colonIndex).trim();
              const value = trimmedProp.substring(colonIndex + 1).trim();
              if (property && value) {
                styleObj[property] = value;
              }
            }
          }
        });

        if (Object.keys(styleObj).length > 0) {
          styles[selector] = styleObj;
          this._log(`Parsed CSS rule for ${selector}:`, styleObj);
        }
      }
    });

    return styles;
  }

  /**
   * Parse a single SVG element into an embroidery part object.
   * @param {Element} element - SVG DOM element
   * @param {number} index - Element index for naming
   * @param {Object} [cssStyles={}] - Parsed CSS styles map
   * @param {number} [dpi=96] - DPI for px-to-mm conversion
   * @returns {Object|null} Part object or null if element cannot be parsed
   */
  parseElement(element, index, cssStyles = {}, dpi = 96) {
    let pathData = "";
    let shapeParams = null;
    const tagName = element.tagName.toLowerCase();

    this._log(`Creating SVG part object for ${tagName} element:`, element);

    // Helper for px-to-mm conversion using configured DPI
    const toMm = (px) => px2mm(px, dpi);

    switch (tagName) {
      case "path": {
        const d = element.getAttribute("d");
        pathData = d || "";
        // Convert to mm by sampling points and reconstructing path with proper subpath structure
        if (pathData) {
          const sampled = this.parsePathData(pathData) || [];
          if (sampled.length > 0) {
            let rebuilt = "";
            let lastWasClose = false;

            for (let i = 0; i < sampled.length; i++) {
              const pt = sampled[i];
              const ptMm = { x: toMm(pt.x), y: toMm(pt.y) };

              if (pt.isMoveTo) {
                rebuilt += ` M ${ptMm.x} ${ptMm.y}`;
                lastWasClose = false;
              } else {
                rebuilt += ` L ${ptMm.x} ${ptMm.y}`;
                lastWasClose = false;
              }

              if (pt.isClosePath) {
                rebuilt += " Z";
                lastWasClose = true;
              }
            }

            pathData = rebuilt.trim();
          }
        }
        break;
      }
      case "circle": {
        const cx = toMm(parseFloat(element.getAttribute("cx") || 0));
        const cy = toMm(parseFloat(element.getAttribute("cy") || 0));
        const r = toMm(parseFloat(element.getAttribute("r") || 0));
        if (r > 0) {
          shapeParams = { cx, cy, r };
          pathData = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
        }
        break;
      }
      case "rect": {
        const x = toMm(parseFloat(element.getAttribute("x") || 0));
        const y = toMm(parseFloat(element.getAttribute("y") || 0));
        const w = toMm(parseFloat(element.getAttribute("width") || 0));
        const h = toMm(parseFloat(element.getAttribute("height") || 0));
        if (w > 0 && h > 0) {
          shapeParams = { x, y, w, h };
          pathData = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
        }
        break;
      }
      case "ellipse": {
        const ex = toMm(parseFloat(element.getAttribute("cx") || 0));
        const ey = toMm(parseFloat(element.getAttribute("cy") || 0));
        const rx = toMm(parseFloat(element.getAttribute("rx") || 0));
        const ry = toMm(parseFloat(element.getAttribute("ry") || 0));
        if (rx > 0 && ry > 0) {
          shapeParams = { cx: ex, cy: ey, rx, ry };
          pathData = `M ${ex - rx} ${ey} A ${rx} ${ry} 0 1 1 ${ex + rx} ${ey} A ${rx} ${ry} 0 1 1 ${ex - rx} ${ey} Z`;
        }
        break;
      }
      case "line": {
        const x1 = toMm(parseFloat(element.getAttribute("x1") || 0));
        const y1 = toMm(parseFloat(element.getAttribute("y1") || 0));
        const x2 = toMm(parseFloat(element.getAttribute("x2") || 0));
        const y2 = toMm(parseFloat(element.getAttribute("y2") || 0));
        shapeParams = { x1, y1, x2, y2 };
        pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
        break;
      }
      case "polygon":
      case "polyline": {
        const points = element.getAttribute("points") || "";
        const coordsPx = points
          .trim()
          .split(/[\s,]+/)
          .map(parseFloat);
        if (coordsPx.length >= 4) {
          const coords = [];
          for (let i = 0; i < coordsPx.length; i += 2) {
            const px = toMm(coordsPx[i]);
            const py = toMm(coordsPx[i + 1]);
            coords.push(px, py);
          }
          shapeParams = { coords, closed: tagName === "polygon" };
          pathData = `M ${coords[0]} ${coords[1]}`;
          for (let i = 2; i < coords.length; i += 2) {
            pathData += ` L ${coords[i]} ${coords[i + 1]}`;
          }
          if (tagName === "polygon") {
            pathData += " Z";
          }
        }
        break;
      }
    }

    if (!pathData) return null;

    // Parse SVG attributes for colors with improved handling
    const stroke = element.getAttribute("stroke");
    const fill = element.getAttribute("fill");
    const strokeWidthPx = parseFloat(element.getAttribute("stroke-width")) || 2;

    // Also check for style attribute which might contain fill/stroke
    const styleAttr = element.getAttribute("style");
    let styleFill = null;
    let styleStroke = null;
    let styleStrokeWidth = null;

    if (styleAttr) {
      const styleRules = styleAttr.split(";");
      styleRules.forEach((rule) => {
        const [property, value] = rule.split(":").map((s) => s.trim());
        if (property === "fill") styleFill = value;
        else if (property === "stroke") styleStroke = value;
        else if (property === "stroke-width") styleStrokeWidth = parseFloat(value);
      });
    }

    // Check for CSS classes and apply their styles
    let cssFill = null;
    let cssStroke = null;
    let cssStrokeWidth = null;

    const classAttr = element.getAttribute("class");
    if (classAttr && cssStyles) {
      const classes = classAttr
        .split(" ")
        .map((c) => c.trim())
        .filter((c) => c);
      classes.forEach((className) => {
        const cssRule = cssStyles[`.${className}`];
        if (cssRule) {
          this._log(`Applying CSS rule for class ${className}:`, cssRule);
          if (cssRule.fill) cssFill = cssRule.fill;
          if (cssRule.stroke) cssStroke = cssRule.stroke;
          if (cssRule["stroke-width"]) cssStrokeWidth = parseFloat(cssRule["stroke-width"]);
        }
      });
    }

    // Use CSS values if available, otherwise fall back to style attributes, then direct attributes
    const finalFill = cssFill || fill || styleFill;
    const finalStroke = cssStroke || stroke || styleStroke;
    const finalStrokeWidth = cssStrokeWidth || strokeWidthPx || styleStrokeWidth || 2;
    const finalStrokeWidthMm = toMm(finalStrokeWidth);

    this._log(`Element ${tagName} color parsing:`, {
      directFill: fill,
      styleFill: styleFill,
      cssFill: cssFill,
      finalFill: finalFill,
      directStroke: stroke,
      styleStroke: styleStroke,
      cssStroke: cssStroke,
      finalStroke: finalStroke,
      classes: element.getAttribute("class"),
      hasFill: finalFill && finalFill !== "none",
      hasStroke: finalStroke && finalStroke !== "none",
    });

    // Determine default behavior when no colors are specified
    const hasStroke = finalStroke && finalStroke !== "none";
    const hasFill = finalFill && finalFill !== "none";
    const hasNoColors = !hasStroke && !hasFill;

    // Determine if path should be closed (has Z command)
    const shouldClose = pathData.toLowerCase().includes("z");

    // Create structured object
    const partObject = {
      id: `part_${index}`,
      name: `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} ${index + 1}`,
      elementType: tagName,
      pathData: pathData,
      shapeParams: shapeParams,
      closed: shouldClose,
      originalAttributes: {
        stroke: finalStroke,
        fill: finalFill,
        "stroke-width": finalStrokeWidth,
        style: styleAttr,
        class: element.getAttribute("class"),
      },
      strokeSettings: {
        enabled: hasStroke || hasNoColors,
        color: this.parseColor(finalStroke) || [128, 128, 128],
        weight: finalStrokeWidthMm,
        mode: "straight",
        stitchLength: 2,
        minStitchLength: 0.5,
        resampleNoise: 0.0,
      },
      fillSettings: {
        enabled: hasFill,
        color: this.parseColor(finalFill) || [0, 0, 0],
        mode: "tatami",
        stitchLength: 3,
        minStitchLength: 0.5,
        resampleNoise: 0.0,
        rowSpacing: 0.8,
      },
      visible: true,
    };

    this._log(`Created part object:`, {
      name: partObject.name,
      fillEnabled: partObject.fillSettings.enabled,
      fillColor: partObject.fillSettings.color,
      strokeEnabled: partObject.strokeSettings.enabled,
      strokeColor: partObject.strokeSettings.color,
    });

    return partObject;
  }

  /**
   * Parse a CSS color string into an [r, g, b] array.
   * Supports hex (#rgb, #rrggbb), rgb(), rgba(), and named colors.
   * @param {string} colorStr - CSS color string
   * @returns {number[]|null} [r, g, b] array or null if unparseable
   */
  parseColor(colorStr) {
    if (!colorStr || colorStr === "none") return null;

    // Handle hex colors
    if (colorStr.startsWith("#")) {
      const hex = colorStr.slice(1);
      if (hex.length === 3) {
        return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
      } else if (hex.length === 6) {
        return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
      }
    }

    // Handle RGB colors
    const rgbMatch = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
      return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
    }

    // Handle RGBA colors (ignore alpha for now)
    const rgbaMatch = colorStr.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/);
    if (rgbaMatch) {
      return [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])];
    }

    // Handle common color names with extended palette
    const colorMap = {
      black: [0, 0, 0],
      white: [255, 255, 255],
      red: [255, 0, 0],
      green: [0, 255, 0],
      blue: [0, 0, 255],
      yellow: [255, 255, 0],
      cyan: [0, 255, 255],
      magenta: [255, 0, 255],
      orange: [255, 165, 0],
      purple: [128, 0, 128],
      pink: [255, 192, 203],
      brown: [165, 42, 42],
      gray: [128, 128, 128],
      grey: [128, 128, 128],
      lime: [0, 255, 0],
      navy: [0, 0, 128],
      teal: [0, 128, 128],
      olive: [128, 128, 0],
      maroon: [128, 0, 0],
      fuchsia: [255, 0, 255],
      aqua: [0, 255, 255],
    };

    return colorMap[colorStr.toLowerCase()] || null;
  }

  /**
   * Parse SVG path data string into an array of point objects.
   * Handles M, L, H, V, C, S, Q, A, Z commands (both absolute and relative).
   * @param {string} pathData - SVG path `d` attribute string
   * @returns {Array<{x: number, y: number, isMoveTo?: boolean, isClosePath?: boolean}>} Point array
   */
  parsePathData(pathData) {
    const points = [];
    const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

    this._log("Parsing path data:", pathData.substring(0, 100) + "...");
    this._log("Found commands:", commands?.length || 0);

    if (!commands) return points;

    let currentX = 0,
      currentY = 0;
    let lastControlX = 0,
      lastControlY = 0;
    let subpathStartX = 0,
      subpathStartY = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const type = command[0];

      // Robust coordinate parsing for SVG paths
      const coordString = command.slice(1).trim();
      const coords = [];
      const numberRegex = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
      let match;
      while ((match = numberRegex.exec(coordString)) !== null) {
        const num = parseFloat(match[0]);
        if (!isNaN(num)) {
          coords.push(num);
        }
      }

      if (i < 3) {
        this._log(`Command: ${type}, coords:`, coords);
      }

      switch (type.toLowerCase()) {
        case "m":
          if (coords.length >= 2) {
            currentX = type === type.toUpperCase() ? coords[0] : currentX + coords[0];
            currentY = type === type.toUpperCase() ? coords[1] : currentY + coords[1];
            subpathStartX = currentX;
            subpathStartY = currentY;
            points.push({ x: currentX, y: currentY, isMoveTo: true });

            // Additional coordinate pairs treated as lineto
            for (let j = 2; j < coords.length; j += 2) {
              if (j + 1 < coords.length) {
                currentX = type === type.toUpperCase() ? coords[j] : currentX + coords[j];
                currentY = type === type.toUpperCase() ? coords[j + 1] : currentY + coords[j + 1];
                points.push({ x: currentX, y: currentY });
              }
            }
          }
          break;

        case "l":
          if (coords.length >= 2) {
            for (let j = 0; j < coords.length; j += 2) {
              if (j + 1 < coords.length) {
                currentX = type === type.toUpperCase() ? coords[j] : currentX + coords[j];
                currentY = type === type.toUpperCase() ? coords[j + 1] : currentY + coords[j + 1];
                points.push({ x: currentX, y: currentY });
              }
            }
          }
          break;

        case "h":
          if (coords.length >= 1) {
            currentX = type === "H" ? coords[0] : currentX + coords[0];
            points.push({ x: currentX, y: currentY });
          }
          break;

        case "v":
          if (coords.length >= 1) {
            currentY = type === "V" ? coords[0] : currentY + coords[0];
            points.push({ x: currentX, y: currentY });
          }
          break;

        case "c": // Cubic Bezier curve
          for (let ci = 0; ci < coords.length; ci += 6) {
            if (ci + 5 < coords.length) {
              let cp1x, cp1y, cp2x, cp2y, endX, endY;

              if (type === "C") {
                cp1x = coords[ci];
                cp1y = coords[ci + 1];
                cp2x = coords[ci + 2];
                cp2y = coords[ci + 3];
                endX = coords[ci + 4];
                endY = coords[ci + 5];
              } else {
                cp1x = currentX + coords[ci];
                cp1y = currentY + coords[ci + 1];
                cp2x = currentX + coords[ci + 2];
                cp2y = currentY + coords[ci + 3];
                endX = currentX + coords[ci + 4];
                endY = currentY + coords[ci + 5];
              }

              const numPoints = 10;
              for (let j = 0; j <= numPoints; j++) {
                const t = j / numPoints;
                const x =
                  Math.pow(1 - t, 3) * currentX +
                  3 * Math.pow(1 - t, 2) * t * cp1x +
                  3 * (1 - t) * t * t * cp2x +
                  t * t * t * endX;
                const y =
                  Math.pow(1 - t, 3) * currentY +
                  3 * Math.pow(1 - t, 2) * t * cp1y +
                  3 * (1 - t) * t * t * cp2y +
                  t * t * t * endY;
                points.push({ x, y });
              }

              lastControlX = cp2x;
              lastControlY = cp2y;
              currentX = endX;
              currentY = endY;
            }
          }
          break;

        case "s": // Smooth cubic Bezier curve
          for (let si = 0; si < coords.length; si += 4) {
            if (si + 3 < coords.length) {
              const cp1x = 2 * currentX - lastControlX;
              const cp1y = 2 * currentY - lastControlY;
              const cp2x = type === "S" ? coords[si] : currentX + coords[si];
              const cp2y = type === "S" ? coords[si + 1] : currentY + coords[si + 1];
              const endX = type === "S" ? coords[si + 2] : currentX + coords[si + 2];
              const endY = type === "S" ? coords[si + 3] : currentY + coords[si + 3];

              const numPoints = 10;
              for (let t = 0; t <= 1; t += 1 / numPoints) {
                const x =
                  Math.pow(1 - t, 3) * currentX +
                  3 * Math.pow(1 - t, 2) * t * cp1x +
                  3 * (1 - t) * t * t * cp2x +
                  t * t * t * endX;
                const y =
                  Math.pow(1 - t, 3) * currentY +
                  3 * Math.pow(1 - t, 2) * t * cp1y +
                  3 * (1 - t) * t * t * cp2y +
                  t * t * t * endY;
                points.push({ x, y });
              }

              lastControlX = cp2x;
              lastControlY = cp2y;
              currentX = endX;
              currentY = endY;
            }
          }
          break;

        case "q": // Quadratic Bezier curve
          for (let qi = 0; qi < coords.length; qi += 4) {
            if (qi + 3 < coords.length) {
              const cpx = type === "Q" ? coords[qi] : currentX + coords[qi];
              const cpy = type === "Q" ? coords[qi + 1] : currentY + coords[qi + 1];
              const endX = type === "Q" ? coords[qi + 2] : currentX + coords[qi + 2];
              const endY = type === "Q" ? coords[qi + 3] : currentY + coords[qi + 3];

              const numPoints = 8;
              for (let t = 0; t <= 1; t += 1 / numPoints) {
                const x = (1 - t) * (1 - t) * currentX + 2 * (1 - t) * t * cpx + t * t * endX;
                const y = (1 - t) * (1 - t) * currentY + 2 * (1 - t) * t * cpy + t * t * endY;
                points.push({ x, y });
              }

              lastControlX = cpx;
              lastControlY = cpy;
              currentX = endX;
              currentY = endY;
            }
          }
          break;

        case "a": // Elliptical arc - simplified approximation
          for (let ai = 0; ai < coords.length; ai += 7) {
            if (ai + 6 < coords.length) {
              const endX = type === "A" ? coords[ai + 5] : currentX + coords[ai + 5];
              const endY = type === "A" ? coords[ai + 6] : currentY + coords[ai + 6];

              const numPoints = 15;
              for (let j = 1; j <= numPoints; j++) {
                const t = j / numPoints;
                const x = currentX + t * (endX - currentX);
                const y = currentY + t * (endY - currentY);
                points.push({ x, y });
              }

              currentX = endX;
              currentY = endY;
            }
          }
          break;

        case "z":
          if (points.length > 0) {
            const lastPoint = points[points.length - 1];
            if (Math.abs(lastPoint.x - subpathStartX) > 0.001 || Math.abs(lastPoint.y - subpathStartY) > 0.001) {
              points.push({ x: subpathStartX, y: subpathStartY, isClosePath: true });
            } else {
              lastPoint.isClosePath = true;
            }
            currentX = subpathStartX;
            currentY = subpathStartY;
          }
          break;
      }
    }

    return points;
  }

  /**
   * Organize path points into shapes with contours (holes).
   * Supports nested holes using even-odd nesting level detection.
   * @param {Array<{x: number, y: number, isMoveTo?: boolean}>} allPoints - Path point array
   * @returns {Array<{outer: Array, holes: Array<Array>}>} Shapes with outer boundary and holes
   */
  organizeSubpathsIntoContours(allPoints) {
    // Split points into separate subpaths
    const subpaths = [];
    let currentSubpath = [];

    for (let i = 0; i < allPoints.length; i++) {
      const pt = allPoints[i];

      if (pt.isMoveTo && currentSubpath.length > 0) {
        subpaths.push(currentSubpath);
        currentSubpath = [pt];
      } else {
        currentSubpath.push(pt);
      }
    }

    if (currentSubpath.length > 0) {
      subpaths.push(currentSubpath);
    }

    this._log(`Found ${subpaths.length} subpaths`);

    if (subpaths.length === 0) {
      return [];
    }

    if (subpaths.length === 1) {
      return [{ outer: subpaths[0], holes: [] }];
    }

    // Calculate winding order and area for each subpath
    const subpathInfo = subpaths.map((subpath, idx) => {
      const area = SVGReader.calculatePolygonArea(subpath);
      return {
        index: idx,
        points: subpath,
        area: Math.abs(area),
        isClockwise: area < 0,
        bounds: SVGReader.calculateSubpathBounds(subpath),
        used: false,
        nestingLevel: 0,
      };
    });

    // Sort by area (largest first)
    subpathInfo.sort((a, b) => b.area - a.area);

    // Build containment hierarchy
    for (let i = 0; i < subpathInfo.length; i++) {
      const testPoint = subpathInfo[i].points[0];
      let nestingCount = 0;

      for (let j = 0; j < subpathInfo.length; j++) {
        if (i === j) continue;
        if (SVGReader.isPointInPolygon(testPoint, subpathInfo[j].points)) {
          nestingCount++;
        }
      }

      subpathInfo[i].nestingLevel = nestingCount;
      this._log(`Subpath ${subpathInfo[i].index}: nesting level ${nestingCount}`);
    }

    const shapes = [];

    // Find all level-0 shapes (outermost shapes)
    const level0Shapes = subpathInfo.filter((s) => s.nestingLevel === 0);

    for (const shape of level0Shapes) {
      const holes = [];

      // Find all direct holes (level 1 children inside this shape)
      for (const potential of subpathInfo) {
        if (potential.nestingLevel !== 1) continue;
        if (potential.used) continue;

        const testPoint = potential.points[0];
        if (SVGReader.isPointInPolygon(testPoint, shape.points)) {
          holes.push(potential.points);
          potential.used = true;
          this._log(
            `Subpath ${potential.index} (level ${potential.nestingLevel}) is a hole in subpath ${shape.index}`,
          );
        }
      }

      shapes.push({ outer: shape.points, holes });
      shape.used = true;
    }

    // Handle islands within holes (level 2+)
    for (const potential of subpathInfo) {
      if (potential.used) continue;
      if (potential.nestingLevel % 2 !== 0) continue;

      const holes = [];

      for (const holeCandidate of subpathInfo) {
        if (holeCandidate.used) continue;
        if (holeCandidate.nestingLevel <= potential.nestingLevel) continue;
        if (holeCandidate.nestingLevel % 2 === 0) continue;

        const testPoint = holeCandidate.points[0];
        if (SVGReader.isPointInPolygon(testPoint, potential.points)) {
          holes.push(holeCandidate.points);
          holeCandidate.used = true;
        }
      }

      shapes.push({ outer: potential.points, holes });
      potential.used = true;
    }

    this._log(`Organized into ${shapes.length} shapes with holes`);
    return shapes;
  }

  /**
   * Calculate the bounding box for an array of part objects.
   * @param {Array} parts - Array of part objects
   * @returns {{ minX: number, minY: number, maxX: number, maxY: number, width: number, height: number }}
   */
  calculateBoundingBox(parts) {
    if (!parts || parts.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    function includeBounds(b) {
      if (!b) return;
      if (isFinite(b.minX) && isFinite(b.minY) && isFinite(b.maxX) && isFinite(b.maxY)) {
        minX = Math.min(minX, b.minX);
        minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX);
        maxY = Math.max(maxY, b.maxY);
      }
    }

    for (const part of parts) {
      let b = null;
      const sp = part.shapeParams;
      switch (part.elementType) {
        case "circle":
          if (sp && typeof sp.cx === "number" && typeof sp.cy === "number" && typeof sp.r === "number") {
            b = { minX: sp.cx - sp.r, minY: sp.cy - sp.r, maxX: sp.cx + sp.r, maxY: sp.cy + sp.r };
          }
          break;
        case "ellipse":
          if (
            sp &&
            typeof sp.cx === "number" &&
            typeof sp.cy === "number" &&
            typeof sp.rx === "number" &&
            typeof sp.ry === "number"
          ) {
            b = { minX: sp.cx - sp.rx, minY: sp.cy - sp.ry, maxX: sp.cx + sp.rx, maxY: sp.cy + sp.ry };
          }
          break;
        case "rect":
          if (
            sp &&
            typeof sp.x === "number" &&
            typeof sp.y === "number" &&
            typeof sp.w === "number" &&
            typeof sp.h === "number"
          ) {
            b = { minX: sp.x, minY: sp.y, maxX: sp.x + sp.w, maxY: sp.y + sp.h };
          }
          break;
        case "line":
          if (
            sp &&
            typeof sp.x1 === "number" &&
            typeof sp.y1 === "number" &&
            typeof sp.x2 === "number" &&
            typeof sp.y2 === "number"
          ) {
            b = {
              minX: Math.min(sp.x1, sp.x2),
              minY: Math.min(sp.y1, sp.y2),
              maxX: Math.max(sp.x1, sp.x2),
              maxY: Math.max(sp.y1, sp.y2),
            };
          }
          break;
        case "polygon":
        case "polyline":
          if (sp && Array.isArray(sp.coords) && sp.coords.length >= 2) {
            for (let i = 0; i < sp.coords.length; i += 2) {
              const x = sp.coords[i];
              const y = sp.coords[i + 1];
              includeBounds({ minX: x, minY: y, maxX: x, maxY: y });
            }
            continue;
          }
          break;
      }

      if (!b) {
        const points = this.parsePathData(part.pathData);
        for (const point of points) {
          if (!isNaN(point.x) && !isNaN(point.y)) {
            includeBounds({ minX: point.x, minY: point.y, maxX: point.x, maxY: point.y });
          }
        }
      } else {
        includeBounds(b);
      }
    }

    if (minX !== Infinity && maxX !== -Infinity) {
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    } else {
      console.warn("🪡 p5.embroider SVGReader: No valid points found, using default bounding box");
      return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    }
  }

  // --- Static geometry helpers ---

  /**
   * Calculate signed polygon area (for winding order detection).
   * @param {Array<{x: number, y: number}>} points
   * @returns {number} Signed area (negative = clockwise)
   */
  static calculatePolygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return area / 2;
  }

  /**
   * Check if a point is inside a polygon (ray casting algorithm).
   * @param {{x: number, y: number}} point
   * @param {Array<{x: number, y: number}>} polygon
   * @returns {boolean}
   */
  static isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Calculate axis-aligned bounding box of a point array.
   * @param {Array<{x: number, y: number}>} points
   * @returns {{ minX: number, minY: number, maxX: number, maxY: number }}
   */
  static calculateSubpathBounds(points) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const pt of points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    return { minX, minY, maxX, maxY };
  }
}
