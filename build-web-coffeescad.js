{
    "baseUrl": "src/coffeescad",
    "paths": {
        "openscadCoffeeScadParser": "../../web-coffeescad",
        "lib": "../../lib"
    },
    "include": ["../../tools/almond", "openscadCoffeeScadParser"],
    "exclude": ["../../lib/underscore"],
    "out": "dist/web-built-coffeescad.js",
    "wrap": {
        "startFile": "tools/start-coffee.frag",
        "endFile": "tools/end-coffee.frag"
    }
}
