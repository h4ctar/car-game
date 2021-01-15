const path = require('path');

module.exports = {
  entry: './src/client/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'static'),
  },
  mode: 'development',
  externals: {
    mathjs: 'math',
    'socket.io-client': 'io',
  }
};
