Ascot
=====

The Ascot library is a minimal client-side framework for defining class mixins. Additionally, it includes base model and view classes, as well as an event emitting class.

###Installation
It's recommended to install Ascot using Bower package management. Install with this command :

```
bower install https://github.com/rvangundy/Ascot.git --save
```

By default, Bower will install the package in to the /bower_components folder.

###Usage
Ascot may be used with or without AMD loading. To use without an AMD loader, include Ascot as follows:

```html
<script src="bower_components/ascot/ascot.js"></script>
```

##Class Mixins
Class mixins are an alternative to prototypal inheritance. Rather than force deep inheritance chains, mixins permit for shallow inheritance. This reduces dependencies in the inheritance chain while permitting for a high degree of code reuse. Consider the following prototypal inheritance chain:

```
YourView
|-- BaseView
    |-- EventEmitter
        |-- BaseClass
```

At some point it may be necessary to modify the functionality of the YourView class. Perhaps you wish to remove the EventEmitter functionality. This would require two steps, first removing the EventEmitter from the inheritance chain, then re-introducing the BaseClass.

To extend the functionality of YourView, you must inherit from YourView, modify YourView directly, or add functionality to an ancestor class.  In the first two cases, the new functionality is now dependent on YourView. In the last case, all Views will now inherit this functionality--which may not be universal enough to be considered "Base" functionality. In all cases, just adding some new functionality requires rethinking some aspect of the inheritance chain.

Consider an inheritance chain based on class mixins:

```
YourView
|-- BaseView
|-- EventEmitter
```

By flattening the inheritance chain, classes of functionality become more "swappable". Code is much easier to re-use as there are fewer dependencies. Additionally, a base class is often not necessary as there is less need for universal core functionality. Base functionality may be added as-needed at a later time, and only to classes which require it.

###Creating a basic class
Before mixing classes, it's necessary to create some stand-alone classes. As a best practice, it's recommended to place each class in its own file, using build automation and/or AMD loading to load class files in the correct order.

Consider a hypothetical "car" class:

```javascript
// Car.js

(function(window, undefined) {
    
    var color = null;
    
    function construct() {
        // Build the car
    }
    
    function start() {
        // Start the car
    }
    
    function pressBreaks() {
        // Press the breaks
    }
    
    var Car = ascot({
        construct   : construct,
        start       : start,
        pressBreaks : pressBreaks,
        color       : color
    });
    
    // Export to your application's global namespace
    YOUR_NAMESPACE.Car = Car;
    
})(this||window);
```

And an airplane class...

```javascript
// Airplane.js

(function(window, undefined) {
    
    function construct() {
        // Build the airplane
    }
    
    function start() {
        // Start the airplane's engine
    }
    
    function land() {
        // Land the airplane
    }
    
    var Airplane = ascot({
        construct : construct,
        start     : start,
        land      : land
    });
    
    // Export to your application's global namespace
    YOUR_NAMESPACE.Airplane = Airplane;
    
})(this||window);
```

The ascot function creates the Car and Airplane classes based on the passed API. Objects may be instantiated using the 'new' keyword. On instantiation, the construct() method is called.

```javascript
var car = new YOUR_NAMESPACE.Car();
```

###Creating a mixed class
Let's create a flying car.

```javascript
// FlyingCar.js

(function(window, undefined) {
    
    var Car      = YOUR_NAMESPACE.Car;
    var Airplane = YOUR_NAMESPACE.Airplane;

    function start() {
        // Special steps to start a flying car
    }
    
    function land() {
        // Overrides the landing functionality entirely
    }
    
    function convert() {
        // Convert between car mode and airplane mode
    }
    
    var FlyingCar = ascot([Car, Airplane], {
        construct : { $chain    : [Car, Airplane] },
        start     : { $iterate  : [Car, Airplane, start] },
        land      : { $override : land },
        convert   : convert
    });
    
    // Export to your application's global namespace
    YOUR_NAMESPACE.FlyingCar = FlyingCar;
    
})(this||window);
```

Notice the use of **mixin modifiers** in the ascot block. These specify how methods are overridden when mixing together two or more classes.

The **iterating modifiers**, $chain and $iterate, point to an array of implicit references to a class's method as well as explicit references to a specific function. Whenever the FlyingCar is constructed, it will call the construct() method for both the Car and the Airplane, passing the newly instantiated object as a parameter in to consecutive calls to construct (*note:* this depends on the design of the construct() method, if passing the object as an argument is intended). The $iterate modifier works much the same as $chain, except that it will not chain return values in to consecutive arguments. Rather, it will pass all arguments to consecutive calls, returning the return value of the last method called.

Whenever overriding an existing method that has already been defined in an ancestor class, an **override modifer** is necessary.  Ascot will throw an error if an override modifier has not been specified for an existing method. This prevents inadvertant overrides.

