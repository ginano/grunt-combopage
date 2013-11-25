'use strict';

var Path = require('path');
var Url = require('url');
var Http = require('http');
var File = require('fs');

/**
 * output the log to the console
 * @param  {String} str
 * @param  {String} type 'log'/'error'
 * @return {undefined}
 */
function log(str, type) {
	switch(type){
		case 'error':
			console.error(str);
			break;
		case 'warn':
			console.warn(str);
			break;
		case 'info':
			console.info(str);
			break;
		default:
			console.log(str);
	}
}
/**
 * [hasOwn description]
 * @param  {[type]}  obj [description]
 * @param  {[type]}  p   [description]
 * @return {Boolean}     [description]
 */
function hasOwn(obj, p){
	return Object.prototype.hasOwnProperty.call(obj,p);
}
/**
 * 扩展对象元素
 * @param {Boolean} [isDeep=true] 是否深度复制
 * @param {Object} originObj 原始对像
 * @param {Object} newObj   新对象
 * @param {Boolean} isOverride  [option][default=true]是否覆盖已有对象
 * @param {Array} selectedProperty [option]覆盖列表
 */
function extend(isDeep, originObj, newObj, isOverride,selectedProperty){
    var p,item;
    //如果没有传这个值
    if('boolean'!==isDeep){
    	originObj = isDeep;
    	newObj = originObj;
    	isOverride = newObj;
    	selectedProperty = isOverride;
    	isDeep = true;
    }
    console.log(newObj);
    originObj=originObj||{};
    if(!newObj){
        return;
    }
    if(isOverride instanceof Array){
        selectedProperty=isOverride;
        isOverride=true;
    }
    if(isOverride===undefined){
        isOverride=true;
    }
    if(selectedProperty && (p=selectedProperty.length)){
        while(p--){
            item=selectedProperty[p];
            if(isDeep || hasOwn.call(newObj,item)){
                (isOverride||originObj[item]===undefined) && (originObj[item]= cloneObject(newObj[item]));
            }
        }
    }else{
        for ( p in newObj) {
            item=newObj[p];
            if (isDeep  || hasOwn.call(newObj, p)) {
                (isOverride|| originObj[p]===undefined) && (originObj[p]= cloneObject(item));
            }
        }
    }
    return originObj;
}
/**
 *深度copy一个对象 
 * @param {Object} o
 * @param {Boolean} isCloneFunction 是否复制函数
 * @param {Boolean} isClonePrototype 是否复制函数的扩展属性
 */
function cloneObject(o,isCloneFunction,isClonePrototype){
    function copyObject(obj,isCopyFunction,isCopyPrototype){
    	var objClone,
	    	con,
	    	prop;
	    if(
          obj===undefined
          ||obj===null 
          || 'string' === typeof obj 
          || 'boolean' === typeof obj 
          || 'number' === typeof obj
          ){
                return objClone=obj;
        }
	    con=obj.constructor;
	    if (con == Object){
	        objClone = new con(); 
	    }else if(con==Function){
	    	if(isCopyFunction){
	    		objClone=eval('['+obj.toString()+']')[0];
	    	}else{
	    		return objClone=obj;
	    	}
	    }else{
	        objClone = new con(obj.valueOf()); 
	    }
	    for(var key in obj){
	        if ( objClone[key] != obj[key] ){ 
	            if ( typeof(obj[key]) == 'object' ){ 
	                objClone[key] = copyObject(obj[key],isCopyFunction);
	            }else{
	                objClone[key] = obj[key];
	            }
	        }
	    }
	    /**
	     *当且仅当是深度复制函数，并且需要复制当且的扩展属性的时候才执行 
	     */
	    if(con==Function&&isCopyFunction&&isCopyPrototype){
	    	prop=obj.prototype;
	    	for(var key in prop){
	            if ( typeof(prop[key]) == 'object' ){ 
	                objClone.prototype[key] = copyObject(prop[key],isCopyFunction,isCopyPrototype);
	            }else{
	                objClone.prototype[key] = prop[key];
	            }
		    }
	    }
	    objClone.toString = obj.toString;
	    objClone.valueOf = obj.valueOf;
	    return objClone; 
    }
    return copyObject(o,isCloneFunction,isClonePrototype);
}
/**
 * check the str is or isnot url, such as http:// or //www.baidu.com
 * @param  {String}  str
 * @return {Boolean}
 */
