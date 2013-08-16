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
  var http = require('http');
  var jshint = require("jshint").JSHINT;
  var uglify = require('uglify-js');
  var cssmin = require('clean-css');

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
      punctuation: '',
      separator: ''
    });
    var Alldone = this.async();
    var filesDone=[];
    // Iterate over all specified file groups.
    this.files.forEach(function(f) {
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

      filesDone.push(fileDone);
      //check this fileis Done
      function checkThisDone(){
        var List = cssList.concat(jsList);
        //this file is process done!
        checkAllDone(List, function(){
          //do some thing after this
          //check the css syntax and merge/min it
          console.log('start merge and minfy all style content...');
          var cssMerge='';
          cssList.forEach(function(item){
            cssMerge+=item.source;
          });
          fileDone.content = fileDone.content.replace(/<\/head>/i,function(str){
            return '<style type="text/css">'+cssmin.process(cssMerge)+'</style></head>';
          });
          console.log('start miny every script content');
          //ugly the js content
          jsList.forEach(function(item){
            var _js,_reg;
            //if(!jshint(item.source)){
            //  console.log(jshint.errors);
            //  return;
            //}
            _js = uglify.minify(item.source, {fromString: true});
            _reg = new RegExp('{{'+item.id+'}}','i');
            fileDone.content = fileDone.content.replace(_reg,function(str){
              console.log('script:['+item.id+'] replace completed!');
              return _js.code;
            });
          });

          grunt.file.write(fileDone.dest, fileDone.content);
          fileDone.isDone=true;
          console.log(fileDone.src+' has been  compounded to '+fileDone.dest+'!');
          console.log('\n------------------------------------********one file over********---------------------------------------');
          checkAllDone(filesDone,function(){
            Alldone();
          })
        });
      }
      //process the style part
      console.log('start getting the style tags');
      src = src.replace(/<link\s+\S*type="\s*text\/css\s*"[^>]*>|<style[^>]*>(?:[\S\s]*?)<\/style\s*>/ig,function(str){
        var href = str.match(/href=(?:"|')?([^"' >]+)(?:"|')?/i);
        var id='css'+cssList.length;
        //如果是外联引用
        if(href && href[1]){
          cssList.push({
            source:'',
            id:id,
            type:'link',
            url:href[1],
            isDone:false
          });
        }else{
          href = str.replace(/<style[^>]*>|<\/style\s*>/ig,'');
          cssList.push({
            source:href,
            id:id,
            url:'',
            type:'inline',
            isDone:true
          })
        }
        return '';
      });
      //merge the css content
      //get the remote content first
      console.log('start request the imported style file');
      cssList.map(function(item){
        var content;
        if('link' == item.type){
          //if the absolute path
          if(/http:\/\//.test(item.url)){
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
      RegExp.index=0;
      //process the js part
      //process the style part
      console.log('start getting the script tags');
      fileDone.content = src.replace(/<script[^>]*>(?:[\s\S]*?)<\/script\s*>/ig,function(str){
        var href = str.match(/src=(?:"|')\s*(\S+)\s*(?:"|')/i);
        var id='script'+jsList.length;
        //如果是外联引用
        if(href && href[1]){
          jsList.push({
            id:id,
            url:href[1],
            source:'',
            type:'link',
            isDone:false
          });
        }else{
          href = str.replace(/<script[^>]*>|<\/script\s*>/ig,'');
          jsList.push({
            id:id,
            url:'',
            source:href,
            type:'inline',
            isDone:true
          })
        }
        return '<script type="text/javascript">{{'+id+'}}</script>';
      });
      //merge the css content
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
    });
  });

};
