var fs = require('fs'),
    pth = require('path'),
    _exists = fs.existsSync || pth.existsSync,
    toString = Object.prototype.toString,
    iconv;

var log4js = require('log4js');
var log = log4js.getLogger(); //trace/debug/info/warn/error/fatal

var IS_WIN = process.platform.indexOf('win') === 0; // 判断是否是window

var TEXT_FILE_EXTS = [
        'css', 'tpl', 'js', 'php',
        'txt', 'json', 'xml', 'htm',
        'text', 'xhtml', 'html', 'md',
        'conf', 'po', 'config', 'tmpl',
        'coffee', 'less', 'sass', 'jsp',
        'scss', 'manifest', 'bak', 'asp',
        'tmp', 'haml', 'jade', 'aspx',
        'ashx', 'java', 'py', 'c', 'cpp',
        'h', 'cshtml', 'asax', 'master',
        'ascx', 'cs', 'ftl', 'vm', 'ejs',
        'styl', 'jsx', 'handlebars'
    ],
    IMAGE_FILE_EXTS = [
        'svg', 'tif', 'tiff', 'wbmp',
        'png', 'bmp', 'fax', 'gif',
        'ico', 'jfif', 'jpe', 'jpeg',
        'jpg', 'woff', 'cur', 'webp',
        'swf', 'ttf', 'eot'
    ],
    MIME_MAP = {
        //text
        'css': 'text/css',
        'tpl': 'text/html',
        'js': 'text/javascript',
        'jsx': 'text/javascript',
        'php': 'text/html',
        'asp': 'text/html',
        'jsp': 'text/jsp',
        'txt': 'text/plain',
        'json': 'application/json',
        'xml': 'text/xml',
        'htm': 'text/html',
        'text': 'text/plain',
        'md': 'text/plain',
        'xhtml': 'text/html',
        'html': 'text/html',
        'conf': 'text/plain',
        'po': 'text/plain',
        'config': 'text/plain',
        'coffee': 'text/javascript',
        'less': 'text/css',
        'sass': 'text/css',
        'scss': 'text/css',
        'styl': 'text/css',
        'manifest': 'text/cache-manifest',
        //image
        'svg': 'image/svg+xml',
        'tif': 'image/tiff',
        'tiff': 'image/tiff',
        'wbmp': 'image/vnd.wap.wbmp',
        'webp': 'image/webp',
        'png': 'image/png',
        'bmp': 'image/bmp',
        'fax': 'image/fax',
        'gif': 'image/gif',
        'ico': 'image/x-icon',
        'jfif': 'image/jpeg',
        'jpg': 'image/jpeg',
        'jpe': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'eot': 'application/vnd.ms-fontobject',
        'woff': 'application/font-woff',
        'ttf': 'application/octet-stream',
        'cur': 'application/octet-stream'
    };

var _ = module.exports = function(path) {
    var type = typeof path;
    if (arguments.length > 1) {
        path = Array.prototype.join.call(arguments, '/');
    } else if (type === 'string') {
        //do nothing for quickly determining.
    } else if (type === 'object') {
        path = Array.prototype.join.call(path, '/');
    } else if (type === 'undefined') {
        path = '';
    }
    if (path) {
        path = pth.normalize(path.replace(/[\/\\]+/g, '/')).replace(/\\/g, '/');
        if (path !== '/') {
            path = path.replace(/\/$/, ''); //去掉末尾的/
        }
    }
    return path;
};

_.exists = _exists;

function getIconv() {
    if (!iconv) {
        iconv = require('iconv-lite'); //编码转换工具
    }
    return iconv;
}

_.getAllPath = function(dir) {
    return _.find(dir);
}

_.find = function(rPath) {
    var list = [],
        path = _.realpath(rPath);
    if (path) {
        var stat = fs.statSync(path);
        if (stat.isDirectory()) {
            fs.readdirSync(path).forEach(function(p) {
                if (p[0] != '.') {
                    list = list.concat(_.find(path + '/' + p));
                }
            });
        } else if (stat.isFile() && _.filter(path)) {
            list.push(path);
        }
    } else {
        log.error('unable to find [' + rPath + ']: No such file or directory.');
    }
    return list.sort();
};

//返回一级目录
_.findDir = function(dir) {
    var list = [],
        path = _.realpath(dir);
    if (path) {
        var stat = fs.statSync(path);
        if (stat.isDirectory()) {
            fs.readdirSync(path).forEach(function(p) {
                fs.statSync(_.getrealpath(path, p)).isDirectory() ? list.push(p) : 0
            });
        }
    } else {
        log.error('unable to find [' + rPath + ']: No such file or directory.');
    }
    return list.sort();
}

