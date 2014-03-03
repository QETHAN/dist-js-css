#!/usr/local/bin node

var fs = require('fs'),
    path = require('path'),
    stat = fs.stat,
    uglifyJS = require('uglify-js'),
    CleanCSS = require('clean-css'),
    cleanCSS = new CleanCSS(),
    config = null;

//读取配置文件
fs.readFile(__dirname + '/package.json', {encoding: 'utf8'}, function (err, data) {
    if (err) throw err;
    //配置文件数据
    config = JSON.parse(data);

    /*
     * 获取开发或部署服务器环境参数
     * dev
     * test
     * prod
     */
    if (config.domain) {
        var env = process.argv.slice(2)[0];
        if (!env.match(/dev|test|prod/)) {
            console.error("缺少部署环境参数！");
            return;
        }
        var app = {
            version: config.version,
            DU: config.domain[env],
            IDU: config.image[env],
            DI: config.DI,
            src: config.src,
            dest: config.dest,
            // js css 静态文件目录
            filePath: config.filePath[env],
            page: config.page,
            timestamp: (+new Date())
        }
        if (env == "test" || env == "prod") {
            var pages = app.page;
            var d = {};
            for (prop in pages) {
                d[prop] = {};
                for (p in pages[prop]) {
                    d[prop][p] = [];
                    var len = pages[prop][p].length;
                    for (var i = 0; i < len; i++) {
                        var file = pages[prop][p][i],
                            filename = file.slice(0, file.lastIndexOf('.')).replace('.min', '');
                        d[prop][p].push(filename + '-' + app.timestamp + '.min' + file.slice(file.lastIndexOf('.')));
                    }
                }
            }
            app.page = d;
        }

        var configStr = 'var app = ' + JSON.stringify(app);
        console.dir(configStr);
        fs.writeFile(config.configFilePath + path.sep + 'config.js', configStr, function (err, data) {
            if (err) console.error(err.stack);
            console.log('----------------数据接口配置文件生成成功！')
        });
    }

    /*
     * 全部打包压缩js,css
     * 根据是否配置了src路径，来进行压缩
     */
    if (process.argv.slice(2).indexOf("-conf") == -1) {
        var cssArg = process.argv.slice(2).indexOf("-css"),
            jsArg = process.argv.slice(2).indexOf("-js");

        /*
         * 先要删除dist js,css 目录所有文件，
         * 因为每次生成的新文件的文件名会变化，
         * 不能直接覆盖掉老文件，所以先删除掉
         */
        rmdirSync(config.dest.css);
        rmdirSync(config.dest.js);

        if( cssArg != -1 && jsArg != -1) {
            if (config.src.css) {
                dist(config.src.css, config.dest.css, app.timestamp);
            }
            if (config.src.js) {
                dist(config.src.js, config.dest.js, app.timestamp);
            }
        } else if(cssArg != -1) {
            if (config.src.css) {
                dist(config.src.css, config.dest.css, app.timestamp);
            }
        } else if(jsArg != -1) {
            if (config.src.js) {
                dist(config.src.js, config.dest.js, app.timestamp);
            }
        }
    }
});


//打包压缩js,css
function dist(src, dest, version) {
    if (!fs.existsSync(dest)) {
        mkdirSync(dest);
    }

    fs.readdir(src, function (err, files) {
        if (err) console.error(err.stack);
        files.forEach(function (file) {
            var _src = src + path.sep + file;
            stat(_src, function (err, stat) {
                if (err) console.error(err.stack);
                if (stat && stat.isDirectory() && !_src.match(/node_modules/)) {
                    console.log('------dir------' + _src);
                    dist(_src, dest + path.sep + file, version);
                } else {
                    console.log('------file------' + path.basename(file, path.extname(_src)));
                    /*
                     * 写入dist文件夹
                     * 根据文件后缀，判断是js还是css文件
                     */
                    if (path.extname(file).match(/\.js/)) {
                        var result = uglifyJS.minify(_src);
                        fs.writeFile(dest + path.sep + path.basename(file, path.extname(file)).replace('.min', '') + '-' + version + '.min' + path.extname(file), result.code, {encoding: 'utf8'}, function (err) {
                            if (err) console.error(err.stack);
                            console.log('--------------生成js压缩文件： ' + dest + path.sep + path.basename(file, path.extname(file)).replace('.min', '') + '-' + version + '.min' + path.extname(file));
                        });
                    } else if (path.extname(file).match(/\.css/)) {
                        fs.readFile(_src, {encoding: 'utf8'}, function (err, data) {
                            if (err) console.error(err.stack);
                            var result = cleanCSS.minify(data);
                            fs.writeFile(dest + path.sep + path.basename(file, path.extname(file)).replace('.min', '') + '-' + version + '.min' + path.extname(file), result, {encoding: 'utf8'}, function (err) {
                                if (err) console.error(err.stack);
                                console.log('--------------生成css压缩文件： ' + dest + path.sep + path.basename(file, path.extname(file)).replace('.min', '') + '-' + version + '.min' + path.extname(file));
                            });
                        });
                    }
                }
            });
        });
    });
}


/*
 * 创建多级目录 by rubylouvre
 */
function mkdirSync(url, mode, cb) {
    var path = require("path"), arr = url.split("/");
    mode = mode || 0755;
    cb = cb || function () {
    };
    if (arr[0] === ".") {//处理 ./aaa
        arr.shift();
    }
    if (arr[0] == "..") {//处理 ../ddd/d
        arr.splice(0, 2, arr[0] + "/" + arr[1])
    }
    function inner(cur) {
        if (!path.existsSync(cur)) {//不存在就创建一个
            fs.mkdirSync(cur, mode)
        }
        if (arr.length) {
            inner(cur + "/" + arr.shift());
        } else {
            cb();
        }
    }

    arr.length && inner(arr.shift());
}

/*
 * 删除多级目录 by rubylouvre
 */
function rmdirSync(dir, cb) {
    cb = cb || function () {
    };
    var dirs = [];

    try {
        iterator(dir, dirs);
        for (var i = 0, el; el = dirs[i++];) {
            fs.rmdirSync(el);//一次性删除所有收集到的目录
        }
        cb()
    } catch (e) {//如果文件或目录本来就不存在，fs.statSync会报错，不过我们还是当成没有异常发生
        e.code === "ENOENT" ? cb() : cb(e);
    }
}

function iterator(url, dirs) {
    var stat = fs.statSync(url);
    if (stat.isDirectory()) {
        dirs.unshift(url);//收集目录
        inner(url, dirs);
    } else if (stat.isFile()) {
        fs.unlinkSync(url);//直接删除文件
    }
}
function inner(path, dirs) {
    var arr = fs.readdirSync(path);
    for (var i = 0, el; el = arr[i++];) {
        iterator(path + "/" + el, dirs);
    }
}

