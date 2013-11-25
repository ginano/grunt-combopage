/*
 * grunt-combopage
 * https://github.com/ginano/grunt-combopage
 *
 * Copyright (c) 2013 ginano
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  var path = require('path');
  var URL = require('url');
  var http = require('http');
  var jshint = require("jshint").JSHINT;
  var uglify = require('uglify-js');
  var cssmin = require('clean-css');
  var htmlmin = require('html-minifier');
  var Util = require('./lib/util');

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('combopage', 'combo&min your page to one html file.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    // 设置默认配置选项
    var options = this.options({
      cssPath:'',
      cssVersion:false,
      jsPath:'',
      jsVersion:false,
      comboHtml:true,
      comboHtmlOptions:{
        removeComments:true
      }
    });
    //保留任务完成结束标志的句柄，手动判断结束标志
    var Alldone = this.async();
    var allDoneStamp= false;
    var filesDone=[];
    var _v = Date.now();
    //吧所有的文件信息存储起来
    Util.log('all html files:');
    this.files.forEach(function(f) {
      //获取每个html文件对应的选项
      var opt = {
        cssPath: f.cssPath || options.cssPath,
        cssVersion:f.cssVersion || options.cssVersion,
        jsPath:f.jsPath || options.jsPath,
        jsVersion:f.jsVersion || options.jsVersion,
        comboHtml:f.comboHtml || options.comboHtml,
        comboHtmlOptions:f.comboHtmlOptions || options.comboHtmlOptions,
      };
      var filepaths = f.src;
      var dest = f.dest;
      //遍历所有源文件
      filepaths.forEach(function(src){
        var con = grunt.file.read(src);
        var fileInfo={
              src:src,
              dest: (dest!='src' && dest) || src.replace(/\.[^\.]+$/g,'.combo'),
              isDone:false,
              content:'',
              cssList:[],
              jsList:[],
              source:con,
              options:opt
            };
        filesDone.push(fileInfo);
        Util.log('            '+fileInfo.dest);
      });
    });
    
    // Iterate over all specified file groups.
    // 遍历所有的html文件
    filesDone.forEach(function(fileInfo) {
      var fileDone = fileInfo;
      //获取每个html文件对应的选项
      var opt = fileDone.options;
      //文件对应的路径
      var filepath = fileDone.src;
      var dest = fileDone.dest;
      //just support one file
      //读取文件内容
      var src = fileDone.source;
      var cssList = fileDone.cssList, 
          jsList = fileDone.jsList;
      var cssGroupList={},
          jsGroupList={};
      //标记当前html文件的处理状态
      /**
      the style background url's path need to be changed.
      处理读取回来的内容，需要对所有的css中背景图的图片路径进行修改，因为css中的图片路径是相对于css文件的，而不是html文件
      **/
      function processContentUrl(item){
        var _opt, relativeRootPath;
        
        _opt = opt;
        //the inline style
        //如果是内联的css内容
        if(item.type=='inline'){
          //if insert to html file, there is no change to set
          //如果是内联样式，并且配置为所有css内容直接在html中写入css，那么就不需要处理内联的内容了
          if(!_opt.cssPath){
            return item.source;
          }
          //if need to save for one file
          //替换url地址
          item.source=item.source.replace(/url\s*\([^\)]+\)/ig,function(str){
            var _url, _p;
            str = str.replace(/\s+|"|'/ig,'');
            _url = str.match(/^url\(([^\)]+)\)$/i)[1];
            //if the absolute url
            //如果是绝对路径就不需要处理
            if(Util.isUrl(_url)){
              return str;
            }
            //if it is base64 code
            //如果是base64未写的图片资源，也不需要处理了
            if(/^data:/i.test(_url)){
              return str;
            }
            //if without filename
            //如果没有文件名就不处理了
            //这个地方可能需要处理一下a.jpg?v=22233的情况？
            if(!/\.\S+$/i.test(_url)){
              return str;
            }
            //progress the relative path
            //get the absolute path
            //处理路径为据对路径
            _p = path.normalize(path.dirname(filepath)+'/'+_url);
            //在转换为新的css路径对应的相对路径
            return 'url('+path.relative(_opt.cssPath, _p).replace(/\\/g,'/')+')';
          });
          return item.source;
        }
        //if the relative path of link file
        //如果是外联引用的css文件
        if(item.type=='link'){
            item.source=item.source.replace(/url\s*\([^\)]+\)/ig,function(str){
              var _url, _p, _path;
              str = str.replace(/\s+|"|'/ig,'');
              _url = str.match(/^url\(([^\)]+)\)$/i)[1];
              //Util.log('find:-----'+_url);
              //if the absolute url
              //绝对路径就不需要处理了
              if(Util.isUrl(_url)){
                return str;
              }
              //if it is base64 code
              //64为不需要处理
              if(/^data:/i.test(_url)){
                return str;
              }
              //if without filename
              //没有扩展名的不处理
              if(!/\.\S+$/i.test(_url)){
                return str;
              }
              //前面的处理路径是一样，这个工具嘛重复代码多了点儿，但是看起来思路流畅些，就这样还好像呵呵
              //if it's the url, just need compute the file url
              //如果是从网络引用，不是相对路径
              if(item.fromNet){
                //直接转化为绝对路径即可
                _path = URL.resolve(item.url, _url);
              }else{
                //_p = path.resolve(item.url, _url);
                //先获取当前css文件的绝对路径
                _p = path.resolve(path.dirname(filepath), item.url);
                //获取该图片相对于该css计算出来的的绝对路径
                _p = path.resolve(path.dirname(_p), _url);
                //最终需要生成的相对根目录
                relativeRootPath = _opt.cssPath?_opt.cssPath: dest;
                //如果是文件名称结尾
                relativeRootPath = /\.[a-z0-9]+$/i.test(relativeRootPath)?path.dirname(relativeRootPath):relativeRootPath;
                //获取相对设置的css文件的路径
                _path = path.relative(relativeRootPath, _p).replace(/\\/g, '/');
              }
              //Util.log('result:-----'+_path);
              return 'url('+_path+')';
            });
            return item.source;
        }
      }
      //process css content
      /**
       * 合并所有的css文件内容
       * @return {[type]} [description]
       */
      function mergeCSS(){
          var cssMerge='';
          var cssGroupMerge={};
          var _temp, _output, _path, _version='', grouppath;
          var _opt= opt;
          Util.log('start merge and minfy all style content...');
          /**
           * 合并所有的css文件内容（处理了其中的图片地址）
           */
          cssList.forEach(function(item){
            var itemsrc = processContentUrl(item);
            //如果分组的话
            if(item.groupName){
              cssGroupMerge[item.groupName] = (cssGroupMerge[item.groupName] ||'') + itemsrc;
            }else{
              cssMerge+= itemsrc;
            }
          });
          if(_opt.cssPath){
            //if with the setting filename
            //获取对应的css文件名称
            if(path.extname(_opt.cssPath)){
              _output = _opt.cssPath;
              _path = path.dirname(_output);
            }else{
              _path = _opt.cssPath;
              _temp = path.basename(filepath);
              _output = path.normalize(_opt.cssPath)+'\\'+_temp+'.css';
            }
          }else{
            _path= path.dirname(filepath)+'/output';
          }
          //处理group的样式内容
          for(var p in cssGroupMerge){
            // 如果指定了名称
            grouppath = _path + '/'+p;
            if(!/\.css/i.test(p)){
              grouppath +='.css'
            }
            grouppath+=_version;
            grunt.file.write(grouppath.replace(/\//g, '\\'), cssmin.process(cssGroupMerge[p]));
            fileDone.content = fileDone.content.replace(/<\/head>/i, function(str){
              return '<link rel="stylesheet" type="text/css" href="'+path.relative(path.dirname(dest), grouppath)+'" /></head>';
            });
          }
          //if has set the output option
          //如果需要生产独立的css文件
          if(_opt.cssPath){
            //if with the setting filename
            //获取对应的css文件名称
            //是否增加版本号
            _version = _opt.cssVersion?('?v='+_v):'';
            grunt.file.write(_output, cssmin.process(cssMerge));
            //将该css引用插入到head的最底部
            fileDone.content = fileDone.content.replace(/<\/head>/i,function(str){
              return '<link rel="stylesheet" type="text/css" href="'+path.relative(path.dirname(dest), _output)+_version+'" /></head>';
            });
            Util.log('merge the style content to file ['+_output+'] completed!');
          }else{
            //直接将css内容插入到head的最底部
            fileDone.content = fileDone.content.replace(/<\/head>/i,function(str){
              return '<style type="text/css">'+cssmin.process(cssMerge)+'</style></head>';
            });
            Util.log('merge the style content to html file completed!');
          }
          
      }
      //process js content{
      //合并所有的js文件内容
      function mergeJS(){  
        var jsFooterMerge='', jsHeaderMerge='', jsGroupMerge={};
        var _temp, _value, _headerPath, _footerPath, _path, grouppath, _version;
        var _opt =opt;
        Util.log('start miny every script content');
        //如果设置了要单独的js文件生成
        if(_opt.jsPath){
          //if with the setting filename
          if(path.extname(_opt.jsPath)){
            _value = _opt.jsPath;
            _path = path.dirname(_value);
          }else{
            _temp = path.basename(filepath);
            _path = _opt.jsPath;
            _value = path.normalize(_opt.jsPath)+'\\'+_temp+'.js';
          }
          jsList.forEach(function(item){
            var _reg;
            //if this part need keep alone, just minfy it without merge
            //如果该script标签标记了isAone，需要设置不动他，就仅仅做一个压缩之后塞回去
            if(item.isAlone){
              _reg = new RegExp('{{'+item.id+'}}','i');
              fileDone.content = fileDone.content.replace(_reg, function(str){
                return uglify.minify(item.source, {fromString:true}).code;
              });
            }else if(item.groupName){
              //如果有分组信息
              jsGroupMerge[item.groupName] = (jsGroupMerge[item.groupName] || '')+ ';' + item.source; 
            }else{
              //否则就都加起来，前面增加一个分号
			       item.source =';'+item.source;      
             //如果设置了,放到头部就合并到头部内容区
             if(item.isHeader){
                jsHeaderMerge +=item.source;
              }else{
                jsFooterMerge += item.source;
              }
              //删除该script标签
              _reg = new RegExp('<script type="text/javascript">{{'+item.id+'}}</script>','i');
              fileDone.content = fileDone.content.replace(_reg,function(str){
                return '';
              });
            }
          });
          //是否增加版本号
          //接下来的处理都是需要合并为外联文件的js内容了
          _version = _opt.jsVersion?('?v='+_v):'';
          //if has some header setting
          //如果需要放在头部的有内容
          //那就压缩并且写入该文件
          if(jsHeaderMerge.length){
            _headerPath = _value.replace(/\.js$/i,'.header.js');
            grunt.file.write(_headerPath, uglify.minify(jsHeaderMerge, {fromString: true}).code);
          }
          //如果底部有文件内容
          if(jsFooterMerge.length){
            _footerPath = _headerPath?_value.replace(/\.js$/i,'.footer.js'):_value;
            grunt.file.write(_footerPath, uglify.minify(jsFooterMerge, {fromString: true}).code);
          }
          //insert the file import
          //头部内容写到head的最底部
          if(_headerPath){
            fileDone.content = fileDone.content.replace(/<\/head\s*>/i,function(str){
              return '<script  type="text/javascript" src="'+path.relative(path.dirname(dest), _headerPath)+_version+'"></script></head>';
            });
            Util.log('merge the script content to file ['+_headerPath+'] completed!');
          }
          //底部内容写在body的最底部
          if(_footerPath){
            fileDone.content = fileDone.content.replace(/<\/body>/i,function(str){
              return '<script  type="text/javascript" src="'+path.relative(path.dirname(dest), _footerPath)+_version+'"></script></body>';
            });
            Util.log('merge the script content to file ['+_footerPath+'] completed!');
          }
        }else{
          //如果没设置独立的js文件，只是内联的写入
          //那就遍历所有的标签，直接将内容写到对应的位置
          _path = path.dirname(filepath)+'/output';
          jsList.forEach(function(item){
            var _js,_reg;
            if(item.groupName){
              jsGroupMerge[item.groupName] = (jsGroupMerge[item.groupName] || '')+ ';' + item.source; 
              return;
            }
            try{
              _js = uglify.minify(item.source, {fromString: true}); 
            }catch(e){
              console.error('|||||||||||||||||||||---------minify error, please check your code !-------------||||||||||||||||||||||||\n');
              Util.log(item.source);
              _js = {code:item.source};
            }
            //如果有分组信息
            _reg = new RegExp('{{'+item.id+'}}','i');
            fileDone.content = fileDone.content.replace(_reg,function(str){
              Util.log('script:['+item.id+'] replace completed!');
              return _js.code;
            });
          });
          Util.log('merge the script content to html file completed!');
        }
        //处理group的样式内容
        for(var p in jsGroupMerge){
          // 如果指定了名称
          grouppath = _path + '/'+p;
          if(!/\.js/i.test(p)){
            grouppath +='.js'
          }
          grouppath+=_version;
          grunt.file.write(grouppath.replace(/\//g, '\\'), uglify.minify(jsGroupMerge[p], {fromString: true}).code);
          fileDone.content = fileDone.content.replace('<!--js{{'+p+'}}-->', function(str){
            return '<script type="text/javascript" src="'+path.relative(path.dirname(dest), grouppath)+'"></script>';
          });
        }
      }
      //process html string
      /**
       * 合并所有的html内容，对html进行压缩
       * @return {[type]} [description]
       */
      function mergeHTML(){
        var _opt = options;
        if(_opt.comboHtml){
          fileDone.content
          fileDone.content= htmlmin.minify(fileDone.content, _opt.comboHtmlOptions);
          Util.log('minfy the html string with you options');
        }
      }
      //check this fileis Done
      /**
       * 检查该html文件对应的js和css内容有没有处理完成，js和css
       * @return {[type]} [description]
       */
      function checkThisDone(){

        var allList = cssList.concat(jsList);
        //this file is process done!
        Util.checkAllDone(allList, function(){
          if(fileDone.isDone){
            return;
          }
          //合并css
          mergeCSS();
          //合并js
          mergeJS();
          //合并html
          mergeHTML();
          grunt.file.write(dest, fileDone.content);
          Util.log('\n--------------------------'+filepath+' has been  compounded to '+dest+'!--------------------------');
          //标记当前页为已经处理完成
          fileDone.isDone=true;
          //检查是不是所有的都处理完成了
          Util.checkAllDone(filesDone,function(){
            if(allDoneStamp){
              return;
            }
            allDoneStamp = true;
            Alldone();
          });
        });
      }
      //process the style part
      //遍历文件内容获取当前页面当中的所有style内容或者link节点
      //并获取当前style内容的属性值
      src = src.replace(/<link\s+(?:[^>]+\s+)*type=["']\s*text\/css\s*["'](?:\s+[^>]+)*[\s+\/]?>|<style[^>]*>(?:[\S\s]*?)<\/style\s*>/ig,function(str){
        var href, id, group, groupName;
        //igonore this part
        if(/\s+ignore=(?:"|')?true(?:"|')?/i.test(str)){
          return str;
        }
        href = str.match(/href=(?:"|')?([^"' >]+)(?:"|')?/i);
        id='css'+cssList.length;
        group = str.match(/\s+group=(?:"|')?([^\s"']+)(?:"|')?/i);
        groupName = group && group[1];
        //如果是外联引用
        if(href && href[1]){
          cssList.push({
            source:'',
            id:id,
            type:'link',
            url:href[1],
            isDone:false,
            groupName:groupName,
            fromNet:Util.isUrl(href[1])
          });
        }else{
          href = str.replace(/<style[^>]*>|<\/style\s*>/ig,'');
          cssList.push({
            source:href,
            id:id,
            url:'',
            type:'inline',
            isDone:true,
            groupName:groupName,
            fromNet:false
          })
        }
        //如果存在分组信息
        // if(groupName && !cssGroupList[groupName]){
        //   return '<!--css{{'+groupName+'}}-->';
        // }
        return '';
      });
      RegExp.index=0;
      //process the js part
      //遍历所有的script标签内容，并获取对应的属性值
      fileDone.content = src.replace(/<script[^>]*>(?:[\s\S]*?)<\/script\s*>/ig,function(str){
        var href, id, isAlone, isHeader, groupName, group;
        //igonore this part
        if(/\s+ignore=(?:"|')?true(?:"|')?/i.test(str)){
          return str;
        }
        //is need to keep alone( when the jscontent need to merge to one file but this part), just do minify work
        isAlone = /\s+alone=(?:"|')?true(?:"|')?/i.test(str);
        //is this part should be merge to another file insert at the front of body tag. The default place is at the end of body tag.
        isHeader = /\s+header=(?:"|')?true(?:"|')?/i.test(str);

        group = str.match(/\s+group=(?:"|')?([^\s"']+)(?:"|')?/i);
        groupName = group && group[1];

        href = str.match(/^<script[^>]+src=(?:"|')\s*(\S+)\s*(?:"|')/i);
        id='script'+jsList.length;
        //如果是外联引用
        if(href && href[1]){
          jsList.push({
            id:id,
            url:href[1],
            source:'',
            type:'link',
            isDone:false,
            isAlone:isAlone,
            isHeader:isHeader,
            groupName: groupName,
            fromNet:Util.isUrl(href[1])
          });
        }else{
          href = str.replace(/<script[^>]*>|<\/script\s*>/ig,'');
          jsList.push({
            id:id,
            url:'',
            source:href,
            type:'inline',
            isDone:true,
            isAlone:isAlone,
            isHeader:isHeader,
            groupName: groupName,
            fromNet:false
          })
        }
        //如果存在分组信息
        if(groupName && !jsGroupList[groupName]){
          return '<!--js{{'+groupName+'}}-->';
        }else if(groupName){
          return '';
        }
        return '<script type="text/javascript">{{'+id+'}}</script>';
      });
      //merge the css content
      //get the remote content first
      //根据上面的列表获取对应的内容
      cssList.map(function(item){
        var content,
            _url;
        if('link' == item.type){
          //if the absolute path
          if(item.fromNet){
            _url = item.url;
          }else{
            //本地读取
            _url = path.dirname(filepath)+'/'+item.url;
          }
          //如果从网络中引用的，就远程获取，然后检查结束
          Util.getContent(_url, function(res){
            Util.log('style:['+item.url+'] load success!');
            item.source = res;
            item.isDone=true;
            checkThisDone();
          });
        }
      });
      //get the remote content first
      //同样遍历所有的js内容
      jsList.map(function(item){
        var content,
            _url;
        if('link' == item.type){
          //if the absolute path
          if(item.fromNet){
            _url = item.url;
          }else{
            _url = path.dirname(filepath)+'/'+item.url;
          }
          Util.getContent(_url, function(res){
            Util.log('script:['+item.url+'] load success!');
            item.source = res;
            item.isDone=true;
            checkThisDone();
          });
        }
      });
      //检查是不是内容都加载完了
      checkThisDone();
    });
  });

};
