var fs = require('fs');
var path = require('path');

module.exports.src_dir = function(cwd) {
    cwd = cwd || process.cwd();
    return path.resolve(cwd, 'src');
};

// Return's the contents of the app's commonplace manifest.
var manifest_ = module.exports.manifest = function(src_dir) {
    var existing_manifest = path.resolve(src_dir, '.commonplace');
    if (fs.existsSync(existing_manifest)) {
        return JSON.parse(fs.readFileSync(existing_manifest));
    } else {
        return null;
    }
};

var commonplace_manifest = module.exports.commonplace_manifest = function() {
    var package_json = path.resolve(__dirname, '..', 'package.json');
    return JSON.parse(fs.readFileSync(package_json));
};

// Returns the current commonplace installation's version.
var version_ = module.exports.version = function() {
    return commonplace_manifest().version;
};

module.exports.check_version = function(src_dir, same, different, neither) {
    var manifest_data = manifest_(src_dir);
    if (manifest_data) {
        var version = manifest_data.version;
        var current_version = version_();
        if (version !== current_version && different) {
            different(version, current_version);
        } else if (version === current_version && same) {
            same(version, current_version);
        }
    } else if (neither) {
        neither();
    }
};
