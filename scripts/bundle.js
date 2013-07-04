/* global Ascot */
(function(window, undefined){
    'use strict';

    /**
     * Runs the build, attaching it to a specified element
     * or amongst child elements by selector
     * @param  {Element|String}  element|selector An element to run a module build on
     * @param  {String} selector A selector used to determine elements
     * @return {Array}           An array of newly built modules
     */
    function deployBundle(element, selector) {
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

            // Deploy as a module
            if (this.module) {
                module  = this.module(element, this.data, this.options);
                modules.push(module);

            // Deploy as a template
            } else if (this.template) {
                deployTemplate(element, this.template, this.data);
            }

            // Build submodules
            if (this.submodules) {
                sub = this.submodules;

                for (var j in sub) {
                    module.submodules = module.submodules.concat(deploySubmodules(module.element, j, sub[j]));
                }
            }
        }

        // Initialize all modules
        for (var k=0; k<modules.length; k+=1) {
            if (modules[k].initialize) {
                modules[k].initialize(modules[k].element, this.data, this.options);
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
    function deploySubmodules(parent, selector, name) {
        /* jshint camelcase : false, loopfunc : true */
        var bundle, elements;
        var subs = [];

        if (!Array.isArray(name)) { name = [name]; }

        // Get specified elements from parent
        elements = parent.querySelectorAll(selector);

        // Deploy submodules to each element
        for (var i=0; i<elements.length; i+=1) {
            if (!name[i]) { break; }

            // Deploy template-based submodule
            if (Ascot.isObject(name[i])) {
                bundle = (function(template, data) {
                    return function(element) {
                        return deployTemplate(element, template, data);
                    };
                }(name[i].template, name[i].data));

            // Deploy a bundle-referenced submodule
            } else if (typeof name[i] === 'string') {
                bundle = Ascot.__bundles__[name[i]];

            // Do nothing for invalid items
            } else {
                continue;
            }

            subs = subs.concat(bundle(elements[i]));
        }

        return subs;
    }

    /**
     * Deploys a template on to target.  Usually used in the absence of a module.
     * @param  {Element}  element   The element to replace with the template
     * @param  {Function} tempalate A templating function
     * @param  {Object}   data      Data used to populate the template
     * @return {Element}            The new element
     */
    function deployTemplate(element, template, data) {
        var parent     = element.parentNode;
        var newElement = Ascot.htmlStringToElement(template(data || {}));

        parent.replaceChild(newElement, element);

        newElement.id = element.id || newElement.id;
        newElement.className = Ascot.mergeClassLists(newElement.className, element.className);

        return newElement;
    }

    /**
     * Registers a build with the Ascot library
     * @param  {String} name     The name of the build
     * @param  {Object} settings Settings for this build
     * @return {Function}        A factory function that applies a build to elements
     */
    Ascot.registerBundle = function(name, settings) {
        /* jshint validthis : true, camelcase : false */
        var variants = {};
        var build = Object.create({}, api);

        // Sort settings from variants
        for (var i in settings) {
            // Copy settings over to build
            if (i in build) {
                build[i] = settings[i];

            // Copy variants
            } else {
                variants[i] = settings[i];
                delete settings[i];
            }
        }

        // Register variants
        for (var j in variants) {
            if (Ascot.isObject(variants[j])) {
                Ascot.deepExtend(variants[j], settings);
                Ascot.registerBundle(name + ':' + j, variants[j]);
            }
        }

        this.__bundles__[name] = deployBundle.bind(build);

        return this.__bundles__[name];
    };

    /**
     * A set of bundle functions that may be retrieved by name
     * @type {Object}
     */
    Object.defineProperty(Ascot, '__bundles__', {
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
    Object.defineProperty(Ascot, 'bundles', {
        enumerable   : false,
        configurable : false,
        get : function() { return this.__bundles__; }
    });

    /******************
     *  External API  *
     ******************/

    var api = Ascot.expandDescriptor({

        /**
         * A module factory function used to generate this build
         * @type {Function}
         */
        module : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * The data reflected by this build
         * @type {Object}
         */
        data : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * Any special options particular to this build
         * @type {Object}
         */
        options : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * Submodules which should be instantiated as part of this build
         * @type {Object}
         */
        submodules : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * A template to use; normally specified within the module
         * @type {Function}
         */
        template : { val : null, wrt : true, enm : true, cfg : false }

    });

}(this||window));
