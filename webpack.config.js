const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  target: "node",
  mode: "production",
  entry: "./index.js", // Change this to the entry file of your Express app
  output: {
    path: path.resolve(__dirname, "dist"), // Change this to the output directory
    filename: "bundle.js",
  },
  externals: [nodeExternals()],
};
