const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: {
    background: './public/background.js',
    content: './public/content.js',
    buildDomTree: './public/buildDomTree.js',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
    clean: false, // Don't clean as React build also outputs here
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
  optimization: {
    minimize: true,
    // Prevent code splitting for Chrome extension compatibility
    splitChunks: {
      chunks: 'async',
    },
  },
  // Chrome extension specific settings
  resolve: {
    fallback: {
      fs: false,
      path: false,
      crypto: false,
    },
  },
  // Ensure output is compatible with Chrome extensions
  target: 'webworker', // For service worker
};
