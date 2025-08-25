// p5.js JSON Writer for Embroidery Patterns
export class JSONWriter {
  constructor() {
    this.options = {
      includeBounds: true,
      includeMetadata: true,
      precision: 2,
      compactOutput: false,
    };
  }

  setOptions(options = {}) {
    this.options = { ...this.options, ...options };
  }

  generateJSON(stitchData, title = "Untitled Pattern") {
    if (!stitchData || !stitchData.threads) {
      throw new Error("Invalid stitch data: threads array is required");
    }

    const jsonData = {
      format: "p5.embroider",
      version: "1.0",
      title: title,
      timestamp: new Date().toISOString(),
    };

    // Add metadata if enabled
    if (this.options.includeMetadata) {
      jsonData.metadata = this.generateMetadata(stitchData);
    }

    // Add bounds if enabled
    if (this.options.includeBounds) {
      jsonData.bounds = this.calculateBounds(stitchData);
    }

    // Process threads
    jsonData.threads = this.processThreads(stitchData.threads);

    // Add statistics
    jsonData.statistics = this.calculateStatistics(stitchData);

    return this.options.compactOutput ? JSON.stringify(jsonData) : JSON.stringify(jsonData, null, 2);
  }

  generateMetadata(stitchData) {
    return {
      totalThreads: stitchData.threads ? stitchData.threads.length : 0,
      totalStitches: this.getTotalStitchCount(stitchData),
      totalRuns: this.getTotalRunCount(stitchData),
      createdBy: "p5.embroider",
      units: "pixels",
      coordinateSystem: "cartesian",
    };
  }

  processThreads(threads) {
    return threads.map((thread, threadIndex) => {
      const threadData = {
        id: threadIndex,
        color: this.processColor(thread.color),
        weight: thread.weight || 0.2,
        runs: [],
        statistics: {
          totalStitches: 0,
          totalRuns: thread.runs ? thread.runs.length : 0,
          totalDistance: 0,
        },
      };

      if (thread.runs) {
        threadData.runs = thread.runs.map((run, runIndex) => {
          const runData = {
            id: runIndex,
            stitches: this.processStitches(run),
            statistics: {
              stitchCount: run.length,
              distance: this.calculateRunDistance(run),
            },
          };

          threadData.statistics.totalStitches += run.length;
          threadData.statistics.totalDistance += runData.statistics.distance;

          return runData;
        });
      }

      return threadData;
    });
  }

  processColor(color) {
    if (!color) {
      return { r: 0, g: 0, b: 0, hex: "#000000" };
    }

    if (typeof color === "string") {
      return { hex: color };
    }

    if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      return {
        r: Math.round(color.r),
        g: Math.round(color.g),
        b: Math.round(color.b),
        hex: this.rgbToHex(color.r, color.g, color.b),
      };
    }

