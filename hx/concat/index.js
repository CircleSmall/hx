var through = require('through2');
var path = require("path");
var fs = require("fs");

const baseModuleFile = path.resolve(__dirname, './Module1.1.1');

module.exports = function(opts) {
    var parser = through.obj();
    var deps = opts["deps"] || [];
    var stream = through.obj(
        function(buf, enc, next) {
            parser.write(buf);
            next()
        },
        function() {
            parser.end()
        }
    );
    var first = true;
    parser.pipe(through.obj(write, end));

    return stream;

    function write(row, enc, next) {
        if(first) {
            for(var i in deps) {
                var dep = fs.readFileSync(opts.basedir + "/" + deps[i] + ".js", 'utf-8');
                stream.push(dep);
            }
            stream.push(fs.readFileSync(baseModuleFile + '.js', 'utf-8'));
            first = false;
        }
        stream.push(row + "\n");
        next();
    }

    function end() {
        stream.push(null);
    }
}
