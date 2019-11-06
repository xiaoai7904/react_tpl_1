const { override, useBabelRc, addWebpackAlias, fixBabelImports, addLessLoader, overrideDevServer, disableEsLint } = require('customize-cra');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const proxy = {
  target: '',
  changeOrigin: true
};

if (process.env.NODE_ENV !== 'production') {
  let processArgv = process.argv;
  let _url = processArgv[processArgv.length - 1].match(/url=(.*)/);
  if (_url && _url.length >= 2) {
    proxy.target = `${_url[1]}`;
  }
}
function dateFormat(date, format) {
  var dateTime = new Date(date);
  var o = {
    'M+': dateTime.getMonth() + 1, //month
    'd+': dateTime.getDate(), //day
    'h+': dateTime.getHours(), //hour
    'm+': dateTime.getMinutes(), //minute
    's+': dateTime.getSeconds(), //second
    'q+': Math.floor((dateTime.getMonth() + 3) / 3), //quarter
    S: dateTime.getMilliseconds() //millisecond
  };
  if (/(y+)/.test(format)) {
    format = format.replace(RegExp.$1, (dateTime.getFullYear() + '').substr(4 - RegExp.$1.length));
  }
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(format)) {
      format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
    }
  }
  return format;
}
const devServerConfig = () => config => {
  return {
    ...config,
    port: 3000,
    proxy: {
      '/userfront': proxy,
      '/sys': proxy,
      '/datatransfer': proxy
    }
  };
};
class FilterCSSConflictingWarning {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('FilterWarning', compilation => {
      compilation.warnings = (compilation.warnings || []).filter(warning => {
        return !warning.message.includes('Conflicting order between:');
      });
    });
  }
}
module.exports = {
  devServer: overrideDevServer(devServerConfig()),
  webpack: override(
    disableEsLint(),
    addWebpackAlias({
      '@': path.resolve(__dirname, 'src')
    }),
    fixBabelImports('import', {
      libraryName: 'antd-mobile',
      libraryDirectory: 'lib',
      style: true,
      legacy: true
    }),
    addLessLoader({
      javascriptEnabled: true,
      modifyVars: {
        // hd: '2px',
        'brand-primary': '#503F32',
        'color-text-base': '#333'
      }
    }),
    useBabelRc(),
    config => {
      config.output['globalObject'] = 'this';
      config.module.rules.push({
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' }
      });
      config.plugins.push(new FilterCSSConflictingWarning());
      if (process.env.NODE_ENV === 'production') {
        config.optimization.minimizer.push(
          new TerserPlugin({
            sourceMap: true, // Must be set to true if using source-maps in production
            terserOptions: {
              compress: {
                // drop_console: true
              }
            }
          })
        );
        const date = dateFormat(new Date().getTime(), 'yyyyMMddhhmm');
        config.output = Object.assign(config.output, {
          filename: config.output.filename.replace(/\/js/, `/js_${date}`),
          chunkFilename: config.output.chunkFilename.replace(/\/js/, `/js_${date}`)
        });
        config.devtool = false;
      }
      return config;
    }
  )
};
