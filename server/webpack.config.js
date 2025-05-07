const path = require("path");

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: "./src/renderer.js",
  output: {
    path: path.resolve(__dirname, "src"),
    filename: "bundle.js",
    publicPath: './',
    // Ensure asset paths are preserved in production
    assetModuleFilename: 'assets/[name][ext]'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
        type: "asset/resource",
        generator: {
          filename: 'assets/[name][ext]'
        }
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  target: "electron-renderer",
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' ? {
    optimization: {
      minimize: true,
      // Don't mangle paths in production to avoid filename issues
      moduleIds: 'named',
      chunkIds: 'named'
    },
    performance: {
      hints: 'warning',
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  } : {})
};