function isUrl(str) {
	return /^(\S+:)?\/\//i.test(str.trim());
}
/**
 * 是否是文件
 * @return {Boolean} true--file/false-direction
 */
function isFilePath(str){
	return /\.[a-z0-9]+$/i.test(str);
}
/**
 * check the type of obj is function
 * @param  {Object}  obj
 * @return {Boolean}
 */
function isFunction(obj){
	return 'function' === typeof obj;
}
/**
 * get the file content of url, when the content has been gotten, it will call the function of callback
 * please pay attention that the function is asynchronous
 * @param  {String}   url
 * @param  {Function} callback
 * @param  {Function}   errorcall
 * @return {undefined}
 */
function getContent(url, callback, errorcall) {
	var _content = '';
	//from net
	if (isUrl(url)) {
		//下载内容，监听数据成功的事件
		Http.get(url, function(res) {
			res.on('data', function(data) {
				_content += data;
			})
				.on('end', function() {
					if (isFunction(callback)) {
						callback(_content);
						return;
					}
					log("Got response: " + _content);
				});
		}).on('error', function(e) {
			if (isFunction(errorcall)) {
				e.url = url;
				errorcall(e);
				return;
			}
			log("Got error from [" + url + "]:\n" + e.message, 'error');
		});
	} else {// read from local disk
		setTimeout(function() {
			try {
				//should clear the query string
				_content = File.readFileSync(url.replace(/[?#]\S+$/i,'')).toString();
				if (isFunction(callback)) {
					callback(_content);
					return;
				}
				log("Got response: " + _content);
			} catch (e) {
				if (isFunction(errorcall)) {
					e.url = url;
					errorcall(e);
					return;
				}
				log("Got error from [" + url + "]:\n" + e.message, 'error');
			}
		}, 0);
	}
}
/**
 * get the absoulte path of file relativePath, which relatived to targetFilePath
 * @param  {String} targetFilePath
 * @param  {String} relativePath
 * @return {String}
 */
function getAbsolutePath(targetFilePath, relativePath) {
	relativePath = relativePath.trim();
	if (isUrl(relativePath)) {
		return relativePath;
	}
	if (isUrl(targetFilePath)) {
		return Url.resolve(targetFilePath, relativePath);
	}
	return Path.normalize(Path.dirname(targetFilePath) + '/' + relativePath);
}
/**
 * get the relative path of file sourcePath, which relatived to targetFilePath
 * @param  {[type]} targetFilePath
 * @param  {[type]} sourcePath
 * @return {[type]}
 */
function getRelativePath(targetFilePath, sourcePath) {
	sourcePath = sourcePath.trim();
	if (isUrl(sourcePath)) {
		return sourcePath;
	}
	return Path.relative(Path.dirname(targetFilePath), sourcePath).replace(/\\/g, '/');
}
/**
 * are all  the List items have completed?
 * @param  {Array} checkList
 * @param {Function} callback if all have done, call this function.
 * @return {Boolean}
 */
function checkAllDone(checkList, callback){
	var l;
    if(checkList.__isDone){
      return;
    }
    if(checkList instanceof Array){
    	l= checkList.length;
    	while(l--){
	      if(!checkList[l].isDone){
	        return;
	      }
	    }
    } else {
    	for(l in checkList){
    		if(!checkList[l].isDone){
    			return;
    		}
    	}
    }
    //has done, may be the array is nevery use
    checkList.__isDone=true;
    callback();
}
module.exports= {
	log: log,
	isUrl: isUrl,
	isFunction: isFunction,
	isFilePath:isFilePath,
	getContent: getContent,
	getAbsolutePath: getAbsolutePath,
	getRelativePath: getRelativePath,
	checkAllDone: checkAllDone,
	extend:extend,
	hasOwn:hasOwn,
	cloneObject:cloneObject
};
