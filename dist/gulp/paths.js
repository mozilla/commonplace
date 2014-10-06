var config = require('../../../../config');

var paths = {
    bower: 'bower_components/',
    css: config.CSS_DEST_PATH + '**/*.css',
    styl: config.CSS_DEST_PATH + '**/*.styl',
    js: config.JS_DEST_PATH + '**/*.js',
    html: 'src/templates/**/*.html',
    include_css: 'include.css',
    include_js: 'include.js',

};
paths.require = paths.bower + 'requirejs/require.js';
paths.almond = paths.bower + 'almond/almond.js';
paths.init = paths.bower + 'commonplace/dist/core/init.js';

module.exports = paths;