_.getrealpath = function(dir, path) {
    if (!path || !dir) {
        log.error("getrealpath 方法缺少参数");
        return;
    }
    var p = pth.resolve(dir, path);
    var result = _.realpath(p);
    if (!result) {
        log.error("路径 " + p + "不存在");
    }
    return result;
}

_.realpath = function(path) {
    if (path && _exists(path)) {
        path = fs.realpathSync(path);
        if (IS_WIN) {
            path = path.replace(/\\/g, '/');
        }
        if (path !== '/') {
            path = path.replace(/\/$/, '');
        }
        return path;
    } else {
        return false;
    }
};

_.realpathSafe = function(path) {
    return _.realpath(path) || _(path);
};

_.isAbsolute = function(path) {
    if (IS_WIN) {
        return /^[a-z]:/i.test(path);
    } else {
        if (path === '/') {
            return true;
        } else {
            var split = path.split('/');
            if (split[0] === '~') {
                return true;
            } else if (split[0] === '' && split[1]) {
                return _.isDir('/' + split[1] + '/' + split[2]);
            } else {
                return false;
            }
        }
    }
};

_.isFile = function(path) {
    return _exists(path) && fs.statSync(path).isFile();
};

_.isDir = function(path) {
    return _exists(path) && fs.statSync(path).isDirectory();
};

_.mtime = function(path) {
    var time = 0;
    if (_exists(path)) {
        time = fs.statSync(path).mtime;
    }
    return time;
};


//得到相对路径(除去root的子路径)
_.getsub = function(file, root) {
    path = _.realpath(file);
    root = _.realpath(root);
    if (!path || !root) {
        log.error('unable to find argument for utils getsub');
    } else {
        var fileInfo = _.getfileinfo(path);
        var len = root.length,
            subpath;
        var result = {
            subpath: subpath = path.substring(len), //路径
            subdirname: fileInfo.dirname.substring(len), //目录名
            subpathNoExt: fileInfo.rest.substring(len) //木有后缀名的路径
        }
        return result;
    }
};

// 得到文件信息(目录名(dirname, 文件名(filename),文件基础名(basename)、 文件后缀(ext)))
// 暂时没有对url等特殊信息的处理
_.getfileinfo = function(str) {
    var info = {},
        pos;
    str = info.fullname = str.replace(/\\/g, '/');
    if ((pos = str.lastIndexOf('/')) > -1) { //lastIndoxOf 返回一个字符串指定出现的位置
        if (pos === 0) {
            info.rest = info.dirname = '/';
        } else {
            info.dirname = str.substring(0, pos);
            info.rest = info.dirname + '/';
        }
        str = str.substring(pos + 1);
    } else {
        info.rest = info.dirname = '';
    }
    if ((pos = str.lastIndexOf('.')) > -1) {
        info.ext = str.substring(pos).toLowerCase();
        info.filename = str.substring(0, pos);
        info.basename = info.filename + info.ext;
    } else {
        info.basename = info.filename = str;
        info.ext = '';
    }
    info.rest += info.filename;
    return info;
}

_.filter = function(str) {
    //文件过滤，还没有做，待完善
    return true;
}



_.readBuffer = function(buffer) {
    if (_.isUtf8(buffer)) {
        buffer = buffer.toString('utf8');
        if (buffer.charCodeAt(0) === 0xFEFF) {
            buffer = buffer.substring(1);
        }
    } else {
        buffer = getIconv().decode(buffer, 'gbk');
    }
    return buffer;
};

_.read = function(path, convert) {
    var content = false;
    if (_exists(path)) {
        content = fs.readFileSync(path);
        if (convert || _.isTextFile(path)) {
            content = _.readBuffer(content); //是文本则read buffer
        }
    } else {
        log.debug('unable to read file[' + path + ']: No such file or directory.');
    }
    return content;
};

_.del = function(rPath, include, exclude) {
    var removedAll = true;
    var path;
    if (rPath && _.exists(rPath)) {
        var stat = fs.lstatSync(rPath);
        var isFile = stat.isFile() || stat.isSymbolicLink();

        if (stat.isSymbolicLink()) {
            path = rPath;
        } else {
            path = _.realpath(rPath);
        }

        if (/^(?:\w:)?\/$/.test(path)) {
            log.debug('unable to delete directory [' + rPath + '].');
        }

        if (stat.isDirectory()) {
            fs.readdirSync(path).forEach(function(name) {
                if (name != '.' && name != '..') {
                    removedAll = _.del(path + '/' + name, include, exclude) && removedAll;
                }
            });
            if (removedAll) {
                fs.rmdirSync(path);
            }
        } else if (isFile) {
            fs.unlinkSync(path);
        } else {
            removedAll = false;
        }
    } else {}
    return removedAll;
};

