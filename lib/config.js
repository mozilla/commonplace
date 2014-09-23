var _ = require('underscore');

var CORE_MODULES = [
    // Core JS modules.
    // Will tell Gulp which modules to pull into commonplace/.
    // Will tell the require.js config which files live in commonplace/.
    'assert',
    'buckets',
    'builder',
    'cache',
    'capabilities',
    'defer',
    'forms',
    'format',
    'helpers',
    'log',
    'login',
    'models',
    'navigation',
    'notification',
    'nunjucks.compat',
    'requests',
    'storage',
    'urls',
    'user',
    'utils',
    'z'
];
var CORE_SRC_PATH = 'commonplace/dist/core/';
var CORE_DEST_PATH = 'src/media/js/lib/commonplace/';

var LIB_DEST_PATH = 'src/media/js/lib/';
var LIB_MODULES = {
    // Third-party JS modules.
    // Will tell Gulp which modules to pull into lib/.
    // Will tell the require.js config which files live in lib/.
    'requirejs/require.js': LIB_DEST_PATH,
    'jquery/jquery.js': LIB_DEST_PATH,
    'nunjucks/browser/nunjucks-slim.js': LIB_DEST_PATH,
    'underscore/underscore.js': LIB_DEST_PATH
};


// Build config object to tell Gulp which Bower files into project and where.
var bowerConfig = {};
_.each(CORE_MODULES, function(module) {
    bowerConfig[CORE_SRC_PATH + module + '.js'] = CORE_DEST_PATH;
});
bowerConfig = _.extend(bowerConfig, LIB_MODULES);


// Build require config, to be used in development and AMD optimizers.
var requireConfig = {
    paths: {
        'format': 'lib/format',
        'jquery': 'lib/jquery',
        'nunjucks': 'lib/nunjucks-slim',
        'templates': '../../templates',
        'underscore': 'lib/underscore',
        'views/tests': 'lib/commonplace/views/tests',
    }
};
for (var i = 0; i < CORE_MODULES.length; i++) {
    requireConfig.paths[CORE_MODULES[i]] = 'lib/commonplace/' +
                                           CORE_MODULES[i];
}

module.exports = {
    bowerConfig: bowerConfig,
    requireConfig: requireConfig
};
