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
            
            var atRootContext = false;
            try
            {
            	if(inst.context.parentContext.parentContext === undefined)
            	{
            		atRootContext=true;
            	}
            }
            catch(err){}
            
            
            if (atRootContext)
            {
            	lines.push("assembly.add(new "+ this.name+"())")
            }
            else
            {
            	//lines.push("@union(new "+ this.name+"())")
            	lines.push("new "+this.name+"()");
            }
            //lines.push(this.name);
            
        }

        context.inst_p = inst;
        context.functions_p = this.functions;
        context.modules_p = this.modules;
        _.each(this.assignments_var, function(value, key, list) {
            context.setVariable(key, value.evaluate(context));
        });
        
        //FIXME
        var specialModule = false;
        var args = {};
        
        var makeInstanceVars = function(raw)
        {
        	//make sure we reference the local (instance variable)
        	keys = Object.keys(args);
        	for (var i=0; i<keys.length;i++)
        	{
        		var varName = keys[i];
        		re = new RegExp(varName, "g");
        		try
        		{
        			raw = raw.replace(re, "@"+varName);
        		}
        		catch(err)
        		  {}
        		
        	}
        	return raw
        };
        
        
        
        if (this.name !== "root" && inst === undefined)
        {
        	specialModule = true;
        	context.rootLevel=true;
        	
        	for (var i=0; i<this.argnames.length;i++)
        	{	
        		if ( this.argexpr[i] !== undefined)
        		{
        			argVal = this.argexpr[i].evaluate(context);
        		}
        		else
        		{
        			argVal = 0;
        		}
    			argName = this.argnames[i];
    			args[argName] = argVal;
        		
        	}
        	
            ln1 = "class " + this.name + " extends Part"
            ln2 = "  constructor:(options)->"
            ln3 = "    @defaults = " + JSON.stringify(args);
            ln4 = "    options = @injectOptions(@defaults,options)"
            ln5 = "    super(options)"
            	
            lines.push(ln1)
            lines.push(ln2)
            lines.push(ln3)
            lines.push(ln4)
            lines.push(ln5)
            
            _.each(this.assignments_var, function(value, key, list) {
            	var realValue = value.evaluate(context);
            	realValue = makeInstanceVars(realValue);
            	lines.push("    "+ key + " = "+ realValue);
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

        var evaluatedLines = [];//ModuleInstantiation
        if ( inst === undefined)
        {
	        _.each(nonControlChildren, function(child, index, list) {
	            var evaluatedChild = child.evaluate(context)
	            if (specialModule)
	            {
	            	evaluatedChild = "    @union("+evaluatedChild+")";
	            	evaluatedChild = makeInstanceVars(evaluatedChild);
	            }
	            if (evaluatedChild == undefined || (_.isArray(evaluatedChild) && _.isEmpty(evaluatedChild))){
	                // ignore
	            } else {
	                evaluatedLines.push(evaluatedChild);
	            }
	        });
        }

        var cleanedLines = _.compact(evaluatedLines);
        if (cleanedLines.length == 1){
            lines.push(cleanedLines[0]);
        } else if (cleanedLines.length > 1){
        	if (!specialModule)
        	{
        		//for (var i=0;i<cleanedLines.length;i++)
        		//lines.push(_.first(cleanedLines)+".union([" +_.rest(cleanedLines)+"])");
        		
        		_.each(cleanedLines, function(value, key, list) {
        			lines.push("@union("+value+")");
                });
        		
        	}
        	else
        	{
        		_.each(cleanedLines, function(value, key, list) {
                	lines.push(makeInstanceVars(value));
                });
        		
        	}
            
        }
        
        lines.push("")
        return lines;
    };

	return Module;
});
