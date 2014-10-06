var commonplace = require('commonplace');
var nunjucks = require('nunjucks');
var through = require('through2');


var compiler = nunjucks.compiler;
var parser = nunjucks.parser;
var optimizer = commonplace.template_optimizer;
var extensions = commonplace.deferparser.extensions || [];


function transform(file) {
    var name = file.history[0].split('/').pop().replace('.html', '');
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
            'throw new Error("' + name + ' failed to compile. Check the damper for details.");',
            '}}'
        ].join('\n');
        console.error(e);
    }
    output += '})();\n';
    return output;
}


function nunjucksBuild(file, cb) {
    return through.obj(function(file, enc, cb) {
        file.contents = new Buffer(transform(file));
        this.push(file);
        return cb();
    })
}

module.exports = nunjucksBuild;
