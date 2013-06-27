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
