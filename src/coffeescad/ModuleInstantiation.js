define("ModuleInstantiation", ["Globals", "CoffeescadSolidFactorySingleton"], function(Globals, CoffeescadSolidFactorySingleton){

	function ModuleInstantiation() {
        this.name;
        this.argnames = [];
        this.argvalues = [];
        this.argexpr = [];
        this.children = [];
        this.isSubmodule = false;
        this.context;
    };

    ModuleInstantiation.prototype.evaluate = function(context) {
        console.log("instanciating module", context);
        var evaluatedModule;

        // NOTE: not sure how we should handle this in javascript ... is it necessary?
        //if (this.context === null) {
        //    console.log("WARNING: Ignoring recursive module instantiation of ", this.name);
        //} else {
            var that = this;

            this.argvalues = [];

            _.each(this.argexpr, function(expr,index,list) {
                that.argvalues.push(expr.evaluate(context));
            });

            that.context = context;

            evaluatedModule = context.evaluateModule(that, CoffeescadSolidFactorySingleton.getInstance());

            that.context = null;
            that.argvalues = [];

        //}
        return evaluatedModule;
    };

    ModuleInstantiation.prototype.evaluateChildren = function(context) {

        var childModules = []

        for (var i = 0; i < this.children.length; i++) {
            var childInst = this.children[i];
            
            var evaluatedChild = childInst.evaluate(context);
            if (evaluatedChild !== undefined){
                childModules.push(evaluatedChild);
            }
        };
        
        return childModules;
    };

	return ModuleInstantiation;
});
