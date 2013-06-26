(function(window, undefined) {
    'use strict';

    /*************************
     *  Globals & Constants  *
     *************************/

    /**
     * A collection of registered builds
     * @type {Object}
     */
    // var BUILDS = {};

    /**
     * The Ascot factory function
     * @param  {Object} desc An object describing a module's behavior
     * @return {Function}    A factory function that creates a module
     */
    var Ascot = function(desc) {
        return Ascot.createModule(desc);
    };

    /***************
     *  Utilities  *
     ***************/



    /*******************
     *  Ascot Methods  *
     *******************/

    /**
     * Bundles together a module, some data, and options.  This action
     * is performed recursively, such that the returned module has been
     * loaded and is ready to initialize.
     * @param  {Module} module  An Ascot module
     * @param  {Object} data    Some data associated with the module
     * @param  {Object} options An options object
     * @param  {Array}  path    The ID-path to the current module
     * @return {Module}         A bundled module
     */
    // function registerBuild(name, build) {
    //     BUILDS[name] = build;

    //     return build;
    // }

    /**
     * Builds a module on to the specified target.
     * @param  {Element} target The DOM element on which to build the module
     * @return {[type]}        [description]
     */
    // function run(target) {}

    /***************
     *  Ascot API  *
     ***************/

     // Ascot.bundle = function (app, data, options) {

     // }

    /**************************
     *  AMD or Global Access  *
     **************************/

    window.Ascot = Ascot;

})(this||window);
;/* global Ascot */
(function(window, undefined) {
    'use strict';

    /*****************
     *  API Methods  *
     *****************/

    /**
     * Destroys the module, removing it from memory.  Also destroys
     * any associated DOM elements.  Runs shutdown function if available.
     * @method destroy
     * @return {Object} This for chaining
     */
    function destroy() {
        /* jshint validthis : true, camelcase : false */

        // Perform optional shutdown sequence
        if (this.shutdown) {
            this.shutdown();
        }

        // Remove the element from the DOM
        if (this.__element__ && this.__element__.parentNode) {
            this.__element__.parentNode.removeChild(this.__element__);
        }

        return this;
    }

    /**
     * Removes a module from a DOM element, returning the element
     * to its original state prior to loading the module.
     * @method  remove
     * @return {Object} This for chaining
     */
    function remove() {
        /* jshint validthis : true, camelcase: false */
        var parent = this.__element__.parentNode;
        var element = this.__element__;
        var prev    = this.__previousElement__;

        if (parent) {
            parent.replaceChild(prev, element);
        }

        this.__element__         = prev;
        this.__previousElement__ = element;

        return this;
    }

    /**********************
     *  Element Handling  *
     **********************/

    /**
     * Applies the module to specified DOM element
     * @param  {Element} element An element on which to apply a module
     */
    function attach(element) {
        /* jshint validthis : true, camelcase : false */
        var newElement;
        var parent = element.parentNode;

        if (parent) {

            // Create the new element using the module's template
            this.__element__ = newElement = htmlStringToElement(this.template(this.data));

            // Replace element in DOM with new module element
            this.__previousElement__ = parent.replaceChild(newElement, element);

            // Merge IDs and classes
            newElement.id = element.id;
            newElement.className = mergeClassLists(newElement.className, element.className);

            // Initialize the module
            if (this.initialize) {
                this.initialize(newElement, newElement.data, newElement.options);
            }
        }

        return this;
    }

    /**
     * Merges together two lists of classes in to a single class list
     * @param  {String} classListA A space-separated list of class names
     * @param  {String} classListB A space-separated list of class names
     * @return {String}            A merged list of class names
     */
    function mergeClassLists(classListA, classListB) {
        var newList;
        var name;

        classListA = classListA.split(' ');
        classListB = classListB.split(' ');

        newList = [].concat(classListA);

        for (var i=0; i<classListB.length; i+=1) {
            name = classListB[i];

            if (newList.indexOf(name) < 0) {
                newList.push(name);
            }
        }

        return newList.join(' ').trim();
    }

    /*******************
     *  Data Handling  *
     *******************/

    /**
     * Merges incoming data; fragments, strings, etc. in to the
     * target data.
     * @param  {Object}        data    Target data to merge with
     * @param  {Object|String} newData Some new data or a fragment to merge
     * @return {Object}        data
     */
    function updateData(data, newData) {
        /* jshint validthis : true, camelcase : false */
        var firstItem;

        // Convert a JSON string to an object
        if (typeof newData === 'string') {
            newData = JSON.parse(newData);
        }

        // If data is an ID reference, set its data directly
        firstItem = Object.keys(newData)[0];
        if (firstItem && firstItem.indexOf('#') === 0) {
            setDataValue(this.__data__, firstItem, newData[firstItem]);

        // Merge data
        } else {
            mergeData(data, newData);
        }

        // Call custom update method
        if (this.update) { this.update(data); }

        return data;
    }

    /**
     * Recursively merges newData with data
     * @param {Object} data    Target data to merge in to
     * @param {Object} newData New data to merge
     * @return         data
     */
    function mergeData(data, newData) {
        for (var i in newData) {
            if (isObject(newData[i])) {
                data[i] = isObject(data[i]) ? data[i] : {};
                data[i] = mergeData(data[i], newData[i]);
            } else {
                data[i] = newData[i];
            }
        }

        return data;
    }

    /**
     * Sets a specific value on an addressed key/value pair inside a data structure
     * @param {Object}  data    The target data object on which to set a value
     * @param {String}  address An address to a specific key/value pair
     * @param {Variant} value   A new value
     */
    function setDataValue(data, address, value) {
        var target, id, key;

        // Resolve an address
        if (address.indexOf('#/') === 0) {
            address = address.split('/');
            address.shift();
            key = address.pop();
            target = resolveItem(data, address);

        // Resolve an ID address
        } else if (address.indexOf('#') === 0) {
            address = address.split('/');
            key = address.pop();
            id = address.shift().slice(1);
            target = getItemByID(data, id);
            target = resolveItem(target, address);

        // Perform a default resolve
        } else {
            address = address.split('/');
            key = address.pop();
            target = resolveItem(data, address);
        }

        target[key] = value;
    }

    /**
     * Resolves an item by address.
     * @param {Object}  data    A data object within which to resolve
     * @param {Array}   address An array of keys to the specified item
     * @return {Object}         The resolved item
     */
    function resolveItem(data, address) {
        var key = address.shift();

        for (var i in data) {
            if (i === key) {
                return resolveItem(data[i], address);
            }
        }

        return data;
    }

    /**
     * Searches through data and returns an object with a specified ID
     * @param {Object} data The data to query
     * @param {} [varname] [description]
     */
    function getItemByID(data, id) {
        var item;

        // Recursively attempt to find an item with the specified id
        for (var i in data) {
            if (isObject(data[i])) {
                if (data[i].id === id) { return data[i]; }
                item = getItemByID(data[i], id);
                if (item && item.id === id) { return item; }
            }
        }

        return false;
    }

    /********************
     *  Module Factory  *
     ********************/

    /**
     * Creates a new module, which is a combination of the module
     * descriptor and the descriptor passed as a parameter to the
     * createModule method.
     * @param  {Object} desc A descriptor to use as the basis for the module
     * @return {Module}      The new module
     */
    Ascot.createModule = function(desc) {
        var copy, module, prop;
        var newDescriptor = deepCopy(api);

        desc = desc || {};

        // Creates a single compiled descriptor
        for (var i in desc) {
            prop = (i === 'data') ? '__data__' : i;

            copy = deepCopy(desc[prop]);

            // Sets values for existing module API properties
            if (prop in newDescriptor) {
                if ('value' in newDescriptor[prop]) {
                    if (isDescriptor(copy)) {
                        newDescriptor[prop] = copy;
                    } else {
                        newDescriptor[prop].value = copy;
                    }
                }

            // Adds new properties to the API
            } else {
                if (isDescriptor(copy)) {
                    newDescriptor[prop] = expandDescriptor(copy);
                } else {
                    newDescriptor[prop] = createDefaultDescriptor(copy);
                }
            }
        }

        // Creates the module
        module = Object.create({}, newDescriptor);

        // Sets options on the module
        if (desc.options) { module.options = desc.options; }

        return module;
    };

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

        // Recursively copy an object
        } else if (isObject(obj)) {
            copy = {};
            for (i in obj) {
                copy[i] = deepCopy(obj[i]);
            }

        // Recursively copy an array
        } else if (Array.isArray(obj)) {
            copy = [];
            for (i=0; i<obj.length; i+=1) {
                copy[i] = deepCopy(obj[i]);
            }

        // Copy all other types
        } else {
            copy = obj;
        }

        return copy;
    }

    /******************
     *  API Settings  *
     ******************/

    var api = expandDescriptor({

        /* jshint camelcase: false */

        /*************************
         *  Method Placeholders  *
         *************************/

        /**
         * A templating function that is used to generate the module's
         * DOM.  Run on application of module to a select DOM element,
         * and is run in the absence of an established "update" method.
         * @param {Object} data Data used to seed generation of DOM
         * @type {Function}
         */
        template : { val : null, wrt : true, cfg : false, enm : false },

        /**
         * The initialize method is run immediately after the module is
         * added to the DOM
         * @param {Element} element The top-level DOM element associated with the module
         * @type {Function}
         */
        initialize : { val : null, wrt : false, cfg : false, enm : false },

        /**
         * Processes passed data and updates the module accordingly.
         * @param {Object} data Updated data associated with this module
         * @type {Function}
         */
        update : { val : null, wrt : false, cfg : false, enm : false },

        /**
         * Whenever the module is unloaded, a shutdown method may be run
         * to perform additional shutdown steps.
         * @type {Function}
         */
        shutdown : { val : null, wrt : false, cfg : false, enm : false },

        /*************
         *  Methods  *
         *************/

        destroy : { val : destroy, wrt : false, enm : false, cfg : false },
        remove  : { val : remove,  wrt : false, enm : false, cfg : false },

        /***************
         *  Accessors  *
         ***************/

        /**
         * @property {Element} element The generated HTML element associated with the module
         */
        element : {
            cfg : false,
            enm : false,
            get : function() { return this.__element__; },
            set : function(element) { attach.call(this, element); }
        },

        /**
         * An object containing various options used to alter the behavior
         * of the module.
         * @type {Object}
         */
        options : {
            cfg : false,
            enm : false,
            get : function() { return this.__options__; },
            set : function(options) {
                // Merge options rather than replace entire object
                for (var i in options) {
                    this.__options__[i] = options[i];
                }
            }
        },

        /**
         * The data associated with this module
         * @type {Object}
         */
        data : {
            cfg : false,
            enm : false,
            get : function() { return this.__data__; },
            set : function(data) { updateData.call(this, this.__data__, data); }
        },

        /********************
         *  API Properties  *
         ********************/

        /**
         * The current element associated with the module
         * @type {Element}
         */
        __element__ : { val : null, wrt : true, cfg : false, enm : false },

        /**
         * The data associated with the module
         * @type {Element}
         */
        __data__ : { val : {}, wrt : true, cfg : false, enm : false },

        /**
         * A clone of the DOM element prior to the application of a module
         * @type {Element}
         */
        __previousElement__ : { val : null, wrt : true, cfg : false, enm : false },

        /**
         * All options related to this module
         * @type {Object}
         */
        __options__ : { val : {}, wrt : false, cfg : false, enm : false }

    });

}(this||window));
