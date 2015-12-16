#   hx
CMD 打包工具
>  内部参考browserify , 用流的方式实现构建打包流程

>  支持transform插件

>  可以与gulp 无缝结合


## Usage

从 NPM 中安装：
```bash
npm install hx
```

###  简单run：
```
var hx = require("hx");
var d = hx({
    "entry": "./scripts/index.js", //入口文件是 必填
    "base": "./", //项目根目录  可选
    "alias": { //路径替换 可选
        "zepto": "lib/zepto/zepto",
    },
    "output": { //如果是自己打包,不依赖gulp等其他工具, 此项为必填
        "dir": "output", //输出目录
        "name": "result.js", //打包文件的名字
    }
})
d.run();
```

### 与 gulp 结合
```
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
//合并js
gulp.task('js-concat', function() {
    var config = {
        "entry": "./scripts/index.js", //入口文件是 必填
        "base": "./", //项目根目录  可选
        "alias": { //路径替换 可选
            "zepto": "lib/zepto/zepto",
        },
        "name": "result.js", //打包文件的名字
    }
    var d = hx(config);
    return d.run()
        .pipe(source(config.name))
        .pipe(buffer())
        .pipe(gulp.dest(output + "/"));
});
```


### transform 插件

```
/**
 * try catch 插件
 * 在每个的函数外部包裹一层try catch 
 */
var through = require('through2');

module.exports = function(file, opts) {
    console.log(file)
    var data = '',
        stream = through(write, end);

    return stream;

    function write(buf, enc, next) {
        data += buf;
        next();
    }

    function end() {
        var result = "try {" + 
                     data +
                     "} catch(error) {alert(error)}";
        stream.push(result);
        stream.push(null);
    }
};

```


```
/**
 * remove 插件
 * 不想打包指定的文件
 */
var through = require('through2');

var filter = "xxx";

module.exports = function(file, opts) {
    var data = '',
        stream = through(write, end);

    return stream;

    function write(buf, enc, next) {
        data += buf;
        next();
    }

    function end() {
        result = data;
        if (file.indexOf(filter) !== -1) {
            //文件名中有xxx,该文件以及该文件的依赖不会被打包进来
            result = "";
        }
        stream.push(result);
        stream.push(null);
    }
};


```

```
//添加transform
hx.transform(transformname1);
hx.transform(transformname2);
```


**巧妙利用transfrom 插件与AST(uglify)语法树，可以非常灵活的实现任何事情！**
**比如去掉文件内容里的alert/console神马的，都是很容易的。**


##  有很多不足

懒人不解释，爱折腾的程序员欢迎交流
