var splicer = require('labeled-stream-splicer');
var through = require('through2');
var path = require("path");
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var resolve = require("resolve");
var xtend = require("xtend");
var concat = require("./concat/index");
var vfs = require('vinyl-fs');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');

var hx_path = require('hx-path');

inherits(hx, EventEmitter);

var deps = require("./deps");

function hx(opts) {
    var self = this;
    if (!(this instanceof hx)) return new hx(opts);

    if (!opts.entry) {
        console.log("hx配置中没有entry ")
        return;
    }

    //配置检查、配置过滤
    self.basedir = opts.base ? path.resolve(process.cwd(), opts.base) : process.cwd(); //设置根目录
    self._opts = xtend(opts, {
        basedir: self.basedir
    });
    self._options = xtend(self._opts);
    //创建流
    self.pipeline = self._createPipeline(self._opts);

    //默认加入hx-path transform 插件
    self.transform(hx_path);
    //从入口写入数据
    self.pipeline.write({
        entry: path.resolve(self.basedir, opts.entry)
    });

    if(opts.output) {
        //如果输出路径存在的话
        self.pipeline
            .pipe(source(opts.output.name))
            .pipe(buffer())
            .pipe(vfs.dest(path.resolve(self.basedir, opts.output.dir)));
    }
}

hx.prototype._createPipeline = function(opts) {
    var self = this;
    if (!opts) opts = {};

    self._deps = self._createDeps(self._opts);
    self._concat = concat(self._opts);
    var pipeline = splicer.obj([
        'deps', [this._deps],
        'concat', [this._concat]
        // 'third', [this._third()]
    ]);

    return pipeline;
}

hx.prototype._createDeps = function(opts) {
    return deps(opts);
};

hx.prototype.transform = function(file) {
    var self = this;
    self._deps.write({
        transform: file
    });
}

hx.prototype.run = function(file) {
    this._bundled = true;
    this.pipeline.end();
    return this.pipeline;
}

hx.prototype.reset = function(opts) {
    //目前还没有reset
}

hx.prototype.bundle = function() {
    return this.pipeline;
}

hx.prototype.add = function(file) {
    var self = this;
    self.pipeline.write({
        entry: path.resolve(self.basedir, file)
    });
}

module.exports = hx;
