define("ModuleAdaptor", ["Globals", "Context"], function(Globals, Context){

    function ModuleAdaptor(){};

    ModuleAdaptor.prototype.evaluate = function(parentContext, inst){
        console.log("adapting module", inst);
        inst.isSubmodule = true;
        return parentContext.evaluateModule(inst);
    };

    return ModuleAdaptor;

});