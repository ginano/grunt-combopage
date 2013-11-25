# grunt-combopage

> It's a tool for combo and min the html file, and it could minfiy the remotet css files and js files. all the content could be merged to one file!

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-combopage --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-combopage');
```

You can run the testcase. change you path to ./node_modeules/grunt-combopage/, and run grunt. You could see the result file ./test/test_new.html was created! The ./Gruntfile.js has the base function of this task, so you could use it as that. If you have any question, you can contact me at sina weibo: http://weibo.com/ginano
## The "combopage" task

### Overview
In your project's Gruntfile, add a section named `combopage` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  combopage: {
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
})
```

### Options

#### options.cssPath
Type: `String`
Default value: `'./'`

A string value that is used to as the merged CSS file, it an relative path of current path.
if you have set this value( the value is not empty string or null), all the style content but ignored will be merged to one file, and placed in the path as you set. If this value isn't contain the fileName  with extension '.css', the merged css  fileName will be the same as html file.

#### options.cssVersion
Type: `Boolean`
Default value: `false`

A Boolean value tell the task to add version number to the link import link, such as `'<link type="text/css" href="merge.js?v=201221212"/>`'.


#### options.jsPath
Type: `String`
Default value: `'./'`

A string value that is used to as the merged JS file, it an relative path of current path.
if you have set this value( the value is not empty string or null), all the js content but ignored will be merged to one file, and placed in the path as you set. If this value isn't contain the fileName  with extension '.js', the merged js  fileName will be the same as html file.

#### options.jsVersion
Type: `Boolean`
Default value: `false`

A Boolean value tell the task to add version number to the script import link, such as `'<script type="text/javascript" src="merge.js?v=201221212"></script>`'.

#### options.comboHtml
Type: `Boolean`
Default value: `false`

A Boolean value tell the task to minfy the html struct string. it depend on the node module html-minifier.

#### options.comboHtmlOptions
Type: `Obeject`
Default value: `{}`

the options for  html-minifier. View this document for more infomation about this options: 'http://perfectionkills.com/experimenting-with-html-minifier/#options'.


### Usage Examples

#### Default Options
In this example, the default options are used to do something with whatever. So if the `testing` file has the content `Testing` and the `123` file had the content `1 2 3`, the generated result would be `Testing, 1 2 3.`

##### the Gruntfile.js 
```js
grunt.initConfig({
  combopage: {
    options:{
      //cssPath:'output/index_all.css',
      //cssVersion:true,
      jsPath:'output/index_all.js',
      jsVersion:true,
      // the options to open the htmlminifier, not recommend. 
      //if you want ,please read this http://perfectionkills.com/experimenting-with-html-minifier/#options
      comboHtml:true, 
      comboHtmlOptions:{
        removeComments:true,
        collapseWhitespace:true
      }
    },
    files: {
      'output/index.html': ['src/index.html'],
    },
  },
});
grunt.loadTasks('grunt-combopage');
grunt.registerTask('default', ['combopage']);

```
##### the src/index.html
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>grunt-combopage example</title>
  <link rel="profile" href="http://gmpg.org/xfn/11" />
  <link rel="stylesheet" type="text/css" media="all" href="http://www.ginano.net/wp-content/themes/twentyten/style.css" />
  <!--ignore this content, keep this status-->
  <link rel="stylesheet" type="text/css" media="all" ignore="true" href="http://www.ginano.net/wp-content/themes/twentyten/style.css" />
  <link rel="stylesheet" type="text/css"   href="../css/style.css" />
  <!--this part with the attribute alone="true' will keep alone with the merge file-->
  <style type="text/css" alone="true">
    .class{color:#fff;}
  </style> 
  <style type="text/css">
    .class{color:#fff;}
  </style>
  <!--the default script will merged to one file, whilch could be inserted to the end of body. but if you have set the attribute header="true", this part could be inserted to the end of head-->
  <script type="text/javascript" src="../js/jquery.js" header="true"></script>
  <!--ignore this content, keep this status-->
  <script type="text/javascript" src="http://www.ginano.net/js/underscore.js" ignore="true"></script>
  <script type="text/javascript" src="http://www.ginano.net/js/backbone.js"></script>
</head>
<body>
  <script type="text/javascript">
    var a=1;
  </script>
</body>
</html>
```

so, with above config, this file will create a new file output/index.html. And it will with one ignored css import and all other style content before '</head>`. Of course, it will with one ignored js file import and all other minified js content  in output/index_all.js, which could be imported before the end of body.

if you want to prove it, please try 'grunt' command!

just do it, and enjoy it!

#### Custom Options
In this example, custom options are used to do something else with whatever else. So if the `testing` file has the content `Testing` and the `123` file had the content `1 2 3`, the generated result in this case would be `Testing: 1 2 3 !!!`

```js
grunt.initConfig({
  combopage: {
    files: {
      'dest/default_options': ['src/testing'],
    },
  },
})
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
2013-8-15 0.1.0 create the plugin with minfy function of js and css

2013-8-19 0.1.1~0.1.4 update with minfy function of html, and add the options to create independent css file or js file. 

2013-8-21 0.1.5~0.1.6 Firstly, i add the option of alone="true" for the script tag, which allow the content keep alone from the merge file. so you should be careful to use it because of the order dependencies of jscode. Secondly, change is the adding of header="true" to keep the merge file content inserted at the end of head tag. so you can merge two js file at the end of head and the end of body. The last update is to fixed the bug of style url such as background:url(xxx.png), because of that if i change the path of css content, the url should be changed too. 
2013-11-25 0.1.7 support grouping the content. in other word, you can spec that a.js and b.js compress to ab.js, but c.js and d.js to cd.js. please read the source code './task/*' for more functions.

