var fs = require('fs');
var path = require('path');

var utils = require('./utils.js');

var blacklist = [
    'require.js',
    'settings_inferno.js',
    'settings_local.js',
    'settings_travis.js',

    'splash.styl.css',
    'templates.js',  // Generated dynamically.
    'include.js',
    'include.css',
];

function concatJS(src_dir, callback) {
    var output = '';
    // Render the HTML for the templates.
    compileHTML(src_dir, function(html_data) {
        output += html_data;

        // Now include the rest of the JS.
        utils.globEach(
            path.resolve(src_dir, 'media/js'),
            '.js',
            function(file) {
                if (blacklist.indexOf(path.basename(file)) !== -1) return;
                output += fs.readFileSync(file) + '\n';
            }, function() {
                callback(output);
            }
        );
    });
}

function compileStylus(source_path, callback) {
    var stylus = require('stylus');
    fs.readFile(source_path, function(err, data) {
        if (err) {
            console.error('Could not read stylus file: ' + source_path);
            callback(err);
            return;
        }

        stylus(data.toString())
            .set('filename', source_path + '.css')
            .set('include css', true)
            .include(path.dirname(source_path))
            .render(function(err, css) {
                if (err) {
                    console.error('Error compiling stylus file: ' + source_path);
                    callback(err);
                    return;
                }
                callback(null, css);
            });
    });
}

function concatCSS(src_dir, callback) {
    var css_pattern = /href="(\/media\/css\/.+\.styl\.css)"/g;
    var url_pattern = /url\(([^)]+)\)/g;

    var css_urls = [];
    var css_dir = path.resolve(src_dir, 'media/css');
    var cssurls_fn = path.resolve(src_dir, 'media/cssurls.txt');
    var has_origin = false;

    function fix_urls(data) {
        return data.replace(url_pattern, function(match, url, offset, string) {
            url = url.replace(/"|'/g, '');
            has_origin = false;

            if (url.substring(0, 5) === 'data:') {
                return 'url(' + url + ')';
            }

            if (url.search(/(https?):|\/\//) === 0) {
                // Do not cachebust https, http, and // urls.
                has_origin = true;
            } else {
                if (url[0] === '/') {
                    has_origin = true;
                }
                url += '?' + new Date().getTime();
            }

            if (css_urls.indexOf(url) === -1) {
                if (has_origin) {
                    css_urls.push(url);
                } else {
                    // Filename started with `../` or is a relative path.
                    var absolute_path = path.join(css_dir, url);
                    // Record the absolute URL, starting with `/media/`.
                    css_urls.push('/' + path.relative(src_dir, absolute_path));
                }
            }

            return 'url(' + url + ')';
        });
    }

    var index_html = fs.readFile(path.resolve(src_dir, 'index.html'), function(err, data) {
        if (err) {
            console.error('Could not read `index.html`.', err);
            return;
        }
        var match;
        var files = [];
        data = data.toString();
        while (match = css_pattern.exec(data)) {
            if (blacklist.indexOf(path.basename(match[1])) === -1) {
                files.push(path.resolve(src_dir + match[1]));
            }
        }

        var output = [];
        var remaining = files.length;
        files.forEach(function(v, index) {
            v = v.replace('.styl.css', '.styl');
            compileStylus(v, function(err, data) {
                if (err) {
                    console.warn(err);
                } else {
                    output[index] = fix_urls(data + '\n');
                }
                remaining--;
                if (!remaining) {
                    fs.writeFile(cssurls_fn, css_urls.join('\n') + '\n', function(err) {
                        if (err) {
                            console.error('Error writing `cssurls.txt` to disk.');
                            return;
                        }
                        console.log('Created ' + cssurls_fn);
                    });
                    callback(output.join('\n'));
                }
            });
        });
    });
}

function compileHTML(src_dir, callback) {
    var compiler = require('nunjucks').compiler;
    var parser = require('nunjucks').parser;

    var extensions = require('./deferparser').extensions || [];

    var template_dir = path.resolve(src_dir, 'templates');
    if (template_dir.substr(-1) !== '/') {
        template_dir += '/';
    }

    var template_data = [];
    utils.globEach(template_dir, '.html', function(template) {
        var name = template.replace(template_dir, '');
        var output = 'templates[' + JSON.stringify(name) + '] = (function() {';
        try {
            var src = fs.readFileSync(template, 'utf-8');
            var cinst = new compiler.Compiler(extensions);
            // Parse
            var parsed = parser.parse(src, extensions);
            // Compile
            cinst.compile(parsed);
            // Output
            output += cinst.getCode();
        } catch(e) {
            output += [
                'return {root: function() {',
                'throw new Error("' + name + ' failed to compile. Check the damper for details.");',
                '}}'
            ].join('\n');

            console.error(e);
        }

        template_data.push(output + '})();\n');
    }, function() {
        callback(
            '(function() {' +
            'var templates = {};\n' +
            template_data.join('\n') +
            'define("templates", ["nunjucks", "helpers"], function(nunjucks) {\n' +
            '    nunjucks.env = new nunjucks.Environment([], {autoescape: true});\n' +
            '    nunjucks.env.cache = nunjucks.templates = templates;\n' +
            '    console.log("Templates loaded");\n' +
            '    return nunjucks;\n' +
            '});\n' +
            '})();'
        );
    });
}

module.exports.js = concatJS;
module.exports.stylus = compileStylus;
module.exports.css = concatCSS;
module.exports.html = compileHTML;
