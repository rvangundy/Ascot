/* global test, ok, equal, deepEqual, Ascot */
'use strict';

// PhantomJS doesn't support bind yet
Function.prototype.bind = Function.prototype.bind || function (thisp) {
    var fn = this;
    return function () {
        return fn.apply(thisp, arguments);
    };
};

/*********************
 *  Framework Setup  *
 *********************/

module('Setup');

test('Ascot', function() {
    ok(typeof Ascot === 'function', 'Ascot is a function in the global space');
});

/***************************
 *  Base Module Formation  *
 ***************************/

module('Base Module', {
    baseModule : Ascot.defineModule({
        propA : 'hello',
        propB : { enm : true, cfg : false, val : 5, wrt: true }
    }),
    desc : {
        enumerable   : true,
        configurable : false,
        value        : 5,
        writable     : true
    }
});

test('Module creation', function() {

    var mod = this.baseModule();

    ok(mod === Object(mod),
        'Module was created');

    equal(mod.propA,
        'hello', 'Normal property was applied');

    deepEqual(
        Object.getOwnPropertyDescriptor(mod, 'propB'),
        this.desc,
        'Descriptor property was applied');
});

/*****************************
 *  Data/Element/Templating  *
 *****************************/

module('Data/Element/Templating', {
    data     : { phrase : 'hello world!' },
    module   : Ascot.defineModule({
        template : function(data) { return '<div>' + data.phrase + '</div>'; }
    }),

    setup : function() {
        document.body.insertAdjacentHTML('beforeend', '<div id="test"></div>');
        this.module = this.module({
            data    : this.data,
            element : document.getElementById('test')
        });
        this.module.data = this.data;
    },

    teardown : function() {
        this.module.destroy();
    }
});

test('Application', function(){

    deepEqual(this.module.data, this.data,
        'Data was set on module');

    deepEqual(this.module._element, document.getElementById('test'),
        'Element was set on module');

    equal(document.getElementById('test').innerHTML, this.data.phrase,
        'Template applied');
});

test('Removal', function() {
    ok(document.getElementById('test'),
        'Module exists');

    this.module.destroy();

    ok(!document.getElementById('test'),
        'Module was destroyed');
});

/********************
 *  Module Options  *
 ********************/

module('Module Options', {
    options : { optA : true },
    module : Ascot.defineModule({
        options : { optA : false }
    }),

    setup : function() {
        this.module = this.module();
        this.module.options = this.options;
        this.module.options = { optB : true };
    }
});

test('Options application', function() {
    equal(this.module.options.optA, true,
        'Module options applied');
    equal(this.module.options.optB, true,
        'Module options updated');
});

/*******************
 *  Data Updating  *
 *******************/

module('Data Updating', {
    module : Ascot.defineModule({
        update : function() { this.didUpdate = true; },
        data : {
            itemB : {
                id : 'itemB',
                itemC : {
                    id : 'itemC'
                }

            }
        }
    }),

    setup : function() {
        this.module = this.module();
        this.module.data = { '#itemC/value' : true };
        this.module.data = { '#/itemB/value' : true };
    }
});

test('Data updating', function() {
    equal(this.module.data.itemB.id, 'itemB',
        'Additional data added to module data');
    ok(this.module.data.itemB.itemC.value,
        'Data updated using an addressed fragment');
    ok(this.module.data.itemB.value,
        'Data updated using a root-addressed fragment');
});

/*********************
 *  Bundle Formation  *
 *********************/

module('Bundle', {
    moduleA : Ascot({
        template : function(data) { return '<div><div id="test">' + data.prompt + '</div><div id="test2"></div></div>'; }
    }),
    moduleB : Ascot({
        template : function() { return '<div>hello, sky!</div>'; }
    }),
    moduleC : Ascot({
        template : function() { return '<div>hello, ocean!</div>'; }
    }),
    data : { prompt : 'hello, world!' },
    test : {},

    setup : function() {
        document.body.insertAdjacentHTML('beforeend', '<div id="main"></div>');

        var test = this.test;

        var main = Ascot.registerBundle('main', {
            target     : '#main',
            module     : this.moduleA,
            controller : function(accessor) { test.accessor = accessor; },
            settings   : {
                data : this.data
            },

            childA : {
                target : '#test',
                bundle : 'moduleB'
            },

            childB : {
                settings : {
                    template : function(data) { return '<div>' + data.prompt + '</div>'; },
                    data     : this.data
                },
                target : '#test2'
            }
        });

        Ascot.registerBundle('moduleB', {
            module : this.moduleB
        });

        Ascot.registerBundle('moduleC', {
            module : this.moduleC
        });

        Ascot.registerBundle('templateA', {
            target : '#main',
            settings : {
                template : function(data) { return '<div>' + data.prompt + '</div>'; },
                data     : this.data
            }
        });

        main.deploy(document);
    },

    teardown : function() {
        var test = document.getElementById('main');
        document.body.removeChild(test);
    }
});

test('Bundle formation', function() {
    ok(document.getElementById('main'),
        'Test div added to body');

    ok(document.getElementById('test'),
        'Module template applied');

    equal(document.getElementById('test').innerHTML, 'hello, sky!',
        'Submodule applied');

    equal(document.getElementById('test2').innerHTML, 'hello, world!',
        'Template submodule applied');

    equal(document.getElementById('test').id, 'test',
        'ID copied');
});

test('Bundle formation with template only', function() {
    ok(Ascot.bundles.templateA,
        'Template bundle added to collection');

    Ascot.bundles.templateA.deploy('#main');

    equal(document.getElementById('main').innerHTML, 'hello, world!',
        'Template applied');
});

test('Controller calling', function() {
    ok(typeof this.test.accessor === 'function',
        'Controller called');

    ok(typeof this.test.accessor.childB === 'function',
        'Child accessors added to parent accessor');

    ok(this.test.accessor().data,
        'Accessor returns module');
});
