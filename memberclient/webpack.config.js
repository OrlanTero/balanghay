const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/renderer/index.js',
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'build'),
    assetModuleFilename: 'assets/[hash][ext][query]',
  },
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
}; 