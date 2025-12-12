import { describe, test, beforeEach } from "@jest/globals";
import { TestUtils } from "../helpers/test-utils.js";
import {
  mmToPixel,
  pixelToMm,
  mm2px,
  px2mm,
  inchToMm,
  mmToInch,
  inchToPixel,
  pixelToInch,
} from "../../src/utils/unit-conversion.js";

describe('Coordinate Conversion Functions', () => {
  beforeEach(() => {
    TestUtils.resetAllMocks();
  });

  describe('mmToPixel', () => {
    test('converts millimeters to pixels with default DPI (96)', () => {
      // 25.4mm = 1 inch at 96 DPI = 96 pixels
      const result = mmToPixel(25.4);
      expectCoordinateToBeCloseTo(result, 96, 0.1);
    });

    test('converts millimeters to pixels with custom DPI', () => {
      // 25.4mm = 1 inch at 300 DPI = 300 pixels
      const result = mmToPixel(25.4, 300);
      expectCoordinateToBeCloseTo(result, 300, 0.1);
    });

    test('handles zero and negative values', () => {
      expect(mmToPixel(0)).toBe(0);
      expect(mmToPixel(-10)).toBeLessThan(0);
    });

    test('handles decimal values', () => {
      const result = mmToPixel(12.7); // 0.5 inch
      expectCoordinateToBeCloseTo(result, 48, 0.1);
    });

    test('handles very small values', () => {
      const result = mmToPixel(0.1);
      expect(result).toBeGreaterThan(0);
      expectCoordinateToBeCloseTo(result, 0.378, 0.001);
    });
  });

  describe('pixelToMm', () => {
    test('converts pixels to millimeters with default DPI (96)', () => {
      const result = pixelToMm(96);
      expectCoordinateToBeCloseTo(result, 25.4, 0.1);
    });

    test('converts pixels to millimeters with custom DPI', () => {
      const result = pixelToMm(300, 300);
      expectCoordinateToBeCloseTo(result, 25.4, 0.1);
    });

    test('handles zero and negative values', () => {
      expect(pixelToMm(0)).toBe(0);
      expect(pixelToMm(-96)).toBeLessThan(0);
    });

    test('handles decimal pixel values', () => {
      const result = pixelToMm(48);
      expectCoordinateToBeCloseTo(result, 12.7, 0.1);
    });
  });

  describe('Round-trip conversion accuracy', () => {
    test('mmToPixel and pixelToMm are inverse operations', () => {
      const originalMm = 50.8; // 2 inches
      const pixels = mmToPixel(originalMm);
      const backToMm = pixelToMm(pixels);
      
      expectCoordinateToBeCloseTo(backToMm, originalMm, 0.001);
    });

    test('round-trip works with custom DPI', () => {
      const originalMm = 25.4;
      const dpi = 150;
      
      const pixels = mmToPixel(originalMm, dpi);
      const backToMm = pixelToMm(pixels, dpi);
      
      expectCoordinateToBeCloseTo(backToMm, originalMm, 0.001);
    });

    test('maintains precision with very small values', () => {
      const originalMm = 0.5;
      const pixels = mmToPixel(originalMm);
      const backToMm = pixelToMm(pixels);
      
      expectCoordinateToBeCloseTo(backToMm, originalMm, 0.001);
    });
  });

  describe('DPI variations', () => {
    const testDPIs = [72, 96, 150, 300, 600];
    const testMmValue = 25.4; // 1 inch

    testDPIs.forEach(dpi => {
      test(`correctly converts at ${dpi} DPI`, () => {
        const pixels = mmToPixel(testMmValue, dpi);
        expectCoordinateToBeCloseTo(pixels, dpi, 0.1);
        
        const backToMm = pixelToMm(pixels, dpi);
        expectCoordinateToBeCloseTo(backToMm, testMmValue, 0.001);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    test('handles very large values', () => {
      const largeMm = 10000; // 10 meters
      const pixels = mmToPixel(largeMm);
      expect(pixels).toBeGreaterThan(0);
      expect(isFinite(pixels)).toBe(true);
    });

    test('handles very small non-zero values', () => {
      const tinyMm = 0.001; // 1 micrometer
      const pixels = mmToPixel(tinyMm);
      expect(pixels).toBeGreaterThan(0);
      expect(isFinite(pixels)).toBe(true);
    });

    test('handles zero DPI gracefully', () => {
      // This should handle division by zero or return appropriate value
      const result = mmToPixel(10, 0);
      expect(result).toBe(0);
    });
  });

  describe("Aliases", () => {
    test("mm2px is an alias for mmToPixel", () => {
      expect(mm2px(25.4, 96)).toBe(mmToPixel(25.4, 96));
    });

    test("px2mm is an alias for pixelToMm", () => {
      expect(px2mm(96, 96)).toBe(pixelToMm(96, 96));
    });
  });

  describe("Inch conversions", () => {
    test("inchToMm converts inches to millimeters", () => {
      expectCoordinateToBeCloseTo(inchToMm(1), 25.4, 0.0001);
    });

    test("mmToInch converts millimeters to inches", () => {
      expectCoordinateToBeCloseTo(mmToInch(25.4), 1, 0.0001);
    });

    test("inchToPixel converts inches to pixels", () => {
      expectCoordinateToBeCloseTo(inchToPixel(1, 300), 300, 0.0001);
    });

    test("pixelToInch converts pixels to inches", () => {
      expectCoordinateToBeCloseTo(pixelToInch(300, 300), 1, 0.0001);
    });
  });
});