### Inheriting from a mixed class
It is often desired to create application-specific instances of mixed classes. When inheriting from a mixed class, the iterating and override modifiers may still be used. Additionally, **appending modifiers** may be used to further extend iterated methods. Lets create a specific model of flying car, a [ConvAirCar](http://i2.wp.com/upload.wikimedia.org/wikipedia/en/b/b5/ConvairCar_Model_118.jpg), that adds an additional step to the construct() and start() methods.

```javascript
// ConvAirCar.js

(function(window, undefined) {
    
    var FlyingCar = YOUR_NAMESPACE.FlyingCar;

    function construct() {
        // Additional construction steps for a ConvAirCar
    }

    function start() {
        // Additional steps for starting a ConvAirCar
    }
    
    var ConvAirCar = ascot([FlyingCar], {
        construct : { $after : construct },
        start     : { $before : start }
    });
    
    // Export to your application's global namespace
    YOUR_NAMESPACE.ConvAirCar = ConvAirCar;
    
})(this||window);
```

The ConvAirCar will inherit all methods from the FlyingCar.  Additionally, when constructed, it will run its own construct method *after* the Car and Airplane methods specified in the FlyingCar class. When started, it will run its own start method *before* the Car, Airplane, and FlyingCar start methods.

##Property Descriptors
The ascot definition block also allows for the use of [property descriptors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty). A property descriptor allows for methods and properties to be specified as either **data** or **accessor** properties. This is a handy feature when designing classes, allowing finer control over the behavior of properties. Ascot accepts shorthand versions of the lengthier property descriptors. Consider the following use of shorthand property descriptors when defining the ConvAirCar:

```javascript
var ConvAirCar = ascot([FlyingCar], {
    construct : { $after : construct, enm : false, wrt : false, cfg : true },
    start     : { $before : start, enm : true, wrt : true, cfg : false },
    altitude  : { get : getAltitude, set : setAltitude, enm : true, cfg : false }
});
```

Both the construct() and start() methods have been defined as data properties.  The construct method would not be enumerated or included in an Object.keys() call. It may also not be overwritten at run time without first being reconfigured using Object.defineProperty().  The start method is enumerable and writable, but may not be configured at run time. The new altitude property has been defined as an accessor property. When retrieving the .altitude property, it will return the value from a getAltitude method, and when set will pass the new value in to the setAltitude method.

#EventEmitter
Basic event emitter functionality is packaged with Ascot and was inspired by the node.js implementation of event emitters. Native Ascot mixin classes may be referenced as strings. When creating new objects, include the EventEmitter functionality as follows:

```javascript
var SomeClass = ascot(['EventEmitter'], {
    // Specify SomeClass API here
});
```

The EventEmitter API is as follows.

##Methods
###.on(event, listener)
Adds a new callback to the listeners array for the specified event. Use as follows:

```javascript
function handleUpdate(arg) {
    // Respond to the firing of onupdate
}

emitter.on('update', handleUpdate);
```

###.off(event, listener)
Removes a callback from the listeners array for the specified event. Use as follows:

```javascript
emitter.off('update', handleUpdate);
```

###.removeAllListeners(event)
Removes all listeners from the listeners array.  Use as follows:

```javascript
emitter.removeAllListeners('update');
```

###.emit(event, arg1, arg2, ..., argN)
Emits the specified event, passing the given arguments to all listeners.  Use as follows:

```javascript
emitter.emit('update', { someData : true });
```

#DOMView
The DOMView class provides the basis for creating HTML views for insertion in the DOM. A DOMView works by combining an HTML templating function, a reference to the data used for rendering the view, a method for providing special updating functionality when data changes, and handlers pointing to CSS selector-specified child elements. All views automatically include EventEmitter functionality.

Include DOMView functionality as follows:

```javascript
var SomeViewClass = ascot(['DOMView'], {
    // Specify SomeViewClass API here
});
```

The DOMView API is as follows:

##Properties
###.data
A JavaScript object specifying the data associated with the view. When rendering the view, data is passed directly in to the templating function. When this property is set, it will automatically be passed to the templating function or, if available, an update method.

###.element
The top-level HTML element associated with the view.

###.handles
A hash map of CSS selector handles to child elements. Consider a view with the following HTML structure:

```html
<div class="someView">
    <h1 class="someView-header"></h1>
    <p class="someView-paragraph"></p>
</div>
```

It is convenient to have a handle available for accessing the child elements of this view. Establish handles as follows:

```javascript
someView.handles = {
    header    : '.someView-header',
    paragraph : '.someView-paragraph'
};
```

Setting the handles automatically sets up accessor properties to these elements. *Note:* only the first element matching the specified CSS selector will be associated with the handle. These elements may then be accessed as follows:

```javascript
someView.header.innerHTML    = "A Shocking Headline";
someView.paragraph.innerHTML = "Lots of shocking news tidbits here...";
```

###.template
A templating function used to render the view. While part of the public API, it is used internally and should not be called like a method. It is advantageous to use an existing template library, such as Handlebars, for providing templating functionality.

##Methods
###.construct(data, template)
Constructs the DOMView, passing in a pointer to its data along with a templating function. These arguments may also be set after construction rather than passed as arguments. Additionally, these are often set internally to an inherited view within the ascot block. Instantiate a DOMView as follows:

```javascript
var someView = new ascot.DOMView();
```

###.update(data, updateInfo)
An update function that performs special rendering steps when the data property is changed. The base DOMView class does not implement an update function, but one may be established on child classes. If an update function is available, the template is not used when data is changed. This is useful for large templates or data sets where a full re-rendering may be costly, or if special functionality is desired when data is updated. It is not necessary to call update directly--just setting new data on the data property is sufficient. As will be seen, the update method is useful as a target when binding data to views.

The 
