const path = require('path');

module.exports = {
  entry: './src/client.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'static'),
  },
  externals: {
    mathjs: 'math',
    'socket.io-client': 'io',
  },
};
