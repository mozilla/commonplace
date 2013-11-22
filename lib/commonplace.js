var fs = require('fs');
var path = require('path');

var info = require('./info');
var utils = require('./utils');

var check_version = info.check_version;


function install() {
    var commonplace_src = path.resolve(__dirname, '../src');
    var local_src = path.resolve(process.cwd(), info.src_dir());
    console.log('Installing Commonplace...');
    console.log('Source:       ' + commonplace_src);
    console.log('Destination:  ' + local_src);

    check_version(
        local_src,
        function() {  // Same
            console.warn('Existing commonplace installation found. Overwriting.');
        },
        function() {  // Different
            console.error('Commonplace installation already exists from different version.');
            console.error('You must delete or update the existing installation.');
            console.error('Installation aborted.');
            process.exit(1);
        }
    );

    // Copy everything and do distributed file init on completion.
    var files_copied = utils.copyDir(commonplace_src, local_src, init);
    console.log('Copied ' + files_copied + ' files.');

    // Write a Commonplace manifest.
    fs.writeFile(
        path.resolve(local_src, '.commonplace'),
        JSON.stringify({version: info.version()}),
        function(err) {
            if (err) {console.error('Error creating Commonplace manifest.', err);}
        }
    );

    // --gitignore will copy a gitignore in for you. How nice!
    if (utils.opts().gitignore) {
        var src_gitignore = path.resolve(__dirname, 'assets/gitignore');
        var dest_gitignore = path.resolve(local_src, '../.gitignore');
        fs.exists(dest_gitignore, function(exists) {
            if (exists) {
                console.error('.gitignore already exists!');
                console.log("If you'd like to overwrite your gitignore, run the following command:");
                console.log('cat ' + src_gitignore + ' > ' + dest_gitignore);
                return;
            }
            utils.copyFile(
                src_gitignore,
                dest_gitignore,
                function(err) {
                    if (err) {
                        console.warn('Error initializing ' + file, err);
                        return;
                    }
                    console.log('.gitignore added to project.');
                }
            );
        });
    }

}

function init(local_src) {
    local_src = path.resolve(process.cwd(), info.src_dir());
    console.log('Initializing distributable files...');
    utils.globEach(local_src, '.dist', function(file) {
        var non_dist = file.substr(0, file.length - 5);
        if (fs.existsSync(non_dist)) {
            console.warn('Distributable file exists: ' + non_dist);
            return;
        }
        utils.copyFile(file, non_dist, function(err) {
            if (err) {
                console.warn('Error initializing ' + file, err);
            }
        });
    }, function(err) {
        console.log('Done.');
    });
}

function update() {
    var opts = utils.opts(process.argv.slice(2));

    if (opts.npm) {
        var spawn = require('child_process').spawn;
        console.log('Starting `npm update`...');
        var npm_update = spawn('npm', ['update', '-g', 'commonplace']);

        function writer(stream) {
            var new_line = true;
            return function(data) {
                if (data[0] == '\n') {
                    new_line = true;
                }
                if (new_line) {
                    process.stdout.write('[npm] ');
                    new_line = false;
                }
                process.stdout.write(data);
                if (data[data.length - 1] == '\n') {
                    new_line = true;
                }
            };
        }

        npm_update.stdout.on('data', writer(process.stdout));
        npm_update.stderr.on('data', writer(process.stderr));

        npm_update.on('close', function(code) {
            if (code !== 0) {
                console.error('`npm update` failed with non-zero exit code');
                return;
            }
            console.log('`npm update` complete.');

            console.log('Bootstrapping commonplace update...');

            var updater = spawn('commonplace', ['update']);
            updater.stdout.on('data', process.stdout.write);
            updater.stderr.on('data', process.stderr.write);

            updater.on('close', function(code) {
                if (code) {
                    console.error('Error updating commonplace');
                } else {
                    console.log('Bootstrapped commonplace update successful!');
                }
            });
        });

        return;
    }

    var commonplace_src = path.resolve(__dirname, '../src');
    var local_src = path.resolve(process.cwd(), info.src_dir());

    check_version(
        local_src,
        function() {  // Same
            console.warn('Commonplace installation up-to-date.');
            process.exit();
        },
        function(local_version, current_version) {  // Different
            console.log('Updating from ' + local_version + ' to ' + current_version);
        },
        function() {  // Neither
            console.error('No commonplace installation found.');
            process.exit(1);
        }
    );

    var ignores = (info.manifest(local_src) || {}).ignore || [];

    function update_file(file) {
        var base_path = file.replace(commonplace_src, '').substr(1);
        if (ignores.indexOf(base_path) !== -1) {
            console.warn('Not updating file (ignored): ' + base_path);
            return;
        }
        var destination = file.replace(commonplace_src, local_src);
        utils.copyFile(file, destination, function(err) {
            if (err) {
                console.error('Error updating ' + destination)
                console.error(err);
            }
        });
    }

    var extensions = ['.js', '.dist', '.woff', '.svg'];

    function update_type() {
        if (!extensions.length) {
            return update_resources();
        }

        var ext = extensions.pop();
        console.log('Updating ' + ext + ' files.');
        utils.globEach(commonplace_src, ext, update_file, update_type);
    }

    function update_resources() {
        var manifest = path.resolve(local_src, '.commonplace');
        fs.readFile(manifest, function(err, data) {
            if (err) {
                console.error('Error reading Commonplace manifest: ' + manifest, err);
                return;
            }

            var manifest_data = JSON.parse(data);
            manifest_data.version = info.version();
            fs.writeFile(manifest, JSON.stringify(manifest_data), function() {
                if (err) {
                    console.error('Error updating Commonplace manifest.', err);
                    return;
                }
                console.log('Update complete!');
            });
        });
    }

    update_type();

}

