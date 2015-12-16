var fs = require('fs');
var path = require('path');

var inherits = require('inherits');
var Transform = require('readable-stream').Transform;
var duplexer = require('duplexer2');
var detective = require('detective');
var combine = require('stream-combiner2');
var through = require('through2');
var concat = require('concat-stream');
var _ = require("./utils");

var currentFile;
// var resolve = require("resolve"); //非常好的node模块, 帮你找到对应的文件, 感谢stack

module.exports = Deps;
inherits(Deps, Transform);

function Deps(opts) {
    var self = this;
    if (!(this instanceof Deps)) return new Deps(opts);
    Transform.call(this, {
        objectMode: true
    });

    this.transforms = []; //transform 队列
    this.entry = ""; //打包入口
    this.cache = {}; // 数据cache , key是数据id
    this.basedir = opts.basedir;
    this._opts = opts;

    this.pending = 0; // walk文件时的文件计数
}


Deps.prototype._transform = function(row, enc, next) {
    var self = this;
    if (row.transform) {
        if (typeof row.transform == 'function') {
            this.transforms.push(row.transform);
        } else {
            this.transforms.push(resolve(self.basedir, row.transform));
        }
    }
    if (row.entry) {
        this.entry = resolve(self.basedir, row.entry);
        //如果入口文件地址和basedir 不匹配, 则 重新定义basedir
        if(_.isAbsolute(this.entry) && (this.entry.indexOf(self.basedir) < 0)) {
            this.basedir = self._opts.basedir = path.dirname(this.entry);
        }
    }
    return next();
};

Deps.prototype._flush = function() {
    var self = this;
    this.walk(this.entry);
};

Deps.prototype.walk = function(file, cb) {
    var self = this;
    var file;
    try {
        file = resolve(self.basedir, file);
    } catch (error) {}
    if (!file) return;

    if (self.cache[file]) {
        cb && cb(file);
        return;
    }
    self.pending++;
    self.cache[file] = true;

    var ts = self.getTransforms(self.readFile(file), file);
    self.readFile(file)
        .pipe(ts)
        .pipe(concat(function(body) {
            fromSource(body.toString('utf8'));
        }));

    function fromSource(src) {
        var deps = self.parseDeps(file, src);
        if (deps) fromDeps(file, src, deps);
    }

    function fromDeps(file, src, deps) {
        (function() {
            var p = deps.length;
            currentFile = file; //当前正在解析的文件
            deps.forEach(function(id) {
                //如果有依赖，则walk每一个依赖
                // try {
                var id = resolve(self.basedir, id);
                // } catch (error) {}
                if (id) {//如果这个文件存在
                    self.walk(id, function(err, r) {
                        if (--p === 0) done(); //等所有依赖都walk完毕，则对他自己执行done
                    });
                }
            });
            if (deps.length === 0) done(); //如果没有依赖，则直接执行done

        })();

        function done() {
            self.push(src);
            if (--self.pending === 0) {
                // 最后一个文件, push(null)
                self.push(null);
            };
            if (cb) cb(null, file);
        }
    }
}

Deps.prototype.parseDeps = function(file, src, cb) {
    if (/\.json$/.test(file)) return [];

    try {
        var deps = detective(src)
    } catch (ex) {
        var message = ex && ex.message ? ex.message : ex;
        this.emit('error', new Error(
            'Parsing file ' + file + ': ' + message
        ));
        return;
    }
    return deps;
};

Deps.prototype.readFile = function(file) {
    var self = this;
    var tr = through();
    var rs = fs.createReadStream(file); //file 必须有后缀名.js, 否则会报错
    rs.on('error', function(err) {
        self.emit('error', err)
    });
    this.emit('file', file); //触发事件
    return rs;
};

Deps.prototype.getTransforms = function(fileStream, file) {
    var self = this;
    var transforms = this.transforms;
    var pending = transforms.length;
    var streams = [];
    var input = through();
    var output = through();
    var dup = duplexer(input, output);

    //读取每个文件之后, 把每个文件都执行以下transform队列里面的内容
    for (var i = 0; i < transforms.length; i++)(function(i) {
        makeTransform(transforms[i], function(err, trs) {
            if (err) return self.emit('error', err)
            streams[i] = trs;
            if (--pending === 0) done();
        });
    })(i);

    return dup;

    function makeTransform(tr, cb) {
        loadTransform(tr, function(err, trs) {
            if (err) return cb(err);
            cb(null, trs);
        });
    }

    function loadTransform(id, cb) {
        var r;
        if (typeof id == 'function') {
            r = id;
        } else {
            r = require(id);
        }

        if (typeof r !== 'function') {
            return cb(new Error(
                'Unexpected ' + typeof r + ' exported by the ' + JSON.stringify(res) + ' package. ' + 'Expected a transform function.'
            ));
        }
        var trs = r(file, self._opts);
        self.emit('transform', trs, file);
        cb(null, trs);
    }

    function done() {
        var middle = combine.apply(null, streams);
        middle.on('error', function(err) {
            err.message += ' while parsing file: ' + file;
            if (!err.filename) err.filename = file;
            self.emit('error', err);
        });
        input.pipe(middle).pipe(output);
    }
}

function resolve(basedir, file) {
    //考虑到的几种情况：basedir： basedir/   basedir   
    // file:   ./file  /file  file  c:\git\file
    var originalfile  = file;

    if(_.isAbsolute(file)){
        //如果就是绝对路径的话
    } else if (file.slice(0, 2) != "./" && file.slice(0, 1) != "/" && file.indexOf(basedir) == -1) {
        //file 的情况
        file = "./" + file;
    } else if (file.slice(0, 2) != "./" && file.slice(0, 1) == "/" && file.indexOf(basedir) == -1) {
		//   /file的情况   本意想让"/file" 走相对目录，但是mac下/file 是绝对路径地址，所以又加了一个限制条件file.indexOf(basedir) == -1
        file = "." + file
    }
    //添加后缀名
    if (file.slice(-3) != ".js") {
        file = file + ".js";
    };

    var result = path.resolve(basedir, file);
    
    //判断文件是否存在
    try {
        var stat = fs.statSync(result)
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            console.log("not found this file " + originalfile + " on " + currentFile);
            return false;
        }
    }
    return result
}
