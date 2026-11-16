# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [0.3.3](https://github.com/nkymut/p5.embroider/compare/v0.3.0...v0.3.3) (2026-11-16)


### ### Added

* add drawPreviewGrid, a zoom-adaptive mm grid for the preview viewport ([dd8f5e5](https://github.com/nkymut/p5.embroider/commit/dd8f5e585e512b65dcbacdc97c897b43afe84001))


### ### Fixed

* close the zigzag gap at corners and honour strokeJoin() ([9e5eb42](https://github.com/nkymut/p5.embroider/commit/9e5eb4219559f4b402b97a494e1c696ab5f45688)), closes [#28](https://github.com/nkymut/p5.embroider/issues/28)
* drawGrid vertical lines were offset by half the grid spacing ([20055e4](https://github.com/nkymut/p5.embroider/commit/20055e44cba6db5d7e5d7e1c8029b647620f74f2))
* endShape() recorded outline stitches even after noStroke() ([a6553d7](https://github.com/nkymut/p5.embroider/commit/a6553d73c1e93a7059cb999cc753939933badff6)), closes [#31](https://github.com/nkymut/p5.embroider/issues/31)
* keep the two PEC header fields before the stitch stream ([5723335](https://github.com/nkymut/p5.embroider/commit/57233356203587e3d4dd2037bb2529d1f9a0dd0c)), closes [#25](https://github.com/nkymut/p5.embroider/issues/25)
* PES jumps, trims, long moves and thumbnails ([8bd4e4e](https://github.com/nkymut/p5.embroider/commit/8bd4e4e56edd9b4624d09feb7841ec7a13783ec0)), closes [#25](https://github.com/nkymut/p5.embroider/issues/25) [#23](https://github.com/nkymut/p5.embroider/issues/23) [#24](https://github.com/nkymut/p5.embroider/issues/24) [#25](https://github.com/nkymut/p5.embroider/issues/25)
* preview viewport zoom centre follows resizeCanvas() ([d467319](https://github.com/nkymut/p5.embroider/commit/d4673191450696c2c72b0c66607f3d8d090cd45f)), closes [#39](https://github.com/nkymut/p5.embroider/issues/39)
* record primitive transforms in p5 mode, centre DST for negative coords, one fill angle unit ([85ea69f](https://github.com/nkymut/p5.embroider/commit/85ea69f88c3b174c9432a9dfaa9c60da7bf587c1)), closes [#33](https://github.com/nkymut/p5.embroider/issues/33) [#34](https://github.com/nkymut/p5.embroider/issues/34) [#35](https://github.com/nkymut/p5.embroider/issues/35) [#36](https://github.com/nkymut/p5.embroider/issues/36)
* use Closure syntax for the optional width in JSDoc types and regenerate docs ([428bc14](https://github.com/nkymut/p5.embroider/commit/428bc14f3a6d78ddfc3c339b4c49ac1394be2800))
* write the PEC design box offset so machines show the whole design ([32ba4af](https://github.com/nkymut/p5.embroider/commit/32ba4afe5b06e3d4c130e305363b7d376cfd165c)), closes [#25](https://github.com/nkymut/p5.embroider/issues/25)


### ### Changed

* add a miter option to the zigzagCornerSpacing sew-out test ([e21e1ca](https://github.com/nkymut/p5.embroider/commit/e21e1ca5657e8fbe950b94e45ae506c97163f4c7))
* **release:** 0.3.1 ([b0d5302](https://github.com/nkymut/p5.embroider/commit/b0d53024588f7652a234186c05b16dd2af590b5b))
* run tests and a lib/ build check on PRs and before each Pages deploy ([70670b9](https://github.com/nkymut/p5.embroider/commit/70670b956b5360237166b4833244f06944c01d13))
* wrap the setStitchInterpolate deprecation warning ([3e5adc5](https://github.com/nkymut/p5.embroider/commit/3e5adc5ba2647228b40d6502b12a9773cd57c159))

### [0.3.1](https://github.com/nkymut/p5.embroider/compare/v0.3.0...v0.3.1) (2026-11-16)


### ### Added

* add drawPreviewGrid, a zoom-adaptive mm grid for the preview viewport ([dd8f5e5](https://github.com/nkymut/p5.embroider/commit/dd8f5e585e512b65dcbacdc97c897b43afe84001))


### ### Changed

* add a miter option to the zigzagCornerSpacing sew-out test ([e21e1ca](https://github.com/nkymut/p5.embroider/commit/e21e1ca5657e8fbe950b94e45ae506c97163f4c7))
* run tests and a lib/ build check on PRs and before each Pages deploy ([70670b9](https://github.com/nkymut/p5.embroider/commit/70670b956b5360237166b4833244f06944c01d13))
* wrap the setStitchInterpolate deprecation warning ([3e5adc5](https://github.com/nkymut/p5.embroider/commit/3e5adc5ba2647228b40d6502b12a9773cd57c159))


### ### Fixed

* close the zigzag gap at corners and honour strokeJoin() ([9e5eb42](https://github.com/nkymut/p5.embroider/commit/9e5eb4219559f4b402b97a494e1c696ab5f45688)), closes [#28](https://github.com/nkymut/p5.embroider/issues/28)
* drawGrid vertical lines were offset by half the grid spacing ([20055e4](https://github.com/nkymut/p5.embroider/commit/20055e44cba6db5d7e5d7e1c8029b647620f74f2))
* endShape() recorded outline stitches even after noStroke() ([a6553d7](https://github.com/nkymut/p5.embroider/commit/a6553d73c1e93a7059cb999cc753939933badff6)), closes [#31](https://github.com/nkymut/p5.embroider/issues/31)
* keep the two PEC header fields before the stitch stream ([5723335](https://github.com/nkymut/p5.embroider/commit/57233356203587e3d4dd2037bb2529d1f9a0dd0c)), closes [#25](https://github.com/nkymut/p5.embroider/issues/25)
* PES jumps, trims, long moves and thumbnails ([8bd4e4e](https://github.com/nkymut/p5.embroider/commit/8bd4e4e56edd9b4624d09feb7841ec7a13783ec0)), closes [#25](https://github.com/nkymut/p5.embroider/issues/25) [#23](https://github.com/nkymut/p5.embroider/issues/23) [#24](https://github.com/nkymut/p5.embroider/issues/24) [#25](https://github.com/nkymut/p5.embroider/issues/25)
* preview viewport zoom centre follows resizeCanvas() ([d467319](https://github.com/nkymut/p5.embroider/commit/d4673191450696c2c72b0c66607f3d8d090cd45f)), closes [#39](https://github.com/nkymut/p5.embroider/issues/39)
* record primitive transforms in p5 mode, centre DST for negative coords, one fill angle unit ([85ea69f](https://github.com/nkymut/p5.embroider/commit/85ea69f88c3b174c9432a9dfaa9c60da7bf587c1)), closes [#33](https://github.com/nkymut/p5.embroider/issues/33) [#34](https://github.com/nkymut/p5.embroider/issues/34) [#35](https://github.com/nkymut/p5.embroider/issues/35) [#36](https://github.com/nkymut/p5.embroider/issues/36)
* use Closure syntax for the optional width in JSDoc types and regenerate docs ([428bc14](https://github.com/nkymut/p5.embroider/commit/428bc14f3a6d78ddfc3c339b4c49ac1394be2800))
* write the PEC design box offset so machines show the whole design ([32ba4af](https://github.com/nkymut/p5.embroider/commit/32ba4afe5b06e3d4c130e305363b7d376cfd165c)), closes [#25](https://github.com/nkymut/p5.embroider/issues/25)

## [0.3.0](https://github.com/nkymut/p5.embroider/compare/v0.2.1...v0.3.0) (2026-09-02)


### ### Changed

* add p5.js v1.x→v2.x migration guide and deprecate 1.x aliases  [#14](https://github.com/nkymut/p5.embroider/issues/14) ([504e7a4](https://github.com/nkymut/p5.embroider/commit/504e7a492bee7565513c643e3e4bcb67ab549ead))
* sync lib/v2/p5.embroider.js from p5_2.0 ([180f907](https://github.com/nkymut/p5.embroider/commit/180f90719aea07dbf81f4a2c2df0ee0e1914eb70))


### ### Fixed

* ✂️ mark font error ([d9aa19e](https://github.com/nkymut/p5.embroider/commit/d9aa19e5ba2b12ff0984863c775bb1446e2242c9))
* textFont() error ([705ede9](https://github.com/nkymut/p5.embroider/commit/705ede9e60421ffc9e347f49bfcfa7a7d3322910))

### [0.2.1](https://github.com/nkymut/p5.embroider/compare/v0.2.0...v0.2.1) (2026-02-02)

## [0.2.0](https://github.com/nkymut/p5.embroider/compare/v0.1.7...v0.2.0) (2025-12-18)


### ### Changed

* **release:** 0.1.9 ([310c91b](https://github.com/nkymut/p5.embroider/commit/310c91b6b2b1c44efb3fe0121c0542bd0c2b1254))

### [0.1.9](https://github.com/nkymut/p5.embroider/compare/v0.1.7...v0.1.9) (2025-12-18)

### [0.1.9](https://github.com/nkymut/p5.embroider/compare/v0.1.7...v0.1.9) (2025-12-16)

## [0.1.8] - 2025-12-17

## [0.1.7] - 2025-12-16

### Added
- Add fillMode Satin and Spiral (`506e448`)
- Add banner and example image (`eed2552`)

### Changed
- Update README (`73a0154`)
- Update jsdoc (`494a385`)
- Clean up SVGWriter related samples (`cf6e6a9`)

### Fixed
- Fix Satin Fill alternate directions (`e43860c`)

## [0.1.6] - 2025-06-24

### Added
- Add setting corner radius to `rect` (`6806536`)
- Add fill to ellipse and Fix Tatami fill for rect (`bc7a2c5`)
- Add circle, square draw functions (`fdaa641`)

## [0.1.5] - 2025-06-23

### Fixed
- Fix DST export error caused by NaN coordinates (`ca21ee5`)

### Changed
- Update .gitignore (`24e5fb3`)

## [0.1.4] and earlier

### Added
- Add exportOutline and setStitchWidth (`666cae9`)
- Add exportSVGFromPath and allow cornerRadius for bounding box outline (`e283e78`)
- Add utility folder for utility functions, Hoops and Guide Drawing functions, Preview Viewport (`47e9ff6`)
- Add `embroideryOutlineFromPath` to p5.embroider (`6527ef7`)
- Add `ramp` and `square` stroke modes (`246d0bd`)
- Add `strokeEntry` `strokeExit` settings for `zigzagStitch` (`525d805`)
- Add exportJSON (`a5e192b`)
- Add 'exportSVG' and 'exportPNG' (`f6e51e2`)
- Add 'push','pop', 'translate', 'rotate', 'scale' (`a725550`)
- Add `bezier`, `curve`, `bezierVertex`, `quadraticVertex`, `curveVertex`, `beginContour` `endContour` (`61be828`)
- Add `strokeJoin`, fix fill for `arc` (`73c2e80`)
- Add `triangle`,`quad`,`arc` (`61a3d41`)
- Add Bbox edit for SVGInput sample (`8378ecb`)
- Add property edit to SVGInput example, support more spline curves import (`dd3267e`)

### Changed
- Update exportOutline to export clean outline for laser cutting (`1b5a60a`)
- Split outline related function under embroidery-outline.js (`e3ef5a0`)
- Update default export writer setting not to draw frame (`8a29f70`)
- Update viewport for svginput example (`cf52fae`)
- Refactor unit conversion methods (`ccd448a`)
- Update Parts Setting UI (`06cd6f1`)
- Update SVGInput - allow multiple parts edit - refactor draw function for SVG parts (`489f626`)
- Update SVGInput to allow group bbox edit (`ded092e`)
- Update SVGInput Sample - add outline - add `embroideryOutlineFromPath` to p5.embroider - improve UI (`6527ef7`)
- Update Part Setting pane of SVGInput (`830e48b`)
- Update svginput to support primitives (`08b632a`)
- Update svginput sample - made preview scalable, pannable - add visual feedback on selected items (`8d95e74`)
- Update strokemode sample (`e623381`)
- Update Document (`8fd08ab`)
- Update jsdoc (`cbfee13`)

### Fixed
- Fix SVG export size issue (`aa2db79`)
- Fix globally exposed setStitchWidth (`ae1e911`)
- Fix Adobe 72dpi issue (`8c3bd95`)
- Fix p5.embroider.js:6385 trimThread: No stitches to trim for thread 0 error (`28bbd9e`)
- Fix UI elements not editable issue for SVGInput (`ad4d75d`)
- Fix console.log issue (`432ccfa`)
- Fix `vertex` function does not respect translate transformations in p5 mode #11 (`7ba97d5`)
- Fix svginput sample (`e616e4c`)
- Fix typo (`5da8f96`, `3fa50d2`)
- Fix apply transform functions to `bezierVertex`, `quadraticVertex`, and `curveVertex` (`83a747f`)
- Fix 'push', 'pop', 'translate' coordinate issue (`30d67ad`)
- Fix maximum call stack size error for `triangle`, `quad` and `arc` (`143e319`)

### Examples
- Add strokemode `ramp` and `square` sample (`51b48e9`)
- Add `embroideryOutline(offset)` example (`1edaec9`)
- Add example for `push`, `pop`, `translate`, `rotate` (`e3e05c8`)

[Unreleased]: https://github.com/nkymut/p5.embroider/compare/v0.1.8...HEAD
[0.1.8]: https://github.com/nkymut/p5.embroider/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/nkymut/p5.embroider/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/nkymut/p5.embroider/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/nkymut/p5.embroider/compare/v0.1.4...v0.1.5
