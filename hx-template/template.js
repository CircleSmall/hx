/**
 * @date 2015-04-29
 * @describe: 通过配置和一个入口生成相应的模板内容
 * @author: fengshq
 * @version: 1.0
 */
var tp = {
    vm: require("./plugins/vm/index"),
    html: require("./plugins/html"),
    jade: require("./plugins/jade"),
    hogan: require("./plugins/hogan")
};
var uglify = require('uglify-js');
var path = require("path");
var fs = require("fs");

var moduleTemplate, moduleObjectTemplate, mtAST, moAST, generateOptions;

module.exports = template;
module.exports.writeModule = writeModule; // 写模板函数

module.exports.init = function(opts) {
    //获取模块的模版
    moduleTemplate = fs.readFileSync(opts.moduleTemplate, 'utf-8');
    moduleObjectTemplate = fs.readFileSync(__dirname + "/moduleObject.js", 'utf-8');
    //模块模版的语法树
    mtAST = uglify.parse(moduleTemplate, {
        filename: "moduleTemplate.js" // default is null
    });
    //单个模版对象的语法树
    moAST = uglify.parse(moduleObjectTemplate, {
        filename: "moduleObject.js" // default is null
    });

    generateOptions = require("./codeStyle.json"); //uglify 配置参数
}


// var cssModule = fs.readFileSync(__dirname + "/insert-css.js", 'utf-8'); //uglify 配置参数
// var cssAST = uglify.parse(cssModule, {
//     filename: "cssModule.js"
// })


function template(entry, type, cb) {
    var file = entry + "/m." + type;
    // var css = fs.readFileSync(entry + "/m.css", 'utf-8'); //css
    // var cssCode = getCssCode(css); //目前还没有对css的处理
    var initJs = fs.readFileSync(entry + "/m.js"); // 初始化的js
    var extraJs = ""; //用户配置的js
    var jsData = getMixData(file); //js 的数据对象

    var temContent;
    try {
        temContent = tp[type].compile(file, jsData, "tpHelper"); //模板预编译的内容
    } catch (error) {};

    var _module = createOneModuleObject({
        "render": temContent,
        "init": 'function init(){' +  initJs.toString() + '}'
    });
    var result = singleModule(_module).print_to_string(generateOptions);

    cb(result)
}

// function getCssCode(str) {
//     // console.log(cssAST.transform())
//     var i = 0;
//     var NODE;
//     cssAST.walk(new uglify.TreeWalker(function(node){
//         if (node instanceof uglify.AST_Call
//             && node.expression.print_to_string() === 'insertCss') {
//             NODE = node;
//         }
//     }));
//     NODE.args.push(new uglify.AST_String({
//             value: str
//     }));
//     return cssAST.print_to_string(generateOptions)
// };

/**
 * 用模版的代码生成模块代码
 * @param properties
 * @return {{}}
 */
function createOneModuleObject(properties) {
    var oneModule = {};
    moAST.transform(new uglify.TreeTransformer(null, function(node, descend) {
        if (node instanceof uglify.AST_VarDef) {
            oneModule = node.value;
        }
        if (properties[node.key] !== undefined && node instanceof uglify.AST_ObjectProperty) {
            if (node.key === 'init') {
                node.value = uglify.parse(properties[node.key]);
                return node;
            }
            //此处  properties[node.key] 中的值直接来源于 plugin compile 的返回值
            if (node.key === 'render') {
                switch (typeof properties[node.key]) {
                    case 'object':
                        node.value = properties[node.key];
                        break;
                    case 'string':
                        node.value = uglify.parse(properties[node.key]);
                        break;
                }
                return node;
            }
        }
    }));
    return oneModule;
};

/**
 * 生成一个模块
 * @param _module
 * @return {*}
 */
var singleModule = function(_module) {
    return mtAST.transform(new uglify.TreeTransformer(null, function(node, descend) {
        if (node instanceof uglify.AST_Assign && node.left.print_to_string() === 'module.exports') {
            node.right = _module;
            return node;
        }
    }));
};


//获取data.js 数据
function getMixData(realPath) {
    var templateDir = path.dirname(realPath);
    var dataProgress = null;
    try {
        dataProgress = fs.readFileSync(templateDir + '/data.js', 'utf-8');
    } catch (e) {}
    var fragment = '{}';
    try {
        fragment = uglify.parse(dataProgress).body[0].body.right.print_to_string();
    } catch (err) {}
    fragment = (fragment === '{}') ? '' : '_data = ' + ('tpHelper') + '.mixin(_data,' + fragment + ');';
    return fragment;
};

function writeModule(opts, allModule) {
    var html = require("./plugins/html");
    var allFilePath = path.resolve(process.cwd(), opts.templateOutput, "modules.js");
    var ast = html.compile(__dirname + "/allModuleTp.js", "");
    var fun = new Function('_data', getCodeInFunction(ast));
    fs.writeFileSync(
        allFilePath,
        fun(allModule)
    );
}

/**
 * 获取uglify函数对象中的所有语句  todo:应该采用更加简单的正则处理字符串的方式，使用uglify函数越大，效率越低
 * @param func
 * @return {string}
 */
var getCodeInFunction = function(func) {
    var funcObj = func;
    if (!(func instanceof uglify.AST_Node)) {
        funcObj = uglify.parse(func);
    }
    var codeArr = funcObj.body[0].body;
    var code = '';
    for (var idx = 0; idx < codeArr.length; idx++) {
        code += codeArr[idx].print_to_string() + ';';
    }
    return code;
};
