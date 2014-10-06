var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var info = require('./info');
var utils = require('./utils');

var check_version = info.check_version;

var noop = function() {};


function generate_langpacks() {
    var process_file = require('./generate_langpacks').process_file;
    var src_dir = info.src_dir();

    check_version(src_dir, undefined, undefined, function() {
        console.error('No Commonplace installation found.');
        process.exit(1);
    });

    var langpacks_path = path.resolve(src_dir, 'media', 'locales');

    if (!fs.existsSync(langpacks_path)) {
        console.log('Langpacks path does not exist. Creating: ' + langpacks_path);
        fs.mkdirSync(langpacks_path);
    }
    utils.globEach('locale', '.po', function(filepath) {
        var path_regex = /locale\/([^\/]+?)\/LC_MESSAGES\/(.+?).po/;
        var match = path_regex.exec(filepath);
        var locale = match[1].split('_');

        // `ES` should be `es`.
        locale[0] = locale[0].toLowerCase();

        if (locale[1]) {
            if (locale[1].length == 2) {
                // `pt-br` should be `pt-BR`.
                locale[1] = locale[1].toUpperCase();
            } else {
                // `sr-latn` should be `sr-Latn`.
                locale[1] = locale[1][0].toUpperCase() + locale[1].substr(1).toLowerCase();
            }
        }

        locale = locale.join('-');
        process_file(filepath, locale, path.resolve(langpacks_path, locale + '.js'));
    });
}

function extract_l10n() {
    var context = new (require('./extract_l10n').L10nContext)();
    var src_dir = info.src_dir();

    check_version(src_dir, undefined, undefined, function() {
        console.error('No Commonplace installation found.');
        process.exit(1);
    });

    var nunjucks_parser = require('nunjucks').parser;
    var nunjucks_extensions = require('./deferparser').extensions || [];

    var file_count = 0;
    var init_html;  // These are needed to prevent race conditions.
    var init_js;

    function done() {
        file_count--;
        if (init_html && init_js && !file_count) {
            var hashfile = 'locale/templates/LC_MESSAGES/.messagehash';
            if (!context.hasChanged(hashfile)) {
                console.log('Strings have not changed; not updating file.');
                return;
            } else {
                console.log('Strings have changed; saving extraction results.');
            }
            context.save_po('locale/templates/LC_MESSAGES/messages.pot', function(err) {
                if (err) {
                    console.error('Could not save extracted strings.', err);
                    return;
                }
                console.log('Saving hash ' + context.saveHash(hashfile));
                console.log('Strings extracted successfully.');
                console.log(context.string_count() + ' strings extracted.');
            });
        }
    }

    function clean_path(path) {
        if (path.substr(0, src_dir.length) === src_dir) {
            path = path.substr(src_dir.length);
        }
        return path;
    }

    utils.glob(path.resolve(src_dir, 'templates'), '.html', function(err, list) {
        if (err) {
            console.warn('Error extracting HTML string.', err);
            return;
        }

        file_count += list.length;
        init_html = true;

        list.forEach(function(html_file) {
            fs.readFile(html_file, function(err, data) {
                var str_data = data + '';
                if (err) {
                    console.warn('Could not extract strings from: ' + html_file, err);
                    return;
                }
                var parse_tree = nunjucks_parser.parse(str_data, nunjucks_extensions);
                context.extract_template(str_data, parse_tree, clean_path(html_file));
                done();
            });
        });
    });

    utils.glob(path.resolve(src_dir, 'media', 'js'), '.js', function(err, list) {
        if (err) {
            console.warn('Error extracting JS string.', err);
            return;
        }

        file_count += list.length;
        init_js = true;

        list.forEach(function(js_file) {
            fs.readFile(js_file, function(err, data) {
                if (err) {
                    console.warn('Could not extract strings from: ' + js_file, err);
                    return;
                }
                context.extract_js(data + '', clean_path(js_file));
                done();
            });
        });
    });
}


function lint() {
    var jshint = require('jshint').JSHINT;
    var src_dir = info.src_dir();

    var config = info.commonplace_manifest().jshintConfig;

    var results = [];
    function report(file, err) {
        console.error(
            path.relative(process.cwd(), file) + ': ' + err.code,
            '(line ' + err.line + ', pos ' + err.character + ')',
            err.reason
        );
        results.push({file: file, error: err});
    }

    utils.globSync(src_dir, '.js', function(err, files) {
        if (err) {
            console.error('Error finding files for linting.', err);
            process.exit(1);
        }

        for (var i = 0, file; file = files[i++];) {
            // Skip over files in any `lib/` directory.
            if (path.dirname(file).split(path.sep).indexOf('lib') !== -1) {
                continue;
            }
            // Skip over `templates.js`.
            if (path.basename(file) === 'templates.js') {
                continue;
            }

            var code = fs.readFileSync(file);
            if (!jshint(code.toString(), config)) {
                jshint.errors.forEach(function(err) {
                    if (!err) {
                        return;
                    }
                    report(file, err);
                });
            }
        }
    });

    if (results.length) {
        console.warn(results.length + ' errors found');
        process.exit(1);
    } else {
        console.log('No errors found.');
    }
}

