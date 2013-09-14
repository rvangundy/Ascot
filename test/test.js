/* global test, ok, equal, deepEqual, ascot */
'use strict';

// PhantomJS doesn't support bind yet
Function.prototype.bind = Function.prototype.bind || function (thisp) {
    var fn = this;
    return function () {
        return fn.apply(thisp, arguments);
    };
};

/******************************
 *  Base Prototype Formation  *
 ******************************/

module('Exhaustive Module Definition', {
    descriptorA : {
        enumerable   : true,
        configurable : true,
        writable     : true,
        value        : 'hello'
    },

    descriptorB : {
        enumerable   : true,
        configurable : false,
        writable     : true,
        value        : 5
    },

    setup : function() {
        function subtract5(val) { return val - 5; }
        function returnVal(val) { return val; }
        function subtract3(val) { return val - 3; }
        function setPropE(val) { this.propE = val; }

        this.SimpleClass = ascot({
            propA     : 'hello',
            propB     : { enm : true, cfg : false, val : 5, wrt: true },
            funcA     : function() { return 13; },
            funcB     : function(val) { this.propD = val; },
            construct : function(val) { this.propC = val; }
        });

        this.MixedClassA = ascot([this.SimpleClass], {
            funcA : { $chain   : [this.SimpleClass, subtract5] },
            funcB : { $iterate : [this.SimpleClass, returnVal] }
        });

        this.MixedClassB = ascot([this.MixedClassA], {
            funcA : { $after  : subtract3 },
            funcB : { $before : setPropE }
        });

        this.simpleModule = new this.SimpleClass(10);
        this.mixedModuleA = new this.MixedClassA(11);
        this.mixedModuleB = new this.MixedClassB(13);
    }
});

test('Descriptor expansion', function() {
    var SimpleClass = this.SimpleClass;

    deepEqual(SimpleClass.descriptor.propA, this.descriptorA,
        'A non-configured property was given a default descriptor');

    deepEqual(SimpleClass.descriptor.propB, this.descriptorB,
        'A shorthand descriptor was expanded appropriately');
});

test('Object construction', function() {
    var simpleModule = this.simpleModule;

    deepEqual(Object.getOwnPropertyDescriptor(simpleModule, 'propA'), this.descriptorA,
        'Default property was defined');

    deepEqual(Object.getOwnPropertyDescriptor(simpleModule, 'propB'), this.descriptorB,
        'Shorthand property was defined');

    equal(simpleModule.propC, 10,
        'Constructor was called');
});

test('Iterating mixin modifiers', function() {
    var mixedModuleA = this.mixedModuleA;

    deepEqual(Object.getOwnPropertyDescriptor(mixedModuleA, 'propA'), this.descriptorA,
        'Default property was defined');

    deepEqual(Object.getOwnPropertyDescriptor(mixedModuleA, 'propB'), this.descriptorB,
        'Shorthand property was defined');

    equal(mixedModuleA.propC, 11,
        'Constructor was called');

    equal(mixedModuleA.funcA(), 8,
        'Chained method called');

    equal(mixedModuleA.funcB(12), 12,
        'Iterated method returned last value');

    equal(mixedModuleA.propD, 12,
        'Original method added to iterator and called');
});

test('Appending mixin modifiers', function() {
    var mixedModuleB = this.mixedModuleB;

    deepEqual(Object.getOwnPropertyDescriptor(mixedModuleB, 'propA'), this.descriptorA,
        'Default property was defined');

    deepEqual(Object.getOwnPropertyDescriptor(mixedModuleB, 'propB'), this.descriptorB,
        'Shorthand property was defined');

    equal(mixedModuleB.funcA(), 5,
        'Function appended after chained iterator');

    equal(mixedModuleB.funcB(14), 14,
        'Iterated method returned last value');

    equal(mixedModuleB.propE, 14,
        'Function appended before iterator');
});