    return { r: 0, g: 0, b: 0, hex: "#000000" };
  }

  processStitches(run) {
    if (!Array.isArray(run)) {
      return [];
    }

    return run.map((stitch, index) => ({
      index: index,
      x: this.roundToPrecision(stitch.x),
      y: this.roundToPrecision(stitch.y),
      type: stitch.type || "normal",
    }));
  }

  calculateBounds(stitchData) {
    if (!stitchData.threads || stitchData.threads.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    for (const thread of stitchData.threads) {
      if (thread.runs) {
        for (const run of thread.runs) {
          for (const stitch of run) {
            minX = Math.min(minX, stitch.x);
            minY = Math.min(minY, stitch.y);
            maxX = Math.max(maxX, stitch.x);
            maxY = Math.max(maxY, stitch.y);
          }
        }
      }
    }

    return {
      minX: this.roundToPrecision(minX),
      minY: this.roundToPrecision(minY),
      maxX: this.roundToPrecision(maxX),
      maxY: this.roundToPrecision(maxY),
      width: this.roundToPrecision(maxX - minX),
      height: this.roundToPrecision(maxY - minY),
    };
  }

  calculateStatistics(stitchData) {
    const stats = {
      totalThreads: 0,
      totalRuns: 0,
      totalStitches: 0,
      totalDistance: 0,
      averageStitchLength: 0,
      colorPalette: [],
    };

    if (!stitchData.threads) {
      return stats;
    }

    stats.totalThreads = stitchData.threads.length;
    const colors = new Set();

    for (const thread of stitchData.threads) {
      if (thread.color) {
        const colorHex = this.processColor(thread.color).hex;
        colors.add(colorHex);
      }

      if (thread.runs) {
        stats.totalRuns += thread.runs.length;

        for (const run of thread.runs) {
          stats.totalStitches += run.length;
          stats.totalDistance += this.calculateRunDistance(run);
        }
      }
    }

    stats.colorPalette = Array.from(colors);
    stats.averageStitchLength =
      stats.totalStitches > 1
        ? this.roundToPrecision(stats.totalDistance / (stats.totalStitches - stats.totalRuns))
        : 0;
    stats.totalDistance = this.roundToPrecision(stats.totalDistance);

    return stats;
  }

  calculateRunDistance(run) {
    if (!Array.isArray(run) || run.length < 2) {
      return 0;
    }

    let distance = 0;
    for (let i = 1; i < run.length; i++) {
      const dx = run[i].x - run[i - 1].x;
      const dy = run[i].y - run[i - 1].y;
      distance += Math.sqrt(dx * dx + dy * dy);
    }

    return distance;
  }

  getTotalStitchCount(stitchData) {
    if (!stitchData.threads) return 0;

    return stitchData.threads.reduce((total, thread) => {
      if (!thread.runs) return total;
      return total + thread.runs.reduce((threadTotal, run) => threadTotal + run.length, 0);
    }, 0);
  }

  getTotalRunCount(stitchData) {
    if (!stitchData.threads) return 0;

    return stitchData.threads.reduce((total, thread) => {
      return total + (thread.runs ? thread.runs.length : 0);
    }, 0);
  }

  roundToPrecision(value) {
    const factor = Math.pow(10, this.options.precision);
    return Math.round(value * factor) / factor;
  }

  rgbToHex(r, g, b) {
    const toHex = (c) => {
      const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  saveJSON(stitchData, title, filename) {
    try {
      const jsonContent = this.generateJSON(stitchData, title);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename || "embroidery-pattern.json";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 100);

      console.log(`🪡 p5.embroider says: JSON exported successfully: ${filename}`);
      return jsonContent;
    } catch (error) {
      console.error("🪡 p5.embroider says: Error exporting JSON:", error);
      throw error;
    }
  }

  // Parse JSON back to stitch data format
  parseJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (data.format !== "p5.embroider") {
        console.warn("🪡 p5.embroider says: JSON format may not be compatible");
      }

      const stitchData = {
        threads: [],
      };

      if (data.threads && Array.isArray(data.threads)) {
        stitchData.threads = data.threads.map((thread) => ({
          color: thread.color,
          weight: thread.weight || 0.2,
          runs: thread.runs
            ? thread.runs.map((run) =>
                run.stitches
                  ? run.stitches.map((stitch) => ({
                      x: stitch.x,
                      y: stitch.y,
                      type: stitch.type,
                    }))
                  : [],
              )
            : [],
        }));
      }

      return stitchData;
    } catch (error) {
      console.error("🪡 p5.embroider says: Error parsing JSON:", error);
      throw error;
    }
  }

  // Validate JSON structure
  validateJSON(jsonData) {
    const errors = [];

    if (typeof jsonData !== "object") {
      errors.push("Root must be an object");
      return errors;
    }

    if (!jsonData.threads || !Array.isArray(jsonData.threads)) {
      errors.push("Missing or invalid threads array");
    }

    if (jsonData.threads) {
      jsonData.threads.forEach((thread, threadIndex) => {
        if (!thread.runs || !Array.isArray(thread.runs)) {
          errors.push(`Thread ${threadIndex}: Missing or invalid runs array`);
        }

        if (thread.runs) {
          thread.runs.forEach((run, runIndex) => {
            if (!run.stitches || !Array.isArray(run.stitches)) {
              errors.push(`Thread ${threadIndex}, Run ${runIndex}: Missing or invalid stitches array`);
            }

            if (run.stitches) {
              run.stitches.forEach((stitch, stitchIndex) => {
                if (typeof stitch.x !== "number" || typeof stitch.y !== "number") {
                  errors.push(`Thread ${threadIndex}, Run ${runIndex}, Stitch ${stitchIndex}: Invalid coordinates`);
                }
              });
            }
          });
        }
      });
    }

    return errors;
  }
}
