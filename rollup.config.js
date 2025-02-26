import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "./src/p5.embroider.js",
  output: {
    file: "./lib/p5.embroider.js",
    format: "umd",
    name: "p5.embroider",
    globals: {
      p5: "p5",
    },
  },
  plugins: [
    nodeResolve({
      browser: true,
    }),
    commonjs(),
  ],
  external: ["p5"],
};
