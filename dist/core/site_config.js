/*
    Get Zamboni site configuration data, including waffle switches and FXA
    info.
*/
define('site_config', ['defer', 'requests', 'settings', 'underscore', 'urls',
       'z'],
    function(defer, requests, settings, _, urls, z) {

    function fetch() {
        var def = defer.Deferred();

        // Try looking in the body for data-settings and data-waffle-switches.
        // They are set by zamboni on the index.html it serves, and if they are
        // present, we can avoid making the API call entirely.
        var body_settings = z.body.data('settings');
        var body_waffle_switches = z.body.data('waffle-switches');
        if (body_settings &&
            body_settings.fxa_auth_url &&
            body_settings.fxa_auth_state &&
            _.isArray(body_waffle_switches)) {
            settings.fxa_auth_url = body_settings.fxa_auth_url;
            settings.fxa_auth_state = body_settings.fxa_auth_state;
            settings.switches = body_waffle_switches;
            return def.resolve().promise();
        }

        requests.get(urls.api.unsigned.url('site-config')).done(function(data) {
            if (data.hasOwnProperty('fxa')) {
                settings.fxa_auth_url = data.fxa.fxa_auth_url;
                settings.fxa_auth_state = data.fxa.fxa_auth_state;
            }
            if (data.waffle.switches && _.isArray(data.waffle.switches)) {
                settings.switches = data.waffle.switches;
            }
            def.resolve(data);
        }).always(function() {
            def.resolve();
        });

        return def.promise();
    }

    return {
        'fetch': fetch,
        'promise': fetch(),
    };
});
