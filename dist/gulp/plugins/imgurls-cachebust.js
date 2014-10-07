/*
    Takes a stream of Vinyl files (CSS files) and add cachebusts strings to
    img URLs.
*/
var through = require('through2');

var url_pattern = /url\(([^)]+)\)/g;


function transform(file) {
    // Parses CSS file and appends cachebust timestamp to img URLs.
    var data = file.contents.toString('utf-8');

    return data.replace(url_pattern, function(match, url, offset, string) {
        url = url.replace(/"|'/g, '');

        if (url.substring(0, 5) === 'data:') {
            return 'url(' + url + ')';
        }

        if (url.search(/(https?):|\/\//) !== 0) {
            // Do not cachebust `https:`, `http:`, and `//` URLs.
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

        return 'url(' + url + ')';
    });
}


function imgurlsCachebust(file, cb) {
    // Transform stream.
    return through.obj(function(file, enc, cb) {
        file.contents = new Buffer(transform(file));
        this.push(file);
        return cb();
    });
}


module.exports = imgurlsCachebust;
