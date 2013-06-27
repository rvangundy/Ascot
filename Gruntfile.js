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
        qunit: {
            all: {
                options: {
                    urls: [
                        'http://localhost:8000/test/index.html'
                    ]
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
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['scripts/ascot.js','scripts/utilities.js','scripts/module.js','scripts/build.js'],
                dest: 'ascot.js'
            }
        }
    });

    grunt.registerTask('test', [
        'connect:test',
        'qunit'
    ]);

    grunt.registerTask('default', [
        'jshint',
        'test',
        'concat'
    ]);
};
