!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.scriptsindexjs=e():"undefined"!=typeof global?global.scriptsindexjs=e():"undefined"!=typeof self&&(self.scriptsindexjs=e())}(function(){var define,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"UI2WPJ":[function(require,module,exports){
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
},{"./Ascot.js":"UI2WPJ","./DOMView.js":"GirLh0","./EventEmitter.js":"BvhrnU","./Model.js":"FFRxKb"}]},{},[9])
(9)
});
;