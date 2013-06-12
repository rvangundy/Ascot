module.exports = function (grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-qunit-amd');

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [
                'Gruntfile.js',
                './scripts/{,*/}*.js',
                'test/spec/{,*/}*.js'
            ]
        },
        'qunit_amd': {
            test: {
                tests: [
                    'test/**/*.js'
                ],
                require: {
                    baseUrl: './',
                    paths: {
                        scripts    : 'scripts/',
                        jquery     : 'components/jquery/jquery',
                        Handlebars : 'components/handlebars/handlebars',
                        text       : 'components/requirejs-text/text',
                        hbars      : 'components/requirejs-handlebars/hbars'
                    },
                    shims: {
                        jquery : {
                            exports : 'jquery'
                        },
                        Handlebars : {
                            exports : 'Handlebars'
                        }
                    }
                }
            }
        }
    });

    grunt.registerTask('test', [
        'qunit_amd'
    ]);

    grunt.registerTask('default', [
        'jshint',
        'test'
    ]);
};
