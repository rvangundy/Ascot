(function(window, undefined) {
    'use strict';

    /**
     * Registers an event listener on the specified target
     * @param {String}   eventName The name of the event
     * @param {Function} cb        The new callback to handle the event 
     */
    function on(eventName, cb) {
        var callbacks = this.eventListeners[eventName] = this.eventListeners[eventName] || [];

        // Do nothing if a callback has already been added
        if (callbacks.indexOf(cb) >= 0) { return; }

        // Add the callback to the list of callbacks
        callbacks.push(cb);
    }

    /**
     * Registers an event listener on the specified target
     * @param {String}   eventName The name of the event
     * @param {Function} cb        The new callback to handle the event 
     */
    function off(eventName, cb) {
        var index;
        var callbacks = this.eventListeners[eventName] = this.eventListeners[eventName] || [];

        // Remove the callback from the list
        index = callbacks.indexOf(cb);

        if (index >= 0) { callbacks.splice(index, 1); }
    }

    /**
     * Emits the specified event, calling and passing the optional argument to all listeners
     * @param {String}  eventName The name of the event to emit
     * @param {Variant} arg       Any argument to pass to the event listeners 
     */
    function emit(eventName, arg) {
        var callbacks = this.eventListeners[eventName] = this.eventListeners[eventName] || [];

        for (var i=0, len=callbacks.length; i<len; i+=1) {
            callbacks[i].call(this, arg);
        }
    }

    /*********
     *  API  *
     *********/

    window.ascot.EventEmitter = ascot({
        on   : on,
        off  : off,
        emit : emit,

        eventListeners : { val : {}, wrt : true, enm : false, cfg : false }
    });

})(this||window);