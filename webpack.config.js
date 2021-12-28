module.exports = {
  entry: {
    test: './tmp/web.js',
    cli: './tmp/cli.js'
  },
  output: {
    path: `${__dirname}/dist`,
    filename: "[name].js"
  },
  optimization:{
    minimize: false
  }
};
