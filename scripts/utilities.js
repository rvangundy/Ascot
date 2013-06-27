/* global Ascot */
(function(window, undefined) {
    'use strict';

    /*****************
     *  Descriptors  *
     *****************/

    /**
     * Determines if an object is a valid descriptor
     * @param  {Object}  obj A proposed descriptor
     * @return {Boolean}     True if obj is a descriptor
     */
    function isDescriptor(obj) {
        if (obj === Object(obj)) {
            if ('value' in obj ||
                'writable' in obj ||
                'configurable' in obj ||
                'enumerable' in obj ||
                'get' in obj ||
                'set' in obj ||
                'val' in obj ||
                'wrt' in obj ||
                'cfg' in obj ||
                'enm' in obj) {
                return true;
            }
        }

        return false;
    }

    /**
     * Expands the descriptor properties from their shorthand names
     * to the formal names.
     * @param  {Object} desc A descriptor object
     * @return {Object}      desc
     */
    function expandDescriptor(desc) {

        // Recursively expand until a descriptor is found
        if (!isDescriptor(desc)) {
            for (var i in desc) {
                desc[i] = expandDescriptor(desc[i]);
            }
        }

        if ('val' in desc) {
            desc.value = desc.val;
            delete desc.val;
        }

        if ('wrt' in desc) {
            desc.writable = desc.wrt;
            delete desc.wrt;
        }

        if ('cfg' in desc) {
            desc.configurable = desc.cfg;
            delete desc.cfg;
        }

        if ('enm' in desc) {
            desc.enumerable = desc.enm;
            delete desc.enm;
        }

        return desc;
    }

    /**
     * Creates a default descriptor corresponding to a value.  By default,
     * properties are set to non-enumerable.
     * @param  {Variant} value Any value
     * @return {Object}        A default descriptor
     */
    function createDefaultDescriptor(value) {
        return {
            value        : value,
            writable     : true,
            configurable : true,
            enumerable   : false
        };
    }

    /***********************
     *  Utility Functions  *
     ***********************/

    /**
     * Determines if the target is a function
     * @param  {Object} obj An object to test
     * @return {Boolean}    True if obj is a function
     */
    function isFunction(obj) {
        return Object.prototype.toString.call(obj) === '[object Function]';
    }

    /**
     * Determine if an object is an object
     * @param  {Object}  obj The object to check
     * @return {Boolean}     True if obj is an object
     */
    function isObject(obj) {
        return obj === Object(obj);
    }

    /**
     * Takes a string of HTML and converts it to an actual DOM element
     * @private
     * @param  {String} htmlString An HTML string with a single root element
     * @return {Element}           An HTML element
     */
    function htmlStringToElement(htmlString) {
        var div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.children[0];
    }

    /**
     * Performs a recursive copy of any data.  All data as
     * well as child data is returned by value rather than
     * by reference.
     * @param  {Variant} obj The data to copy
     * @return {Variant}     A new copy of the data
     */
    function deepCopy(obj) {
        var copy, i;

        // Copy a function
        if (isFunction(obj)) {
            copy = obj;

        // Recursively copy an array
        } else if (Array.isArray(obj)) {
            copy = [];
            for (i=0; i<obj.length; i+=1) {
                copy[i] = deepCopy(obj[i]);
            }

        // Recursively copy an object
        } else if (isObject(obj)) {
            copy = {};
            for (i in obj) {
                copy[i] = deepCopy(obj[i]);
            }

        // Copy all other types
        } else {
            copy = obj;
        }

        return copy;
    }

    Object.defineProperties(Ascot, {

        isDescriptor            : { value : isDescriptor },
        expandDescriptor        : { value : expandDescriptor },
        createDefaultDescriptor : { value : createDefaultDescriptor },
        isFunction              : { value : isFunction },
        isObject                : { value : isObject },
        htmlStringToElement     : { value : htmlStringToElement },
        deepCopy                : { value : deepCopy }

    });

}(this||window));
