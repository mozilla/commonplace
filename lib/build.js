var path = require('path');


function fix_urls(img_urls, css_dir, src_dir, url_pattern, data) {
    var has_origin = false;

    return data.replace(url_pattern, function(match, url, offset, string) {
        url = url.replace(/"|'/g, '');
        has_origin = false;

        if (url.substring(0, 5) === 'data:') {
            return 'url(' + url + ')';
        }

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
                // If there was a hash, move it to the end of the URL
                // after the `?timestamp`.
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
                var absolute_path = path.join(css_dir, url);
                // Record the absolute URL, starting with `/media/`.
                img_urls.push('/' + path.relative(src_dir, absolute_path));
            }
        }

        return 'url(' + url + ')';
    });
}