function fiddle() {
    var now = (new Date()).getTime();
    var package_json_path = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(package_json_path)) {
        console.error('No package.json file found.');
        process.exit(1);
    }

    var package_json = fs.readFileSync(package_json_path);
    var package_json_parsed = JSON.parse(package_json.toString());

    // Check that there are deps to extract.
    if (!('commonplaceDependencies' in package_json_parsed)) {
        console.warn('No Commonplace dependencies found in package.json.');
        process.exit(0);
    }

    var projects_target = path.resolve(process.cwd(), 'commonplace_projects');
    if (!fs.existsSync(projects_target)) {
        fs.mkdirSync(projects_target);
    }

    function clone(git_url, name, callback) {
        console.log('Cloning `' + git_url + '`');
        var git_clone = spawn('git', ['clone', git_url, name], {cwd: projects_target});
        git_clone.stderr.pipe(process.stderr);
        git_clone.on('close', function(code) {
            if (code !== 0) {
                console.error('`git clone` of project "' + name + '" failed with non-zero exit code.');
            }
            callback();
        });
    }

    function pull(name, callback) {
        console.log('Updating', name);
        var git_pull = spawn('git', ['pull', '-r', 'origin', 'master'],
                             {cwd: path.resolve(projects_target, name)});
        git_pull.stderr.pipe(process.stderr);
        git_pull.on('close', function(code) {
            if (code !== 0) {
                console.error('`git pull -r` on project "' + name + '" failed with non-zero exit code.');
            }
            callback();
        });
    }

    function run_make_init(name, callback) {
        // Runs make init, which pulls Bower dependencies and runs Gulp stuff.
        var make_init = spawn('make', ['init'],
                              {cwd: path.resolve(projects_target, name)});
        make_init.stderr.pipe(process.stderr);
        make_init.on('close', function(code) {
            if (code !== 0) {
                console.error('`make init` on project "' + name + '" failed with non-zero exit code.');
            }
            callback();
        });
    }

    function run_make_build(name, callback) {
        // Runs make build which builds the project.
        var make_init = spawn('make', ['build'],
                              {cwd: path.resolve(projects_target, name)});
        make_init.stderr.pipe(process.stderr);
        make_init.on('close', function(code) {
            if (code !== 0) {
                console.error('`make build` on project "' + name + '" failed with non-zero exit code.');
            }
            callback();
        });
    }

    function make_symlinks(name, data, callback) {
        if (!data.symlinks) {
            callback();
            return;
        }
        for (var sym_path in data.symlinks) {
            if (!data.symlinks.hasOwnProperty(sym_path)) continue;
            var symlink = data.symlinks[sym_path];
            var sym_destination = path.resolve(process.cwd(), symlink);
            // Don't create link if it already exists.
            if (fs.existsSync(sym_destination)) continue;
            fs.symlinkSync(path.resolve(projects_target, name, sym_path), sym_destination);
        }
        callback();
    }

    var deps = package_json_parsed.commonplaceDependencies;
    var deps_started = 0;
    var spawn = child_process.spawn;
    Object.keys(deps).forEach(function(dep) {
        deps_started++;
        var data = deps[dep];
        var proj_path = path.resolve(projects_target, data.name);
        fs.exists(proj_path, function(exists) {
            var proj_src = info.src_dir(proj_path);
            if (!exists) {
                clone(dep, data.name, callback_update);
            } else {
                pull(data.name, callback_update);
            }

            function callback_update() {
                // Make the symlinks if any are requested.
                make_symlinks(data.name, data, callback_symlink);
            }

            function callback_symlink() {
                // Remove existing compiled files from the project.
                clean(proj_src, callback_clean);
            }

            function callback_clean() {
                // Copy `.dist` files to their destinations.
                run_make_init(data.name, callback_init);
            }

            function callback_init() {
                // Compile the assets for the project.
                run_make_build(data.name, callback_includes);
            }

            function callback_includes() {
                // Complete the update process.
                deps_started--;
                if (!deps_started) {
                    finished();
                }
            }
        });
    });

    function finished() {
        console.log('Finished fiddling.');
        var duration = new Date().getTime() - now;
        console.log('Completed in', Math.round(duration / 10) / 100, 'seconds.');
    }
}

function wrap(func) {
    return function() {
        if (!utils.opts().s) {
            console.log('Commonplace v' + info.version());
        }
        func.apply(this, arguments);
    };
}


module.exports.generate_langpacks = wrap(generate_langpacks);
module.exports.extract_l10n = wrap(extract_l10n);
module.exports.lint = lint;
module.exports.fiddle = wrap(fiddle);

module.exports.config = require('./config');
module.exports.template_optimizer = require('./template_optimizer');
module.exports.deferparser = require('./deferparser');
