const path = require('path');

module.exports = {
  entry: './src/client.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'static'),
  },
  externals: {
    'socket.io-client': 'io',
    bootstrap: 'bootstrap',
  },
};
