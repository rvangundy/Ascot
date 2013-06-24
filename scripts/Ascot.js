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

    /**
     * Takes a string of HTML and converts it to an actual DOM element
     * @private
     * @param  {String} htmlString An HTML string with a single root element
     * @return {Element}           An HTML element
     */
    // function htmlStringToElement(htmlString) {
    //     var div = document.createElement('div');
    //     div.innerHTML = htmlString;
    //     return div.children[0];
    // }

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
