(function(window, undefined) {
    'use strict';

    /**
     * The Ascot factory function.  Returns yet another factory function
     * that can be used to create specific instances of a module.
     * @param  {Object} desc An object describing a module's behavior
     * @return {Function}    A factory function that creates a module
     */
    var Ascot = function(desc) {
        return Ascot.createModule(desc);
    };

    window.Ascot = Ascot;

})(this||window);
;/* global Ascot */
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
        if (!element) { return this; }

        var newElement;
        var parent = element.parentNode;

        if (parent) {

            // Create the new element using the module's template
            this.__element__ = newElement = Ascot.htmlStringToElement(this.template(this.data));

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
        } else if (!newData) {
            return;
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
        else if (this.template) { this.element = this.template(data); }

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
            if (Ascot.isObject(newData[i])) {
                data[i] = Ascot.isObject(data[i]) ? data[i] : {};
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
            if (Ascot.isObject(data[i])) {
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
     * @return {Function}    A factory function used to create a module instance
     */
    Ascot.createModule = function(desc) {
        var copy, priv;
        var newDescriptor = Ascot.deepCopy(api);

        desc = desc || {};

        // Creates a single compiled descriptor
        for (var i in desc) {
            copy = Ascot.deepCopy(desc[i]);

            // Sets values for existing module API properties
            if (i in newDescriptor) {
                priv = '__' + i + '__';

                // Set the value of the property
                if ('value' in newDescriptor[i]) {
                    if (Ascot.isDescriptor(copy)) {
                        newDescriptor[i] = copy;
                    } else {
                        newDescriptor[i].value = copy;
                    }

                // Set the private alternative to the value
                } else if (priv in newDescriptor) {
                    if (Ascot.isDescriptor(copy)) {
                        newDescriptor[priv] = copy;
                    } else {
                        newDescriptor[priv].value = copy;
                    }
                }

            // Adds new properties to the API
            } else {
                if (Ascot.isDescriptor(copy)) {
                    newDescriptor[i] = Ascot.expandDescriptor(copy);
                } else {
                    newDescriptor[i] = Ascot.createDefaultDescriptor(copy);
                }
            }
        }

        return function(element, data, options) {
            var module = Object.create({}, newDescriptor);

            module.data    = data;
            module.options = options;
            module.element = element;

            return module;
        };
    };

    /******************
     *  API Settings  *
     ******************/

    var api = Ascot.expandDescriptor({

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

        /**
         * A list of all submodules under this module
         * @type {Array}
         */
        submodules : { val : [], wrt : true, cfg : false, enm : false },

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
            enm : false,
            cfg : false,
            get : function() { return this.__element__; },
            set : function(element) { attach.call(this, element); }
        },

        /**
         * An object containing various options used to alter the behavior
         * of the module.
         * @type {Object}
         */
        options : {
            enm : false,
            cfg : false,
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
;/* global Ascot */
(function(window, undefined){
    'use strict';

    /**
     * Runs the build, attaching it to a specified element
     * or amongst child elements by selector
     * @param  {Element|String}  element|selector An element to run a module build on
     * @param  {String} selector A selector used to determine elements
     * @return {Array}           An array of newly built modules
     */
    function runBuild(element, selector) {
        /* jshint validthis : true */
        var elements, module, sub;
        var modules = [];

        // Adjust parameters for selector-only arguments
        if (!selector) {
            selector = element;
            element  = document;
        }

        // Adjust for element-only arguments
        if (typeof selector === 'string') {
            elements = element.querySelectorAll(selector);
        } else {
            elements = [selector];
        }

        // Create modules and attach to each element
        for (var i=0; i<elements.length; i+=1) {
            element = elements[i];
            module = this.module(element, this.data, this.options);
            modules.push(module);

            // Build submodules
            if (this.submodules) {
                sub = this.submodules;

                for (var j in sub) {
                    module.submodules = module.submodules.concat(buildSubmodules(module.element, j, sub[j]));
                }
            }
        }

        return modules;
    }

    /**
     * Builds a submodule based on a particular build name and selector
     * @param  {Element} parent   The parent element under which to assign submodules
     * @param  {String}  selector A selector query string used to determine where to assign modules
     * @param  {String|Array} name The name or names of builds to use as submodules
     */
    function buildSubmodules(parent, selector, name) {
        /* jshint camelcase : false */
        var build;
        var subs = [];

        if (!Array.isArray(name)) { name = [name]; }

        for (var i=0; i<name.length; i+=1) {
            build = Ascot.__builds__[name[i]];
            subs = subs.concat(build(parent, selector));
        }

        return subs;
    }

    /**
     * Registers a build with the Ascot library
     * @param  {String} name     The name of the build
     * @param  {Object} settings Settings for this build
     * @return {Function}        A factory function that applies a build to elements
     */
    Ascot.registerBuild = function(name, settings) {
        /* jshint validthis : true, camelcase : false */
        var build = Object.create({}, api);

        build.variants = {};

        for (var i in settings) {
            // Copy settings over to build
            if (i in build) {
                build[i] = settings[i];

            // Copy variants
            } else {
                build.variants[i] = settings[i];
            }
        }

        this.__builds__[name] = runBuild.bind(build);

        return this.__builds__[name];
    };

    /**
     * A set of build functions that may be retrieved by name
     * @type {Object}
     */
    Object.defineProperty(Ascot, '__builds__', {
        value        : {},
        writable     : false,
        enumerable   : false,
        configurable : false
    });

    /**
     * A set of build functions that may be retrieved by name
     * @type {Object}
     */
    /* jshint camelcase : false */
    Object.defineProperty(Ascot, 'builds', {
        enumerable   : false,
        configurable : false,
        get : function() { return this.__builds__; }
    });

    /******************
     *  External API  *
     ******************/

    var api = Ascot.expandDescriptor({

        /**
         * A module factory function used to generate this build
         * @type {Function}
         */
        module : { val : null, wrt : true, enm : false, cfg : false },

        /**
         * The data reflected by this build
         * @type {Object}
         */
        data : { val : null, wrt : true, enm : false, cfg : false },

        /**
         * Any special options particular to this build
         * @type {Object}
         */
        options : { val : null, wrt : true, enm : false, cfg : false },

        /**
         * Submodules which should be instantiated as part of this build
         * @type {Object}
         */
        submodules : { val : null, wrt : true, enm : false, cfg : false },

        /**
         * Build variations which override module properties selectively
         * @type {Object}
         */
        variants : { val : null, wrt : true, enm : false, cfg : false }

    });

}(this||window));
