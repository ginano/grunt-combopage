/*
 * grunt-comboPage
 * https://github.com/ginano/grunt-comboPage
 *
 * Copyright (c) 2013 ginano
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Configuration to be run (and then tested).
    combopage: {
        files: {
          'tmp/default_options': ['test/fixtures/testing', 'test/fixtures/123'],
        }
      },
      test: {
        files: {
          'test_new.html': ['test.html'],
        }
      },
      custom_options: {
        files: {
          'tmp/custom_options': ['test/fixtures/testing', 'test/fixtures/123'],
        }
      }
    }
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // By default, lint and run all tests.
  grunt.registerTask('default', ['comboPage']);

};
