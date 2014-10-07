/*
    Takes a stream of Vinyl files (Nunjucks templates) and compiles them.
    Does not handle concatenation or prepending/appending of necessary code.
    Returns compiled code which adds templates to a JS object called
    'templates' keyed under the template names.
*/
var commonplace = require('commonplace');
var nunjucks = require('nunjucks');
var through = require('through2');


var compiler = nunjucks.compiler;
var parser = nunjucks.parser;
var optimizer = commonplace.template_optimizer;
var extensions = commonplace.deferparser.extensions || [];


function transform(file) {
    // Takes a template file (as a buffer) and compiles it with Nunjucks, which
    // is monkeypatched and optimized by Commonplace.
    var name = file.history[0].split('templates/')[1];
    var output = 'templates[' + JSON.stringify(name) + '] = (function() {';

    var src = file.contents.toString('utf-8');
    var cinst = new compiler.Compiler(extensions);

    try {
        // Parse
        var parsed = parser.parse(src, extensions);
        var optimized = optimizer.optimize(parsed);
        // Compile
        optimizer.monkeypatch(cinst);
        cinst.compile(parsed);
        // Output
        output += cinst.getCode();
    } catch(e) {
        output += [
            'return {root: function() {',
            'throw new Error("' + name + ' failed to compile. Check the ',
            'server for details.");',
            '}}'
        ].join('\n');
        console.error(e);
    }
    output += '})();\n';
    return output;
}


function nunjucksBuild(file, cb) {
    // Transform stream.
    return through.obj(function(file, enc, cb) {
        file.contents = new Buffer(transform(file));
        this.push(file);
        return cb();
    });
}


module.exports = nunjucksBuild;
