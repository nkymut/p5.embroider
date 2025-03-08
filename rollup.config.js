import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from 'rollup-plugin-terser';

export default [
  // Unminified build
  {
    input: "./src/app.js",
    output: {
      file: "./lib/p5.embroider.js",
      format: "umd",
      name: "p5.embroider",
      globals: {
        p5: "p5",
      },
      sourcemap: true
    },
    plugins: [
      nodeResolve({
        browser: true,
      }),
      commonjs(),
    ],
    external: ["p5"],
  },
  // Minified build
  {
    input: "./src/app.js",
    output: {
      file: "./lib/p5.embroider.min.js",
      format: "umd",
      name: "p5.embroider",
      globals: {
        p5: "p5",
      },
      sourcemap: true
    },
    plugins: [
      nodeResolve({
        browser: true,
      }),
      commonjs(),
      terser()
    ],
    external: ["p5"],
  }
];
