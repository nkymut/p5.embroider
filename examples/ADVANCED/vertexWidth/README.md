# Variable Width Path Example

This example demonstrates how to create embroidery paths with variable width using p5.embroider.

## Three Ways to Specify Width

### 1. Using `vertex(x, y, width)`
The z-coordinate parameter of `vertex()` can be used to specify the width at that point:

```javascript
beginShape();
vertex(10, 10, 1);    // Start thin (width = 1mm)
vertex(30, 10, 5);    // Get thicker (width = 5mm)
vertex(50, 10, 8);    // Maximum thickness (width = 8mm)
vertex(70, 10, 5);    // Get thinner (width = 5mm)
vertex(90, 10, 1);    // End thin (width = 1mm)
endShape();
```

### 2. Using `vertexWidth(width)` before `vertex(x, y)`
Set the width for the next vertex call:

```javascript
beginShape();
vertexWidth(2);
vertex(10, 20);       // This vertex will have width = 2mm
vertexWidth(6);
vertex(30, 25);       // This vertex will have width = 6mm
vertexWidth(2);
vertex(50, 20);       // This vertex will have width = 2mm
endShape();
```

### 3. Using `vertexWidth(x, y, width)`
Combined function that creates a vertex with specified width:

```javascript
beginShape();
vertexWidth(10, 30, 2);   // Creates vertex at (10, 30) with width 2mm
vertexWidth(30, 35, 6);   // Creates vertex at (30, 35) with width 6mm
vertexWidth(50, 30, 2);   // Creates vertex at (50, 30) with width 2mm
endShape();
```

## Width Interpolation

The width is automatically interpolated between vertices:
- For straight line segments, width is linearly interpolated
- For bezier curves, width is interpolated along the curve
- For quadratic and curve vertices, width follows the curve shape

## Stroke Modes

Variable width works with following stroke modes:

- `zigzag` - Zigzag pattern with varying amplitude


## Use Cases

### Calligraphic Effects
Create brush-like strokes that vary in thickness:

```javascript
beginShape();
vertex(x1, y1, 2);    // Thin upstroke
vertex(x2, y2, 8);    // Thick downstroke
vertex(x3, y3, 2);    // Thin upstroke
endShape();
```

### Organic Shapes
Create natural-looking lines that respond to movement:

```javascript
for (let i = 0; i < points.length; i++) {
  let speed = calculateSpeed(i);
  let width = map(speed, 0, maxSpeed, 8, 2);  // Faster = thinner
  vertex(points[i].x, points[i].y, width);
}
```

### Tapered Lines
Create lines that fade in and out:

```javascript
beginShape();
vertex(x1, y1, 0.5);  // Very thin start
vertex(x2, y2, 5);    // Thick middle
vertex(x3, y3, 0.5);  // Very thin end
endShape();
```

## Technical Details

- Width values are in millimeters (mm)
- Default width is taken from `strokeWeight()` if not specified
- Minimum recommended width: 0.5mm
- Maximum recommended width: 10mm (depends on fabric and thread)
- Width affects the offset distance for zigzag and other decorative stitches

## Keyboard Shortcuts

- `d` - Export as DST file
- `g` - Export as G-code
- `s` - Export as SVG
- `r` - Redraw

## Notes

- Variable width is particularly effective with `zigzag` stroke mode
- For very thin widths (< 1mm), consider using `straight` stroke mode
- Width changes should be gradual for best embroidery results
- Extreme width changes may cause thread tension issues on actual machines

