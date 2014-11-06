define('polyfill', [], function() {
    // polyfill window.location.origin only available in FF21+
    var loc = window.location;
    if (!loc.origin) {
        loc.origin = loc.protocol + '//' + loc.host;
    }
});
