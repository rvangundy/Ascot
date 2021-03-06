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
    } else if (Array.isArray(arguments[0])) {
        mixins     = arguments[0];
        descriptor = {};
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
            value : descriptor
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
