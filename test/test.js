/* globals QUnit, test, ok */
require(['jquery'], function($){
    'use strict';

    QUnit.start();

    module('myLibraryTest', {
        setup: function(){
            $('<div id="domDependency"></div>').appendTo(document.body);
        },
        teardown: function(){
            document.body.innerHTML = '';
        }
    });

    test('my test', function(){
        var myDiv = $('#domDependency');
        ok(myDiv, 'everythings is fine');
    });

});
