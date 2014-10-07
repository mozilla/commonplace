var fs = require('fs');
var path = require('path');

var opts = module.exports.opts = function(opts, defaults) {
    if (!opts) {
        opts = process.argv;
    }

    var out = defaults || {},
        last, i, is_flag;
    for(i = 0; i < opts.length; i++) {
        is_flag = opts[i].substr(0, 1) === '-';
        if (is_flag && last) {
            out[last] = true;
        } else if (!is_flag && last) {
            out[last] = opts[i];
        }
        last = is_flag ? opts[i].replace(/^\-+/, '') : null;
    }
    if (last) out[last] = true;
    return out;
};

var globEach = module.exports.globEach = function(path_, ext, callback, doneCallback) {
    var wildcard = ext === '*';
    if (!doneCallback) {
        doneCallback = function() {};
    }

    fs.readdir(path_, function(err, list) {
        if (err) return doneCallback(err);
        var pending = list.length;
        if (!pending) return doneCallback(null);
        list.forEach(function(file) {
            file = path_ + '/' + file;
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    module.exports.globEach(file, ext, callback, function(err) {
                        if (!--pending) doneCallback(err);
                    });
                } else {
                    // If it's got the right extension, add it to the list.
                    if(wildcard || file.substr(file.length - ext.length) == ext)
                        callback(path.normalize(file));
                    if (!--pending) doneCallback(null);
                }
            });
        });
    });
};

module.exports.glob = function(path_, ext, done) {
    var results = [];
    globEach(path_, ext, function(data) {
        results.push(data);
    }, function(err) {
        if (done) {
            if (err) {
                done(err);
            } else {
                done(null, results);
            }
        }
    });
};

module.exports.globSync = function(path_, ext, done) {
    var results = [];
    var list = fs.readdirSync(path_);
    var pending = list.length;
    var wildcard = ext === '*';

    if (!pending) return done(null, results);
    list.forEach(function(file) {
        file = path_ + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            module.exports.globSync(file, ext, function(err, res) {
                results = results.concat(res);
                if (!--pending) done(null, results);
            });
        } else {
            // If it's got the right extension, add it to the list.
            if(wildcard || file.substr(file.length - ext.length) == ext)
                results.push(path.normalize(file));
            if (!--pending) done(null, results);
        }
    });
};

var createDir = module.exports.createDir = function(dir, callback) {
    var parent = path.dirname(dir);
    fs.exists(parent, function(exists) {
        function doMake() {
            if (fs.existsSync(dir)) {
                callback();
                return;
            }

            fs.mkdir(dir, function(err) {
                callback(err);
            });
        }
        if (exists) {
            doMake();
        } else {
            createDir(parent, function(err) {
                if (err) {
                    callback(err);
                    return;
                }
                doMake();
            });
        }
    });
};

module.exports.rmdirRecursive = function(path_, callback) {
    function rmdir(done) {
        fs.readdir(path_, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null);
            list.forEach(function(file) {
                file = path.resolve(path_, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        module.exports.rmdirRecursive(file, function() {
                            if (!--pending) done(null);
                        });
                    } else {
                        fs.unlink(file, function() {
                            if (!--pending) done(null);
                        });
                    }
                });
            });
        });
    }
    fs.exists(path_, function(exists) {
        if (!exists) {
            console.warn('Specified path does not exist: ' + path_);
            return;
        }
        rmdir(function(err) {
            if (err) return;
            fs.rmdir(path_, callback);
        });
    });
};