function ignore() {
    var src_dir = info.src_dir();

    check_version(src_dir, undefined, undefined, function() {
        console.error('No Commonplace installation found.');
        process.exit(1);
    });

    var manifest = info.manifest(src_dir) || {};
    var ignores = manifest.ignore || [];
    var params = process.argv.slice(3);
    manifest.ignore = ignores.concat(params.map(function(ignore) {
        ignore = path.normalize(ignore);
        var abs_path = path.join(src_dir, ignore);
        // If they're in the root, that path might not be valid.
        if (!fs.existsSync(abs_path)) {
            // /opt/foo/src/src/media/myfile.js -> /opt/fo/src/media/myfile.js
            // This happens if you're in the root of your project and use
            // completion from the shell:
            // >>> commonplace ignore src/media/js/foo.js
            // src_dir + "src/media/js/x.js" === ".../src/src/media/js/x.js"
            abs_path = path.join(src_dir, '../', ignore);  // join normalizes.
            // FIXME: Sorry Windows users...path doesn't expose separator.
            ignore = ignore.split('/').slice(1).join('/');
        }
        if (!fs.existsSync(abs_path)) {
            // Oh well, give up.
            console.error('Could not find "' + abs_path + '" in project.');
            process.exit(1);
        }
        if (ignores.indexOf(ignore) !== -1) {
            console.warn('"' + ignore + '" already ignored.');
            return;
        }
        return ignore;
    }).filter(function (x) {return !!x;}));

    fs.writeFile(
        path.resolve(src_dir, '.commonplace'),
        JSON.stringify(manifest),
        function(err) {
            if (err) {
                console.error('Could not save Commonplace manifest.', err);
            }
        }
    );
}

function clean() {
    var src_dir = info.src_dir();

    check_version(src_dir, undefined, undefined, function() {
        console.error('No Commonplace installation found.');
        process.exit(1);
    });

    var targets = [
        '_tmp',
        'src/templates.js',
        'src/media/css/include.css',
        'src/media/js/include.js',
        'src/media/locales/',
        'src/locales/'
    ];
    targets.forEach(function(filePath) {
        filePath = path.resolve(src_dir, filePath);
        fs.stat(filePath, function(err, data) {
            if (err) return;

            if (data && data.isDirectory()) {
                utils.rmdirRecursive(filePath);
            } else {
                utils.removeFile(filePath);
            }
        });
    });

    var css_dir = path.resolve(src_dir, 'media/css/');
    fs.exists(css_dir, function(exists) {
        if (!exists) {
            console.warn('CSS directory does not exist.');
            return;
        }
        utils.globEach(css_dir, '.styl.css', function(filepath) {
            utils.removeFile(filepath, null);
        });
    });
}

