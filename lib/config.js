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
    'nunjucks',
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

var CORE_VIEWS = [
    'views/not_found',
    'views/tests'
];

// Build config object to tell Gulp which Bower files into project and where.
var bowerConfig = {
    'jquery/jquery.js': LIB_DEST_PATH,
    // TODO: Use the official nunjucks and not a modified one.
    // 'nunjucks/browser/nunjucks-slim.js': LIB_DEST_PATH,
    'underscore/underscore.js': LIB_DEST_PATH
};
_.each(CORE_MODULES, function(module) {
    bowerConfig[CORE_SRC_PATH + module + '.js'] = CORE_DEST_PATH;
});
_.each(CORE_VIEWS, function(view) {
    bowerConfig[CORE_SRC_PATH + view + '.js'] = CORE_DEST_PATH + 'views/';
});


// Build require config, to be used in development and AMD optimizers.
var requireConfig = {
    enforceDefine: true,
    paths: {
        'jquery': 'lib/jquery',
        // 'nunjucks': 'lib/nunjucks-slim',
        'settings': ['settings_local', 'settings'],
        'templates': '../../templates',
        'underscore': 'lib/underscore',
        'views/not_found': 'lib/commonplace/views/not_found',
        'views/tests': 'lib/commonplace/views/tests',
    },
    shim: {
        'underscore': {
            'exports': '_'
        },
    }
};
_.each(CORE_MODULES, function(module) {
    requireConfig.paths[module] = 'lib/commonplace/' + module;
});
_.each(CORE_VIEWS, function(view) {
    requireConfig.paths[view] = 'lib/commonplace/' + view;
});

module.exports = {
    bowerConfig: bowerConfig,
    requireConfig: requireConfig,
    LIB_DEST_PATH: LIB_DEST_PATH,
    makeInlineRequireConfig: function(requireConfig) {
        return '(function() {' +
            'require.config(' +
                JSON.stringify(requireConfig) +
            ');' +
        '}())';
    }
};
