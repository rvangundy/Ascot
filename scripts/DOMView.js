(function(global, undefined) {
    'use strict';

    /**
     * Constructs the DOMView, establishing its data and template and performing
     * an initial rendering.
     * @param {Variant}  data     The data associated with this view
     * @param {Function} template An HTML templating function
     */
    function construct(data, template) {
        this._data    = data     || this._data;
        this.template = template || this.template;
        render.call(this);
    }

    /**
     * Renders the DOMView using the available template. On rendering, a new element is created,
     * and must be added to the DOM.
     */
    function render() {
        var div = document.createElement('div');

        div.innerHTML = this.template(this.data);
        this.element  = div.firstChild;
    }

    /*************
     *  Handles  *
     *************/

    /**
     * Establishes accessors to specific elements or sets of elements within this view.
     * Handles are set using a hash map that associates handles with DOM query selector strings.
     * @param {Object} handles A hash map of handles
     */
    function setHandles(handles) {
        var _handles = this._handles;

        for (var i in handles) {
            Object.defineProperty(this, i, {
                get          : getElementBySelector.bind(this, handles[i]),
                enumerable   : true,
                configurable : true
            });

            _handles[i] = handles[i];
        }
    }

    /**
     * Returns a set of current handles
     */
    function getHandles() {
        return this._handles;
    }

    /**
     * Gets a single element by query selector.  The element retrieved is relative
     * to this view's element.
     * @param {String} selector A query selector string  
     */
    function getElementBySelector(selector) {
        var el = this.element;

        return el.querySelector(selector);
    }

    /***************
     *  Accessors  *
     ***************/

    /**
     * Sets the view's data, updating the view accordingly
     * @param {Variant} data The data associated with the view
     */
    function setData(data) {
        var el     = this.element;
        var parent = el.parentNode;

        this._data = data;

        // Use update methods if available
        if (this.update) { this.update(data); }

        // Otherwise, re-render using a template and swap elements
        else if (this.template) {
            render.call(this);
            if (parent) { parent.replaceChild(this.element, el); }
        }
    }

    /**
     * Gets the current view's data property
     */
    function getData() {
        return this._data;
    }

    /*********
     *  API  *
     *********/

    global.ascot.DOMView = ascot(['EventEmitter'], {
        construct : { val : construct, wrt : false, enm : false, cfg : false },

        data     : { get : getData, set : setData, enm : true,  cfg : true  },
        _data    : { val : null,    wrt : true,    enm : false, cfg : false },
        element  : { val : null,    wrt : true,    enm : true,  cfg : false },
        template : { val : null,    wrt : true,    enm : true,  cfg : false },

        // Handles
        handles  : { get : getHandles, set : setHandles, enm : true,  cfg : true  },
        _handles : { val : {},         wrt : true,       enm : false, cfg : false },

        /* Override */
        update : { val : null, wrt : true, enm : false, cfg : false },
    });

})(this||window);