_.copy = function(rSource, target, include, exclude, uncover, move) {
    var removedAll = true,
        source = _.realpath(rSource);
    target = _(target);
    if (source) {
        var stat = fs.statSync(source);
        if (stat.isDirectory()) {
            fs.readdirSync(source).forEach(function(name) {
                if (name != '.' && name != '..') {
                    removedAll = _.copy(
                        source + '/' + name,
                        target + '/' + name,
                        include, exclude,
                        uncover, move
                    ) && removedAll;
                }
            });
            if (move && removedAll) {
                fs.rmdirSync(source);
            }
        } else if (stat.isFile() && _.filter(source, include, exclude)) {
            log.debug("初始化 " + target);
            if (uncover && _exists(target)) {
                //uncover
                removedAll = false;
            } else {
                _.write(target, fs.readFileSync(source, null));
                if (move) {
                    fs.unlinkSync(source);
                }
            }
        } else {
            removedAll = false;
        }
    } else {
        log.error('unable to copy [' + rSource + ']: No such file or directory.');
    }
    return removedAll;
};

//同步(by fengshengqing)
//filter 是传过来的函数(参数1：文件后缀名； 参数2:  文件内容； 当其return false时，不过滤)
_.sync = function(rSource, target, filter) {
    var source = _.realpath(rSource);
    target = _(target);
    if (source) {
        if (!filter) {
            _.copy(rSource, target); //如果没有filter则正常copy
        } else {
            var files = _.getAllPath(source); //拿到所有的文件
            _.map(files, function(key) {
                var value = files[key];
                var ext = _.getfileinfo(value).ext; //拿到这个文件的后缀名
                var content = fs.readFileSync(value, null); //拿到这个文件的内容
                var filtercontent; //经过过滤后的内容
                var sub = _.getsub(value, source); //拿到相对路径对象
                var targetpath = target + sub.subpath; //获取相对路径
                if (filtercontent = filter(ext, content)) {
                    _.write(targetpath, filtercontent);
                } else {
                    _.write(targetpath, content);
                }
            });
        }
    } else {
        log.error('unable to sync [' + rSource + ']: No such file or directory.');
    }
}

_.map = function(obj, callback, merge) {
    var index = 0;
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (merge) {
                callback[key] = obj[key];
            } else if (callback(key, obj[key], index++)) {
                break;
            }
        }
    }
};

function getFileTypeReg(type) {
    var map = [];
    if (type === 'text') {
        map = TEXT_FILE_EXTS;
    } else if (type === 'image') {
        map = IMAGE_FILE_EXTS;
    } else {
        log.error('invalid file type [' + type + ']');
    }
    map = map.join('|');
    return new RegExp('\\.(?:' + map + ')$', 'i');
}

_.isTextFile = function(path) {
    return getFileTypeReg('text').test(path || '');
};

_.isImageFile = function(path) {
    return getFileTypeReg('image').test(path || '');
};

_.write = function(path, data, charset, append) {
    if (!_exists(path)) {
        _.mkdir(_.getfileinfo(path).dirname);
    }
    if (charset) {
        data = getIconv().encode(data, charset);
    }
    if (append) {
        fs.appendFileSync(path, data, null);
    } else {
        fs.writeFileSync(path, data, null);
    }
};

_.mkdir = function(path, mode) {
    if (typeof mode === 'undefined') {
        //511 === 0777
        mode = 511 & (~process.umask());
    }
    if (_exists(path)) return;
    path.split('/').reduce(function(prev, next) {
        if (prev && !_exists(prev)) {
            fs.mkdirSync(prev, mode);
        }
        return prev + '/' + next;
    });
    if (!_exists(path)) {
        fs.mkdirSync(path, mode);
    }
};

_.isUtf8 = function(bytes) {
    var i = 0;
    while (i < bytes.length) {
        if (( // ASCII
                0x00 <= bytes[i] && bytes[i] <= 0x7F
            )) {
            i += 1;
            continue;
        }

        if (( // non-overlong 2-byte
                (0xC2 <= bytes[i] && bytes[i] <= 0xDF) &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF)
            )) {
            i += 2;
            continue;
        }

        if (
            ( // excluding overlongs
                bytes[i] == 0xE0 &&
                (0xA0 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
            ) || ( // straight 3-byte
                ((0xE1 <= bytes[i] && bytes[i] <= 0xEC) ||
                    bytes[i] == 0xEE ||
                    bytes[i] == 0xEF) &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
            ) || ( // excluding surrogates
                bytes[i] == 0xED &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0x9F) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
            )
        ) {
            i += 3;
            continue;
        }

        if (
            ( // planes 1-3
                bytes[i] == 0xF0 &&
                (0x90 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
            ) || ( // planes 4-15
                (0xF1 <= bytes[i] && bytes[i] <= 0xF3) &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
            ) || ( // plane 16
                bytes[i] == 0xF4 &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0x8F) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
            )
        ) {
            i += 4;
            continue;
        }
        return false;
    }
    return true;
};
