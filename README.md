
# p5.embroider

## A p5.js Library for Digital Embroidery Pattern Creation

[**p5.embroider.js**](https://github.com/nkymut/p5.embroider) is a p5.js library for creating digital embroidery patterns.<br />

**Note:** This library is currently in early Alpha stage. Expect frequent and significant breaking changes. Please use with caution.


Version 0.1.5, June 24, 2025 • by Yuta Nakayama ([nkymut](https://github.com/nkymut))


## Installation
To use p5.sensor in your project, include the library in your HTML file:

### CDNs

```html
<script src="https://unpkg.com/p5.embroider/lib/p5.embroider.js"></script>
```

### GitHub Pages

```html
<script src="https://nkymut.github.io/p5.embroider/lib/p5.embroider.js"></script>
```


## Examples

[editor.p5.js](https://editor.p5js.org/didny/sketches/PR9KKzCMe)   

```jsx
let _drawMode = "stitch";

let roygbiv = ["red", "orange", "yellow", "green", "blue", "indigo"];

function setup() {
  createCanvas(mmToPixel(150), mmToPixel(150));

  let exportDstButton = createButton("Export DST");
  exportDstButton.mousePressed(() => {
    exportEmbroidery("colorExample.dst");
  });
  exportDstButton.position(0, height + 60);

  noLoop();
}

function draw() {
  background("#FFF5DC");
  let stitchWidth = 8;
  // Set the drawing mode to show stitches
  stroke(255, 0, 0);
  noFill();
  setDrawMode(_drawMode);
  //translate(0, 0);
  beginRecord(this);
  strokeWeight(stitchWidth);
  setStitch(0.1, 0.5, 0);
  setStrokeMode("zigzag");
  for (let i = 0; i < roygbiv.length; i++) {
    stroke(roygbiv[roygbiv.length - 1 - i]);
    ellipse(75, 75, stitchWidth * 2 + stitchWidth * 2 * i, stitchWidth * 2 + stitchWidth * 2 * i);
  }

  // End recording
  endRecord();
}
```

## Documentation

[Documentation](https://nkymut.github.io/p5.embroider/docs/index.html)


## License

This project is licensed under the LGPL v2.1 License - see the [LICENSE](LICENSE) file for details.


## References

p5.plotSvg
[https://github.com/golanlevin/p5.plotSvg](https://github.com/golanlevin/p5.plotSvg)

pyembroidery
[https://github.com/EmbroidePy/pyembroidery](https://github.com/EmbroidePy/pyembroidery)

Ink/Stitch
[https://github.com/inkstitch/inkstitch](https://github.com/inkstitch/inkstitch)

PEmbroider
[https://github.com/CreativeInquiry/PEmbroider](https://github.com/CreativeInquiry/PEmbroider)

stitch.js
[https://github.com/stitchables/stitch.js](https://github.com/stitchables/stitch.js)


