(function(window, document) {
    /* global define */
    'use strict';

    // A set of default options to use on the module
    var defaultOptions = {};

    /**
     * The Ascot factory function
     * @param  {Object} desc An object describing a module's behavior
     * @return {Function}    A factory function that creates a module
     */
    var Ascot = function(desc) {

        /**
         * Applies the module to specified DOM elements
         * @param  {String|Element} selector A valid CSS selector or an element
         * @param  {Object|Array}   data     One or more data objects to bind
         * @return {Array}                   A list of all modules created
         */
        function applyModule(selector, data) {
            /* jshint validthis : true, camelcase : false */
            var el;
            var parent;
            var module;
            var modules  = [];
            var elements = document.querySelectorAll(selector);

            // Replace each element with a module
            for (var i = elements.length-1; i>=0; i-=1) {
                el     = elements[i];
                parent = el.parentNode;

                if (parent) {
                    // Associate each element/module with a new data set
                    if (isArray(data)) {
                        module = createModule(desc, data[i]);

                    // Associate each element/module with the same data set
                    } else {
                        module = createModule(desc, data);
                    }

                    // Replace element in DOM with new module element
                    module.element.id = el.id;
                    Object.defineProperty(module, '__previousElement__', {
                        value        : parent.replaceChild(module.element, el),
                        writable     : false,
                        configurable : true,
                        enumerable   : false
                    });

                    // Merge the classes
                    module.element.className = mergeClassLists(module.element.className, el.className);

                    // Add to the collection to be returned
                    modules.push(module);
                }
            }

            // Initialize all modules
            for (var j=0; j<modules.length; j+=1) {
                module = modules[j];
                if (module.initialize) { module.initialize(module.element); }
            }

            return modules;
        }

        /**
         * A factory function that creates a new module based on the passed
         * descriptor object
         * @private
         * @param  {Object} desc A descriptor object defining the module
         * @param  {Object} data Some data associated with the module
         * @return {Object}      The constructed module
         */
        function createModule(desc, data) {
            var element;

            // Require that a template be specified
            if (!desc.template) { throw new Error('No template provided.'); }

            // Defines the initial, non-configurable properties of the module
            var module = Object.create({}, {
                /* jshint camelcase: false */

                /**
                 * A templating function that is used to generate the module's
                 * DOM.  Run on application of module to a select DOM element,
                 * and is run in the absence of an established "update" method.
                 * @param {Object} data Data used to seed generation of DOM
                 * @type {Function}
                 */
                template : {
                    value        : desc.template,
                    writable     : false,
                    configurable : false,
                    enumerable   : false
                },

                /**
                 * Processes passed data and updates the module accordingly.
                 * @param {Object} data Updated data associated with this module
                 * @type {Function}
                 */
                update : {
                    value        : desc.update || desc.template,
                    writable     : false,
                    configurable : false,
                    enumerable   : false
                },

                /**
                 * Whenever the module is unloaded, a shutdown method may be run
                 * to perform additional shutdown steps.
                 * @type {Function}
                 */
                shutdown : {
                    value        : desc.shutdown,
                    writable     : false,
                    configurable : false,
                    enumerable   : false
                },

                /**
                 * An object containing various options used to alter the behavior
                 * of the module.
                 * @type {Object}
                 */
                options : {
                    configurable : false,
                    enumerable   : false,
                    get          : function() { return this.__options__; },
                    set          : function(options) {
                        // Merge options rather than replace entire object
                        for (var i in options) {
                            this.__options__[i] = options[i];
                        }
                    }
                },

                /**
                 * A clone of the DOM element prior to the application of a module
                 * @type {Element}
                 */
                __previousElement__ : {
                    value        : null,
                    writable     : false,
                    configurable : true,
                    enumerable   : false
                },

                /**
                 * All options related to this module
                 * @type {Object}
                 */
                __options__ : {
                    value        : Object.create(defaultOptions),
                    writable     : false,
                    configurable : false,
                    enumerable   : false
                }
            });

            // Establish user options
            if (desc.options) { module.options = desc.options; }

            // Create the element
            element = htmlStringToElement(module.template(data));

            /**
             * Destroys the module, removing it from memory.  Also destroys
             * any associated DOM elements.  Runs shutdown function if available.
             * @method destroy
             * @return {Object} This for chaining
             */
            function destroy() {
                /* jshint validthis : true */

                // Perform optional shutdown sequence
                if (this.shutdown) {
                    this.shutdown();
                }

                // Remove the element from the DOM
                if (this.element && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
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
                /* jshint validthis : true */
                var parent = this.element.parent;

                if (parent) {
                    parent.replaceChild(this.__previousElement__, this.element);
                }

                return this;
            }

            /************************
             *  Default module API  *
             ************************/

            Object.defineProperties(module, {
                /**
                 * @property {Element} element The generated HTML element associated with the module
                 */
                element : {
                    value        : element,
                    writable     : false,
                    enumerable   : false,
                    configurable : false
                },
                destroy : {
                    value        : destroy,
                    writable     : false,
                    enumerable   : false,
                    configurable : false
                },
                remove : {
                    value        : remove,
                    writable     : false,
                    enumerable   : false,
                    configurable : false
                }
            });

            // Returns the newly constructed module
            return module;
        }

        // The top-level Ascot function is the applyModule method
        return applyModule;
    };

    /***************
     *  Utilities  *
     ***************/

    /**
     * Performs the object prototype toString method
     * @private
     * @param  {Object} obj The object to cast to a string
     * @return {String}     A string representation of the object
     */
    function toString(obj) {
        return Object.prototype.toString.call(obj);
    }

    /**
     * Determines of the passed object is an array
     * @private
     * @param  {Object}  obj An object to check
     * @return {Boolean}     True if object is an array
     */
    function isArray(obj) {
        return toString(obj) === '[object Array]';
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

        return newList;
    }

    /**************************
     *  AMD or Global Access  *
     **************************/

    if (window.requirejs && window.define) {
        define(function() { return Ascot; });
    } else {
        window.Ascot = Ascot;
    }

})(window, document);
