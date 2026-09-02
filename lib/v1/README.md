# p5.embroider v1 (for p5.js 1.x)

This folder holds a frozen copy of **p5.embroider 0.2.1**, the last release built
for **p5.js 1.x**. It exists so sketches written against p5.js 1.x keep working at
a stable URL after the main library moved to p5.js 2.x.

It is not maintained. Bug fixes and new features land in the p5.js 2.x build in
`lib/`.

## Usage

```html
<script src="https://cdn.jsdelivr.net/npm/p5@1.11.1/lib/p5.js"></script>
<script src="https://nkymut.github.io/p5.embroider/lib/v1/p5.embroider.js"></script>
```

Note that the 1.x API differs from the current one, most visibly:

- `beginRecord(this)` — the instance argument is required here
- `curveVertex()`, `curve()`, `quadraticVertex()` and six-argument `bezierVertex()`
- `preload()` for `loadFont()` and other asset loading
- `curveDetail()` / `bezierDetail()` instead of `setCurveDetail()`

## Moving to the current version

See [MIGRATION.md](../../MIGRATION.md). Most sketches need three changes: update the
p5.js script tag, move asset loading into `async setup()`, and drop the argument
from `beginRecord()`.
