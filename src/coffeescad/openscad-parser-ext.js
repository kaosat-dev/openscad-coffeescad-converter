define(["Module", "Context", "Globals", "FunctionDef", "openscad-parser-support"], function(Module, Context, Globals, FunctionDef, support){


    var currmodule = new Module("root");
        
    function resetModule() {
        currmodule = new Module("root");
        Globals.context_stack = [];
        Globals.module_stack = [];
    }

    function processModule(yy){
    	console.log("processing module",yy);
        var lines = [];
        //lines.push("function main(){");
        //lines.push("\n");
	//lines.push("result = (");	

        var context = undefined;
        if (yy.context !== undefined){
            context = yy.context;
        } else {
            context = new Context();
        }

        if (yy.importCache !== undefined){
            context.setVariable("importCache", yy.importCache);
        }

        var variables = []
        for (var vName in currmodule.assignments_var)
        {
            if(currmodule.assignments_var.hasOwnProperty(vName))
            {
            	var varValue = currmodule.assignments_var[vName].evaluate(context);
                var varData = vName + " = " + varValue;//currmodule.assignments_var[vName].const_value;
                variables.push( varData );
                lines.push( varData );
            }
        }
        lines.push("");
        
        
        var res = currmodule.evaluate(context);

        var evaluatedLines = _.flatten(res);
        if (evaluatedLines.length == 1){
            lines.push(evaluatedLines[0]);
        } else if (evaluatedLines.length > 1){
            //lines.push(_.first(evaluatedLines)+".union([");
        	//lines.push(_.first(evaluatedLines));
        	for (var i=0; i< evaluatedLines.length; i++)
            {
        		lines.push(evaluatedLines[i]);
            }
            //lines.push(_.rest(evaluatedLines,0));
            //lines.push("])");
        }
        //lines.push("};");
	//lines.push(")\n");
	//lines.push("assembly.add(result)")

        var x = {lines:lines, context:Globals.context_stack[Globals.context_stack.length-1]};
        resetModule();

        return x;
    }

    function stashModule(newName, newArgNames, newArgExpr){

        var p_currmodule = currmodule;
        Globals.module_stack.push(currmodule);
        
        currmodule = new Module(newName);
        p_currmodule.modules.push(currmodule);

        currmodule.argnames = newArgNames;
        currmodule.argexpr = newArgExpr;
    }

    function popModule(){
        if (Globals.module_stack.length > 0){
            currmodule = Globals.module_stack.pop();
        }
    }

    function addModuleChild(child){
        currmodule.children.push(child);
    }

    function addModuleAssignmentVar(name, value){
        currmodule.assignments_var[name] = value; 
    }

    function addModuleFunction(name, expr, argnames, argexpr){
        var func = new FunctionDef();
        func.argnames = argnames;
        func.argexpr = argexpr;
        func.expr = expr;
        currmodule.functions[name] = func;
    }


    return {
         processModule: processModule,
         stashModule: stashModule,
         popModule: popModule,
         addModuleChild: addModuleChild,
         addModuleAssignmentVar: addModuleAssignmentVar,
         addModuleFunction: addModuleFunction
    }
})
