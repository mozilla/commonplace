var fs = require('fs');

var nodes = require('../node_modules/nunjucks/src/nodes');
var uglify = require('uglify-js');

function L10nContext() {
    var localizable_strings = [];
    var localizable_string_map = {};

    function LocalString(string) {
        this.str = string;
        this.comment = null;
        this.plural = null;
        this.locations = [];
        this.pushLocation = function(location) {
            while (location.indexOf('../') !== -1) {
                location = location.replace(/\.\.\/[a-zA-Z]+/g, '');
            }
            this.locations.push(location);
        };
        this.escaped = function(str) {
            return JSON.stringify(str || this.str);
        };
        this.toString = function() {
            var out = [];
            if (this.comment) {
                out.push('#. ' + this.comment.replace(/\n/g, '\n#. ').trim());
            }
            out = out.concat([
                '#: ' + this.locations.join('\n#: '),
                'msgid ' + this.escaped()
            ]);
            if (this.plural) {
                out.push('msgid_plural ' + this.escaped(this.plural));
                out.push('msgstr[0] ""');
                out.push('msgstr[1] ""');
            } else {
                out.push('msgstr ""');
            }

            return out.join('\n');
        };

        this.allStrings = function() {
            if (this.plural) {
                return [this.str, this.plural];
            }
            return [this.str];
        };
    }

    function normalize_string(string) {
        string = string.replace(/\n/g, '');
        string = string.replace(/\t/g, ' ');
        string = string.replace(/\s\s+/g, ' ');
        string = string.replace(/^\s+/, '');
        string = string.replace(/\s+$/, '');
        return string;
    }

    function save_singular(normalized, location, comment) {
        comment = comment || null;
        normalized = normalize_string(normalized);
        var ls;
        if (normalized in localizable_string_map) {
            ls = localizable_string_map[normalized];
        } else {
            ls = new LocalString(normalized);
            ls.comment = comment;
            localizable_string_map[normalized] = ls;
            localizable_strings.push(ls);
        }
        ls.locations.push(location);
    }

    function extract_singular(node, filename, comment) {
        if (!node.args.children.length) {
            throw new Error(
                'No string supplied for localization (line ' + node.lineno + ')');
        }
        var string_node = node.args.children[0];
        if (!(string_node instanceof nodes.Literal)) {
            throw new Error(
                'Cannot localize string (line ' + node.lineno + ')');
        }

        save_singular(string_node.value, filename + ':' + node.lineno, comment);
    }

    function save_plural(norm_singular, norm_plural, location, comment) {
        norm_singular = normalize_string(norm_singular);
        norm_plural = normalize_string(norm_plural);
        var ls;
        if (norm_singular in localizable_string_map &&
            localizable_string_map[norm_singular].plural === norm_plural) {
            ls = localizable_string_map[norm_singular];
        } else {
            ls = new LocalString(norm_singular);
            ls.plural = norm_plural;
            ls.comment = comment;
            localizable_string_map[norm_singular] = ls;
            localizable_strings.push(ls);
        }
        ls.locations.push(location);
    }

    function extract_plural(node, filename, comment) {
        if (node.args.children.length < 3) {
            throw new Error(
                'Invalid plural localization. Must have singular, plural, and parameters. (file: ' + filename + 'line: ' + string_node.lineno + ')');
        }
        if (!(node.args.children[0] instanceof nodes.Literal)) {
            throw new Error(
                'Cannot localize singular string (file: ' + filename + 'line: ' + node.lineno + ')');
        }
        if (!(node.args.children[1] instanceof nodes.Literal)) {
            throw new Error(
                'Cannot localize plural string (file: ' + filename + ' line: ' + node.lineno + ')');
        }

        save_plural(node.args.children[0].value,
                    node.args.children[1].value,
                    filename + ':' + node.lineno,
                    comment);
    }

    function find_comments(doc) {

        function getLineNo(index) {
            return doc.substr(0, index).split('\n').length;
        }

        var patterns = [
            /\{#\s*L10n(\(.+\))?:((.|\n)+?)\s*#\}/im,
            /\/\/ L10n(\(.+\))?:(.+)$/im,
            /\/\*\s*L10n(\(.+\))?:((.|\n)+?)\s*\*\//im
        ];

        var comments = [];

        for (var i = 0, p; p = patterns[i++];) {
            var match;
            //console.log('Matching', p);
            var pat_doc = doc;
            while (match = p.exec(pat_doc)) {
                pat_doc = pat_doc.substr(match.index + match[0].length);
                comments.push({
                    line: getLineNo(match.index),
                    paren: match[1],
                    body: match[2]
                });
            }
        }

        comments.sort(function(a, b) {return a.line - b.line;});

        function formatComment(comment) {
            if (comment.paren) {
                return '(' + comment.paren + '): ' + comment.body;
            } else {
                return comment.body;
            }
        }

        return function(line) {
            if (!comments.length) {
                return null;
            }
            if (comments[0].line > line) {
                return null;
            }
            var comment = comments.shift();
            if (!comments.length) {
                return formatComment(comment);
            }
            while (comments.length && comments[0].line <= line) {
                comment = comments.shift();
            }
            return formatComment(comment);
        };
    }

    this.extract_template = function(data, parseTree, filename) {
        var comments = find_comments(data);

        function extract_callextension(tree) {
            var calls = [];
            var defers = tree.findAll(nodes.CallExtension);
            for (var i = 0, e; e = defers[i++];) {
                for (var j = 0, arg; arg = e.contentArgs[j++];) {
                    if (!arg) {
                        continue;
                    }
                    calls = calls.concat(arg.findAll(nodes.FunCall));
                    calls = calls.concat(extract_callextension(arg));
                }
            }
            return calls;
        }

        var calls = parseTree.findAll(nodes.FunCall);
        calls = calls.concat(extract_callextension(parseTree));
        for (var i = 0, node; node = calls[i++];) {
            // Exclude function calls that aren't to gettext.
            var node_name = node.name;
            if (!node_name ||
                !(node_name instanceof nodes.Symbol) ||
                !(node_name.value === '_' || node_name.value === '_plural')) {
                continue;
            }

            var comment = comments(node.lineno);
            switch (node_name.value) {
                case '_':
                    extract_singular(node, filename, comment);
                    break;
                case '_plural':
                    extract_plural(node, filename, comment);
                    break;
            }
        }
    };

    this.extract_js = function(data, filename) {
        var comments = find_comments(data);

        uglify.parse(
            data,
            {filename: filename, toplevel: null}
        ).walk(new uglify.TreeWalker(function(node) {
            if (node instanceof uglify.AST_Call &&
                (node.start.value === 'gettext' || node.start.value === 'ngettext')) {
                var args = node.args;
                var raw_location = node.start.file + ':' + node.start.line;
                var location = '[' + raw_location + ']';

                if (!args.length) {
                    console.error(node.start.value + ' with no arguments ');
                    return;
                }
                if (typeof args[0].value !== 'string') {
                    console.error('Invalid ' + node.start.value + ' call: Not a string ' + location);
                    return;
                }

                var comment = comments(node.start.line);
                if (node.start.value === 'gettext') {
                    save_singular(args[0].value, raw_location, comment);
                } else if (node.start.value === 'ngettext') {
                    if (args.length < 3) {
                        console.error('Invalid ngettext call: not enough parameters ' + location);
                        return;
                    }
                    if (typeof args[1].value !== 'string') {
                        console.error('Invlid ngettext call: plural form not string ' + location);
                        return;
                    }
                    save_plural(args[0].value, args[1].value, raw_location, comment);
                }
            }
        }));
    };

    var stringHash;

    function getHash() {
        if (stringHash)
            return stringHash;
        var values = localizable_strings.reduce(function(a, b) {
            return a.concat(b);
        }, []).sort().join('\n');
        var crypto = require('crypto');
        return stringHash = crypto.createHash('md5').update(values).digest("hex");
    }

    this.hasChanged = function(path) {
        if (!fs.existsSync(path)) return true;
        var previous = fs.readFileSync(path) + '';
        var current = getHash();
        return previous !== current;
    };

    this.saveHash = function(path) {
        fs.writeFile(path, getHash());
        return getHash();
    };

    this.save_po = function(path, callback) {
        var data = [
            '#, fuzzy',
            'msgid ""',
            'msgstr ""',
            '"Project-Id-Version: PACKAGE VERSION\\n"',
            '"Report-Msgid-Bugs-To: \\n"',
            '"POT-Creation-Date: ' + (new Date()).toISOString() + '\\n"',
            '"PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE\\n"',
            '"Last-Translator: FULL NAME <EMAIL@ADDRESS>\\n"',
            '"Language-Team: LANGUAGE <LL@li.org>\\n"',
            '"MIME-Version: 1.0\\n"',
            '"Plural-Forms: nplurals=2; plural=(n != 1);"',
            '"Content-Type: text/plain; charset=utf-8\\n"',
            '"Content-Transfer-Encoding: 8bit\\n"',
            '"X-Generator: Fireplace L10n Tools 1.0\\n"',
            '',
            ''
        ].join('\n') + localizable_strings.join('\n\n');
        fs.writeFile(path, data, callback);
    };

    this.string_count = function() {
        return localizable_strings.length;
    };

}

module.exports.L10nContext = L10nContext;
