require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"UI2WPJ":[function(require,module,exports){
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

},{}],"ascot":[function(require,module,exports){
module.exports=require('UI2WPJ');
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

},{"./Ascot.js":"UI2WPJ","./EventEmitter.js":"BvhrnU"}],"ascot.DOMView":[function(require,module,exports){
module.exports=require('GirLh0');
},{}],"BvhrnU":[function(require,module,exports){
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

},{"./Ascot.js":"UI2WPJ"}],"ascot.EventEmitter":[function(require,module,exports){
module.exports=require('BvhrnU');
},{}],"FFRxKb":[function(require,module,exports){
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

},{"./Ascot.js":"UI2WPJ","./EventEmitter.js":"BvhrnU"}],"ascot.Model":[function(require,module,exports){
module.exports=require('FFRxKb');
},{}],9:[function(require,module,exports){
'use strict';
/* jshint unused : false */

var ascot        = require('./Ascot.js');
var EventEmitter = require('./EventEmitter.js');
var DOMView      = require('./DOMView.js');
var Model        = require('./Model.js');

module.exports = ascot;
},{"./Ascot.js":"UI2WPJ","./DOMView.js":"GirLh0","./EventEmitter.js":"BvhrnU","./Model.js":"FFRxKb"}],10:[function(require,module,exports){
'use strict';

var ascot = require('../scripts/index.js');

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

},{"../scripts/index.js":9}]},{},[10])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcnlhbnZhbmd1bmR5L0RvY3VtZW50cy9Bc2NvdC9zY3JpcHRzL0FzY290LmpzIiwiL1VzZXJzL3J5YW52YW5ndW5keS9Eb2N1bWVudHMvQXNjb3Qvc2NyaXB0cy9ET01WaWV3LmpzIiwiL1VzZXJzL3J5YW52YW5ndW5keS9Eb2N1bWVudHMvQXNjb3Qvc2NyaXB0cy9FdmVudEVtaXR0ZXIuanMiLCIvVXNlcnMvcnlhbnZhbmd1bmR5L0RvY3VtZW50cy9Bc2NvdC9zY3JpcHRzL01vZGVsLmpzIiwiL1VzZXJzL3J5YW52YW5ndW5keS9Eb2N1bWVudHMvQXNjb3Qvc2NyaXB0cy9pbmRleC5qcyIsIi9Vc2Vycy9yeWFudmFuZ3VuZHkvRG9jdW1lbnRzL0FzY290L3Rlc3QvdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3ZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIHRvcC1sZXZlbCBhc2NvdCBmdW5jdGlvbi4gIENyZWF0ZXMgbmV3IHByb3RvdHlwZXMgYnkgbWl4aW5nIHRvZ2V0aGVyIGFuIGFycmF5IG9mIHByb3RvdHlwZXNcbiAqIGFuZCBhcHBseWluZyBhbiBleHBhbmRlZCBkZXNjcmlwdG9yIHRoYXQgaW5jbHVkZXMgbWl4aW4gbW9kaWZpZXJzLlxuICogQHBhcmFtICB7QXJyYXl9ICBtaXhpbnMgICAgIEFuIGFycmF5IG9mIHByb3RvdHlwZXMgdG8gbWl4IGluXG4gKiBAcGFyYW0gIHtPYmplY3R9IGRlc2NyaXB0b3IgQSBwcm9wZXJ0eSBkZXNjcmlwdG9yXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgICAgQSBuZXcgb2JqZWN0IHByb3RvdHlwZVxuICovXG5mdW5jdGlvbiBhc2NvdCgvKiBhcmd1bWVudHMgKi8pIHtcbiAgICB2YXIgbWl4aW5zLCBkZXNjcmlwdG9yLCBjb25zdHJ1Y3RvciwgaXRlbTtcblxuICAgIC8vIEVzdGFibGlzaCBhcHByb3ByaWF0ZSBhcmd1bWVudHNcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBtaXhpbnMgICAgID0gYXJndW1lbnRzWzBdO1xuICAgICAgICBkZXNjcmlwdG9yID0gYXJndW1lbnRzWzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG1peGlucyAgICAgPSBbXTtcbiAgICAgICAgZGVzY3JpcHRvciA9IGFyZ3VtZW50c1swXTtcbiAgICB9XG5cbiAgICBkZXNjcmlwdG9yID0gZGVzY3JpcHRvciB8fCB7fTtcblxuICAgIC8vIENvbGxlY3QgZWFjaCBwcm90b3R5cGUncyBkZXNjcmlwdG9yXG4gICAgZm9yICh2YXIgaT0wLCBsZW49bWl4aW5zLmxlbmd0aDsgaTxsZW47IGkrPTEpIHtcbiAgICAgICAgaXRlbSA9IG1peGluc1tpXTtcblxuICAgICAgICAvLyBBbGxvdyBmb3Igc3RyaW5nIHJlZmVyZW5jZXMgdG8gYmFzZSBhc2NvdCBjbGFzc2VzXG4gICAgICAgIGl0ZW0gPSBtaXhpbnNbaV0gPSB0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgPyBhc2NvdFtpdGVtXSA6IGl0ZW07XG4gICAgICAgIG1peGluc1tpXSA9IGl0ZW0uZGVzY3JpcHRvcjtcbiAgICB9XG5cbiAgICAvLyBFeHBhbmQgYW5kIGFkZCBjdXJyZW50IGRlc2NyaXB0b3IgdG8gbWl4aW5zXG4gICAgZm9yICh2YXIgaiBpbiBkZXNjcmlwdG9yKSB7XG4gICAgICAgIGRlc2NyaXB0b3Jbal0gPSBleHBhbmREZXNjcmlwdG9yKGRlc2NyaXB0b3Jbal0pO1xuICAgIH1cblxuICAgIG1peGlucy5wdXNoKGRlc2NyaXB0b3IpO1xuICAgIGRlc2NyaXB0b3IgPSBjb21iaW5lRGVzY3JpcHRvcnMobWl4aW5zKTtcblxuICAgIC8vIEZvcm0gYSBuZXcgY29uc3RydWN0b3JcbiAgICBjb25zdHJ1Y3RvciA9IGNyZWF0ZUNvbnN0cnVjdG9yKGRlc2NyaXB0b3IpO1xuXG4gICAgcmV0dXJuIGNvbnN0cnVjdG9yO1xufVxuXG4vKioqKioqKioqKioqKioqKioqXG4gKiAgQ29uc3RydWN0aW9uICAqXG4gKioqKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgY29uc3RydWN0b3IgdGhhdCBtYXkgYmUgdXNlZCB0byBjcmVhdGUgb2JqZWN0cyB3aXRoIHRoZSAnbmV3JyBrZXl3b3JkXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gQSBzdGFuZGFyZCBjb25zdHJ1Y3RvciBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBjcmVhdGVDb25zdHJ1Y3RvcihkZXNjcmlwdG9yKSB7XG4gICAgdmFyIGNvbnN0cnVjdG9yID0gKGZ1bmN0aW9uKGRlc2MpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKC8qIGFyZ3VtZW50cyAqLykge1xuICAgICAgICAgICAgLyoganNoaW50IHZhbGlkdGhpcyA6IHRydWUgKi9cbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIGRlZXBDb3B5KGRlc2MpKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY29uc3RydWN0KSB7IHRoaXMuY29uc3RydWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH1cbiAgICAgICAgfTtcbiAgICB9KShkZXNjcmlwdG9yKTtcblxuICAgIGNvbnN0cnVjdG9yLnByb3RvdHlwZSAgPSB7fTtcbiAgICBjb25zdHJ1Y3Rvci5kZXNjcmlwdG9yID0gZGVzY3JpcHRvcjtcblxuICAgIHJldHVybiBjb25zdHJ1Y3Rvcjtcbn1cblxuLyoqKioqKioqKioqKioqKioqXG4gKiAgRGVzY3JpcHRvcnMgICpcbiAqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBFeHBhbmRzIGEgc2hvcnRoYW5kIGRlc2NyaXB0b3IgdG8gYSBmb3JtYWwgZGVzY3JpcHRvci4gIEEgc2hvcnRoYW5kIGRlc2NyaXB0b3IgY29uc2lzdHNcbiAqIG9mIHRocmVlLWNoYXJhY3RlciBhYmJyZXZpYXRpb25zIG9mICd3cml0YWJsZScsICdjb25maWd1cmFibGUnLCBldGMuIGluIHRoZSBmb3JtIDpcbiAqIHdydCwgY2ZnLCBlbm0sIHZhbCBhbG9uZyB3aXRoIHRoZSBub3JtYWwgZ2V0ICYgc2V0LiAgQWRkaXRpb25hbGx5LCBwcm9wZXJ0aWVzIGZvciB3aGljaFxuICogYSBwcm9wZXJ0eSBkZXNjcmlwdG9yIGhhcyBub3QgYmVlbiBzZXQgZ2V0IGEgZGVmYXVsdCBkZXNjcmlwdG9yLlxuICogQHBhcmFtIHtPYmplY3R9IGRlc2NyaXB0b3IgQSBzaG9ydGhhbmQgZGVzY3JpcHRvclxuICovXG5mdW5jdGlvbiBleHBhbmREZXNjcmlwdG9yKGRlc2NyaXB0b3IpIHtcbiAgICB2YXIgbmV3RGVzY3JpcHRvciA9IHt9O1xuXG4gICAgaWYgKCFkZXNjcmlwdG9yKSB7IHJldHVybjsgfVxuXG4gICAgLy8gRXhwYW5kIHRoZSBkZXNjcmlwdG9yIGlmIHRoZSBhcmd1bWVudCBpcyBhIHZhbGlkIGRlc2NyaXB0b3JcbiAgICBpZiAoaXNEZXNjcmlwdG9yKGRlc2NyaXB0b3IpKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gZGVzY3JpcHRvcikge1xuICAgICAgICAgICAgc3dpdGNoIChpKSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ2VubScgOlxuICAgICAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3JbaV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2NmZycgOlxuICAgICAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gZGVzY3JpcHRvcltpXTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnd3J0JyA6XG4gICAgICAgICAgICAgICAgbmV3RGVzY3JpcHRvci53cml0YWJsZSA9IGRlc2NyaXB0b3JbaV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ3ZhbCcgOlxuICAgICAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3IudmFsdWUgPSBkZXNjcmlwdG9yW2ldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICBuZXdEZXNjcmlwdG9yW2ldID0gZGVzY3JpcHRvcltpXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdEZXNjcmlwdG9yO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIGRlZmF1bHQgZGVzY2lwdG9yXG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3cml0YWJsZSAgICAgOiB0cnVlLFxuICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZSAgICAgICAgOiBkZXNjcmlwdG9yXG4gICAgICAgIH07XG4gICAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcHJvdG90eXBlIGZyb20gYSBzZXQgb2YgcHJvcGVydHkgZGVzY3JpcHRvciBvYmplY3RzLiAgVGhlIHByb3RvdHlwZVxuICogaXMgdGhlIHJlc3VsdCBmcm9tIGFcbiAqIEBwYXJhbSB7QXJyYXl9IGRlc2NyaXB0b3JzIEFuIGFycmF5IG9mIGV4cGFuZGVkIGRlc2NyaXB0b3JzLlxuICovXG5mdW5jdGlvbiBjb21iaW5lRGVzY3JpcHRvcnMoZGVzY3JpcHRvcnMpIHtcbiAgICB2YXIgZGVzYywgYXBwZW5kZWREZXNjLCBwcm9wTmFtZTtcbiAgICB2YXIgbmV3RGVzY3JpcHRvciA9IHt9O1xuXG4gICAgZm9yICh2YXIgaT0wLCBsZW49ZGVzY3JpcHRvcnMubGVuZ3RoOyBpPGxlbjsgaSs9MSkge1xuICAgICAgICBkZXNjID0gZGVzY3JpcHRvcnNbaV07XG5cbiAgICAgICAgZm9yICh2YXIgaiBpbiBkZXNjKSB7XG4gICAgICAgICAgICBhcHBlbmRlZERlc2MgPSBhcHBlbmREZXNjcmlwdG9yKGosIG5ld0Rlc2NyaXB0b3Jbal0sIGRlc2Nbal0pO1xuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgYXNzaWduaW5nIGEgdmFsdWUgdG8gYW4gYWNjZXNzZWQgcHJvcGVydHlcbiAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3Jbal0gPSBhcHBlbmRlZERlc2MgPT09IHRydWUgPyBuZXdEZXNjcmlwdG9yW2pdIDogYXBwZW5kZWREZXNjO1xuXG4gICAgICAgICAgICAvLyBBc3NpZ24gdmFsdWUgdG8gYWNjZXNzZWQgcHJvcGVydHlcbiAgICAgICAgICAgIGlmIChhcHBlbmRlZERlc2MgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBwcm9wTmFtZSA9ICdfJyArIGo7XG4gICAgICAgICAgICAgICAgbmV3RGVzY3JpcHRvcltwcm9wTmFtZV0gPSBuZXdEZXNjcmlwdG9yW3Byb3BOYW1lXSB8fCB7fTtcbiAgICAgICAgICAgICAgICBuZXdEZXNjcmlwdG9yW3Byb3BOYW1lXS52YWx1ZSA9IGRlc2Nbal0udmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3RGVzY3JpcHRvcjtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIGEgZGVzY3JpcHRvciB0byBhIHRhcmdldCBkZXNjcmlwdG9yXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlOYW1lIFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBhc3NvY2lhdGVkIHdpdGggdGhpcyBkZXNjcmlwdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0ICAgICAgIEEgdGFyZ2V0IGRlc2NyaXB0b3IgdG8gYXBwZW5kIHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZGVzY3JpcHRvciAgIEFuIGV4cGFuZGVkIGRlc2NyaXB0b3IgaW5jbHVkaW5nIG1peGluIG1vZGlmaWVyc1xuICovXG5mdW5jdGlvbiBhcHBlbmREZXNjcmlwdG9yKHByb3BlcnR5TmFtZSwgdGFyZ2V0LCBkZXNjcmlwdG9yKSB7XG4gICAgdmFyIG1vZGlmaWVyO1xuICAgIHZhciBpc05ldyA9ICF0YXJnZXQ7XG5cbiAgICB0YXJnZXQgPSB0YXJnZXQgfHwge307XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGlzIGlzIGFuIGltcGxpY2l0IGFjY2Vzc29yIHZhbHVlIG92ZXJyaWRlXG4gICAgaWYgKCh0YXJnZXQuZ2V0IHx8IHRhcmdldC5zZXQpICYmIChkZXNjcmlwdG9yLnZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IG1vZGlmaWVycyBhbmQgY29weSBvdmVyIG5ldyBkZXNjcmlwdG9yIHByb3BlcnRpZXNcbiAgICBmb3IgKHZhciBpIGluIGRlc2NyaXB0b3IpIHtcblxuICAgICAgICAvLyBSZXRhaW4gbWl4aW4gbW9kaWZpZXJzXG4gICAgICAgIGlmIChpLmluZGV4T2YoJyQnKSA+PSAwKSB7XG4gICAgICAgICAgICBtb2RpZmllciAgICAgICA9IHt9O1xuICAgICAgICAgICAgbW9kaWZpZXIua2V5ICAgPSBpO1xuICAgICAgICAgICAgbW9kaWZpZXIudmFsdWUgPSB0YXJnZXRbaV0gPSBkZXNjcmlwdG9yW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29weSBvdmVyIG5vcm1hbCBkZXNjcmlwdG9yIHByb3BlcnRpZXNcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbaV0gPSBkZWVwQ29weShkZXNjcmlwdG9yW2ldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9LIHRvIGFwcGx5IG1vZGlmaWVyc1xuICAgIGlmIChtb2RpZmllcikge1xuICAgICAgICBhcHBseU1vZGlmaWVyKHByb3BlcnR5TmFtZSwgdGFyZ2V0LCBtb2RpZmllcik7XG4gICAgfVxuXG4gICAgLy8gQWx3YXlzIGFsbG93IG92ZXJ3cml0aW5nIG9mIG5vdGF0aW9uYWwgcHJpdmF0ZSB2YXJpYWJsZXNcbiAgICBlbHNlIGlmIChwcm9wZXJ0eU5hbWUuaW5kZXhPZignXycpID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAgLy8gRG9uJ3QgYWxsb3cgaW5hZHZlcnRhbnQgb3ZlcnJpZGVzXG4gICAgZWxzZSBpZiAoIW1vZGlmaWVyICYmICFpc05ldykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F0dGVtcHRlZCB0byBvdmVyd3JpdGUgYW4gZXhpc3RpbmcgcHJvcGVydHkgd2l0aG91dCBhIG1vZGlmaWVyLiBBcHBseSBhIG1vZGlmaWVyIG9yIHVzZSAkb3ZlcnJpZGUuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqKioqKioqKioqKioqKioqKioqKlxuICogIE1peGluIE1vZGlmaWVycyAgKlxuICoqKioqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBBcHBsaWVzIGEgbW9kaWZpZXIgdG8gYSBkZXNjcmlwdG9yLCBjcmVhdGluZyBhcHByb3ByaWF0ZSBpdGVyYXRvcnMgb3IgYXBwZW5kaW5nL3ByZXBlbmRpbmdcbiAqIHRvIGV4aXN0aW5nIG1ldGhvZHMuXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlOYW1lIFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBhc3NvY2lhdGVkIHdpdGggdGhpcyBkZXNjcmlwdG9yXG4gKiBAcGFyYW0ge09iamVjdHN9IGRlc2NyaXB0b3IgQSB0YXJnZXQgZGVzY3JpcHRvciB0byBtb2RpZnlcbiAqIEBwYXJhbSB7T2JqZWN0fSAgbW9kaWZpZXIgICBBIGtleSBhbmQgdmFsdWUgZGVzY3JpYmluZyBhIHBhcnRpY3VsYXIgbW9kaWZpZXJcbiAqL1xuZnVuY3Rpb24gYXBwbHlNb2RpZmllcihwcm9wZXJ0eU5hbWUsIGRlc2NyaXB0b3IsIG1vZGlmaWVyKSB7XG4gICAgdmFyIGNhbGxzO1xuICAgIHZhciB2YWwgPSBkZXNjcmlwdG9yLnZhbHVlO1xuXG4gICAgc3dpdGNoIChtb2RpZmllci5rZXkpIHtcblxuICAgIGNhc2UgJyRjaGFpbicgOlxuICAgICAgICBjYWxscyA9IHByb2Nlc3NDYWxscyhwcm9wZXJ0eU5hbWUsIG1vZGlmaWVyLnZhbHVlKTtcbiAgICAgICAgZGVzY3JpcHRvci52YWx1ZSA9IGNyZWF0ZUNoYWluKGNhbGxzKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICckaXRlcmF0ZScgOlxuICAgICAgICBjYWxscyA9IHByb2Nlc3NDYWxscyhwcm9wZXJ0eU5hbWUsIG1vZGlmaWVyLnZhbHVlKTtcbiAgICAgICAgZGVzY3JpcHRvci52YWx1ZSA9IGNyZWF0ZUl0ZXJhdG9yKGNhbGxzKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICckYmVmb3JlJyA6XG4gICAgICAgIGRlc2NyaXB0b3IudmFsdWUgPSBwcmVwZW5kSXRlcmF0b3IodmFsLCBtb2RpZmllci52YWx1ZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnJGFmdGVyJyA6XG4gICAgICAgIGRlc2NyaXB0b3IudmFsdWUgPSBhcHBlbmRJdGVyYXRvcih2YWwsIG1vZGlmaWVyLnZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICckb3ZlcnJpZGUnIDpcbiAgICAgICAgYXBwbHlPdmVycmlkZShkZXNjcmlwdG9yLCBtb2RpZmllci52YWx1ZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdCA6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBkZXNjcmlwdG9yO1xufVxuXG4vKipcbiAqIFByb2Nlc3NlcyBwYXNzZWQgY2FsbHMgZnJvbSBhIGl0ZXJhdG9yIHByb3BlcnR5IGRlc2NyaXB0b3IuICBJZiBhbiBpdGVtIGlzIGFcbiAqIGNvbnN0cnVjdG9yLCBhIGZ1bmN0aW9uIG9mIHRoZSBnaXZlbiBuYW1lIGlzIHNvdWdodCBvbiBhIGRlc2NyaXB0b3IgYW5kIHVzZWQgaW5zdGVhZC5cbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lICBUaGUgbmFtZSBvZiB0aGUgbWV0aG9kIHRvIGl0ZXJhdGVcbiAqIEBwYXJhbSAge0FycmF5fSAgICBpdGVtcyBPYmplY3RzIGFuZCBmdW5jdGlvbnMgY29tcG9zaW5nIHRoZSBpdGVyYXRvclxuICogQHJldHVybiB7QXJyYXl9ICAgICAgIFRoZSBuZXcgaXRlcmF0b3JcbiAqL1xuZnVuY3Rpb24gcHJvY2Vzc0NhbGxzKG5hbWUsIGl0ZW1zKSB7XG4gICAgdmFyIGl0ZW07XG4gICAgdmFyIGNhbGxzID0gW107XG5cbiAgICAvLyBBZGQgZWFjaCBpdGVtIHRvIHRoZSBpdGVyYXRvclxuICAgIGZvciAodmFyIGk9MCwgbGVuPWl0ZW1zLmxlbmd0aDsgaTxsZW47IGkrPTEpIHtcbiAgICAgICAgaXRlbSA9IGl0ZW1zW2ldO1xuXG4gICAgICAgIGlmICghaXRlbSkgeyBjb250aW51ZTsgfVxuXG4gICAgICAgIC8vIFNlZWsgYSBmdW5jdGlvbiB3aXRoaW4gYSBwcm90b3R5cGUgYW5kIGFkZCB0byB0aGUgaXRlcmF0b3JcbiAgICAgICAgaWYgKGl0ZW0uZGVzY3JpcHRvciAmJiB0eXBlb2YgaXRlbS5kZXNjcmlwdG9yW25hbWVdLnZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxscy5wdXNoKGl0ZW0uZGVzY3JpcHRvcltuYW1lXS52YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZnVuY3Rpb25zIHRvIHRoZSBpdGVyYXRvciBkaXJlY3RseVxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbHMucHVzaChpdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjYWxscztcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuZCByZXR1cm5zIGEgY2hhaW5pbmcgaXRlcmF0b3JcbiAqIEBwYXJhbSB7QXJyYXl9IGNhbGxzIEEgbGlzdCBvZiBjYWxscyBhc3NvY2lhdGVkIHdpdGggdGhlIGl0ZXJhdG9yXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNoYWluKGNhbGxzKSB7XG5cbiAgICAvLyBDcmVhdGUgdGhlIGl0ZXJhdG9yIG1ldGhvZCB0aGF0IGNoYWlucyB0aHJvdWdoIGVhY2ggY2FsbFxuICAgIGZ1bmN0aW9uIGl0ZXJhdG9yKCkge1xuICAgICAgICAvKiBqc2hpbnQgdmFsaWR0aGlzIDogdHJ1ZSAqL1xuICAgICAgICB2YXIgYXJncyAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICB2YXIgY2FsbHMgPSBpdGVyYXRvci5fY2FsbHM7XG5cbiAgICAgICAgZm9yICh2YXIgaj0wLCBqTGVuPWNhbGxzLmxlbmd0aDsgajxqTGVuOyBqKz0xKSB7XG4gICAgICAgICAgICBhcmdzWzBdID0gY2FsbHNbal0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXJnc1swXTtcbiAgICB9XG5cbiAgICBpdGVyYXRvci5fY2FsbHMgPSBjYWxscztcblxuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuZCByZXR1cm5zIGEgY2hhaW5pbmcgaXRlcmF0b3JcbiAqIEBwYXJhbSB7QXJyYXl9IGNhbGxzIEEgbGlzdCBvZiBjYWxscyBhc3NvY2lhdGVkIHdpdGggdGhlIGl0ZXJhdG9yXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUl0ZXJhdG9yKGNhbGxzKSB7XG5cbiAgICAvLyBDcmVhdGUgdGhlIGl0ZXJhdG9yIG1ldGhvZCB0aGF0IGNoYWlucyB0aHJvdWdoIGVhY2ggY2FsbFxuICAgIGZ1bmN0aW9uIGl0ZXJhdG9yKCkge1xuICAgICAgICAvKiBqc2hpbnQgdmFsaWR0aGlzIDogdHJ1ZSAqL1xuICAgICAgICB2YXIgdmFsO1xuICAgICAgICB2YXIgYXJncyAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICB2YXIgY2FsbHMgPSBpdGVyYXRvci5fY2FsbHM7XG5cbiAgICAgICAgZm9yICh2YXIgaj0wLCBqTGVuPWNhbGxzLmxlbmd0aDsgajxqTGVuOyBqKz0xKSB7XG4gICAgICAgICAgICB2YWwgPSBjYWxsc1tqXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuXG4gICAgaXRlcmF0b3IuX2NhbGxzID0gY2FsbHM7XG5cbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbi8qKlxuICogUHJlcGVuZHMgYSBmdW5jdGlvbiB0byBhbiBleGlzdGluZyBpdGVyYXRvci4gIENyZWF0ZXMgYW4gaXRlcmF0b3IgaWYgb25lIGhhZCBub3RcbiAqIHlldCBiZWVuIGNyZWF0ZWQuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gaXRlcmF0b3IgQW4gZXhpc3RpbmcgaXRlcmF0b3IgZnVuY3Rpb25cbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiAgICAgICBBIGZ1bmN0aW9uIHRvIGFwcGVuZFxuICogQHJldHVybiB7RnVuY3Rpb259ICAgICAgICAgIGl0ZXJhdG9yXG4gKi9cbmZ1bmN0aW9uIHByZXBlbmRJdGVyYXRvcihpdGVyYXRvciwgZm4pIHtcbiAgICB2YXIgY2FsbHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChpdGVyYXRvci5fY2FsbHMsIDApO1xuXG4gICAgaWYgKHR5cGVvZiBpdGVyYXRvciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gZm47XG4gICAgfVxuXG4gICAgLy8gUHJlcGVuZCB0byBhbiBleGlzdGluZyBpdGVyYXRvclxuICAgIGlmIChjYWxscykge1xuICAgICAgICBjYWxscy5zcGxpY2UoMCwgMCwgZm4pO1xuICAgICAgICBpdGVyYXRvci5fY2FsbHMgPSBjYWxscztcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgaXRlcmF0b3IgaWYgb25lIGhhZCBub3QgYmVlbiBjcmVhdGVkXG4gICAgZWxzZSB7XG4gICAgICAgIGl0ZXJhdG9yID0gY3JlYXRlSXRlcmF0b3IoW2ZuLCBpdGVyYXRvcl0pO1xuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIGEgZnVuY3Rpb24gdG8gYW4gZXhpc3RpbmcgaXRlcmF0b3IuICBDcmVhdGVzIGFuIGl0ZXJhdG9yIGlmIG9uZSBoYWQgbm90XG4gKiB5ZXQgYmVlbiBjcmVhdGVkLlxuICogQHBhcmFtICB7RnVuY3Rpb259IGl0ZXJhdG9yIEFuIGV4aXN0aW5nIGl0ZXJhdG9yIGZ1bmN0aW9uXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gICAgICAgQSBmdW5jdGlvbiB0byBhcHBlbmRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSAgICAgICAgICBpdGVyYXRvclxuICovXG5mdW5jdGlvbiBhcHBlbmRJdGVyYXRvcihpdGVyYXRvciwgZm4pIHtcbiAgICB2YXIgY2FsbHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChpdGVyYXRvci5fY2FsbHMsIDApO1xuXG4gICAgaWYgKHR5cGVvZiBpdGVyYXRvciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gZm47XG4gICAgfVxuXG4gICAgLy8gUHJlcGVuZCB0byBhbiBleGlzdGluZyBpdGVyYXRvclxuICAgIGlmIChjYWxscykge1xuICAgICAgICBjYWxscy5wdXNoKGZuKTtcbiAgICAgICAgaXRlcmF0b3IuX2NhbGxzID0gY2FsbHM7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IGl0ZXJhdG9yIGlmIG9uZSBoYWQgbm90IGJlZW4gY3JlYXRlZFxuICAgIGVsc2Uge1xuICAgICAgICBpdGVyYXRvciA9IGNyZWF0ZUl0ZXJhdG9yKFtpdGVyYXRvciwgZm5dKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbi8qKlxuICogQXBwbGllcyB0aGUgYXBwcm9wcmlhdGUgb3ZlcnJpZGUuIEFjY2Vzc29yIHByb3BlcnRpZXMgbWF5IGJlIG92ZXJyaWRkZW5cbiAqIGJ5IHNwZWNpZnlpbmcgJG92ZXJyaWRlIDogdHJ1ZSwgd2hlcmVhcyBkYXRhIHByb3BlcnRpZXMgaGF2ZSB0aGVpciB2YWx1ZXMgb3ZlcnJpZGRlblxuICogYnkgJG92ZXJyaWRlIDogbmV3VmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSAgZGVzY3JpcHRvciBUaGUgZGVzY3JpcHRvciB0byBhcHBseSB0aGUgb3ZlcnJpZGUgdG9cbiAqIEBwYXJhbSB7VmFyaWFudH0gb3ZlcnJpZGUgICAgICAgIEEgZnVuY3Rpb24gbGlzdGVkIHVuZGVyIGRlc2NyaXB0b3IudmFsdWVcbiAqL1xuZnVuY3Rpb24gYXBwbHlPdmVycmlkZShkZXNjcmlwdG9yLCBvdmVycmlkZSkge1xuXG4gICAgLy8gT25seSBtb2RpZnkgdmFsdWVzIGZvciBkYXRhIHByb3BlcnRpZXNcbiAgICBpZiAoIWRlc2NyaXB0b3IuZ2V0ICYmICFkZXNjcmlwdG9yLnNldCkge1xuICAgICAgICBkZXNjcmlwdG9yLnZhbHVlID0gb3ZlcnJpZGU7XG4gICAgfVxufVxuXG4vKioqKioqKioqKioqKioqXG4gKiAgVXRpbGl0aWVzICAqXG4gKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIERldGVybWluZXMgaWYgYW4gb2JqZWN0IGlzIGEgZGVzY3JpcHRvclxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBBIHByb3Bvc2VkIGRlc2NyaXB0b3JcbiAqL1xuZnVuY3Rpb24gaXNEZXNjcmlwdG9yKG9iaikge1xuICAgIGlmICghb2JqIHx8IG9iaiAhPT0gT2JqZWN0KG9iaikpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICBpZiAoXG4gICAgICAgICdlbm0nIGluIG9iaiB8fFxuICAgICAgICAnY2ZnJyBpbiBvYmogfHxcbiAgICAgICAgJ3dydCcgaW4gb2JqIHx8XG4gICAgICAgICd2YWwnIGluIG9iaiB8fFxuICAgICAgICAnZW51bWVyYWJsZScgaW4gb2JqIHx8XG4gICAgICAgICdjb25maWd1cmFibGUnIGluIG9iaiB8fFxuICAgICAgICAnd3JpdGFibGUnIGluIG9iaiB8fFxuICAgICAgICAndmFsdWUnIGluIG9iaiB8fFxuICAgICAgICAnZ2V0JyBpbiBvYmogfHxcbiAgICAgICAgJ3NldCcgaW4gb2JqIHx8XG4gICAgICAgICckY2hhaW4nIGluIG9iaiB8fFxuICAgICAgICAnJGl0ZXJhdGUnIGluIG9iaiB8fFxuICAgICAgICAnJGJlZm9yZScgaW4gb2JqIHx8XG4gICAgICAgICckYWZ0ZXInIGluIG9iaiB8fFxuICAgICAgICAnJG92ZXJyaWRlJyBpbiBvYmpcbiAgICAgICAgKVxuICAgIHsgcmV0dXJuIHRydWU7IH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDb3BpZXMgdGhlIHBhc3NlZCBpdGVtLCByZWdhcmRsZXNzIG9mIGRhdGEgdHlwZS4gIE9iamVjdHMgYW5kIGFycmF5cyBhcmVcbiAqIGNvcGllZCBieSB2YWx1ZSBhbmQgbm90IGJ5IHJlZmVyZW5jZS5cbiAqIEBwYXJhbSB7VmFyaWFudH0gaXRlbSBTb21ldGhpbmcgdG8gY29weVxuICovXG5mdW5jdGlvbiBkZWVwQ29weShpdGVtKSB7XG4gICAgdmFyIGNvcHk7XG5cbiAgICAvLyBSZWN1cnNpdmVseSBjb3B5IGFycmF5c1xuICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIGNvcHkgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj1pdGVtLmxlbmd0aDsgaTxsZW47IGkrPTEpIHtcbiAgICAgICAgICAgIGNvcHkucHVzaChkZWVwQ29weShpdGVtW2ldKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29weTtcbiAgICB9XG5cbiAgICAvLyBSZWN1cnNpdmVseSBjb3B5IG9iamVjdHNcbiAgICBlbHNlIGlmIChpdGVtID09PSBPYmplY3QoaXRlbSkgJiYgdHlwZW9mIGl0ZW0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29weSA9IHt9O1xuXG4gICAgICAgIGZvciAodmFyIGogaW4gaXRlbSkge1xuICAgICAgICAgICAgY29weVtqXSA9IGRlZXBDb3B5KGl0ZW1bal0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgfVxuXG4gICAgLy8gSnVzdCByZXR1cm4gdGhlIHZhbHVlXG4gICAgcmV0dXJuIGl0ZW07XG59XG5cbi8qKioqKioqKioqKioqXG4gKiAgRXhwb3J0cyAgKlxuICoqKioqKioqKioqKiovXG5cbm1vZHVsZS5leHBvcnRzID0gYXNjb3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2NvdCAgICAgICAgPSByZXF1aXJlKCcuL0FzY290LmpzJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi9FdmVudEVtaXR0ZXIuanMnKTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIHRoZSBET01WaWV3LCBlc3RhYmxpc2hpbmcgaXRzIGRhdGEgYW5kIHRlbXBsYXRlIGFuZCBwZXJmb3JtaW5nXG4gKiBhbiBpbml0aWFsIHJlbmRlcmluZy5cbiAqIEBwYXJhbSB7VmFyaWFudH0gIGRhdGEgICAgIFRoZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHZpZXdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHRlbXBsYXRlIEFuIEhUTUwgdGVtcGxhdGluZyBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBjb25zdHJ1Y3QoZGF0YSwgdGVtcGxhdGUpIHtcbiAgICB0aGlzLl9kYXRhICAgID0gZGF0YSAgICAgfHwgdGhpcy5fZGF0YTtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgfHwgdGhpcy50ZW1wbGF0ZTtcbiAgICBpZiAoZGF0YSkgeyBiaW5kVmlld1RvTW9kZWwuY2FsbCh0aGlzKTsgfVxuICAgIHJlbmRlci5jYWxsKHRoaXMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgRE9NVmlldyB1c2luZyB0aGUgYXZhaWxhYmxlIHRlbXBsYXRlLiBPbiByZW5kZXJpbmcsIGEgbmV3IGVsZW1lbnQgaXMgY3JlYXRlZCxcbiAqIGFuZCBtdXN0IGJlIGFkZGVkIHRvIHRoZSBET00uXG4gKi9cbmZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICBkaXYuaW5uZXJIVE1MID0gdGhpcy50ZW1wbGF0ZSh0aGlzLmRhdGEpO1xuICAgIHRoaXMuX2VsZW1lbnQgPSBkaXYuZmlyc3RDaGlsZDtcbn1cblxuLyoqKioqKioqKioqKipcbiAqICBIYW5kbGVzICAqXG4gKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBFc3RhYmxpc2hlcyBhY2Nlc3NvcnMgdG8gc3BlY2lmaWMgZWxlbWVudHMgb3Igc2V0cyBvZiBlbGVtZW50cyB3aXRoaW4gdGhpcyB2aWV3LlxuICogSGFuZGxlcyBhcmUgc2V0IHVzaW5nIGEgaGFzaCBtYXAgdGhhdCBhc3NvY2lhdGVzIGhhbmRsZXMgd2l0aCBET00gcXVlcnkgc2VsZWN0b3Igc3RyaW5ncy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBoYW5kbGVzIEEgaGFzaCBtYXAgb2YgaGFuZGxlc1xuICovXG5mdW5jdGlvbiBzZXRIYW5kbGVzKGhhbmRsZXMpIHtcbiAgICB2YXIgX2hhbmRsZXMgPSB0aGlzLl9oYW5kbGVzO1xuXG4gICAgZm9yICh2YXIgaSBpbiBoYW5kbGVzKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBpLCB7XG4gICAgICAgICAgICBnZXQgICAgICAgICAgOiBnZXRFbGVtZW50QnlTZWxlY3Rvci5iaW5kKHRoaXMsIGhhbmRsZXNbaV0pLFxuICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2hhbmRsZXNbaV0gPSBoYW5kbGVzW2ldO1xuICAgIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgc2V0IG9mIGN1cnJlbnQgaGFuZGxlc1xuICovXG5mdW5jdGlvbiBnZXRIYW5kbGVzKCkge1xuICAgIHJldHVybiB0aGlzLl9oYW5kbGVzO1xufVxuXG4vKipcbiAqIEdldHMgYSBzaW5nbGUgZWxlbWVudCBieSBxdWVyeSBzZWxlY3Rvci4gIFRoZSBlbGVtZW50IHJldHJpZXZlZCBpcyByZWxhdGl2ZVxuICogdG8gdGhpcyB2aWV3J3MgZWxlbWVudC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvciBBIHF1ZXJ5IHNlbGVjdG9yIHN0cmluZ1xuICovXG5mdW5jdGlvbiBnZXRFbGVtZW50QnlTZWxlY3RvcihzZWxlY3Rvcikge1xuICAgIHZhciBlbCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG59XG5cbi8qKioqKioqKioqKioqKioqKipcbiAqICBEYXRhIEJpbmRpbmcgICpcbiAqKioqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogQmluZHMgdGhlIHZpZXcgdG8gaXRzIG1vZGVsLiBXaGVuZXZlciBhIG1vZGVsIGNoYW5nZXMsIGl0IHRyaWdnZXJzIGEgY2FsbGJhY2tcbiAqIHRoYXQgdXBkYXRlcyB0aGUgdmlldyBhY2NvcmRpbmdseS5cbiAqL1xuZnVuY3Rpb24gYmluZFZpZXdUb01vZGVsKCkge1xuICAgIHZhciBtb2RlbCAgICA9IHRoaXMuZGF0YTtcbiAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLl9tb2RlbEJpbmRMaXN0ZW5lciA9IHRoaXMuX21vZGVsQmluZExpc3RlbmVyIHx8IHVwZGF0ZVZpZXcuYmluZCh0aGlzKTtcblxuICAgIGlmIChtb2RlbC5vbikge1xuICAgICAgICBtb2RlbC5vbignbG9hZCcsIGxpc3RlbmVyKTtcbiAgICAgICAgbW9kZWwub24oJ2NoYW5nZScsIGxpc3RlbmVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogVW5iaW5kcyB0aGUgdmlldyBmcm9tIGl0cyBjdXJyZW50IG1vZGVsIGJ5IHJlbW92aW5nIGl0cyBldmVudCBsaXN0ZW5lcnNcbiAqL1xuZnVuY3Rpb24gdW5iaW5kVmlld0Zyb21Nb2RlbCgpIHtcbiAgICB2YXIgbW9kZWwgICAgPSB0aGlzLmRhdGE7XG4gICAgdmFyIGxpc3RlbmVyID0gdGhpcy5fbW9kZWxCaW5kTGlzdGVuZXI7XG5cbiAgICBpZiAoIWxpc3RlbmVyKSB7IHJldHVybjsgfVxuXG4gICAgaWYgKG1vZGVsLm9uKSB7XG4gICAgICAgIG1vZGVsLm9mZignbG9hZCcsIGxpc3RlbmVyKTtcbiAgICAgICAgbW9kZWwub2ZmKCdjaGFuZ2UnLCBsaXN0ZW5lcik7XG4gICAgfVxufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHZpZXcsIGVpdGhlciBieSBjYWxsaW5nIGFuIHVwZGF0ZSgpIG1ldGhvZCBvciB0cmlnZ2VyaW5nIGFcbiAqIHJlLXJlbmRlcmluZyBvZiB0aGUgdGVtcGxhdGUuXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgZGF0YSB1c2VkIHRvIHVwZGF0ZSB0aGUgdmlld1xuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggQSBwZXJpb2QtZGVsaW1pdGVkIHBhdGggdG8gdGhlIGRhdGEgYmVpbmcgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gdXBkYXRlVmlldyhkYXRhLCBwYXRoKSB7XG4gICAgdmFyIGVsICAgICA9IHRoaXMuX2VsZW1lbnQ7XG4gICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudE5vZGU7XG5cbiAgICAvLyBVc2UgdXBkYXRlIG1ldGhvZHMgaWYgYXZhaWxhYmxlXG4gICAgaWYgKHRoaXMudXBkYXRlKSB7IHRoaXMudXBkYXRlKGRhdGEsIHBhdGgpOyB9XG5cbiAgICAvLyBPdGhlcndpc2UsIHJlLXJlbmRlciB1c2luZyBhIHRlbXBsYXRlIGFuZCBzd2FwIGVsZW1lbnRzXG4gICAgZWxzZSBpZiAodGhpcy50ZW1wbGF0ZSkge1xuICAgICAgICByZW5kZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgaWYgKHBhcmVudCkgeyBwYXJlbnQucmVwbGFjZUNoaWxkKHRoaXMuX2VsZW1lbnQsIGVsKTsgfVxuICAgIH1cbn1cblxuLyoqKioqKioqKioqKioqKlxuICogIEFjY2Vzc29ycyAgKlxuICoqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBTZXRzIHRoZSB2aWV3J3MgZGF0YSwgdXBkYXRpbmcgdGhlIHZpZXcgYWNjb3JkaW5nbHlcbiAqIEBwYXJhbSB7VmFyaWFudH0gZGF0YSBUaGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIHZpZXdcbiAqL1xuZnVuY3Rpb24gc2V0RGF0YShkYXRhKSB7XG4gICAgdW5iaW5kVmlld0Zyb21Nb2RlbC5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgIGJpbmRWaWV3VG9Nb2RlbC5jYWxsKHRoaXMpO1xuICAgIHVwZGF0ZVZpZXcuY2FsbCh0aGlzLCBkYXRhKTtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBjdXJyZW50IHZpZXcncyBkYXRhIHByb3BlcnR5XG4gKi9cbmZ1bmN0aW9uIGdldERhdGEoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGE7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdmlldydzIHRvcC1sZXZlbCBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIGdldEVsZW1lbnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQ7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdGVtcGxhdGUgYXNzb2NpYXRlZCB3aXRoIHRoaXMgdmlld1xuICovXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGVtcGxhdGU7XG59XG5cbi8qKlxuICogU2V0cyB0aGUgdGVtcGxhdGUgYXNzb2NpYXRlZCB3aXRoIHRoaXMgdmlld1xuICogQHBhcmFtIHtGdW5jdGlvbn0gdGVtcGxhdGUgQSB0ZW1wbGF0aW5nIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIHNldFRlbXBsYXRlKHRlbXBsYXRlKSB7XG4gICAgdGhpcy5fdGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbn1cblxuLyoqKioqKioqKlxuICogIEFQSSAgKlxuICoqKioqKioqKi9cblxudmFyIGFwaSA9IHtcbiAgICBjb25zdHJ1Y3QgOiB7IHZhbCA6IGNvbnN0cnVjdCwgd3J0IDogZmFsc2UsIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9LFxuXG4gICAgZGF0YSAgICAgIDogeyBnZXQgOiBnZXREYXRhLCAgICBzZXQgOiBzZXREYXRhLCBlbm0gOiB0cnVlLCAgY2ZnIDogdHJ1ZSAgfSxcbiAgICBfZGF0YSAgICAgOiB7IHZhbCA6IG51bGwsICAgICAgIHdydCA6IHRydWUsICAgIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9LFxuXG4gICAgZWxlbWVudCAgIDogeyBnZXQgOiBnZXRFbGVtZW50LCAgICAgICAgICAgICAgICBlbm0gOiB0cnVlLCAgY2ZnIDogZmFsc2UgfSxcbiAgICBfZWxlbWVudCAgOiB7IHZhbCA6IG51bGwsICAgICAgIHdydCA6IHRydWUsICAgIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9LFxuXG4gICAgdGVtcGxhdGUgIDogeyBnZXQgOiBnZXRUZW1wbGF0ZSwgc2V0IDogc2V0VGVtcGxhdGUsIGVubSA6IHRydWUsIGNmZyA6IGZhbHNlIH0sXG4gICAgX3RlbXBsYXRlIDogeyB2YWwgOiBudWxsLCAgICAgIHdydCA6IHRydWUsICAgIGVubSA6IGZhbHNlLCAgY2ZnIDogZmFsc2UgfSxcblxuICAgIC8vIEhhbmRsZXNcbiAgICBoYW5kbGVzICA6IHsgZ2V0IDogZ2V0SGFuZGxlcywgc2V0IDogc2V0SGFuZGxlcywgZW5tIDogdHJ1ZSwgIGNmZyA6IHRydWUgIH0sXG4gICAgX2hhbmRsZXMgOiB7IHZhbCA6IHt9LCAgICAgICAgIHdydCA6IHRydWUsICAgICAgIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9LFxuXG4gICAgLyogT3ZlcnJpZGUgKi9cbiAgICB1cGRhdGUgOiB7IHZhbCA6IG51bGwsIHdydCA6IHRydWUsIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9XG59O1xuXG4vKioqKioqKioqKioqKlxuICogIEV4cG9ydHMgICpcbiAqKioqKioqKioqKioqL1xuXG5hc2NvdC5ET01WaWV3ID0gYXNjb3QoW0V2ZW50RW1pdHRlcl0sIGFwaSk7XG5tb2R1bGUuZXhwb3J0cyA9IGFzY290LkRPTVZpZXc7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2NvdCA9IHJlcXVpcmUoJy4vQXNjb3QuanMnKTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gZXZlbnQgbGlzdGVuZXIgb24gdGhlIHNwZWNpZmllZCB0YXJnZXRcbiAqIEBwYXJhbSB7U3RyaW5nfSAgIGV2ZW50TmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiICAgICAgICBUaGUgbmV3IGNhbGxiYWNrIHRvIGhhbmRsZSB0aGUgZXZlbnRcbiAqL1xuZnVuY3Rpb24gb24oZXZlbnROYW1lLCBjYikge1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLmV2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gPSB0aGlzLmV2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW107XG5cbiAgICAvLyBEbyBub3RoaW5nIGlmIGEgY2FsbGJhY2sgaGFzIGFscmVhZHkgYmVlbiBhZGRlZFxuICAgIGlmIChjYWxsYmFja3MuaW5kZXhPZihjYikgPj0gMCkgeyByZXR1cm47IH1cblxuICAgIC8vIEFkZCB0aGUgY2FsbGJhY2sgdG8gdGhlIGxpc3Qgb2YgY2FsbGJhY2tzXG4gICAgY2FsbGJhY2tzLnB1c2goY2IpO1xufVxuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBldmVudCBsaXN0ZW5lciBvbiB0aGUgc3BlY2lmaWVkIHRhcmdldFxuICogQHBhcmFtIHtTdHJpbmd9ICAgZXZlbnROYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgICAgICAgIFRoZSBuZXcgY2FsbGJhY2sgdG8gaGFuZGxlIHRoZSBldmVudFxuICovXG5mdW5jdGlvbiBvZmYoZXZlbnROYW1lLCBjYikge1xuICAgIHZhciBpbmRleDtcbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdID0gdGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSBjYWxsYmFjayBmcm9tIHRoZSBsaXN0XG4gICAgaW5kZXggPSBjYWxsYmFja3MuaW5kZXhPZihjYik7XG5cbiAgICBpZiAoaW5kZXggPj0gMCkgeyBjYWxsYmFja3Muc3BsaWNlKGluZGV4LCAxKTsgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYWxsIGV2ZW50IGxpc3RlbmVycyBmb3IgYSBwYXJ0aWN1bGFyIGV2ZW50IGZyb20gdGhlIGVtaXR0ZXJcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50TmFtZSkge1xuICAgIGlmIChldmVudE5hbWUpIHtcbiAgICAgICAgdGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdID0gW107XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5ldmVudExpc3RlbmVycyA9IHt9O1xuICAgIH1cbn1cblxuLyoqXG4gKiBFbWl0cyB0aGUgc3BlY2lmaWVkIGV2ZW50LCBjYWxsaW5nIGFuZCBwYXNzaW5nIHRoZSBvcHRpb25hbCBhcmd1bWVudCB0byBhbGwgbGlzdGVuZXJzXG4gKiBAcGFyYW0ge1N0cmluZ30gIGV2ZW50TmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgdG8gZW1pdFxuICogQHBhcmFtIHtWYXJpYW50fSBhcmcgICAgICAgQW55IGFyZ3VtZW50IHRvIHBhc3MgdG8gdGhlIGV2ZW50IGxpc3RlbmVyc1xuICovXG5mdW5jdGlvbiBlbWl0KGV2ZW50TmFtZSkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdID0gdGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdO1xuXG4gICAgYXJncy5zaGlmdCgpO1xuXG4gICAgZm9yICh2YXIgaT0wLCBsZW49Y2FsbGJhY2tzLmxlbmd0aDsgaTxsZW47IGkrPTEpIHtcbiAgICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbn1cblxuLyoqKioqKioqKlxuICogIEFQSSAgKlxuICoqKioqKioqKi9cblxudmFyIGFwaSA9IHtcbiAgICBvbiAgICAgICAgICAgICAgICAgOiBvbixcbiAgICBvZmYgICAgICAgICAgICAgICAgOiBvZmYsXG4gICAgcmVtb3ZlQWxsTGlzdGVuZXJzIDogcmVtb3ZlQWxsTGlzdGVuZXJzLFxuICAgIGVtaXQgICAgICAgICAgICAgICA6IHsgdmFsIDogZW1pdCwgd3J0IDogZmFsc2UsIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9LFxuXG4gICAgZXZlbnRMaXN0ZW5lcnMgOiB7IHZhbCA6IHt9LCB3cnQgOiB0cnVlLCBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfVxufTtcblxuLyoqKioqKioqKioqKipcbiAqICBFeHBvcnRzICAqXG4gKioqKioqKioqKioqKi9cblxuYXNjb3QuRXZlbnRFbWl0dGVyID0gYXNjb3QoYXBpKTtcbm1vZHVsZS5leHBvcnRzID0gYXNjb3QuRXZlbnRFbWl0dGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNjb3QgPSByZXF1aXJlKCcuL0FzY290LmpzJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi9FdmVudEVtaXR0ZXIuanMnKTtcblxuLyoqKioqKioqKioqKioqKipcbiAqICBQcm9wZXJ0aWVzICAqXG4gKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBXaGV0aGVyIHRvIGFsd2F5cyBhdHRlbXB0IHVwZGF0aW5nIGZyb20gdGhlIG9ubGluZSBsb2NhdGlvbiByYXRoZXIgdGhhbiByZXRyZWl2ZVxuICogZnJvbSBsb2NhbFN0b3JhZ2VcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG52YXIgcHJlZmVyT25saW5lID0gZmFsc2U7XG5cbi8qKlxuICogVGhlIHJlbW90ZSBsb2NhdGlvbiBvZiB0aGUgZGF0YSBzb3VyY2UgZm9yIHJldHJpZXZhbCB1c2luZyBYTUxIdHRwUmVxdWVzdFxuICogQHR5cGUge1N0cmluZ31cbiAqL1xudmFyIHNyYyA9IG51bGw7XG5cbi8qKlxuICogV2hldGhlciB0byBzdG9yZSBhbmQgcmV0cmlldmUgdGhpcyBtb2RlbCBmcm9tIGxvY2FsIHN0b3JhZ2VcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG52YXIgc3RvcmVMb2NhbCA9IHRydWU7XG5cbi8qKioqKioqKioqKioqKioqKipcbiAqICBDb25zdHJ1Y3Rpb24gICpcbiAqKioqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogQ29uc3RydWN0cyB0aGUgbW9kZWwsIGVzdGFibGlzaGluZyBhbmQgbG9hZGluZyBpdHMgZGF0YSBzb3VyY2UuXG4gKiBAcGFyYW0ge1N0cmluZ30gc3JjIFRoZSBkYXRhIHNvdXJjZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBtb2RlbFxuICovXG5mdW5jdGlvbiBjb25zdHJ1Y3Qoc3JjKSB7XG4gICAgaWYgKHNyYykgeyB0aGlzLmxvYWQoc3JjKTsgfVxufVxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIExvYWRpbmcsIFN0b3JpbmcsIFJldHJpZXZpbmcgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIFN0b3JlcyB0aGUgbW9kZWwgdG8gbG9jYWwgc3RvcmFnZS4gIFN0b3JlZCBhcyBhIGtleS92YWx1ZSBwYWlyIHdoZXJlXG4gKiB0aGUga2V5IGlzIHRoZSBzcmMgb2YgdGhlIGRhdGEgYW5kIHRoZSB2YWx1ZSBpcyBhIEpTT04gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBzdG9yZSgpIHtcbiAgICBsb2NhbFN0b3JhZ2Vbc3JjXSA9IEpTT04uc3RyaW5naWZ5KHRoaXMpO1xufVxuXG4vKipcbiAqIExvYWRzIHRoZSBkYXRhIGVpdGhlciBmcm9tIGEgc2VydmVyIG9yIGZyb20gbG9jYWwgc3RvcmFnZSBkZXBlbmRpbmcgb24gc2V0dGluZ3MgYW5kXG4gKiBvbmxpbmUgc3RhdHVzXG4gKiBAcGFyYW0ge1N0cmluZ30gc3JjIE9wdGlvbmFsbHkgc3BlY2lmeSB0aGUgc291cmNlIG9mIHRoZSBkYXRhXG4gKi9cbmZ1bmN0aW9uIGxvYWQoc3JjKSB7XG4gICAgdGhpcy5zcmMgPSBzcmMgfHwgdGhpcy5zcmM7XG5cbiAgICBpZiAobG9jYWxTdG9yYWdlW3NyY10gJiYgIXRoaXMucHJlZmVyT25saW5lKSB7XG4gICAgICAgIHNldFRpbWVvdXQobG9hZExvY2FsRGF0YS5iaW5kKHRoaXMpLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBsb2FkUmVtb3RlRGF0YS5jYWxsKHRoaXMpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBQYXJzZXMgYSBqc29uIHN0cmluZyBhbmQgbWVyZ2VzIGRhdGEgd2l0aCB0aGlzIG1vZGVsXG4gKiBAcGFyYW0ge1N0cmluZ30ganNvblxuICovXG5mdW5jdGlvbiBsb2FkTG9jYWxEYXRhKCkge1xuICAgIHZhciBsb2NhbERhdGEgPSBsb2NhbFN0b3JhZ2VbdGhpcy5zcmNdO1xuXG4gICAgaWYgKGxvY2FsRGF0YSkgeyBwYXJzZS5jYWxsKHRoaXMsIGxvY2FsRGF0YSk7IH1cblxuICAgIHRoaXMuZW1pdCgnbG9hZCcsIHRoaXMpO1xufVxuXG4vKipcbiAqIFBhcnNlcyBwYXNzZWQganNvbiBkYXRhXG4gKiBAcGFyYW0ge1N0cmluZ30ganNvbiBBIHZhbGlkIEpTT04gc3RyaW5nXG4gKi9cbmZ1bmN0aW9uIHBhcnNlKGpzb24pIHtcbiAgICB2YXIgZGF0YSA9IEpTT04ucGFyc2UoanNvbik7XG5cbiAgICAvLyBQZXJmb3JtcyBvcHRpb25hbCBwcm9jZXNzaW5nIHN0ZXBzIHRvIG1vZGlmeSB0aGUgc3RydWN0dXJlIG9mIHRoZSBkYXRhXG4gICAgaWYgKHRoaXMucHJvY2VzcykgeyBkYXRhID0gdGhpcy5wcm9jZXNzKGRhdGEpOyB9XG5cbiAgICBmb3IgKHZhciBpIGluIGRhdGEpIHsgdGhpc1tpXSA9IGRhdGFbaV07IH1cbn1cblxuLyoqXG4gKiBMb2FkcyBkYXRhIGZyb20gdGhlIHNlcnZlci4gIElmIHRoZSByZXF1ZXN0IGZhaWxzLCBhdHRlbXB0cyBsb2FkaW5nIGRhdGEgZnJvbSBsb2NhbFN0b3JhZ2UuXG4gKi9cbmZ1bmN0aW9uIGxvYWRSZW1vdGVEYXRhKCkge1xuICAgIHZhciBzcmMgPSB0aGlzLnNyYztcbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICB4aHIub3BlbignR0VUJywgc3JjKTtcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlWEhSUmVzcG9uc2UuYmluZCh0aGlzLCB4aHIpO1xuICAgIHhoci5zZW5kKG51bGwpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgaW5jb21pbmcgWEhSIHJlc3BvbnNlc1xuICovXG5mdW5jdGlvbiBoYW5kbGVYSFJSZXNwb25zZSh4aHIpIHtcbiAgICB2YXIgdHlwZSwgdGV4dDtcblxuICAgIC8vIFJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQgJiYgeGhyLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgIHR5cGUgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0NvbnRlbnQtVHlwZScpO1xuXG4gICAgICAgIC8vIE1ha2Ugc3VyZSByZXNwb25zZSBpcyBKU09OXG4gICAgICAgIGlmICh0eXBlLmluZGV4T2YoJ2pzb24nKSA+PSAwKSB7XG4gICAgICAgICAgICB0ZXh0ID0geGhyLnJlc3BvbnNlVGV4dDtcblxuICAgICAgICAgICAgLy8gUGFyc2UgYW5kIGxvYWRcbiAgICAgICAgICAgIHBhcnNlLmNhbGwodGhpcywgdGV4dCk7XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIGRhdGEgbG9jYWxseVxuICAgICAgICAgICAgaWYgKHRoaXMuc3RvcmVMb2NhbCkgeyB0aGlzLnN0b3JlKCk7IH1cblxuICAgICAgICAgICAgdGhpcy5lbWl0KCdsb2FkJywgdGhpcyk7XG4gICAgICAgIH1cblxuICAgIC8vIFJlcXVlc3QgZmFpbGVkLCBhdHRlbXB0IGxvYWRpbmcgbG9jYWxseSBpbnN0ZWFkXG4gICAgfSBlbHNlIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCAmJiB4aHIuc3RhdHVzICE9PSAyMDApIHtcbiAgICAgICAgbG9hZExvY2FsRGF0YS5jYWxsKHRoaXMpO1xuICAgIH1cbn1cblxuLyoqKioqKioqKioqKioqKioqKioqXG4gKiAgRGF0YSBBY2Nlc3NvcnMgICpcbiAqKioqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBSZXNvbHZlcyBhIHBhdGggYW5kIHJldHVybnMgcmVsZXZhbnQgZGF0YVxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggQSBwZXJpb2QtZGVsaW1pdGVkIHBhdGggdG8gc29tZSBkYXRhXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmUocGF0aCkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXM7XG5cbiAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuXG4gICAgZm9yICh2YXIgaT0wLCBsZW49cGF0aC5sZW5ndGg7IGk8bGVuOyBpKz0xKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVbcGF0aFtpXV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFNldHMgZGF0YSBvbiB0aGUgbW9kZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSAgICAgICAgIHBhdGggQW4gcGF0aCB0byBhIGxvY2F0aW9uIHdpdGhpbiB0aGUgZGF0YSBtb2RlbFxuICogQHBhcmFtIHtPYmplY3R8VmFyaWFudH0gZGF0YSBUaGUgbmV3IGRhdGFcbiAqL1xuZnVuY3Rpb24gc2V0KC8qIGFyZ3VtZW50cyAqLykge1xuICAgIHZhciBwYXRoLCBhZGRyLCBkYXRhLCB0YXJnZXQsIGtleTtcblxuICAgIC8vIEFkanVzdCBmb3IgYXJndW1lbnRzXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgcGF0aCA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgZGF0YSAgICA9IGFyZ3VtZW50c1sxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkYXRhID0gYXJndW1lbnRzWzBdO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBwYXRoLXJlZmVyZW5jZWQgZGF0YSBjaGFuZ2VcbiAgICBpZiAocGF0aCkge1xuICAgICAgICBhZGRyICAgPSBwYXRoO1xuICAgICAgICBhZGRyICAgPSBhZGRyLnNwbGl0KCcuJyk7XG4gICAgICAgIGtleSAgICA9IGFkZHIucG9wKCk7XG4gICAgICAgIHRhcmdldCA9IHRoaXM7XG5cbiAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49YWRkci5sZW5ndGg7IGk8bGVuOyBpKz0xKSB7XG4gICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXRbYWRkcltpXV07XG4gICAgICAgIH1cblxuICAgICAgICB0YXJnZXRba2V5XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIGZ1bGwgZGF0YSBjaGFuZ2VcbiAgICBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaiBpbiBkYXRhKSB7XG4gICAgICAgICAgICB0aGlzW2pdID0gZGF0YVtqXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZW1pdCgnY2hhbmdlJywgdGhpcywgcGF0aCk7XG59XG5cbi8qKioqKioqKipcbiAqICBBUEkgICpcbiAqKioqKioqKiovXG5cbnZhciBhcGkgPSB7XG4gICAgY29uc3RydWN0IDogY29uc3RydWN0LFxuXG4gICAgc3RvcmVMb2NhbCAgIDogeyB2YWwgOiBzdG9yZUxvY2FsLCAgIHdydCA6IHRydWUsIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9LFxuICAgIHNyYyAgICAgICAgICA6IHsgdmFsIDogc3JjLCAgICAgICAgICB3cnQgOiB0cnVlLCBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfSxcbiAgICBwcmVmZXJPbmxpbmUgOiB7IHZhbCA6IHByZWZlck9ubGluZSwgd3J0IDogdHJ1ZSwgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH0sXG5cbiAgICBzdG9yZSAgIDogc3RvcmUsXG4gICAgbG9hZCAgICA6IGxvYWQsXG4gICAgc2V0ICAgICA6IHNldCxcbiAgICBwcm9jZXNzIDogbnVsbCxcbiAgICByZXNvbHZlIDogcmVzb2x2ZVxufTtcblxuLyoqKioqKioqKioqKipcbiAqICBFeHBvcnRzICAqXG4gKioqKioqKioqKioqKi9cblxuYXNjb3QuTW9kZWwgPSBhc2NvdChbRXZlbnRFbWl0dGVyXSwgYXBpKTtcbm1vZHVsZS5leHBvcnRzID0gYXNjb3QuTW9kZWw7XG4iLCIndXNlIHN0cmljdCc7XG4vKiBqc2hpbnQgdW51c2VkIDogZmFsc2UgKi9cblxudmFyIGFzY290ICAgICAgICA9IHJlcXVpcmUoJy4vQXNjb3QuanMnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuL0V2ZW50RW1pdHRlci5qcycpO1xudmFyIERPTVZpZXcgICAgICA9IHJlcXVpcmUoJy4vRE9NVmlldy5qcycpO1xudmFyIE1vZGVsICAgICAgICA9IHJlcXVpcmUoJy4vTW9kZWwuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBhc2NvdDsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2NvdCA9IHJlcXVpcmUoJy4uL3NjcmlwdHMvaW5kZXguanMnKTtcblxudmFyIGFzc2VydCA9IGNoYWkuYXNzZXJ0O1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIEJhc2ljIE9iamVjdCBDb25zdHJ1Y3Rpb24gICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5kZXNjcmliZSgnQXNjb3QnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGVzY3JpcHRvckEgPSB7XG4gICAgICAgIGVudW1lcmFibGUgICA6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgICAgIHZhbHVlICAgICAgICA6ICdoZWxsbydcbiAgICB9O1xuXG4gICAgdmFyIGRlc2NyaXB0b3JCID0ge1xuICAgICAgICBlbnVtZXJhYmxlICAgOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGUgOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGUgICAgIDogdHJ1ZSxcbiAgICAgICAgdmFsdWUgICAgICAgIDogNVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzdWJ0cmFjdDUodmFsKSB7IHJldHVybiB2YWwgLSA1OyB9XG4gICAgZnVuY3Rpb24gcmV0dXJuVmFsKHZhbCkgeyByZXR1cm4gdmFsOyB9XG4gICAgZnVuY3Rpb24gc3VidHJhY3QzKHZhbCkgeyByZXR1cm4gdmFsIC0gMzsgfVxuICAgIGZ1bmN0aW9uIHNldFByb3BFKHZhbCkgeyB0aGlzLnByb3BFID0gdmFsOyB9XG5cbiAgICB2YXIgU2ltcGxlQ2xhc3MgPSBhc2NvdCh7XG4gICAgICAgIHByb3BBICAgICA6ICdoZWxsbycsXG4gICAgICAgIHByb3BCICAgICA6IHsgZW5tIDogdHJ1ZSwgY2ZnIDogZmFsc2UsIHZhbCA6IDUsIHdydDogdHJ1ZSB9LFxuICAgICAgICBwcm9wWCAgICAgOiB7IGVubSA6IHRydWUsIGNmZyA6IGZhbHNlLCB2YWwgOiAxMCwgd3J0OiB0cnVlIH0sXG4gICAgICAgIF9hY2NBICAgICA6IDUsXG4gICAgICAgIGFjY0EgICAgICA6IHsgZ2V0IDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9hY2NBOyB9IH0sXG4gICAgICAgIGZ1bmNBICAgICA6IGZ1bmN0aW9uKCkgeyByZXR1cm4gMTM7IH0sXG4gICAgICAgIGZ1bmNCICAgICA6IGZ1bmN0aW9uKHZhbCkgeyB0aGlzLnByb3BEID0gdmFsOyB9LFxuICAgICAgICBjb25zdHJ1Y3QgOiBmdW5jdGlvbih2YWwpIHsgdGhpcy5wcm9wQyA9IHZhbDsgfVxuICAgIH0pO1xuXG4gICAgdmFyIE1peGVkQ2xhc3NBID0gYXNjb3QoW1NpbXBsZUNsYXNzXSwge1xuICAgICAgICBmdW5jQSA6IHsgJGNoYWluICAgIDogW1NpbXBsZUNsYXNzLCBzdWJ0cmFjdDVdIH0sXG4gICAgICAgIGZ1bmNCIDogeyAkaXRlcmF0ZSAgOiBbU2ltcGxlQ2xhc3MsIHJldHVyblZhbF0gfSxcbiAgICAgICAgcHJvcFggOiB7ICRvdmVycmlkZSA6IDcgfVxuICAgIH0pO1xuXG4gICAgdmFyIE1peGVkQ2xhc3NCID0gYXNjb3QoW01peGVkQ2xhc3NBXSwge1xuICAgICAgICBmdW5jQSA6IHsgJGFmdGVyICA6IHN1YnRyYWN0MyB9LFxuICAgICAgICBmdW5jQiA6IHsgJGJlZm9yZSA6IHNldFByb3BFIH0sXG4gICAgICAgIGFjY0EgIDogNDJcbiAgICB9KTtcblxuICAgIHZhciBzaW1wbGVNb2R1bGUgPSBuZXcgU2ltcGxlQ2xhc3MoMTApO1xuICAgIHZhciBtaXhlZE1vZHVsZUEgPSBuZXcgTWl4ZWRDbGFzc0EoMTEpO1xuICAgIHZhciBtaXhlZE1vZHVsZUIgPSBuZXcgTWl4ZWRDbGFzc0IoMTMpO1xuXG4gICAgZGVzY3JpYmUoJ1NpbXBsZSBjbGFzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpdCgnc2hvdWxkIGJlIGdpdmVuIGEgZGVmYXVsdCBkZXNjcmlwdG9yIGlmIG9uZSBpcyBub3QgZ2l2ZW4nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoU2ltcGxlQ2xhc3MuZGVzY3JpcHRvci5wcm9wQSwgZGVzY3JpcHRvckEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGV4cGFuZCBzaG9ydGhhbmQgZGVzY3JpcHRvcnMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoU2ltcGxlQ2xhc3MuZGVzY3JpcHRvci5wcm9wQiwgZGVzY3JpcHRvckIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGwgdGhlIGNvbnN0cnVjdG9yJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHNpbXBsZU1vZHVsZS5wcm9wQywgMTApO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdNaXhlZCBjbGFzcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaXQoJ3Nob3VsZCBiZSBnaXZlbiBhIGRlZmF1bHQgZGVzY3JpcHRvciBpZiBvbmUgaXMgbm90IGdpdmVuJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobWl4ZWRNb2R1bGVBLCAncHJvcEEnKSwgZGVzY3JpcHRvckEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGV4cGFuZCBzaG9ydGhhbmQgZGVzY3JpcHRvcnMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtaXhlZE1vZHVsZUEsICdwcm9wQicpLCBkZXNjcmlwdG9yQik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsbCB0aGUgY29uc3RydWN0b3InLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVBLnByb3BDLCAxMSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgb3ZlcnJpZGUgd2hlbiB1c2luZyB0aGUgJG92ZXJyaWRlIG1vZGlmaWVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1peGVkTW9kdWxlQS5wcm9wWCwgNyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsbCBjaGFpbmVkIG1ldGhvZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVBLmZ1bmNBKCksIDgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGwgaXRlcmF0ZWQgbWV0aG9kcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUEuZnVuY0IoMTIpLCAxMik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgaW5jbHVkZSB0aGUgb3JpZ2luYWwgbWV0aG9kIGluIHRoZSBpdGVyYXRvcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUEucHJvcEQsIDEyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBhcHBlbmQgYSBmdW5jdGlvbiBhZnRlciBhIGNoYWluIHdoZW4gdXNpbmcgJGFmdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1peGVkTW9kdWxlQi5mdW5jQSgpLCA1KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCByZXR1cm4gdGhlIGxhc3QgdmFsdWUgZnJvbSBhbiBpdGVyYXRvcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUIuZnVuY0IoMTQpLCAxNCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcHJlcGVuZCBhIGZ1bmN0aW9uIHRvIGFuIGl0ZXJhdG9yIHdoZW4gdXNpbmcgJGJlZm9yZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUIucHJvcEUsIDE0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBlc3RhYmxpc2ggc2V0dGluZyBvZiBhY2Nlc3NlZCBwcm9wZXJ0eSB2YWx1ZXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVCLl9hY2NBLCA0Mik7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVCLmFjY0EsIDQyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ0V2ZW50RW1pdHRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZW1pdHRlciA9IHRoaXMuZW1pdHRlciA9IG5ldyBhc2NvdC5FdmVudEVtaXR0ZXIoKTtcbiAgICB2YXIgZnVuY0EgPSBmdW5jdGlvbih2YWwpIHsgdGhpcy52YWxBID0gdmFsOyB9LmJpbmQoZW1pdHRlcik7XG4gICAgdmFyIGZ1bmNCID0gZnVuY3Rpb24odmFsKSB7IHRoaXMudmFsQiA9IHZhbDsgfS5iaW5kKGVtaXR0ZXIpO1xuXG4gICAgZW1pdHRlci5vbigndGVzdCcsIGZ1bmNBKTtcbiAgICBlbWl0dGVyLm9uKCd0ZXN0JywgZnVuY0IpO1xuXG4gICAgaXQoJ3Nob3VsZCBmaXJlIGFsbCByZWdpc3RlcmVkIGxpc3RlbmVycycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZW1pdHRlci5lbWl0KCd0ZXN0JywgNSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChlbWl0dGVyLnZhbEEsIDUpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoZW1pdHRlci52YWxCLCA1KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVtb3ZlIGxpc3RlbmVycycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZW1pdHRlci5vZmYoJ3Rlc3QnLCBmdW5jQik7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgndGVzdCcsIDcpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoZW1pdHRlci52YWxBLCA3KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGVtaXR0ZXIudmFsQiwgNSk7XG4gICAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ0RPTVZpZXcnLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgYXNjb3QuRE9NVmlldyhcbiAgICAgICAgeyB0ZXh0IDogJ0hlbGxvLCBXb3JsZCEnIH0sXG4gICAgICAgIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuICc8ZGl2IGNsYXNzPVwidGVzdFNlbGVjdG9yXCI+JyArIGRhdGEudGV4dCArICc8L2Rpdj4nOyB9XG4gICAgKTtcblxuICAgIHZhciBjb21wbGV4VmlldyA9IG5ldyBhc2NvdC5ET01WaWV3KFxuICAgICAgICBudWxsLFxuICAgICAgICBmdW5jdGlvbigpIHsgcmV0dXJuICc8ZGl2PjxkaXYgY2xhc3M9XCJ0ZXN0U2VsZWN0b3JcIj5IZWxsbywgV29ybGQhPC9kaXY+PC9kaXY+JzsgfVxuICAgICk7XG5cbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBhbiBIVE1MIGVsZW1lbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFzc2VydCh2aWV3LmVsZW1lbnQpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjb3JyZWN0bHkgdXNlIGEgdGVtcGxhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFzc2VydC5lcXVhbCh2aWV3LmVsZW1lbnQuaW5uZXJIVE1MLCAnSGVsbG8sIFdvcmxkIScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZS1yZW5kZXIgdGhlIHZpZXcgb24gY2hhbmdpbmcgZGF0YScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmlldy5kYXRhID0geyB0ZXh0IDogJ0hlbGxvLCBNb29uIScgfTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHZpZXcuZWxlbWVudC5pbm5lckhUTUwsICdIZWxsbywgTW9vbiEnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcnVuIHVwZGF0ZSgpIHdoZW4gY2hhbmdpbmcgZGF0YSBpZiBhdmFpbGFibGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZpZXcudXBkYXRlID0gZnVuY3Rpb24oZGF0YSkgeyB0aGlzLmVsZW1lbnQuaW5uZXJIVE1MID0gZGF0YS50ZXh0OyB9O1xuICAgICAgICB2aWV3LmRhdGEgICA9IHsgdGV4dCA6ICdIZWxsbywgU2t5IScgfTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHZpZXcuZWxlbWVudC5pbm5lckhUTUwsICdIZWxsbywgU2t5IScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZWdpc3RlciBzZWxlY3RvciBoYW5kbGVzIHBvaW50aW5nIHRvIGNoaWxkIGVsZW1lbnRzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb21wbGV4Vmlldy5oYW5kbGVzID0geyB0ZXN0IDogJy50ZXN0U2VsZWN0b3InIH07XG4gICAgICAgIGFzc2VydC5lcXVhbChjb21wbGV4Vmlldy50ZXN0LmlubmVySFRNTCwgJ0hlbGxvLCBXb3JsZCEnKTtcbiAgICB9KTtcbn0pO1xuXG5kZXNjcmliZSgnTW9kZWwnLCBmdW5jdGlvbigpIHtcbiAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICB2YXIgbW9kZWwgPSBuZXcgYXNjb3QuTW9kZWwoKTtcbiAgICB2YXIgc2FtcGxlRGF0YUEgPSB7XG4gICAgICAgICd2YWxBJyA6IDcsXG4gICAgICAgICd2YWxCJyA6IDEzLFxuICAgICAgICAnZ3JvdXBBJyA6IHtcbiAgICAgICAgICAgICd2YWxDJyA6IDE3LFxuICAgICAgICAgICAgJ3ZhbEInIDogMTlcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIHNhbXBsZURhdGFCID0ge1xuICAgICAgICAndmFsQScgOiA1XG4gICAgfTtcblxuICAgIGRlc2NyaWJlKCcjbG9hZCgpJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGl0KCdzaG91bGQgbG9hZCBuZXcgZGF0YSByZW1vdGVseScsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICBtb2RlbC5sb2FkKCdzYW1wbGUuanNvbicpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmNsZWFyKCk7XG5cbiAgICAgICAgICAgIG1vZGVsLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLnZhbEEsIHNhbXBsZURhdGFBLnZhbEEpO1xuICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5ncm91cEEudmFsQywgc2FtcGxlRGF0YUEuZ3JvdXBBLnZhbEMpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGJlIHNlcmlhbGl6ZWQgc3VjaCB0aGF0IGl0IGlzIGlkZW50aWNhbCB0byB0aGUgbG9hZGVkIGRhdGEnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoSlNPTi5zdHJpbmdpZnkobW9kZWwpLCBKU09OLnN0cmluZ2lmeShzYW1wbGVEYXRhQSkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGxvYWQgZXhpc3RpbmcgZGF0YSBsb2NhbGx5JywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVsnc2FtcGxlLmpzb24nXSA9IEpTT04uc3RyaW5naWZ5KHNhbXBsZURhdGFCKTtcbiAgICAgICAgICAgIG1vZGVsLmxvYWQoJ3NhbXBsZS5qc29uJyk7XG4gICAgICAgICAgICBtb2RlbC5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC52YWxBLCA1KTtcbiAgICAgICAgICAgICAgICBtb2RlbC5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBhbHdheXMgbG9hZCBkYXRhIHJlbW90ZWx5IGlmIHByZWZlck9ubGluZSBpcyB0cnVlJywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVsnc2FtcGxlLmpzb24nXSA9IEpTT04uc3RyaW5naWZ5KHNhbXBsZURhdGFCKTtcbiAgICAgICAgICAgIG1vZGVsLnByZWZlck9ubGluZSA9IHRydWU7XG4gICAgICAgICAgICBtb2RlbC5sb2FkKCdzYW1wbGUuanNvbicpO1xuICAgICAgICAgICAgbW9kZWwub24oJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwudmFsQSwgc2FtcGxlRGF0YUEudmFsQSk7XG4gICAgICAgICAgICAgICAgbW9kZWwucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICAgICAgbW9kZWwucHJlZmVyT25saW5lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgbm90IHN0b3JlIGRhdGEgbG9jYWxseSBpZiBzdG9yZUxvY2FsIGlzIGZhbHNlJywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5jbGVhcigpO1xuICAgICAgICAgICAgbW9kZWwuc3RvcmVMb2NhbCA9IGZhbHNlO1xuICAgICAgICAgICAgbW9kZWwubG9hZCgnc2FtcGxlLmpzb24nKTtcbiAgICAgICAgICAgIG1vZGVsLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0Lm5vdE9rKGxvY2FsU3RvcmFnZVsnc2FtcGxlLmpzb24nXSk7XG4gICAgICAgICAgICAgICAgbW9kZWwucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc3RvcmVMb2NhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJyNyZXNvbHZlKCknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGl0KCdzaG91bGQgcmVzb2x2ZSBhIHBhdGggdG8gdGhlIGNvcnJlY3QgdmFsdWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIG1vZGVsLnNldCh7IG9iakEgOiB7IHZhbEEgOiA4IH19KTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5yZXNvbHZlKCdvYmpBLnZhbEEnKSwgOCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJyNzZXQoKScsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpdCgnc2hvdWxkIHRha2UgYW4gb2JqZWN0IGFzIGEgcGFyYW1ldGVyIGFuZCBzZXQgbmV3IGRhdGEnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBtb2RlbC5zZXQoe3ZhbEQgOiAxN30pO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLnZhbEQsIDE3KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCB0YWtlIGEgcGF0aCBhbmQgYSB2YWx1ZSBhbmQgY2hhbmdlIGEgc3BlY2lmaWMgZW50cnknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBtb2RlbC5zZXQoJ2dyb3VwQS52YWxDJywgMjEpO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdyb3VwQS52YWxDLCAyMSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgdHJpZ2dlciB0aGUgb25jaGFuZ2UgZXZlbnQgd2hlbiBhIGNoYW5nZSBpcyBtYWRlJywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIG1vZGVsLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihkYXRhLCBwYXRoKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGRhdGEsIG1vZGVsKTtcbiAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwocGF0aCwgJ2dyb3VwQS52YWxDJyk7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBtb2RlbC5zZXQoJ2dyb3VwQS52YWxDJywgMjMpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuXG5kZXNjcmliZSgnTW9kZWwvVmlldyBCaW5kaW5nJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciB2aWV3O1xuICAgIHZhciBtb2RlbCA9IG5ldyBhc2NvdC5Nb2RlbCgpO1xuICAgIGZ1bmN0aW9uIHRlbXBsYXRlKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICc8ZGl2PicgKyBkYXRhLnZhbEEgKyAnPC9kaXY+JztcbiAgICB9XG5cbiAgICB2aWV3ICA9IG5ldyBhc2NvdC5ET01WaWV3KG1vZGVsLCB0ZW1wbGF0ZSk7XG5cbiAgICBpdCgnc2hvdWxkIHBhc3MgbmV3IGRhdGEgaW4gdG8gaXRzIHRlbXBsYXRlIHdoZW4gdGhlIG1vZGVsIGNoYW5nZXMnLCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICBtb2RlbC5sb2FkKCdzYW1wbGUuanNvbicpO1xuICAgICAgICBtb2RlbC5vbignbG9hZCcsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh2aWV3LmVsZW1lbnQuaW5uZXJIVE1MLCA3KTtcbiAgICAgICAgICAgIGRhdGEuc2V0KCd2YWxBJywgMTMpO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHZpZXcuZWxlbWVudC5pbm5lckhUTUwsIDEzKTtcbiAgICAgICAgICAgIG1vZGVsLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIl19
;