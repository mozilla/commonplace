/*
    Base config for Marketplace frontend projects. They require and extend
    this config in their config.js in their project roots. The config mostly
    helps the build system copy files or generate RequireJS configs for core
    files.
*/
var BASE_PATH = 'src/media/';
var JS_DEST_PATH = BASE_PATH + 'js/';
var LIB_DEST_PATH = JS_DEST_PATH + 'lib/';
var CSS_DEST_PATH = BASE_PATH + 'css/';

// Build config object to tell Gulp which Bower files into project and where.
var bowerConfig = {
    'almond/almond.js': LIB_DEST_PATH,
    'jquery/jquery.js': LIB_DEST_PATH,
    // TODO: Use the official nunjucks and not a modified one.
    // 'nunjucks/browser/nunjucks-slim.js': LIB_DEST_PATH,
    'underscore/underscore.js': LIB_DEST_PATH,
};

// Build require config, to be used in development and AMD optimizers.
var requireConfig = {
    // Extra paths to include when running `make build`.
    buildPaths: {
        'core': '../../../bower_components/marketplace-core-modules/core',
    },
    enforceDefine: true,
    paths: {
        'core': 'lib/core',
        'jquery': 'lib/jquery',
        // 'nunjucks': 'lib/nunjucks-slim',
        'templates': '../../templates',
        'underscore': 'lib/underscore',
    },
    shim: {
        'underscore': {
            'exports': '_'
        },
    }
};

var BOWER_PATH = process.env.BOWER_PATH || './bower_components/';

// Server config to allow easy switching of servers in settings.
var serverConfig = {
    prod: {
        api_url: 'https://marketplace.firefox.com',
        media_url: 'https://marketplace.cdn.mozilla.net/media/',
    },
    dev: {
        api_url: 'https://marketplace-dev.allizom.org',
        media_url: 'https://marketplace-dev.mozflare.net/media/',
    },
    stage: {
        api_url: 'https://marketplace.allizom.org',
        media_url: 'https://marketplace-stage.cdn.mozilla.net/media/',
    },
    altdev: {
        api_url: 'https://marketplace-altdev.allizom.org',
        media_url: 'https://marketplace-altdev-cdn.allizom.org/media/',
    },
    paymentsalt: {
        api_url: 'https://payments-alt.allizom.org',
        media_url: 'https://payments-alt-cdn.allizom.org/media/',
    },
    localhost: {
        api_url: 'http://localhost',
        media_url: 'http://localhost',
    },
    mpdev: {
        api_url: 'http://mp.dev',
        media_url: 'http://mp.dev/media/',
    },
    mock: {
        api_url: 'https://flue.paas.allizom.org',
        media_url: 'https://flue.paas.allizom.org',
    },
    mocklocal: {
        api_url: 'http://localhost:5000',
        media_url: 'http://localhost:5000',
    },
};

module.exports = {
    bowerConfig: bowerConfig,
    requireConfig: requireConfig,
    serverConfig: serverConfig,
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
