/*
    Parses .po file, outputting a JS langpack.

    Will output {'My String': 'El String'} for simple non-plural localizations.

    Will output {'Result': ['El Resulto', 'Los Resultos']} for plural
    localizations, where the first index is the singular localized string
    and the second index is the plural localized string.

    Will not output strings that don't contain a localization. The l10n
    library should simply output the ID in that case.

    Will not output strings where the localization is equivalent to the ID.
*/
var fs = require('fs');
var util = require('util');
var _ = require('lodash');

var S_ID = 'msgid ';
var S_STR = 'msgstr ';
var S_PLURAL = 'msgid_plural ';
var S_PLURAL_STR = 'msgstr[';
var RE_PLURAL = /^msgstr\[([0-9]+)\] (\".*\")/;
var RE_PLURALIZER = /^Plural\-Forms: nplurals=[0-9]+; plural=(.+?);/;


if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}


function parse(po_content) {
    var output = {};
    var pluralizer = '0';

    var state = null;

    var id = null;
    var pluralId = null;
    var last = null;
    var last_plural = null;
    var currentLocalizedResult = '';

    function store_current() {
        if (id) {
            var hasResult = !!currentLocalizedResult;
            var hasResultPlural = currentLocalizedResult.constructor === String ||
                                  _.filter(currentLocalizedResult).length > 0;

            // Don't set strings that are identical to their keys.
            var notIdentical = id !== currentLocalizedResult;
            var notIdenticalPlural = currentLocalizedResult.constructor === String ||
                                     currentLocalizedResult.length > 2 ||
                                     currentLocalizedResult[0] !== id &&
                                     currentLocalizedResult[1] !== pluralId;

            if (currentLocalizedResult.constructor === Array &&
                currentLocalizedResult.length === 1) {
                currentLocalizedResult = currentLocalizedResult[0];
            }

            if (hasResult && hasResultPlural && notIdentical &&
                notIdenticalPlural) {
                // Set the string in our langpack if all conditions pass.
                output[id] = currentLocalizedResult;
            }
        } else {
            // If there's no IDs, it's probably the headers. If there's a
            // pluralizer up there, use it.
            var parsed_headers = currentLocalizedResult.split('\n');
            parsed_headers.forEach(function(v) {
                var plex_match = RE_PLURALIZER.exec(v);
                if (!plex_match) return;
                pluralizer = plex_match[1];
            });
        }
        id = '';
        currentLocalizedResult = null;
    }

    function got_id(new_id) {
        if (new_id === '') {
            id = '';
            return;
        }
        id += new_id;
    }

    for (var i = 0; i < po_content.length; i++) {
        var line = po_content[i];

        if (!line.length || line[0] === '#') {
            continue;
        }

        if (line.startsWith(S_ID)) {
            // console.log('...Storing existing id: ', id);
            store_current();

            var new_id = JSON.parse(line.substr(S_ID.length));
            got_id(new_id);
            last = 'id';
            continue;
        }
        if (line.startsWith(S_PLURAL_STR)) {
            // pl_match[0] is the index (0 for singular, 1 for plural).
            // pl_match[2] is the matched string.
            var pl_match = RE_PLURAL.exec(line);
            currentLocalizedResult = currentLocalizedResult || [];
            currentLocalizedResult.push(JSON.parse(pl_match[2]));
            last = 'plurals';
            last_plural = pl_match[1];
            continue;
        }
        if (line.startsWith(S_STR)) {
            last = 'body';
            var body = JSON.parse(line.substr(S_STR.length));
            // console.log(' > Storing body: ', body);
            currentLocalizedResult = body;
            continue;
        }
        if (line.startsWith(S_PLURAL)) {
            last = 'plural';
            pluralId = JSON.parse(line.substr(S_PLURAL.length));
            currentLocalizedResult = currentLocalizedResult || [];
            continue;
        }

        var line_val = JSON.parse(line);
        if (last === 'plurals') {
            // console.log(' >> Appending plural: ', line_val);
            currentLocalizedResult.plurals.push(line_val);
        } else if (last === 'id') {
            // console.log(' >> Last was ID');
            got_id(line_val);
        } else {
            // console.log(' >> (' + last + ':' + id + ') Appending : ', line_val);
            currentLocalizedResult += line_val;
        }
    }

    store_current();

    return {
        output: output,
        pluralizer: pluralizer
    };
}

function gen_pack(data, lang) {
    var parsed = parse(String(data).split('\n'));

    return [
    '(function() {',
    'if (!navigator.l10n) {navigator.l10n = {};}',
    'navigator.l10n.language = "' + lang + '";',
    'navigator.l10n.strings = ' + JSON.stringify(parsed.output) + ';',
    'navigator.l10n.pluralize = function(n) {',
    '  return ' + parsed.pluralizer + ';',
    '};',
    '})();',
    ].join('\n');
}

function process_file(path, lang, dest_path, callback) {
    var data = fs.readFileSync(path);
    fs.readFile(path, function(err, data) {
        if (err) {
            console.error('Unable to read language pack: ' + path, err);
            return;
        }

        var compiled = gen_pack(data, lang);
        if (dest_path) {
            fs.writeFile(dest_path, compiled, function(err) {
                if (err) {
                    console.error('Unable to write language pack to: ' + dest_path, err);
                }
                if (callback) {
                    callback(err);
                }
            });
        } else {
            callback(null, compiled);
        }
    });
}

module.exports.process_file = process_file;
