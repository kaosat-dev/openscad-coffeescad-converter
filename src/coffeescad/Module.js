define("Module", ["Context", "Globals"], function(Context, Globals){

    function Module(name) {
        this.name = name;
        this.children = [];
        this.assignments_var = {};
        this.functions = {};
        this.modules = [];
        this.argnames = [];
        this.argexpr = [];
    };

    Module.prototype.evaluate = function(parentContext, inst) {
	console.log("evalueating module",parentContext, inst);
        var lines = [];

        var context = new Context(parentContext);

        if (parentContext === undefined){
            context.setVariable("$fn", Globals.DEFAULT_RESOLUTION);
            context.setVariable("$fs", 2.0);
            context.setVariable("$fa", 12.0);
        }

        if (inst !== undefined) {
            context.args(this.argnames, this.argexpr, inst.argnames, inst.argvalues);
            context.setVariable("$children", inst.children.length);
        }

        context.inst_p = inst;
        context.functions_p = this.functions;
        context.modules_p = this.modules;
        _.each(this.assignments_var, function(value, key, list) {
            context.setVariable(key, value.evaluate(context));
        });
        
        //FIXME
        var specialModule = false;
        if (this.name !== "root")
        {
        	specialModule = true;
            ln1 = "class " + this.name + " extends Part"
            ln2 = "  constructor:()->"
            ln3 = "    super()"
            lines.push(ln1)
            lines.push(ln2)
            lines.push(ln3)
            
            _.each(this.assignments_var, function(value, key, list) {
            	lines.push("    "+ key + " = "+ value.evaluate(context));
            });
            
        }
        
        var someResult = []
        _.each(context.modules_p, function(child, index, list) {
            var tmpRes = child.evaluate(context);
            lines.push(tmpRes);
        });
        
       
        

        var controlChildren = _.filter(this.children, function(child){ 
            return child && child.name == "echo"; 
        });

        _.each(controlChildren, function(child, index, list) {
            child.evaluate(context);
        });

        var nonControlChildren = _.reject(this.children, function(child){ 
            return !child || child.name == "echo"; 
        });

        var evaluatedLines = [];
        _.each(nonControlChildren, function(child, index, list) {
            var evaluatedChild = child.evaluate(context)
            if (specialModule)
            {
            	evaluatedChild = "    @union("+evaluatedChild+")"
            }
            if (evaluatedChild == undefined || (_.isArray(evaluatedChild) && _.isEmpty(evaluatedChild))){
                // ignore
            } else {
                evaluatedLines.push(evaluatedChild);
            }
        });

        var cleanedLines = _.compact(evaluatedLines);
        if (cleanedLines.length == 1){
            lines.push(cleanedLines[0]);
        } else if (cleanedLines.length > 1){
        	if (!specialModule)
        	{
        		lines.push(_.first(cleanedLines)+".union([" +_.rest(cleanedLines)+"])");
        	}
        	else
        	{
        		_.each(cleanedLines, function(value, key, list) {
                	lines.push(value);
                });
        		
        	}
            
        }
        
        lines.push("")
        return lines;
    };

	return Module;
});
