# Migrating to p5.embroider 0.3 (p5.js 2.x)

p5.embroider 0.3 targets **p5.js 2.x**. Earlier releases targeted p5.js 1.x.

Most of the work is in your sketch, not in p5.embroider: p5.js 2.0 renamed the
curve functions, changed how Bézier vertices are given, and made asset loading
asynchronous. p5.embroider follows p5.js here rather than hiding the change, so a
sketch that works with plain p5.js 2.x will work with p5.embroider.

If you are not ready to move, see [Staying on p5.js 1.x](#staying-on-p5js-1x) at
the end.

---

## Quick checklist

| # | If your sketch has… | Change it to |
| --- | --- | --- |
| 1 | a p5.js 1.x script tag | p5.js 2.x |
| 2 | `preload()` | `async setup()` + `await` |
| 3 | `beginRecord(this)` | `beginRecord()` |
| 4 | `bezierVertex(x2,y2,x3,y3,x4,y4)` | `bezierOrder(3)` + one `bezierVertex(x,y)` per point |
| 5 | `quadraticVertex(cx,cy,x,y)` | `bezierOrder(2)` + `bezierVertex(cx,cy)` + `bezierVertex(x,y)` |
| 6 | `curveVertex()` | `splineVertex()` |
| 7 | `curve()` | `spline()` |
| 8 | `curveDetail()` / `bezierDetail()` | `setCurveDetail()` |
| 9 | `text()` with a system font | `loadFont()` first |
| 10 | `endContour()` relying on the old default | `endContour(CLOSE)` if you need it closed |

Steps 4 to 8 only matter if you draw curves. Many sketches need only steps 1 to 3.

---

## 1. Update the p5.js script tag

```html
<!-- before -->
<script src="https://cdn.jsdelivr.net/npm/p5@1.11.1/lib/p5.js"></script>

<!-- after -->
<script src="https://cdn.jsdelivr.net/npm/p5@2.3.2/lib/p5.js"></script>
<script src="https://unpkg.com/p5.embroider/lib/p5.embroider.js"></script>
```

Load p5.js first and p5.embroider second. p5.embroider registers itself with
`p5.registerAddon()`, so it must see p5 already defined.

## 2. Load assets in `setup()`, not `preload()`

All `load…()` functions return Promises in p5.js 2.x. This matters most for
`loadFont()`, which text embroidery needs.

```js
// before
let font;
function preload() {
  font = loadFont("assets/SourceSansPro-Regular.otf");
}
function setup() {
  createCanvas(400, 400);
}
```

```js
// after
let font;
async function setup() {
  createCanvas(400, 400);
  font = await loadFont("assets/SourceSansPro-Regular.otf");
}
```

`draw()` starts running once `setup()` resolves, so guard anything an `await`
has not filled in yet:

```js
function draw() {
  if (!font) return;
  // …
}
```

## 3. `beginRecord()` no longer needs `this`

```js
beginRecord(this);   // before
beginRecord();       // after
```

p5.embroider is now a p5 addon, so it already knows the sketch instance.
`beginRecord(this)` still works and the argument is ignored, so this change is
optional. New code should use the short form.

## 4. Cubic Bézier vertices: one point per call

p5.js 2.x sets the curve degree with `bezierOrder()` and then takes one control
point per `bezierVertex()` call. The starting anchor comes from the preceding
`vertex()`.

```js
// before
beginShape();
vertex(10, 65);
bezierVertex(20, 60, 30, 75, 40, 65);
bezierVertex(45, 60, 50, 70, 55, 65);
endShape();
```

```js
// after
beginShape();
vertex(10, 65);
bezierOrder(3);
bezierVertex(20, 60);
bezierVertex(30, 75);
bezierVertex(40, 65);
bezierVertex(45, 60);
bezierVertex(50, 70);
bezierVertex(55, 65);
endShape();
```

Each group of three points after the anchor is one cubic segment. The old
six-argument form still records correctly, but p5.js will log a
"Expected at most 5 arguments" warning, so convert it.

## 5. Quadratic curves replace `quadraticVertex()`

`quadraticVertex()` was removed from p5.js 2.x. Use `bezierOrder(2)` with two
points per segment: the control point, then the end point.

```js
// before
beginShape();
vertex(10, 85);
quadraticVertex(25, 80, 40, 85);
quadraticVertex(50, 90, 60, 85);
endShape();
```

```js
// after
beginShape();
vertex(10, 85);
bezierOrder(2);
bezierVertex(25, 80);
bezierVertex(40, 85);
bezierVertex(50, 90);
bezierVertex(60, 85);
endShape();
bezierOrder(3); // restore the default, see the caveat below
```

p5.embroider still provides `quadraticVertex()` as a shim that warns once. It
will be removed in a future release.

**Caveat.** `bezierOrder` is sticky and survives across frames. p5.js 2.3.2 has a
bug where `bezier()` re-applies whatever order is current instead of forcing 3
for its four control points, so calling `bezier()` while the order is still 2
throws and aborts the rest of `draw()`. Restore `bezierOrder(3)` after any
quadratic shape if the same sketch also calls `bezier()`.

## 6. `curveVertex()` is now `splineVertex()`

```js
// before                    // after
beginShape();                beginShape();
curveVertex(10, 10);         splineVertex(10, 10);
curveVertex(20, 20);         splineVertex(20, 20);
curveVertex(30, 30);         splineVertex(30, 30);
endShape();                  endShape();
```

## 7. `curve()` is now `spline()`

```js
curve(5, 50, 15, 45, 35, 55, 55, 45);    // before
spline(5, 50, 15, 45, 35, 55, 55, 45);   // after
```

`curveTightness(t)` became `splineProperty('tightness', t)`, and
`curvePoint()` became `splinePoint()`.

## 8. Curve smoothness: `setCurveDetail()`

p5.js 2.x removed `bezierDetail()` and made `curveDetail()` throw outside WebGL
mode, so p5.embroider carries its own setting for how finely curves are
flattened into stitches.

```js
// before
curveDetail(40);
bezierDetail(40);
```

```js
// after
setCurveDetail(40);   // segments per curve segment, default 20
```

Higher values follow the curve more closely and produce more stitches. This
affects `spline()`, `splineVertex()`, `bezier()` and `bezierVertex()` alike.

## 9. `text()` needs a font loaded with `loadFont()`

Converting text to stitches requires glyph outlines, which system fonts do not
expose. Load a `.otf` or `.ttf` and pass it to `textFont()`:

```js
let font;
async function setup() {
  createCanvas(mmToPixel(100), mmToPixel(120));
  font = await loadFont("assets/SourceSansPro-Regular.otf");
}

function draw() {
  if (!font) return;
  beginRecord();
  textFont(font);
  textSize(80);      // millimetres while recording
  fill("#39c5bb");
  text("p5", 5, 80);
  endRecord();
}
```

Calling `text()` with a system font now logs a warning in stitch and realistic
modes instead of silently drawing nothing.

## 10. `endContour()` default changed

p5.js 1.x closed the contour by default; p5.js 2.x leaves it open. p5.embroider
defaults `endContour()` to `CLOSE` so existing sketches keep cutting holes, and
forwards an explicit mode if you pass one. Pass `endContour(CLOSE)` if you want
to be unambiguous.

**Known p5.js limitation.** p5.js 2.3.2 only subtracts a contour from a shape's
fill when the contour is made of plain `vertex()` calls. Contours built from
`bezierVertex()` or `splineVertex()` draw their outline but do not cut a hole in
`"p5"` draw mode. Stitch and realistic modes are unaffected, because p5.embroider
closes contours itself. Use plain `vertex()` for contours if you need the hole to
show in `"p5"` mode.

---

## What did not change

Recording, export and units are unchanged:

- `beginRecord()` / `endRecord()`
- `setStitch()`, `setStitchWidth()`, `setStrokeMode()`, `setFillMode()`, `setDrawMode()`
- `exportEmbroidery()`, `exportDST()`, `exportGcode()`, `exportSVG()`, `exportPNG()`
- `trimThread()`, `embroideryOutline()`, `exportOutline()`
- `mmToPixel()` / `pixelToMm()`, and millimetres as the unit while recording

---

## Staying on p5.js 1.x

p5.embroider 0.2.1 is the last release built for p5.js 1.x. A frozen copy is kept
in this repository under [`v1/`](./v1/) so 1.x sketches have a stable URL:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@1.11.1/lib/p5.js"></script>
<script src="https://nkymut.github.io/p5.embroider/v1/p5.embroider.js"></script>
```

You can also pin the published package instead:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@1.11.1/lib/p5.js"></script>
<script src="https://unpkg.com/p5.embroider@0.2.1/lib/p5.embroider.js"></script>
```

or with npm:

```
npm install p5@^1.11.0 p5.embroider@0.2.1
```

The `v1/` copy is frozen; fixes and new features only land in the p5.js 2.x build.

p5.embroider 0.3 still contains a p5.js 1.x code path, but it is deprecated, is
not covered by the test suite, and will be removed in a future release. Treat
0.2.1 as the supported option for 1.x sketches.

p5.js also publishes compatibility add-ons that restore the 1.x shape and
preload APIs on top of 2.x, if you would rather not rewrite a large sketch:
<https://github.com/processing/p5.js-compatibility>

---

## Getting help

If something that worked on 1.x does not work here, please open an issue with a
minimal sketch: <https://github.com/nkymut/p5.embroider/issues>
