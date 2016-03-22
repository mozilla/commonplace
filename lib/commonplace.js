var fs = require('fs');
var path = require('path');

var utils = require('./utils');


var srcDir = function(cwd) {
    cwd = cwd || process.cwd();
    return path.resolve(cwd, 'src');
};


function generate_i18njs() {
    var process_file = require('./generate_i18njs').process_file;
    var src_dir = srcDir();

    var i18njs_path = path.resolve(src_dir, 'media', 'locales');

    if (!fs.existsSync(i18njs_path)) {
        console.log('Translation files do not exist. Creating: ' + i18njs_path);
        fs.mkdirSync(i18njs_path);
    }

    var count = 0;
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
        process_file(filepath, locale, path.resolve(i18njs_path, locale + '.js'));
        count++;
    }, function() {
        console.log('Finished generating ' + count + ' translation files.');
    });
}

function extract_l10n() {
    var context = new (require('./extract_l10n').L10nContext)();
    var src_dir = srcDir();

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


module.exports.generate_i18njs = generate_i18njs;
module.exports.extract_l10n = extract_l10n;

module.exports.config = require('./config');
module.exports.template_optimizer = require('./template_optimizer');
module.exports.deferparser = require('./deferparser');
