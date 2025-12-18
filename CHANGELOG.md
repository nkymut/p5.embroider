# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