function generate_langpacks() {
    var process_file = require('./generate_langpacks').process_file;
    var src_dir = info.src_dir();

    check_version(src_dir, undefined, undefined, function() {
        console.error('No Commonplace installation found.');
        process.exit(1);
    });

    var langpacks_path = path.resolve(src_dir, 'media/locales/');

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

    utils.glob(path.resolve(src_dir, 'media/js'), '.js', function(err, list) {
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

function compile(options) {
    var src_dir = info.src_dir();

    if (!options || !options.silent) {
        check_version(src_dir, undefined, function() {
            console.warn('Found different commonplace version.');
            console.warn('Generated includes may not work as expected.');
        }, function() {
            console.error('No Commonplace installation found.');
            process.exit(1);
        });
    }

    var build = require('./build.js');

    var todo = (options && options.only) || ['stylus', 'nunjucks'];
    var remaining = todo.length;
    todo.forEach(function(v) {
        switch (v) {
            case 'stylus':
                utils.globEach(src_dir, '.styl', function(file) {
                    // For every stylus file, increase the pending operation count.
                    // That way, the callback won't fire until everything is done.
                    remaining++;
                    build.stylus(file, function(err, css) {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        fs.writeFile(file + '.css', css, function(err) {
                            if (err) {
                                console.error('Error writing CSS file: ' + file + '.css');
                                console.error(err);
                                return;
                            }

                            remaining--;
                            if (!remaining && options && options.callback) options.callback();
                        });
                    });
                }, function() {
                    remaining--;
                    if (!remaining && options && options.callback) options.callback();
                });
                break;
            case 'nunjucks':
                build.html(src_dir, function(data) {
                    fs.writeFile(path.resolve(src_dir, 'templates.js'), data, function(err) {
                        if (err) {
                            console.error('Error writing templates file.', err);
                            return;
                        }
                        remaining--;
                        if (!remaining && options && options.callback) options.callback();
                    });
                });
        }
    });

}

function build_includes() {
    var raw = utils.opts().raw;

    var src_dir = info.src_dir();
    check_version(src_dir, undefined, function() {
        console.warn('Found different commonplace version.');
        console.warn('Generated includes may not work as expected.');
    }, function() {
        console.error('No Commonplace installation found.');
        process.exit(1);
    });

    var build = require('./build.js');
    fs.readFile(
        path.resolve(__dirname, 'assets/amd.js'),
        function(err, amd_data) {
            if (err) {
                console.warn('Error reading `amd.js`.', err);
                return;
            }
            build.js(src_dir, function(data) {
                // You need a function here, trust me. replace() is dumb and freaks out on dollar signs.
                data = amd_data.toString().replace(/'replace me'/, function() {return data;});
                if (!raw) {
                    try {
                        data = require('uglify-js').minify(
                            data, {screw_ie8: true, fromString: true}
                        ).code;
                    } catch(e) {
                        console.error('Error during minification.', e);
                    }
                }
                var include_js = path.resolve(src_dir, 'media/js/include.js');
                fs.writeFile(include_js, data, function(err) {
                    if (err) {
                        console.error('Error writing `include.js` to disk.');
                        return;
                    }
                    console.log('Created ' + include_js);
                });
            });
        }
    );

    build.css(src_dir, function(data) {
        if (!raw) {
            data = require('clean-css').process(data);
        }
        var include_css = path.resolve(src_dir, 'media/css/include.css');
        fs.writeFile(include_css, data, function(err) {
            if (err) {
                console.error('Error writing `include.css` to disk.');
                return;
            }
            console.log('Created ' + include_css);
        });
    });
}

function wrap(func) {
    return function() {
        if (!utils.opts().s) {
            console.log('Commonplace v' + info.version());
        }
        func.apply(this, arguments);
    };
}

module.exports.install = wrap(install);
module.exports.init = wrap(init);
module.exports.update = wrap(update);
module.exports.ignore = wrap(ignore);
module.exports.clean = wrap(clean);
module.exports.generate_langpacks = wrap(generate_langpacks);
module.exports.extract_l10n = wrap(extract_l10n);
module.exports.compile = wrap(compile);
module.exports.build_includes = wrap(build_includes);
