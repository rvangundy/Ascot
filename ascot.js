(function(window, undefined) {
    'use strict';

    /**
     * The Ascot factory function.  Returns yet another factory function
     * that can be used to create specific instances of a module.
     * @param  {Object} desc An object describing a module's behavior
     * @return {Function}    A factory function that creates a module
     */
    var Ascot = function(desc) {
        return Ascot.defineModule(desc);
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

    /********************
     *  Type Utilities  *
     ********************/

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

    /****************
     *  Templating  *
     ****************/

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
     * Applies a template to a target.  Creates a new element based on a template,
     * then merges it with the target element.  The newly created top-level element
     * is returned, although is excluded from being inserted in to the document.
     * @param  {Element}  target   A target element
     * @param  {Function} template A templating function
     * @param  {Object}   data     The data passed to the template function
     * @return {Element}           The top-level templated element
     */
    function applyTemplate(target, template, data) {
        var child, lastChild, className;
        var newElement = Ascot.utils.htmlStringToElement(template(data || undefined));

        removeChildren(target);

        // Copy classes from top-level templated element to target element
        className = Ascot.utils.mergeClassLists(newElement.className, target.className);
        if (className) { target.className = className; }

        // Move all child module elements in to target element
        for (var i=newElement.childNodes.length-1; i>=0; i-=1) {
            child     = newElement.removeChild(newElement.childNodes[i]);
            lastChild = target.insertBefore(child, lastChild || undefined);
        }

        return target;
    }

    /**
     * Removes all child elements from a target element
     * @param  {Element} element An HTML element
     * @return {Element}         element
     */
    function removeChildren(element) {
        for (var i=element.childNodes.length-1; i>=0; i-=1) {
            element.removeChild(element.childNodes[i]);
        }

        return element;
    }

    /**
     * Merges together two lists of classes in to a single class list
     * @param  {String} classListA A space-separated list of class names
     * @param  {String} classListB A space-separated list of class names
     * @return {String}            A merged list of class names
     */
    function mergeClassLists(classListA, classListB) {
        var newList, name;

        classListA = classListA.split(' ');
        classListB = classListB.split(' ');

        newList = [].concat(classListA);

        for (var i=0; i<classListB.length; i+=1) {
            name = classListB[i];

            if (newList.indexOf(name) < 0) {
                newList.push(name);
            }
        }

        newList = newList.join(' ').trim();

        return newList === '' ? undefined : newList;
    }

    /*************************
     *  Object Manipulation  *
     *************************/

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

    /**
     * Extends a target object with items from a new object
     * @param {Object}  target    The object to extend
     * @param {Object}  obj       The object with new items
     * @param {Boolean} overwrite If true, will overwrite existing properties on target
     * @return {Object}        target
     */
    function deepExtend(target, obj, overwrite) {
        var i;

        // Copy a function
        if (isFunction(obj)) {
            if (overwrite && target) { target = obj; }
            else if (target===undefined || target===null) { target = obj; }

        // Recursively copy an array
        } else if (Array.isArray(obj)) {
            target = target || [];
            for (i=0; i<obj.length; i+=1) {
                target[i] = deepExtend(target[i], obj[i], overwrite);
            }

        // Recursively copy an object
        } else if (isObject(obj)) {
            target = target || {};
            for (i in obj) {
                target[i] = deepExtend(target[i], obj[i], overwrite);
            }

        // Copy all other types
        } else {
            if (overwrite && target) { target = obj; }
            else if (target===undefined || target===null) { target = obj; }
        }

        return target;
    }

    /*******************
     *  URL Utilities  *
     *******************/

    /**
     * Retrieves parameters from the URL query string
     * @return {Object} An object containing all query parameters
     */
    function getQueryParameters() {
        var params,
            match,
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); },
            query  = window.location.search.substring(1);

        params = {};
        match = search.exec(query);
        while (match) {
            params[decode(match[1])] = decode(match[2]);
            match = search.exec(query);
        }

        return params;
    }

    /*********
     *  API  *
     *********/

    Ascot.utils = {};

    Object.defineProperties(Ascot.utils, {

        isDescriptor            : { value : isDescriptor },
        expandDescriptor        : { value : expandDescriptor },
        createDefaultDescriptor : { value : createDefaultDescriptor },
        isFunction              : { value : isFunction },
        isObject                : { value : isObject },
        htmlStringToElement     : { value : htmlStringToElement },
        applyTemplate           : { value : applyTemplate },
        removeChildren          : { value : removeChildren },
        deepCopy                : { value : deepCopy },
        deepExtend              : { value : deepExtend },
        getQueryParameters      : { value : getQueryParameters },
        mergeClassLists         : { value : mergeClassLists }

    });

}(this||window));
;/* global Ascot */
(function(window, undefined) {
    'use strict';

    /*****************
     *  API Methods  *
     *****************/

    /**
     * Applies the module to specified DOM element
     * @param  {Element} target An element on which to apply a module
     */
    function deploy(target) {
        var newElement;

        /* jshint validthis : true, camelcase : false */
        if (!target) { return this; }

        // Use a template to render a new element
        if (this.template) {
            newElement = Ascot.utils.applyTemplate(target, this.template, this.data);
            target.id  = this.id || newElement.id || target.id;

        // If no template, don't attempt to render a new element
        } else {
            target.id = this.id || target.id;
        }

        // Establish the element as a member of the module
        this._element = target;

        return this;
    }

    /**
     * Destroys the module.  Also removes any associated elements from
     * the document.  Runs shutdown function if available.
     * @method destroy
     * @return {Object} This for chaining
     */
    function destroy() {
        /* jshint validthis : true, camelcase : false */

        // Perform optional shutdown sequence
        if (this.shutdown) {
            this.shutdown(this._element);
        }

        // Remove the element from the DOM
        if (this._element && this._element.parentNode) {
            this._element.parentNode.removeChild(this._element);
        }

        return this;
    }

    /*******************
     *  Data Handling  *
     *******************/

    /**
     * Merges incoming data; fragments, strings, etc. in to the
     * module's data.  Calls either update or a templating function if available.
     * @param  {Object|String} newData Some new data or a fragment to merge
     * @return {Object}        data
     */
    function updateData(newData) {
        /* jshint validthis : true, camelcase : false */
        var firstItem;
        var data = this._data;

        // Convert a JSON string to an object
        if (typeof newData === 'string') {
            newData = JSON.parse(newData);
        } else if (!newData) {
            return;
        }

        // If data is an ID reference, set its data directly
        firstItem = Object.keys(newData)[0];
        if (firstItem && firstItem.indexOf('#') === 0) {
            setDataValue(this._data, firstItem, newData[firstItem]);

        // Merge data
        } else {
            mergeData(data, newData);
        }

        // Call custom update method
        if (this.update) { this.update(data); }
        else if (this.template) { Ascot.utils.applyTemplate(this.element, this.template, data); }

        return data;
    }

    /**
     * Recursively merges newData with data
     * @param {Object} data    Target data to merge in to
     * @param {Object} newData New data to merge
     * @return         data
     */
    function mergeData(data, newData) {
        var isObject = Ascot.utils.isObject;

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
        var isObject = Ascot.utils.isObject;

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

    /*********************
     *  Module Creation  *
     *********************/

    /**
     * Creates a module
     * @param {Object} settings Module settings
     * @param {Object} desc     A descriptor
     */
    function createModule(settings, desc) {
        if (!desc) { throw new Error('Descriptor not provided'); }

        var module = Object.create({}, desc);

        if (settings) {
            // TODO: Copy over all settings to module

            module._data    = settings.data;
            module.options  = settings.options;
            module.id       = settings.id;
            module.template = settings.template || module.template;

            // Setting the element auto-deploys, so do not attempt unless
            // an element is provided
            if (settings.element) {
                module.element = settings.element;
            }
        }

        return module;
    }

    /**
     * Defines a new module, which is a combination of the module
     * descriptor and the descriptor passed as a parameter to the
     * createModule method.
     * @param  {Object} desc A descriptor to use as the basis for the module
     * @return {Function}    A factory function used to create a module instance
     */
    Ascot.defineModule = function(desc) {
        var copy, priv;
        var deepCopy                = Ascot.utils.deepCopy;
        var isDescriptor            = Ascot.utils.isDescriptor;
        var expandDescriptor        = Ascot.utils.expandDescriptor;
        var createDefaultDescriptor = Ascot.utils.createDefaultDescriptor;
        var newDescriptor           = deepCopy(api);

        desc = desc || {};

        // Creates a single compiled descriptor
        for (var i in desc) {
            copy = deepCopy(desc[i]);

            // Sets values for existing module API properties
            if (i in newDescriptor) {
                priv = '_' + i;

                // Set the value of the property
                if ('value' in newDescriptor[i]) {
                    if (isDescriptor(copy)) {
                        newDescriptor[i] = copy;
                    } else {
                        newDescriptor[i].value = copy;
                    }

                // Set the private alternative to the value
                } else if (priv in newDescriptor) {
                    if (isDescriptor(copy)) {
                        newDescriptor[priv] = copy;
                    } else {
                        newDescriptor[priv].value = copy;
                    }
                }

            // Adds new properties to the API
            } else {
                if (isDescriptor(copy)) {
                    newDescriptor[i] = expandDescriptor(copy);
                } else {
                    newDescriptor[i] = createDefaultDescriptor(copy);
                }
            }
        }

        // Return a factory function for creating the module
        return function(settings) {
            return createModule(settings, newDescriptor);
        };
    };

    /******************
     *  API Settings  *
     ******************/

    var api = Ascot.utils.expandDescriptor({

        /* jshint camelcase: false */

        /********************
         *  API Properties  *
         ********************/

        /**
         * An ID that is copied over to a target element
         * @type {String}
         */
        id : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * The current element associated with the module
         * @type {Element}
         */
        _element : { val : null, wrt : true, cfg : false, enm : false },

        /**
         * The data associated with the module
         * @type {Element}
         */
        _data : { val : {}, wrt : true, cfg : false, enm : false },

        /**
         * All options related to this module
         * @type {Object}
         */
        _options : { val : {}, wrt : false, cfg : false, enm : false },

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
        template : { val : null, wrt : true, cfg : false, enm : true },

        /**
         * The initialize method is run immediately after the module is
         * added to the DOM
         * @param {Element} element The top-level DOM element associated with the module
         * @type {Function}
         */
        initialize : { val : null, wrt : false, cfg : false, enm : true },

        /**
         * Processes passed data and updates the module accordingly.
         * @param {Object} data Updated data associated with this module
         * @type {Function}
         */
        update : { val : null, wrt : false, cfg : false, enm : true },

        /**
         * Whenever the module is unloaded, a shutdown method may be run
         * to perform additional shutdown steps.
         * @type {Function}
         */
        shutdown : { val : null, wrt : false, cfg : false, enm : true },

        /*************
         *  Methods  *
         *************/

        destroy : { val : destroy, wrt : false, enm : true, cfg : false },

        /***************
         *  Accessors  *
         ***************/

        /**
         * @property {Element} element The generated HTML element associated with the module
         */
        element : {
            enm : true,
            cfg : false,
            get : function() { return this._element; },
            set : deploy
        },

        /**
         * An object containing various options used to alter the behavior
         * of the module.
         * @type {Object}
         */
        options : {
            enm : true,
            cfg : false,
            get : function() { return this._options; },
            set : function(options) {
                // Merge options rather than replace entire object
                for (var i in options) {
                    this._options[i] = options[i];
                }
            }
        },

        /**
         * The data associated with this module
         * @type {Object}
         */
        data : {
            enm : true,
            cfg : false,
            get : function() { return this._data; },
            set : updateData
        }
    });

}(this||window));
;/* global Ascot */
(function(window, undefined){
    'use strict';

    /**
     * Recursively deploys a module based on the bundle.  Recursively deploys all submodules.
     * The passed accessor function is recursively built out and passed to any controller function.
     * @param  {Element}  element  A parent element that determines the context within which to deploy
     * @param  {Function} accessor A tree of accessors that return modules in a module hierarchy
     * @return {Object}            The newly built module
     */
    function deploy(element, accessor, target) {
        /* jshint validthis : true */
        var module, mod, submodules, sub;

        // Allow for selector-based deployment
        if (typeof element === 'string') {
            target  = element;
            element = document;

        // If just passed an element only, deploy directly
        } else if (element.tagName && !accessor && !target) {
            target = element;
        }

        // Use either a passed target or a target specified by a CSS selector
        // in the bundle
        target = target || element.querySelector(this.target);
        if (typeof target === 'string') { target = element.querySelector(target); }
        if (!target) { throw new Error('No target specified for bundle definition'); }

        // Make sure a settings object exists
        this.settings = this.settings || {};

        // Deploy as a module
        if (this.module) {
            module = this.module(this.settings);
            module.element = target;

        // Deploy as a template
        } else if (this.settings.template) {
            module = Ascot.utils.applyTemplate(target, this.settings.template, this.settings.data);
        }

        // Create an accessor if one has not already been created
        accessor = accessor || access.bind(module);

        // Build submodules
        if (this.submodules) {
            submodules = this.submodules;

            for (var j in submodules) {
                sub = submodules[j];

                // Retrieve string-referenced bundles
                if (sub.bundle) {
                    mod = Ascot.bundles[sub.bundle].deploy(target, accessor, sub.target);

                // Deploy locally-defined bundles
                } else {
                    mod = sub.deploy(target, accessor, sub.target);
                }

                // Attach an accessor for the submodule
                accessor[j] = access.bind(mod);
            }
        }

        // Call the optional controller
        if (this.controller) {
            this.controller.call(module, accessor);
        }

        // Initialize the module
        if (module.initialize) {
            module.initialize(target, this.settings.data, this.settings.options);
        }

        return module;
    }

    /**
     * A function that only returns its context.
     * @param {Variant} query If accessing an array, specifies which item to return.  If accessing
     * a templated element or a module and a string is provided, performs a querySelector operation.
     * no index is specified, returns the object
     */
    function access(query) {
        /* jshint validthis : true */
        var el, elements;

        // Return a specified index from an array
        if (query !== undefined && Array.isArray(this)) {
            return this[query];

        // Query an element
        } else if (this.tagName) {
            el = this;
        } else {
            el = this.element;
        }

        // Return either a single element or an array of elements
        if (el && query) {
            elements = el.querySelectorAll(query);
            if (elements.length === 1) { return elements[0]; }
            else { return elements; }
        }

        return this;
    }

    /**
     * Registers a build with the Ascot library
     * @param  {String} name The name of the build
     * @param  {Object} def  A build definition object
     * @return {Function}    A factory function that applies a build to elements
     */
    function registerBundle(name, def) {
        /* jshint validthis : true, camelcase : false */
        var bundle     = Object.create({}, api);
        var submodules = bundle.submodules = {};
        var settings   = bundle.settings = {};
        var isObject   = Ascot.utils.isObject;
        var modSettings = ['data', 'options', 'template'];

        // Adjust for single argument
        if (name === Object(name)) {
            def  = name;
            name = false;
        }

        // If definition contains a bundle reference, do nothing--it is only a reference
        if (def.bundle) { return def; }

        // Sort submodule bundles from bundle/module properties
        for (var i in def) {

            // Copy settings
            if (modSettings.indexOf(i) >= 0) {
                settings[i] = def[i];
                delete def[i];

            // Retain bundle properties
            } else if (i in api) {
                bundle[i] = def[i];

            // Copy submodule bundles
            } else {
                submodules[i] = def[i];
                delete def[i];
            }
        }

        // Register submodule bundles that are not named references
        for (var j in submodules) {
            if (isObject(submodules[j])) {
                submodules[j] = registerBundle(submodules[j]);
            }
        }

        // Add to collection if a name is specified
        if (name) {
            Ascot._bundles[name] = bundle;
        }

        return bundle;
    }

    /*******************
     *  Ascot Exports  *
     *******************/

    // Make registerBundle a method of the Ascot library
    Object.defineProperty(Ascot, 'registerBundle', {
        value        : registerBundle,
        writable     : false,
        enumerable   : true,
        configurable : false
    });

    /**
     * A set of bundle functions that may be retrieved by name
     * @type {Object}
     */
    Object.defineProperty(Ascot, '_bundles', {
        value        : {},
        writable     : false,
        enumerable   : false,
        configurable : false
    });

    /**
     * A set of build functions that may be retrieved by name
     * @type {Object}
     */
    Object.defineProperty(Ascot, 'bundles', {
        enumerable   : true,
        configurable : false,
        get : function() { return this._bundles; }
    });

    /******************
     *  External API  *
     ******************/

    var api = Ascot.utils.expandDescriptor({

        /****************
         *  Properties  *
         ****************/

        /**
         * A module constructor
         * @type {Function}
         */
        module : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * A controller to use when deploying a bundle
         * @type {Function}
         */
        controller : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * Settings for a module
         * @type {Object}
         */
        settings : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * A templating function to use
         * @type {Function}
         */
        template : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * Data to pass to a module
         * @type {Variant}
         */
        data : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * Options to pass to a modiule
         * @type {Object}
         */
        options : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * A list of submodules associated with a bundle
         * @type {Object}
         */
        submodules : { val : null, wrt : true, enm : true, cfg : false},

        /**
         * A CSS selector that determines where modules should be deployed
         * @type {Object}
         */
        target : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * If set to false, array data will not be applied iteratively
         * @type {Boolean}
         */
        iterate : { val : true, wrt : true, enm : false, cfg : false },

        /*************
         *  Methods  *
         *************/

        deploy : { val : deploy, wrt : true, enm : true, cfg : false }

    });

}(this||window));
