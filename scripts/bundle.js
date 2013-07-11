/* global Ascot */
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
            module.initialize(element, this.settings.data, this.settings.options);
        }

        return module;
    }

    /**
     * A function that only returns its context.
     */
    function access() {
        /* jshint validthis : true */
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
        var isObject   = Ascot.utils.isObject;

        // Adjust for single argument
        if (name === Object(name)) {
            def  = name;
            name = false;
        }

        // If definition contains a bundle reference, do nothing--it is only a reference
        if (def.bundle) { return def; }

        // Sort submodule bundles from bundle properties
        for (var i in def) {

            // Copy properties over to bundle
            if (i in api) {
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
         * Settings to pass when constructing a module
         * @type {Object}
         */
        settings : { val : null, wrt : true, enm : true, cfg : false },

        /**
         * A controller to use when deploying a bundle
         * @type {Function}
         */
        controller : { val : null, wrt : true, enm : true, cfg : false },

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

        /*************
         *  Methods  *
         *************/

        deploy : { val : deploy, wrt : true, enm : true, cfg : false }

    });

}(this||window));
