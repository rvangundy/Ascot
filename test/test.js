/* global test, ok, equal, _, Ascot, Handlebars, $ */
'use strict';

test('Basic Test', function() {

    ok(_.isFunction(Ascot), 'Ascot is a function in the global space');

    var module = Ascot.createModule();

    ok(_.isObject(module), 'Module was created');

    module.template = function() { return '<div class="test">Hello World!</div>'; };
    module.element = document.getElementById('qunit');

    ok($(module.element).hasClass('test'), 'Setting module element instantly instantiated the module');

    module.remove();

    ok(!$(module.element).hasClass('test'), 'Removing the module restored the element to its original state');

});
