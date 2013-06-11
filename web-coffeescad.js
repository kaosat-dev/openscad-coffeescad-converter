define(function(require){

    var parser = require("openscad-parser");
    var Globals = require("Globals");
    var support = require("openscad-parser-support");

    return {

        parser: parser,
        
        parse: function(text){
            if (parser.yy === undefined){
                parser.yy = {}
            }

            var openSCADText = Globals.preParse(text);

            var coffeeScadResult = parser.parse(openSCADText);

            return coffeeScadResult.lines.join('\n');
        }
    }
});
