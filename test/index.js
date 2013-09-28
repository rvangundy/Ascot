require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"ascot.Model":[function(require,module,exports){
module.exports=require('FFRxKb');
},{}],"ascot.EventEmitter":[function(require,module,exports){
module.exports=require('BvhrnU');
},{}],"ascot.DOMView":[function(require,module,exports){
module.exports=require('GirLh0');
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

    // Allow non-functional overrides
    else if (typeof target.value !== 'function') {
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
    if (src) {
        if (typeof src === 'string') {
            load.call(this, src);
        }

        else if (src === Object(src)) {
            setTimeout(loadDirectData.bind(this, src), 0);
        }
    }
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

/**
 * Loads direct data that has been passed as a constructor on creating the model.
 * @param {Object} data Some data to associate with the model
 */
function loadDirectData(data) {
    set.call(this, data);
    this.emit('load', this);
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
        data = arguments[1];
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
    var sampleDataA = {
        'valA' : 7,
        'valB' : 13,
        'groupA' : {
            'valC' : 17,
            'valB' : 19
        }
    };
    var model = new ascot.Model();
    var sampleDataB = {
        'valA' : 5
    };

    describe('#construct()', function() {
        it('should load direct data passed in to its constructor', function(done){
            var model = new ascot.Model(sampleDataA);
            model.on('load', function(data) {
                assert.equal(data.groupA.valC, 17);
                done();
            });
        });
    });

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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcnlhbnZhbmd1bmR5L0RvY3VtZW50cy9Bc2NvdC9zY3JpcHRzL0FzY290LmpzIiwiL1VzZXJzL3J5YW52YW5ndW5keS9Eb2N1bWVudHMvQXNjb3Qvc2NyaXB0cy9ET01WaWV3LmpzIiwiL1VzZXJzL3J5YW52YW5ndW5keS9Eb2N1bWVudHMvQXNjb3Qvc2NyaXB0cy9FdmVudEVtaXR0ZXIuanMiLCIvVXNlcnMvcnlhbnZhbmd1bmR5L0RvY3VtZW50cy9Bc2NvdC9zY3JpcHRzL01vZGVsLmpzIiwiL1VzZXJzL3J5YW52YW5ndW5keS9Eb2N1bWVudHMvQXNjb3Qvc2NyaXB0cy9pbmRleC5qcyIsIi9Vc2Vycy9yeWFudmFuZ3VuZHkvRG9jdW1lbnRzL0FzY290L3Rlc3QvdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIHRvcC1sZXZlbCBhc2NvdCBmdW5jdGlvbi4gIENyZWF0ZXMgbmV3IHByb3RvdHlwZXMgYnkgbWl4aW5nIHRvZ2V0aGVyIGFuIGFycmF5IG9mIHByb3RvdHlwZXNcbiAqIGFuZCBhcHBseWluZyBhbiBleHBhbmRlZCBkZXNjcmlwdG9yIHRoYXQgaW5jbHVkZXMgbWl4aW4gbW9kaWZpZXJzLlxuICogQHBhcmFtICB7QXJyYXl9ICBtaXhpbnMgICAgIEFuIGFycmF5IG9mIHByb3RvdHlwZXMgdG8gbWl4IGluXG4gKiBAcGFyYW0gIHtPYmplY3R9IGRlc2NyaXB0b3IgQSBwcm9wZXJ0eSBkZXNjcmlwdG9yXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgICAgQSBuZXcgb2JqZWN0IHByb3RvdHlwZVxuICovXG5mdW5jdGlvbiBhc2NvdCgvKiBhcmd1bWVudHMgKi8pIHtcbiAgICB2YXIgbWl4aW5zLCBkZXNjcmlwdG9yLCBjb25zdHJ1Y3RvciwgaXRlbTtcblxuICAgIC8vIEVzdGFibGlzaCBhcHByb3ByaWF0ZSBhcmd1bWVudHNcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBtaXhpbnMgICAgID0gYXJndW1lbnRzWzBdO1xuICAgICAgICBkZXNjcmlwdG9yID0gYXJndW1lbnRzWzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG1peGlucyAgICAgPSBbXTtcbiAgICAgICAgZGVzY3JpcHRvciA9IGFyZ3VtZW50c1swXTtcbiAgICB9XG5cbiAgICBkZXNjcmlwdG9yID0gZGVzY3JpcHRvciB8fCB7fTtcblxuICAgIC8vIENvbGxlY3QgZWFjaCBwcm90b3R5cGUncyBkZXNjcmlwdG9yXG4gICAgZm9yICh2YXIgaT0wLCBsZW49bWl4aW5zLmxlbmd0aDsgaTxsZW47IGkrPTEpIHtcbiAgICAgICAgaXRlbSA9IG1peGluc1tpXTtcblxuICAgICAgICAvLyBBbGxvdyBmb3Igc3RyaW5nIHJlZmVyZW5jZXMgdG8gYmFzZSBhc2NvdCBjbGFzc2VzXG4gICAgICAgIGl0ZW0gPSBtaXhpbnNbaV0gPSB0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgPyBhc2NvdFtpdGVtXSA6IGl0ZW07XG4gICAgICAgIG1peGluc1tpXSA9IGl0ZW0uZGVzY3JpcHRvcjtcbiAgICB9XG5cbiAgICAvLyBFeHBhbmQgYW5kIGFkZCBjdXJyZW50IGRlc2NyaXB0b3IgdG8gbWl4aW5zXG4gICAgZm9yICh2YXIgaiBpbiBkZXNjcmlwdG9yKSB7XG4gICAgICAgIGRlc2NyaXB0b3Jbal0gPSBleHBhbmREZXNjcmlwdG9yKGRlc2NyaXB0b3Jbal0pO1xuICAgIH1cblxuICAgIG1peGlucy5wdXNoKGRlc2NyaXB0b3IpO1xuICAgIGRlc2NyaXB0b3IgPSBjb21iaW5lRGVzY3JpcHRvcnMobWl4aW5zKTtcblxuICAgIC8vIEZvcm0gYSBuZXcgY29uc3RydWN0b3JcbiAgICBjb25zdHJ1Y3RvciA9IGNyZWF0ZUNvbnN0cnVjdG9yKGRlc2NyaXB0b3IpO1xuXG4gICAgcmV0dXJuIGNvbnN0cnVjdG9yO1xufVxuXG4vKioqKioqKioqKioqKioqKioqXG4gKiAgQ29uc3RydWN0aW9uICAqXG4gKioqKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgY29uc3RydWN0b3IgdGhhdCBtYXkgYmUgdXNlZCB0byBjcmVhdGUgb2JqZWN0cyB3aXRoIHRoZSAnbmV3JyBrZXl3b3JkXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gQSBzdGFuZGFyZCBjb25zdHJ1Y3RvciBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBjcmVhdGVDb25zdHJ1Y3RvcihkZXNjcmlwdG9yKSB7XG4gICAgdmFyIGNvbnN0cnVjdG9yID0gKGZ1bmN0aW9uKGRlc2MpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKC8qIGFyZ3VtZW50cyAqLykge1xuICAgICAgICAgICAgLyoganNoaW50IHZhbGlkdGhpcyA6IHRydWUgKi9cbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIGRlZXBDb3B5KGRlc2MpKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY29uc3RydWN0KSB7IHRoaXMuY29uc3RydWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH1cbiAgICAgICAgfTtcbiAgICB9KShkZXNjcmlwdG9yKTtcblxuICAgIGNvbnN0cnVjdG9yLnByb3RvdHlwZSAgPSB7fTtcbiAgICBjb25zdHJ1Y3Rvci5kZXNjcmlwdG9yID0gZGVzY3JpcHRvcjtcblxuICAgIHJldHVybiBjb25zdHJ1Y3Rvcjtcbn1cblxuLyoqKioqKioqKioqKioqKioqXG4gKiAgRGVzY3JpcHRvcnMgICpcbiAqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBFeHBhbmRzIGEgc2hvcnRoYW5kIGRlc2NyaXB0b3IgdG8gYSBmb3JtYWwgZGVzY3JpcHRvci4gIEEgc2hvcnRoYW5kIGRlc2NyaXB0b3IgY29uc2lzdHNcbiAqIG9mIHRocmVlLWNoYXJhY3RlciBhYmJyZXZpYXRpb25zIG9mICd3cml0YWJsZScsICdjb25maWd1cmFibGUnLCBldGMuIGluIHRoZSBmb3JtIDpcbiAqIHdydCwgY2ZnLCBlbm0sIHZhbCBhbG9uZyB3aXRoIHRoZSBub3JtYWwgZ2V0ICYgc2V0LiAgQWRkaXRpb25hbGx5LCBwcm9wZXJ0aWVzIGZvciB3aGljaFxuICogYSBwcm9wZXJ0eSBkZXNjcmlwdG9yIGhhcyBub3QgYmVlbiBzZXQgZ2V0IGEgZGVmYXVsdCBkZXNjcmlwdG9yLlxuICogQHBhcmFtIHtPYmplY3R9IGRlc2NyaXB0b3IgQSBzaG9ydGhhbmQgZGVzY3JpcHRvclxuICovXG5mdW5jdGlvbiBleHBhbmREZXNjcmlwdG9yKGRlc2NyaXB0b3IpIHtcbiAgICB2YXIgbmV3RGVzY3JpcHRvciA9IHt9O1xuXG4gICAgaWYgKCFkZXNjcmlwdG9yKSB7IHJldHVybjsgfVxuXG4gICAgLy8gRXhwYW5kIHRoZSBkZXNjcmlwdG9yIGlmIHRoZSBhcmd1bWVudCBpcyBhIHZhbGlkIGRlc2NyaXB0b3JcbiAgICBpZiAoaXNEZXNjcmlwdG9yKGRlc2NyaXB0b3IpKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gZGVzY3JpcHRvcikge1xuICAgICAgICAgICAgc3dpdGNoIChpKSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ2VubScgOlxuICAgICAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3JbaV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2NmZycgOlxuICAgICAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gZGVzY3JpcHRvcltpXTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnd3J0JyA6XG4gICAgICAgICAgICAgICAgbmV3RGVzY3JpcHRvci53cml0YWJsZSA9IGRlc2NyaXB0b3JbaV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ3ZhbCcgOlxuICAgICAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3IudmFsdWUgPSBkZXNjcmlwdG9yW2ldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICBuZXdEZXNjcmlwdG9yW2ldID0gZGVzY3JpcHRvcltpXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdEZXNjcmlwdG9yO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIGRlZmF1bHQgZGVzY2lwdG9yXG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3cml0YWJsZSAgICAgOiB0cnVlLFxuICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZSAgICAgICAgOiBkZXNjcmlwdG9yXG4gICAgICAgIH07XG4gICAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcHJvdG90eXBlIGZyb20gYSBzZXQgb2YgcHJvcGVydHkgZGVzY3JpcHRvciBvYmplY3RzLiAgVGhlIHByb3RvdHlwZVxuICogaXMgdGhlIHJlc3VsdCBmcm9tIGFcbiAqIEBwYXJhbSB7QXJyYXl9IGRlc2NyaXB0b3JzIEFuIGFycmF5IG9mIGV4cGFuZGVkIGRlc2NyaXB0b3JzLlxuICovXG5mdW5jdGlvbiBjb21iaW5lRGVzY3JpcHRvcnMoZGVzY3JpcHRvcnMpIHtcbiAgICB2YXIgZGVzYywgYXBwZW5kZWREZXNjLCBwcm9wTmFtZTtcbiAgICB2YXIgbmV3RGVzY3JpcHRvciA9IHt9O1xuXG4gICAgZm9yICh2YXIgaT0wLCBsZW49ZGVzY3JpcHRvcnMubGVuZ3RoOyBpPGxlbjsgaSs9MSkge1xuICAgICAgICBkZXNjID0gZGVzY3JpcHRvcnNbaV07XG5cbiAgICAgICAgZm9yICh2YXIgaiBpbiBkZXNjKSB7XG4gICAgICAgICAgICBhcHBlbmRlZERlc2MgPSBhcHBlbmREZXNjcmlwdG9yKGosIG5ld0Rlc2NyaXB0b3Jbal0sIGRlc2Nbal0pO1xuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgYXNzaWduaW5nIGEgdmFsdWUgdG8gYW4gYWNjZXNzZWQgcHJvcGVydHlcbiAgICAgICAgICAgIG5ld0Rlc2NyaXB0b3Jbal0gPSBhcHBlbmRlZERlc2MgPT09IHRydWUgPyBuZXdEZXNjcmlwdG9yW2pdIDogYXBwZW5kZWREZXNjO1xuXG4gICAgICAgICAgICAvLyBBc3NpZ24gdmFsdWUgdG8gYWNjZXNzZWQgcHJvcGVydHlcbiAgICAgICAgICAgIGlmIChhcHBlbmRlZERlc2MgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBwcm9wTmFtZSA9ICdfJyArIGo7XG4gICAgICAgICAgICAgICAgbmV3RGVzY3JpcHRvcltwcm9wTmFtZV0gPSBuZXdEZXNjcmlwdG9yW3Byb3BOYW1lXSB8fCB7fTtcbiAgICAgICAgICAgICAgICBuZXdEZXNjcmlwdG9yW3Byb3BOYW1lXS52YWx1ZSA9IGRlc2Nbal0udmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3RGVzY3JpcHRvcjtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIGEgZGVzY3JpcHRvciB0byBhIHRhcmdldCBkZXNjcmlwdG9yXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlOYW1lIFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBhc3NvY2lhdGVkIHdpdGggdGhpcyBkZXNjcmlwdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0ICAgICAgIEEgdGFyZ2V0IGRlc2NyaXB0b3IgdG8gYXBwZW5kIHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZGVzY3JpcHRvciAgIEFuIGV4cGFuZGVkIGRlc2NyaXB0b3IgaW5jbHVkaW5nIG1peGluIG1vZGlmaWVyc1xuICovXG5mdW5jdGlvbiBhcHBlbmREZXNjcmlwdG9yKHByb3BlcnR5TmFtZSwgdGFyZ2V0LCBkZXNjcmlwdG9yKSB7XG4gICAgdmFyIG1vZGlmaWVyO1xuICAgIHZhciBpc05ldyA9ICF0YXJnZXQ7XG5cbiAgICB0YXJnZXQgPSB0YXJnZXQgfHwge307XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGlzIGlzIGFuIGltcGxpY2l0IGFjY2Vzc29yIHZhbHVlIG92ZXJyaWRlXG4gICAgaWYgKCh0YXJnZXQuZ2V0IHx8IHRhcmdldC5zZXQpICYmIChkZXNjcmlwdG9yLnZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IG1vZGlmaWVycyBhbmQgY29weSBvdmVyIG5ldyBkZXNjcmlwdG9yIHByb3BlcnRpZXNcbiAgICBmb3IgKHZhciBpIGluIGRlc2NyaXB0b3IpIHtcblxuICAgICAgICAvLyBSZXRhaW4gbWl4aW4gbW9kaWZpZXJzXG4gICAgICAgIGlmIChpLmluZGV4T2YoJyQnKSA+PSAwKSB7XG4gICAgICAgICAgICBtb2RpZmllciAgICAgICA9IHt9O1xuICAgICAgICAgICAgbW9kaWZpZXIua2V5ICAgPSBpO1xuICAgICAgICAgICAgbW9kaWZpZXIudmFsdWUgPSB0YXJnZXRbaV0gPSBkZXNjcmlwdG9yW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29weSBvdmVyIG5vcm1hbCBkZXNjcmlwdG9yIHByb3BlcnRpZXNcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbaV0gPSBkZWVwQ29weShkZXNjcmlwdG9yW2ldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9LIHRvIGFwcGx5IG1vZGlmaWVyc1xuICAgIGlmIChtb2RpZmllcikge1xuICAgICAgICBhcHBseU1vZGlmaWVyKHByb3BlcnR5TmFtZSwgdGFyZ2V0LCBtb2RpZmllcik7XG4gICAgfVxuXG4gICAgLy8gQWx3YXlzIGFsbG93IG92ZXJ3cml0aW5nIG9mIG5vdGF0aW9uYWwgcHJpdmF0ZSB2YXJpYWJsZXNcbiAgICBlbHNlIGlmIChwcm9wZXJ0eU5hbWUuaW5kZXhPZignXycpID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAgLy8gQWxsb3cgbm9uLWZ1bmN0aW9uYWwgb3ZlcnJpZGVzXG4gICAgZWxzZSBpZiAodHlwZW9mIHRhcmdldC52YWx1ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIC8vIERvbid0IGFsbG93IGluYWR2ZXJ0YW50IG92ZXJyaWRlc1xuICAgIGVsc2UgaWYgKCFtb2RpZmllciAmJiAhaXNOZXcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdHRlbXB0ZWQgdG8gb3ZlcndyaXRlIGFuIGV4aXN0aW5nIHByb3BlcnR5IHdpdGhvdXQgYSBtb2RpZmllci4gQXBwbHkgYSBtb2RpZmllciBvciB1c2UgJG92ZXJyaWRlLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKioqKioqKioqKioqKioqKioqKipcbiAqICBNaXhpbiBNb2RpZmllcnMgICpcbiAqKioqKioqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogQXBwbGllcyBhIG1vZGlmaWVyIHRvIGEgZGVzY3JpcHRvciwgY3JlYXRpbmcgYXBwcm9wcmlhdGUgaXRlcmF0b3JzIG9yIGFwcGVuZGluZy9wcmVwZW5kaW5nXG4gKiB0byBleGlzdGluZyBtZXRob2RzLlxuICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5TmFtZSBUaGUgbmFtZSBvZiB0aGUgcHJvcGVydHkgYXNzb2NpYXRlZCB3aXRoIHRoaXMgZGVzY3JpcHRvclxuICogQHBhcmFtIHtPYmplY3RzfSBkZXNjcmlwdG9yIEEgdGFyZ2V0IGRlc2NyaXB0b3IgdG8gbW9kaWZ5XG4gKiBAcGFyYW0ge09iamVjdH0gIG1vZGlmaWVyICAgQSBrZXkgYW5kIHZhbHVlIGRlc2NyaWJpbmcgYSBwYXJ0aWN1bGFyIG1vZGlmaWVyXG4gKi9cbmZ1bmN0aW9uIGFwcGx5TW9kaWZpZXIocHJvcGVydHlOYW1lLCBkZXNjcmlwdG9yLCBtb2RpZmllcikge1xuICAgIHZhciBjYWxscztcbiAgICB2YXIgdmFsID0gZGVzY3JpcHRvci52YWx1ZTtcblxuICAgIHN3aXRjaCAobW9kaWZpZXIua2V5KSB7XG5cbiAgICBjYXNlICckY2hhaW4nIDpcbiAgICAgICAgY2FsbHMgPSBwcm9jZXNzQ2FsbHMocHJvcGVydHlOYW1lLCBtb2RpZmllci52YWx1ZSk7XG4gICAgICAgIGRlc2NyaXB0b3IudmFsdWUgPSBjcmVhdGVDaGFpbihjYWxscyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnJGl0ZXJhdGUnIDpcbiAgICAgICAgY2FsbHMgPSBwcm9jZXNzQ2FsbHMocHJvcGVydHlOYW1lLCBtb2RpZmllci52YWx1ZSk7XG4gICAgICAgIGRlc2NyaXB0b3IudmFsdWUgPSBjcmVhdGVJdGVyYXRvcihjYWxscyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnJGJlZm9yZScgOlxuICAgICAgICBkZXNjcmlwdG9yLnZhbHVlID0gcHJlcGVuZEl0ZXJhdG9yKHZhbCwgbW9kaWZpZXIudmFsdWUpO1xuICAgICAgICBicmVhaztcblxuICAgIGNhc2UgJyRhZnRlcicgOlxuICAgICAgICBkZXNjcmlwdG9yLnZhbHVlID0gYXBwZW5kSXRlcmF0b3IodmFsLCBtb2RpZmllci52YWx1ZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnJG92ZXJyaWRlJyA6XG4gICAgICAgIGFwcGx5T3ZlcnJpZGUoZGVzY3JpcHRvciwgbW9kaWZpZXIudmFsdWUpO1xuICAgICAgICBicmVhaztcblxuICAgIGRlZmF1bHQgOlxuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gZGVzY3JpcHRvcjtcbn1cblxuLyoqXG4gKiBQcm9jZXNzZXMgcGFzc2VkIGNhbGxzIGZyb20gYSBpdGVyYXRvciBwcm9wZXJ0eSBkZXNjcmlwdG9yLiAgSWYgYW4gaXRlbSBpcyBhXG4gKiBjb25zdHJ1Y3RvciwgYSBmdW5jdGlvbiBvZiB0aGUgZ2l2ZW4gbmFtZSBpcyBzb3VnaHQgb24gYSBkZXNjcmlwdG9yIGFuZCB1c2VkIGluc3RlYWQuXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZSAgVGhlIG5hbWUgb2YgdGhlIG1ldGhvZCB0byBpdGVyYXRlXG4gKiBAcGFyYW0gIHtBcnJheX0gICAgaXRlbXMgT2JqZWN0cyBhbmQgZnVuY3Rpb25zIGNvbXBvc2luZyB0aGUgaXRlcmF0b3JcbiAqIEByZXR1cm4ge0FycmF5fSAgICAgICBUaGUgbmV3IGl0ZXJhdG9yXG4gKi9cbmZ1bmN0aW9uIHByb2Nlc3NDYWxscyhuYW1lLCBpdGVtcykge1xuICAgIHZhciBpdGVtO1xuICAgIHZhciBjYWxscyA9IFtdO1xuXG4gICAgLy8gQWRkIGVhY2ggaXRlbSB0byB0aGUgaXRlcmF0b3JcbiAgICBmb3IgKHZhciBpPTAsIGxlbj1pdGVtcy5sZW5ndGg7IGk8bGVuOyBpKz0xKSB7XG4gICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcblxuICAgICAgICBpZiAoIWl0ZW0pIHsgY29udGludWU7IH1cblxuICAgICAgICAvLyBTZWVrIGEgZnVuY3Rpb24gd2l0aGluIGEgcHJvdG90eXBlIGFuZCBhZGQgdG8gdGhlIGl0ZXJhdG9yXG4gICAgICAgIGlmIChpdGVtLmRlc2NyaXB0b3IgJiYgdHlwZW9mIGl0ZW0uZGVzY3JpcHRvcltuYW1lXS52YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbHMucHVzaChpdGVtLmRlc2NyaXB0b3JbbmFtZV0udmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGZ1bmN0aW9ucyB0byB0aGUgaXRlcmF0b3IgZGlyZWN0bHlcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxzLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2FsbHM7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbmQgcmV0dXJucyBhIGNoYWluaW5nIGl0ZXJhdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBjYWxscyBBIGxpc3Qgb2YgY2FsbHMgYXNzb2NpYXRlZCB3aXRoIHRoZSBpdGVyYXRvclxuICovXG5mdW5jdGlvbiBjcmVhdGVDaGFpbihjYWxscykge1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBpdGVyYXRvciBtZXRob2QgdGhhdCBjaGFpbnMgdGhyb3VnaCBlYWNoIGNhbGxcbiAgICBmdW5jdGlvbiBpdGVyYXRvcigpIHtcbiAgICAgICAgLyoganNoaW50IHZhbGlkdGhpcyA6IHRydWUgKi9cbiAgICAgICAgdmFyIGFyZ3MgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICAgICAgdmFyIGNhbGxzID0gaXRlcmF0b3IuX2NhbGxzO1xuXG4gICAgICAgIGZvciAodmFyIGo9MCwgakxlbj1jYWxscy5sZW5ndGg7IGo8akxlbjsgais9MSkge1xuICAgICAgICAgICAgYXJnc1swXSA9IGNhbGxzW2pdLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgfVxuXG4gICAgaXRlcmF0b3IuX2NhbGxzID0gY2FsbHM7XG5cbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbmQgcmV0dXJucyBhIGNoYWluaW5nIGl0ZXJhdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBjYWxscyBBIGxpc3Qgb2YgY2FsbHMgYXNzb2NpYXRlZCB3aXRoIHRoZSBpdGVyYXRvclxuICovXG5mdW5jdGlvbiBjcmVhdGVJdGVyYXRvcihjYWxscykge1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBpdGVyYXRvciBtZXRob2QgdGhhdCBjaGFpbnMgdGhyb3VnaCBlYWNoIGNhbGxcbiAgICBmdW5jdGlvbiBpdGVyYXRvcigpIHtcbiAgICAgICAgLyoganNoaW50IHZhbGlkdGhpcyA6IHRydWUgKi9cbiAgICAgICAgdmFyIHZhbDtcbiAgICAgICAgdmFyIGFyZ3MgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICAgICAgdmFyIGNhbGxzID0gaXRlcmF0b3IuX2NhbGxzO1xuXG4gICAgICAgIGZvciAodmFyIGo9MCwgakxlbj1jYWxscy5sZW5ndGg7IGo8akxlbjsgais9MSkge1xuICAgICAgICAgICAgdmFsID0gY2FsbHNbal0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH1cblxuICAgIGl0ZXJhdG9yLl9jYWxscyA9IGNhbGxzO1xuXG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG4vKipcbiAqIFByZXBlbmRzIGEgZnVuY3Rpb24gdG8gYW4gZXhpc3RpbmcgaXRlcmF0b3IuICBDcmVhdGVzIGFuIGl0ZXJhdG9yIGlmIG9uZSBoYWQgbm90XG4gKiB5ZXQgYmVlbiBjcmVhdGVkLlxuICogQHBhcmFtICB7RnVuY3Rpb259IGl0ZXJhdG9yIEFuIGV4aXN0aW5nIGl0ZXJhdG9yIGZ1bmN0aW9uXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gICAgICAgQSBmdW5jdGlvbiB0byBhcHBlbmRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSAgICAgICAgICBpdGVyYXRvclxuICovXG5mdW5jdGlvbiBwcmVwZW5kSXRlcmF0b3IoaXRlcmF0b3IsIGZuKSB7XG4gICAgdmFyIGNhbGxzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaXRlcmF0b3IuX2NhbGxzLCAwKTtcblxuICAgIGlmICh0eXBlb2YgaXRlcmF0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIGZuO1xuICAgIH1cblxuICAgIC8vIFByZXBlbmQgdG8gYW4gZXhpc3RpbmcgaXRlcmF0b3JcbiAgICBpZiAoY2FsbHMpIHtcbiAgICAgICAgY2FsbHMuc3BsaWNlKDAsIDAsIGZuKTtcbiAgICAgICAgaXRlcmF0b3IuX2NhbGxzID0gY2FsbHM7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IGl0ZXJhdG9yIGlmIG9uZSBoYWQgbm90IGJlZW4gY3JlYXRlZFxuICAgIGVsc2Uge1xuICAgICAgICBpdGVyYXRvciA9IGNyZWF0ZUl0ZXJhdG9yKFtmbiwgaXRlcmF0b3JdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbi8qKlxuICogQXBwZW5kcyBhIGZ1bmN0aW9uIHRvIGFuIGV4aXN0aW5nIGl0ZXJhdG9yLiAgQ3JlYXRlcyBhbiBpdGVyYXRvciBpZiBvbmUgaGFkIG5vdFxuICogeWV0IGJlZW4gY3JlYXRlZC5cbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBpdGVyYXRvciBBbiBleGlzdGluZyBpdGVyYXRvciBmdW5jdGlvblxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuICAgICAgIEEgZnVuY3Rpb24gdG8gYXBwZW5kXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gICAgICAgICAgaXRlcmF0b3JcbiAqL1xuZnVuY3Rpb24gYXBwZW5kSXRlcmF0b3IoaXRlcmF0b3IsIGZuKSB7XG4gICAgdmFyIGNhbGxzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoaXRlcmF0b3IuX2NhbGxzLCAwKTtcblxuICAgIGlmICh0eXBlb2YgaXRlcmF0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIGZuO1xuICAgIH1cblxuICAgIC8vIFByZXBlbmQgdG8gYW4gZXhpc3RpbmcgaXRlcmF0b3JcbiAgICBpZiAoY2FsbHMpIHtcbiAgICAgICAgY2FsbHMucHVzaChmbik7XG4gICAgICAgIGl0ZXJhdG9yLl9jYWxscyA9IGNhbGxzO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIG5ldyBpdGVyYXRvciBpZiBvbmUgaGFkIG5vdCBiZWVuIGNyZWF0ZWRcbiAgICBlbHNlIHtcbiAgICAgICAgaXRlcmF0b3IgPSBjcmVhdGVJdGVyYXRvcihbaXRlcmF0b3IsIGZuXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG4vKipcbiAqIEFwcGxpZXMgdGhlIGFwcHJvcHJpYXRlIG92ZXJyaWRlLiBBY2Nlc3NvciBwcm9wZXJ0aWVzIG1heSBiZSBvdmVycmlkZGVuXG4gKiBieSBzcGVjaWZ5aW5nICRvdmVycmlkZSA6IHRydWUsIHdoZXJlYXMgZGF0YSBwcm9wZXJ0aWVzIGhhdmUgdGhlaXIgdmFsdWVzIG92ZXJyaWRkZW5cbiAqIGJ5ICRvdmVycmlkZSA6IG5ld1ZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gIGRlc2NyaXB0b3IgVGhlIGRlc2NyaXB0b3IgdG8gYXBwbHkgdGhlIG92ZXJyaWRlIHRvXG4gKiBAcGFyYW0ge1ZhcmlhbnR9IG92ZXJyaWRlICAgICAgICBBIGZ1bmN0aW9uIGxpc3RlZCB1bmRlciBkZXNjcmlwdG9yLnZhbHVlXG4gKi9cbmZ1bmN0aW9uIGFwcGx5T3ZlcnJpZGUoZGVzY3JpcHRvciwgb3ZlcnJpZGUpIHtcblxuICAgIC8vIE9ubHkgbW9kaWZ5IHZhbHVlcyBmb3IgZGF0YSBwcm9wZXJ0aWVzXG4gICAgaWYgKCFkZXNjcmlwdG9yLmdldCAmJiAhZGVzY3JpcHRvci5zZXQpIHtcbiAgICAgICAgZGVzY3JpcHRvci52YWx1ZSA9IG92ZXJyaWRlO1xuICAgIH1cbn1cblxuLyoqKioqKioqKioqKioqKlxuICogIFV0aWxpdGllcyAgKlxuICoqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIGFuIG9iamVjdCBpcyBhIGRlc2NyaXB0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogQSBwcm9wb3NlZCBkZXNjcmlwdG9yXG4gKi9cbmZ1bmN0aW9uIGlzRGVzY3JpcHRvcihvYmopIHtcbiAgICBpZiAoIW9iaiB8fCBvYmogIT09IE9iamVjdChvYmopKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgaWYgKFxuICAgICAgICAnZW5tJyBpbiBvYmogfHxcbiAgICAgICAgJ2NmZycgaW4gb2JqIHx8XG4gICAgICAgICd3cnQnIGluIG9iaiB8fFxuICAgICAgICAndmFsJyBpbiBvYmogfHxcbiAgICAgICAgJ2VudW1lcmFibGUnIGluIG9iaiB8fFxuICAgICAgICAnY29uZmlndXJhYmxlJyBpbiBvYmogfHxcbiAgICAgICAgJ3dyaXRhYmxlJyBpbiBvYmogfHxcbiAgICAgICAgJ3ZhbHVlJyBpbiBvYmogfHxcbiAgICAgICAgJ2dldCcgaW4gb2JqIHx8XG4gICAgICAgICdzZXQnIGluIG9iaiB8fFxuICAgICAgICAnJGNoYWluJyBpbiBvYmogfHxcbiAgICAgICAgJyRpdGVyYXRlJyBpbiBvYmogfHxcbiAgICAgICAgJyRiZWZvcmUnIGluIG9iaiB8fFxuICAgICAgICAnJGFmdGVyJyBpbiBvYmogfHxcbiAgICAgICAgJyRvdmVycmlkZScgaW4gb2JqXG4gICAgICAgIClcbiAgICB7IHJldHVybiB0cnVlOyB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ29waWVzIHRoZSBwYXNzZWQgaXRlbSwgcmVnYXJkbGVzcyBvZiBkYXRhIHR5cGUuICBPYmplY3RzIGFuZCBhcnJheXMgYXJlXG4gKiBjb3BpZWQgYnkgdmFsdWUgYW5kIG5vdCBieSByZWZlcmVuY2UuXG4gKiBAcGFyYW0ge1ZhcmlhbnR9IGl0ZW0gU29tZXRoaW5nIHRvIGNvcHlcbiAqL1xuZnVuY3Rpb24gZGVlcENvcHkoaXRlbSkge1xuICAgIHZhciBjb3B5O1xuXG4gICAgLy8gUmVjdXJzaXZlbHkgY29weSBhcnJheXNcbiAgICBpZiAoQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgICBjb3B5ID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49aXRlbS5sZW5ndGg7IGk8bGVuOyBpKz0xKSB7XG4gICAgICAgICAgICBjb3B5LnB1c2goZGVlcENvcHkoaXRlbVtpXSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgfVxuXG4gICAgLy8gUmVjdXJzaXZlbHkgY29weSBvYmplY3RzXG4gICAgZWxzZSBpZiAoaXRlbSA9PT0gT2JqZWN0KGl0ZW0pICYmIHR5cGVvZiBpdGVtICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvcHkgPSB7fTtcblxuICAgICAgICBmb3IgKHZhciBqIGluIGl0ZW0pIHtcbiAgICAgICAgICAgIGNvcHlbal0gPSBkZWVwQ29weShpdGVtW2pdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb3B5O1xuICAgIH1cblxuICAgIC8vIEp1c3QgcmV0dXJuIHRoZSB2YWx1ZVxuICAgIHJldHVybiBpdGVtO1xufVxuXG4vKioqKioqKioqKioqKlxuICogIEV4cG9ydHMgICpcbiAqKioqKioqKioqKioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFzY290O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNjb3QgICAgICAgID0gcmVxdWlyZSgnLi9Bc2NvdC5qcycpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4vRXZlbnRFbWl0dGVyLmpzJyk7XG5cbi8qKlxuICogQ29uc3RydWN0cyB0aGUgRE9NVmlldywgZXN0YWJsaXNoaW5nIGl0cyBkYXRhIGFuZCB0ZW1wbGF0ZSBhbmQgcGVyZm9ybWluZ1xuICogYW4gaW5pdGlhbCByZW5kZXJpbmcuXG4gKiBAcGFyYW0ge1ZhcmlhbnR9ICBkYXRhICAgICBUaGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhpcyB2aWV3XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0ZW1wbGF0ZSBBbiBIVE1MIHRlbXBsYXRpbmcgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gY29uc3RydWN0KGRhdGEsIHRlbXBsYXRlKSB7XG4gICAgdGhpcy5fZGF0YSAgICA9IGRhdGEgICAgIHx8IHRoaXMuX2RhdGE7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlIHx8IHRoaXMudGVtcGxhdGU7XG4gICAgaWYgKGRhdGEpIHsgYmluZFZpZXdUb01vZGVsLmNhbGwodGhpcyk7IH1cbiAgICByZW5kZXIuY2FsbCh0aGlzKTtcblxuICAgIHJldHVybiB0aGlzO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIERPTVZpZXcgdXNpbmcgdGhlIGF2YWlsYWJsZSB0ZW1wbGF0ZS4gT24gcmVuZGVyaW5nLCBhIG5ldyBlbGVtZW50IGlzIGNyZWF0ZWQsXG4gKiBhbmQgbXVzdCBiZSBhZGRlZCB0byB0aGUgRE9NLlxuICovXG5mdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgZGl2LmlubmVySFRNTCA9IHRoaXMudGVtcGxhdGUodGhpcy5kYXRhKTtcbiAgICB0aGlzLl9lbGVtZW50ID0gZGl2LmZpcnN0Q2hpbGQ7XG59XG5cbi8qKioqKioqKioqKioqXG4gKiAgSGFuZGxlcyAgKlxuICoqKioqKioqKioqKiovXG5cbi8qKlxuICogRXN0YWJsaXNoZXMgYWNjZXNzb3JzIHRvIHNwZWNpZmljIGVsZW1lbnRzIG9yIHNldHMgb2YgZWxlbWVudHMgd2l0aGluIHRoaXMgdmlldy5cbiAqIEhhbmRsZXMgYXJlIHNldCB1c2luZyBhIGhhc2ggbWFwIHRoYXQgYXNzb2NpYXRlcyBoYW5kbGVzIHdpdGggRE9NIHF1ZXJ5IHNlbGVjdG9yIHN0cmluZ3MuXG4gKiBAcGFyYW0ge09iamVjdH0gaGFuZGxlcyBBIGhhc2ggbWFwIG9mIGhhbmRsZXNcbiAqL1xuZnVuY3Rpb24gc2V0SGFuZGxlcyhoYW5kbGVzKSB7XG4gICAgdmFyIF9oYW5kbGVzID0gdGhpcy5faGFuZGxlcztcblxuICAgIGZvciAodmFyIGkgaW4gaGFuZGxlcykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgaSwge1xuICAgICAgICAgICAgZ2V0ICAgICAgICAgIDogZ2V0RWxlbWVudEJ5U2VsZWN0b3IuYmluZCh0aGlzLCBoYW5kbGVzW2ldKSxcbiAgICAgICAgICAgIGVudW1lcmFibGUgICA6IHRydWUsXG4gICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIF9oYW5kbGVzW2ldID0gaGFuZGxlc1tpXTtcbiAgICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhIHNldCBvZiBjdXJyZW50IGhhbmRsZXNcbiAqL1xuZnVuY3Rpb24gZ2V0SGFuZGxlcygpIHtcbiAgICByZXR1cm4gdGhpcy5faGFuZGxlcztcbn1cblxuLyoqXG4gKiBHZXRzIGEgc2luZ2xlIGVsZW1lbnQgYnkgcXVlcnkgc2VsZWN0b3IuICBUaGUgZWxlbWVudCByZXRyaWV2ZWQgaXMgcmVsYXRpdmVcbiAqIHRvIHRoaXMgdmlldydzIGVsZW1lbnQuXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3IgQSBxdWVyeSBzZWxlY3RvciBzdHJpbmdcbiAqL1xuZnVuY3Rpb24gZ2V0RWxlbWVudEJ5U2VsZWN0b3Ioc2VsZWN0b3IpIHtcbiAgICB2YXIgZWwgPSB0aGlzLl9lbGVtZW50O1xuXG4gICAgcmV0dXJuIGVsLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xufVxuXG4vKioqKioqKioqKioqKioqKioqXG4gKiAgRGF0YSBCaW5kaW5nICAqXG4gKioqKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIEJpbmRzIHRoZSB2aWV3IHRvIGl0cyBtb2RlbC4gV2hlbmV2ZXIgYSBtb2RlbCBjaGFuZ2VzLCBpdCB0cmlnZ2VycyBhIGNhbGxiYWNrXG4gKiB0aGF0IHVwZGF0ZXMgdGhlIHZpZXcgYWNjb3JkaW5nbHkuXG4gKi9cbmZ1bmN0aW9uIGJpbmRWaWV3VG9Nb2RlbCgpIHtcbiAgICB2YXIgbW9kZWwgICAgPSB0aGlzLmRhdGE7XG4gICAgdmFyIGxpc3RlbmVyID0gdGhpcy5fbW9kZWxCaW5kTGlzdGVuZXIgPSB0aGlzLl9tb2RlbEJpbmRMaXN0ZW5lciB8fCB1cGRhdGVWaWV3LmJpbmQodGhpcyk7XG5cbiAgICBpZiAobW9kZWwub24pIHtcbiAgICAgICAgbW9kZWwub24oJ2xvYWQnLCBsaXN0ZW5lcik7XG4gICAgICAgIG1vZGVsLm9uKCdjaGFuZ2UnLCBsaXN0ZW5lcik7XG4gICAgfVxufVxuXG4vKipcbiAqIFVuYmluZHMgdGhlIHZpZXcgZnJvbSBpdHMgY3VycmVudCBtb2RlbCBieSByZW1vdmluZyBpdHMgZXZlbnQgbGlzdGVuZXJzXG4gKi9cbmZ1bmN0aW9uIHVuYmluZFZpZXdGcm9tTW9kZWwoKSB7XG4gICAgdmFyIG1vZGVsICAgID0gdGhpcy5kYXRhO1xuICAgIHZhciBsaXN0ZW5lciA9IHRoaXMuX21vZGVsQmluZExpc3RlbmVyO1xuXG4gICAgaWYgKCFsaXN0ZW5lcikgeyByZXR1cm47IH1cblxuICAgIGlmIChtb2RlbC5vbikge1xuICAgICAgICBtb2RlbC5vZmYoJ2xvYWQnLCBsaXN0ZW5lcik7XG4gICAgICAgIG1vZGVsLm9mZignY2hhbmdlJywgbGlzdGVuZXIpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSB2aWV3LCBlaXRoZXIgYnkgY2FsbGluZyBhbiB1cGRhdGUoKSBtZXRob2Qgb3IgdHJpZ2dlcmluZyBhXG4gKiByZS1yZW5kZXJpbmcgb2YgdGhlIHRlbXBsYXRlLlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIGRhdGEgdXNlZCB0byB1cGRhdGUgdGhlIHZpZXdcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIEEgcGVyaW9kLWRlbGltaXRlZCBwYXRoIHRvIHRoZSBkYXRhIGJlaW5nIG1vZGlmaWVkXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVZpZXcoZGF0YSwgcGF0aCkge1xuICAgIHZhciBlbCAgICAgPSB0aGlzLl9lbGVtZW50O1xuICAgIHZhciBwYXJlbnQgPSBlbC5wYXJlbnROb2RlO1xuXG4gICAgLy8gVXNlIHVwZGF0ZSBtZXRob2RzIGlmIGF2YWlsYWJsZVxuICAgIGlmICh0aGlzLnVwZGF0ZSkgeyB0aGlzLnVwZGF0ZShkYXRhLCBwYXRoKTsgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCByZS1yZW5kZXIgdXNpbmcgYSB0ZW1wbGF0ZSBhbmQgc3dhcCBlbGVtZW50c1xuICAgIGVsc2UgaWYgKHRoaXMudGVtcGxhdGUpIHtcbiAgICAgICAgcmVuZGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGlmIChwYXJlbnQpIHsgcGFyZW50LnJlcGxhY2VDaGlsZCh0aGlzLl9lbGVtZW50LCBlbCk7IH1cbiAgICB9XG59XG5cbi8qKioqKioqKioqKioqKipcbiAqICBBY2Nlc3NvcnMgICpcbiAqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogU2V0cyB0aGUgdmlldydzIGRhdGEsIHVwZGF0aW5nIHRoZSB2aWV3IGFjY29yZGluZ2x5XG4gKiBAcGFyYW0ge1ZhcmlhbnR9IGRhdGEgVGhlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSB2aWV3XG4gKi9cbmZ1bmN0aW9uIHNldERhdGEoZGF0YSkge1xuICAgIHVuYmluZFZpZXdGcm9tTW9kZWwuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgICBiaW5kVmlld1RvTW9kZWwuY2FsbCh0aGlzKTtcbiAgICB1cGRhdGVWaWV3LmNhbGwodGhpcywgZGF0YSk7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgY3VycmVudCB2aWV3J3MgZGF0YSBwcm9wZXJ0eVxuICovXG5mdW5jdGlvbiBnZXREYXRhKCkge1xuICAgIHJldHVybiB0aGlzLl9kYXRhO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHZpZXcncyB0b3AtbGV2ZWwgZWxlbWVudFxuICovXG5mdW5jdGlvbiBnZXRFbGVtZW50KCkge1xuICAgIHJldHVybiB0aGlzLl9lbGVtZW50O1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHRlbXBsYXRlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHZpZXdcbiAqL1xuZnVuY3Rpb24gZ2V0VGVtcGxhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RlbXBsYXRlO1xufVxuXG4vKipcbiAqIFNldHMgdGhlIHRlbXBsYXRlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHZpZXdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHRlbXBsYXRlIEEgdGVtcGxhdGluZyBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBzZXRUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuICAgIHRoaXMuX3RlbXBsYXRlID0gdGVtcGxhdGU7XG59XG5cbi8qKioqKioqKipcbiAqICBBUEkgICpcbiAqKioqKioqKiovXG5cbnZhciBhcGkgPSB7XG4gICAgY29uc3RydWN0IDogeyB2YWwgOiBjb25zdHJ1Y3QsIHdydCA6IGZhbHNlLCBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfSxcblxuICAgIGRhdGEgICAgICA6IHsgZ2V0IDogZ2V0RGF0YSwgICAgc2V0IDogc2V0RGF0YSwgZW5tIDogdHJ1ZSwgIGNmZyA6IHRydWUgIH0sXG4gICAgX2RhdGEgICAgIDogeyB2YWwgOiBudWxsLCAgICAgICB3cnQgOiB0cnVlLCAgICBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfSxcblxuICAgIGVsZW1lbnQgICA6IHsgZ2V0IDogZ2V0RWxlbWVudCwgICAgICAgICAgICAgICAgZW5tIDogdHJ1ZSwgIGNmZyA6IGZhbHNlIH0sXG4gICAgX2VsZW1lbnQgIDogeyB2YWwgOiBudWxsLCAgICAgICB3cnQgOiB0cnVlLCAgICBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfSxcblxuICAgIHRlbXBsYXRlICA6IHsgZ2V0IDogZ2V0VGVtcGxhdGUsIHNldCA6IHNldFRlbXBsYXRlLCBlbm0gOiB0cnVlLCBjZmcgOiBmYWxzZSB9LFxuICAgIF90ZW1wbGF0ZSA6IHsgdmFsIDogbnVsbCwgICAgICB3cnQgOiB0cnVlLCAgICBlbm0gOiBmYWxzZSwgIGNmZyA6IGZhbHNlIH0sXG5cbiAgICAvLyBIYW5kbGVzXG4gICAgaGFuZGxlcyAgOiB7IGdldCA6IGdldEhhbmRsZXMsIHNldCA6IHNldEhhbmRsZXMsIGVubSA6IHRydWUsICBjZmcgOiB0cnVlICB9LFxuICAgIF9oYW5kbGVzIDogeyB2YWwgOiB7fSwgICAgICAgICB3cnQgOiB0cnVlLCAgICAgICBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfSxcblxuICAgIC8qIE92ZXJyaWRlICovXG4gICAgdXBkYXRlIDogeyB2YWwgOiBudWxsLCB3cnQgOiB0cnVlLCBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfVxufTtcblxuLyoqKioqKioqKioqKipcbiAqICBFeHBvcnRzICAqXG4gKioqKioqKioqKioqKi9cblxuYXNjb3QuRE9NVmlldyA9IGFzY290KFtFdmVudEVtaXR0ZXJdLCBhcGkpO1xubW9kdWxlLmV4cG9ydHMgPSBhc2NvdC5ET01WaWV3O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNjb3QgPSByZXF1aXJlKCcuL0FzY290LmpzJyk7XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGV2ZW50IGxpc3RlbmVyIG9uIHRoZSBzcGVjaWZpZWQgdGFyZ2V0XG4gKiBAcGFyYW0ge1N0cmluZ30gICBldmVudE5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAgICAgICAgVGhlIG5ldyBjYWxsYmFjayB0byBoYW5kbGUgdGhlIGV2ZW50XG4gKi9cbmZ1bmN0aW9uIG9uKGV2ZW50TmFtZSwgY2IpIHtcbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdID0gdGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdO1xuXG4gICAgLy8gRG8gbm90aGluZyBpZiBhIGNhbGxiYWNrIGhhcyBhbHJlYWR5IGJlZW4gYWRkZWRcbiAgICBpZiAoY2FsbGJhY2tzLmluZGV4T2YoY2IpID49IDApIHsgcmV0dXJuOyB9XG5cbiAgICAvLyBBZGQgdGhlIGNhbGxiYWNrIHRvIHRoZSBsaXN0IG9mIGNhbGxiYWNrc1xuICAgIGNhbGxiYWNrcy5wdXNoKGNiKTtcbn1cblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gZXZlbnQgbGlzdGVuZXIgb24gdGhlIHNwZWNpZmllZCB0YXJnZXRcbiAqIEBwYXJhbSB7U3RyaW5nfSAgIGV2ZW50TmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiICAgICAgICBUaGUgbmV3IGNhbGxiYWNrIHRvIGhhbmRsZSB0aGUgZXZlbnRcbiAqL1xuZnVuY3Rpb24gb2ZmKGV2ZW50TmFtZSwgY2IpIHtcbiAgICB2YXIgaW5kZXg7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSA9IHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXTtcblxuICAgIC8vIFJlbW92ZSB0aGUgY2FsbGJhY2sgZnJvbSB0aGUgbGlzdFxuICAgIGluZGV4ID0gY2FsbGJhY2tzLmluZGV4T2YoY2IpO1xuXG4gICAgaWYgKGluZGV4ID49IDApIHsgY2FsbGJhY2tzLnNwbGljZShpbmRleCwgMSk7IH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIGFsbCBldmVudCBsaXN0ZW5lcnMgZm9yIGEgcGFydGljdWxhciBldmVudCBmcm9tIHRoZSBlbWl0dGVyXG4gKi9cbmZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyhldmVudE5hbWUpIHtcbiAgICBpZiAoZXZlbnROYW1lKSB7XG4gICAgICAgIHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZXZlbnRMaXN0ZW5lcnMgPSB7fTtcbiAgICB9XG59XG5cbi8qKlxuICogRW1pdHMgdGhlIHNwZWNpZmllZCBldmVudCwgY2FsbGluZyBhbmQgcGFzc2luZyB0aGUgb3B0aW9uYWwgYXJndW1lbnQgdG8gYWxsIGxpc3RlbmVyc1xuICogQHBhcmFtIHtTdHJpbmd9ICBldmVudE5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50IHRvIGVtaXRcbiAqIEBwYXJhbSB7VmFyaWFudH0gYXJnICAgICAgIEFueSBhcmd1bWVudCB0byBwYXNzIHRvIHRoZSBldmVudCBsaXN0ZW5lcnNcbiAqL1xuZnVuY3Rpb24gZW1pdChldmVudE5hbWUpIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSA9IHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXTtcblxuICAgIGFyZ3Muc2hpZnQoKTtcblxuICAgIGZvciAodmFyIGk9MCwgbGVuPWNhbGxiYWNrcy5sZW5ndGg7IGk8bGVuOyBpKz0xKSB7XG4gICAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG59XG5cbi8qKioqKioqKipcbiAqICBBUEkgICpcbiAqKioqKioqKiovXG5cbnZhciBhcGkgPSB7XG4gICAgb24gICAgICAgICAgICAgICAgIDogb24sXG4gICAgb2ZmICAgICAgICAgICAgICAgIDogb2ZmLFxuICAgIHJlbW92ZUFsbExpc3RlbmVycyA6IHJlbW92ZUFsbExpc3RlbmVycyxcbiAgICBlbWl0ICAgICAgICAgICAgICAgOiB7IHZhbCA6IGVtaXQsIHdydCA6IGZhbHNlLCBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfSxcblxuICAgIGV2ZW50TGlzdGVuZXJzIDogeyB2YWwgOiB7fSwgd3J0IDogdHJ1ZSwgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH1cbn07XG5cbi8qKioqKioqKioqKioqXG4gKiAgRXhwb3J0cyAgKlxuICoqKioqKioqKioqKiovXG5cbmFzY290LkV2ZW50RW1pdHRlciA9IGFzY290KGFwaSk7XG5tb2R1bGUuZXhwb3J0cyA9IGFzY290LkV2ZW50RW1pdHRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzY290ID0gcmVxdWlyZSgnLi9Bc2NvdC5qcycpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4vRXZlbnRFbWl0dGVyLmpzJyk7XG5cbi8qKioqKioqKioqKioqKioqXG4gKiAgUHJvcGVydGllcyAgKlxuICoqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogV2hldGhlciB0byBhbHdheXMgYXR0ZW1wdCB1cGRhdGluZyBmcm9tIHRoZSBvbmxpbmUgbG9jYXRpb24gcmF0aGVyIHRoYW4gcmV0cmVpdmVcbiAqIGZyb20gbG9jYWxTdG9yYWdlXG4gKiBAdHlwZSB7Qm9vbGVhbn1cbiAqL1xudmFyIHByZWZlck9ubGluZSA9IGZhbHNlO1xuXG4vKipcbiAqIFRoZSByZW1vdGUgbG9jYXRpb24gb2YgdGhlIGRhdGEgc291cmNlIGZvciByZXRyaWV2YWwgdXNpbmcgWE1MSHR0cFJlcXVlc3RcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKi9cbnZhciBzcmMgPSBudWxsO1xuXG4vKipcbiAqIFdoZXRoZXIgdG8gc3RvcmUgYW5kIHJldHJpZXZlIHRoaXMgbW9kZWwgZnJvbSBsb2NhbCBzdG9yYWdlXG4gKiBAdHlwZSB7Qm9vbGVhbn1cbiAqL1xudmFyIHN0b3JlTG9jYWwgPSB0cnVlO1xuXG4vKioqKioqKioqKioqKioqKioqXG4gKiAgQ29uc3RydWN0aW9uICAqXG4gKioqKioqKioqKioqKioqKioqL1xuXG4vKipcbiAqIENvbnN0cnVjdHMgdGhlIG1vZGVsLCBlc3RhYmxpc2hpbmcgYW5kIGxvYWRpbmcgaXRzIGRhdGEgc291cmNlLlxuICogQHBhcmFtIHtTdHJpbmd9IHNyYyBUaGUgZGF0YSBzb3VyY2UgYXNzb2NpYXRlZCB3aXRoIHRoaXMgbW9kZWxcbiAqL1xuZnVuY3Rpb24gY29uc3RydWN0KHNyYykge1xuICAgIGlmIChzcmMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzcmMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBsb2FkLmNhbGwodGhpcywgc3JjKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsc2UgaWYgKHNyYyA9PT0gT2JqZWN0KHNyYykpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQobG9hZERpcmVjdERhdGEuYmluZCh0aGlzLCBzcmMpLCAwKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBMb2FkaW5nLCBTdG9yaW5nLCBSZXRyaWV2aW5nICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBTdG9yZXMgdGhlIG1vZGVsIHRvIGxvY2FsIHN0b3JhZ2UuICBTdG9yZWQgYXMgYSBrZXkvdmFsdWUgcGFpciB3aGVyZVxuICogdGhlIGtleSBpcyB0aGUgc3JjIG9mIHRoZSBkYXRhIGFuZCB0aGUgdmFsdWUgaXMgYSBKU09OIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gc3RvcmUoKSB7XG4gICAgbG9jYWxTdG9yYWdlW3NyY10gPSBKU09OLnN0cmluZ2lmeSh0aGlzKTtcbn1cblxuLyoqXG4gKiBMb2FkcyB0aGUgZGF0YSBlaXRoZXIgZnJvbSBhIHNlcnZlciBvciBmcm9tIGxvY2FsIHN0b3JhZ2UgZGVwZW5kaW5nIG9uIHNldHRpbmdzIGFuZFxuICogb25saW5lIHN0YXR1c1xuICogQHBhcmFtIHtTdHJpbmd9IHNyYyBPcHRpb25hbGx5IHNwZWNpZnkgdGhlIHNvdXJjZSBvZiB0aGUgZGF0YVxuICovXG5mdW5jdGlvbiBsb2FkKHNyYykge1xuICAgIHRoaXMuc3JjID0gc3JjIHx8IHRoaXMuc3JjO1xuXG4gICAgaWYgKGxvY2FsU3RvcmFnZVtzcmNdICYmICF0aGlzLnByZWZlck9ubGluZSkge1xuICAgICAgICBzZXRUaW1lb3V0KGxvYWRMb2NhbERhdGEuYmluZCh0aGlzKSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG9hZFJlbW90ZURhdGEuY2FsbCh0aGlzKTtcbiAgICB9XG59XG5cbi8qKlxuICogUGFyc2VzIGEganNvbiBzdHJpbmcgYW5kIG1lcmdlcyBkYXRhIHdpdGggdGhpcyBtb2RlbFxuICogQHBhcmFtIHtTdHJpbmd9IGpzb25cbiAqL1xuZnVuY3Rpb24gbG9hZExvY2FsRGF0YSgpIHtcbiAgICB2YXIgbG9jYWxEYXRhID0gbG9jYWxTdG9yYWdlW3RoaXMuc3JjXTtcblxuICAgIGlmIChsb2NhbERhdGEpIHsgcGFyc2UuY2FsbCh0aGlzLCBsb2NhbERhdGEpOyB9XG5cbiAgICB0aGlzLmVtaXQoJ2xvYWQnLCB0aGlzKTtcbn1cblxuLyoqXG4gKiBQYXJzZXMgcGFzc2VkIGpzb24gZGF0YVxuICogQHBhcmFtIHtTdHJpbmd9IGpzb24gQSB2YWxpZCBKU09OIHN0cmluZ1xuICovXG5mdW5jdGlvbiBwYXJzZShqc29uKSB7XG4gICAgdmFyIGRhdGEgPSBKU09OLnBhcnNlKGpzb24pO1xuXG4gICAgLy8gUGVyZm9ybXMgb3B0aW9uYWwgcHJvY2Vzc2luZyBzdGVwcyB0byBtb2RpZnkgdGhlIHN0cnVjdHVyZSBvZiB0aGUgZGF0YVxuICAgIGlmICh0aGlzLnByb2Nlc3MpIHsgZGF0YSA9IHRoaXMucHJvY2VzcyhkYXRhKTsgfVxuXG4gICAgZm9yICh2YXIgaSBpbiBkYXRhKSB7IHRoaXNbaV0gPSBkYXRhW2ldOyB9XG59XG5cbi8qKlxuICogTG9hZHMgZGF0YSBmcm9tIHRoZSBzZXJ2ZXIuICBJZiB0aGUgcmVxdWVzdCBmYWlscywgYXR0ZW1wdHMgbG9hZGluZyBkYXRhIGZyb20gbG9jYWxTdG9yYWdlLlxuICovXG5mdW5jdGlvbiBsb2FkUmVtb3RlRGF0YSgpIHtcbiAgICB2YXIgc3JjID0gdGhpcy5zcmM7XG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgeGhyLm9wZW4oJ0dFVCcsIHNyYyk7XG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZVhIUlJlc3BvbnNlLmJpbmQodGhpcywgeGhyKTtcbiAgICB4aHIuc2VuZChudWxsKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGluY29taW5nIFhIUiByZXNwb25zZXNcbiAqL1xuZnVuY3Rpb24gaGFuZGxlWEhSUmVzcG9uc2UoeGhyKSB7XG4gICAgdmFyIHR5cGUsIHRleHQ7XG5cbiAgICAvLyBSZXF1ZXN0IHdhcyBzdWNjZXNzZnVsXG4gICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0ICYmIHhoci5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICB0eXBlID0geGhyLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LVR5cGUnKTtcblxuICAgICAgICAvLyBNYWtlIHN1cmUgcmVzcG9uc2UgaXMgSlNPTlxuICAgICAgICBpZiAodHlwZS5pbmRleE9mKCdqc29uJykgPj0gMCkge1xuICAgICAgICAgICAgdGV4dCA9IHhoci5yZXNwb25zZVRleHQ7XG5cbiAgICAgICAgICAgIC8vIFBhcnNlIGFuZCBsb2FkXG4gICAgICAgICAgICBwYXJzZS5jYWxsKHRoaXMsIHRleHQpO1xuXG4gICAgICAgICAgICAvLyBTdG9yZSBkYXRhIGxvY2FsbHlcbiAgICAgICAgICAgIGlmICh0aGlzLnN0b3JlTG9jYWwpIHsgdGhpcy5zdG9yZSgpOyB9XG5cbiAgICAgICAgICAgIHRoaXMuZW1pdCgnbG9hZCcsIHRoaXMpO1xuICAgICAgICB9XG5cbiAgICAvLyBSZXF1ZXN0IGZhaWxlZCwgYXR0ZW1wdCBsb2FkaW5nIGxvY2FsbHkgaW5zdGVhZFxuICAgIH0gZWxzZSBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQgJiYgeGhyLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICAgIGxvYWRMb2NhbERhdGEuY2FsbCh0aGlzKTtcbiAgICB9XG59XG5cbi8qKlxuICogTG9hZHMgZGlyZWN0IGRhdGEgdGhhdCBoYXMgYmVlbiBwYXNzZWQgYXMgYSBjb25zdHJ1Y3RvciBvbiBjcmVhdGluZyB0aGUgbW9kZWwuXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBTb21lIGRhdGEgdG8gYXNzb2NpYXRlIHdpdGggdGhlIG1vZGVsXG4gKi9cbmZ1bmN0aW9uIGxvYWREaXJlY3REYXRhKGRhdGEpIHtcbiAgICBzZXQuY2FsbCh0aGlzLCBkYXRhKTtcbiAgICB0aGlzLmVtaXQoJ2xvYWQnLCB0aGlzKTtcbn1cblxuLyoqKioqKioqKioqKioqKioqKioqXG4gKiAgRGF0YSBBY2Nlc3NvcnMgICpcbiAqKioqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBSZXNvbHZlcyBhIHBhdGggYW5kIHJldHVybnMgcmVsZXZhbnQgZGF0YVxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggQSBwZXJpb2QtZGVsaW1pdGVkIHBhdGggdG8gc29tZSBkYXRhXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmUocGF0aCkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXM7XG5cbiAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuXG4gICAgZm9yICh2YXIgaT0wLCBsZW49cGF0aC5sZW5ndGg7IGk8bGVuOyBpKz0xKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVbcGF0aFtpXV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFNldHMgZGF0YSBvbiB0aGUgbW9kZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSAgICAgICAgIHBhdGggQW4gcGF0aCB0byBhIGxvY2F0aW9uIHdpdGhpbiB0aGUgZGF0YSBtb2RlbFxuICogQHBhcmFtIHtPYmplY3R8VmFyaWFudH0gZGF0YSBUaGUgbmV3IGRhdGFcbiAqL1xuZnVuY3Rpb24gc2V0KC8qIGFyZ3VtZW50cyAqLykge1xuICAgIHZhciBwYXRoLCBhZGRyLCBkYXRhLCB0YXJnZXQsIGtleTtcblxuICAgIC8vIEFkanVzdCBmb3IgYXJndW1lbnRzXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgcGF0aCA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgZGF0YSA9IGFyZ3VtZW50c1sxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkYXRhID0gYXJndW1lbnRzWzBdO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBwYXRoLXJlZmVyZW5jZWQgZGF0YSBjaGFuZ2VcbiAgICBpZiAocGF0aCkge1xuICAgICAgICBhZGRyICAgPSBwYXRoO1xuICAgICAgICBhZGRyICAgPSBhZGRyLnNwbGl0KCcuJyk7XG4gICAgICAgIGtleSAgICA9IGFkZHIucG9wKCk7XG4gICAgICAgIHRhcmdldCA9IHRoaXM7XG5cbiAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49YWRkci5sZW5ndGg7IGk8bGVuOyBpKz0xKSB7XG4gICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXRbYWRkcltpXV07XG4gICAgICAgIH1cblxuICAgICAgICB0YXJnZXRba2V5XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIGZ1bGwgZGF0YSBjaGFuZ2VcbiAgICBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaiBpbiBkYXRhKSB7XG4gICAgICAgICAgICB0aGlzW2pdID0gZGF0YVtqXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZW1pdCgnY2hhbmdlJywgdGhpcywgcGF0aCk7XG59XG5cbi8qKioqKioqKipcbiAqICBBUEkgICpcbiAqKioqKioqKiovXG5cbnZhciBhcGkgPSB7XG4gICAgY29uc3RydWN0IDogY29uc3RydWN0LFxuXG4gICAgc3RvcmVMb2NhbCAgIDogeyB2YWwgOiBzdG9yZUxvY2FsLCAgIHdydCA6IHRydWUsIGVubSA6IGZhbHNlLCBjZmcgOiBmYWxzZSB9LFxuICAgIHNyYyAgICAgICAgICA6IHsgdmFsIDogc3JjLCAgICAgICAgICB3cnQgOiB0cnVlLCBlbm0gOiBmYWxzZSwgY2ZnIDogZmFsc2UgfSxcbiAgICBwcmVmZXJPbmxpbmUgOiB7IHZhbCA6IHByZWZlck9ubGluZSwgd3J0IDogdHJ1ZSwgZW5tIDogZmFsc2UsIGNmZyA6IGZhbHNlIH0sXG5cbiAgICBzdG9yZSAgIDogc3RvcmUsXG4gICAgbG9hZCAgICA6IGxvYWQsXG4gICAgc2V0ICAgICA6IHNldCxcbiAgICBwcm9jZXNzIDogbnVsbCxcbiAgICByZXNvbHZlIDogcmVzb2x2ZVxufTtcblxuLyoqKioqKioqKioqKipcbiAqICBFeHBvcnRzICAqXG4gKioqKioqKioqKioqKi9cblxuYXNjb3QuTW9kZWwgPSBhc2NvdChbRXZlbnRFbWl0dGVyXSwgYXBpKTtcbm1vZHVsZS5leHBvcnRzID0gYXNjb3QuTW9kZWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2NvdCA9IHJlcXVpcmUoJy4vQXNjb3QuanMnKTtcbnJlcXVpcmUoJy4vRXZlbnRFbWl0dGVyLmpzJyk7XG5yZXF1aXJlKCcuL0RPTVZpZXcuanMnKTtcbnJlcXVpcmUoJy4vTW9kZWwuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBhc2NvdDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzY290ICAgICAgICA9IHJlcXVpcmUoJy4uL3NjcmlwdHMvaW5kZXguanMnKTtcbnZhciBhc3NlcnQgICAgICAgPSBjaGFpLmFzc2VydDtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBCYXNpYyBPYmplY3QgQ29uc3RydWN0aW9uICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuZGVzY3JpYmUoJ0FzY290JywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlc2NyaXB0b3JBID0ge1xuICAgICAgICBlbnVtZXJhYmxlICAgOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlLFxuICAgICAgICB3cml0YWJsZSAgICAgOiB0cnVlLFxuICAgICAgICB2YWx1ZSAgICAgICAgOiAnaGVsbG8nXG4gICAgfTtcblxuICAgIHZhciBkZXNjcmlwdG9yQiA9IHtcbiAgICAgICAgZW51bWVyYWJsZSAgIDogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlIDogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgICAgIHZhbHVlICAgICAgICA6IDVcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc3VidHJhY3Q1KHZhbCkgeyByZXR1cm4gdmFsIC0gNTsgfVxuICAgIGZ1bmN0aW9uIHJldHVyblZhbCh2YWwpIHsgcmV0dXJuIHZhbDsgfVxuICAgIGZ1bmN0aW9uIHN1YnRyYWN0Myh2YWwpIHsgcmV0dXJuIHZhbCAtIDM7IH1cbiAgICBmdW5jdGlvbiBzZXRQcm9wRSh2YWwpIHsgdGhpcy5wcm9wRSA9IHZhbDsgfVxuXG4gICAgdmFyIFNpbXBsZUNsYXNzID0gYXNjb3Qoe1xuICAgICAgICBwcm9wQSAgICAgOiAnaGVsbG8nLFxuICAgICAgICBwcm9wQiAgICAgOiB7IGVubSA6IHRydWUsIGNmZyA6IGZhbHNlLCB2YWwgOiA1LCB3cnQ6IHRydWUgfSxcbiAgICAgICAgcHJvcFggICAgIDogeyBlbm0gOiB0cnVlLCBjZmcgOiBmYWxzZSwgdmFsIDogMTAsIHdydDogdHJ1ZSB9LFxuICAgICAgICBfYWNjQSAgICAgOiA1LFxuICAgICAgICBhY2NBICAgICAgOiB7IGdldCA6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fYWNjQTsgfSB9LFxuICAgICAgICBmdW5jQSAgICAgOiBmdW5jdGlvbigpIHsgcmV0dXJuIDEzOyB9LFxuICAgICAgICBmdW5jQiAgICAgOiBmdW5jdGlvbih2YWwpIHsgdGhpcy5wcm9wRCA9IHZhbDsgfSxcbiAgICAgICAgY29uc3RydWN0IDogZnVuY3Rpb24odmFsKSB7IHRoaXMucHJvcEMgPSB2YWw7IH1cbiAgICB9KTtcblxuICAgIHZhciBNaXhlZENsYXNzQSA9IGFzY290KFtTaW1wbGVDbGFzc10sIHtcbiAgICAgICAgZnVuY0EgOiB7ICRjaGFpbiAgICA6IFtTaW1wbGVDbGFzcywgc3VidHJhY3Q1XSB9LFxuICAgICAgICBmdW5jQiA6IHsgJGl0ZXJhdGUgIDogW1NpbXBsZUNsYXNzLCByZXR1cm5WYWxdIH0sXG4gICAgICAgIHByb3BYIDogeyAkb3ZlcnJpZGUgOiA3IH1cbiAgICB9KTtcblxuICAgIHZhciBNaXhlZENsYXNzQiA9IGFzY290KFtNaXhlZENsYXNzQV0sIHtcbiAgICAgICAgZnVuY0EgOiB7ICRhZnRlciAgOiBzdWJ0cmFjdDMgfSxcbiAgICAgICAgZnVuY0IgOiB7ICRiZWZvcmUgOiBzZXRQcm9wRSB9LFxuICAgICAgICBhY2NBICA6IDQyXG4gICAgfSk7XG5cbiAgICB2YXIgc2ltcGxlTW9kdWxlID0gbmV3IFNpbXBsZUNsYXNzKDEwKTtcbiAgICB2YXIgbWl4ZWRNb2R1bGVBID0gbmV3IE1peGVkQ2xhc3NBKDExKTtcbiAgICB2YXIgbWl4ZWRNb2R1bGVCID0gbmV3IE1peGVkQ2xhc3NCKDEzKTtcblxuICAgIGRlc2NyaWJlKCdTaW1wbGUgY2xhc3MnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaXQoJ3Nob3VsZCBiZSBnaXZlbiBhIGRlZmF1bHQgZGVzY3JpcHRvciBpZiBvbmUgaXMgbm90IGdpdmVuJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKFNpbXBsZUNsYXNzLmRlc2NyaXB0b3IucHJvcEEsIGRlc2NyaXB0b3JBKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBleHBhbmQgc2hvcnRoYW5kIGRlc2NyaXB0b3JzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKFNpbXBsZUNsYXNzLmRlc2NyaXB0b3IucHJvcEIsIGRlc2NyaXB0b3JCKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjYWxsIHRoZSBjb25zdHJ1Y3RvcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChzaW1wbGVNb2R1bGUucHJvcEMsIDEwKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnTWl4ZWQgY2xhc3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGl0KCdzaG91bGQgYmUgZ2l2ZW4gYSBkZWZhdWx0IGRlc2NyaXB0b3IgaWYgb25lIGlzIG5vdCBnaXZlbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG1peGVkTW9kdWxlQSwgJ3Byb3BBJyksIGRlc2NyaXB0b3JBKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBleHBhbmQgc2hvcnRoYW5kIGRlc2NyaXB0b3JzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobWl4ZWRNb2R1bGVBLCAncHJvcEInKSwgZGVzY3JpcHRvckIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGwgdGhlIGNvbnN0cnVjdG9yJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1peGVkTW9kdWxlQS5wcm9wQywgMTEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIG92ZXJyaWRlIHdoZW4gdXNpbmcgdGhlICRvdmVycmlkZSBtb2RpZmllcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUEucHJvcFgsIDcpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGwgY2hhaW5lZCBtZXRob2RzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1peGVkTW9kdWxlQS5mdW5jQSgpLCA4KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjYWxsIGl0ZXJhdGVkIG1ldGhvZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVBLmZ1bmNCKDEyKSwgMTIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGluY2x1ZGUgdGhlIG9yaWdpbmFsIG1ldGhvZCBpbiB0aGUgaXRlcmF0b3InLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVBLnByb3BELCAxMik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgYXBwZW5kIGEgZnVuY3Rpb24gYWZ0ZXIgYSBjaGFpbiB3aGVuIHVzaW5nICRhZnRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtaXhlZE1vZHVsZUIuZnVuY0EoKSwgNSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcmV0dXJuIHRoZSBsYXN0IHZhbHVlIGZyb20gYW4gaXRlcmF0b3InLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVCLmZ1bmNCKDE0KSwgMTQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIHByZXBlbmQgYSBmdW5jdGlvbiB0byBhbiBpdGVyYXRvciB3aGVuIHVzaW5nICRiZWZvcmUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobWl4ZWRNb2R1bGVCLnByb3BFLCAxNCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgZXN0YWJsaXNoIHNldHRpbmcgb2YgYWNjZXNzZWQgcHJvcGVydHkgdmFsdWVzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1peGVkTW9kdWxlQi5fYWNjQSwgNDIpO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1peGVkTW9kdWxlQi5hY2NBLCA0Mik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG5cbmRlc2NyaWJlKCdFdmVudEVtaXR0ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVtaXR0ZXIgPSB0aGlzLmVtaXR0ZXIgPSBuZXcgYXNjb3QuRXZlbnRFbWl0dGVyKCk7XG4gICAgdmFyIGZ1bmNBID0gZnVuY3Rpb24odmFsKSB7IHRoaXMudmFsQSA9IHZhbDsgfS5iaW5kKGVtaXR0ZXIpO1xuICAgIHZhciBmdW5jQiA9IGZ1bmN0aW9uKHZhbCkgeyB0aGlzLnZhbEIgPSB2YWw7IH0uYmluZChlbWl0dGVyKTtcblxuICAgIGVtaXR0ZXIub24oJ3Rlc3QnLCBmdW5jQSk7XG4gICAgZW1pdHRlci5vbigndGVzdCcsIGZ1bmNCKTtcblxuICAgIGl0KCdzaG91bGQgZmlyZSBhbGwgcmVnaXN0ZXJlZCBsaXN0ZW5lcnMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgndGVzdCcsIDUpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoZW1pdHRlci52YWxBLCA1KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGVtaXR0ZXIudmFsQiwgNSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlbW92ZSBsaXN0ZW5lcnMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVtaXR0ZXIub2ZmKCd0ZXN0JywgZnVuY0IpO1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ3Rlc3QnLCA3KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGVtaXR0ZXIudmFsQSwgNyk7XG4gICAgICAgIGFzc2VydC5lcXVhbChlbWl0dGVyLnZhbEIsIDUpO1xuICAgIH0pO1xufSk7XG5cbmRlc2NyaWJlKCdET01WaWV3JywgZnVuY3Rpb24gKCkge1xuICAgIHZhciB2aWV3ID0gbmV3IGFzY290LkRPTVZpZXcoXG4gICAgICAgIHsgdGV4dCA6ICdIZWxsbywgV29ybGQhJyB9LFxuICAgICAgICBmdW5jdGlvbihkYXRhKSB7IHJldHVybiAnPGRpdiBjbGFzcz1cInRlc3RTZWxlY3RvclwiPicgKyBkYXRhLnRleHQgKyAnPC9kaXY+JzsgfVxuICAgICk7XG5cbiAgICB2YXIgY29tcGxleFZpZXcgPSBuZXcgYXNjb3QuRE9NVmlldyhcbiAgICAgICAgbnVsbCxcbiAgICAgICAgZnVuY3Rpb24oKSB7IHJldHVybiAnPGRpdj48ZGl2IGNsYXNzPVwidGVzdFNlbGVjdG9yXCI+SGVsbG8sIFdvcmxkITwvZGl2PjwvZGl2Pic7IH1cbiAgICApO1xuXG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgYW4gSFRNTCBlbGVtZW50JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBhc3NlcnQodmlldy5lbGVtZW50KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY29ycmVjdGx5IHVzZSBhIHRlbXBsYXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBhc3NlcnQuZXF1YWwodmlldy5lbGVtZW50LmlubmVySFRNTCwgJ0hlbGxvLCBXb3JsZCEnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmUtcmVuZGVyIHRoZSB2aWV3IG9uIGNoYW5naW5nIGRhdGEnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZpZXcuZGF0YSA9IHsgdGV4dCA6ICdIZWxsbywgTW9vbiEnIH07XG4gICAgICAgIGFzc2VydC5lcXVhbCh2aWV3LmVsZW1lbnQuaW5uZXJIVE1MLCAnSGVsbG8sIE1vb24hJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJ1biB1cGRhdGUoKSB3aGVuIGNoYW5naW5nIGRhdGEgaWYgYXZhaWxhYmxlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2aWV3LnVwZGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHsgdGhpcy5lbGVtZW50LmlubmVySFRNTCA9IGRhdGEudGV4dDsgfTtcbiAgICAgICAgdmlldy5kYXRhICAgPSB7IHRleHQgOiAnSGVsbG8sIFNreSEnIH07XG4gICAgICAgIGFzc2VydC5lcXVhbCh2aWV3LmVsZW1lbnQuaW5uZXJIVE1MLCAnSGVsbG8sIFNreSEnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVnaXN0ZXIgc2VsZWN0b3IgaGFuZGxlcyBwb2ludGluZyB0byBjaGlsZCBlbGVtZW50cycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29tcGxleFZpZXcuaGFuZGxlcyA9IHsgdGVzdCA6ICcudGVzdFNlbGVjdG9yJyB9O1xuICAgICAgICBhc3NlcnQuZXF1YWwoY29tcGxleFZpZXcudGVzdC5pbm5lckhUTUwsICdIZWxsbywgV29ybGQhJyk7XG4gICAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ01vZGVsJywgZnVuY3Rpb24oKSB7XG4gICAgbG9jYWxTdG9yYWdlLmNsZWFyKCk7XG4gICAgdmFyIHNhbXBsZURhdGFBID0ge1xuICAgICAgICAndmFsQScgOiA3LFxuICAgICAgICAndmFsQicgOiAxMyxcbiAgICAgICAgJ2dyb3VwQScgOiB7XG4gICAgICAgICAgICAndmFsQycgOiAxNyxcbiAgICAgICAgICAgICd2YWxCJyA6IDE5XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBtb2RlbCA9IG5ldyBhc2NvdC5Nb2RlbCgpO1xuICAgIHZhciBzYW1wbGVEYXRhQiA9IHtcbiAgICAgICAgJ3ZhbEEnIDogNVxuICAgIH07XG5cbiAgICBkZXNjcmliZSgnI2NvbnN0cnVjdCgpJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGl0KCdzaG91bGQgbG9hZCBkaXJlY3QgZGF0YSBwYXNzZWQgaW4gdG8gaXRzIGNvbnN0cnVjdG9yJywgZnVuY3Rpb24oZG9uZSl7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBuZXcgYXNjb3QuTW9kZWwoc2FtcGxlRGF0YUEpO1xuICAgICAgICAgICAgbW9kZWwub24oJ2xvYWQnLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGRhdGEuZ3JvdXBBLnZhbEMsIDE3KTtcbiAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnI2xvYWQoKScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpdCgnc2hvdWxkIGxvYWQgbmV3IGRhdGEgcmVtb3RlbHknLCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICAgICAgbW9kZWwubG9hZCgnc2FtcGxlLmpzb24nKTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5jbGVhcigpO1xuXG4gICAgICAgICAgICBtb2RlbC5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC52YWxBLCBzYW1wbGVEYXRhQS52YWxBKTtcbiAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ3JvdXBBLnZhbEMsIHNhbXBsZURhdGFBLmdyb3VwQS52YWxDKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBiZSBzZXJpYWxpemVkIHN1Y2ggdGhhdCBpdCBpcyBpZGVudGljYWwgdG8gdGhlIGxvYWRlZCBkYXRhJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKEpTT04uc3RyaW5naWZ5KG1vZGVsKSwgSlNPTi5zdHJpbmdpZnkoc2FtcGxlRGF0YUEpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBsb2FkIGV4aXN0aW5nIGRhdGEgbG9jYWxseScsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2VbJ3NhbXBsZS5qc29uJ10gPSBKU09OLnN0cmluZ2lmeShzYW1wbGVEYXRhQik7XG4gICAgICAgICAgICBtb2RlbC5sb2FkKCdzYW1wbGUuanNvbicpO1xuICAgICAgICAgICAgbW9kZWwub24oJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwudmFsQSwgNSk7XG4gICAgICAgICAgICAgICAgbW9kZWwucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgYWx3YXlzIGxvYWQgZGF0YSByZW1vdGVseSBpZiBwcmVmZXJPbmxpbmUgaXMgdHJ1ZScsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2VbJ3NhbXBsZS5qc29uJ10gPSBKU09OLnN0cmluZ2lmeShzYW1wbGVEYXRhQik7XG4gICAgICAgICAgICBtb2RlbC5wcmVmZXJPbmxpbmUgPSB0cnVlO1xuICAgICAgICAgICAgbW9kZWwubG9hZCgnc2FtcGxlLmpzb24nKTtcbiAgICAgICAgICAgIG1vZGVsLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLnZhbEEsIHNhbXBsZURhdGFBLnZhbEEpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnByZWZlck9ubGluZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIG5vdCBzdG9yZSBkYXRhIGxvY2FsbHkgaWYgc3RvcmVMb2NhbCBpcyBmYWxzZScsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICAgICAgICAgIG1vZGVsLnN0b3JlTG9jYWwgPSBmYWxzZTtcbiAgICAgICAgICAgIG1vZGVsLmxvYWQoJ3NhbXBsZS5qc29uJyk7XG4gICAgICAgICAgICBtb2RlbC5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGFzc2VydC5ub3RPayhsb2NhbFN0b3JhZ2VbJ3NhbXBsZS5qc29uJ10pO1xuICAgICAgICAgICAgICAgIG1vZGVsLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnN0b3JlTG9jYWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCcjcmVzb2x2ZSgpJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpdCgnc2hvdWxkIHJlc29sdmUgYSBwYXRoIHRvIHRoZSBjb3JyZWN0IHZhbHVlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBtb2RlbC5zZXQoeyBvYmpBIDogeyB2YWxBIDogOCB9fSk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwucmVzb2x2ZSgnb2JqQS52YWxBJyksIDgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCcjc2V0KCknLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCB0YWtlIGFuIG9iamVjdCBhcyBhIHBhcmFtZXRlciBhbmQgc2V0IG5ldyBkYXRhJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbW9kZWwuc2V0KHt2YWxEIDogMTd9KTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC52YWxELCAxNyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgdGFrZSBhIHBhdGggYW5kIGEgdmFsdWUgYW5kIGNoYW5nZSBhIHNwZWNpZmljIGVudHJ5JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbW9kZWwuc2V0KCdncm91cEEudmFsQycsIDIxKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5ncm91cEEudmFsQywgMjEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIHRyaWdnZXIgdGhlIG9uY2hhbmdlIGV2ZW50IHdoZW4gYSBjaGFuZ2UgaXMgbWFkZScsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICBtb2RlbC5vbignY2hhbmdlJywgZnVuY3Rpb24oZGF0YSwgcGF0aCkge1xuICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChkYXRhLCBtb2RlbCk7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHBhdGgsICdncm91cEEudmFsQycpO1xuICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbW9kZWwuc2V0KCdncm91cEEudmFsQycsIDIzKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ01vZGVsL1ZpZXcgQmluZGluZycsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmlldztcbiAgICB2YXIgbW9kZWwgPSBuZXcgYXNjb3QuTW9kZWwoKTtcbiAgICBmdW5jdGlvbiB0ZW1wbGF0ZShkYXRhKSB7XG4gICAgICAgIHJldHVybiAnPGRpdj4nICsgZGF0YS52YWxBICsgJzwvZGl2Pic7XG4gICAgfVxuXG4gICAgdmlldyAgPSBuZXcgYXNjb3QuRE9NVmlldyhtb2RlbCwgdGVtcGxhdGUpO1xuXG4gICAgaXQoJ3Nob3VsZCBwYXNzIG5ldyBkYXRhIGluIHRvIGl0cyB0ZW1wbGF0ZSB3aGVuIHRoZSBtb2RlbCBjaGFuZ2VzJywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgbW9kZWwubG9hZCgnc2FtcGxlLmpzb24nKTtcbiAgICAgICAgbW9kZWwub24oJ2xvYWQnLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodmlldy5lbGVtZW50LmlubmVySFRNTCwgNyk7XG4gICAgICAgICAgICBkYXRhLnNldCgndmFsQScsIDEzKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh2aWV3LmVsZW1lbnQuaW5uZXJIVE1MLCAxMyk7XG4gICAgICAgICAgICBtb2RlbC5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcbiJdfQ==
;