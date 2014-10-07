/*
    Takes a CSS file, parses it, and returns a \n-separated list of img URLs,
    which is later used for building the appcache in Zamboni.
*/
var path = require('path');
var through = require('through2');

var config = require('../../../../../config');

var url_pattern = /url\(([^)]+\?\d+)\)/g;  // Cachebusted imgurl.
var img_urls = [];  // Keep track of duplicates.


function transform(file) {
    // Parses CSS file and turns it into a \n-separated img URLs.
    var data = file.contents.toString('utf-8');

    var matches = [];
    var match;
    while ((match = url_pattern.exec(data)) !== null) {
        var url = match[1];

        // Ensure it is an absolute URL (no relative URLs).
        var has_origin = url.search(/(https?):|\/\//) === 0 || url[0] === '/';
        if (!has_origin) {
            var absolute_path = path.join(config.CSS_DEST_PATH, url);
            url = '/' + path.relative('src', absolute_path);
        }

        if (img_urls.indexOf(url) === -1) {
            matches.push(url);
            img_urls.push(url);
        }
    }

    return matches.join('\n');
}


function imgurlsParse(file, cb) {
    // Transform stream.
    return through.obj(function(file, enc, cb) {
        file.contents = new Buffer(transform(file));
        this.push(file);
        return cb();
    });
}


module.exports = imgurlsParse;
