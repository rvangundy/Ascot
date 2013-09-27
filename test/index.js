require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"ascot.DOMView":[function(require,module,exports){
module.exports=require('GirLh0');
},{}],"ascot.Model":[function(require,module,exports){
module.exports=require('FFRxKb');
},{}],"ascot.EventEmitter":[function(require,module,exports){
module.exports=require('BvhrnU');
},{}],"UI2WPJ":[function(require,module,exports){
'use strict';

/**
 * The top-level ascot function.  Creates new prototypes by mixing together an array of prototypes
 * and applying an expanded descriptor that includes mixin modifiers.
 * @param  {Array}  mixins     An array of prototypes to mix in
 * @param  {Object} descriptor A property descriptor
 * @return {Object}            A new object prototype
 */
function ascot(/* arguments */) {
    var mixins, descriptor, constructor, item;

    // Establish appropriate arguments
    if (arguments.length === 2) {
        mixins     = arguments[0];
        descriptor = arguments[1];
    } else {
        mixins     = [];
        descriptor = arguments[0];
    }

    descriptor = descriptor || {};

    // Collect each prototype's descriptor
    for (var i=0, len=mixins.length; i<len; i+=1) {
        item = mixins[i];

        // Allow for string references to base ascot classes
        item = mixins[i] = typeof item === 'string' ? ascot[item] : item;
        mixins[i] = item.descriptor;
    }

    // Expand and add current descriptor to mixins
    for (var j in descriptor) {
        descriptor[j] = expandDescriptor(descriptor[j]);
    }

    mixins.push(descriptor);
    descriptor = combineDescriptors(mixins);

    // Form a new constructor
    constructor = createConstructor(descriptor);

    return constructor;
}

/******************
 *  Construction  *
 ******************/

/**
 * Creates a new constructor that may be used to create objects with the 'new' keyword
 * @return {Function} A standard constructor function
 */
function createConstructor(descriptor) {
    var constructor = (function(desc) {
        return function(/* arguments */) {
            /* jshint validthis : true */
            Object.defineProperties(this, deepCopy(desc));

            if (this.construct) { this.construct.apply(this, arguments); }
        };
    })(descriptor);

    constructor.prototype  = {};
    constructor.descriptor = descriptor;

    return constructor;
}

/*****************
 *  Descriptors  *
 *****************/

/**
 * Expands a shorthand descriptor to a formal descriptor.  A shorthand descriptor consists
 * of three-character abbreviations of 'writable', 'configurable', etc. in the form :
 * wrt, cfg, enm, val along with the normal get & set.  Additionally, properties for which
 * a property descriptor has not been set get a default descriptor.
 * @param {Object} descriptor A shorthand descriptor
 */
function expandDescriptor(descriptor) {
    var newDescriptor = {};

    if (!descriptor) { return; }

    // Expand the descriptor if the argument is a valid descriptor
    if (isDescriptor(descriptor)) {
        for (var i in descriptor) {
            switch (i) {

            case 'enm' :
                newDescriptor.enumerable = descriptor[i];
                break;

            case 'cfg' :
                newDescriptor.configurable = descriptor[i];
                break;

            case 'wrt' :
                newDescriptor.writable = descriptor[i];
                break;

            case 'val' :
                newDescriptor.value = descriptor[i];
                break;

            default :
                newDescriptor[i] = descriptor[i];
                break;
            }
        }

        return newDescriptor;
    }

    // Create a default desciptor
    else {
        return {
            writable     : true,
            enumerable   : true,
            configurable : true,
            value        : descriptor
        };
    }
}

/**
 * Creates a new prototype from a set of property descriptor objects.  The prototype
 * is the result from a
 * @param {Array} descriptors An array of expanded descriptors.
 */
function combineDescriptors(descriptors) {
    var desc, appendedDesc, propName;
    var newDescriptor = {};

    for (var i=0, len=descriptors.length; i<len; i+=1) {
        desc = descriptors[i];

        for (var j in desc) {
            appendedDesc = appendDescriptor(j, newDescriptor[j], desc[j]);

            // Determine if assigning a value to an accessed property
            newDescriptor[j] = appendedDesc === true ? newDescriptor[j] : appendedDesc;

            // Assign value to accessed property
            if (appendedDesc === true) {
                propName = '_' + j;
                newDescriptor[propName] = newDescriptor[propName] || {};
                newDescriptor[propName].value = desc[j].value;
            }
        }
    }

    return newDescriptor;
}

/**
 * Appends a descriptor to a target descriptor
 * @param {String} propertyName The name of the property associated with this descriptor
 * @param {Object} target       A target descriptor to append to
 * @param {Object} descriptor   An expanded descriptor including mixin modifiers
 */
function appendDescriptor(propertyName, target, descriptor) {
    var modifier;
    var isNew = !target;

    target = target || {};

    // Return true if this is an implicit accessor value override
    if ((target.get || target.set) && (descriptor.value)) {
        return true;
    }

    // Extract modifiers and copy over new descriptor properties
    for (var i in descriptor) {

        // Retain mixin modifiers
        if (i.indexOf('$') >= 0) {
            modifier       = {};
            modifier.key   = i;
            modifier.value = target[i] = descriptor[i];
        }

        // Copy over normal descriptor properties
        else {
            target[i] = deepCopy(descriptor[i]);
        }
    }

    // OK to apply modifiers
    if (modifier) {
        applyModifier(propertyName, target, modifier);
    }

    // Always allow overwriting of notational private variables
    else if (propertyName.indexOf('_') === 0) {
        return target;
    }

    // Don't allow inadvertant overrides
    else if (!modifier && !isNew) {
        throw new Error('Attempted to overwrite an existing property without a modifier. Apply a modifier or use $override.');
    }

    return target;
}

/*********************
 *  Mixin Modifiers  *
 *********************/

/**
 * Applies a modifier to a descriptor, creating appropriate iterators or appending/prepending
 * to existing methods.
 * @param {String} propertyName The name of the property associated with this descriptor
 * @param {Objects} descriptor A target descriptor to modify
 * @param {Object}  modifier   A key and value describing a particular modifier
 */
function applyModifier(propertyName, descriptor, modifier) {
    var calls;
    var val = descriptor.value;

    switch (modifier.key) {

    case '$chain' :
        calls = processCalls(propertyName, modifier.value);
        descriptor.value = createChain(calls);
        break;

    case '$iterate' :
        calls = processCalls(propertyName, modifier.value);
        descriptor.value = createIterator(calls);
        break;

    case '$before' :
        descriptor.value = prependIterator(val, modifier.value);
        break;

    case '$after' :
        descriptor.value = appendIterator(val, modifier.value);
        break;

    case '$override' :
        applyOverride(descriptor, modifier.value);
        break;

    default :
        break;
    }

    return descriptor;
}

/**
 * Processes passed calls from a iterator property descriptor.  If an item is a
 * constructor, a function of the given name is sought on a descriptor and used instead.
 * @param  {String}   name  The name of the method to iterate
 * @param  {Array}    items Objects and functions composing the iterator
 * @return {Array}       The new iterator
 */
function processCalls(name, items) {
    var item;
    var calls = [];

    // Add each item to the iterator
    for (var i=0, len=items.length; i<len; i+=1) {
        item = items[i];

        if (!item) { continue; }

        // Seek a function within a prototype and add to the iterator
        if (item.descriptor && typeof item.descriptor[name].value === 'function') {
            calls.push(item.descriptor[name].value);
        }

        // Add functions to the iterator directly
        else if (typeof item === 'function') {
            calls.push(item);
        }
    }

    return calls;
}

/**
 * Creates and returns a chaining iterator
 * @param {Array} calls A list of calls associated with the iterator
 */
function createChain(calls) {

    // Create the iterator method that chains through each call
    function iterator() {
        /* jshint validthis : true */
        var args  = Array.prototype.slice.call(arguments, 0);
        var calls = iterator._calls;

        for (var j=0, jLen=calls.length; j<jLen; j+=1) {
            args[0] = calls[j].apply(this, args);
        }

        return args[0];
    }

    iterator._calls = calls;

    return iterator;
}

/**
 * Creates and returns a chaining iterator
 * @param {Array} calls A list of calls associated with the iterator
 */
function createIterator(calls) {

    // Create the iterator method that chains through each call
    function iterator() {
        /* jshint validthis : true */
        var val;
        var args  = Array.prototype.slice.call(arguments, 0);
        var calls = iterator._calls;

        for (var j=0, jLen=calls.length; j<jLen; j+=1) {
            val = calls[j].apply(this, args);
        }

        return val;
    }

    iterator._calls = calls;

    return iterator;
}

/**
 * Prepends a function to an existing iterator.  Creates an iterator if one had not
 * yet been created.
 * @param  {Function} iterator An existing iterator function
 * @param  {Function} fn       A function to append
 * @return {Function}          iterator
 */
function prependIterator(iterator, fn) {
    var calls = Array.prototype.slice.call(iterator._calls, 0);

    if (typeof iterator !== 'function') {
        return fn;
    }

    // Prepend to an existing iterator
    if (calls) {
        calls.splice(0, 0, fn);
        iterator._calls = calls;
    }

    // Create a new iterator if one had not been created
    else {
        iterator = createIterator([fn, iterator]);
    }

    return iterator;
}

/**
 * Appends a function to an existing iterator.  Creates an iterator if one had not
 * yet been created.
 * @param  {Function} iterator An existing iterator function
 * @param  {Function} fn       A function to append
 * @return {Function}          iterator
 */
function appendIterator(iterator, fn) {
    var calls = Array.prototype.slice.call(iterator._calls, 0);

    if (typeof iterator !== 'function') {
        return fn;
    }

    // Prepend to an existing iterator
    if (calls) {
        calls.push(fn);
        iterator._calls = calls;
    }

    // Create a new iterator if one had not been created
    else {
        iterator = createIterator([iterator, fn]);
    }

    return iterator;
}

/**
 * Applies the appropriate override. Accessor properties may be overridden
 * by specifying $override : true, whereas data properties have their values overridden
 * by $override : newValue
 * @param {Object}  descriptor The descriptor to apply the override to
 * @param {Variant} override        A function listed under descriptor.value
 */
function applyOverride(descriptor, override) {

    // Only modify values for data properties
    if (!descriptor.get && !descriptor.set) {
        descriptor.value = override;
    }
}

/***************
 *  Utilities  *
 ***************/

/**
 * Determines if an object is a descriptor
 * @param {Object} obj A proposed descriptor
 */
function isDescriptor(obj) {
    if (!obj || obj !== Object(obj)) { return false; }

    if (
        'enm' in obj ||
        'cfg' in obj ||
        'wrt' in obj ||
        'val' in obj ||
        'enumerable' in obj ||
        'configurable' in obj ||
        'writable' in obj ||
        'value' in obj ||
        'get' in obj ||
        'set' in obj ||
        '$chain' in obj ||
        '$iterate' in obj ||
        '$before' in obj ||
        '$after' in obj ||
        '$override' in obj
        )
    { return true; }

    return false;
}

/**
 * Copies the passed item, regardless of data type.  Objects and arrays are
 * copied by value and not by reference.
 * @param {Variant} item Something to copy
 */
function deepCopy(item) {
    var copy;

    // Recursively copy arrays
    if (Array.isArray(item)) {
        copy = [];

        for (var i=0, len=item.length; i<len; i+=1) {
            copy.push(deepCopy(item[i]));
        }

        return copy;
    }

    // Recursively copy objects
    else if (item === Object(item) && typeof item !== 'function') {
        copy = {};

        for (var j in item) {
            copy[j] = deepCopy(item[j]);
        }

        return copy;
    }

    // Just return the value
    return item;
}

/*************
 *  Exports  *
 *************/

module.exports = ascot;

},{}],"GirLh0":[function(require,module,exports){
'use strict';

var ascot        = require('./Ascot.js');
var EventEmitter = require('./EventEmitter.js');

/**
 * Constructs the DOMView, establishing its data and template and performing
 * an initial rendering.
 * @param {Variant}  data     The data associated with this view
 * @param {Function} template An HTML templating function
 */
function construct(data, template) {
    this._data    = data     || this._data;
    this.template = template || this.template;
    if (data) { bindViewToModel.call(this); }
    render.call(this);

    return this;
}

/**
 * Renders the DOMView using the available template. On rendering, a new element is created,
 * and must be added to the DOM.
 */
function render() {
    var div = document.createElement('div');

    div.innerHTML = this.template(this.data);
    this._element = div.firstChild;
}

/*************
 *  Handles  *
 *************/

/**
 * Establishes accessors to specific elements or sets of elements within this view.
 * Handles are set using a hash map that associates handles with DOM query selector strings.
 * @param {Object} handles A hash map of handles
 */
function setHandles(handles) {
    var _handles = this._handles;

    for (var i in handles) {
        Object.defineProperty(this, i, {
            get          : getElementBySelector.bind(this, handles[i]),
            enumerable   : true,
            configurable : true
        });

        _handles[i] = handles[i];
    }
}

/**
 * Returns a set of current handles
 */
function getHandles() {
    return this._handles;
}

/**
 * Gets a single element by query selector.  The element retrieved is relative
 * to this view's element.
 * @param {String} selector A query selector string
 */
function getElementBySelector(selector) {
    var el = this._element;

    return el.querySelector(selector);
}

/******************
 *  Data Binding  *
 ******************/

/**
 * Binds the view to its model. Whenever a model changes, it triggers a callback
 * that updates the view accordingly.
 */
function bindViewToModel() {
    var model    = this.data;
    var listener = this._modelBindListener = this._modelBindListener || updateView.bind(this);

    if (model.on) {
        model.on('load', listener);
        model.on('change', listener);
    }
}

/**
 * Unbinds the view from its current model by removing its event listeners
 */
function unbindViewFromModel() {
    var model    = this.data;
    var listener = this._modelBindListener;

    if (!listener) { return; }

    if (model.on) {
        model.off('load', listener);
        model.off('change', listener);
    }
}

/**
 * Updates the view, either by calling an update() method or triggering a
 * re-rendering of the template.
 * @param {Object} data The data used to update the view
 * @param {String} path A period-delimited path to the data being modified
 */
function updateView(data, path) {
    var el     = this._element;
    var parent = el.parentNode;

    // Use update methods if available
    if (this.update) { this.update(data, path); }

    // Otherwise, re-render using a template and swap elements
    else if (this.template) {
        render.call(this);
        if (parent) { parent.replaceChild(this._element, el); }
    }
}

/***************
 *  Accessors  *
 ***************/

/**
 * Sets the view's data, updating the view accordingly
 * @param {Variant} data The data associated with the view
 */
function setData(data) {
    unbindViewFromModel.call(this);
    this._data = data;
    bindViewToModel.call(this);
    updateView.call(this, data);
}

/**
 * Gets the current view's data property
 */
function getData() {
    return this._data;
}

/**
 * Returns the view's top-level element
 */
function getElement() {
    return this._element;
}

/**
 * Returns the template associated with this view
 */
function getTemplate() {
    return this._template;
}

/**
 * Sets the template associated with this view
 * @param {Function} template A templating function
 */
function setTemplate(template) {
    this._template = template;
}

/*********
 *  API  *
 *********/

var api = {
    construct : { val : construct, wrt : false, enm : false, cfg : false },

    data      : { get : getData,    set : setData, enm : true,  cfg : true  },
    _data     : { val : null,       wrt : true,    enm : false, cfg : false },

    element   : { get : getElement,                enm : true,  cfg : false },
    _element  : { val : null,       wrt : true,    enm : false, cfg : false },

    template  : { get : getTemplate, set : setTemplate, enm : true, cfg : false },
    _template : { val : null,      wrt : true,    enm : false,  cfg : false },

    // Handles
    handles  : { get : getHandles, set : setHandles, enm : true,  cfg : true  },
    _handles : { val : {},         wrt : true,       enm : false, cfg : false },

    /* Override */
    update : { val : null, wrt : true, enm : false, cfg : false }
};

/*************
 *  Exports  *
 *************/

ascot.DOMView = ascot([EventEmitter], api);
module.exports = ascot.DOMView;

},{"./Ascot.js":"UI2WPJ","./EventEmitter.js":"BvhrnU"}],"BvhrnU":[function(require,module,exports){
'use strict';

var ascot = require('./Ascot.js');

/**
 * Registers an event listener on the specified target
 * @param {String}   eventName The name of the event
 * @param {Function} cb        The new callback to handle the event
 */
function on(eventName, cb) {
    var callbacks = this.eventListeners[eventName] = this.eventListeners[eventName] || [];

    // Do nothing if a callback has already been added
    if (callbacks.indexOf(cb) >= 0) { return; }

    // Add the callback to the list of callbacks
    callbacks.push(cb);
}

/**
 * Registers an event listener on the specified target
 * @param {String}   eventName The name of the event
 * @param {Function} cb        The new callback to handle the event
 */
function off(eventName, cb) {
    var index;
    var callbacks = this.eventListeners[eventName] = this.eventListeners[eventName] || [];

    // Remove the callback from the list
    index = callbacks.indexOf(cb);

    if (index >= 0) { callbacks.splice(index, 1); }
}

/**
 * Removes all event listeners for a particular event from the emitter
 */
function removeAllListeners(eventName) {
    if (eventName) {
        this.eventListeners[eventName] = [];
    } else {
        this.eventListeners = {};
    }
}

/**
 * Emits the specified event, calling and passing the optional argument to all listeners
 * @param {String}  eventName The name of the event to emit
 * @param {Variant} arg       Any argument to pass to the event listeners
 */
function emit(eventName) {
    var args = Array.prototype.slice.call(arguments, 0);
    var callbacks = this.eventListeners[eventName] = this.eventListeners[eventName] || [];

    args.shift();

    for (var i=0, len=callbacks.length; i<len; i+=1) {
        callbacks[i].apply(this, args);
    }
}

/*********
 *  API  *
 *********/

var api = {
    on                 : on,
    off                : off,
    removeAllListeners : removeAllListeners,
    emit               : { val : emit, wrt : false, enm : false, cfg : false },

    eventListeners : { val : {}, wrt : true, enm : false, cfg : false }
};

/*************
 *  Exports  *
 *************/

ascot.EventEmitter = ascot(api);
module.exports = ascot.EventEmitter;

},{"./Ascot.js":"UI2WPJ"}],"FFRxKb":[function(require,module,exports){
'use strict';

var ascot = require('./Ascot.js');
var EventEmitter = require('./EventEmitter.js');

/****************
 *  Properties  *
 ****************/

/**
 * Whether to always attempt updating from the online location rather than retreive
 * from localStorage
 * @type {Boolean}
 */
var preferOnline = false;

/**
 * The remote location of the data source for retrieval using XMLHttpRequest
 * @type {String}
 */
var src = null;

/**
 * Whether to store and retrieve this model from local storage
 * @type {Boolean}
 */
var storeLocal = true;

/******************
 *  Construction  *
 ******************/

/**
 * Constructs the model, establishing and loading its data source.
 * @param {String} src The data source associated with this model
 */
function construct(src) {
    if (src) { this.load(src); }
}

/**********************************
 *  Loading, Storing, Retrieving  *
 **********************************/

/**
 * Stores the model to local storage.  Stored as a key/value pair where
 * the key is the src of the data and the value is a JSON string.
 */
function store() {
    localStorage[src] = JSON.stringify(this);
}

/**
 * Loads the data either from a server or from local storage depending on settings and
 * online status
 * @param {String} src Optionally specify the source of the data
 */
function load(src) {
    this.src = src || this.src;

    if (localStorage[src] && !this.preferOnline) {
        setTimeout(loadLocalData.bind(this), 0);
    } else {
        loadRemoteData.call(this);
    }
}

/**
 * Parses a json string and merges data with this model
 * @param {String} json
 */
function loadLocalData() {
    var localData = localStorage[this.src];

    if (localData) { parse.call(this, localData); }

    this.emit('load', this);
}

/**
 * Parses passed json data
 * @param {String} json A valid JSON string
 */
function parse(json) {
    var data = JSON.parse(json);

    // Performs optional processing steps to modify the structure of the data
    if (this.process) { data = this.process(data); }

    for (var i in data) { this[i] = data[i]; }
}

/**
 * Loads data from the server.  If the request fails, attempts loading data from localStorage.
 */
function loadRemoteData() {
    var src = this.src;
    var xhr = new XMLHttpRequest();

    xhr.open('GET', src);
    xhr.onreadystatechange = handleXHRResponse.bind(this, xhr);
    xhr.send(null);
}

/**
 * Handles incoming XHR responses
 */
function handleXHRResponse(xhr) {
    var type, text;

    // Request was successful
    if (xhr.readyState === 4 && xhr.status === 200) {
        type = xhr.getResponseHeader('Content-Type');

        // Make sure response is JSON
        if (type.indexOf('json') >= 0) {
            text = xhr.responseText;

            // Parse and load
            parse.call(this, text);

            // Store data locally
            if (this.storeLocal) { this.store(); }

            this.emit('load', this);
        }

    // Request failed, attempt loading locally instead
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
        loadLocalData.call(this);
    }
}

/********************
 *  Data Accessors  *
 ********************/

/**
 * Resolves a path and returns relevant data
 * @param {String} path A period-delimited path to some data
 */
function resolve(path) {
    var value = this;

    path = path.split('.');

    for (var i=0, len=path.length; i<len; i+=1) {
        value = value[path[i]];
    }

    return value;
}

/**
 * Sets data on the model
 * @param {String}         path An path to a location within the data model
 * @param {Object|Variant} data The new data
 */
function set(/* arguments */) {
    var path, addr, data, target, key;

    // Adjust for arguments
    if (arguments.length === 2) {
        path = arguments[0];
        data    = arguments[1];
    } else {
        data = arguments[0];
    }

    // Handle path-referenced data change
    if (path) {
        addr   = path;
        addr   = addr.split('.');
        key    = addr.pop();
        target = this;

        for (var i=0, len=addr.length; i<len; i+=1) {
            target = target[addr[i]];
        }

        target[key] = data;
    }

    // Handle full data change
    else {
        for (var j in data) {
            this[j] = data[j];
        }
    }

    this.emit('change', this, path);
}

/*********
 *  API  *
 *********/

var api = {
    construct : construct,

    storeLocal   : { val : storeLocal,   wrt : true, enm : false, cfg : false },
    src          : { val : src,          wrt : true, enm : false, cfg : false },
    preferOnline : { val : preferOnline, wrt : true, enm : false, cfg : false },

    store   : store,
    load    : load,
    set     : set,
    process : null,
    resolve : resolve
};

/*************
 *  Exports  *
 *************/

ascot.Model = ascot([EventEmitter], api);
module.exports = ascot.Model;

},{"./Ascot.js":"UI2WPJ","./EventEmitter.js":"BvhrnU"}],8:[function(require,module,exports){
'use strict';

var ascot = require('./Ascot.js');
require('./EventEmitter.js');
require('./DOMView.js');
require('./Model.js');

module.exports = ascot;

},{"./Ascot.js":"UI2WPJ","./DOMView.js":"GirLh0","./EventEmitter.js":"BvhrnU","./Model.js":"FFRxKb"}],9:[function(require,module,exports){
'use strict';

var ascot        = require('../scripts/index.js');
var assert       = chai.assert;

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
        _accA     : 5,
        accA      : { get : function() { return this._accA; } },
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
        funcB : { $before : setPropE },
        accA  : 42
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

        it('should establish setting of accessed property values', function () {
            assert.equal(mixedModuleB._accA, 42);
            assert.equal(mixedModuleB.accA, 42);
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

describe('Model/View Binding', function () {
    var view;
    var model = new ascot.Model();
    function template(data) {
        return '<div>' + data.valA + '</div>';
    }

    view  = new ascot.DOMView(model, template);

    it('should pass new data in to its template when the model changes', function (done) {
        model.load('sample.json');
        model.on('load', function(data) {
            assert.equal(view.element.innerHTML, 7);
            data.set('valA', 13);
            assert.equal(view.element.innerHTML, 13);
            model.removeAllListeners();
            done();
        });
    });
});

},{"../scripts/index.js":8}],"ascot.main":[function(require,module,exports){
module.exports=require('UI2WPJ');
},{}]},{},[9])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcnlhbnZhbmd1bmR5L0RvY3VtZW50cy9Bc2NvdC9zY3JpcHRzL0FzY290LmpzIiwiL1VzZXJzL3J5YW52YW5ndW5keS9Eb2N1bWVudHMvQXNjb3Qvc2NyaXB0cy9ET01WaWV3LmpzIiwiL1VzZXJzL3J5YW52YW5ndW5keS9Eb2N1bWVudHMvQXNjb3Qvc2NyaXB0cy9FdmVudEVtaXR0ZXIuanMiLCIvVXNlcnMvcnlhbnZhbmd1bmR5L0RvY3VtZW50cy9Bc2NvdC9zY3JpcHRzL01vZGVsLmpzIiwiL1VzZXJzL3J5YW52YW5ndW5keS9Eb2N1bWVudHMvQXNjb3Qvc2NyaXB0cy9pbmRleC5qcyIsIi9Vc2Vycy9yeWFudmFuZ3VuZHkvRG9jdW1lbnRzL0FzY290L3Rlc3QvdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUaGUgdG9wLWxldmVsIGFzY290IGZ1bmN0aW9uLiAgQ3JlYXRlcyBuZXcgcHJvdG90eXBlcyBieSBtaXhpbmcgdG9nZXRoZXIgYW4gYXJyYXkgb2YgcHJvdG90eXBlc1xuICogYW5kIGFwcGx5aW5nIGFuIGV4cGFuZGVkIGRlc2NyaXB0b3IgdGhhdCBpbmNsdWRlcyBtaXhpbiBtb2RpZmllcnMuXG4gKiBAcGFyYW0gIHtBcnJheX0gIG1peGlucyAgICAgQW4gYXJyYXkgb2YgcHJvdG90eXBlcyB0byBtaXggaW5cbiAqIEBwYXJhbSAge09iamVjdH0gZGVzY3JpcHRvciBBIHByb3BlcnR5IGRlc2NyaXB0b3JcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICBBIG5ldyBvYmplY3QgcHJvdG90eXBlXG4gKi9cbmZ1bmN0aW9uIGFzY290KC8qIGFyZ3VtZW50cyAqLykge1xuICAgIHZhciBtaXhpbnMsIGRlc2NyaXB0b3IsIGNvbnN0cnVjdG9yLCBpdGVtO1xuXG4gICAgLy8gRXN0YWJsaXNoIGFwcHJvcHJpYXRlIGFyZ3VtZW50c1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIG1peGlucyAgICAgPSBhcmd1bWVudHNbMF07XG4gICAgICAgIGRlc2NyaXB0b3IgPSBhcmd1bWVudHNbMV07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbWl4aW5zICAgICA9IFtdO1xuICAgICAgICBkZXNjcmlwdG9yID0gYXJndW1lbnRzWzBdO1xuICAgIH1cblxuICAgIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9yIHx8IHt9O1xuXG4gICAgLy8gQ29sbGVjdCBlYWNoIHByb3RvdHlwZSdzIGRlc2NyaXB0b3JcbiAgICBmb3IgKHZhciBpPTAsIGxlbj1taXhpbnMubGVuZ3RoOyBpPGxlbjsgaSs9MSkge1xuICAgICAgICBpdGVtID0gbWl4aW5zW2ldO1xuXG4gICAgICAgIC8vIEFsbG93IGZvciBzdHJpbmcgcmVmZXJlbmNlcyB0byBiYXNlIGFzY290IGNsYXNzZXNcbiAgICAgICAgaXRlbSA9IG1peGluc1tpXSA9IHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyA/IGFzY290W2l0ZW1dIDogaXRlbTtcbiAgICAgICAgbWl4aW5zW2ldID0gaXRlbS5kZXNjcmlwdG9yO1xuICAgIH1cblxuICAgIC8vIEV4cGFuZCBhbmQgYWRkIGN1cnJlbnQgZGVzY3JpcHRvciB0byBtaXhpbnNcbiAgICBmb3IgKHZhciBqIGluIGRlc2NyaXB0b3IpIHtcbiAgICAgICAgZGVzY3JpcHRvcltqXSA9IGV4cGFuZERlc2NyaXB0b3IoZGVzY3JpcHRvcltqXSk7XG4gICAgfVxuXG4gICAgbWl4aW5zLnB1c2goZGVzY3JpcHRvcik7XG4gICAgZGVzY3JpcHRvciA9IGNvbWJpbmVEZXNjcmlwdG9ycyhtaXhpbnMpO1xuXG4gICAgLy8gRm9ybSBhIG5ldyBjb25zdHJ1Y3RvclxuICAgIGNvbnN0cnVjdG9yID0gY3JlYXRlQ29uc3RydWN0b3IoZGVzY3JpcHRvcik7XG5cbiAgICByZXR1cm4gY29uc3RydWN0b3I7XG59XG5cbi8qKioqKioqKioqKioqKioqKipcbiAqICBDb25zdHJ1Y3Rpb24gICpcbiAqKioqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBjb25zdHJ1Y3RvciB0aGF0IG1heSBiZSB1c2VkIHRvIGNyZWF0ZSBvYmplY3RzIHdpdGggdGhlICduZXcnIGtleXdvcmRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBBIHN0YW5kYXJkIGNvbnN0cnVjdG9yIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNvbnN0cnVjdG9yKGRlc2NyaXB0b3IpIHtcbiAgICB2YXIgY29uc3RydWN0b3IgPSAoZnVuY3Rpb24oZGVzYykge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oLyogYXJndW1lbnRzICovKSB7XG4gICAgICAgICAgICAvKiBqc2hpbnQgdmFsaWR0aGlzIDogdHJ1ZSAqL1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywgZGVlcENvcHkoZGVzYykpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3QpIHsgdGhpcy5jb25zdHJ1Y3QuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfVxuICAgICAgICB9O1xuICAgIH0pKGRlc2NyaXB0b3IpO1xuXG4gICAgY29uc3RydWN0b3IucHJvdG90eXBlICA9IHt9O1xuICAgIGNvbnN0cnVjdG9yLmRlc2NyaXB0b3IgPSBkZXNjcmlwdG9yO1xuXG4gICAgcmV0dXJuIGNvbnN0cnVjdG9yO1xufVxuXG4vKioqKioqKioqKioqKioqKipcbiAqICBEZXNjcmlwdG9ycyAgKlxuICoqKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIEV4cGFuZHMgYSBzaG9ydGhhbmQgZGVzY3JpcHRvciB0byBhIGZvcm1hbCBkZXNjcmlwdG9yLiAgQSBzaG9ydGhhbmQgZGVzY3JpcHRvciBjb25zaXN0c1xuICogb2YgdGhyZWUtY2hhcmFjdGVyIGFiYnJldmlhdGlvbnMgb2YgJ3dyaXRhYmxlJywgJ2NvbmZpZ3VyYWJsZScsIGV0Yy4gaW4gdGhlIGZvcm0gOlxuICogd3J0LCBjZmcsIGVubSwgdmFsIGFsb25nIHdpdGggdGhlIG5vcm1hbCBnZXQgJiBzZXQuICBBZGRpdGlvbmFsbHksIHByb3BlcnRpZXMgZm9yIHdoaWNoXG4gKiBhIHByb3BlcnR5IGRlc2NyaXB0b3IgaGFzIG5vdCBiZWVuIHNldCBnZXQgYSBkZWZhdWx0IGRlc2NyaXB0b3IuXG4gKiBAcGFyYW0ge09iamVjdH0gZGVzY3JpcHRvciBBIHNob3J0aGFuZCBkZXNjcmlwdG9yXG4gKi9cbmZ1bmN0aW9uIGV4cGFuZERlc2NyaXB0b3IoZGVzY3JpcHRvcikge1xuICAgIHZhciBuZXdEZXNjcmlwdG9yID0ge307XG5cbiAgICBpZiAoIWRlc2NyaXB0b3IpIHsgcmV0dXJuOyB9XG5cbiAgICAvLyBFeHBhbmQgdGhlIGRlc2NyaXB0b3IgaWYgdGhlIGFyZ3VtZW50IGlzIGEgdmFsaWQgZGVzY3JpcHRvclxuICAgIGlmIChpc0Rlc2NyaXB0b3IoZGVzY3JpcHRvcikpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBkZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGkpIHtcblxuICAgICAgICAgICAgY2FzZSAnZW5tJyA6XG4gICAgICAgICAgICAgICAgbmV3RGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvcltpXTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnY2ZnJyA6XG4gICAgICAgICAgICAgICAgbmV3RGVzY3JpcHRvci5jb25maWd1cmFibGUgPSBkZXNjcmlwdG9yW2ldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICd3cnQnIDpcbiAgICAgICAgICAgICAgICBuZXdEZXNjcmlwdG9yLndyaXRhYmxlID0gZGVzY3JpcHRvcltpXTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAndmFsJyA6XG4gICAgICAgICAgICAgICAgbmV3RGVzY3JpcHRvci52YWx1ZSA9IGRlc2NyaXB0b3JbaV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3JbaV0gPSBkZXNjcmlwdG9yW2ldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld0Rlc2NyaXB0b3I7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgZGVmYXVsdCBkZXNjaXB0b3JcbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlICAgOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgIHZhbHVlICAgICAgICA6IGRlc2NyaXB0b3JcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBwcm90b3R5cGUgZnJvbSBhIHNldCBvZiBwcm9wZXJ0eSBkZXNjcmlwdG9yIG9iamVjdHMuICBUaGUgcHJvdG90eXBlXG4gKiBpcyB0aGUgcmVzdWx0IGZyb20gYVxuICogQHBhcmFtIHtBcnJheX0gZGVzY3JpcHRvcnMgQW4gYXJyYXkgb2YgZXhwYW5kZWQgZGVzY3JpcHRvcnMuXG4gKi9cbmZ1bmN0aW9uIGNvbWJpbmVEZXNjcmlwdG9ycyhkZXNjcmlwdG9ycykge1xuICAgIHZhciBkZXNjLCBhcHBlbmRlZERlc2MsIHByb3BOYW1lO1xuICAgIHZhciBuZXdEZXNjcmlwdG9yID0ge307XG5cbiAgICBmb3IgKHZhciBpPTAsIGxlbj1kZXNjcmlwdG9ycy5sZW5ndGg7IGk8bGVuOyBpKz0xKSB7XG4gICAgICAgIGRlc2MgPSBkZXNjcmlwdG9yc1tpXTtcblxuICAgICAgICBmb3IgKHZhciBqIGluIGRlc2MpIHtcbiAgICAgICAgICAgIGFwcGVuZGVkRGVzYyA9IGFwcGVuZERlc2NyaXB0b3IoaiwgbmV3RGVzY3JpcHRvcltqXSwgZGVzY1tqXSk7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBpZiBhc3NpZ25pbmcgYSB2YWx1ZSB0byBhbiBhY2Nlc3NlZCBwcm9wZXJ0eVxuICAgICAgICAgICAgbmV3RGVzY3JpcHRvcltqXSA9IGFwcGVuZGVkRGVzYyA9PT0gdHJ1ZSA/IG5ld0Rlc2NyaXB0b3Jbal0gOiBhcHBlbmRlZERlc2M7XG5cbiAgICAgICAgICAgIC8vIEFzc2lnbiB2YWx1ZSB0byBhY2Nlc3NlZCBwcm9wZXJ0eVxuICAgICAgICAgICAgaWYgKGFwcGVuZGVkRGVzYyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHByb3BOYW1lID0gJ18nICsgajtcbiAgICAgICAgICAgICAgICBuZXdEZXNjcmlwdG9yW3Byb3BOYW1lXSA9IG5ld0Rlc2NyaXB0b3JbcHJvcE5hbWVdIHx8IHt9O1xuICAgICAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3JbcHJvcE5hbWVdLnZhbHVlID0gZGVzY1tqXS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXdEZXNjcmlwdG9yO1xufVxuXG4vKipcbiAqIEFwcGVuZHMgYSBkZXNjcmlwdG9yIHRvIGEgdGFyZ2V0IGRlc2NyaXB0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eU5hbWUgVGhlIG5hbWUgb2YgdGhlIHByb3BlcnR5IGFzc29jaWF0ZWQgd2l0aCB0aGlzIGRlc2NyaXB0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXQgICAgICAgQSB0YXJnZXQgZGVzY3JpcHRvciB0byBhcHBlbmQgdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBkZXNjcmlwdG9yICAgQW4gZXhwYW5kZWQgZGVzY3JpcHRvciBpbmNsdWRpbmcgbWl4aW4gbW9kaWZpZXJzXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZERlc2NyaXB0b3IocHJvcGVydHlOYW1lLCB0YXJnZXQsIGRlc2NyaXB0b3IpIHtcbiAgICB2YXIgbW9kaWZpZXI7XG4gICAgdmFyIGlzTmV3ID0gIXRhcmdldDtcblxuICAgIHRhcmdldCA9IHRhcmdldCB8fCB7fTtcblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoaXMgaXMgYW4gaW1wbGljaXQgYWNjZXNzb3IgdmFsdWUgb3ZlcnJpZGVcbiAgICBpZiAoKHRhcmdldC5nZXQgfHwgdGFyZ2V0LnNldCkgJiYgKGRlc2NyaXB0b3IudmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgbW9kaWZpZXJzIGFuZCBjb3B5IG92ZXIgbmV3IGRlc2NyaXB0b3IgcHJvcGVydGllc1xuICAgIGZvciAodmFyIGkgaW4gZGVzY3JpcHRvcikge1xuXG4gICAgICAgIC8vIFJldGFpbiBtaXhpbiBtb2RpZmllcnNcbiAgICAgICAgaWYgKGkuaW5kZXhPZignJCcpID49IDApIHtcbiAgICAgICAgICAgIG1vZGlmaWVyICAgICAgID0ge307XG4gICAgICAgICAgICBtb2RpZmllci5rZXkgICA9IGk7XG4gICAgICAgICAgICBtb2RpZmllci52YWx1ZSA9IHRhcmdldFtpXSA9IGRlc2NyaXB0b3JbaV07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb3B5IG92ZXIgbm9ybWFsIGRlc2NyaXB0b3IgcHJvcGVydGllc1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRhcmdldFtpXSA9IGRlZXBDb3B5KGRlc2NyaXB0b3JbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gT0sgdG8gYXBwbHkgbW9kaWZpZXJzXG4gICAgaWYgKG1vZGlmaWVyKSB7XG4gICAgICAgIGFwcGx5TW9kaWZpZXIocHJvcGVydHlOYW1lLCB0YXJnZXQsIG1vZGlmaWVyKTtcbiAgICB9XG5cbiAgICAvLyBBbHdheXMgYWxsb3cgb3ZlcndyaXRpbmcgb2Ygbm90YXRpb25hbCBwcml2YXRlIHZhcmlhYmxlc1xuICAgIGVsc2UgaWYgKHByb3BlcnR5TmFtZS5pbmRleE9mKCdfJykgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICAvLyBEb24ndCBhbGxvdyBpbmFkdmVydGFudCBvdmVycmlkZXNcbiAgICBlbHNlIGlmICghbW9kaWZpZXIgJiYgIWlzTmV3KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQXR0ZW1wdGVkIHRvIG92ZXJ3cml0ZSBhbiBleGlzdGluZyBwcm9wZXJ0eSB3aXRob3V0IGEgbW9kaWZpZXIuIEFwcGx5IGEgbW9kaWZpZXIgb3IgdXNlICRvdmVycmlkZS4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKioqKioqKioqKioqKioqKioqKioqXG4gKiAgTWl4aW4gTW9kaWZpZXJzICAqXG4gKioqKioqKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIEFwcGxpZXMgYSBtb2RpZmllciB0byBhIGRlc2NyaXB0b3IsIGNyZWF0aW5nIGFwcHJvcHJpYXRlIGl0ZXJhdG9ycyBvciBhcHBlbmRpbmcvcHJlcGVuZGluZ1xuICogdG8gZXhpc3RpbmcgbWV0aG9kcy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eU5hbWUgVGhlIG5hbWUgb2YgdGhlIHByb3BlcnR5IGFzc29jaWF0ZWQgd2l0aCB0aGlzIGRlc2NyaXB0b3JcbiAqIEBwYXJhbSB7T2JqZWN0c30gZGVzY3JpcHRvciBBIHRhcmdldCBkZXNjcmlwdG9yIHRvIG1vZGlmeVxuICogQHBhcmFtIHtPYmplY3R9ICBtb2RpZmllciAgIEEga2V5IGFuZCB2YWx1ZSBkZXNjcmliaW5nIGEgcGFydGljdWxhciBtb2RpZmllclxuICovXG5mdW5jdGlvbiBhcHBseU1vZGlmaWVyKHByb3BlcnR5TmFtZSwgZGVzY3JpcHRvciwgbW9kaWZpZXIpIHtcbiAgICB2YXIgY2FsbHM7XG4gICAgdmFyIHZhbCA9IGRlc2NyaXB0b3IudmFsdWU7XG5cbiAgICBzd2l0Y2ggKG1vZGlmaWVyLmtleSkge1xuXG4gICAgY2FzZSAnJGNoYWluJyA6XG4gICAgICAgIGNhbGxzID0gcHJvY2Vzc0NhbGxzKHByb3BlcnR5TmFtZSwgbW9kaWZpZXIudmFsdWUpO1xuICAgICAgICBkZXNjcmlwdG9yLnZhbHVlID0gY3JlYXRlQ2hhaW4oY2FsbHMpO1xuICAgICAgICBicmVhaztcblxuICAgIGNhc2UgJyRpdGVyYXRlJyA6XG4gICAgICAgIGNhbGxzID0gcHJvY2Vzc0NhbGxzKHByb3BlcnR5TmFtZSwgbW9kaWZpZXIudmFsdWUpO1xuICAgICAgICBkZXNjcmlwdG9yLnZhbHVlID0gY3JlYXRlSXRlcmF0b3IoY2FsbHMpO1xuICAgICAgICBicmVhaztcblxuICAgIGNhc2UgJyRiZWZvcmUnIDpcbiAgICAgICAgZGVzY3JpcHRvci52YWx1ZSA9IHByZXBlbmRJdGVyYXRvcih2YWwsIG1vZGlmaWVyLnZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICckYWZ0ZXInIDpcbiAgICAgICAgZGVzY3JpcHRvci52YWx1ZSA9IGFwcGVuZEl0ZXJhdG9yKHZhbCwgbW9kaWZpZXIudmFsdWUpO1xuICAgICAgICBicmVhaztcblxuICAgIGNhc2UgJyRvdmVycmlkZScgOlxuICAgICAgICBhcHBseU92ZXJyaWRlKGRlc2NyaXB0b3IsIG1vZGlmaWVyLnZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0IDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlc2NyaXB0b3I7XG59XG5cbi8qKlxuICogUHJvY2Vzc2VzIHBhc3NlZCBjYWxscyBmcm9tIGEgaXRlcmF0b3IgcHJvcGVydHkgZGVzY3JpcHRvci4gIElmIGFuIGl0ZW0gaXMgYVxuICogY29uc3RydWN0b3IsIGEgZnVuY3Rpb24gb2YgdGhlIGdpdmVuIG5hbWUgaXMgc291Z2h0IG9uIGEgZGVzY3JpcHRvciBhbmQgdXNlZCBpbnN0ZWFkLlxuICogQHBhcmFtICB7U3RyaW5nfSAgIG5hbWUgIFRoZSBuYW1lIG9mIHRoZSBtZXRob2QgdG8gaXRlcmF0ZVxuICogQHBhcmFtICB7QXJyYXl9ICAgIGl0ZW1zIE9iamVjdHMgYW5kIGZ1bmN0aW9ucyBjb21wb3NpbmcgdGhlIGl0ZXJhdG9yXG4gKiBAcmV0dXJuIHtBcnJheX0gICAgICAgVGhlIG5ldyBpdGVyYXRvclxuICovXG5mdW5jdGlvbiBwcm9jZXNzQ2FsbHMobmFtZSwgaXRlbXMpIHtcbiAgICB2YXIgaXRlbTtcbiAgICB2YXIgY2FsbHMgPSBbXTtcblxuICAgIC8vIEFkZCBlYWNoIGl0ZW0gdG8gdGhlIGl0ZXJhdG9yXG4gICAgZm9yICh2YXIgaT0wLCBsZW49aXRlbXMubGVuZ3RoOyBpPGxlbjsgaSs9MSkge1xuICAgICAgICBpdGVtID0gaXRlbXNbaV07XG5cbiAgICAgICAgaWYgKCFpdGVtKSB7IGNvbnRpbnVlOyB9XG5cbiAgICAgICAgLy8gU2VlayBhIGZ1bmN0aW9uIHdpdGhpbiBhIHByb3RvdHlwZSBhbmQgYWRkIHRvIHRoZSBpdGVyYXRvclxuICAgICAgICBpZiAoaXRlbS5kZXNjcmlwdG9yICYmIHR5cGVvZiBpdGVtLmRlc2NyaXB0b3JbbmFtZV0udmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxzLnB1c2goaXRlbS5kZXNjcmlwdG9yW25hbWVdLnZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBmdW5jdGlvbnMgdG8gdGhlIGl0ZXJhdG9yIGRpcmVjdGx5XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxscy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhbGxzO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW5kIHJldHVybnMgYSBjaGFpbmluZyBpdGVyYXRvclxuICogQHBhcmFtIHtBcnJheX0gY2FsbHMgQSBsaXN0IG9mIGNhbGxzIGFzc29jaWF0ZWQgd2l0aCB0aGUgaXRlcmF0b3JcbiAqL1xuZnVuY3Rpb24gY3JlYXRlQ2hhaW4oY2FsbHMpIHtcblxuICAgIC8vIENyZWF0ZSB0aGUgaXRlcmF0b3IgbWV0aG9kIHRoYXQgY2hhaW5zIHRocm91Z2ggZWFjaCBjYWxsXG4gICAgZnVuY3Rpb24gaXRlcmF0b3IoKSB7XG4gICAgICAgIC8qIGpzaGludCB2YWxpZHRoaXMgOiB0cnVlICovXG4gICAgICAgIHZhciBhcmdzICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgIHZhciBjYWxscyA9IGl0ZXJhdG9yLl9jYWxscztcblxuICAgICAgICBmb3IgKHZhciBqPTAsIGpMZW49Y2FsbHMubGVuZ3RoOyBqPGpMZW47IGorPTEpIHtcbiAgICAgICAgICAgIGFyZ3NbMF0gPSBjYWxsc1tqXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcmdzWzBdO1xuICAgIH1cblxuICAgIGl0ZXJhdG9yLl9jYWxscyA9IGNhbGxzO1xuXG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW5kIHJldHVybnMgYSBjaGFpbmluZyBpdGVyYXRvclxuICogQHBhcmFtIHtBcnJheX0gY2FsbHMgQSBsaXN0IG9mIGNhbGxzIGFzc29jaWF0ZWQgd2l0aCB0aGUgaXRlcmF0b3JcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSXRlcmF0b3IoY2FsbHMpIHtcblxuICAgIC8vIENyZWF0ZSB0aGUgaXRlcmF0b3IgbWV0aG9kIHRoYXQgY2hhaW5zIHRocm91Z2ggZWFjaCBjYWxsXG4gICAgZnVuY3Rpb24gaXRlcmF0b3IoKSB7XG4gICAgICAgIC8qIGpzaGludCB2YWxpZHRoaXMgOiB0cnVlICovXG4gICAgICAgIHZhciB2YWw7XG4gICAgICAgIHZhciBhcmdzICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgIHZhciBjYWxscyA9IGl0ZXJhdG9yLl9jYWxscztcblxuICAgICAgICBmb3IgKHZhciBqPTAsIGpMZW49Y2FsbHMubGVuZ3RoOyBqPGpMZW47IGorPTEpIHtcbiAgICAgICAgICAgIHZhbCA9IGNhbGxzW2pdLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG5cbiAgICBpdGVyYXRvci5fY2FsbHMgPSBjYWxscztcblxuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cblxuLyoqXG4gKiBQcmVwZW5kcyBhIGZ1bmN0aW9uIHRvIGFuIGV4aXN0aW5nIGl0ZXJhdG9yLiAgQ3JlYXRlcyBhbiBpdGVyYXRvciBpZiBvbmUgaGFkIG5vdFxuICogeWV0IGJlZW4gY3JlYXRlZC5cbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBpdGVyYXRvciBBbiBleGlzdGluZyBpdGVyYXRvciBmdW5jdGlvblxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuICAgICAgIEEgZnVuY3Rpb24gdG8gYXBwZW5kXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gICAgICAgICAgaXRlcmF0b3JcbiAqL1xuZnVuY3Rpb24gcHJlcGVuZEl0ZXJhdG9yKGl0ZXJhdG9yLCBmbikge1xuICAgIHZhciBjYWxscyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGl0ZXJhdG9yLl9jYWxscywgMCk7XG5cbiAgICBpZiAodHlwZW9mIGl0ZXJhdG9yICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9XG5cbiAgICAvLyBQcmVwZW5kIHRvIGFuIGV4aXN0aW5nIGl0ZXJhdG9yXG4gICAgaWYgKGNhbGxzKSB7XG4gICAgICAgIGNhbGxzLnNwbGljZSgwLCAwLCBmbik7XG4gICAgICAgIGl0ZXJhdG9yLl9jYWxscyA9IGNhbGxzO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIG5ldyBpdGVyYXRvciBpZiBvbmUgaGFkIG5vdCBiZWVuIGNyZWF0ZWRcbiAgICBlbHNlIHtcbiAgICAgICAgaXRlcmF0b3IgPSBjcmVhdGVJdGVyYXRvcihbZm4sIGl0ZXJhdG9yXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG4vKipcbiAqIEFwcGVuZHMgYSBmdW5jdGlvbiB0byBhbiBleGlzdGluZyBpdGVyYXRvci4gIENyZWF0ZXMgYW4gaXRlcmF0b3IgaWYgb25lIGhhZCBub3RcbiAqIHlldCBiZWVuIGNyZWF0ZWQuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gaXRlcmF0b3IgQW4gZXhpc3RpbmcgaXRlcmF0b3IgZnVuY3Rpb25cbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiAgICAgICBBIGZ1bmN0aW9uIHRvIGFwcGVuZFxuICogQHJldHVybiB7RnVuY3Rpb259ICAgICAgICAgIGl0ZXJhdG9yXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZEl0ZXJhdG9yKGl0ZXJhdG9yLCBmbikge1xuICAgIHZhciBjYWxscyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGl0ZXJhdG9yLl9jYWxscywgMCk7XG5cbiAgICBpZiAodHlwZW9mIGl0ZXJhdG9yICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9XG5cbiAgICAvLyBQcmVwZW5kIHRvIGFuIGV4aXN0aW5nIGl0ZXJhdG9yXG4gICAgaWYgKGNhbGxzKSB7XG4gICAgICAgIGNhbGxzLnB1c2goZm4pO1xuICAgICAgICBpdGVyYXRvci5fY2FsbHMgPSBjYWxscztcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgaXRlcmF0b3IgaWYgb25lIGhhZCBub3QgYmVlbiBjcmVhdGVkXG4gICAgZWxzZSB7XG4gICAgICAgIGl0ZXJhdG9yID0gY3JlYXRlSXRlcmF0b3IoW2l0ZXJhdG9yLCBmbl0pO1xuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cblxuLyoqXG4gKiBBcHBsaWVzIHRoZSBhcHByb3ByaWF0ZSBvdmVycmlkZS4gQWNjZXNzb3IgcHJvcGVydGllcyBtYXkgYmUgb3ZlcnJpZGRlblxuICogYnkgc3BlY2lmeWluZyAkb3ZlcnJpZGUgOiB0cnVlLCB3aGVyZWFzIGRhdGEgcHJvcGVydGllcyBoYXZlIHRoZWlyIHZhbHVlcyBvdmVycmlkZGVuXG4gKiBieSAkb3ZlcnJpZGUgOiBuZXdWYWx1ZVxuICogQHBhcmFtIHtPYmplY3R9ICBkZXNjcmlwdG9yIFRoZSBkZXNjcmlwdG9yIHRvIGFwcGx5IHRoZSBvdmVycmlkZSB0b1xuICogQHBhcmFtIHtWYXJpYW50fSBvdmVycmlkZSAgICAgICAgQSBmdW5jdGlvbiBsaXN0ZWQgdW5kZXIgZGVzY3JpcHRvci52YWx1ZVxuICovXG5mdW5jdGlvbiBhcHBseU92ZXJyaWRlKGRlc2NyaXB0b3IsIG92ZXJyaWRlKSB7XG5cbiAgICAvLyBPbmx5IG1vZGlmeSB2YWx1ZXMgZm9yIGRhdGEgcHJvcGVydGllc1xuICAgIGlmICghZGVzY3JpcHRvci5nZXQgJiYgIWRlc2NyaXB0b3Iuc2V0KSB7XG4gICAgICAgIGRlc2NyaXB0b3IudmFsdWUgPSBvdmVycmlkZTtcbiAgICB9XG59XG5cbi8qKioqKioqKioqKioqKipcbiAqICBVdGlsaXRpZXMgICpcbiAqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiBhbiBvYmplY3QgaXMgYSBkZXNjcmlwdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIEEgcHJvcG9zZWQgZGVzY3JpcHRvclxuICovXG5mdW5jdGlvbiBpc0Rlc2NyaXB0b3Iob2JqKSB7XG4gICAgaWYgKCFvYmogfHwgb2JqICE9PSBPYmplY3Qob2JqKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgIGlmIChcbiAgICAgICAgJ2VubScgaW4gb2JqIHx8XG4gICAgICAgICdjZmcnIGluIG9iaiB8fFxuICAgICAgICAnd3J0JyBpbiBvYmogfHxcbiAgICAgICAgJ3ZhbCcgaW4gb2JqIHx8XG4gICAgICAgICdlbnVtZXJhYmxlJyBpbiBvYmogfHxcbiAgICAgICAgJ2NvbmZpZ3VyYWJsZScgaW4gb2JqIHx8XG4gICAgICAgICd3cml0YWJsZScgaW4gb2JqIHx8XG4gICAgICAgICd2YWx1ZScgaW4gb2JqIHx8XG4gICAgICAgICdnZXQnIGluIG9iaiB8fFxuICAgICAgICAnc2V0JyBpbiBvYmogfHxcbiAgICAgICAgJyRjaGFpbicgaW4gb2JqIHx8XG4gICAgICAgICckaXRlcmF0ZScgaW4gb2JqIHx8XG4gICAgICAgICckYmVmb3JlJyBpbiBvYmogfHxcbiAgICAgICAgJyRhZnRlcicgaW4gb2JqIHx8XG4gICAgICAgICckb3ZlcnJpZGUnIGluIG9ialxuICAgICAgICApXG4gICAgeyByZXR1cm4gdHJ1ZTsgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENvcGllcyB0aGUgcGFzc2VkIGl0ZW0sIHJlZ2FyZGxlc3Mgb2YgZGF0YSB0eXBlLiAgT2JqZWN0cyBhbmQgYXJyYXlzIGFyZVxuICogY29waWVkIGJ5IHZhbHVlIGFuZCBub3QgYnkgcmVmZXJlbmNlLlxuICogQHBhcmFtIHtWYXJpYW50fSBpdGVtIFNvbWV0aGluZyB0byBjb3B5XG4gKi9cbmZ1bmN0aW9uIGRlZXBDb3B5KGl0ZW0pIHtcbiAgICB2YXIgY29weTtcblxuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvcHkgYXJyYXlzXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgICAgY29weSA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWl0ZW0ubGVuZ3RoOyBpPGxlbjsgaSs9MSkge1xuICAgICAgICAgICAgY29weS5wdXNoKGRlZXBDb3B5KGl0ZW1baV0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb3B5O1xuICAgIH1cblxuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvcHkgb2JqZWN0c1xuICAgIGVsc2UgaWYgKGl0ZW0gPT09IE9iamVjdChpdGVtKSAmJiB0eXBlb2YgaXRlbSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb3B5ID0ge307XG5cbiAgICAgICAgZm9yICh2YXIgaiBpbiBpdGVtKSB7XG4gICAgICAgICAgICBjb3B5W2pdID0gZGVlcENvcHkoaXRlbVtqXSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29weTtcbiAgICB9XG5cbiAgICAvLyBKdXN0IHJldHVybiB0aGUgdmFsdWVcbiAgICByZXR1cm4gaXRlbTtcbn1cblxuLyoqKioqKioqKioqKipcbiAqICBFeHBvcnRzICAqXG4gKioqKioqKioqKioqKi9cblxubW9kdWxlLmV4cG9ydHMgPSBhc2NvdDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzY290ICAgICAgICA9IHJlcXVpcmUoJy4vQXNjb3QuanMnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuL0V2ZW50RW1pdHRlci5qcycpO1xuXG4vKipcbiAqIENvbnN0cnVjdHMgdGhlIERPTVZpZXcsIGVzdGFibGlzaGluZyBpdHMgZGF0YSBhbmQgdGVtcGxhdGUgYW5kIHBlcmZvcm1pbmdcbiAqIGFuIGluaXRpYWwgcmVuZGVyaW5nLlxuICogQHBhcmFtIHtWYXJpYW50fSAgZGF0YSAgICAgVGhlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoaXMgdmlld1xuICogQHBhcmFtIHtGdW5jdGlvbn0gdGVtcGxhdGUgQW4gSFRNTCB0ZW1wbGF0aW5nIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGNvbnN0cnVjdChkYXRhLCB0ZW1wbGF0ZSkge1xuICAgIHRoaXMuX2RhdGEgICAgPSBkYXRhICAgICB8fCB0aGlzLl9kYXRhO1xuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZSB8fCB0aGlzLnRlbXBsYXRlO1xuICAgIGlmIChkYXRhKSB7IGJpbmRWaWV3VG9Nb2RlbC5jYWxsKHRoaXMpOyB9XG4gICAgcmVuZGVyLmNhbGwodGhpcyk7XG5cbiAgICByZXR1cm4gdGhpcztcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSBET01WaWV3IHVzaW5nIHRoZSBhdmFpbGFibGUgdGVtcGxhdGUuIE9uIHJlbmRlcmluZywgYSBuZXcgZWxlbWVudCBpcyBjcmVhdGVkLFxuICogYW5kIG11c3QgYmUgYWRkZWQgdG8gdGhlIERPTS5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgIGRpdi5pbm5lckhUTUwgPSB0aGlzLnRlbXBsYXRlKHRoaXMuZGF0YSk7XG4gICAgdGhpcy5fZWxlbWVudCA9IGRpdi5maXJzdENoaWxkO1xufVxuXG4vKioqKioqKioqKioqKlxuICogIEhhbmRsZXMgICpcbiAqKioqKioqKioqKioqL1xuXG4vKipcbiAqIEVzdGFibGlzaGVzIGFjY2Vzc29ycyB0byBzcGVjaWZpYyBlbGVtZW50cyBvciBzZXRzIG9mIGVsZW1lbnRzIHdpdGhpbiB0aGlzIHZpZXcuXG4gKiBIYW5kbGVzIGFyZSBzZXQgdXNpbmcgYSBoYXNoIG1hcCB0aGF0IGFzc29jaWF0ZXMgaGFuZGxlcyB3aXRoIERPTSBxdWVyeSBzZWxlY3RvciBzdHJpbmdzLlxuICogQHBhcmFtIHtPYmplY3R9IGhhbmRsZXMgQSBoYXNoIG1hcCBvZiBoYW5kbGVzXG4gKi9cbmZ1bmN0aW9uIHNldEhhbmRsZXMoaGFuZGxlcykge1xuICAgIHZhciBfaGFuZGxlcyA9IHRoaXMuX2hhbmRsZXM7XG5cbiAgICBmb3IgKHZhciBpIGluIGhhbmRsZXMpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGksIHtcbiAgICAgICAgICAgIGdldCAgICAgICAgICA6IGdldEVsZW1lbnRCeVNlbGVjdG9yLmJpbmQodGhpcywgaGFuZGxlc1tpXSksXG4gICAgICAgICAgICBlbnVtZXJhYmxlICAgOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICBfaGFuZGxlc1tpXSA9IGhhbmRsZXNbaV07XG4gICAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBzZXQgb2YgY3VycmVudCBoYW5kbGVzXG4gKi9cbmZ1bmN0aW9uIGdldEhhbmRsZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hhbmRsZXM7XG59XG5cbi8qKlxuICogR2V0cyBhIHNpbmdsZSBlbGVtZW50IGJ5IHF1ZXJ5IHNlbGVjdG9yLiAgVGhlIGVsZW1lbnQgcmV0cmlldmVkIGlzIHJlbGF0aXZlXG4gKiB0byB0aGlzIHZpZXcncyBlbGVtZW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIEEgcXVlcnkgc2VsZWN0b3Igc3RyaW5nXG4gKi9cbmZ1bmN0aW9uIGdldEVsZW1lbnRCeVNlbGVjdG9yKHNlbGVjdG9yKSB7XG4gICAgdmFyIGVsID0gdGhpcy5fZWxlbWVudDtcblxuICAgIHJldHVybiBlbC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbn1cblxuLyoqKioqKioqKioqKioqKioqKlxuICogIERhdGEgQmluZGluZyAgKlxuICoqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBCaW5kcyB0aGUgdmlldyB0byBpdHMgbW9kZWwuIFdoZW5ldmVyIGEgbW9kZWwgY2hhbmdlcywgaXQgdHJpZ2dlcnMgYSBjYWxsYmFja1xuICogdGhhdCB1cGRhdGVzIHRoZSB2aWV3IGFjY29yZGluZ2x5LlxuICovXG5mdW5jdGlvbiBiaW5kVmlld1RvTW9kZWwoKSB7XG4gICAgdmFyIG1vZGVsICAgID0gdGhpcy5kYXRhO1xuICAgIHZhciBsaXN0ZW5lciA9IHRoaXMuX21vZGVsQmluZExpc3RlbmVyID0gdGhpcy5fbW9kZWxCaW5kTGlzdGVuZXIgfHwgdXBkYXRlVmlldy5iaW5kKHRoaXMpO1xuXG4gICAgaWYgKG1vZGVsLm9uKSB7XG4gICAgICAgIG1vZGVsLm9uKCdsb2FkJywgbGlzdGVuZXIpO1xuICAgICAgICBtb2RlbC5vbignY2hhbmdlJywgbGlzdGVuZXIpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBVbmJpbmRzIHRoZSB2aWV3IGZyb20gaXRzIGN1cnJlbnQgbW9kZWwgYnkgcmVtb3ZpbmcgaXRzIGV2ZW50IGxpc3RlbmVyc1xuICovXG5mdW5jdGlvbiB1bmJpbmRWaWV3RnJvbU1vZGVsKCkge1xuICAgIHZhciBtb2RlbCAgICA9IHRoaXMuZGF0YTtcbiAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLl9tb2RlbEJpbmRMaXN0ZW5lcjtcblxuICAgIGlmICghbGlzdGVuZXIpIHsgcmV0dXJuOyB9XG5cbiAgICBpZiAobW9kZWwub24pIHtcbiAgICAgICAgbW9kZWwub2ZmKCdsb2FkJywgbGlzdGVuZXIpO1xuICAgICAgICBtb2RlbC5vZmYoJ2NoYW5nZScsIGxpc3RlbmVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgdmlldywgZWl0aGVyIGJ5IGNhbGxpbmcgYW4gdXBkYXRlKCkgbWV0aG9kIG9yIHRyaWdnZXJpbmcgYVxuICogcmUtcmVuZGVyaW5nIG9mIHRoZSB0ZW1wbGF0ZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBkYXRhIHVzZWQgdG8gdXBkYXRlIHRoZSB2aWV3XG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBBIHBlcmlvZC1kZWxpbWl0ZWQgcGF0aCB0byB0aGUgZGF0YSBiZWluZyBtb2RpZmllZFxuICovXG5mdW5jdGlvbiB1cGRhdGVWaWV3KGRhdGEsIHBhdGgpIHtcbiAgICB2YXIgZWwgICAgID0gdGhpcy5fZWxlbWVudDtcbiAgICB2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZTtcblxuICAgIC8vIFVzZSB1cGRhdGUgbWV0aG9kcyBpZiBhdmFpbGFibGVcbiAgICBpZiAodGhpcy51cGRhdGUpIHsgdGhpcy51cGRhdGUoZGF0YSwgcGF0aCk7IH1cblxuICAgIC8vIE90aGVyd2lzZSwgcmUtcmVuZGVyIHVzaW5nIGEgdGVtcGxhdGUgYW5kIHN3YXAgZWxlbWVudHNcbiAgICBlbHNlIGlmICh0aGlzLnRlbXBsYXRlKSB7XG4gICAgICAgIHJlbmRlci5jYWxsKHRoaXMpO1xuICAgICAgICBpZiAocGFyZW50KSB7IHBhcmVudC5yZXBsYWNlQ2hpbGQodGhpcy5fZWxlbWVudCwgZWwpOyB9XG4gICAgfVxufVxuXG4vKioqKioqKioqKioqKioqXG4gKiAgQWNjZXNzb3JzICAqXG4gKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIFNldHMgdGhlIHZpZXcncyBkYXRhLCB1cGRhdGluZyB0aGUgdmlldyBhY2NvcmRpbmdseVxuICogQHBhcmFtIHtWYXJpYW50fSBkYXRhIFRoZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgdmlld1xuICovXG5mdW5jdGlvbiBzZXREYXRhKGRhdGEpIHtcbiAgICB1bmJpbmRWaWV3RnJvbU1vZGVsLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgYmluZFZpZXdUb01vZGVsLmNhbGwodGhpcyk7XG4gICAgdXBkYXRlVmlldy5jYWxsKHRoaXMsIGRhdGEpO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIGN1cnJlbnQgdmlldydzIGRhdGEgcHJvcGVydHlcbiAqL1xuZnVuY3Rpb24gZ2V0RGF0YSgpIHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2aWV3J3MgdG9wLWxldmVsIGVsZW1lbnRcbiAqL1xuZnVuY3Rpb24gZ2V0RWxlbWVudCgpIHtcbiAgICByZXR1cm4gdGhpcy5fZWxlbWVudDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB0ZW1wbGF0ZSBhc3NvY2lhdGVkIHdpdGggdGhpcyB2aWV3XG4gKi9cbmZ1bmN0aW9uIGdldFRlbXBsYXRlKCkge1xuICAgIHJldHVybiB0aGlzLl90ZW1wbGF0ZTtcbn1cblxuLyoqXG4gKiBTZXRzIHRoZSB0ZW1wbGF0ZSBhc3NvY2lhdGVkIHdpdGggdGhpcyB2aWV3XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0ZW1wbGF0ZSBBIHRlbXBsYXRpbmcgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gc2V0VGVtcGxhdGUodGVtcGxhdGUpIHtcbiAgICB0aGlzLl90ZW1wbGF0ZSA9IHRlbXBsYXRlO1xufVxuXG4vKioqKioqKioqXG4gKiAgQVBJICAqXG4gKioqKioqKioqL1xuXG52YXIgYXBpID0ge1xuICAgIGNvbnN0cnVjdCA6IHsgdmFsIDogY29uc3RydWN0LCB3cnQgOiBmYWxzZSwgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH0sXG5cbiAgICBkYXRhICAgICAgOiB7IGdldCA6IGdldERhdGEsICAgIHNldCA6IHNldERhdGEsIGVubSA6IHRydWUsICBjZmcgOiB0cnVlICB9LFxuICAgIF9kYXRhICAgICA6IHsgdmFsIDogbnVsbCwgICAgICAgd3J0IDogdHJ1ZSwgICAgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH0sXG5cbiAgICBlbGVtZW50ICAgOiB7IGdldCA6IGdldEVsZW1lbnQsICAgICAgICAgICAgICAgIGVubSA6IHRydWUsICBjZmcgOiBmYWxzZSB9LFxuICAgIF9lbGVtZW50ICA6IHsgdmFsIDogbnVsbCwgICAgICAgd3J0IDogdHJ1ZSwgICAgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH0sXG5cbiAgICB0ZW1wbGF0ZSAgOiB7IGdldCA6IGdldFRlbXBsYXRlLCBzZXQgOiBzZXRUZW1wbGF0ZSwgZW5tIDogdHJ1ZSwgY2ZnIDogZmFsc2UgfSxcbiAgICBfdGVtcGxhdGUgOiB7IHZhbCA6IG51bGwsICAgICAgd3J0IDogdHJ1ZSwgICAgZW5tIDogZmFsc2UsICBjZmcgOiBmYWxzZSB9LFxuXG4gICAgLy8gSGFuZGxlc1xuICAgIGhhbmRsZXMgIDogeyBnZXQgOiBnZXRIYW5kbGVzLCBzZXQgOiBzZXRIYW5kbGVzLCBlbm0gOiB0cnVlLCAgY2ZnIDogdHJ1ZSAgfSxcbiAgICBfaGFuZGxlcyA6IHsgdmFsIDoge30sICAgICAgICAgd3J0IDogdHJ1ZSwgICAgICAgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH0sXG5cbiAgICAvKiBPdmVycmlkZSAqL1xuICAgIHVwZGF0ZSA6IHsgdmFsIDogbnVsbCwgd3J0IDogdHJ1ZSwgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH1cbn07XG5cbi8qKioqKioqKioqKioqXG4gKiAgRXhwb3J0cyAgKlxuICoqKioqKioqKioqKiovXG5cbmFzY290LkRPTVZpZXcgPSBhc2NvdChbRXZlbnRFbWl0dGVyXSwgYXBpKTtcbm1vZHVsZS5leHBvcnRzID0gYXNjb3QuRE9NVmlldztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzY290ID0gcmVxdWlyZSgnLi9Bc2NvdC5qcycpO1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBldmVudCBsaXN0ZW5lciBvbiB0aGUgc3BlY2lmaWVkIHRhcmdldFxuICogQHBhcmFtIHtTdHJpbmd9ICAgZXZlbnROYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgICAgICAgIFRoZSBuZXcgY2FsbGJhY2sgdG8gaGFuZGxlIHRoZSBldmVudFxuICovXG5mdW5jdGlvbiBvbihldmVudE5hbWUsIGNiKSB7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSA9IHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXTtcblxuICAgIC8vIERvIG5vdGhpbmcgaWYgYSBjYWxsYmFjayBoYXMgYWxyZWFkeSBiZWVuIGFkZGVkXG4gICAgaWYgKGNhbGxiYWNrcy5pbmRleE9mKGNiKSA+PSAwKSB7IHJldHVybjsgfVxuXG4gICAgLy8gQWRkIHRoZSBjYWxsYmFjayB0byB0aGUgbGlzdCBvZiBjYWxsYmFja3NcbiAgICBjYWxsYmFja3MucHVzaChjYik7XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGV2ZW50IGxpc3RlbmVyIG9uIHRoZSBzcGVjaWZpZWQgdGFyZ2V0XG4gKiBAcGFyYW0ge1N0cmluZ30gICBldmVudE5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAgICAgICAgVGhlIG5ldyBjYWxsYmFjayB0byBoYW5kbGUgdGhlIGV2ZW50XG4gKi9cbmZ1bmN0aW9uIG9mZihldmVudE5hbWUsIGNiKSB7XG4gICAgdmFyIGluZGV4O1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLmV2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gPSB0aGlzLmV2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW107XG5cbiAgICAvLyBSZW1vdmUgdGhlIGNhbGxiYWNrIGZyb20gdGhlIGxpc3RcbiAgICBpbmRleCA9IGNhbGxiYWNrcy5pbmRleE9mKGNiKTtcblxuICAgIGlmIChpbmRleCA+PSAwKSB7IGNhbGxiYWNrcy5zcGxpY2UoaW5kZXgsIDEpOyB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBhbGwgZXZlbnQgbGlzdGVuZXJzIGZvciBhIHBhcnRpY3VsYXIgZXZlbnQgZnJvbSB0aGUgZW1pdHRlclxuICovXG5mdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnROYW1lKSB7XG4gICAgaWYgKGV2ZW50TmFtZSkge1xuICAgICAgICB0aGlzLmV2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gPSBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmV2ZW50TGlzdGVuZXJzID0ge307XG4gICAgfVxufVxuXG4vKipcbiAqIEVtaXRzIHRoZSBzcGVjaWZpZWQgZXZlbnQsIGNhbGxpbmcgYW5kIHBhc3NpbmcgdGhlIG9wdGlvbmFsIGFyZ3VtZW50IHRvIGFsbCBsaXN0ZW5lcnNcbiAqIEBwYXJhbSB7U3RyaW5nfSAgZXZlbnROYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudCB0byBlbWl0XG4gKiBAcGFyYW0ge1ZhcmlhbnR9IGFyZyAgICAgICBBbnkgYXJndW1lbnQgdG8gcGFzcyB0byB0aGUgZXZlbnQgbGlzdGVuZXJzXG4gKi9cbmZ1bmN0aW9uIGVtaXQoZXZlbnROYW1lKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLmV2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gPSB0aGlzLmV2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW107XG5cbiAgICBhcmdzLnNoaWZ0KCk7XG5cbiAgICBmb3IgKHZhciBpPTAsIGxlbj1jYWxsYmFja3MubGVuZ3RoOyBpPGxlbjsgaSs9MSkge1xuICAgICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxufVxuXG4vKioqKioqKioqXG4gKiAgQVBJICAqXG4gKioqKioqKioqL1xuXG52YXIgYXBpID0ge1xuICAgIG9uICAgICAgICAgICAgICAgICA6IG9uLFxuICAgIG9mZiAgICAgICAgICAgICAgICA6IG9mZixcbiAgICByZW1vdmVBbGxMaXN0ZW5lcnMgOiByZW1vdmVBbGxMaXN0ZW5lcnMsXG4gICAgZW1pdCAgICAgICAgICAgICAgIDogeyB2YWwgOiBlbWl0LCB3cnQgOiBmYWxzZSwgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH0sXG5cbiAgICBldmVudExpc3RlbmVycyA6IHsgdmFsIDoge30sIHdydCA6IHRydWUsIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9XG59O1xuXG4vKioqKioqKioqKioqKlxuICogIEV4cG9ydHMgICpcbiAqKioqKioqKioqKioqL1xuXG5hc2NvdC5FdmVudEVtaXR0ZXIgPSBhc2NvdChhcGkpO1xubW9kdWxlLmV4cG9ydHMgPSBhc2NvdC5FdmVudEVtaXR0ZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2NvdCA9IHJlcXVpcmUoJy4vQXNjb3QuanMnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuL0V2ZW50RW1pdHRlci5qcycpO1xuXG4vKioqKioqKioqKioqKioqKlxuICogIFByb3BlcnRpZXMgICpcbiAqKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIFdoZXRoZXIgdG8gYWx3YXlzIGF0dGVtcHQgdXBkYXRpbmcgZnJvbSB0aGUgb25saW5lIGxvY2F0aW9uIHJhdGhlciB0aGFuIHJldHJlaXZlXG4gKiBmcm9tIGxvY2FsU3RvcmFnZVxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbnZhciBwcmVmZXJPbmxpbmUgPSBmYWxzZTtcblxuLyoqXG4gKiBUaGUgcmVtb3RlIGxvY2F0aW9uIG9mIHRoZSBkYXRhIHNvdXJjZSBmb3IgcmV0cmlldmFsIHVzaW5nIFhNTEh0dHBSZXF1ZXN0XG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG52YXIgc3JjID0gbnVsbDtcblxuLyoqXG4gKiBXaGV0aGVyIHRvIHN0b3JlIGFuZCByZXRyaWV2ZSB0aGlzIG1vZGVsIGZyb20gbG9jYWwgc3RvcmFnZVxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbnZhciBzdG9yZUxvY2FsID0gdHJ1ZTtcblxuLyoqKioqKioqKioqKioqKioqKlxuICogIENvbnN0cnVjdGlvbiAgKlxuICoqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBDb25zdHJ1Y3RzIHRoZSBtb2RlbCwgZXN0YWJsaXNoaW5nIGFuZCBsb2FkaW5nIGl0cyBkYXRhIHNvdXJjZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzcmMgVGhlIGRhdGEgc291cmNlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIG1vZGVsXG4gKi9cbmZ1bmN0aW9uIGNvbnN0cnVjdChzcmMpIHtcbiAgICBpZiAoc3JjKSB7IHRoaXMubG9hZChzcmMpOyB9XG59XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgTG9hZGluZywgU3RvcmluZywgUmV0cmlldmluZyAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogU3RvcmVzIHRoZSBtb2RlbCB0byBsb2NhbCBzdG9yYWdlLiAgU3RvcmVkIGFzIGEga2V5L3ZhbHVlIHBhaXIgd2hlcmVcbiAqIHRoZSBrZXkgaXMgdGhlIHNyYyBvZiB0aGUgZGF0YSBhbmQgdGhlIHZhbHVlIGlzIGEgSlNPTiBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIHN0b3JlKCkge1xuICAgIGxvY2FsU3RvcmFnZVtzcmNdID0gSlNPTi5zdHJpbmdpZnkodGhpcyk7XG59XG5cbi8qKlxuICogTG9hZHMgdGhlIGRhdGEgZWl0aGVyIGZyb20gYSBzZXJ2ZXIgb3IgZnJvbSBsb2NhbCBzdG9yYWdlIGRlcGVuZGluZyBvbiBzZXR0aW5ncyBhbmRcbiAqIG9ubGluZSBzdGF0dXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBzcmMgT3B0aW9uYWxseSBzcGVjaWZ5IHRoZSBzb3VyY2Ugb2YgdGhlIGRhdGFcbiAqL1xuZnVuY3Rpb24gbG9hZChzcmMpIHtcbiAgICB0aGlzLnNyYyA9IHNyYyB8fCB0aGlzLnNyYztcblxuICAgIGlmIChsb2NhbFN0b3JhZ2Vbc3JjXSAmJiAhdGhpcy5wcmVmZXJPbmxpbmUpIHtcbiAgICAgICAgc2V0VGltZW91dChsb2FkTG9jYWxEYXRhLmJpbmQodGhpcyksIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxvYWRSZW1vdGVEYXRhLmNhbGwodGhpcyk7XG4gICAgfVxufVxuXG4vKipcbiAqIFBhcnNlcyBhIGpzb24gc3RyaW5nIGFuZCBtZXJnZXMgZGF0YSB3aXRoIHRoaXMgbW9kZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSBqc29uXG4gKi9cbmZ1bmN0aW9uIGxvYWRMb2NhbERhdGEoKSB7XG4gICAgdmFyIGxvY2FsRGF0YSA9IGxvY2FsU3RvcmFnZVt0aGlzLnNyY107XG5cbiAgICBpZiAobG9jYWxEYXRhKSB7IHBhcnNlLmNhbGwodGhpcywgbG9jYWxEYXRhKTsgfVxuXG4gICAgdGhpcy5lbWl0KCdsb2FkJywgdGhpcyk7XG59XG5cbi8qKlxuICogUGFyc2VzIHBhc3NlZCBqc29uIGRhdGFcbiAqIEBwYXJhbSB7U3RyaW5nfSBqc29uIEEgdmFsaWQgSlNPTiBzdHJpbmdcbiAqL1xuZnVuY3Rpb24gcGFyc2UoanNvbikge1xuICAgIHZhciBkYXRhID0gSlNPTi5wYXJzZShqc29uKTtcblxuICAgIC8vIFBlcmZvcm1zIG9wdGlvbmFsIHByb2Nlc3Npbmcgc3RlcHMgdG8gbW9kaWZ5IHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIGRhdGFcbiAgICBpZiAodGhpcy5wcm9jZXNzKSB7IGRhdGEgPSB0aGlzLnByb2Nlc3MoZGF0YSk7IH1cblxuICAgIGZvciAodmFyIGkgaW4gZGF0YSkgeyB0aGlzW2ldID0gZGF0YVtpXTsgfVxufVxuXG4vKipcbiAqIExvYWRzIGRhdGEgZnJvbSB0aGUgc2VydmVyLiAgSWYgdGhlIHJlcXVlc3QgZmFpbHMsIGF0dGVtcHRzIGxvYWRpbmcgZGF0YSBmcm9tIGxvY2FsU3RvcmFnZS5cbiAqL1xuZnVuY3Rpb24gbG9hZFJlbW90ZURhdGEoKSB7XG4gICAgdmFyIHNyYyA9IHRoaXMuc3JjO1xuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIHhoci5vcGVuKCdHRVQnLCBzcmMpO1xuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBoYW5kbGVYSFJSZXNwb25zZS5iaW5kKHRoaXMsIHhocik7XG4gICAgeGhyLnNlbmQobnVsbCk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBpbmNvbWluZyBYSFIgcmVzcG9uc2VzXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZVhIUlJlc3BvbnNlKHhocikge1xuICAgIHZhciB0eXBlLCB0ZXh0O1xuXG4gICAgLy8gUmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bFxuICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCAmJiB4aHIuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgdHlwZSA9IHhoci5nZXRSZXNwb25zZUhlYWRlcignQ29udGVudC1UeXBlJyk7XG5cbiAgICAgICAgLy8gTWFrZSBzdXJlIHJlc3BvbnNlIGlzIEpTT05cbiAgICAgICAgaWYgKHR5cGUuaW5kZXhPZignanNvbicpID49IDApIHtcbiAgICAgICAgICAgIHRleHQgPSB4aHIucmVzcG9uc2VUZXh0O1xuXG4gICAgICAgICAgICAvLyBQYXJzZSBhbmQgbG9hZFxuICAgICAgICAgICAgcGFyc2UuY2FsbCh0aGlzLCB0ZXh0KTtcblxuICAgICAgICAgICAgLy8gU3RvcmUgZGF0YSBsb2NhbGx5XG4gICAgICAgICAgICBpZiAodGhpcy5zdG9yZUxvY2FsKSB7IHRoaXMuc3RvcmUoKTsgfVxuXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2xvYWQnLCB0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgLy8gUmVxdWVzdCBmYWlsZWQsIGF0dGVtcHQgbG9hZGluZyBsb2NhbGx5IGluc3RlYWRcbiAgICB9IGVsc2UgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0ICYmIHhoci5zdGF0dXMgIT09IDIwMCkge1xuICAgICAgICBsb2FkTG9jYWxEYXRhLmNhbGwodGhpcyk7XG4gICAgfVxufVxuXG4vKioqKioqKioqKioqKioqKioqKipcbiAqICBEYXRhIEFjY2Vzc29ycyAgKlxuICoqKioqKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIFJlc29sdmVzIGEgcGF0aCBhbmQgcmV0dXJucyByZWxldmFudCBkYXRhXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBBIHBlcmlvZC1kZWxpbWl0ZWQgcGF0aCB0byBzb21lIGRhdGFcbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZShwYXRoKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcztcblxuICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG5cbiAgICBmb3IgKHZhciBpPTAsIGxlbj1wYXRoLmxlbmd0aDsgaTxsZW47IGkrPTEpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZVtwYXRoW2ldXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogU2V0cyBkYXRhIG9uIHRoZSBtb2RlbFxuICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICAgcGF0aCBBbiBwYXRoIHRvIGEgbG9jYXRpb24gd2l0aGluIHRoZSBkYXRhIG1vZGVsXG4gKiBAcGFyYW0ge09iamVjdHxWYXJpYW50fSBkYXRhIFRoZSBuZXcgZGF0YVxuICovXG5mdW5jdGlvbiBzZXQoLyogYXJndW1lbnRzICovKSB7XG4gICAgdmFyIHBhdGgsIGFkZHIsIGRhdGEsIHRhcmdldCwga2V5O1xuXG4gICAgLy8gQWRqdXN0IGZvciBhcmd1bWVudHNcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBwYXRoID0gYXJndW1lbnRzWzBdO1xuICAgICAgICBkYXRhICAgID0gYXJndW1lbnRzWzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRhdGEgPSBhcmd1bWVudHNbMF07XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHBhdGgtcmVmZXJlbmNlZCBkYXRhIGNoYW5nZVxuICAgIGlmIChwYXRoKSB7XG4gICAgICAgIGFkZHIgICA9IHBhdGg7XG4gICAgICAgIGFkZHIgICA9IGFkZHIuc3BsaXQoJy4nKTtcbiAgICAgICAga2V5ICAgID0gYWRkci5wb3AoKTtcbiAgICAgICAgdGFyZ2V0ID0gdGhpcztcblxuICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj1hZGRyLmxlbmd0aDsgaTxsZW47IGkrPTEpIHtcbiAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldFthZGRyW2ldXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldFtrZXldID0gZGF0YTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgZnVsbCBkYXRhIGNoYW5nZVxuICAgIGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBqIGluIGRhdGEpIHtcbiAgICAgICAgICAgIHRoaXNbal0gPSBkYXRhW2pdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5lbWl0KCdjaGFuZ2UnLCB0aGlzLCBwYXRoKTtcbn1cblxuLyoqKioqKioqKlxuICogIEFQSSAgKlxuICoqKioqKioqKi9cblxudmFyIGFwaSA9IHtcbiAgICBjb25zdHJ1Y3QgOiBjb25zdHJ1Y3QsXG5cbiAgICBzdG9yZUxvY2FsICAgOiB7IHZhbCA6IHN0b3JlTG9jYWwsICAgd3J0IDogdHJ1ZSwgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH0sXG4gICAgc3JjICAgICAgICAgIDogeyB2YWwgOiBzcmMsICAgICAgICAgIHdydCA6IHRydWUsIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9LFxuICAgIHByZWZlck9ubGluZSA6IHsgdmFsIDogcHJlZmVyT25saW5lLCB3cnQgOiB0cnVlLCBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfSxcblxuICAgIHN0b3JlICAgOiBzdG9yZSxcbiAgICBsb2FkICAgIDogbG9hZCxcbiAgICBzZXQgICAgIDogc2V0LFxuICAgIHByb2Nlc3MgOiBudWxsLFxuICAgIHJlc29sdmUgOiByZXNvbHZlXG59O1xuXG4vKioqKioqKioqKioqKlxuICogIEV4cG9ydHMgICpcbiAqKioqKioqKioqKioqL1xuXG5hc2NvdC5Nb2RlbCA9IGFzY290KFtFdmVudEVtaXR0ZXJdLCBhcGkpO1xubW9kdWxlLmV4cG9ydHMgPSBhc2NvdC5Nb2RlbDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzY290ID0gcmVxdWlyZSgnLi9Bc2NvdC5qcycpO1xucmVxdWlyZSgnLi9FdmVudEVtaXR0ZXIuanMnKTtcbnJlcXVpcmUoJy4vRE9NVmlldy5qcycpO1xucmVxdWlyZSgnLi9Nb2RlbC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFzY290O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNjb3QgICAgICAgID0gcmVxdWlyZSgnLi4vc2NyaXB0cy9pbmRleC5qcycpO1xudmFyIGFzc2VydCAgICAgICA9IGNoYWkuYXNzZXJ0O1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIEJhc2ljIE9iamVjdCBDb25zdHJ1Y3Rpb24gICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5kZXNjcmliZSgnQXNjb3QnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGVzY3JpcHRvckEgPSB7XG4gICAgICAgIGVudW1lcmFibGUgICA6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgICAgIHZhbHVlICAgICAgICA6ICdoZWxsbydcbiAgICB9O1xuXG4gICAgdmFyIGRlc2NyaXB0b3JCID0ge1xuICAgICAgICBlbnVtZXJhYmxlICAgOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGUgOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGUgICAgIDogdHJ1ZSxcbiAgICAgICAgdmFsdWUgICAgICAgIDogNVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzdWJ0cmFjdDUodmFsKSB7IHJldHVybiB2YWwgLSA1OyB9XG4gICAgZnVuY3Rpb24gcmV0dXJuVmFsKHZhbCkgeyByZXR1cm4gdmFsOyB9XG4gICAgZnVuY3Rpb24gc3VidHJhY3QzKHZhbCkgeyByZXR1cm4gdmFsIC0gMzsgfVxuICAgIGZ1bmN0aW9uIHNldFByb3BFKHZhbCkgeyB0aGlzLnByb3BFID0gdmFsOyB9XG5cbiAgICB2YXIgU2ltcGxlQ2xhc3MgPSBhc2NvdCh7XG4gICAgICAgIHByb3BBICAgICA6ICdoZWxsbycsXG4gICAgICAgIHByb3BCICAgICA6IHsgZW5tIDogdHJ1ZSwgY2ZnIDogZmFsc2UsIHZhbCA6IDUsIHdydDogdHJ1ZSB9LFxuICAgICAgICBwcm9wWCAgICAgOiB7IGVubSA6IHRydWUsIGNmZyA6IGZhbHNlLCB2YWwgOiAxMCwgd3J0OiB0cnVlIH0sXG4gICAgICAgIF9hY2NBICAgICA6IDUsXG4gICAgICAgIGFjY0EgICAgICA6IHsgZ2V0IDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9hY2NBOyB9IH0sXG4gICAgICAgIGZ1bmNBICAgICA6IGZ1bmN0aW9uKCkgeyByZXR1cm4gMTM7IH0sXG4gICAgICAgIGZ1bmNCICAgICA6IGZ1bmN0aW9uKHZhbCkgeyB0aGlzLnByb3BEID0gdmFsOyB9LFxuICAgICAgICBjb25zdHJ1Y3QgOiBmdW5jdGlvbih2YWwpIHsgdGhpcy5wcm9wQyA9IHZhbDsgfVxuICAgIH0pO1xuXG4gICAgdmFyIE1peGVkQ2xhc3NBID0gYXNjb3QoW1NpbXBsZUNsYXNzXSwge1xuICAgICAgICBmdW5jQSA6IHsgJGNoYWluICAgIDogW1NpbXBsZUNsYXNzLCBzdWJ0cmFjdDVdIH0sXG4gICAgICAgIGZ1bmNCIDogeyAkaXRlcmF0ZSAgOiBbU2ltcGxlQ2xhc3MsIHJldHVyblZhbF0gfSxcbiAgICAgICAgcHJvcFggOiB7ICRvdmVycmlkZSA6IDcgfVxuICAgIH0pO1xuXG4gICAgdmFyIE1peGVkQ2xhc3NCID0gYXNjb3QoW01peGVkQ2xhc3NBXSwge1xuICAgICAgICBmdW5jQSA6IHsgJGFmdGVyICA6IHN1YnRyYWN0MyB9LFxuICAgICAgICBmdW5jQiA6IHsgJGJlZm9yZSA6IHNldFByb3BFIH0sXG4gICAgICAgIGFjY0EgIDogNDJcbiAgICB9KTtcblxuICAgIHZhciBzaW1wbGVNb2R1bGUgPSBuZXcgU2ltcGxlQ2xhc3MoMTApO1xuICAgIHZhciBtaXhlZE1vZHVsZUEgPSBuZXcgTWl4ZWRDbGFzc0EoMTEpO1xuICAgIHZhciBtaXhlZE1vZHVsZUIgPSBuZXcgTWl4ZWRDbGFzc0IoMTMpO1xuXG4gICAgZGVzY3JpYmUoJ1NpbXBsZSBjbGFzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpdCgnc2hvdWxkIGJlIGdpdmVuIGEgZGVmYXVsdCBkZXNjcmlwdG9yIGlmIG9uZSBpcyBub3QgZ2l2ZW4nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoU2ltcGxlQ2xhc3MuZGVzY3JpcHRvci5wcm9wQSwgZGVzY3JpcHRvckEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGV4cGFuZCBzaG9ydGhhbmQgZGVzY3JpcHRvcnMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoU2ltcGxlQ2xhc3MuZGVzY3JpcHRvci5wcm9wQiwgZGVzY3JpcHRvckIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGwgdGhlIGNvbnN0cnVjdG9yJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHNpbXBsZU1vZHVsZS5wcm9wQywgMTApO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdNaXhlZCBjbGFzcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaXQoJ3Nob3VsZCBiZSBnaXZlbiBhIGRlZmF1bHQgZGVzY3JpcHRvciBpZiBvbmUgaXMgbm90IGdpdmVuJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobWl4ZWRNb2R1bGVBLCAncHJvcEEnKSwgZGVzY3JpcHRvckEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGV4cGFuZCBzaG9ydGhhbmQgZGVzY3JpcHRvcnMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtaXhlZE1vZHVsZUEsICdwcm9wQicpLCBkZXNjcmlwdG9yQik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsbCB0aGUgY29uc3RydWN0b3InLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVBLnByb3BDLCAxMSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgb3ZlcnJpZGUgd2hlbiB1c2luZyB0aGUgJG92ZXJyaWRlIG1vZGlmaWVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1peGVkTW9kdWxlQS5wcm9wWCwgNyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsbCBjaGFpbmVkIG1ldGhvZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVBLmZ1bmNBKCksIDgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGwgaXRlcmF0ZWQgbWV0aG9kcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUEuZnVuY0IoMTIpLCAxMik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgaW5jbHVkZSB0aGUgb3JpZ2luYWwgbWV0aG9kIGluIHRoZSBpdGVyYXRvcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUEucHJvcEQsIDEyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBhcHBlbmQgYSBmdW5jdGlvbiBhZnRlciBhIGNoYWluIHdoZW4gdXNpbmcgJGFmdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1peGVkTW9kdWxlQi5mdW5jQSgpLCA1KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCByZXR1cm4gdGhlIGxhc3QgdmFsdWUgZnJvbSBhbiBpdGVyYXRvcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUIuZnVuY0IoMTQpLCAxNCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcHJlcGVuZCBhIGZ1bmN0aW9uIHRvIGFuIGl0ZXJhdG9yIHdoZW4gdXNpbmcgJGJlZm9yZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUIucHJvcEUsIDE0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBlc3RhYmxpc2ggc2V0dGluZyBvZiBhY2Nlc3NlZCBwcm9wZXJ0eSB2YWx1ZXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVCLl9hY2NBLCA0Mik7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVCLmFjY0EsIDQyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ0V2ZW50RW1pdHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZW1pdHRlciA9IHRoaXMuZW1pdHRlciA9IG5ldyBhc2NvdC5FdmVudEVtaXR0ZXIoKTtcbiAgICB2YXIgZnVuY0EgPSBmdW5jdGlvbih2YWwpIHsgdGhpcy52YWxBID0gdmFsOyB9LmJpbmQoZW1pdHRlcik7XG4gICAgdmFyIGZ1bmNCID0gZnVuY3Rpb24odmFsKSB7IHRoaXMudmFsQiA9IHZhbDsgfS5iaW5kKGVtaXR0ZXIpO1xuXG4gICAgZW1pdHRlci5vbigndGVzdCcsIGZ1bmNBKTtcbiAgICBlbWl0dGVyLm9uKCd0ZXN0JywgZnVuY0IpO1xuXG4gICAgaXQoJ3Nob3VsZCBmaXJlIGFsbCByZWdpc3RlcmVkIGxpc3RlbmVycycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZW1pdHRlci5lbWl0KCd0ZXN0JywgNSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChlbWl0dGVyLnZhbEEsIDUpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoZW1pdHRlci52YWxCLCA1KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVtb3ZlIGxpc3RlbmVycycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZW1pdHRlci5vZmYoJ3Rlc3QnLCBmdW5jQik7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgndGVzdCcsIDcpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoZW1pdHRlci52YWxBLCA3KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGVtaXR0ZXIudmFsQiwgNSk7XG4gICAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ0RPTVZpZXcnLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgYXNjb3QuRE9NVmlldyhcbiAgICAgICAgeyB0ZXh0IDogJ0hlbGxvLCBXb3JsZCEnIH0sXG4gICAgICAgIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuICc8ZGl2IGNsYXNzPVwidGVzdFNlbGVjdG9yXCI+JyArIGRhdGEudGV4dCArICc8L2Rpdj4nOyB9XG4gICAgKTtcblxuICAgIHZhciBjb21wbGV4VmlldyA9IG5ldyBhc2NvdC5ET01WaWV3KFxuICAgICAgICBudWxsLFxuICAgICAgICBmdW5jdGlvbigpIHsgcmV0dXJuICc8ZGl2PjxkaXYgY2xhc3M9XCJ0ZXN0U2VsZWN0b3JcIj5IZWxsbywgV29ybGQhPC9kaXY+PC9kaXY+JzsgfVxuICAgICk7XG5cbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBhbiBIVE1MIGVsZW1lbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFzc2VydCh2aWV3LmVsZW1lbnQpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjb3JyZWN0bHkgdXNlIGEgdGVtcGxhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFzc2VydC5lcXVhbCh2aWV3LmVsZW1lbnQuaW5uZXJIVE1MLCAnSGVsbG8sIFdvcmxkIScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZS1yZW5kZXIgdGhlIHZpZXcgb24gY2hhbmdpbmcgZGF0YScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmlldy5kYXRhID0geyB0ZXh0IDogJ0hlbGxvLCBNb29uIScgfTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHZpZXcuZWxlbWVudC5pbm5lckhUTUwsICdIZWxsbywgTW9vbiEnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcnVuIHVwZGF0ZSgpIHdoZW4gY2hhbmdpbmcgZGF0YSBpZiBhdmFpbGFibGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZpZXcudXBkYXRlID0gZnVuY3Rpb24oZGF0YSkgeyB0aGlzLmVsZW1lbnQuaW5uZXJIVE1MID0gZGF0YS50ZXh0OyB9O1xuICAgICAgICB2aWV3LmRhdGEgICA9IHsgdGV4dCA6ICdIZWxsbywgU2t5IScgfTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHZpZXcuZWxlbWVudC5pbm5lckhUTUwsICdIZWxsbywgU2t5IScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZWdpc3RlciBzZWxlY3RvciBoYW5kbGVzIHBvaW50aW5nIHRvIGNoaWxkIGVsZW1lbnRzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb21wbGV4Vmlldy5oYW5kbGVzID0geyB0ZXN0IDogJy50ZXN0U2VsZWN0b3InIH07XG4gICAgICAgIGFzc2VydC5lcXVhbChjb21wbGV4Vmlldy50ZXN0LmlubmVySFRNTCwgJ0hlbGxvLCBXb3JsZCEnKTtcbiAgICB9KTtcbn0pO1xuXG5kZXNjcmliZSgnTW9kZWwnLCBmdW5jdGlvbigpIHtcbiAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICB2YXIgbW9kZWwgPSBuZXcgYXNjb3QuTW9kZWwoKTtcbiAgICB2YXIgc2FtcGxlRGF0YUEgPSB7XG4gICAgICAgICd2YWxBJyA6IDcsXG4gICAgICAgICd2YWxCJyA6IDEzLFxuICAgICAgICAnZ3JvdXBBJyA6IHtcbiAgICAgICAgICAgICd2YWxDJyA6IDE3LFxuICAgICAgICAgICAgJ3ZhbEInIDogMTlcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIHNhbXBsZURhdGFCID0ge1xuICAgICAgICAndmFsQScgOiA1XG4gICAgfTtcblxuICAgIGRlc2NyaWJlKCcjbG9hZCgpJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGl0KCdzaG91bGQgbG9hZCBuZXcgZGF0YSByZW1vdGVseScsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICBtb2RlbC5sb2FkKCdzYW1wbGUuanNvbicpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmNsZWFyKCk7XG5cbiAgICAgICAgICAgIG1vZGVsLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLnZhbEEsIHNhbXBsZURhdGFBLnZhbEEpO1xuICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5ncm91cEEudmFsQywgc2FtcGxlRGF0YUEuZ3JvdXBBLnZhbEMpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGJlIHNlcmlhbGl6ZWQgc3VjaCB0aGF0IGl0IGlzIGlkZW50aWNhbCB0byB0aGUgbG9hZGVkIGRhdGEnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoSlNPTi5zdHJpbmdpZnkobW9kZWwpLCBKU09OLnN0cmluZ2lmeShzYW1wbGVEYXRhQSkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGxvYWQgZXhpc3RpbmcgZGF0YSBsb2NhbGx5JywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVsnc2FtcGxlLmpzb24nXSA9IEpTT04uc3RyaW5naWZ5KHNhbXBsZURhdGFCKTtcbiAgICAgICAgICAgIG1vZGVsLmxvYWQoJ3NhbXBsZS5qc29uJyk7XG4gICAgICAgICAgICBtb2RlbC5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC52YWxBLCA1KTtcbiAgICAgICAgICAgICAgICBtb2RlbC5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBhbHdheXMgbG9hZCBkYXRhIHJlbW90ZWx5IGlmIHByZWZlck9ubGluZSBpcyB0cnVlJywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVsnc2FtcGxlLmpzb24nXSA9IEpTT04uc3RyaW5naWZ5KHNhbXBsZURhdGFCKTtcbiAgICAgICAgICAgIG1vZGVsLnByZWZlck9ubGluZSA9IHRydWU7XG4gICAgICAgICAgICBtb2RlbC5sb2FkKCdzYW1wbGUuanNvbicpO1xuICAgICAgICAgICAgbW9kZWwub24oJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwudmFsQSwgc2FtcGxlRGF0YUEudmFsQSk7XG4gICAgICAgICAgICAgICAgbW9kZWwucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICAgICAgbW9kZWwucHJlZmVyT25saW5lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgbm90IHN0b3JlIGRhdGEgbG9jYWxseSBpZiBzdG9yZUxvY2FsIGlzIGZhbHNlJywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5jbGVhcigpO1xuICAgICAgICAgICAgbW9kZWwuc3RvcmVMb2NhbCA9IGZhbHNlO1xuICAgICAgICAgICAgbW9kZWwubG9hZCgnc2FtcGxlLmpzb24nKTtcbiAgICAgICAgICAgIG1vZGVsLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0Lm5vdE9rKGxvY2FsU3RvcmFnZVsnc2FtcGxlLmpzb24nXSk7XG4gICAgICAgICAgICAgICAgbW9kZWwucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc3RvcmVMb2NhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJyNyZXNvbHZlKCknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGl0KCdzaG91bGQgcmVzb2x2ZSBhIHBhdGggdG8gdGhlIGNvcnJlY3QgdmFsdWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIG1vZGVsLnNldCh7IG9iakEgOiB7IHZhbEEgOiA4IH19KTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5yZXNvbHZlKCdvYmpBLnZhbEEnKSwgOCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJyNzZXQoKScsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpdCgnc2hvdWxkIHRha2UgYW4gb2JqZWN0IGFzIGEgcGFyYW1ldGVyIGFuZCBzZXQgbmV3IGRhdGEnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBtb2RlbC5zZXQoe3ZhbEQgOiAxN30pO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLnZhbEQsIDE3KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCB0YWtlIGEgcGF0aCBhbmQgYSB2YWx1ZSBhbmQgY2hhbmdlIGEgc3BlY2lmaWMgZW50cnknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBtb2RlbC5zZXQoJ2dyb3VwQS52YWxDJywgMjEpO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdyb3VwQS52YWxDLCAyMSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgdHJpZ2dlciB0aGUgb25jaGFuZ2UgZXZlbnQgd2hlbiBhIGNoYW5nZSBpcyBtYWRlJywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIG1vZGVsLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihkYXRhLCBwYXRoKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGRhdGEsIG1vZGVsKTtcbiAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwocGF0aCwgJ2dyb3VwQS52YWxDJyk7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBtb2RlbC5zZXQoJ2dyb3VwQS52YWxDJywgMjMpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuXG5kZXNjcmliZSgnTW9kZWwvVmlldyBCaW5kaW5nJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciB2aWV3O1xuICAgIHZhciBtb2RlbCA9IG5ldyBhc2NvdC5Nb2RlbCgpO1xuICAgIGZ1bmN0aW9uIHRlbXBsYXRlKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICc8ZGl2PicgKyBkYXRhLnZhbEEgKyAnPC9kaXY+JztcbiAgICB9XG5cbiAgICB2aWV3ICA9IG5ldyBhc2NvdC5ET01WaWV3KG1vZGVsLCB0ZW1wbGF0ZSk7XG5cbiAgICBpdCgnc2hvdWxkIHBhc3MgbmV3IGRhdGEgaW4gdG8gaXRzIHRlbXBsYXRlIHdoZW4gdGhlIG1vZGVsIGNoYW5nZXMnLCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICBtb2RlbC5sb2FkKCdzYW1wbGUuanNvbicpO1xuICAgICAgICBtb2RlbC5vbignbG9hZCcsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh2aWV3LmVsZW1lbnQuaW5uZXJIVE1MLCA3KTtcbiAgICAgICAgICAgIGRhdGEuc2V0KCd2YWxBJywgMTMpO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHZpZXcuZWxlbWVudC5pbm5lckhUTUwsIDEzKTtcbiAgICAgICAgICAgIG1vZGVsLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIl19
;