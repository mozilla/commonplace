/*
   init.js is appending to our minified bundles in the CP build process.
   Pulls in the settings.js module once it is available.
   Looks for settings.init_module which points to the module name of our
   main/initialization module.
   Invokes the main/initialization module once it is available to kick things
   off.
*/
require(['settings'], function(settings) {
    require([settings.init_module], function(init_module) {});
});
