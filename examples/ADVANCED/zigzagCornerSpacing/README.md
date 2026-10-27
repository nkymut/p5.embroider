# Zigzag Corner Spacing (sew-out test)

At `ROUND` and `BEVEL` corners a zigzag stroke fans around the outside, so the needle keeps going back
to the inside of the corner. p5.embroider spreads those inner needle points along the inner edge and
merges any that land closer than `cornerSpacing` to the previous one:

```javascript
setStrokeSettings({ cornerSpacing: 0.3 }); // mm, default 0.3; 0 = never merge
```

This sketch stitches a grid to choose the value on real fabric:

- **Rows**: `cornerSpacing` = 0, 0.1, 0.2, 0.3, 0.45, 0.6 mm. On the fabric, row *n* has *n* short
  running-stitch bars in the left margin.
- **Columns**: corners turning 60°, 90°, 120° and 150°, 5 mm wide, 0.3 mm density.
- **Join: round / miter / bevel** buttons switch the corner style; the export file name includes it.
  `MITER` corners meet in one point and do not fan, so `cornerSpacing` has no effect on them, except
  where a miter is too long (beyond `miterLimit`, or a cross stitch over 12 mm) and becomes a bevel:
  in this grid that is the 150° column. Sew the miter file as the reference for a corner without a fan.

Export DST, sew it, and for each row check the inside of the corners for thread build-up, puckering
or broken thread, and the outside for gaps. The smallest spacing that sews cleanly at 150° is a good
default for that fabric and thread.
