Ascot
=====

Ascot is a framework and set of guidelines for creating and deploying webapp modules.  While not strictly dependent on AMD loading, it is greatly advantageous.  You can create a new module factory function like this:

```javascript
define([
    'Ascot',
    'hbars!personTemplate'
    /* any submodules  */
], 

function(ascot, template) {
    
    function initialize(element) {
        // Perform special init functionality
    }

    function shutdown(element) {
        // Perform special shutdown functionality
    }

    function update(data) {
        // Perform special update functionality
    }

    return ascot({
        template: template,
        initialize: initialize,
        shutdown: shutdown,
        update : update
    });
});
```

Where the "person" template could be a handlebars file such as:

```html
<div class="person person-philosopher">
    <li>Name : {{name}}</li>
    <li>Age : {{age}}</li>
</div>
```

You can then use this module factory function in the main app like so:

```javascript
define(['myModule'], function(myModule) {
    var someData = {
        name : "Plato",
        age  : 2441
    };

    myModule('.person', someData);
});

```

Which would convert the following document:

```html
<body>
    <div class="person"></div>
</body>
```

In to:

```html
<body>
    <div class="person person-philosopher">
        <li>Name : Plato</li>
        <li>Age : 2441</li>
    </div>
</body>
```

And will also attach local event handlers, custom methods, etc. and perform any initialize/shutdown/update methods accordingly.
