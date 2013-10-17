'use strict';

var ascot        = require('./Ascot.js');
var EventEmitter = require('./EventEmitter.js');

/**
 * Constructs the DOMView, establishing its data and template and performing
 * an initial rendering.
 * @param {Variant}  data     The data associated with this view
 * @param {Function} template An HTML templating function
 */
function construct(data, template) {
    this._data    = data     || this._data;
    this.template = template || this.template;
    this.handles  = this.handles;

    if (data) { bindViewToModel.call(this); }
    render.call(this, true);

    return this;
}

/**
 * Renders the DOMView using the available template. On rendering, a new element is created,
 * and must be added to the DOM.
 */
function render(ignoreError) {
    var innerHTML;
    var div = document.createElement('div');

    if (ignoreError) {
        try {
            innerHTML = this.template(this.data);
        } catch(e) {
            innerHTML = '<div></div>';
        }
    } else {
        innerHTML = this.template(this.data);
    }

    div.innerHTML = innerHTML;
    this._element = div.firstChild;
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
            set          : overrideHandle.bind(this, i),
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
 * Overrides an element handle with an instantiated view element
 * @param {String} handleName The name of the handle to override
 * @param {DOMView} view A view to replace a current element
 */
function overrideHandle (handleName, view) {
    var selector = this._handles[handleName];
    var element  = this.element.querySelector(selector);
    var parent   = element.parentNode;

    // If overriding with an element, just perform a simple replace child
    if (view.tagName && parent) {
        parent.replaceChild(view, element);
    }

    // If overriding with a view, replace with its element and remove the handle accessor
    else if (view.element) {
        parent.replaceChild(view.element, element);
        Object.defineProperty(this, handleName, {
            value        : view,
            writable     : true,
            configurable : true,
            enumerable   : true
        });
    }
}

/**
 * Gets a single element by query selector.  The element retrieved is relative
 * to this view's element.
 * @param {String} selector A query selector string
 */
function getElementBySelector(selector) {
    var el = this._element;

    return el.querySelector(selector);
}

/**********************
 *  DOM Manipulation  *
 **********************/

/**
 * Appends a child element to this view's element
 * @param {View} view A view to append to this view
 */
function appendChild(view) {
    this.element.appendChild(view.element);
}

/******************
 *  Data Binding  *
 ******************/

/**
 * Binds the view to its model. Whenever a model changes, it triggers a callback
 * that updates the view accordingly.
 */
function bindViewToModel() {
    var model    = this.data;
    var listener = this._modelBindListener = this._modelBindListener || updateView.bind(this);

    if (model.on) {
        model.on('load', listener);
        model.on('change', listener);
    }
}

/**
 * Unbinds the view from its current model by removing its event listeners
 */
function unbindViewFromModel() {
    var model    = this.data;
    var listener = this._modelBindListener;

    if (!listener) { return; }

    if (model.on) {
        model.off('load', listener);
        model.off('change', listener);
    }
}

/**
 * Updates the view, either by calling an update() method or triggering a
 * re-rendering of the template.
 * @param {Object} data The data used to update the view
 * @param {String} path A period-delimited path to the data being modified
 */
function updateView(data, path) {
    var parent;
    var el = this._element;

    if (!el) { return; }
    parent = el.parentNode;

    // Use update methods if available
    if (this.update) { this.update(data, path); }

    // Otherwise, re-render using a template and swap elements
    else if (this.template) {
        render.call(this);
        if (parent) { parent.replaceChild(this._element, el); }
    }
}

/***************
 *  Accessors  *
 ***************/

/**
 * Sets the view's data, updating the view accordingly
 * @param {Variant} data The data associated with the view
 */
function setData(data) {
    unbindViewFromModel.call(this);
    this._data = data;
    bindViewToModel.call(this);
    updateView.call(this, data);
}

/**
 * Gets the current view's data property
 */
function getData() {
    return this._data;
}

/**
 * Returns the view's top-level element
 */
function getElement() {
    return this._element;
}

/**
 * Returns the template associated with this view
 */
function getTemplate() {
    return this._template;
}

/**
 * Sets the template associated with this view
 * @param {Function} template A templating function
 */
function setTemplate(template) {
    this._template = template;
}

/*********
 *  API  *
 *********/

var api = {
    construct : { val : construct, wrt : false, enm : false, cfg : false },
    appendChild : { val : appendChild, wrt : true, enm : false, cfg : false },

    data      : { get : getData,    set : setData, enm : true,  cfg : true  },
    _data     : { val : null,       wrt : true,    enm : false, cfg : false },

    element   : { get : getElement,                enm : true,  cfg : false },
    _element  : { val : null,       wrt : true,    enm : false, cfg : false },

    template  : { get : getTemplate, set : setTemplate, enm : true, cfg : false },
    _template : { val : null,      wrt : true,    enm : false,  cfg : false },

    // Handles
    handles  : { get : getHandles, set : setHandles, enm : true,  cfg : true  },
    _handles : { val : {},         wrt : true,       enm : false, cfg : false },

    /* Override */
    update : { val : null, wrt : true, enm : false, cfg : false }
};

/*************
 *  Exports  *
 *************/

ascot.DOMView = ascot([EventEmitter], api);
module.exports = ascot.DOMView;
