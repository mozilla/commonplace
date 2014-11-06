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
    'l10n',
    'log',
    'login',
    'models',
    'navigation',
    'notification',
    'nunjucks',
    'nunjucks.compat',
    'polyfill',
    'requests',
    'site_config',
    'storage',
    'urls',
    'user',
    'utils',
    'views',
    'z'
];

var CORE_MODULES_ROOT_JS = [
    // Core modules that traditionally live in the root JS path.
    'l10n',
    'views'
];

var CORE_VIEWS = [
    'views/not_found',
    'views/tests'
];

var BASE_TEMPLATES = [
    'app.html',
    'server.html'
];

var BASE_PATH = 'src/media/';
var CORE_SRC_PATH = 'commonplace/dist/core/';
var CORE_TEMPLATE_PATH = 'commonplace/dist/core-templates/';
var JS_DEST_PATH = BASE_PATH + 'js/';
var LIB_DEST_PATH = JS_DEST_PATH + 'lib/';
var CORE_DEST_PATH = LIB_DEST_PATH + 'commonplace/';
var CSS_DEST_PATH = BASE_PATH + 'css/';

// Build config object to tell Gulp which Bower files into project and where.
var bowerConfig = {
    'almond/almond.js': LIB_DEST_PATH,
    'jquery/jquery.js': LIB_DEST_PATH,
    // TODO: Use the official nunjucks and not a modified one.
    // 'nunjucks/browser/nunjucks-slim.js': LIB_DEST_PATH,
    'underscore/underscore.js': LIB_DEST_PATH,
    'commonplace/dist/core-templates/tests.html': 'src/templates/commonplace/',
    'commonplace/dist/core/tests/**/*.js': 'src/tests/commonplace/'
};
CORE_MODULES.forEach(function(module) {
    if (CORE_MODULES_ROOT_JS.indexOf(module) !== -1) {
        // Modules that go into the root JS path (for some reason).
        bowerConfig[CORE_SRC_PATH + module + '.js'] = JS_DEST_PATH;
        return;
    }
    bowerConfig[CORE_SRC_PATH + module + '.js'] = CORE_DEST_PATH;
});
CORE_VIEWS.forEach(function(view) {
    bowerConfig[CORE_SRC_PATH + view + '.js'] = CORE_DEST_PATH + 'views/';
});
BASE_TEMPLATES.forEach(function(template) {
    bowerConfig[CORE_TEMPLATE_PATH + template] = 'src/';
});


// Build require config, to be used in development and AMD optimizers.
var requireConfig = {
    enforceDefine: true,
    paths: {
        'jquery': 'lib/jquery',
        // 'nunjucks': 'lib/nunjucks-slim',
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
CORE_MODULES.forEach(function(module) {
    if (CORE_MODULES_ROOT_JS.indexOf(module) !== -1) {
        return;
    }
    requireConfig.paths[module] = 'lib/commonplace/' + module;
});
CORE_VIEWS.forEach(function(view) {
    requireConfig.paths[view] = 'lib/commonplace/' + view;
});

var BOWER_PATH = process.env.BOWER_PATH || './bower_components/';

module.exports = {
    bowerConfig: bowerConfig,
    requireConfig: requireConfig,
    BOWER_PATH: BOWER_PATH,
    CSS_DEST_PATH: CSS_DEST_PATH,
    JS_DEST_PATH: JS_DEST_PATH,
    LIB_DEST_PATH: LIB_DEST_PATH,
    makeInlineRequireConfig: function(requireConfig) {
        return '(function() {' +
            'require.config(' +
                JSON.stringify(requireConfig) +
            ');' +
        '}())';
    }
};
