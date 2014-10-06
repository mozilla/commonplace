var amdOptimize = require('amd-optimize');
var glob = require('glob');
var gulp = require('gulp');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var eventStream = require('event-stream');
var uglify = require('gulp-uglify');
var gulpUtil = require('gulp-util');
var ignore = require('gulp-ignore');
var insert = require("gulp-insert");
var install = require("gulp-install");
var order = require('gulp-order');
var rename = require('gulp-rename');
var stylus = require('gulp-stylus');
var webserver = require('gulp-webserver');
var _ = require('underscore');
var argv = require('yargs').argv;
var config = require('../../../../config');

var paths = {
    bower: 'bower_components/',
    css: config.CSS_DEST_PATH + '**/*.css',
    styl: config.CSS_DEST_PATH + '**/*.styl',
    js: config.JS_DEST_PATH + '**/*.js'
};
paths.require = paths.bower + 'requirejs/require.js';
paths.almond = paths.bower + 'almond/almond.js';
paths.init = paths.bower + 'commonplace/dist/core/init.js';

var INCLUDE_JS = 'include.js';
var INCLUDE_CSS = 'include.css';


gulp.task('install', function(done) {
    // Bumps bower and npm dependencies.
    gulp.src(['bower.json', 'package.json'])
        .pipe(install())
        .pipe(gulpUtil.noop())  // Wait for dependencies to finish installing.
        .on('finish', function() {
            done();
        });
});


gulp.task('bower_copy', ['install'], function() {
    // Copy files from Bower into project.
    _.each(Object.keys(config.bowerConfig), function(source) {
        var dest = config.bowerConfig[source];
        gulp.src(paths.bower + source)
            .pipe(gulp.dest(dest));
    });
});


gulp.task('require_config', ['install'], function() {
    // Build a require.js file that contains a convenience call to
    // require.config that sets up some pre-known paths.
    gulp.src(paths.require)
        .pipe(insert.append(config.inlineRequireConfig))
        .pipe(gulp.dest(config.LIB_DEST_PATH));
});


gulp.task('css_compile', function() {
    gulp.src(paths.styl)
        .pipe(stylus({
            linenos: true
        }))
        .pipe(gulp.dest(config.CSS_DEST_PATH));
});


gulp.task('css_build', ['css_compile'], function() {
    gulp.src(paths.css)
        .pipe(stylus({
            compress: true
        }))
        .pipe(concat(INCLUDE_CSS))
        .pipe(gulp.dest(config.CSS_DEST_PATH));
});


gulp.task('js_build', function() {
    // Uses the AMD optimizer to bundle our JS modules.
    // Will read our RequireJS config to handle shims, paths, and name
    // anonymous modules.
    // Traces all modules and outputs them in the correct order.
    eventStream.merge(
        // Almond loader.
        gulp.src(paths.almond),
        // JS bundle.
        gulp.src(paths.js)
            .pipe(amdOptimize('main', {
                baseUrl: config.JS_DEST_PATH,
                findNestedDependencies: true,
                paths: config.requireConfig.paths,
                shim: config.requireConfig.shim,
                wrapShim: true
            }))
            .pipe(concat(INCLUDE_JS)),
        // Init script.
        gulp.src(paths.init)
    )
        .pipe(order(['**/almond.js', '**/include.js', '**/init.js']))
        .pipe(uglify())
        .pipe(concat(INCLUDE_JS))
        .pipe(gulp.dest(config.JS_DEST_PATH));
});


gulp.task('serve', ['build'], function() {
    // t/template -- template to serve (e.g., index (default), app, server).
    var template = 'index';
    if (argv._[0] == 'serve' && (argv.t || argv.template)) {
        template = argv.t || argv.template;
    }

    gulp.src(['src'])
        .pipe(ignore.exclude('src/index.html'))
        .pipe(webserver({
            fallback: template + '.html',
            livereload: true,
            port: 8675
        }));
});


gulp.task('clean', function() {
    gulp.src([config.JS_DEST_PATH + INCLUDE_JS,
              config.CSS_DEST_PATH + INCLUDE_CSS], {read: false})
        .pipe(clean({force: true}));
});


gulp.task('default', []);
gulp.task('update', ['bower_copy', 'require_config']);
gulp.task('build', ['css_build', 'js_build']);
