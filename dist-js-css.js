/**
 * Created by QETHAN on 14-2-24.
 */
var fs = require('fs'),
		path = require('path'),
	  stat = fs.stat,
		uglifyJS = require('uglify-js'),
		CleanCSS = require('clean-css'),
		cleanCSS = new CleanCSS(),
		config = null;

//读取配置文件
fs.readFile(__dirname+'/package.json',{encoding:'utf8'},function(err,data){
	if(err) throw err;
	//配置文件数据
	config = JSON.parse(data);

  /*
   * 获取开发或部署服务器环境参数
   * dev
   * test
   * prod
   */
	if(config.domain){
		var env = process.argv.slice(2)[0];

		var app = {
			DU: config.domain[env]
		}
console.log(JSON.stringify(app));
		var configStr = 'var app = '+JSON.stringify(app);
		fs.writeFile(__dirname+'/config.js',configStr,function(err,data){
			if(err) console.error(err.stack);
			console.log('----------------数据接口配置文件生成成功！')
		});
	}

  /*
   * 打包压缩js,css
   * 根据是否配置了src路径，来进行压缩
   */
//	if(config.src.js){
//		dist(config.src.js,config.dest.js);
//	}
//
//	if(config.src.css){
//		dist(config.src.css,config.dest.css);
//	}

});


//打包压缩js,css
function dist(src,dest){

	if(!fs.existsSync(dest)){
		mkdirSync(dest);
	}

	fs.readdir(src,function(err,files){

		if(err) console.error(err.stack);

		files.forEach(function(file){

			var _src = src + path.sep + file;

			stat(_src,function(err,stat){
				if(err) console.error(err.stack);
				if(stat && stat.isDirectory()&&!_src.match(/node_modules/)){

					console.log('------dir------'+_src);
					dist(_src,dest+path.sep+file);

				} else {

					console.log('------file------'+path.basename(file,path.extname(_src)));

					/*
					 * 写入dist文件夹
					 * 根据文件后缀，判断是js还是css文件
					 */

					if(path.extname(file).match(/\.js/)){
						var result = uglifyJS.minify(_src);
						fs.writeFile(dest+path.sep+path.basename(file,path.extname(file))+'.min'+path.extname(file),result.code,{encoding:'utf8'},function(err){
							if(err) console.error(err.stack);
							console.log('--------------生成js压缩文件： '+dest+path.sep+path.basename(file,path.extname(file))+'.min'+path.extname(file));
						});
					} else if(path.extname(file).match(/\.css/)){

						fs.readFile(_src,{encoding:'utf8'},function (err, data) {

							if (err) console.error(err.stack);

							var result = cleanCSS.minify(data);
							fs.writeFile(dest+path.sep+path.basename(file,path.extname(file))+'.min'+path.extname(file),result,{encoding:'utf8'},function(err){
								if(err) console.error(err.stack);
								console.log('--------------生成css压缩文件： '+dest+path.sep+path.basename(file,path.extname(file))+'.min'+path.extname(file));
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
function mkdirSync(url,mode,cb){
	var path = require("path"), arr = url.split("/");
	mode = mode || 0755;
	cb = cb || function(){};
	if(arr[0]==="."){//处理 ./aaa
		arr.shift();
	}
	if(arr[0] == ".."){//处理 ../ddd/d
		arr.splice(0,2,arr[0]+"/"+arr[1])
	}
	function inner(cur){
		if(!path.existsSync(cur)){//不存在就创建一个
			fs.mkdirSync(cur, mode)
		}
		if(arr.length){
			inner(cur + "/"+arr.shift());
		}else{
			cb();
		}
	}
	arr.length && inner(arr.shift());
}

