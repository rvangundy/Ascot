module.exports = function (grunt) {
    'use strict';

    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

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
        jsdoc : {
            dist : {
                src: ['./scripts/*.js'],
                options: {
                    destination: 'doc'
                }
            }
        },
        connect: {
            test: {
                options: {
                    port: 8000,
                    base: '.'
                }
            }
        },
        requirejs: {
            ascot : {
                options : {
                    name                    : 'ascot',
                    out                     : 'ascot.js',
                    baseUrl                 : './scripts',
                    optimize                : 'none',
                    optimizeCss             : 'none',
                    findNestedDependencies  : true,
                    preserveLicenseComments : false,
                    useStrict               : true,
                    wrap                    : false,
                    include                 : ['EventEmitter', 'DOMView', 'Model']
                }
            }
        },
        bump: {
            options: {
                files              : ['package.json', 'bower.json'],
                updateConfigs      : [],
                commit             : false,
                commitMessage      : 'Release v%VERSION%',
                commitFiles        : ['package.json'],
                createTag          : false,
                tagName            : 'v%VERSION%',
                tagMessage         : 'Version %VERSION%',
                push               : false,
                pushTo             : 'upstream',
                gitDescribeOptions : '--tags --always --abbrev=1 --dirty=-d'
            }
        },
        open : {
            test : {
                path: 'http://localhost:8000/test',
                app: 'Google Chrome'
            }
        },
        watch: {
            scripts: {
                files: ['scripts/*.*', 'test/*.*']
            }
        }
    });

    grunt.registerTask('test', [
        'connect:test',
        'open:test',
        'watch'
    ]);

    grunt.registerTask('default', [
        'jshint',
        'requirejs:ascot',
        'bump'
    ]);
};
