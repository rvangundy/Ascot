(function(global, undefined) {
    'use strict';

    /****************
     *  Properties  *
     ****************/

    /**
     * Whether to store and retrieve this model from local storage
     * @type {Boolean}
     */
    var storeLocal = true;

    /**
     * The remote location of the data source for retrieval using XMLHttpRequest
     * @type {String}
     */
    var src = null;

    /**
     * Whether to always attempt updating from the online location rather than retreive
     * from localStorage
     * @type {Boolean}
     */
    var preferOnline = false;

    /******************
     *  Construction  *
     ******************/

    /**
     * Constructs the model, establishing and loading its data source
     * @param {String} src The data source associated with this model
     */
    function construct(src) {
        if (src) { this.load(src); }
    }

    /**********************************
     *  Loading, Storing, Retrieving  *
     **********************************/

    /**
     * Stores the model to local storage.  Stored as a key/value pair where
     * the key is the src of the data and the value is a JSON string.
     */
    function store() {
        localStorage[src] = JSON.stringify(this);
    }

    /**
     * Loads the data either from a server or from local storage depending on settings and
     * online status
     * @param {String} src Optionally specify the source of the data
     */
    function load(src) {
        this.src = src || this.src;

        if (localStorage[src] && !this.preferOnline) {
            setTimeout(loadLocalData.bind(this), 0);
        } else {
            loadRemoteData.call(this);
        }
    }

    /**
     * Parses a json string and merges data with this model
     * @param {String} json
     */
    function loadLocalData() {
        var localData = localStorage[this.src];

        if (localData) { parse.call(this, localData); }

        this.emit('load', this);
    }

    /**
     * Parses passed json data
     * @param {String} json A valid JSON string
     */
    function parse(json) {
        var data = JSON.parse(json);

        for (var i in data) { this[i] = data[i]; }
    }

    /**
     * Loads data from the server.  If the request fails, attempts loading data from localStorage.
     */
    function loadRemoteData() {
        var src = this.src;
        var xhr = new XMLHttpRequest();

        xhr.open('GET', src);
        xhr.onreadystatechange = handleXHRResponse.bind(this, xhr);
        xhr.send(null);
    }

    /**
     * Handles incoming XHR responses
     */
    function handleXHRResponse(xhr) {
        var type, text;

        // Request was successful
        if (xhr.readyState === 4 && xhr.status === 200) {
            type = xhr.getResponseHeader('Content-Type');

            // Make sure response is JSON
            if (type.indexOf('json') >= 0) {
                text = xhr.responseText;

                // Parse and load
                parse.call(this, text);

                // Store data locally
                if (this.storeLocal) { this.store(); }

                this.emit('load', this);
            }

        // Request failed, attempt loading locally instead
        } else if (xhr.readyState === 4 && xhr.status !== 200) {
            loadLocalData.call(this);
        }
    }

    /********************
     *  Data Accessors  *
     ********************/

    /**
     * Sets data on the model
     * @param {String}         address An address to a location within the data model
     * @param {Object|Variant} data    The new data
     */
    function set(/* arguments */) {
        var address, addr, data, target, key;

        // Adjust for arguments
        if (arguments.length === 2) {
            address = arguments[0];
            data    = arguments[1];
        } else {
            data = arguments[0];
        }

        // Handle addressed data change
        if (address) {
            addr   = address;
            addr   = addr.split('.');
            key    = addr.pop();
            target = this;

            for (var i=0, len=addr.length; i<len; i+=1) {
                target = target[addr[i]];
            }

            target[key] = data;
        }

        // Handle full data change
        else {
            for (var j in data) {
                this[j] = data[j];
            }
        }

        this.emit('change', { data : this, address : address });
    }

    /*********
     *  API  *
     *********/

    global.ascot.Model = ascot(['EventEmitter'], {
        construct : construct,

        storeLocal   : { val : storeLocal,   wrt : true, enm : false, cfg : false },
        src          : { val : src,          wrt : true, enm : false, cfg : false },
        preferOnline : { val : preferOnline, wrt : true, enm : false, cfg : false },

        store : store,
        load  : load,
        set   : set
    });

})(this||window);
