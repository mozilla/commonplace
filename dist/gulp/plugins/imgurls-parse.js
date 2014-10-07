/*
    Takes a stream of Vinyl files (CSS files), and returns cachebusted img URLs.
    Which are used for building the appcache.
*/
var path = require('path');
var through = require('through2');

var config = require('../../../../../config');

var url_pattern = /url\(([^)]+)\)/g;
var img_urls = [];


function transform(file) {
    // Parses CSS file and turns it into a \n-separated img URLs.
    var data = file.contents.toString('utf-8');

    return data.replace(url_pattern, function(match, url, offset, string) {
        url = url.replace(/"|'/g, '');

        if (url.substring(0, 5) === 'data:') {
            return 'url(' + url + ')';
        }

        var has_origin = false;
        if (url.search(/(https?):|\/\//) === 0) {
            // Do not cachebust `https:`, `http:`, and `//` URLs.
            has_origin = true;
        } else {
            if (url[0] === '/') {
                has_origin = true;
            }

            var timestamp = new Date().getTime();

            var chunks = url.split('#');
            if (chunks[1]) {
                // If there was a hash, move it to the end of the URL after
                // the `?timestamp`.
                url = chunks[0] + '?' + timestamp + '#' + chunks[1];
            } else {
                url += '?' + timestamp;
            }
        }

        if (img_urls.indexOf(url) === -1) {
            if (has_origin) {
                img_urls.push(url);
            } else {
                // Filename started with `../` or is a relative path.
                var absolute_path = path.join(config.CSS_DEST_PATH, url);
                // Record the absolute URL, starting with `/media/`.
                img_urls.push('/' + path.relative('src', absolute_path));
            }
        }

        return 'url(' + url + ')';
    });
}


function imgurlsParse(file, cb) {
    // Transform stream.
    return through.obj(function(file, enc, cb) {
        file.contents = new Buffer(transform(file));
        this.push(file);
        return cb();
    });
}


module.exports = {
    img_urls: img_urls,
    imgurlsParse: imgurlsParse
};
