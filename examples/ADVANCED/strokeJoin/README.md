# Zigzag Corner Joins Example

Zigzag strokes use `strokeJoin()` at every corner, so the outside of a corner is covered and the
inside is not pierced over and over:

| Join | Corner |
|---|---|
| `ROUND` (default) | the stitches fan around the outside of the corner |
| `MITER` | both edges meet in a point; longer than `miterLimit` × half width it becomes `BEVEL` |
| `BEVEL` | the corner is cut straight across |

```javascript
setStrokeMode("zigzag");
strokeWeight(4);
strokeJoin(MITER);                             // or setStrokeJoin("miter")
setStrokeSettings({ miterLimit: 4, cornerSpacing: 0.3 });
beginShape();
vertex(10, 10);
vertex(30, 10);
vertex(30, 30);
endShape();
```

- `miterLimit` (default 4): miter length / half width before a miter turns into a bevel.
- `cornerSpacing` (default 0.3 mm): inner-corner needle points closer than this are merged.
  See `../zigzagCornerSpacing/` for a sew-out test of this value.

`setStitchInterpolate()` is deprecated and ignored: corners follow `strokeJoin()` now.
