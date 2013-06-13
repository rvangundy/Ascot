/* global test, ok, equal, _, Ascot, Handlebars, $ */
'use strict';

test('Basic Test', function() {
    var ascot = Ascot;
    var template = Handlebars.compile($('#templateA').html());
    var personMaker = ascot({ template : template });

    $('body').append('<div class="person"></div><div class="person"></div>');

    ok(_.isFunction(template), 'Loaded template');
    ok(_.isFunction(ascot), 'Ascot is a function');

    personMaker('.person', [{ name : 'Plato', age : 2441 }, { name : 'Aristotle', age : 2397 }]);

    equal($('.person > li').html(), 'Name : Plato', 'Template applied');

    // mod.destroy();

    // ok(!$('.person').length, 'Module and corresponding element destroyed');
});
