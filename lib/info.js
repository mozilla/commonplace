var fs = require('fs');
var path = require('path');

module.exports.src_dir = function() {
    var cwd = process.cwd();
    var temp;
    if (fs.existsSync(temp = path.resolve(cwd, 'hearth'))) {
        return temp;
    } else {
        return path.resolve(cwd, 'src');
    }
};

var version_ = module.exports.version = function() {
    var package_json = path.resolve(__dirname, '../package.json');
    return JSON.parse(fs.readFileSync(package_json)).version;
};

module.exports.check_version = function(src_dir, same, different, neither) {
    var existing_manifest = path.resolve(src_dir, '.commonplace');
    if (fs.existsSync(existing_manifest)) {
        var version = JSON.parse(fs.readFileSync(existing_manifest)).version;
        var current_version = version_();
        if (version !== current_version && different) {
            different(version, current_version);
        } else if (version === current_version && same) {
            same(version, current_version);
        }
    } else if (neither) {
        neither();
    }
}
