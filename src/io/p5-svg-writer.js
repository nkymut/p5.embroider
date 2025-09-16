// p5.js SVG Writer for Embroidery Patterns
import { PAPER_SIZES, HOOP_PRESETS } from '../utils/embroidery-guides.js';

export class SVGWriter {
  constructor() {
    this.data = [];
    this.currentX = 0;
    this.currentY = 0;
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;
    this.options = {
      paperSize: "A4",
      dpi: 300,
      hoopSize: { width: 100, height: 100 },
      margins: { top: 15, right: 15, bottom: 15, left: 15 },
      showGuides: false,
      showHoop: false,
      lifeSize: true,
    };
  }

  // Use imported constants
  static PAPER_SIZES = PAPER_SIZES;
  static HOOP_PRESETS = HOOP_PRESETS;

  setOptions(options = {}) {
    this.options = { ...this.options, ...options };
  }

  addComment(comment) {
    this.data.push(`<!-- ${comment} -->`);
  }

  move(x, y) {
    if (x !== null && y !== null) {
      this.currentX = x;
      this.currentY = y;
      this.minX = Math.min(this.minX, x);
      this.maxX = Math.max(this.maxX, x);
      this.minY = Math.min(this.minY, y);
      this.maxY = Math.max(this.maxY, y);
    }
  }

  generateSVG(stitchData, title) {
    const paper = SVGWriter.PAPER_SIZES[this.options.paperSize];
    if (!paper) {
      throw new Error(`Invalid paper size: ${this.options.paperSize}`);
    }

    // Calculate coordinate system
    const mmToUnits = this.options.dpi / 25.4; // 25.4mm = 1 inch
    const paperWidth = paper.width * mmToUnits;
    const paperHeight = paper.height * mmToUnits;
    const marginLeft = this.options.margins.left * mmToUnits;
    const marginTop = this.options.margins.top * mmToUnits;

    // Start SVG
    this.data = [];
    this.data.push('<?xml version="1.0" encoding="UTF-8"?>');
    this.data.push(`<svg xmlns="http://www.w3.org/2000/svg" 
      width="${paperWidth}" height="${paperHeight}" 
      viewBox="0 0 ${paperWidth} ${paperHeight}">`);

    // Add title and metadata
    this.addComment(`TITLE: ${title}`);
    this.addComment(`PAPER_SIZE: ${this.options.paperSize}`);
    this.addComment(`DPI: ${this.options.dpi}`);
    this.addComment(`HOOP_SIZE: ${this.options.hoopSize.width}x${this.options.hoopSize.height}mm`);

    // Add coordinate system transformation
    this.data.push(`<g transform="translate(${marginLeft}, ${marginTop}) scale(${mmToUnits}, ${mmToUnits})">`);

    // Draw embroidery hoop if enabled
    if (this.options.showHoop) {
      this.drawHoop();
    }

    // Draw guides if enabled
    if (this.options.showGuides) {
      this.drawGuides();
    }

    // Draw embroidery patterns
    this.drawEmbroideryPatterns(stitchData);

    // Close groups
    this.data.push("</g>");
    this.data.push("</svg>");

    return this.data.join("\n");
  }

  drawGuides() {
    const hoop = this.options.hoopSize;
    const centerX = hoop.width / 2;
    const centerY = hoop.height / 2;
    const radius = Math.min(hoop.width, hoop.height) / 2;

    // Draw circular hoop outline
    this.data.push(`<circle cx="${centerX}" cy="${centerY}" r="${radius}" 
      fill="none" stroke="#666666" stroke-width="0.5" opacity="0.5"/>`);

    // Draw center cross marks
    this.data.push(`<line x1="${centerX}" y1="${centerY - radius}" x2="${centerX}" y2="${centerY + radius}" 
      stroke="#cccccc" stroke-width="0.2" opacity="0.5"/>`);
    this.data.push(`<line x1="${centerX - radius}" y1="${centerY}" x2="${centerX + radius}" y2="${centerY}" 
      stroke="#cccccc" stroke-width="0.2" opacity="0.5"/>`);

    // Draw punch needle points around the circle
    const numPoints = 12; // Number of punch needle points
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      // Draw punch needle point (small circle)
      this.data.push(`<circle cx="${x}" cy="${y}" r="1" 
        fill="#666666" stroke="none" opacity="0.8"/>`);

      // Draw small line extending outward from the point
      const outerRadius = radius + 3;
      const outerX = centerX + outerRadius * Math.cos(angle);
      const outerY = centerY + outerRadius * Math.sin(angle);
      this.data.push(`<line x1="${x}" y1="${y}" x2="${outerX}" y2="${outerY}" 
        stroke="#666666" stroke-width="0.3" opacity="0.6"/>`);
    }

