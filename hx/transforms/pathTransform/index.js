var through = require('through2');
var resolve = require('resolve');
var ast = require("./ast");
var pathResolve = require("./pathResolve");

module.exports = function(file, opts) {
    var data = '',
        stream = through(write, end);

    return stream;

    function write(buf, enc, next) {
        data += buf;
        next();
    }

    function end() {
        walk(function(error, result) {
            if (error) stream.emit('error', error);
            stream.push(result);
            stream.push(null);
        });
    }

    function walk(cb) {
        pathResolve.initConfigs(opts);
        cb(undefined, ast.parse(data, file, opts));
    }
};
