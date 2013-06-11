define("CoffeescadSolidFactorySingleton", ["CoffeescadSolidFactory"], function(CoffeescadSolidFactory){
    var factory = new CoffeescadSolidFactory();
	
	return {
        getInstance: function(){ 
            return factory; 
        }
    }
});