    // Draw corner marks for rectangular reference
    const markSize = 5;
    this.data.push(`<line x1="0" y1="0" x2="${markSize}" y2="0" stroke="#666666" stroke-width="0.2"/>`);
    this.data.push(`<line x1="0" y1="0" x2="0" y2="${markSize}" stroke="#666666" stroke-width="0.2"/>`);
    this.data.push(
      `<line x1="${hoop.width}" y1="0" x2="${hoop.width - markSize}" y2="0" stroke="#666666" stroke-width="0.2"/>`,
    );
    this.data.push(
      `<line x1="${hoop.width}" y1="0" x2="${hoop.width}" y2="${markSize}" stroke="#666666" stroke-width="0.2"/>`,
    );
    this.data.push(
      `<line x1="0" y1="${hoop.height}" x2="${markSize}" y2="${hoop.height}" stroke="#666666" stroke-width="0.2"/>`,
    );
    this.data.push(
      `<line x1="0" y1="${hoop.height}" x2="0" y2="${hoop.height - markSize}" stroke="#666666" stroke-width="0.2"/>`,
    );
    this.data.push(
      `<line x1="${hoop.width}" y1="${hoop.height}" x2="${hoop.width - markSize}" y2="${hoop.height}" stroke="#666666" stroke-width="0.2"/>`,
    );
    this.data.push(
      `<line x1="${hoop.width}" y1="${hoop.height}" x2="${hoop.width}" y2="${hoop.height - markSize}" stroke="#666666" stroke-width="0.2"/>`,
    );
  }

  drawHoop() {
    const hoop = this.options.hoopSize;
    const centerX = hoop.width / 2;
    const centerY = hoop.height / 2;

    // Draw outer hoop ring (wood/plastic)
    const outerRadius = Math.min(hoop.width, hoop.height) / 2;
    const innerRadius = outerRadius - 3; // 3mm thick hoop ring

    // Outer ring
    this.data.push(`<circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" 
      fill="#8B4513" stroke="#654321" stroke-width="0.5" opacity="0.8"/>`);

    // Inner ring (working area)
    this.data.push(`<circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" 
      fill="#F5F5DC" stroke="#D2B48C" stroke-width="0.3" opacity="0.9"/>`);

    // Add center marks for alignment
    this.data.push(`<line x1="${centerX - 2}" y1="${centerY}" x2="${centerX + 2}" y2="${centerY}" 
      stroke="#999999" stroke-width="0.2" opacity="0.6"/>`);
    this.data.push(`<line x1="${centerX}" y1="${centerY - 2}" x2="${centerX}" y2="${centerY + 2}" 
      stroke="#999999" stroke-width="0.2" opacity="0.6"/>`);
  }

  drawEmbroideryPatterns(stitchData) {
    if (!stitchData || !stitchData.threads) {
      this.addComment("No embroidery data to draw");
      return;
    }

    // Get pattern bounds to center it in the hoop
    const bounds = this.getPatternBounds(stitchData);
    const hoop = this.options.hoopSize;
    const hoopCenterX = hoop.width / 2;
    const hoopCenterY = hoop.height / 2;
    const patternCenterX = bounds.x + bounds.width / 2;
    const patternCenterY = bounds.y + bounds.height / 2;

    // Calculate offset to center pattern in hoop
    const offsetX = hoopCenterX - patternCenterX;
    const offsetY = hoopCenterY - patternCenterY;

    for (let threadIndex = 0; threadIndex < stitchData.threads.length; threadIndex++) {
      const thread = stitchData.threads[threadIndex];

      // Set thread color
      const color = this.getThreadColor(thread.color);

      for (const run of thread.runs) {
        if (run.length < 2) continue;

        // Create path for stitch run with centering offset
        let pathData = `M ${run[0].x + offsetX} ${run[0].y + offsetY}`;
        for (let i = 1; i < run.length; i++) {
          pathData += ` L ${run[i].x + offsetX} ${run[i].y + offsetY}`;
        }

        this.data.push(
          `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="0.1" stroke-linecap="round"/>`,
        );

        // Draw red dots for each stitch point with centering offset
        for (const stitch of run) {
          this.data.push(`<circle cx="${stitch.x + offsetX}" cy="${stitch.y + offsetY}" r="0.3" 
            fill="#ff0000" stroke="none" opacity="0.8"/>`);
        }
      }
    }
  }

  getThreadColor(threadColor) {
    if (threadColor && threadColor.r !== undefined && threadColor.g !== undefined && threadColor.b !== undefined) {
      return `rgb(${threadColor.r}, ${threadColor.g}, ${threadColor.b})`;
    }
    return "#000000"; // Default black
  }

  saveSVG(stitchData, title, filename) {
    try {
      const svgContent = this.generateSVG(stitchData, title);
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename || "embroidery-pattern.svg";
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 100);

      console.log(`🪡 p5.embroider says: SVG exported successfully: ${filename}`);
    } catch (error) {
      console.error("🪡 p5.embroider says: Error exporting SVG:", error);
      throw error;
    }
  }

  // Generate PNG from SVG using canvas
  async generatePNG(stitchData, title, filename) {
    try {
      const svgContent = this.generateSVG(stitchData, title);

      // Create canvas to convert SVG to PNG
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas size based on paper size
      const paper = SVGWriter.PAPER_SIZES[this.options.paperSize];
      const mmToUnits = this.options.dpi / 25.4;
      canvas.width = paper.width * mmToUnits;
      canvas.height = paper.height * mmToUnits;

      // Create image from SVG
      const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename || "embroidery-pattern.png";
            link.click();
            setTimeout(() => {
              URL.revokeObjectURL(link.href);
              document.body.removeChild(link);
            }, 100);

            console.log(`🪡 p5.embroider says: PNG exported successfully: ${filename}`);
            resolve();
          }, "image/png");
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch (error) {
      console.error("🪡 p5.embroider says: Error exporting PNG:", error);
      throw error;
    }
  }

  // Get pattern bounds
  getPatternBounds(stitchData) {
    if (!stitchData || !stitchData.threads) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    for (const thread of stitchData.threads) {
      for (const run of thread.runs) {
        for (const stitch of run) {
          minX = Math.min(minX, stitch.x);
          minY = Math.min(minY, stitch.y);
          maxX = Math.max(maxX, stitch.x);
          maxY = Math.max(maxY, stitch.y);
        }
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // Validate options
  validateOptions() {
    const paper = SVGWriter.PAPER_SIZES[this.options.paperSize];
    if (!paper) {
      throw new Error(`Invalid paper size: ${this.options.paperSize}`);
    }

    if (this.options.dpi < 72 || this.options.dpi > 600) {
      throw new Error(`DPI must be between 72 and 600, got: ${this.options.dpi}`);
    }

    if (this.options.hoopSize.width <= 0 || this.options.hoopSize.height <= 0) {
      throw new Error(`Invalid hoop size: ${this.options.hoopSize.width}x${this.options.hoopSize.height}`);
    }

    // Check if hoop fits on paper
    const hoopArea = this.options.hoopSize.width * this.options.hoopSize.height;
    const paperArea = paper.width * paper.height;
    const marginArea =
      (this.options.margins.top + this.options.margins.bottom) *
      (this.options.margins.left + this.options.margins.right);

    if (hoopArea > paperArea - marginArea) {
      console.warn(`🪡 p5.embroider says: Hoop size may be too large for selected paper size`);
    }
  }
}
