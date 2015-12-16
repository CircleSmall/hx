var gutil = require('gulp-util');
var path = require('path')
var through = require('through2');
var fs = require("fs");

var template = require("./template");

var suffix = ["vm", "html", "hogan", "jade"];

var allModule = {};

var isInit = false;

module.exports = function(opts) {
    if(!isInit) {
        init(opts);
        isInit = true;
    }
    return through.obj(function(file, enc, cb) {
        var self = this;
        var type = isCorrectFile(file.path); //文件类型
        if (!type) {
            //如果不是正确的文件
            cb();
            return;
        }
        var temPath = file.path;
        var temDir = path.dirname(temPath);

        var pp = parsePath(file.relative);
        // cb();
        // return;
        template(temDir, type, function(outContent) {
            // var templateName = path.basename(file.path);
            // file.path = file.cwd + "/" + opts.templateOutput + "/" + templateName + "/" + templateName + ".js";
            // console.log(file.path)
            file.path = path.join(file.base, pp.dirname + "/" + pp.dirname + ".js");
            allModule[pp.dirname] = true;
            file.contents = new Buffer(outContent);
            self.push(file);


            cb();
            return;
        });

    }, function(next) {
        //写module.js模块
        template.writeModule(opts, allModule);
        next();
    });
};

function init(opts) {
    template.init(opts);
}

function parsePath(p) {
    var extname = path.extname(p);
    return {
        dirname: path.dirname(p),
        basename: path.basename(p, extname),
        extname: extname
    };
}

function isFile(file) {
    try {
        var stat = fs.statSync(file)
    } catch (err) {
        if (err && err.code === 'ENOENT') return false
    }
    return stat.isFile() || stat.isFIFO();
}

function isCorrectFile(file) {
    var menu = path.dirname(file);
    for (var i in suffix) {
        var isf = file === path.resolve(menu, "m." + suffix[i]);
        if (isf) return suffix[i];
    }
    return false;
}
