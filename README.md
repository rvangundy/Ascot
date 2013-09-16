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
        pressBreaks : pressBreaks
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
    
    var FlyingCar = ascot({
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

The **iterating modifiers**, $chain and $iterate, point to an array of implicit references to a class's method as well as explicit references to a specific function. Whenever the FlyingCar is constructed, it will call the construct() method for both the Car and the Airplane, passing the newly instantiated object as a parameter in to consecutive calls to construct (*note*: this depends on the design of the construct() method, if passing the object as an argument is intended). The $iterate modifier works much the same as $chain, except that it will not chain return values in to consecutive arguments. Rather, it will pass all arguments to consecutive calls, returning the return value of the last method called.

Whenever overriding an existing method that has already been defined in an ancestor class, an **override modifer** is necessary.  Ascot will throw an error if an override modifier has not been specified for an existing method. This prevents inadvertant overrides.
