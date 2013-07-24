/* global Ascot */
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
