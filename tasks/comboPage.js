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
  var Util = require('./lib/util').init(grunt);

  function getContent(url, callback, errorcall){
    var _content='';
    http.get(url, function(res) {
      res.on('data',function(data){
        _content+=data;
      })
      .on('end',function(){
        if('function' === typeof callback){
          callback(_content);
          return;
        }
        console.log("Got response: " + _content);
      });
    }).on('error', function(e) {
      if('function' === typeof errorcall){
        e.url = url;
        errorcall(e);
        return;
      }
      console.log("Got error from ["+url+"]:\n" + e.message);
    });
  }
  //if all done, callback
  function checkAllDone(List, callback){
    var l= List.length;
    while(l--){
      if(!List[l].isDone){
        return;
      }
    }
    callback();
  }

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('combopage', 'combo&min your page to one html file.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
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
    var Alldone = this.async();
    var filesDone=[];
    var _v = Date.now();

    // Iterate over all specified file groups.
    this.files.forEach(function(f) {
      var opt = {
        cssPath: f.cssPath || options.cssPath,
        cssVersion:f.cssVersion || options.cssVersion,
        jsPath:f.jsPath || options.jsPath,
        jsVersion:f.jsVersion || options.jsVersion,
        comboHtml:f.comboHtml || options.comboHtml,
        comboHtmlOptions:f.comboHtmlOptions || options.comboHtmlOptions,
      };
      console.log(opt);
      var filepath = f.src[0];
      //just support one file
      var src =grunt.file.read(filepath);
      var cssList=[], jsList=[];
      var fileDone={
        src:filepath,
        dest:f.dest,
        isDone:false,
        content:'',
        cssList:cssList,
        jsList:jsList
      };
      // function getPathOfUrl(url){
      //   var _l, _i, _temp, _path;
      //   url = url.trim();
      //   _l = url.length;
      //   _i = url.lastIndexOf('/');
      //   _temp = url.lastIndexOf('.');
      //   //if like this  'http://www.ginano.net/blog/'
      //   if(_l-1 == _i){
      //     return url;
      //   }
      //   //if like this 'http://www.ginano.net'
      //   if(_i-1 == url.indexOf('/')){
      //     return url+'/';
      //   }
      //   //if like this 'http://www.ginano.net/blog' or 'http://www.ginano.net/logo.png/a.jpg'
      //   if(_temp>_i){
      //     return url.substring(0, _i+1);
      //   }
      //   return url+'/';
      // }
      /**
      the style background url's path need to be changed.
      **/
      function processContentUrl(item){
        var _opt, relativeRootPath;
        
        _opt = options;
        //the inline style
        if(item.type=='inline'){
          //if insert to html file, there is no change to set
          if(!_opt.cssPath){
            return item.source;
          }
          //if need to save for one file
          item.source=item.source.replace(/url\s*\([^\)]+\)/ig,function(str){
            var _url, _p;
            str = str.replace(/\s+|"|'/ig,'');
            _url = str.match(/^url\(([^\)]+)\)$/i)[1];
            //if the absolute url
            if(/^([a-z]+:)?\/\//i.test(_url)){
              return str;
            }
            //if it is base64 code
            if(/^data:/i.test(_url)){
              return str;
            }
            //if without filename
            if(!/\.\S+$/i.test(_url)){
              return str;
            }
            //progress the relative path
            //get the absolute path
            Util.log(_url+'--------------');
            _p = path.normalize(path.dirname(fileDone.src)+'/'+_url);
            Util.log(_p+'--------------');
            return 'url('+path.relative(_opt.cssPath, _p).replace(/\\/g,'/')+')';
          });
          return item.source;
        }
        //if the relative path of link file
        if(item.type=='link'){
            item.source=item.source.replace(/url\s*\([^\)]+\)/ig,function(str){
              var _url, _p, _path;
              str = str.replace(/\s+|"|'/ig,'');
              _url = str.match(/^url\(([^\)]+)\)$/i)[1];
              //console.log('find:-----'+_url);
              //if the absolute url
              if(/^([a-z]+:)?\/\//i.test(_url)){
                return str;
              }
              //if it is base64 code
              if(/^data:/i.test(_url)){
                return str;
              }
              //if without filename
              if(!/\.\S+$/i.test(_url)){
                return str;
              }
              //if it's the url, just need compute the file url
              if(item.fromNet){
                _path = URL.resolve(item.url, _url);
              }else{
                //_p = path.resolve(item.url, _url);
                _p = path.resolve(path.dirname(fileDone.src), item.url);
                _p = path.resolve(path.dirname(_p), _url);
                Util.log(_p+'--------------');
                relativeRootPath = _opt.cssPath?_opt.cssPath:fileDone.dest;
                Util.log(relativeRootPath+'--------------');
                //如果是文件名称结尾
                relativeRootPath = /\.[a-z0-9]+$/i.test(relativeRootPath)?path.dirname(relativeRootPath):relativeRootPath;
                
                _path = path.relative(relativeRootPath, _p).replace(/\\/g, '/');
              }
              //console.log('result:-----'+_path);
              return 'url('+_path+')';
            });
            return item.source;
        }
      }
      //process css content
      function mergeCSS(){
          var cssMerge='';
          var _temp, _value;
          var _opt= options;
          console.log('start merge and minfy all style content...');
          cssList.forEach(function(item){
            cssMerge+= processContentUrl(item);
          });
          //if has set the output option
          if(_opt.cssPath){
            //if with the setting filename
            if(path.extname(_opt.cssPath)){
              _value = _opt.cssPath;
            }else{
              _temp = path.basename(fileDone.src);
              _value = path.normalize(_opt.cssPath)+'\\'+_temp+'.css';
            }
            _temp = _opt.cssVersion?('?v='+_v):'';
            grunt.file.write(_value, cssmin.process(cssMerge));
            fileDone.content = fileDone.content.replace(/<\/head>/i,function(str){
              return '<link rel="stylesheet" type="text/css" href="'+path.relative(path.dirname(fileDone.dest), _value)+_temp+'" /></head>';
            });
            console.log('merge the style content to file ['+_value+'] completed!');
          }else{
            fileDone.content = fileDone.content.replace(/<\/head>/i,function(str){
              return '<style type="text/css">'+cssmin.process(cssMerge)+'</style></head>';
            });
            console.log('merge the style content to html file completed!');
          }
      }
      //process js content{
      function mergeJS(){  
        var jsFooterMerge='', jsHeaderMerge='';
        var _temp, _value, _headerPath, _footerPath;
        var _opt =options;
        console.log('start miny every script content');
        if(_opt.jsPath){
          //if with the setting filename
          if(path.extname(_opt.jsPath)){
            _value = _opt.jsPath;
          }else{
            _temp = path.basename(fileDone.src);
            _value = path.normalize(_opt.jsPath)+'\\'+_temp+'.js';
          }
          jsList.forEach(function(item){
            var _reg;
            //if this part need keep alone, just minfy it without merge
            if(item.isAlone){
              _reg = new RegExp('{{'+item.id+'}}','i');
              fileDone.content = fileDone.content.replace(_reg, function(str){
                return uglify.minify(item.source, {fromString:true}).code;
              });
            }else{
			  item.source =';'+item.source;              if(item.isHeader){
                jsHeaderMerge +=item.source;
              }else{
                jsFooterMerge += item.source;
              }
              _reg = new RegExp('<script type="text/javascript">{{'+item.id+'}}</script>','i');
              fileDone.content = fileDone.content.replace(_reg,function(str){
                return '';
              });
            }
          });
          _temp = _opt.jsVersion?('?v='+_v):'';
          //if has some header setting
          if(jsHeaderMerge.length){
            _headerPath = _value.replace(/\.js$/i,'.header.js');
            grunt.file.write(_headerPath, uglify.minify(jsHeaderMerge, {fromString: true}).code);
          }
          if(jsFooterMerge.length){
            _footerPath = _headerPath?_value.replace(/\.js$/i,'.footer.js'):_value;
            grunt.file.write(_footerPath, uglify.minify(jsFooterMerge, {fromString: true}).code);
          }
          //insert the file import
          if(_headerPath){
            fileDone.content = fileDone.content.replace(/<\/head\s*>/i,function(str){
              return '<script  type="text/javascript" src="'+path.relative(path.dirname(fileDone.dest), _headerPath)+_temp+'"></script></head>';
            });
            console.log('merge the script content to file ['+_headerPath+'] completed!');
          }
          if(_footerPath){
            fileDone.content = fileDone.content.replace(/<\/body>/i,function(str){
              return '<script  type="text/javascript" src="'+path.relative(path.dirname(fileDone.dest), _footerPath)+_temp+'"></script></body>';
            });
            console.log('merge the script content to file ['+_footerPath+'] completed!');
          }
        }else{
          jsList.forEach(function(item){
            var _js,_reg;
            try{
              _js = uglify.minify(item.source, {fromString: true}); 
            }catch(e){
              console.error('|||||||||||||||||||||---------minify error, please check your code !-------------||||||||||||||||||||||||\n');
              console.log(item.source);
              _js = {code:item.source};
            }
            _reg = new RegExp('{{'+item.id+'}}','i');
            fileDone.content = fileDone.content.replace(_reg,function(str){
              console.log('script:['+item.id+'] replace completed!');
              return _js.code;
            });
          });
          console.log('merge the script content to html file completed!');
        }
      }
      //process html string
      function mergeHTML(){
        var _opt = options;
        if(_opt.comboHtml){
          fileDone.content
          fileDone.content= htmlmin.minify(fileDone.content, _opt.comboHtmlOptions);
          console.log('minfy the html string with you options');
        }
      }
      //check this fileis Done
      function checkThisDone(){
        var allList = cssList.concat(jsList);
        //this file is process done!
        checkAllDone(allList, function(){
          if(fileDone.isDone){
            return;
          }
          mergeCSS();
          mergeJS();

          mergeHTML();
          grunt.file.write(fileDone.dest, fileDone.content);
          fileDone.isDone=true;
          console.log('\n--------------------------'+fileDone.src+' has been  compounded to '+fileDone.dest+'!--------------------------');
          checkAllDone(filesDone,function(){
            console.log('all task has done!');
            Alldone();
          });
        });
      }


      filesDone.push(fileDone);
      //process the style part
      console.log('start getting the style tags');
      src = src.replace(/<link\s+(?:[^>]+\s+)*type=["']\s*text\/css\s*["'](?:\s+[^>]+)*[\s+\/]?>|<style[^>]*>(?:[\S\s]*?)<\/style\s*>/ig,function(str){
        var href, id;
        //igonore this part
        if(/\s+ignore=(?:"|')?true(?:"|')?/i.test(str)){
          return str;
        }
        href = str.match(/href=(?:"|')?([^"' >]+)(?:"|')?/i);
        id='css'+cssList.length;
        //如果是外联引用
        if(href && href[1]){
          cssList.push({
            source:'',
            id:id,
            type:'link',
            url:href[1],
            isDone:false,
            fromNet:/http:\/\//i.test(href[1])
          });
        }else{
          href = str.replace(/<style[^>]*>|<\/style\s*>/ig,'');
          cssList.push({
            source:href,
            id:id,
            url:'',
            type:'inline',
            isDone:true,
            fromNet:false
          })
        }
        return '';
      });
      RegExp.index=0;
      //process the js part
      //process the style part
      console.log('start getting the script tags');
      fileDone.content = src.replace(/<script[^>]*>(?:[\s\S]*?)<\/script\s*>/ig,function(str){
        var href, id, isAlone, isHeader;
        //igonore this part
        if(/\s+ignore=(?:"|')?true(?:"|')?/i.test(str)){
          return str;
        }
        //is need to keep alone( when the jscontent need to merge to one file but this part), just do minify work
        isAlone = /\s+alone=(?:"|')?true(?:"|')?/i.test(str);
        //is this part should be merge to another file insert at the front of body tag. The default place is at the end of body tag.
        isHeader = /\s+header=(?:"|')?true(?:"|')?/i.test(str);

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
            isHeader:isHeader
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
            isHeader:isHeader
          })
        }
        return '<script type="text/javascript">{{'+id+'}}</script>';
      });
      //merge the css content
      //get the remote content first
      console.log('start request the imported style file');
      cssList.map(function(item){
        var content;
        if('link' == item.type){
          //if the absolute path
          if(item.fromNet){
            getContent(item.url, function(res){
              console.log('style:['+item.url+'] load success!');
              item.source = res;
              item.isDone=true;
              checkThisDone();
            });
          }else{
            content = grunt.file.read(path.dirname(filepath)+'/'+item.url);
            console.log('style:['+item.url+'] read success!');
            item.source = content;
            item.isDone =true;
            checkThisDone();
          }
        }
      });
      //get the remote content first
      console.log('start request the imported script file');
      jsList.map(function(item){
        var content;
        if('link' == item.type){
          //if the absolute path
          if(/http:\/\//.test(item.url)){
            getContent(item.url, function(res){
              console.log('script:['+item.url+'] load success!');
              item.source = res;
              item.isDone=true;
              checkThisDone();
            });
          }else{
            content = grunt.file.read(path.dirname(filepath)+'/'+item.url);
            console.log('script:['+item.url+'] read success!');
            item.source = content;
            item.isDone =true;
            checkThisDone();
          }
        }
      });
      checkThisDone();
    });
  });

};
