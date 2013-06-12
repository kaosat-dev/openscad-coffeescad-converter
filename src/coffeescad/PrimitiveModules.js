define("PrimitiveModules", ["Globals", "Context"], function(Globals, Context){

	function PrimitiveModule(){};

    function Sphere(a){
      PrimitiveModule.call(this, a);
    };

    Sphere.prototype.evaluate = function(parentContext, inst){
        var context = new Context(parentContext);

        var argnames = ["r", "$fn"];
        var argexpr = [];

        context.args(argnames, argexpr, inst.argnames, inst.argvalues);
        
        var r = Context.contextVariableLookup(context, "r", 1);

        var resolution = Context.get_fragments_from_r(r, context);

        var coffeescadParameters = {center:[0,0,0], resolution:resolution, radius:r};
        
        return _.template('new Sphere({center: [<%=String(center)%>], r: <%= radius %>, $fn: <%= resolution%>})', coffeescadParameters);
    }

    function Cylinder(a){
      PrimitiveModule.call(this, a);
    };

    Cylinder.prototype.evaluate = function(parentContext, inst) {

        var context = new Context(parentContext);

        var argnames = ["h", "r1", "r2", "center", "$fn", "$fa", "$fs"];
        var argexpr = [];

        context.args(argnames, argexpr, inst.argnames, inst.argvalues);

        var coffeescadArgs = {start: [0,0,0], end: [0,0,1], radiusStart: 1, radiusEnd: 1, resolution: Globals.DEFAULT_RESOLUTION};
        var isCentered = Context.contextVariableLookup(context, "center", false);
        var height = Context.contextVariableLookup(context, "h", 1);
        var r = Context.contextVariableLookup(context, "r", 1);
        var r1 = Context.contextVariableLookup(context, "r1", undefined);
        var r2 = Context.contextVariableLookup(context, "r2", undefined);
                    
        /* we have to check the context vars directly here in case a parent module in the context stack has the same parameters, e.g. r1 which would be used as default.
           Example testcad case:
                module ring(r1, r2, h) {
                    cylinder(r = 3, h = h);
                }
                ring(8, 6, 10);
        */

        if (_.has(context.vars, 'r')) {
            coffeescadArgs.radiusStart = r;
            coffeescadArgs.radiusEnd = r;
        }
        if (_.has(context.vars, 'r1')) {
            coffeescadArgs.radiusStart = r1;
        }
        if (_.has(context.vars, 'r2')) {
            coffeescadArgs.radiusEnd = r2;
        }
        coffeescadArgs.resolution = Context.contextVariableLookup(context, "$fn", 16);
        
        if (coffeescadArgs.radiusStart == 0 && coffeescadArgs.radiusEnd == 0){
            return undefined;
        }
        coffeescadArgs.height = height;
    
    var centerVector = (typeof height == 'string' || height instanceof String)? [0,0,height+"/2"] : [0,0,height/2];
	coffeescadArgs.center = isCentered? [0,0,0] : centerVector;
	
	return _.template('new Cylinder({h: <%=height%>,r1: <%=radiusStart%>, r2: <%=radiusEnd%>, center: [<%=center%>], $fn: <%=resolution%>})', coffeescadArgs);
		
    };


    function Cube(a){
      PrimitiveModule.call(this, a);
    };

    Cube.prototype.evaluate = function(parentContext, inst) {
        var context = Context.newContext(parentContext, ["size", "center"], [], inst);

        var coffeescadArgs = {resolution:Globals.DEFAULT_RESOLUTION};
        var isCentered = Context.contextVariableLookup(context, "center", false);
        var size = Context.contextVariableLookup(context, "size", 1);
        
        if (size instanceof Array){
            coffeescadArgs.size = [size[0], size[1], size[2]];
        } else {
            coffeescadArgs.radius = [size,size,size];
        }

        if (isCentered){
            coffeescadArgs.centerVector = [0,0,0];
        } else {
            var sizeElems = []
            
            for (var i=0; i<size.length; i++)
            {
                var elem = (typeof size[i] == 'string' || size[i] instanceof String)? size[i]+"/2" : size[i]/2;
                sizeElems.push( elem );
            }
            
            coffeescadArgs.centerVector = [sizeElems[0],sizeElems[1],sizeElems[2]];
        }

        return _.template('new Cube({center: [<%=String(centerVector)%>],size: [<%= size %>], $fn: <%= resolution%>})', coffeescadArgs);
    };


    function Circle(a){
        PrimitiveModule.call(this, a);
    };

    Circle.prototype.evaluate = function(parentContext, inst){
        var context = Context.newContext(parentContext, ["r", "$fn"], [], inst);

        var r = Context.contextVariableLookup(context, "r", 1);
        var resolution = Context.get_fragments_from_r(r, context);
        
        return _.template('circle({center: [0,0], r: <%=r%>, $fn: <%=resolution%>})', {r:r,resolution:resolution});
        
    };


    function Square(a){
        PrimitiveModule.call(this, a);
    };

    Square.prototype.evaluate = function(parentContext, inst){
        var context = Context.newContext(parentContext, ["size", "center"], [], inst);

        var size = Context.contextVariableLookup(context, "size", [0.5,0.5]);
        var center = Context.contextVariableLookup(context, "center", false);
        var radius = _.isArray(size)? radius = [size[0]/2,size[1]/2] : [size/2,size/2];
        var centerPoint = [0,0];
        if (!center){
            centerPoint = [size[0]/2, size[1]/2]
        }

        return _.template('rectangle({center: [<%=centerPoint%>], r: [<%=radius%>]})', {centerPoint:centerPoint, radius:radius});
    };

    function Polygon(a){
        PrimitiveModule.call(this, a);
    };

    Polygon.prototype.evaluate = function(parentContext, inst){
        var context = Context.newContext(parentContext, ["points", "paths", "convexity"], [], inst);

        var points = Context.contextVariableLookup(context, "points", []);
        var paths = Context.contextVariableLookup(context, "paths", []);
        var pointsMap = [];

        function formatPoints (points){
            return _.map(points, function(x){return _.template("[<%=x%>]", {x:x})});
        }

        if (_.isEmpty(paths)){
            return _.template('CAGBase.fromPoints([<%=points%>])', {points:formatPoints(points)});
        }

        if (paths.length > 1){
            var lines = "";

            _.each(_.first(paths), function(x) {
                pointsMap.push(points[x]);
            });
            lines += _.template('(new Path2D([<%=points%>],true)).innerToCAG().subtract([', {points:formatPoints(pointsMap)});
            
            var holes = [];
            
            _.each(_.rest(paths), function(shape) {
                pointsMap = [];
                _.each(shape, function(x) {
                    pointsMap.push(points[x]);
                });
                holes.push(_.template('(new Path2D([<%=points%>],true)).innerToCAG()', {points:formatPoints(pointsMap)}));   
            });

            lines += holes.join(',') + "])";

            return lines;

        } else {
            _.each(paths[0], function(x) {
                pointsMap.push(points[x]);
            });
            return _.template('(new Path2D([<%=points%>],true)).innerToCAG()', {points:formatPoints(pointsMap)});
        }   
    };

    function Polyhedron(a){
        PrimitiveModule.call(this, a);
    };

    Polyhedron.prototype.evaluate = function(parentContext, inst){
        var context = Context.newContext(parentContext, ["points", "triangles", "convexity"], [], inst);

        var points = Context.contextVariableLookup(context, "points", []);
        var triangles = Context.contextVariableLookup(context, "triangles", []);
        
        var polygons=[];

        _.each(triangles, function(triangle) {
            polygons.push(
                _.template("new Polygon([new CSG.Vertex(new CSG.Vector3D([<%=vec1%>])),new CSG.Vertex(new CSG.Vector3D([<%=vec2%>])),new CSG.Vertex(new CSG.Vector3D([<%=vec3%>]))])", 
                    {vec1:points[triangle[2]],
                    vec2:points[triangle[1]],
                    vec3:points[triangle[0]]}));
        });

        return _.template("CSGBase.fromPolygons([<%=polygons%>])", {polygons:polygons});   
    };



    return {
    	Sphere: Sphere,
    	Cube: Cube,
    	Cylinder: Cylinder,
    	Circle: Circle,
    	Square: Square,
    	Polygon: Polygon,
    	Polyhedron: Polyhedron
    }

});
