(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define(['underscore'], factory);
    } else {
        // Browser globals
        root.openscadCoffeeScadParser = factory(root._);
    }
}(this, function (_) {
