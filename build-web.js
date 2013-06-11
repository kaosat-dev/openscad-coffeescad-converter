{
    "baseUrl": "src/openjscad",
    "paths": {
        "openscadOpenJscadParser": "../../web-openjscad",
        "lib": "../../lib"
    },
    "include": ["../../tools/almond", "openscadOpenJscadParser"],
    "exclude": ["../../lib/underscore"],
    "out": "dist/web-built-openjscad.js",
    "wrap": {
        "startFile": "tools/start.frag",
        "endFile": "tools/end.frag"
    }
}
