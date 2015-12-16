var uglify = require('uglify-js');
var resolvepath = require("./pathResolve");
var path = require("path");
var fs = require("fs");

//生成代码的配置
var generateOptions = require('./codeStyle.json');
var astOpts;

module.exports = ast;

function ast (data, opts) {
}

ast.parse = function(data, currentModulePath, opts) {
    astOpts = opts;
    var moduleCode = data.toString();

    var moduleAST = uglify.parse(moduleCode);
    var module = moduleAST.transform(new uglify.TreeTransformer(null, function(node, descend) {
        if (node instanceof uglify.AST_Call) {
            switch (node.expression.name) {
                case 'define':
                    return uniteDefine(node, currentModulePath, opts);
                case 'require':
                    if (node.args[0].value.indexOf('m.css') === -1) {
                        return uniteRequire(node, currentModulePath, opts);
                    } else {
                        return uglify.parse('');
                    }
            }
        }
    }));
    var moduleCode = module.print_to_string(generateOptions);
    return moduleCode;
}

function uniteDefine(node, currentModulePath) {
    var moduleID = new uglify.AST_String({
        "value": uniteModuleId(currentModulePath)
    });

    if (node.args.length === 3) {
        node.args[0] = moduleID;
    } else {
        node.args.unshift(moduleID);
    }
    return node;
};

/**
 * 处理require调用中的相对路径为define中的绝对路径
 * @param node
 * @param currentModulePath
 * @returns {*}
 */
function uniteRequire(node, currentModulePath, opts) {
    var foreignModuleRealPath = resolvepath(path.dirname(currentModulePath), node.args[0].value, opts.basedir);  //获取依赖模块的绝对地址
    node.args[0].value = uniteModuleId(foreignModuleRealPath, currentModulePath, opts);
    return node;
};

/**
 * 统一js代码中出现的模块的名字，使用当前模块绝对路径截取根路径作为 moduleID
 * @param currentModulePath   当前模块路径
 * @return {String}  计算后的路径
 */
var uniteModuleId = function (foreignModuleRealPath, currentModulePath, opts) {
    var result = foreignModuleRealPath
        .replace(astOpts.basedir, '')
        .replace(/\\/g, '/')
        .replace(/.js$/g, '');

    result = "." + result;

    //检验路径是否有效
    // console.log(foreignModuleRealPath)
    // try {
    //     var stat = fs.statSync(foreignModuleRealPath);
    // } catch (err) {
    //     if (err && err.code === 'ENOENT') {
    //         console.log(currentModulePath + "  中的路径  " + foreignModuleRealPath + "  无效");
    //         return "";
    //     }
    // }

    return result;
};