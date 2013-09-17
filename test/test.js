'use strict';

var assert = chai.assert;

/*******************************
 *  Basic Object Construction  *
 *******************************/

describe('Ascot', function() {
    var descriptorA = {
        enumerable   : true,
        configurable : true,
        writable     : true,
        value        : 'hello'
    };

    var descriptorB = {
        enumerable   : true,
        configurable : false,
        writable     : true,
        value        : 5
    };

    function subtract5(val) { return val - 5; }
    function returnVal(val) { return val; }
    function subtract3(val) { return val - 3; }
    function setPropE(val) { this.propE = val; }

    var SimpleClass = ascot({
        propA     : 'hello',
        propB     : { enm : true, cfg : false, val : 5, wrt: true },
        propX     : { enm : true, cfg : false, val : 10, wrt: true },
        funcA     : function() { return 13; },
        funcB     : function(val) { this.propD = val; },
        construct : function(val) { this.propC = val; }
    });

    var MixedClassA = ascot([SimpleClass], {
        funcA : { $chain    : [SimpleClass, subtract5] },
        funcB : { $iterate  : [SimpleClass, returnVal] },
        propX : { $override : 7 }
    });

    var MixedClassB = ascot([MixedClassA], {
        funcA : { $after  : subtract3 },
        funcB : { $before : setPropE }
    });

    var simpleModule = new SimpleClass(10);
    var mixedModuleA = new MixedClassA(11);
    var mixedModuleB = new MixedClassB(13);

    describe('Simple class', function() {
        it('should be given a default descriptor if one is not given', function() {
            assert.deepEqual(SimpleClass.descriptor.propA, descriptorA);
        });

        it('should expand shorthand descriptors', function() {
            assert.deepEqual(SimpleClass.descriptor.propB, descriptorB);
        });

        it('should call the constructor', function () {
            assert.equal(simpleModule.propC, 10);
        });
    });

    describe('Mixed class', function () {
        it('should be given a default descriptor if one is not given', function() {
            assert.deepEqual(Object.getOwnPropertyDescriptor(mixedModuleA, 'propA'), descriptorA);
        });

        it('should expand shorthand descriptors', function() {
            assert.deepEqual(Object.getOwnPropertyDescriptor(mixedModuleA, 'propB'), descriptorB);
        });

        it('should call the constructor', function () {
            assert.equal(mixedModuleA.propC, 11);
        });

        it('should override when using the $override modifier', function () {
            assert.equal(mixedModuleA.propX, 7);
        });

        it('should call chained methods', function () {
            assert.equal(mixedModuleA.funcA(), 8);
        });

        it('should call iterated methods', function () {
            assert.equal(mixedModuleA.funcB(12), 12);
        });

        it('should include the original method in the iterator', function () {
            assert.equal(mixedModuleA.propD, 12);
        });

        it('should append a function after a chain when using $after', function () {
            assert.equal(mixedModuleB.funcA(), 5);
        });

        it('should return the last value from an iterator', function () {
            assert.equal(mixedModuleB.funcB(14), 14);
        });

        it('should prepend a function to an iterator when using $before', function () {
            assert.equal(mixedModuleB.propE, 14);
        });
    });
});

describe('EventEmitter', function () {
    var emitter = this.emitter = new ascot.EventEmitter();
    var funcA = function(val) { this.valA = val; }.bind(emitter);
    var funcB = function(val) { this.valB = val; }.bind(emitter);

    emitter.on('test', funcA);
    emitter.on('test', funcB);

    it('should fire all registered listeners', function () {
        emitter.emit('test', 5);
        assert.equal(emitter.valA, 5);
        assert.equal(emitter.valB, 5);
    });

    it('should remove listeners', function () {
        emitter.off('test', funcB);
        emitter.emit('test', 7);
        assert.equal(emitter.valA, 7);
        assert.equal(emitter.valB, 5);
    });
});

describe('DOMView', function () {
    var view = new ascot.DOMView(
        { text : 'Hello, World!' },
        function(data) { return '<div class="testSelector">' + data.text + '</div>'; }
    );

    var complexView = new ascot.DOMView(
        null,
        function() { return '<div><div class="testSelector">Hello, World!</div></div>'; }
    );

    it('should create an HTML element', function () {
        assert(view.element);
    });

    it('should correctly use a template', function () {
        assert.equal(view.element.innerHTML, 'Hello, World!');
    });

    it('should re-render the view on changing data', function () {
        view.data = { text : 'Hello, Moon!' };
        assert.equal(view.element.innerHTML, 'Hello, Moon!');
    });

    it('should run update() when changing data if available', function () {
        view.update = function(data) { this.element.innerHTML = data.text; };
        view.data   = { text : 'Hello, Sky!' };
        assert.equal(view.element.innerHTML, 'Hello, Sky!');
    });

    it('should register selector handles pointing to child elements', function () {
        complexView.handles = { test : '.testSelector' };
        assert.equal(complexView.test.innerHTML, 'Hello, World!');
    });
});

describe('Model', function() {
    localStorage.clear();
    var model = new ascot.Model();
    var sampleDataA = {
        'valA' : 7,
        'valB' : 13,
        'groupA' : {
            'valC' : 17,
            'valB' : 19
        }
    };
    var sampleDataB = {
        'valA' : 5
    };

    describe('#load()', function() {
        it('should load new data remotely', function (done) {
            model.load('sample.json');
            localStorage.clear();

            model.on('load', function() {
                assert.equal(model.valA, sampleDataA.valA);
                assert.equal(model.groupA.valC, sampleDataA.groupA.valC);
                model.removeAllListeners();
                done();
            });
        });

        it('should be serialized such that it is identical to the loaded data', function () {
            assert.equal(JSON.stringify(model), JSON.stringify(sampleDataA));
        });

        it('should load existing data locally', function (done) {
            localStorage['sample.json'] = JSON.stringify(sampleDataB);
            model.load('sample.json');
            model.on('load', function() {
                assert.equal(model.valA, 5);
                model.removeAllListeners();
                done();
            });
        });

        it('should always load data remotely if preferOnline is true', function (done) {
            localStorage['sample.json'] = JSON.stringify(sampleDataB);
            model.preferOnline = true;
            model.load('sample.json');
            model.on('load', function() {
                assert.equal(model.valA, sampleDataA.valA);
                model.removeAllListeners();
                model.preferOnline = false;
                done();
            });
        });

        it('should not store data locally if storeLocal is false', function (done) {
            localStorage.clear();
            model.storeLocal = false;
            model.load('sample.json');
            model.on('load', function() {
                assert.notOk(localStorage['sample.json']);
                model.removeAllListeners();
                model.storeLocal = true;
                done();
            });
        });
    });

    describe('#resolve()', function () {
        it('should resolve a path to the correct value', function() {
            model.set({ objA : { valA : 8 }});
            assert.equal(model.resolve('objA.valA'), 8);
        });
    });

    describe('#set()', function () {

        it('should take an object as a parameter and set new data', function () {
            model.set({valD : 17});
            assert.equal(model.valD, 17);
        });

        it('should take a path and a value and change a specific entry', function () {
            model.set('groupA.valC', 21);
            assert.equal(model.groupA.valC, 21);
        });

        it('should trigger the onchange event when a change is made', function (done) {
            model.on('change', function(data, path) {
                assert.equal(data, model);
                assert.equal(path, 'groupA.valC');
                done();
            });
            model.set('groupA.valC', 23);
        });
    });
});

// describe('Model/View Binding', function () {
//     var model = new ascot.Model('sample.json');


// });
