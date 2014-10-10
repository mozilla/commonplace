/*
    Takes a stream of Vinyl files (CSS files) and replaces relative image paths
    with absolute ones.
*/
var through = require('through2');
var path = require('path');

var config = require('../../../../../config');

var url_pattern = /url\(([^)]+)\)/g;


function transform(file) {
    // Parses CSS file and replaces relative paths with absolute ones.
    var data = file.contents.toString('utf-8');

    return data.replace(url_pattern, function(match, url) {
        url = url.replace(/"|'/g, '');

        // Ensure it is an absolute URL (no relative URLs).
        var has_origin = url.search(/(https?):|\/\//) === 0 || url[0] === '/';
        if (!has_origin) {
            var absolute_path = path.join(config.CSS_DEST_PATH, url);
            url = '/' + path.relative('src', absolute_path);
        }

        return 'url(' + url + ')';
    });
}


function imgurlsAbsolutify(file, cb) {
    // Transform stream.
    return through.obj(function(file, enc, cb) {
        file.contents = new Buffer(transform(file));
        this.push(file);
        return cb();
    });
}


module.exports = imgurlsAbsolutify;
