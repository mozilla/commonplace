define('polyfill', [], function() {
    // polyfill window.location.origin only available in FF21+
    if (!window.location.origin) {
        window.location.origin = window.location.protocol + '//' +
            window.location.hostname +
            (window.location.port ? ':' + window.location.port: '');
    }
});
