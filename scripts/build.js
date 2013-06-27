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
