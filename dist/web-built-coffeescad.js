(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define(['underscore'], factory);
    } else {
        // Browser globals
        root.openscadCoffeeScadParser = factory(root._);
    }
}(this, function (_) {

/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../../tools/almond", function(){});

define("Globals", [], function(){

    var singleLineModuleRegex = /(module\s*\w*\([^\)]*\)[\w\n]*)([^{};]*);/gm;
    var singleLineModuleReplacement = "$1 {$2;};"; 
    var multiLineCommentRegex = /((?:\/\*(?:[^*]|(?:\*+[^*\/]))*\*+\/)|(?:\/\/.*))/gm;  
	
	function stripString (s) {
        if (/^\".*\"$/.test(s)){
            return s.match(/^\"(.*)\"$/)[1];
        } else {
            return s;
        }
    }

    function convertForStrFunction(val){
        if (_.isString(val)){
            return stripString(val);
        }

        if (_.isArray(val)){
            var mapped = _.map(val, function (value, key, list) {
                return convertForStrFunction(value);
            });

            return "["+mapped.join(',')+"]";
        }

        return val;
    }

    function preParse(text){
        return text.replace(multiLineCommentRegex, '').replace(singleLineModuleRegex, singleLineModuleReplacement);
    }

    return {
        DEFAULT_RESOLUTION: 16,
        DEFAULT_2D_RESOLUTION: 16,
        FN_DEFAULT: 16,
        FS_DEFAULT: 2.0,
        FA_DEFAULT: 12.0,
        module_stack: [],
        context_stack: [],
        stripString: stripString,
        convertForStrFunction: convertForStrFunction,
        preParse: preParse,
        importedObjectRegex: /import\([^\"]*\"([^\)]*)\"[,]?.*\);?/gm,
        usedLibraryRegex: /use <([^>]*)>;?/gm,
        includedLibraryRegex: /include <([^>]*)>;?/gm
    }
});

// seedrandom.js version 2.0.
// Author: David Bau 4/2/2011
//
// Defines a method Math.seedrandom() that, when called, substitutes
// an explicitly seeded RC4-based algorithm for Math.random().  Also
// supports automatic seeding from local or network sources of entropy.
//
// Usage:
//
//   <script src=http://davidbau.com/encode/seedrandom-min.js></script>
//
//   Math.seedrandom('yipee'); Sets Math.random to a function that is
//                             initialized using the given explicit seed.
//
//   Math.seedrandom();        Sets Math.random to a function that is
//                             seeded using the current time, dom state,
//                             and other accumulated local entropy.
//                             The generated seed string is returned.
//
//   Math.seedrandom('yowza', true);
//                             Seeds using the given explicit seed mixed
//                             together with accumulated entropy.
//
//   <script src="http://bit.ly/srandom-512"></script>
//                             Seeds using physical random bits downloaded
//                             from random.org.
//
//   <script src="https://jsonlib.appspot.com/urandom?callback=Math.seedrandom">
//   </script>                 Seeds using urandom bits from call.jsonlib.com,
//                             which is faster than random.org.
//
// Examples:
//
//   Math.seedrandom("hello");            // Use "hello" as the seed.
//   document.write(Math.random());       // Always 0.5463663768140734
//   document.write(Math.random());       // Always 0.43973793770592234
//   var rng1 = Math.random;              // Remember the current prng.
//
//   var autoseed = Math.seedrandom();    // New prng with an automatic seed.
//   document.write(Math.random());       // Pretty much unpredictable.
//
//   Math.random = rng1;                  // Continue "hello" prng sequence.
//   document.write(Math.random());       // Always 0.554769432473455
//
//   Math.seedrandom(autoseed);           // Restart at the previous seed.
//   document.write(Math.random());       // Repeat the 'unpredictable' value.
//
// Notes:
//
// Each time seedrandom('arg') is called, entropy from the passed seed
// is accumulated in a pool to help generate future seeds for the
// zero-argument form of Math.seedrandom, so entropy can be injected over
// time by calling seedrandom with explicit data repeatedly.
//
// On speed - This javascript implementation of Math.random() is about
// 3-10x slower than the built-in Math.random() because it is not native
// code, but this is typically fast enough anyway.  Seeding is more expensive,
// especially if you use auto-seeding.  Some details (timings on Chrome 4):
//
// Our Math.random()            - avg less than 0.002 milliseconds per call
// seedrandom('explicit')       - avg less than 0.5 milliseconds per call
// seedrandom('explicit', true) - avg less than 2 milliseconds per call
// seedrandom()                 - avg about 38 milliseconds per call
//
// LICENSE (BSD):
//
// Copyright 2010 David Bau, all rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
// 
//   1. Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//
//   2. Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
// 
//   3. Neither the name of this module nor the names of its contributors may
//      be used to endorse or promote products derived from this software
//      without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
/**
 * All code is in an anonymous closure to keep the global namespace clean.
 *
 * @param {number=} overflow 
 * @param {number=} startdenom
 */
(function (pool, math, width, chunks, significance, overflow, startdenom) {


//
// seedrandom()
// This is the seedrandom function described above.
//
math['seedrandom'] = function seedrandom(seed, use_entropy) {
  var key = [];
  var arc4;

  // Flatten the seed string or build one from local entropy if needed.
  seed = mixkey(flatten(
    use_entropy ? [seed, pool] :
    arguments.length ? seed :
    [new Date().getTime(), pool, window], 3), key);

  // Use the seed to initialize an ARC4 generator.
  arc4 = new ARC4(key);

  // Mix the randomness into accumulated entropy.
  mixkey(arc4.S, pool);

  // Override Math.random

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.

  math['random'] = function random() {  // Closure to return a random double:
    var n = arc4.g(chunks);             // Start with a numerator n < 2 ^ 48
    var d = startdenom;                 //   and denominator d = 2 ^ 48.
    var x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  };

  // Return the seed that was used
  return seed;
};

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
/** @constructor */
function ARC4(key) {
  var t, u, me = this, keylen = key.length;
  var i = 0, j = me.i = me.j = me.m = 0;
  me.S = [];
  me.c = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) { me.S[i] = i++; }
  for (i = 0; i < width; i++) {
    t = me.S[i];
    j = lowbits(j + t + key[i % keylen]);
    u = me.S[j];
    me.S[i] = u;
    me.S[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  me.g = function getnext(count) {
    var s = me.S;
    var i = lowbits(me.i + 1); var t = s[i];
    var j = lowbits(me.j + t); var u = s[j];
    s[i] = u;
    s[j] = t;
    var r = s[lowbits(t + u)];
    while (--count) {
      i = lowbits(i + 1); t = s[i];
      j = lowbits(j + t); u = s[j];
      s[i] = u;
      s[j] = t;
      r = r * width + s[lowbits(t + u)];
    }
    me.i = i;
    me.j = j;
    return r;
  };
  // For robust unpredictability discard an initial batch of values.
  // See http://www.rsa.com/rsalabs/node.asp?id=2009
  me.g(width);
}

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
/** @param {Object=} result 
  * @param {string=} prop
  * @param {string=} typ */
function flatten(obj, depth, result, prop, typ) {
  result = [];
  typ = typeof(obj);
  if (depth && typ == 'object') {
    for (prop in obj) {
      if (prop.indexOf('S') < 5) {    // Avoid FF3 bug (local/sessionStorage)
        try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
      }
    }
  }
  return (result.length ? result : obj + (typ != 'string' ? '\0' : ''));
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
/** @param {number=} smear 
  * @param {number=} j */
function mixkey(seed, key, smear, j) {
  seed += '';                         // Ensure the seed is a string
  smear = 0;
  for (j = 0; j < seed.length; j++) {
    key[lowbits(j)] =
      lowbits((smear ^= key[lowbits(j)] * 19) + seed.charCodeAt(j));
  }
  seed = '';
  for (j in key) { seed += String.fromCharCode(key[j]); }
  return seed;
}

//
// lowbits()
// A quick "n mod width" for width a power of 2.
//
function lowbits(n) { return n & (width - 1); }

//
// The following constants are related to IEEE 754 limits.
//
startdenom = math.pow(width, chunks);
significance = math.pow(2, significance);
overflow = significance * 2;

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to intefere with determinstic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
mixkey(math.random(), pool);

// End anonymous scope, and pass initial values.
})(
  [],   // pool: entropy pool starts empty
  Math, // math: package containing random, pow, and seedrandom
  256,  // width: each RC4 output is 0 <= x < 256
  6,    // chunks: at least six RC4 outputs for each double
  52    // significance: there are 52 significant digits in a double
);

define("openscad-parser-support", function(){});

define("Context", ["Globals", "openscad-parser-support"], function(Globals, OpenscadParserSupport){
    
    function Context(parentContext) {
        this.vars = (parentContext)? {} : {
            "$fn": Globals.FN_DEFAULT,
            "$fs": Globals.FS_DEFAULT,
            "$fa": Globals.FA_DEFAULT
        };
        this.parentContext = parentContext;
        this.inst_p;
        this.functions_p = {};
        this.modules_p = {};
        
        this.rootLevel=false;
        this.level = 0;
        
        Globals.context_stack.push(this);
    };

    Context.prototype.setVariable = function(name, value) {
        if (value !== undefined){
            this.vars[name] = value;
        }
    };

    Context.prototype.args = function(argnames, argexpr, call_argnames, call_argvalues) {

        for (var i = 0; i < argnames.length; i++) {
            if (i < argexpr.length && argexpr[i] !== undefined){
                this.setVariable(argnames[i], argexpr[i].evaluate(this.parentContext));
            } else {
                this.setVariable(argnames[i], undefined);
            }
        };
        var posarg = 0;  
        for (var i = 0; i < call_argnames.length; i++) {
            if (call_argnames[i] === undefined) {
                if (posarg < argnames.length){
                    this.setVariable(argnames[posarg++], call_argvalues[i]);
                }
            } else {
                this.setVariable(call_argnames[i], call_argvalues[i]);
            }
        }
    };

    Context.prototype.lookupVariable = function(name) {

        if (_.has(this.vars, name)){
            return this.vars[name];
        }

        if (this.parentContext !== undefined){
            return this.parentContext.lookupVariable(name);
        }
        
        //console.log("WARNING: Ignoring unknown variable '"+name+"'.");    
        return name;
    };


    Context.prototype.evaluateFunction = function(name, argnames, argvalues) {

        if (_.has(this.functions_p, name)){
            return this.functions_p[name].evaluate(this, argnames, argvalues);
        }

        if (_.has(functionNameLookup, name)){
            return functionNameLookup[name].apply(this, argvalues);
        }

        if (this.parentContext !== undefined){
            return this.parentContext.evaluateFunction(name, argnames, argvalues);
        }
            
        console.log("WARNING: Ignoring unknown function '"+name+"'.");
        return name;
    };

    Context.prototype.evaluateModule = function(inst, factory) {

        var that = this;

        var customModule = _.find(this.modules_p, function(x) { return x.name == inst.name; });
        if (customModule !== undefined) {
            return customModule.evaluate(this, inst);
        }

        if (inst.isSubmodule === undefined || !inst.isSubmodule){
            var adaptor = factory.getAdaptor(inst);
            if (adaptor !== undefined){
                return adaptor.evaluate(this, inst);
            }
        }

        if (this.parentContext) {
            return this.parentContext.evaluateModule(inst, factory);
        }

        console.log("WARNING: Ignoring unknown module: " + inst.name);
        if (inst.argvalues instanceof(Array))
    	{
        	inst.argvalues = _.compact(inst.argvalues);
    	}
        var evaluatedModule = "new " + inst.name+"( "+inst.argvalues +")";
        return evaluatedModule
    };

    Context.newContext = function (parentContext, argnames, argexpr, inst) {
        var context = new Context(parentContext);
        context.args(argnames, argexpr, inst.argnames, inst.argvalues);
        return context;
    };

    Context.contextVariableLookup = function(context, name, defaultValue){
        var val = context.lookupVariable(name);
        if (val === undefined){
            val = defaultValue;
        }
        return val;
    }

    Context.printContext = function(c){
        console.log(c.vars);
        if (c.parentContext){
            Context.printContext(c.parentContext);
        }
    };

    /*
        Returns the number of subdivision of a whole circle, given radius and
        the three special variables $fn, $fs and $fa
    */
    Context.get_fragments_from_r = function(r, context) {
        var fn = Context.contextVariableLookup(context, "$fn", Globals.FN_DEFAULT);
        var fs = Context.contextVariableLookup(context, "$fs", Globals.FS_DEFAULT);
        var fa = Context.contextVariableLookup(context, "$fa", Globals.FA_DEFAULT);

        var GRID_FINE   = 0.000001;
        if (r < GRID_FINE) return 0;
        if (fn > 0.0)
            return parseInt(fn);
        return parseInt(Math.ceil(Math.max(Math.min(360.0 / fa, r*2*Math.PI / fs), 5)));
    };

    function rad2deg(rad){
        return rad * (180/Math.PI);
    };

    function deg2rad(deg){
        return deg * Math.PI/180.0;
    };

    var functionNameLookup = {
        "cos":function(degree) {
            if (_.isUndefined(degree)  || _.isNaN(degree)){return undefined;}
            return "Math.cos("+degree+" * (Math.PI/180.0) )";
        },
        "sin":function(degree) {
            if (_.isUndefined(degree)  || _.isNaN(degree)){return undefined;}
            return "Math.sin("+degree+" * (Math.PI/180.0) )";
        },
        "tan":function(degree) {
            if (_.isUndefined(degree)  || _.isNaN(degree)){return undefined;}
            return "Math.tan("+degree+" * (Math.PI/180.0) )";
        },
        "acos":function(degree) {
            if (_.isUndefined(degree)  || _.isNaN(degree)){return undefined;}
            return "(180/Math.PI) * Math.acos( "+degree+" )";
        },
        "asin":function(degree) {
            if (_.isUndefined(degree)  || _.isNaN(degree)){return undefined;}
            return "(180/Math.PI) * Math.asin( "+degree+" )";
        },
        "atan":function(degree) {
            if (_.isUndefined(degree)  || _.isNaN(degree)){return undefined;}
            return "(180/Math.PI) * Math.atan( "+degree+" )";
        },
        "atan2":function(x,y) {
            if (_.isUndefined(x) || _.isNaN(x) || _.isUndefined(y) || _.isNaN(y)){return undefined;}
            return "(180/Math.PI) * Math.atan2( "+degree+" )";
        },
        "rands":function(min_value,max_value,value_count, seed_value){
            var values = [];
            if (seed_value !== undefined){
                Math.seedrandom(seed_value);
            }
            for (var i=0;i<value_count;i++){
                var random_value = min_value+(Math.random()*(max_value-min_value));
                values[i] = random_value;
            }
            return values; 
        },
        "round":function(x){
            if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}

            // This is because Javascript rounds negative numbers up, whereas c++ rounds down
            return (x<0)? "-(Math.round(Math.abs("+x+")))" : "Math.round("+x+")";
        },
        "exp":function(x) {
            if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}

            //return Math.exp(x);
            return "Math.exp("+ x +")"
        },
        "abs":function(x){
            //if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}
            //return Math.abs(x);
        	return "Math.abs("+ x +")"
        },
        "max":function(){
        	var args = []
        	for (var i = 0; i < arguments.length; i++)
        	{
        		var arg = arguments[i];
        		args.push(arg);
        	}
        	return "Math.max("+args.join()+")";
            //return Math.max.apply(null, _.map(arguments, function(num){ return num ? num : -Infinity; }));
        },
        "min":function(){
        	var args = []
        	for (var i = 0; i < arguments.length; i++)
        	{
        		var arg = arguments[i];
        		args.push(arg);
        	}
        	return "Math.min("+args.join()+")";
            //return Math.min.apply(null, _.map(arguments, function(num){ return num ? num : Infinity; }));
        },
        "pow":function(x) {
            if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}
            return "Math.pow( "+x+" )";
        },
        "ln":function(x) {
            if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}
            return "Math.log( "+x+" )";
        },
        "ceil":function(x) {
            if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}
            return "Math.ceil( "+x+" )";
        },
        "floor":function(x) {
            if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}
            return "Math.floor( "+x+" )";
        },
        "sqrt":function(x) {
            if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}
            return "Math.sqrt( "+x+" )";
        },
        "len":function(x){
            if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}
            var y = _.isString(x) ? Globals.stripString(x) : x;
            return y.length;
        },
        "log":function(){
            if (arguments.length == 2){
                if (_.isUndefined(arguments[0])  || _.isNaN(arguments[0])||_.isUndefined(arguments[1])  || _.isNaN(arguments[1])){return undefined;}
                return Math.log(arguments[1])/Math.log(arguments[0]);
            } else if (arguments.length == 1){
                if (_.isUndefined(arguments[0])  || _.isNaN(arguments[0])){return undefined;}
                return Math.log(arguments[0]) / Math.log(10.0);
            } else {
                return undefined;
            }
        },
        "str":function(){
            var vals = [];
            _.each(arguments, function(x){
                vals.push(Globals.convertForStrFunction(x));
            });

            return vals.join('');
        },
        "sign": function(x){
            if (_.isUndefined(x)  || _.isNaN(x)){return undefined;}
            return (x > 0)? 1.0 : ((x < 0)? -1.0 : 0);
        },
        "lookup": function(){
            var low_p, low_v, high_p, high_v;
            if (arguments.length < 2){
                console.log("Lookup arguments are invalid. Incorrect parameter count. " +  arguments);
                return undefined;
            }

            var p = arguments[0];
            var vector = arguments[1];
            if (!_.isNumber(p)        ||      // First must be a number
                !_.isArray(vector)      ||      // Second must be a vector of vectors
                vector.length < 2       ||
                (vector.length >=2 && !_.isArray(vector[0]))
                ){
                console.log("Lookup arguments are invalid. Incorrect parameters. " +  arguments);
                return undefined;
            }

            if (vector[0].length != 2){
                console.log("Lookup arguments are invalid. First vector has incorrect number of values. " +  p + ",  " + vector);
                return undefined;
            }
            low_p = vector[0][0];
            low_v = vector[0][1];
            high_p = low_p;
            high_v = low_v;

            _.each(vector.slice(1), function(v){
                if (v.length == 2){
                    var this_p = v[0];
                    var this_v = v[1];

                    if (this_p <= p && (this_p > low_p || low_p > p)) {
                        low_p = this_p;
                        low_v = this_v;
                    }
                    if (this_p >= p && (this_p < high_p || high_p < p)) {
                        high_p = this_p;
                        high_v = this_v;
                    }
                }
            });

            if (p <= low_p){
                return low_v;
            }
                
            if (p >= high_p){
                return high_v;
            }

            var f = (p-low_p) / (high_p-low_p);
            return high_v * f + low_v * (1-f);
        }

    };

	return Context;
});

define("Module", ["Context", "Globals"], function(Context, Globals){

    function Module(name) {
        this.name = name;
        this.children = [];
        this.assignments_var = {};
        this.functions = {};
        this.modules = [];
        this.argnames = [];
        this.argexpr = [];
        
        this.level = 0;
    };

    Module.prototype.evaluate = function(parentContext, inst) {
	console.log("evalueating module",parentContext, inst);
        var lines = [];
        var context = new Context(parentContext);
        context.level = parentContext.level +1 ;

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
            
            
            if (context.level === 1)
            {
            	lines.push("assembly.add(new "+ this.name+"( "+inst.argvalues+" ))")
            }
            else
            {
            	
            	lines.push("new "+this.name+"( "+ inst.argvalues +" )");
            }
            
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
        	console.log("Module name:",this.name, " level ", this.level);
        	
        	
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
        	indentLevel = Array(context.level-1).join("  ")
        	
            ln1 = indentLevel+"class " + this.name + " extends Part"
            ln2 = indentLevel+"  constructor:(options)->"
            ln3 = indentLevel+"    @defaults = " + JSON.stringify(args);
            ln4 = indentLevel+"    options = @injectOptions(@defaults,options)"
            ln5 = indentLevel+"    super(options)"
            context.indentLevel = indentLevel+4;
            	
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
        if ( inst === undefined)
        {
        	_.each(context.modules_p, function(child, index, list) {
                var tmpRes = child.evaluate(context);
                lines.push(tmpRes);
            });
        }
        

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
	            	console.log ("bleh",evaluatedChild instanceof(Array));
	            	if (evaluatedChild instanceof(Array))
	            	{
	            		evaluatedChild = _.compact(evaluatedChild);
	            		
	            	}
	            	if (child.children.length > 1) //if we have potential multiline content
	            	{
	            		evaluatedChild = "    @union( \n"+evaluatedChild+"\n )";
	            	}
	            	else{
	            		evaluatedChild = "    @union( "+evaluatedChild+" )";
	            	}
	            	
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
        		var that = this;
        		_.each(cleanedLines, function(value, key, list) 
        		{
        			if (context.level === 1)
        			{
        				lines.push("assembly.add("+value+")");
        			}
        			else
        			{
        				lines.push("@union("+value+")");
        			}
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

define("FunctionDef", ["Globals", "Context"], function(Globals, Context){

	function FunctionDef() {
        this.argnames = [];
        this.argexpr = [];
        this.expr;
    };

    FunctionDef.prototype.evaluate = function(parentContext, call_argnames, call_argvalues) {

        var context = new Context(parentContext);
        context.args(this.argnames, this.argexpr, call_argnames, call_argvalues);

        if (this.expr !== undefined)
            return this.expr.evaluate(context);

        return undefined;
    };

	return FunctionDef;
});
define('openscad-parser-ext',["Module", "Context", "Globals", "FunctionDef", "openscad-parser-support"], function(Module, Context, Globals, FunctionDef, support){


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
;
define("ArgContainer", [], function(){
	return function() {
        this.argname;
        this.argexpr;
    };
});
define("ArgsContainer", [], function(){
	return function() {
        this.argnames = [];
        this.argexpr = [];
    };
});
define("Range", [], function(){

	function Range(begin,step,end) {
        this.begin = begin;
        this.step = step;
        this.end = end;
    };

    return Range;

});
define('lib/sylvester',[], function(){
  // === Sylvester ===
// Vector and Matrix mathematics modules for JavaScript
// Copyright (c) 2007 James Coglan
// 
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

var Sylvester = {
  version: '0.1.3',
  precision: 1e-6
};

function Vector() {}
Vector.prototype = {

  // Returns element i of the vector
  e: function(i) {
    return (i < 1 || i > this.elements.length) ? null : this.elements[i-1];
  },

  // Returns the number of elements the vector has
  dimensions: function() {
    return this.elements.length;
  },

  // Returns the modulus ('length') of the vector
  modulus: function() {
    return Math.sqrt(this.dot(this));
  },

  // Returns true iff the vector is equal to the argument
  eql: function(vector) {
    var n = this.elements.length;
    var V = vector.elements || vector;
    if (n != V.length) { return false; }
    do {
      if (Math.abs(this.elements[n-1] - V[n-1]) > Sylvester.precision) { return false; }
    } while (--n);
    return true;
  },

  // Returns a copy of the vector
  dup: function() {
    return Vector.create(this.elements);
  },

  // Maps the vector to another vector according to the given function
  map: function(fn) {
    var elements = [];
    this.each(function(x, i) {
      elements.push(fn(x, i));
    });
    return Vector.create(elements);
  },
  
  // Calls the iterator for each element of the vector in turn
  each: function(fn) {
    var n = this.elements.length, k = n, i;
    do { i = k - n;
      fn(this.elements[i], i+1);
    } while (--n);
  },

  // Returns a new vector created by normalizing the receiver
  toUnitVector: function() {
    var r = this.modulus();
    if (r === 0) { return this.dup(); }
    return this.map(function(x) { return x/r; });
  },

  // Returns the angle between the vector and the argument (also a vector)
  angleFrom: function(vector) {
    var V = vector.elements || vector;
    var n = this.elements.length, k = n, i;
    if (n != V.length) { return null; }
    var dot = 0, mod1 = 0, mod2 = 0;
    // Work things out in parallel to save time
    this.each(function(x, i) {
      dot += x * V[i-1];
      mod1 += x * x;
      mod2 += V[i-1] * V[i-1];
    });
    mod1 = Math.sqrt(mod1); mod2 = Math.sqrt(mod2);
    if (mod1*mod2 === 0) { return null; }
    var theta = dot / (mod1*mod2);
    if (theta < -1) { theta = -1; }
    if (theta > 1) { theta = 1; }
    return Math.acos(theta);
  },

  // Returns true iff the vector is parallel to the argument
  isParallelTo: function(vector) {
    var angle = this.angleFrom(vector);
    return (angle === null) ? null : (angle <= Sylvester.precision);
  },

  // Returns true iff the vector is antiparallel to the argument
  isAntiparallelTo: function(vector) {
    var angle = this.angleFrom(vector);
    return (angle === null) ? null : (Math.abs(angle - Math.PI) <= Sylvester.precision);
  },

  // Returns true iff the vector is perpendicular to the argument
  isPerpendicularTo: function(vector) {
    var dot = this.dot(vector);
    return (dot === null) ? null : (Math.abs(dot) <= Sylvester.precision);
  },

  // Returns the result of adding the argument to the vector
  add: function(vector) {
    var V = vector.elements || vector;
    if (this.elements.length != V.length) { return null; }
    return this.map(function(x, i) { return x + V[i-1]; });
  },

  // Returns the result of subtracting the argument from the vector
  subtract: function(vector) {
    var V = vector.elements || vector;
    if (this.elements.length != V.length) { return null; }
    return this.map(function(x, i) { return x - V[i-1]; });
  },

  // Returns the result of multiplying the elements of the vector by the argument
  multiply: function(k) {
    return this.map(function(x) { return x*k; });
  },

  x: function(k) { return this.multiply(k); },

  // Returns the scalar product of the vector with the argument
  // Both vectors must have equal dimensionality
  dot: function(vector) {
    var V = vector.elements || vector;
    var i, product = 0, n = this.elements.length;
    if (n != V.length) { return null; }
    do { product += this.elements[n-1] * V[n-1]; } while (--n);
    return product;
  },

  // Returns the vector product of the vector with the argument
  // Both vectors must have dimensionality 3
  cross: function(vector) {
    var B = vector.elements || vector;
    if (this.elements.length != 3 || B.length != 3) { return null; }
    var A = this.elements;
    return Vector.create([
      (A[1] * B[2]) - (A[2] * B[1]),
      (A[2] * B[0]) - (A[0] * B[2]),
      (A[0] * B[1]) - (A[1] * B[0])
    ]);
  },

  // Returns the (absolute) largest element of the vector
  max: function() {
    var m = 0, n = this.elements.length, k = n, i;
    do { i = k - n;
      if (Math.abs(this.elements[i]) > Math.abs(m)) { m = this.elements[i]; }
    } while (--n);
    return m;
  },

  // Returns the index of the first match found
  indexOf: function(x) {
    var index = null, n = this.elements.length, k = n, i;
    do { i = k - n;
      if (index === null && this.elements[i] == x) {
        index = i + 1;
      }
    } while (--n);
    return index;
  },

  // Returns a diagonal matrix with the vector's elements as its diagonal elements
  toDiagonalMatrix: function() {
    return Matrix.Diagonal(this.elements);
  },

  // Returns the result of rounding the elements of the vector
  round: function() {
    return this.map(function(x) { return Math.round(x); });
  },

  // Returns a copy of the vector with elements set to the given value if they
  // differ from it by less than Sylvester.precision
  snapTo: function(x) {
    return this.map(function(y) {
      return (Math.abs(y - x) <= Sylvester.precision) ? x : y;
    });
  },

  // Returns the vector's distance from the argument, when considered as a point in space
  distanceFrom: function(obj) {
    if (obj.anchor) { return obj.distanceFrom(this); }
    var V = obj.elements || obj;
    if (V.length != this.elements.length) { return null; }
    var sum = 0, part;
    this.each(function(x, i) {
      part = x - V[i-1];
      sum += part * part;
    });
    return Math.sqrt(sum);
  },

  // Returns true if the vector is point on the given line
  liesOn: function(line) {
    return line.contains(this);
  },

  // Return true iff the vector is a point in the given plane
  liesIn: function(plane) {
    return plane.contains(this);
  },

  // Rotates the vector about the given object. The object should be a 
  // point if the vector is 2D, and a line if it is 3D. Be careful with line directions!
  rotate: function(t, obj) {
    var V, R, x, y, z;
    switch (this.elements.length) {
      case 2:
        V = obj.elements || obj;
        if (V.length != 2) { return null; }
        R = Matrix.Rotation(t).elements;
        x = this.elements[0] - V[0];
        y = this.elements[1] - V[1];
        return Vector.create([
          V[0] + R[0][0] * x + R[0][1] * y,
          V[1] + R[1][0] * x + R[1][1] * y
        ]);
        break;
      case 3:
        if (!obj.direction) { return null; }
        var C = obj.pointClosestTo(this).elements;
        R = Matrix.Rotation(t, obj.direction).elements;
        x = this.elements[0] - C[0];
        y = this.elements[1] - C[1];
        z = this.elements[2] - C[2];
        return Vector.create([
          C[0] + R[0][0] * x + R[0][1] * y + R[0][2] * z,
          C[1] + R[1][0] * x + R[1][1] * y + R[1][2] * z,
          C[2] + R[2][0] * x + R[2][1] * y + R[2][2] * z
        ]);
        break;
      default:
        return null;
    }
  },

  // Returns the result of reflecting the point in the given point, line or plane
  reflectionIn: function(obj) {
    if (obj.anchor) {
      // obj is a plane or line
      var P = this.elements.slice();
      var C = obj.pointClosestTo(P).elements;
      return Vector.create([C[0] + (C[0] - P[0]), C[1] + (C[1] - P[1]), C[2] + (C[2] - (P[2] || 0))]);
    } else {
      // obj is a point
      var Q = obj.elements || obj;
      if (this.elements.length != Q.length) { return null; }
      return this.map(function(x, i) { return Q[i-1] + (Q[i-1] - x); });
    }
  },

  // Utility to make sure vectors are 3D. If they are 2D, a zero z-component is added
  to3D: function() {
    var V = this.dup();
    switch (V.elements.length) {
      case 3: break;
      case 2: V.elements.push(0); break;
      default: return null;
    }
    return V;
  },

  // Returns a string representation of the vector
  inspect: function() {
    return '[' + this.elements.join(', ') + ']';
  },

  // Set vector's elements from an array
  setElements: function(els) {
    this.elements = (els.elements || els).slice();
    return this;
  }
};
  
// Constructor function
Vector.create = function(elements) {
  var V = new Vector();
  return V.setElements(elements);
};

// i, j, k unit vectors
Vector.i = Vector.create([1,0,0]);
Vector.j = Vector.create([0,1,0]);
Vector.k = Vector.create([0,0,1]);

// Random vector of size n
Vector.Random = function(n) {
  var elements = [];
  do { elements.push(Math.random());
  } while (--n);
  return Vector.create(elements);
};

// Vector filled with zeros
Vector.Zero = function(n) {
  var elements = [];
  do { elements.push(0);
  } while (--n);
  return Vector.create(elements);
};



function Matrix() {}
Matrix.prototype = {

  // Returns element (i,j) of the matrix
  e: function(i,j) {
    if (i < 1 || i > this.elements.length || j < 1 || j > this.elements[0].length) { return null; }
    return this.elements[i-1][j-1];
  },

  // Returns row k of the matrix as a vector
  row: function(i) {
    if (i > this.elements.length) { return null; }
    return Vector.create(this.elements[i-1]);
  },

  // Returns column k of the matrix as a vector
  col: function(j) {
    if (j > this.elements[0].length) { return null; }
    var col = [], n = this.elements.length, k = n, i;
    do { i = k - n;
      col.push(this.elements[i][j-1]);
    } while (--n);
    return Vector.create(col);
  },

  // Returns the number of rows/columns the matrix has
  dimensions: function() {
    return {rows: this.elements.length, cols: this.elements[0].length};
  },

  // Returns the number of rows in the matrix
  rows: function() {
    return this.elements.length;
  },

  // Returns the number of columns in the matrix
  cols: function() {
    return this.elements[0].length;
  },

  // Returns true iff the matrix is equal to the argument. You can supply
  // a vector as the argument, in which case the receiver must be a
  // one-column matrix equal to the vector.
  eql: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (this.elements.length != M.length ||
        this.elements[0].length != M[0].length) { return false; }
    var ni = this.elements.length, ki = ni, i, nj, kj = this.elements[0].length, j;
    do { i = ki - ni;
      nj = kj;
      do { j = kj - nj;
        if (Math.abs(this.elements[i][j] - M[i][j]) > Sylvester.precision) { return false; }
      } while (--nj);
    } while (--ni);
    return true;
  },

  // Returns a copy of the matrix
  dup: function() {
    return Matrix.create(this.elements);
  },

  // Maps the matrix to another matrix (of the same dimensions) according to the given function
  map: function(fn) {
    var els = [], ni = this.elements.length, ki = ni, i, nj, kj = this.elements[0].length, j;
    do { i = ki - ni;
      nj = kj;
      els[i] = [];
      do { j = kj - nj;
        els[i][j] = fn(this.elements[i][j], i + 1, j + 1);
      } while (--nj);
    } while (--ni);
    return Matrix.create(els);
  },

  // Returns true iff the argument has the same dimensions as the matrix
  isSameSizeAs: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    return (this.elements.length == M.length &&
        this.elements[0].length == M[0].length);
  },

  // Returns the result of adding the argument to the matrix
  add: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (!this.isSameSizeAs(M)) { return null; }
    return this.map(function(x, i, j) { return x + M[i-1][j-1]; });
  },

  // Returns the result of subtracting the argument from the matrix
  subtract: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (!this.isSameSizeAs(M)) { return null; }
    return this.map(function(x, i, j) { return x - M[i-1][j-1]; });
  },

  // Returns true iff the matrix can multiply the argument from the left
  canMultiplyFromLeft: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    // this.columns should equal matrix.rows
    return (this.elements[0].length == M.length);
  },

  // Returns the result of multiplying the matrix from the right by the argument.
  // If the argument is a scalar then just multiply all the elements. If the argument is
  // a vector, a vector is returned, which saves you having to remember calling
  // col(1) on the result.
  multiply: function(matrix) {
    if (!matrix.elements) {
      return this.map(function(x) { return x * matrix; });
    }
    var returnVector = matrix.modulus ? true : false;
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (!this.canMultiplyFromLeft(M)) { return null; }
    var ni = this.elements.length, ki = ni, i, nj, kj = M[0].length, j;
    var cols = this.elements[0].length, elements = [], sum, nc, c;
    do { i = ki - ni;
      elements[i] = [];
      nj = kj;
      do { j = kj - nj;
        sum = 0;
        nc = cols;
        do { c = cols - nc;
          sum += this.elements[i][c] * M[c][j];
        } while (--nc);
        elements[i][j] = sum;
      } while (--nj);
    } while (--ni);
    var M = Matrix.create(elements);
    return returnVector ? M.col(1) : M;
  },

  x: function(matrix) { return this.multiply(matrix); },

  // Returns a submatrix taken from the matrix
  // Argument order is: start row, start col, nrows, ncols
  // Element selection wraps if the required index is outside the matrix's bounds, so you could
  // use this to perform row/column cycling or copy-augmenting.
  minor: function(a, b, c, d) {
    var elements = [], ni = c, i, nj, j;
    var rows = this.elements.length, cols = this.elements[0].length;
    do { i = c - ni;
      elements[i] = [];
      nj = d;
      do { j = d - nj;
        elements[i][j] = this.elements[(a+i-1)%rows][(b+j-1)%cols];
      } while (--nj);
    } while (--ni);
    return Matrix.create(elements);
  },

  // Returns the transpose of the matrix
  transpose: function() {
    var rows = this.elements.length, cols = this.elements[0].length;
    var elements = [], ni = cols, i, nj, j;
    do { i = cols - ni;
      elements[i] = [];
      nj = rows;
      do { j = rows - nj;
        elements[i][j] = this.elements[j][i];
      } while (--nj);
    } while (--ni);
    return Matrix.create(elements);
  },

  // Returns true iff the matrix is square
  isSquare: function() {
    return (this.elements.length == this.elements[0].length);
  },

  // Returns the (absolute) largest element of the matrix
  max: function() {
    var m = 0, ni = this.elements.length, ki = ni, i, nj, kj = this.elements[0].length, j;
    do { i = ki - ni;
      nj = kj;
      do { j = kj - nj;
        if (Math.abs(this.elements[i][j]) > Math.abs(m)) { m = this.elements[i][j]; }
      } while (--nj);
    } while (--ni);
    return m;
  },

  // Returns the indeces of the first match found by reading row-by-row from left to right
  indexOf: function(x) {
    var index = null, ni = this.elements.length, ki = ni, i, nj, kj = this.elements[0].length, j;
    do { i = ki - ni;
      nj = kj;
      do { j = kj - nj;
        if (this.elements[i][j] == x) { return {i: i+1, j: j+1}; }
      } while (--nj);
    } while (--ni);
    return null;
  },

  // If the matrix is square, returns the diagonal elements as a vector.
  // Otherwise, returns null.
  diagonal: function() {
    if (!this.isSquare) { return null; }
    var els = [], n = this.elements.length, k = n, i;
    do { i = k - n;
      els.push(this.elements[i][i]);
    } while (--n);
    return Vector.create(els);
  },

  // Make the matrix upper (right) triangular by Gaussian elimination.
  // This method only adds multiples of rows to other rows. No rows are
  // scaled up or switched, and the determinant is preserved.
  toRightTriangular: function() {
    var M = this.dup(), els;
    var n = this.elements.length, k = n, i, np, kp = this.elements[0].length, p;
    do { i = k - n;
      if (M.elements[i][i] == 0) {
        for (j = i + 1; j < k; j++) {
          if (M.elements[j][i] != 0) {
            els = []; np = kp;
            do { p = kp - np;
              els.push(M.elements[i][p] + M.elements[j][p]);
            } while (--np);
            M.elements[i] = els;
            break;
          }
        }
      }
      if (M.elements[i][i] != 0) {
        for (j = i + 1; j < k; j++) {
          var multiplier = M.elements[j][i] / M.elements[i][i];
          els = []; np = kp;
          do { p = kp - np;
            // Elements with column numbers up to an including the number
            // of the row that we're subtracting can safely be set straight to
            // zero, since that's the point of this routine and it avoids having
            // to loop over and correct rounding errors later
            els.push(p <= i ? 0 : M.elements[j][p] - M.elements[i][p] * multiplier);
          } while (--np);
          M.elements[j] = els;
        }
      }
    } while (--n);
    return M;
  },

  toUpperTriangular: function() { return this.toRightTriangular(); },

  // Returns the determinant for square matrices
  determinant: function() {
    if (!this.isSquare()) { return null; }
    var M = this.toRightTriangular();
    var det = M.elements[0][0], n = M.elements.length - 1, k = n, i;
    do { i = k - n + 1;
      det = det * M.elements[i][i];
    } while (--n);
    return det;
  },

  det: function() { return this.determinant(); },

  // Returns true iff the matrix is singular
  isSingular: function() {
    return (this.isSquare() && this.determinant() === 0);
  },

  // Returns the trace for square matrices
  trace: function() {
    if (!this.isSquare()) { return null; }
    var tr = this.elements[0][0], n = this.elements.length - 1, k = n, i;
    do { i = k - n + 1;
      tr += this.elements[i][i];
    } while (--n);
    return tr;
  },

  tr: function() { return this.trace(); },

  // Returns the rank of the matrix
  rank: function() {
    var M = this.toRightTriangular(), rank = 0;
    var ni = this.elements.length, ki = ni, i, nj, kj = this.elements[0].length, j;
    do { i = ki - ni;
      nj = kj;
      do { j = kj - nj;
        if (Math.abs(M.elements[i][j]) > Sylvester.precision) { rank++; break; }
      } while (--nj);
    } while (--ni);
    return rank;
  },
  
  rk: function() { return this.rank(); },

  // Returns the result of attaching the given argument to the right-hand side of the matrix
  augment: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    var T = this.dup(), cols = T.elements[0].length;
    var ni = T.elements.length, ki = ni, i, nj, kj = M[0].length, j;
    if (ni != M.length) { return null; }
    do { i = ki - ni;
      nj = kj;
      do { j = kj - nj;
        T.elements[i][cols + j] = M[i][j];
      } while (--nj);
    } while (--ni);
    return T;
  },

  // Returns the inverse (if one exists) using Gauss-Jordan
  inverse: function() {
    if (!this.isSquare() || this.isSingular()) { return null; }
    var ni = this.elements.length, ki = ni, i, j;
    var M = this.augment(Matrix.I(ni)).toRightTriangular();
    var np, kp = M.elements[0].length, p, els, divisor;
    var inverse_elements = [], new_element;
    // Matrix is non-singular so there will be no zeros on the diagonal
    // Cycle through rows from last to first
    do { i = ni - 1;
      // First, normalise diagonal elements to 1
      els = []; np = kp;
      inverse_elements[i] = [];
      divisor = M.elements[i][i];
      do { p = kp - np;
        new_element = M.elements[i][p] / divisor;
        els.push(new_element);
        // Shuffle of the current row of the right hand side into the results
        // array as it will not be modified by later runs through this loop
        if (p >= ki) { inverse_elements[i].push(new_element); }
      } while (--np);
      M.elements[i] = els;
      // Then, subtract this row from those above it to
      // give the identity matrix on the left hand side
      for (j = 0; j < i; j++) {
        els = []; np = kp;
        do { p = kp - np;
          els.push(M.elements[j][p] - M.elements[i][p] * M.elements[j][i]);
        } while (--np);
        M.elements[j] = els;
      }
    } while (--ni);
    return Matrix.create(inverse_elements);
  },

  inv: function() { return this.inverse(); },

  // Returns the result of rounding all the elements
  round: function() {
    return this.map(function(x) { return Math.round(x); });
  },

  // Returns a copy of the matrix with elements set to the given value if they
  // differ from it by less than Sylvester.precision
  snapTo: function(x) {
    return this.map(function(p) {
      return (Math.abs(p - x) <= Sylvester.precision) ? x : p;
    });
  },

  // Returns a string representation of the matrix
  inspect: function() {
    var matrix_rows = [];
    var n = this.elements.length, k = n, i;
    do { i = k - n;
      matrix_rows.push(Vector.create(this.elements[i]).inspect());
    } while (--n);
    return matrix_rows.join('\n');
  },

  // Set the matrix's elements from an array. If the argument passed
  // is a vector, the resulting matrix will be a single column.
  setElements: function(els) {
    var i, elements = els.elements || els;
    if (typeof(elements[0][0]) != 'undefined') {
      var ni = elements.length, ki = ni, nj, kj, j;
      this.elements = [];
      do { i = ki - ni;
        nj = elements[i].length; kj = nj;
        this.elements[i] = [];
        do { j = kj - nj;
          this.elements[i][j] = elements[i][j];
        } while (--nj);
      } while(--ni);
      return this;
    }
    var n = elements.length, k = n;
    this.elements = [];
    do { i = k - n;
      this.elements.push([elements[i]]);
    } while (--n);
    return this;
  }
};

// Constructor function
Matrix.create = function(elements) {
  var M = new Matrix();
  return M.setElements(elements);
};

// Identity matrix of size n
Matrix.I = function(n) {
  var els = [], k = n, i, nj, j;
  do { i = k - n;
    els[i] = []; nj = k;
    do { j = k - nj;
      els[i][j] = (i == j) ? 1 : 0;
    } while (--nj);
  } while (--n);
  return Matrix.create(els);
};

// Diagonal matrix - all off-diagonal elements are zero
Matrix.Diagonal = function(elements) {
  var n = elements.length, k = n, i;
  var M = Matrix.I(n);
  do { i = k - n;
    M.elements[i][i] = elements[i];
  } while (--n);
  return M;
};

// Rotation matrix about some axis. If no axis is
// supplied, assume we're after a 2D transform
Matrix.Rotation = function(theta, a) {
  if (!a) {
    return Matrix.create([
      [Math.cos(theta),  -Math.sin(theta)],
      [Math.sin(theta),   Math.cos(theta)]
    ]);
  }
  var axis = a.dup();
  if (axis.elements.length != 3) { return null; }
  var mod = axis.modulus();
  var x = axis.elements[0]/mod, y = axis.elements[1]/mod, z = axis.elements[2]/mod;
  var s = Math.sin(theta), c = Math.cos(theta), t = 1 - c;
  // Formula derived here: http://www.gamedev.net/reference/articles/article1199.asp
  // That proof rotates the co-ordinate system so theta
  // becomes -theta and sin becomes -sin here.
  return Matrix.create([
    [ t*x*x + c, t*x*y - s*z, t*x*z + s*y ],
    [ t*x*y + s*z, t*y*y + c, t*y*z - s*x ],
    [ t*x*z - s*y, t*y*z + s*x, t*z*z + c ]
  ]);
};

// Special case rotations
Matrix.RotationX = function(t) {
  var c = Math.cos(t), s = Math.sin(t);
  return Matrix.create([
    [  1,  0,  0 ],
    [  0,  c, -s ],
    [  0,  s,  c ]
  ]);
};
Matrix.RotationY = function(t) {
  var c = Math.cos(t), s = Math.sin(t);
  return Matrix.create([
    [  c,  0,  s ],
    [  0,  1,  0 ],
    [ -s,  0,  c ]
  ]);
};
Matrix.RotationZ = function(t) {
  var c = Math.cos(t), s = Math.sin(t);
  return Matrix.create([
    [  c, -s,  0 ],
    [  s,  c,  0 ],
    [  0,  0,  1 ]
  ]);
};

// Random matrix of n rows, m columns
Matrix.Random = function(n, m) {
  return Matrix.Zero(n, m).map(
    function() { return Math.random(); }
  );
};

// Matrix filled with zeros
Matrix.Zero = function(n, m) {
  var els = [], ni = n, i, nj, j;
  do { i = n - ni;
    els[i] = [];
    nj = m;
    do { j = m - nj;
      els[i][j] = 0;
    } while (--nj);
  } while (--ni);
  return Matrix.create(els);
};



function Line() {}
Line.prototype = {

  // Returns true if the argument occupies the same space as the line
  eql: function(line) {
    return (this.isParallelTo(line) && this.contains(line.anchor));
  },

  // Returns a copy of the line
  dup: function() {
    return Line.create(this.anchor, this.direction);
  },

  // Returns the result of translating the line by the given vector/array
  translate: function(vector) {
    var V = vector.elements || vector;
    return Line.create([
      this.anchor.elements[0] + V[0],
      this.anchor.elements[1] + V[1],
      this.anchor.elements[2] + (V[2] || 0)
    ], this.direction);
  },

  // Returns true if the line is parallel to the argument. Here, 'parallel to'
  // means that the argument's direction is either parallel or antiparallel to
  // the line's own direction. A line is parallel to a plane if the two do not
  // have a unique intersection.
  isParallelTo: function(obj) {
    if (obj.normal) { return obj.isParallelTo(this); }
    var theta = this.direction.angleFrom(obj.direction);
    return (Math.abs(theta) <= Sylvester.precision || Math.abs(theta - Math.PI) <= Sylvester.precision);
  },

  // Returns the line's perpendicular distance from the argument,
  // which can be a point, a line or a plane
  distanceFrom: function(obj) {
    if (obj.normal) { return obj.distanceFrom(this); }
    if (obj.direction) {
      // obj is a line
      if (this.isParallelTo(obj)) { return this.distanceFrom(obj.anchor); }
      var N = this.direction.cross(obj.direction).toUnitVector().elements;
      var A = this.anchor.elements, B = obj.anchor.elements;
      return Math.abs((A[0] - B[0]) * N[0] + (A[1] - B[1]) * N[1] + (A[2] - B[2]) * N[2]);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      var A = this.anchor.elements, D = this.direction.elements;
      var PA1 = P[0] - A[0], PA2 = P[1] - A[1], PA3 = (P[2] || 0) - A[2];
      var modPA = Math.sqrt(PA1*PA1 + PA2*PA2 + PA3*PA3);
      if (modPA === 0) return 0;
      // Assumes direction vector is normalized
      var cosTheta = (PA1 * D[0] + PA2 * D[1] + PA3 * D[2]) / modPA;
      var sin2 = 1 - cosTheta*cosTheta;
      return Math.abs(modPA * Math.sqrt(sin2 < 0 ? 0 : sin2));
    }
  },

  // Returns true iff the argument is a point on the line
  contains: function(point) {
    var dist = this.distanceFrom(point);
    return (dist !== null && dist <= Sylvester.precision);
  },

  // Returns true iff the line lies in the given plane
  liesIn: function(plane) {
    return plane.contains(this);
  },

  // Returns true iff the line has a unique point of intersection with the argument
  intersects: function(obj) {
    if (obj.normal) { return obj.intersects(this); }
    return (!this.isParallelTo(obj) && this.distanceFrom(obj) <= Sylvester.precision);
  },

  // Returns the unique intersection point with the argument, if one exists
  intersectionWith: function(obj) {
    if (obj.normal) { return obj.intersectionWith(this); }
    if (!this.intersects(obj)) { return null; }
    var P = this.anchor.elements, X = this.direction.elements,
        Q = obj.anchor.elements, Y = obj.direction.elements;
    var X1 = X[0], X2 = X[1], X3 = X[2], Y1 = Y[0], Y2 = Y[1], Y3 = Y[2];
    var PsubQ1 = P[0] - Q[0], PsubQ2 = P[1] - Q[1], PsubQ3 = P[2] - Q[2];
    var XdotQsubP = - X1*PsubQ1 - X2*PsubQ2 - X3*PsubQ3;
    var YdotPsubQ = Y1*PsubQ1 + Y2*PsubQ2 + Y3*PsubQ3;
    var XdotX = X1*X1 + X2*X2 + X3*X3;
    var YdotY = Y1*Y1 + Y2*Y2 + Y3*Y3;
    var XdotY = X1*Y1 + X2*Y2 + X3*Y3;
    var k = (XdotQsubP * YdotY / XdotX + XdotY * YdotPsubQ) / (YdotY - XdotY * XdotY);
    return Vector.create([P[0] + k*X1, P[1] + k*X2, P[2] + k*X3]);
  },

  // Returns the point on the line that is closest to the given point or line
  pointClosestTo: function(obj) {
    if (obj.direction) {
      // obj is a line
      if (this.intersects(obj)) { return this.intersectionWith(obj); }
      if (this.isParallelTo(obj)) { return null; }
      var D = this.direction.elements, E = obj.direction.elements;
      var D1 = D[0], D2 = D[1], D3 = D[2], E1 = E[0], E2 = E[1], E3 = E[2];
      // Create plane containing obj and the shared normal and intersect this with it
      // Thank you: http://www.cgafaq.info/wiki/Line-line_distance
      var x = (D3 * E1 - D1 * E3), y = (D1 * E2 - D2 * E1), z = (D2 * E3 - D3 * E2);
      var N = Vector.create([x * E3 - y * E2, y * E1 - z * E3, z * E2 - x * E1]);
      var P = Plane.create(obj.anchor, N);
      return P.intersectionWith(this);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      if (this.contains(P)) { return Vector.create(P); }
      var A = this.anchor.elements, D = this.direction.elements;
      var D1 = D[0], D2 = D[1], D3 = D[2], A1 = A[0], A2 = A[1], A3 = A[2];
      var x = D1 * (P[1]-A2) - D2 * (P[0]-A1), y = D2 * ((P[2] || 0) - A3) - D3 * (P[1]-A2),
          z = D3 * (P[0]-A1) - D1 * ((P[2] || 0) - A3);
      var V = Vector.create([D2 * x - D3 * z, D3 * y - D1 * x, D1 * z - D2 * y]);
      var k = this.distanceFrom(P) / V.modulus();
      return Vector.create([
        P[0] + V.elements[0] * k,
        P[1] + V.elements[1] * k,
        (P[2] || 0) + V.elements[2] * k
      ]);
    }
  },

  // Returns a copy of the line rotated by t radians about the given line. Works by
  // finding the argument's closest point to this line's anchor point (call this C) and
  // rotating the anchor about C. Also rotates the line's direction about the argument's.
  // Be careful with this - the rotation axis' direction affects the outcome!
  rotate: function(t, line) {
    // If we're working in 2D
    if (typeof(line.direction) == 'undefined') { line = Line.create(line.to3D(), Vector.k); }
    var R = Matrix.Rotation(t, line.direction).elements;
    var C = line.pointClosestTo(this.anchor).elements;
    var A = this.anchor.elements, D = this.direction.elements;
    var C1 = C[0], C2 = C[1], C3 = C[2], A1 = A[0], A2 = A[1], A3 = A[2];
    var x = A1 - C1, y = A2 - C2, z = A3 - C3;
    return Line.create([
      C1 + R[0][0] * x + R[0][1] * y + R[0][2] * z,
      C2 + R[1][0] * x + R[1][1] * y + R[1][2] * z,
      C3 + R[2][0] * x + R[2][1] * y + R[2][2] * z
    ], [
      R[0][0] * D[0] + R[0][1] * D[1] + R[0][2] * D[2],
      R[1][0] * D[0] + R[1][1] * D[1] + R[1][2] * D[2],
      R[2][0] * D[0] + R[2][1] * D[1] + R[2][2] * D[2]
    ]);
  },

  // Returns the line's reflection in the given point or line
  reflectionIn: function(obj) {
    if (obj.normal) {
      // obj is a plane
      var A = this.anchor.elements, D = this.direction.elements;
      var A1 = A[0], A2 = A[1], A3 = A[2], D1 = D[0], D2 = D[1], D3 = D[2];
      var newA = this.anchor.reflectionIn(obj).elements;
      // Add the line's direction vector to its anchor, then mirror that in the plane
      var AD1 = A1 + D1, AD2 = A2 + D2, AD3 = A3 + D3;
      var Q = obj.pointClosestTo([AD1, AD2, AD3]).elements;
      var newD = [Q[0] + (Q[0] - AD1) - newA[0], Q[1] + (Q[1] - AD2) - newA[1], Q[2] + (Q[2] - AD3) - newA[2]];
      return Line.create(newA, newD);
    } else if (obj.direction) {
      // obj is a line - reflection obtained by rotating PI radians about obj
      return this.rotate(Math.PI, obj);
    } else {
      // obj is a point - just reflect the line's anchor in it
      var P = obj.elements || obj;
      return Line.create(this.anchor.reflectionIn([P[0], P[1], (P[2] || 0)]), this.direction);
    }
  },

  // Set the line's anchor point and direction.
  setVectors: function(anchor, direction) {
    // Need to do this so that line's properties are not
    // references to the arguments passed in
    anchor = Vector.create(anchor);
    direction = Vector.create(direction);
    if (anchor.elements.length == 2) {anchor.elements.push(0); }
    if (direction.elements.length == 2) { direction.elements.push(0); }
    if (anchor.elements.length > 3 || direction.elements.length > 3) { return null; }
    var mod = direction.modulus();
    if (mod === 0) { return null; }
    this.anchor = anchor;
    this.direction = Vector.create([
      direction.elements[0] / mod,
      direction.elements[1] / mod,
      direction.elements[2] / mod
    ]);
    return this;
  }
};

  
// Constructor function
Line.create = function(anchor, direction) {
  var L = new Line();
  return L.setVectors(anchor, direction);
};

// Axes
Line.X = Line.create(Vector.Zero(3), Vector.i);
Line.Y = Line.create(Vector.Zero(3), Vector.j);
Line.Z = Line.create(Vector.Zero(3), Vector.k);



function Plane() {}
Plane.prototype = {

  // Returns true iff the plane occupies the same space as the argument
  eql: function(plane) {
    return (this.contains(plane.anchor) && this.isParallelTo(plane));
  },

  // Returns a copy of the plane
  dup: function() {
    return Plane.create(this.anchor, this.normal);
  },

  // Returns the result of translating the plane by the given vector
  translate: function(vector) {
    var V = vector.elements || vector;
    return Plane.create([
      this.anchor.elements[0] + V[0],
      this.anchor.elements[1] + V[1],
      this.anchor.elements[2] + (V[2] || 0)
    ], this.normal);
  },

  // Returns true iff the plane is parallel to the argument. Will return true
  // if the planes are equal, or if you give a line and it lies in the plane.
  isParallelTo: function(obj) {
    var theta;
    if (obj.normal) {
      // obj is a plane
      theta = this.normal.angleFrom(obj.normal);
      return (Math.abs(theta) <= Sylvester.precision || Math.abs(Math.PI - theta) <= Sylvester.precision);
    } else if (obj.direction) {
      // obj is a line
      return this.normal.isPerpendicularTo(obj.direction);
    }
    return null;
  },
  
  // Returns true iff the receiver is perpendicular to the argument
  isPerpendicularTo: function(plane) {
    var theta = this.normal.angleFrom(plane.normal);
    return (Math.abs(Math.PI/2 - theta) <= Sylvester.precision);
  },

  // Returns the plane's distance from the given object (point, line or plane)
  distanceFrom: function(obj) {
    if (this.intersects(obj) || this.contains(obj)) { return 0; }
    if (obj.anchor) {
      // obj is a plane or line
      var A = this.anchor.elements, B = obj.anchor.elements, N = this.normal.elements;
      return Math.abs((A[0] - B[0]) * N[0] + (A[1] - B[1]) * N[1] + (A[2] - B[2]) * N[2]);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      var A = this.anchor.elements, N = this.normal.elements;
      return Math.abs((A[0] - P[0]) * N[0] + (A[1] - P[1]) * N[1] + (A[2] - (P[2] || 0)) * N[2]);
    }
  },

  // Returns true iff the plane contains the given point or line
  contains: function(obj) {
    if (obj.normal) { return null; }
    if (obj.direction) {
      return (this.contains(obj.anchor) && this.contains(obj.anchor.add(obj.direction)));
    } else {
      var P = obj.elements || obj;
      var A = this.anchor.elements, N = this.normal.elements;
      var diff = Math.abs(N[0]*(A[0] - P[0]) + N[1]*(A[1] - P[1]) + N[2]*(A[2] - (P[2] || 0)));
      return (diff <= Sylvester.precision);
    }
  },

  // Returns true iff the plane has a unique point/line of intersection with the argument
  intersects: function(obj) {
    if (typeof(obj.direction) == 'undefined' && typeof(obj.normal) == 'undefined') { return null; }
    return !this.isParallelTo(obj);
  },

  // Returns the unique intersection with the argument, if one exists. The result
  // will be a vector if a line is supplied, and a line if a plane is supplied.
  intersectionWith: function(obj) {
    if (!this.intersects(obj)) { return null; }
    if (obj.direction) {
      // obj is a line
      var A = obj.anchor.elements, D = obj.direction.elements,
          P = this.anchor.elements, N = this.normal.elements;
      var multiplier = (N[0]*(P[0]-A[0]) + N[1]*(P[1]-A[1]) + N[2]*(P[2]-A[2])) / (N[0]*D[0] + N[1]*D[1] + N[2]*D[2]);
      return Vector.create([A[0] + D[0]*multiplier, A[1] + D[1]*multiplier, A[2] + D[2]*multiplier]);
    } else if (obj.normal) {
      // obj is a plane
      var direction = this.normal.cross(obj.normal).toUnitVector();
      // To find an anchor point, we find one co-ordinate that has a value
      // of zero somewhere on the intersection, and remember which one we picked
      var N = this.normal.elements, A = this.anchor.elements,
          O = obj.normal.elements, B = obj.anchor.elements;
      var solver = Matrix.Zero(2,2), i = 0;
      while (solver.isSingular()) {
        i++;
        solver = Matrix.create([
          [ N[i%3], N[(i+1)%3] ],
          [ O[i%3], O[(i+1)%3]  ]
        ]);
      }
      // Then we solve the simultaneous equations in the remaining dimensions
      var inverse = solver.inverse().elements;
      var x = N[0]*A[0] + N[1]*A[1] + N[2]*A[2];
      var y = O[0]*B[0] + O[1]*B[1] + O[2]*B[2];
      var intersection = [
        inverse[0][0] * x + inverse[0][1] * y,
        inverse[1][0] * x + inverse[1][1] * y
      ];
      var anchor = [];
      for (var j = 1; j <= 3; j++) {
        // This formula picks the right element from intersection by
        // cycling depending on which element we set to zero above
        anchor.push((i == j) ? 0 : intersection[(j + (5 - i)%3)%3]);
      }
      return Line.create(anchor, direction);
    }
  },

  // Returns the point in the plane closest to the given point
  pointClosestTo: function(point) {
    var P = point.elements || point;
    var A = this.anchor.elements, N = this.normal.elements;
    var dot = (A[0] - P[0]) * N[0] + (A[1] - P[1]) * N[1] + (A[2] - (P[2] || 0)) * N[2];
    return Vector.create([P[0] + N[0] * dot, P[1] + N[1] * dot, (P[2] || 0) + N[2] * dot]);
  },

  // Returns a copy of the plane, rotated by t radians about the given line
  // See notes on Line#rotate.
  rotate: function(t, line) {
    var R = Matrix.Rotation(t, line.direction).elements;
    var C = line.pointClosestTo(this.anchor).elements;
    var A = this.anchor.elements, N = this.normal.elements;
    var C1 = C[0], C2 = C[1], C3 = C[2], A1 = A[0], A2 = A[1], A3 = A[2];
    var x = A1 - C1, y = A2 - C2, z = A3 - C3;
    return Plane.create([
      C1 + R[0][0] * x + R[0][1] * y + R[0][2] * z,
      C2 + R[1][0] * x + R[1][1] * y + R[1][2] * z,
      C3 + R[2][0] * x + R[2][1] * y + R[2][2] * z
    ], [
      R[0][0] * N[0] + R[0][1] * N[1] + R[0][2] * N[2],
      R[1][0] * N[0] + R[1][1] * N[1] + R[1][2] * N[2],
      R[2][0] * N[0] + R[2][1] * N[1] + R[2][2] * N[2]
    ]);
  },

  // Returns the reflection of the plane in the given point, line or plane.
  reflectionIn: function(obj) {
    if (obj.normal) {
      // obj is a plane
      var A = this.anchor.elements, N = this.normal.elements;
      var A1 = A[0], A2 = A[1], A3 = A[2], N1 = N[0], N2 = N[1], N3 = N[2];
      var newA = this.anchor.reflectionIn(obj).elements;
      // Add the plane's normal to its anchor, then mirror that in the other plane
      var AN1 = A1 + N1, AN2 = A2 + N2, AN3 = A3 + N3;
      var Q = obj.pointClosestTo([AN1, AN2, AN3]).elements;
      var newN = [Q[0] + (Q[0] - AN1) - newA[0], Q[1] + (Q[1] - AN2) - newA[1], Q[2] + (Q[2] - AN3) - newA[2]];
      return Plane.create(newA, newN);
    } else if (obj.direction) {
      // obj is a line
      return this.rotate(Math.PI, obj);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      return Plane.create(this.anchor.reflectionIn([P[0], P[1], (P[2] || 0)]), this.normal);
    }
  },

  // Sets the anchor point and normal to the plane. If three arguments are specified,
  // the normal is calculated by assuming the three points should lie in the same plane.
  // If only two are sepcified, the second is taken to be the normal. Normal vector is
  // normalised before storage.
  setVectors: function(anchor, v1, v2) {
    anchor = Vector.create(anchor);
    anchor = anchor.to3D(); if (anchor === null) { return null; }
    v1 = Vector.create(v1);
    v1 = v1.to3D(); if (v1 === null) { return null; }
    if (typeof(v2) == 'undefined') {
      v2 = null;
    } else {
      v2 = Vector.create(v2);
      v2 = v2.to3D(); if (v2 === null) { return null; }
    }
    var A1 = anchor.elements[0], A2 = anchor.elements[1], A3 = anchor.elements[2];
    var v11 = v1.elements[0], v12 = v1.elements[1], v13 = v1.elements[2];
    var normal, mod;
    if (v2 !== null) {
      var v21 = v2.elements[0], v22 = v2.elements[1], v23 = v2.elements[2];
      normal = Vector.create([
        (v12 - A2) * (v23 - A3) - (v13 - A3) * (v22 - A2),
        (v13 - A3) * (v21 - A1) - (v11 - A1) * (v23 - A3),
        (v11 - A1) * (v22 - A2) - (v12 - A2) * (v21 - A1)
      ]);
      mod = normal.modulus();
      if (mod === 0) { return null; }
      normal = Vector.create([normal.elements[0] / mod, normal.elements[1] / mod, normal.elements[2] / mod]);
    } else {
      mod = Math.sqrt(v11*v11 + v12*v12 + v13*v13);
      if (mod === 0) { return null; }
      normal = Vector.create([v1.elements[0] / mod, v1.elements[1] / mod, v1.elements[2] / mod]);
    }
    this.anchor = anchor;
    this.normal = normal;
    return this;
  }
};

// Constructor function
Plane.create = function(anchor, v1, v2) {
  var P = new Plane();
  return P.setVectors(anchor, v1, v2);
};

// X-Y-Z planes
Plane.XY = Plane.create(Vector.Zero(3), Vector.k);
Plane.YZ = Plane.create(Vector.Zero(3), Vector.i);
Plane.ZX = Plane.create(Vector.Zero(3), Vector.j);
Plane.YX = Plane.XY; Plane.ZY = Plane.YZ; Plane.XZ = Plane.ZX;



return {
  $V : Vector.create,
  $M : Matrix.create,
  $L : Line.create,
  $P : Plane.create,
  Matrix: Matrix,
  Vector: Vector,
  Plane: Plane
}

});
define("Expression", ["Range", "lib/sylvester"], function(Range, Sylvester){

	function Expression(value) {
        this.children = [];
        this.const_value = value;
        this.var_name;
        this.call_funcname;
        this.call_argnames = [];
        this.type = "C";
    };

    function isMatrix(x){
        return _.isArray(x) && _.isArray(x[0]);
    }

    function isVector(x){
        return _.isArray(x) && !_.isArray(x[0]);
    }

    function getValueObject(x){
        if (isMatrix(x)){
            return Sylvester.$M(x);
        } else if (isVector(x)){
            return Sylvester.$V(x);
        } else {
            return x;
        }
    }
    
    Sylvester.Matrix.prototype.toString = function(){
        var x = _.map(this.elements, function(y){ return "["+y.join(',')+"]"; });
        return "["+x.join(',')+"]";
    }

    Sylvester.Vector.prototype.toString = function(){
        return "["+this.elements.join(',')+"]";
    }
    
    Expression.prototype.evaluate = function(context) {
        switch (this.type){

            case "!":
                return ! this.children[0].evaluate(context);
                break;
            case "&&":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return false; 
                }

                if (_.isArray(c1) || _.isArray(c2)){
                    return true;
                }
                
                return c1 && c2;
                break;
            case "||":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return true; 
                }

                if (_.isArray(c1) || _.isArray(c2)){
                    return true;
                }
                return c1 || c2;
                break;
            case "*":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return undefined 
                }
                return c1 + "*" + c2;

                if (_.isArray(c1) || _.isArray(c2)){

                    var v1 = getValueObject(c1);
                    var v2 = getValueObject(c2);

                    if (isVector(c1) && isVector(c2)){
                        return v1.dot(v2);
                    }

                    if (isVector(c1) && isMatrix(c2)){
                        return [v1.dot(v2.col(1)),
                                v1.dot(v2.col(2)),
                                v1.dot(v2.col(3))];
                    }

                    if (_.isNumber(c1)){
                        return v2.multiply(v1);
                    }

                    return (v1.multiply(v2));

                }

                return c1 * c2;
                
                break;
            case "/":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return undefined 
                }
                
                return c1 + "/" + c2;

                if (_.isArray(c1) || _.isArray(c2)){

                    var v1 = getValueObject(c1);
                    var v2 = getValueObject(c2);

                    if (_.isArray(c1) && _.isArray(c2)){
                        return undefined;
                    }

                    if (isMatrix(c1) && _.isNumber(c2)){
                        return v1.multiply(1/v2);
                    }

                    if (_.isNumber(c1) && isMatrix(c2)){
                        var result = [];

                        for (var i = 0; i < c2.length; i++){
                            var a1 = [];
                            for (var j = 0; j < c2[i].length; j++){
                                a1[j] = c1 / c2[i][j];
                            }
                            result.push(a1);
                        }
                        return result;
                    }

                    if (isVector(c1) && _.isNumber(c2)) {
                        return v1.multiply(1/v2);
                    }

                    if (_.isNumber(c1) && isVector(c2)) {
                        return v2.multiply(1/v1);   
                    }
                } 

                return c1 / c2;

                break;
            case "%":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return undefined 
                }

                if (_.isArray(c1) || _.isArray(c2)){
                    return undefined;
                }

                return c1 % c2;
                break;
            case "+":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);
                
                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return undefined 
                }
                return c1 + "+" + c2;

                if (_.isArray(c1) && _.isArray(c2)){
                    //matrices
                    if (isMatrix(c1) && isMatrix(c2)){
                        var minLength = Math.min(c1.length, c2.length);
                        var result = [];

                        for (var i = 0; i < minLength; i++){
                            var a1 = [];
                            for (var j = 0; j < c1[i].length; j++){
                                a1[j] = c1[i][j] + c2[i][j];                                
                            }
                            result.push(a1);
                        }
                        return result; 
                    } else if (isMatrix(c1) || isMatrix(c2)){
                        return undefined;
                    }
                    return [c1[0] + c2[0], c1[1] + c2[1], c1[2] + c2[2]];
                } else if (_.isArray(c1) || _.isArray(c2)){
                    return undefined;
                } else {
                    return c1 + c2;
                }
                break;
            case "-":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                return c1 + "-" + c2;
                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return undefined 
                }

                if (_.isArray(c1) && _.isArray(c2)){

                    //matrices
                    if (_.isArray(c1[0]) && _.isArray(c2[0])){
                        var minLength = Math.min(c1.length, c2.length);
                        var result = [];

                        for (var i = 0; i < minLength; i++){
                            var a1 = [];
                            for (var j = 0; j < c1[i].length; j++){
                                a1[j] = c1[i][j] - c2[i][j];                                
                            }
                            result.push(a1);
                        }
                        return result; 
                    }

                    return [c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]];
                } else if (_.isArray(c1) || _.isArray(c2)){
                    return undefined;
                } else {
                    return c1 - c2;
                }
                break;
            case "<":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return false; 
                }

                if (_.isArray(c1) || _.isArray(c2)){
                    return false;
                }
                return c1 < c2;
                break;
            case "<=":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return true; 
                }

                if (_.isArray(c1) || _.isArray(c2)){
                    return true;
                }
                return c1 <= c2;
                break;
            case "==":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return false; 
                }

                if ((isVector(c1) && isVector(c2))
                    || (isMatrix(c1) && isMatrix(c2))){
                    var v1 = getValueObject(c1);
                    var v2 = getValueObject(c2);
                    return v1.eql(v2);
                }
                if (_.isArray(c1) || _.isArray(c2)){
                    return false;
                }
                return c1 == c2;
                break;
            case "!=":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return false; 
                }

                if ((isVector(c1) && isVector(c2))
                    || (isMatrix(c1) && isMatrix(c2))){
                    var v1 = getValueObject(c1);
                    var v2 = getValueObject(c2);
                    return !v1.eql(v2);
                }

                if (_.isArray(c1) || _.isArray(c2)){
                    return true;
                }
                return c1 != c2;
                break;
            case ">=":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return true; 
                }

                if (_.isArray(c1) || _.isArray(c2)){
                    return true;
                }

                return c1 >= c2;
                break;
            case ">":
                var c1 = this.children[0].evaluate(context);
                var c2 = this.children[1].evaluate(context);

                if (_.isUndefined(c1) || _.isUndefined(c2) || _.isNaN(c1) || _.isNaN(c2)){
                    return false; 
                }

                if (_.isArray(c1) || _.isArray(c2)){
                    return false;
                }

                return c1 > c2;
                break;
            case "?:":
                var v = this.children[0].evaluate(context);
                return this.children[v ? 1 : 2].evaluate(context);
                break;
            case "I":
                //return -this.children[0].evaluate(context);
            	return "-"+this.children[0].evaluate(context);
                break;
            case "C":
                return this.const_value;
                break;
            case "R":
                var v1 = this.children[0].evaluate(context);
                var v2 = this.children[1].evaluate(context);
                var v3 = this.children[2].evaluate(context);
                if (_.isNumber(v1) && _.isNumber(v2) && _.isNumber(v3)) {
                    return new Range(v1, v2, v3);
                }
                return undefined;
                break;
            case "V":
                var vec = [];
                for (var i = 0; i < this.children.length; i++) {
                    vec.push(this.children[i].evaluate(context));
                };
                return vec;
                break;
            case "L":
                //TODO: move this to context ?
                return this.var_name // context.vars[this.var_name]
                //return context.lookupVariable(this.var_name);
                break;
            case "[]":
                return this.children[0].evaluate(context)[this.children[1].evaluate(context)];
                break;
            case "F":
                var argvalues =[];
                for (var i = 0; i < this.children.length; i++){
                      argvalues.push(this.children[i].evaluate(context));
                }
                return context.evaluateFunction(this.call_funcname, this.call_argnames, argvalues);
                
                break;
            default: 
                console.log("todo - evaluate expression", this);
        }    
    };

    return Expression;
});
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
    
    var centerVector = (typeof height == 'string' || height instanceof String) ? [0,0,height+"/2"] : [0,0,height/2];
    console.log("isCentered",isCentered,centerVector);
	coffeescadArgs.center = (isCentered === true || isCentered ===false) ? isCentered : "["+centerVector+"]";
	
	return _.template('new Cylinder({h: <%=height%>,r1: <%=radiusStart%>, r2: <%=radiusEnd%>, center: <%=center%>, $fn: <%=resolution%>})', coffeescadArgs);
		
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
            coffeescadArgs.size = [size,size,size];
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
        //, $fn: <%= resolution%>
        //TODO:cleanup 
        if ("center" in context.vars)
        {
        	return _.template('new Cube({center: [<%=String(centerVector)%>],size: [<%= size %>]})', coffeescadArgs);
        }
        return _.template('new Cube({size: [<%= size %>]})', coffeescadArgs);
        
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

define("TransformModules", ["Globals", "Context"], function(Globals, Context){

    function TransformModule(factory){
    	var factory = factory;

		this.transformChildren = function (children, context, cb) {
		  var childModules = []

		    for (var i = 0; i < children.length; i++) {

		        var childInst = children[i];
		        childInst.argvalues = [];

		        _.each(childInst.argexpr, function(expr,index,list) {
		            childInst.argvalues.push(expr.evaluate(context));
		        });
		        var childAdaptor = factory.getAdaptor(childInst);
		        var transformedChild = childAdaptor.evaluate(context, childInst);
		        if (transformedChild instanceof(Array))
            	{
		        	transformedChild = _.compact(transformedChild);
            	}
                if (transformedChild){
                    transformedChild += cb();
                    childModules.push(transformedChild);
                }
		    };

		    if (childModules.length == 1){
		        return childModules[0];
		    } else if (childModules.length > 1) {
		        return _.first(childModules)+".union([" + _.rest(childModules) + "])";
		    }

		}
    };


    function ColorTransform(a){
      TransformModule.call(this, a);
    };

    ColorTransform.prototype.evaluate = function(parentContext, inst){

        inst.argvalues = [];

        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });

        var context = Context.newContext(parentContext, ["c", "alpha"], [], inst);

        var c = Context.contextVariableLookup(context, "c", undefined);
        var color = "white";
        if (c !== undefined){
            color = _.isString(c)? colorNameLookup[Globals.stripString(c.toLowerCase())] : c;
        }

        var alpha = Context.contextVariableLookup(context, "alpha", undefined);
        if (alpha !== undefined){
            color[3] = alpha;
        }

        return this.transformChildren(inst.children, context, function(){
            return _.template('.color(<%=color%>)', {color:color});
        });
    };



    function MirrorTransform(a){
        TransformModule.call(this, a);
    };

    MirrorTransform.prototype.evaluate = function(parentContext, inst){

        inst.argvalues = [];

        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });

        var context = Context.newContext(parentContext, ["v"], [], inst);

        var v = Context.contextVariableLookup(context, "v", [0,0,0]);

        if (!(v instanceof Array)){
            var val = v;
            v = [val,val,val];
        }

        return this.transformChildren(inst.children, context, function(){
            return _.template('.mirrored(CSG.Plane.fromNormalAndPoint([<%=v%>], [0,0,0]))', {v:v});
        });
    };


    function RotateTransform(a){
        TransformModule.call(this, a);
    };

    RotateTransform.prototype.evaluate = function(parentContext, inst){

        inst.argvalues = [];

        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });

        var context = Context.newContext(parentContext, ["a","v"], [], inst);

        var a = Context.contextVariableLookup(context, "a", undefined);

        if (_.isArray(a)){
            return this.transformChildren(inst.children, context, function(){
                return _.template('.rotate([<%=degreeX%>,<%=degreeY%>,<%=degreeZ%>])', {degreeX:a[0],degreeY:a[1],degreeZ:a[2]});
            });
        } else {
            var v = Context.contextVariableLookup(context, "v", undefined);
            return this.transformChildren(inst.children, context, function(){
                if (v === undefined || v.toString() =="0,0,0"){
                    v = [0,0,1];
                }
                return _.template('.transform(CSG.Matrix4x4.rotation([0,0,0], [<%=vector%>], <%=degree%>))', {degree:a, vector:v});
            });
        }
    };


    function ScaleTransform(a){
        TransformModule.call(this, a);
    };

    ScaleTransform.prototype.evaluate = function(parentContext, inst){

        inst.argvalues = [];

        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });

        var context = Context.newContext(parentContext, ["v"], [], inst);

        var v = Context.contextVariableLookup(context, "v", [0,0,0]);

        if (!(v instanceof Array)){
            var val = v;
            v = [val,val,val];
        }

        return this.transformChildren(inst.children, context, function(){
            return _.template('.scale([<%=v%>])', {v:v});
        });
    };


    function TranslateTransform(a){
        TransformModule.call(this, a);
    };

    TranslateTransform.prototype.evaluate = function(parentContext, inst){

        inst.argvalues = [];

        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });

        var context = Context.newContext(parentContext, ["v"], [], inst);

        var v = Context.contextVariableLookup(context, "v", [0,0,0]);

        //return _.template('.translate([<%=v%>])', {v:v});
        
        return this.transformChildren(inst.children, context, function(){
        	result = _.template('.translate([<%=v%>])', {v:v});
            return result;
        });

    };

    function RenderModule(a){
        TransformModule.call(this, a);
    };

    RenderModule.prototype.evaluate = function(parentContext, inst){

        inst.argvalues = [];

        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });

        var context = Context.newContext(parentContext, [], [], inst);


        var childIndex = 0;
        if (inst.argvalues[0] !== undefined){
            childIndex = inst.argvalues[0];
        }

        return this.transformChildren(inst.children, context, function(){
            return "";
        });
    };


	function MultimatrixTransform(a){
        TransformModule.call(this, a);

        this.transposeMatrix = function(m) {
            var t = []
            var ti = 0;

            for (var j in _.range(4)){
                for (var i in _.range(4)){
                    t[ti++] = m[i][j];
                }
            }
            return t;
        };
    };

    MultimatrixTransform.prototype.evaluate = function(parentContext, inst){

        inst.argvalues = [];

        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });

        var context = Context.newContext(parentContext, ["m"], [], inst);

        var m = Context.contextVariableLookup(context, "m", undefined);

        var matrix;
        if (m !== undefined){
            matrix = this.transposeMatrix(m);
        }

        return this.transformChildren(inst.children, context, function(){
            return _.template('.transform(new CSG.Matrix4x4( [<%= matrix %>] ))', {matrix:matrix});
        });
    };

    function ExtrudeTransform(a){
        TransformModule.call(this, a);
    };

    ExtrudeTransform.prototype.evaluate = function(parentContext, inst){
        inst.argvalues = [];

        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });


        var context = Context.newContext(parentContext, ["file", "layer", "height", "origin", "scale", "center", "twist", "slices", "$fn", "$fs", "$fa"], [], inst);

        var height = Context.contextVariableLookup(context, "height", 100);
        var center = Context.contextVariableLookup(context, "center", false);
        var twist = Number(Context.contextVariableLookup(context, "twist", 0))/-1; // note inverse for coffeescad
        var slices = Context.contextVariableLookup(context, "slices", undefined);
        var fn = Context.contextVariableLookup(context, "$fn", Globals.FN_DEFAULT);
        var fs = Context.contextVariableLookup(context, "$fs", Globals.FS_DEFAULT);
        var fa = Context.contextVariableLookup(context, "$fa", Globals.FA_DEFAULT);

        if (slices === undefined){
            slices = parseInt(Math.max(2, Math.abs(Context.get_fragments_from_r(height, context) * twist / 360)));
        }

        return this.transformChildren(inst.children, context, function(){
            var template = _.template(".extrude({offset: [0, 0, <%=height%>], twistangle: <%=twist%>,twiststeps: <%=slices%>})", {height:height, twist:twist, slices:slices});
            if (center){
                var offset = -height/2;
                template += _.template(".translate([0,0,<%=offset%>])", {offset:offset});
            }
            return template;
        });
    };


    var colorNameLookup = {"indianred":[0.804,0.361,0.361], "lightcoral":[0.941,0.502,0.502], "salmon":[0.980,0.502,0.447], "darksalmon":[0.914,0.588,0.478], "lightsalmon":[1,0.627,0.478], "red":[1,0,0], "crimson":[0.863,0.078,0.235], "firebrick":[0.698,0.133,0.133], "darkred":[0.545,0,0], "pink":[1,0.753,0.796], "lightpink":[1,0.714,0.757], "hotpink":[1,0.412,0.706], "deeppink":[1,0.078,0.576], "mediumvioletred":[0.780,0.082,0.522], "palevioletred":[0.859,0.439,0.576], "lightsalmon":[1,0.627,0.478], "coral":[1,0.498,0.314], "tomato":[1,0.388,0.278], "orangered":[1,0.271,0], "darkorange":[1,0.549,0], "orange":[1,0.647,0], "gold":[1,0.843,0], "yellow":[1,1,0], "lightyellow":[1,1,0.878], "lemonchiffon":[1,0.980,0.804], "lightgoldenrodyellow":[0.980,0.980,0.824], "papayawhip":[1,0.937,0.835], "moccasin":[1,0.894,0.710], "peachpuff":[1,0.855,0.725], "palegoldenrod":[0.933,0.910,0.667], "khaki":[0.941,0.902,0.549], "darkkhaki":[0.741,0.718,0.420], "lavender":[0.902,0.902,0.980], "thistle":[0.847,0.749,0.847], "plum":[0.867,0.627,0.867], "violet":[0.933,0.510,0.933], "orchid":[0.855,0.439,0.839], "fuchsia":[1,0,1], "magenta":[1,0,1], "mediumorchid":[0.729,0.333,0.827], "mediumpurple":[0.576,0.439,0.859], "blueviolet":[0.541,0.169,0.886], "darkviolet":[0.580,0,0.827], "darkorchid":[0.600,0.196,0.800], "darkmagenta":[0.545,0,0.545], "purple":[0.502,0,0.502], "indigo":[0.294,0,0.510], "darkslateblue":[0.282,0.239,0.545], "slateblue":[0.416,0.353,0.804], "mediumslateblue":[0.482,0.408,0.933], "greenyellow":[0.678,1,0.184], "chartreuse":[0.498,1,0], "lawngreen":[0.486,0.988,0], "lime":[0,1,0], "limegreen":[0.196,0.804,0.196], "palegreen":[0.596,0.984,0.596], "lightgreen":[0.565,0.933,0.565], "mediumspringgreen":[0,0.980,0.604], "springgreen":[0,1,0.498], "mediumseagreen":[0.235,0.702,0.443], "seagreen":[0.180,0.545,0.341], "forestgreen":[0.133,0.545,0.133], "green":[0,0.502,0], "darkgreen":[0,0.392,0], "yellowgreen":[0.604,0.804,0.196], "olivedrab":[0.420,0.557,0.137], "olive":[0.502,0.502,0], "darkolivegreen":[0.333,0.420,0.184], "mediumaquamarine":[0.400,0.804,0.667], "darkseagreen":[0.561,0.737,0.561], "lightseagreen":[0.125,0.698,0.667], "darkcyan":[0,0.545,0.545], "teal":[0,0.502,0.502], "aqua":[0,1,1], "cyan":[0,1,1], "lightcyan":[0.878,1,1], "paleturquoise":[0.686,0.933,0.933], "aquamarine":[0.498,1,0.831], "turquoise":[0.251,0.878,0.816], "mediumturquoise":[0.282,0.820,0.800], "darkturquoise":[0,0.808,0.820], "cadetblue":[0.373,0.620,0.627], "steelblue":[0.275,0.510,0.706], "lightsteelblue":[0.690,0.769,0.871], "powderblue":[0.690,0.878,0.902], "lightblue":[0.678,0.847,0.902], "skyblue":[0.529,0.808,0.922], "lightskyblue":[0.529,0.808,0.980], "deepskyblue":[0,0.749,1], "dodgerblue":[0.118,0.565,1], "cornflowerblue":[0.392,0.584,0.929], "royalblue":[0.255,0.412,0.882], "blue":[0,0,1], "mediumblue":[0,0,0.804], "darkblue":[0,0,0.545], "navy":[0,0,0.502], "midnightblue":[0.098,0.098,0.439], "cornsilk":[1,0.973,0.863], "blanchedalmond":[1,0.922,0.804], "bisque":[1,0.894,0.769], "navajowhite":[1,0.871,0.678], "wheat":[0.961,0.871,0.702], "burlywood":[0.871,0.722,0.529], "tan":[0.824,0.706,0.549], "rosybrown":[0.737,0.561,0.561], "sandybrown":[0.957,0.643,0.376], "goldenrod":[0.855,0.647,0.125], "darkgoldenrod":[0.722,0.525,0.043], "peru":[0.804,0.522,0.247], "chocolate":[0.824,0.412,0.118], "saddlebrown":[0.545,0.271,0.075], "sienna":[0.627,0.322,0.176], "brown":[0.647,0.165,0.165], "maroon":[0.502,0,0], "white":[1,1,1], "snow":[1,0.980,0.980], "honeydew":[0.941,1,0.941], "mintcream":[0.961,1,0.980], "azure":[0.941,1,1], "aliceblue":[0.941,0.973,1], "ghostwhite":[0.973,0.973,1], "whitesmoke":[0.961,0.961,0.961], "seashell":[1,0.961,0.933], "beige":[0.961,0.961,0.863], "oldlace":[0.992,0.961,0.902], "floralwhite":[1,0.980,0.941], "ivory":[1,1,0.941], "antiquewhite":[0.980,0.922,0.843], "linen":[0.980,0.941,0.902], "lavenderblush":[1,0.941,0.961], "mistyrose":[1,0.894,0.882], "gainsboro":[0.863,0.863,0.863], "lightgrey":[0.827,0.827,0.827], "silver":[0.753,0.753,0.753], "darkgray":[0.663,0.663,0.663], "gray":[0.502,0.502,0.502], "dimgray":[0.412,0.412,0.412], "lightslategray":[0.467,0.533,0.600], "slategray":[0.439,0.502,0.565], "darkslategray":[0.184,0.310,0.310], "black":[0,0,0]};

	return {
		Translate: TranslateTransform,
		Scale: ScaleTransform,
		Rotate: RotateTransform,
		Mirror: MirrorTransform,
		Color: ColorTransform,
		Render: RenderModule,
		Multimatrix: MultimatrixTransform,
		Extrude: ExtrudeTransform
	}
});

define("ControlModules", ["Globals", "Context", "Range"], function(Globals, Context, Range){

	function ControlModule(factory){
        this.factory = factory;
    };
    
    function IfStatement(a){
        ControlModule.call(this, a);
    };

    IfStatement.prototype.evaluate = function(parentContext, inst){
        inst.argvalues = [];

        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });

        var context = Context.newContext(parentContext, [], [], inst);

        var childrenToEvaluate = (inst.argvalues.length > 0 && inst.argvalues[0])? inst.children : inst.else_children;

        var childModules = [];

        for (var i = 0; i < childrenToEvaluate.length; i++) {

            var childInst = childrenToEvaluate[i];

            childInst.argvalues = [];

            _.each(childInst.argexpr, function(expr,index,list) {
                childInst.argvalues.push(expr.evaluate(context));
            });

            var childAdaptor = this.factory.getAdaptor(childInst);

            childModules.push(childAdaptor.evaluate(context, childInst));
        };
        if (_.isEmpty(childModules)){
            return undefined;
        } else {
            if (childModules.length > 1){
                return _.first(childModules)+".union([" + _.rest(childModules) + "])";
            } else {
                return childModules[0];
            }
        }
    };

    function ForLoopStatement(factory, args){
        ControlModule.call(this, factory);
        this.csgOp = args.csgOp;
        this.evaluatedChildren = [];

        this.forEval = function(parentEvaluatedChildren, inst, recurs_length, call_argnames, call_argvalues, arg_context) {

            this.evaluatedChildren = parentEvaluatedChildren;

            if (call_argnames.length > recurs_length) {
                var it_name = call_argnames[recurs_length];
                var it_values = call_argvalues[recurs_length];
                var context = new Context(arg_context);

                if (it_values instanceof Range) {
                    var range = it_values;
                    if (range.end < range.begin) {
                        var t = range.begin;
                        range.begin = range.end;
                        range.end = t;
                    }
                    if (range.step > 0 && (range.begin-range.end)/range.step < 10000) {
                        for (var i = range.begin; i <= range.end; i += range.step) {
                            context.setVariable(it_name, i);
                            this.forEval(this.evaluatedChildren, inst, recurs_length+1, call_argnames, call_argvalues, context);
                        }
                    }
                }
                else if (_.isArray(it_values)) {
                    for (var i = 0; i < it_values.length; i++) {
                        context.setVariable(it_name, it_values[i]);
                        this.forEval(this.evaluatedChildren, inst, recurs_length+1, call_argnames, call_argvalues, context);
                    }
                }
            } else if (recurs_length > 0) {     
                var evaluatedInstanceChildren = inst.evaluateChildren(arg_context);
                if (_.isArray(evaluatedInstanceChildren)){
                    this.evaluatedChildren = this.evaluatedChildren.concat(evaluatedInstanceChildren);
                } else {
                    this.evaluatedChildren.push(evaluatedInstanceChildren);
                }
            }
            if (_.isArray(this.evaluatedChildren)){
                // remove empty arrays (e.g. for loops containing only echo statements)
                this.evaluatedChildren = _.reject(this.evaluatedChildren, function(x){ return _.isEmpty(x); });
            }

            // Note: we union here so subsequent actions (e.g. translate) can be performed on the entire result of the for loop.
            if (_.isArray(this.evaluatedChildren) && this.evaluatedChildren.length > 1){
                var unionedEvaluatedChildren = _.first(this.evaluatedChildren)+"."+this.csgOp+"([" + _.rest(this.evaluatedChildren) + "])";
                this.evaluatedChildren = [unionedEvaluatedChildren];
            }
            
            return this.evaluatedChildren;
        };
    };

    ForLoopStatement.prototype.evaluate = function(context, inst) {

        if (inst.context === undefined){
            inst.context = context;
        }
        return this.forEval([], inst, 0, inst.argnames, inst.argvalues, inst.context);
    };

    function Echo(a){
        ControlModule.call(this, a);
    };

    Echo.prototype.evaluate = function(parentContext, inst){
        var context = new Context(parentContext);
        var argvalues = [];
        
        _.each(inst.argexpr, function(expr,index,list) {
            argvalues.push(Globals.convertForStrFunction(expr.evaluate(context)));
        });

        console.log(_.template("ECHO: <%=argvalues%>", {argvalues:argvalues}));

        return undefined;
    };


	return {
		Echo: Echo,
		ForLoopStatement: ForLoopStatement,
		IfStatement: IfStatement
	}

});
define("CSGModule", ["Globals", "Context"], function(Globals, Context){

	function CSGModule(factory, csgOperation){
        this.csgOperation = csgOperation;
        this.factory = factory;
    };

    CSGModule.prototype.evaluate = function(parentContext, inst){
        var context = new Context(parentContext);

        var childModules = []

        for (var i = 0; i < inst.children.length; i++) {

            var childInst = inst.children[i];
            childInst.argvalues = [];
            _.each(childInst.argexpr, function(expr,index,list) {
                childInst.argvalues.push(expr.evaluate(context));
            });
            
            var childAdaptor = this.factory.getAdaptor(childInst);
            var evaluatedChild = childAdaptor.evaluate(parentContext, childInst);
            if (evaluatedChild !== undefined){
                childModules.push(evaluatedChild);
            }
        };

        if (childModules.length <= 1){
            return childModules[0];
        } else {
            //return childModules[0] + "."+this.csgOperation+"([" + childModules.slice(1).join(',\n') + "])";
        	var indentLevel = Array(context.level).join("  ")
        	var csgOpResult = this.csgOperation+"(["+_.first(childModules)+',\n'+_.rest(childModules,0).join('\n'+indentLevel)+ "])";
            return csgOpResult;//childModules.join('\n'+indentLevel)+ "])";
        }
    };

    return CSGModule;	
});
define("ChildModule", ["Globals", "Context"], function(Globals, Context){

	function Child(factory){
		this.factory = factory;
    };

    Child.prototype.evaluate = function(parentContext, inst){
        console.log("evaluating child module")
        inst.argvalues = [];
        _.each(inst.argexpr, function(expr,index,list) {
            inst.argvalues.push(expr.evaluate(parentContext));
        });

        var context = Context.newContext(parentContext, [], [], inst);

        var childIndex = 0;
        if (inst.argvalues[0] !== undefined){
            childIndex = inst.argvalues[0];
        }

        var evaluatedChildren = [];

        for (var i = Globals.context_stack.length - 1; i >= 0; i--) {
            var ctx = Globals.context_stack[i];

            if (ctx.inst_p !== undefined){
                if (childIndex < ctx.inst_p.children.length) {

                    var childInst = ctx.inst_p.children[childIndex];

                    _.each(childInst.argexpr, function(expr,index,list) {
                        childInst.argvalues.push(expr.evaluate(ctx.inst_p.ctx));
                    });

                    var childAdaptor = this.factory.getAdaptor(childInst);
                    evaluatedChildren.push(childAdaptor.evaluate(ctx.inst_p.ctx, childInst));

                }
                return evaluatedChildren;
            }
            ctx = ctx.parentContext;
        };
        
        return undefined;
    };

    return Child;

});
define("ModuleAdaptor", ["Globals", "Context"], function(Globals, Context){

    function ModuleAdaptor(){};

    ModuleAdaptor.prototype.evaluate = function(parentContext, inst){
        console.log("adapting module", inst);
        inst.isSubmodule = true;
        return parentContext.evaluateModule(inst);
    };

    return ModuleAdaptor;

});
/*
  #	Module:			STL.js
  #	
  #	Description:	decode STL 3D file
  #					modified Devon Govett's bmp.js
  #
  #	Reference:
  #		STL specs.	http://en.wikipedia.org/wiki/STL_%28file_format%29#Binary_STL
  # 	BMP.js		http://devongovett.github.com/bmp.js/
  #      
  # Author(s):		Devon Govett provide a bmp decoding example.
  # 				C.T. Yeung modify to decode STL.
  #  
  # History:		
  # 20Dec11			1st crack at it								cty
  # 23Dec11			loading vertexies OK
  # 				need to test normal when rendering shades
  #                 rotation is off when passed 180 degrees		cty
  #
  # MIT LICENSE
  # Copyright (c) 2011 CT Yeung
  # Copyright (c) 2011 Devon Govett
  # 
  # Permission is hereby granted, free of charge, to any person obtaining a copy of this 
  # software and associated documentation files (the "Software"), to deal in the Software 
  # without restriction, including without limitation the rights to use, copy, modify, merge, 
  # publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons 
  # to whom the Software is furnished to do so, subject to the following conditions:
  # 
  # The above copyright notice and this permission notice shall be included in all copies or 
  # substantial portions of the Software.
  # 
  # THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
  # BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
  # NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
  # DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
  # OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  */  
  define('StlDecoder',[], function(){

	var HDR_LEN = 80;

	function STL(data) {

		var buf = new ArrayBuffer(data.length);
		this.data = new Uint8Array(buf);
		for (var i=0, dataLen=data.length; i<dataLen; i++) {
			this.data[i] = data.charCodeAt(i);
		}

	  	this.TYPE_ASCII = "ascii";
		this.TYPE_BINARY = "binary";
		this.dataType = "";

		this.ASCII_TITLE = "solid";
		this.TYPE_VERTEX = "vertex";
		this.TYPE_NORMAL = "normal";
		this.TYPE_END = "end"
		this.NOT_ASCII = -1;
		this.listVertex = null;
		this.listNormal = null;
		this.pos = 0;

		if(this.data.length<(HDR_LEN+4))
			throw 'STL file too small: ' + this.data.length;
	};

	STL.prototype.findEndPos = function(stt) {
	  var i = stt;
	  while(i<(this.data.length-1)) {
		  // seek linefeed
		  if(this.data[i]==10)
			  return i;
		  i++;
	  }			
	  return this.data.length-1;
	};
	
	STL.prototype.bin2String = function(sttPos, endPos) {
	  var buf="";
	  for(var i=sttPos; i<endPos; i++) {
		  var char = this.data[i].toString();
		  buf += String.fromCharCode(char);
	  }
	  return buf.replace('\r', '');
	};
	
	STL.prototype.readUInt16 = function() {
		var b1, b2;
		b1 = this.data[this.pos++];
		b2 = this.data[this.pos++] << 8;
		return b1 | b2;
	};
	
	STL.prototype.readUInt32 = function() {
		var b1, b2, b3, b4;
		b1 = this.data[this.pos++];
		b2 = this.data[this.pos++] << 8;
		b3 = this.data[this.pos++] << 16;
		b4 = this.data[this.pos++] << 24;
		var num = b1 | b2 | b3 | b4;
		return num;
	};
	
	STL.prototype.readReal32 = function() {
	  if(this.data.length<=this.pos+4)		// over run !!! error condition
		return 0;

	  var byteArray = [0,0,0,0];
	  byteArray[3] = this.data[this.pos++];
	  byteArray[2] = this.data[this.pos++];
	  byteArray[1] = this.data[this.pos++];
	  byteArray[0] = this.data[this.pos++];
	  
	  var sign = this.parseSign(byteArray);
	  var exponent = this.parseExponent(byteArray);
	  var mantissa = this.parseSignificand(byteArray);
	  var num = sign * exponent * mantissa;
	  return num;
	};
	
	STL.prototype.parseSign = function(byteArray) {
		if(byteArray[0]&0x80)
			return -1;
		return 1;
	};
	
	STL.prototype.parseExponent = function(byteArray) {
		var ex = (byteArray[0] & 0x7F);
		ex = ex << 1;

		if(0!=(byteArray[1] & 0x80))
			ex += 0x01;

		ex = Math.pow(2, ex-127);
		return ex;
	};
	
	STL.prototype.parseSignificand = function(byteArray) {
		var num=0;
		var bit;
		var mask = 0x40;
		for(var i=1; i<8; i++) {
			if(0!=(byteArray[1]&mask)) 
				num += 1 / Math.pow(2, i);
			mask = mask >> 1;
		}
		mask = 0x80;
		for(var j=0; j<8; j++) {
			if(0!=(byteArray[2]&mask))
				num += 1 / Math.pow(2, j+8);
			mask = mask >> 1;
		}
		mask = 0x80;
		for(var k=0; k<8; k++) {
			if(0!=(byteArray[2]&mask))
				num += 1 / Math.pow(2, k+16);
			mask = mask >> 1;
		}
		return (num+1);
	};
	
	STL.prototype.readNormal = function(index) {
		var sttPos = this.listNormal[index];
	  var endPos = this.findEndPos(sttPos);		// return EOF pos if not found
	  var vString = this.bin2String(sttPos, endPos);
	  var pos = vString.indexOf(this.TYPE_NORMAL);
	  vString = vString.substring(pos+this.TYPE_NORMAL.length+1, vString.length)
	  var list = vString.split(" ");

	  var normal = new Array();
	  for(var i=0; i<list.length; i++) {
		if(list[i].length)
			normal.push(Number(list[i]));
	  }

	  if(list.length<3)
		  return null;							// invalid normal

		return normal;
	};
	
	STL.prototype.readVertex = function(index) {
		var sttPos = this.listVertex[index];
	  var endPos = this.findEndPos(sttPos);		// return EOF pos if not found
	  var vString = this.bin2String(sttPos, endPos);
	  var pos = vString.indexOf(this.TYPE_VERTEX);
	  vString = vString.substring(pos+this.TYPE_VERTEX.length+1, vString.length);
	  var list = vString.split(" ");
	  
	  var vertex = new Array();
	  for(var i=0; i<list.length; i++) {
		if(list[i].length)
			vertex.push(Number(list[i]));
	  }	  
	  if(vertex.length!=3)
		  return null;							// invalid vertex

		return vertex;
	};
	
	STL.prototype.decode = function() {
		if(this.dataType.length) {
			return this.dataType;
		}		

		var str = this.bin2String(0, 10).toLocaleLowerCase();
		var endPos = 0;
		var sttPos = 0;

		if(str.indexOf(this.ASCII_TITLE)>=0) {
			this.dataType = this.TYPE_ASCII;
			this.listVertex = new Array();
			this.listNormal = new Array();

			while(endPos < (this.data.length-1)) {
				endPos = this.findEndPos(sttPos);		// return EOF pos if not found
				str = this.bin2String(sttPos, endPos);

				if(str.indexOf(this.TYPE_VERTEX)>=0) {
					this.listVertex.push(sttPos);
				} else if(str.indexOf(this.TYPE_NORMAL)>=0) {
					this.listNormal.push(sttPos);
				}

				sttPos = endPos+1;
			}
		} else {
			this.dataType = this.TYPE_BINARY;
		}

		return this.dataType;
	};

	STL.prototype.getCSG = function(){

		var csgPolygons = [];
		var numTriangles;
		
		if (this.dataType==this.TYPE_BINARY){
			this.pos = HDR_LEN;
			numTriangles = this.readUInt32();
		} else {
			this.pos = 0;
			numTriangles = this.listVertex.length/3;
		}
		
		if (this.dataType==this.TYPE_BINARY) {
			for (i=0; i<numTriangles; i++) {
				
				var csgVertices = [];

				var normal = [0,0,0];
				for(var j=0; j<3; j++) {
					normal[j] = this.readReal32();
				}

				var csgNormal = new CSG.Vector3D(normal);
				var csgPlane = new CSG.Plane(csgNormal, 1);

				for(var j=0; j<3; j++) {
					var x = this.readReal32();
					var y = this.readReal32();
					var z = this.readReal32();
					csgVertices.push(new CSG.Vertex(new CSG.Vector3D(x,y,z)));
				}

				this.pos += 2;

				csgPolygons.push(new CSG.Polygon(csgVertices, null, csgPlane));
			}
		} else {

			for (i=0; i<numTriangles; i++) {
				var csgVertices = [];
				for(var j=0; j<3; j++) {  
					var vtx = this.readVertex(i*3+j)
					csgVertices.push(new CSG.Vertex(new CSG.Vector3D(vtx)));
				}
				csgPolygons.push(new CSG.Polygon(csgVertices, null));
			}



		}

		return CSG.fromPolygons(csgPolygons);
	};

	STL.prototype.getCSGString = function(){

		var csgPolygons = [];
		var numTriangles;
		
		if (this.dataType==this.TYPE_BINARY){
			this.pos = HDR_LEN;
			numTriangles = this.readUInt32();
		} else {
			this.pos = 0;
			numTriangles = this.listVertex.length/3;
		}
		
		if (this.dataType==this.TYPE_BINARY) {
			for (i=0; i<numTriangles; i++) {
				
				var csgVertices = [];

				var normal = [0,0,0];
				for(var j=0; j<3; j++) {
					normal[j] = this.readReal32();
				}

				var csgPlane = _.template("new CSG.Plane(new CSG.Vector3D([<%=normal%>]), 1)", {normal: normal});

				for(var j=0; j<3; j++) {
					var x = this.readReal32();
					var y = this.readReal32();
					var z = this.readReal32();
					csgVertices.push(_.template("new CSG.Vertex(new CSG.Vector3D([<%=vertex%>]))", {vertex:[x,y,z]}));
				}
				this.pos += 2;

				csgPolygons.push(_.template("new CSG.Polygon([<%=vertices%>], null)", {vertices:csgVertices}));
			}
		} else {

			for (i=0; i<numTriangles; i++) {
				var csgVertices = [];
				for(var j=0; j<3; j++) {  
					var vertex = this.readVertex(i*3+j)
					csgVertices.push(_.template("new CSG.Vertex(new CSG.Vector3D([<%=vertex%>]))", {vertex:vertex}));
				}
				csgPolygons.push(_.template("new CSG.Polygon([<%=vertices%>], null)", {vertices:csgVertices}));
			}

		}

		return _.template("CSG.fromPolygons([<%=polygons%>])", {polygons:csgPolygons});
	};

	STL.prototype.drawWireFrame = function(context,		// [in] canvas context 
										   w, 			// [in] canvas width
										   h, 			// [in] canvas height
										   mag,			// [in] magnification
										   rX,
										   rY,
										   rZ) {
		var numTriangles;
		var i;
		
		if (this.dataType==this.TYPE_BINARY){
			this.pos = HDR_LEN;
			numTriangles = this.readUInt32();
		} else {
			numTriangles = this.listVertex.length/3;
		}
		
		if (this.dataType==this.TYPE_BINARY) {
			for (i=0; i<numTriangles; i++) {
				// retrieve normal
				var normal = [0,0,0];
				for(var j=0; j<3; j++) {
					normal[j] = this.readReal32();
				}				
				
				this.drawTriangles(context, w, h, mag, rX, rY, rZ);
				
				//var attr = this.readUInt16();				// retrieve attribute
				this.pos += 2;
			}
		} else {
			for (i=0; i<numTriangles; i++) {
				this.triangleIndex = i;
				this.drawTriangles(context, w, h, mag, rX, rY, rZ);
			}
		}			
	};
	
	STL.prototype.drawTriangles = function(context,		// [in] canvas context 
											w, 		// [in] canvas width
											h, 		// [in] canvas height
											mag,		// [in] magnification
											rX,		// [in] amount of rotation X
											rY,		// [in] amount of rotation Y
											rZ){		// [in] amount of rotation Z
		
		var vtx0 = [0,0,0];
		var vtx1 = [0,0,0];
		var offX = w/2;
		var offY = h/2;
		context.beginPath();
		
		// convert rotation from degrees to radian
		var radX = Math.PI / 180.0 * rX;
		var radY = Math.PI / 180.0 * rY;
		var radZ = Math.PI / 180.0 * rZ;	

		for(var j=0; j<3; j++) {  

			if (this.dataType==this.TYPE_ASCII){
				vtx1 = this.readVertex(this.triangleIndex*3+j)
			} else {
				vtx1[0] = this.readReal32();
				vtx1[1] = this.readReal32();
				vtx1[2] = this.readReal32();
			}

			//vtx1[0] = vtx1[0];
			var y = vtx1[1];
			var z = vtx1[2];
			vtx1[1] = Math.cos(radX)*y-Math.sin(radX)*z;
			vtx1[2] = Math.sin(radX)*y+Math.cos(radX)*z

			var x = vtx1[0];
			z = vtx1[2];
			vtx1[0] = Math.cos(radY)*x+Math.sin(radY)*z;
			//vtx1[1] = vtx1[1];
			vtx1[2] = -Math.sin(radY)*x+Math.cos(radY)*z;

			// draw 2 lengths of a triangle
			if (j==0) {
				context.moveTo(vtx1[0]*mag+ offX, vtx1[1]*mag+ offY);		      // move to 1st triangle corner
				vtx0[0] = vtx1[0];
				vtx0[1] = vtx1[1];
				vtx0[2] = vtx1[2];
			} else {
				context.lineTo(vtx1[0]*mag+ offX, vtx1[1]*mag+ offY);
			}

		} 
		// complete triangle		
		context.lineTo(vtx0[0]*mag+ offX, vtx0[1]*mag+ offY);
		// render on canvase
		context.stroke();
		context.closePath();
	};
	
	return STL;
});
define("ImportModule", ["Globals", "Context", "StlDecoder"], function(Globals, Context, StlDecoder){

	function Import(factory){
		this.factory = factory;
    };

    Import.prototype.evaluate = function(parentContext, inst){
        
        var context = new Context(parentContext);

        var argnames = ["file", "filename", "convexity"];
        var argexpr = [];

        context.args(argnames, argexpr, inst.argnames, inst.argvalues);
        
        var filename = Context.contextVariableLookup(context, "file", null)||Context.contextVariableLookup(context, "filename", null);

        var convexity = Context.contextVariableLookup(context, "convexity", 5);

        var importCache = Context.contextVariableLookup(context, "importCache", {});

        var fileContents = importCache[filename];

        if (fileContents !== undefined){

            var stlDecoder = new StlDecoder(atob(fileContents));
            stlDecoder.decode();
            return stlDecoder.getCSGString();
        }

        return undefined;
    };

    return Import;

});
define("CoffeescadSolidFactory", ["Context", "Globals",  "PrimitiveModules", "TransformModules", "ControlModules", "CSGModule", "ChildModule", "ModuleAdaptor", "ImportModule"], 
		function(Context, Globals,  PrimitiveModules, TransformModules, ControlModules, CSGModule, ChildModule, ModuleAdaptor, ImportModule){
	
	function CoffeescadSolidFactory(){};

    CoffeescadSolidFactory.prototype.getAdaptor = function(args) {
        switch(args.name){

            case "cube": 
                return new PrimitiveModules.Cube();
            case "sphere":
                return new PrimitiveModules.Sphere();
            case "cylinder":
                return new PrimitiveModules.Cylinder();
            case "polyhedron":
                return new PrimitiveModules.Polyhedron();
            case "circle":
                return new PrimitiveModules.Circle();
            case "square":
                return new PrimitiveModules.Square();
            case "polygon":
                return new PrimitiveModules.Polygon();
            case "union":
                return new CSGModule(this, "union");
            case "difference":
                return new CSGModule(this, "subtract");
            case "intersect":
            case "intersection":
                return new CSGModule(this, "intersect");
            case "translate":
                return new TransformModules.Translate(this);
            case "scale":
                return new TransformModules.Scale(this);
            case "rotate":
                return new TransformModules.Rotate(this);
            case "mirror":
                return new TransformModules.Mirror(this);
            case "linear_extrude":
                return new TransformModules.Extrude(this);
            case "color":
                return new TransformModules.Color(this);
            case "multmatrix":
                return new TransformModules.Multimatrix(this);
            case "render":
            case "assign": // Note: assign does the same as render in this case - re-evaluate the arguments and process the children.
                return new TransformModules.Render(this);
            case "echo":
                return new ControlModules.Echo(this);
            case "for":
                return new ControlModules.ForLoopStatement(this, {csgOp:"union"});
            case "intersection_for":
                return new ControlModules.ForLoopStatement(this, {csgOp:"intersect"});
            case "if":
                return new ControlModules.IfStatement(this);
            case "import": 
                return new ImportModule(this);
            case "child":
                return new ChildModule(this);
            default:
                return new ModuleAdaptor()
        }
    };
    
	return CoffeescadSolidFactory;
});

define("CoffeescadSolidFactorySingleton", ["CoffeescadSolidFactory"], function(CoffeescadSolidFactory){
    var factory = new CoffeescadSolidFactory();
	
	return {
        getInstance: function(){ 
            return factory; 
        }
    }
});

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

define("IfElseModuleInstantiation", ["ModuleInstantiation"], function(ModuleInstantiation){

    function IfElseModuleInstantiation() {
        ModuleInstantiation.call(this);
        this.name = "if";
        this.else_children = [];
    };

    IfElseModuleInstantiation.prototype = new ModuleInstantiation();

    IfElseModuleInstantiation.prototype.constructor = IfElseModuleInstantiation;

	return IfElseModuleInstantiation;
});
define('openscad-parser',["openscad-parser-ext", "ArgContainer", "ArgsContainer", "Expression", "ModuleInstantiation", "IfElseModuleInstantiation"], function(ext, ArgContainer, ArgsContainer, Expression, ModuleInstantiation, IfElseModuleInstantiation){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"program":3,"input":4,"statement":5,"inner_input":6,"statement_begin":7,"statement_end":8,"TOK_MODULE":9,"TOK_ID":10,"(":11,"arguments_decl":12,"optional_commas":13,")":14,";":15,"{":16,"}":17,"module_instantiation":18,"=":19,"expr":20,"TOK_FUNCTION":21,"BR":22,"children_instantiation":23,"module_instantiation_list":24,"if_statement":25,"TOK_IF":26,"ifelse_statement":27,"TOK_ELSE":28,"single_module_instantiation":29,"arguments_call":30,"!":31,"#":32,"%":33,"*":34,"TOK_TRUE":35,"TOK_FALSE":36,"TOK_UNDEF":37,".":38,"TOK_STRING":39,"TOK_NUMBER":40,"[":41,":":42,"]":43,"vector_expr":44,"/":45,"+":46,"-":47,"<":48,"LE":49,"EQ":50,"NE":51,"GE":52,">":53,"AND":54,"OR":55,"?":56,",":57,"argument_decl":58,"argument_call":59,"$accept":0,"$end":1},
terminals_: {2:"error",9:"TOK_MODULE",10:"TOK_ID",11:"(",14:")",15:";",16:"{",17:"}",19:"=",21:"TOK_FUNCTION",22:"BR",26:"TOK_IF",28:"TOK_ELSE",31:"!",32:"#",33:"%",34:"*",35:"TOK_TRUE",36:"TOK_FALSE",37:"TOK_UNDEF",38:".",39:"TOK_STRING",40:"TOK_NUMBER",41:"[",42:":",43:"]",45:"/",46:"+",47:"-",48:"<",49:"LE",50:"EQ",51:"NE",52:"GE",53:">",54:"AND",55:"OR",56:"?",57:","},
productions_: [0,[3,1],[4,0],[4,2],[6,0],[6,2],[5,2],[7,0],[7,6],[8,1],[8,3],[8,1],[8,4],[8,9],[8,1],[23,1],[23,3],[25,5],[27,1],[27,3],[18,2],[18,2],[18,1],[24,0],[24,2],[29,4],[29,2],[29,2],[29,2],[29,2],[20,1],[20,1],[20,1],[20,1],[20,3],[20,1],[20,1],[20,5],[20,7],[20,3],[20,4],[20,3],[20,3],[20,3],[20,3],[20,3],[20,3],[20,3],[20,3],[20,3],[20,3],[20,3],[20,3],[20,3],[20,2],[20,2],[20,2],[20,3],[20,5],[20,4],[20,4],[13,2],[13,0],[44,1],[44,4],[12,0],[12,1],[12,4],[58,1],[58,3],[30,0],[30,1],[30,4],[59,1],[59,3]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {
//console.log("YYState", yystate, yy);
var $0 = $$.length - 1;
switch (yystate) {
case 1: 
            return ext.processModule(yy);
        
break;
case 8:
            ext.stashModule($$[$0-4], $$[$0-2].argnames, $$[$0-2].argexpr);
            delete $$[$0-2];           
        
break;
case 9:           
        
break;
case 10:
            ext.popModule();
        
break;
case 11:
            ext.addModuleChild($$[$0]);
        
break;
case 12:  
            ext.addModuleAssignmentVar($$[$0-3], $$[$0-1]);
        
break;
case 13:
            ext.addModuleFunction($$[$0-7], $$[$0-1], $$[$0-5].argnames, $$[$0-5].argexpr);
            delete $$[$0-5];
        
break;
case 15:   
            this.$ = new ModuleInstantiation();
            if ($$[$0]) { 
                this.$.children.push($$[$0]);
            }
        
break;
case 16:
            this.$ = $$[$0-1]; 
        
break;
case 17:
            this.$ = new IfElseModuleInstantiation();
            this.$.argnames.push("");
            this.$.argexpr.push($$[$0-2]);

            if (this.$) {
                this.$.children = $$[$0].children;
            } else {
                for (var i = 0; i < $$[$0].children.size(); i++)
                    delete $$[$0].children[i];
            }
            delete $$[$0];
        
break;
case 18:
            this.$ = $$[$0];
        
break;
case 19:
            this.$ = $$[$0-2];
            if (this.$) {
                this.$.else_children = $$[$0].children;
            } else {
                for (var i = 0; i < $$[$0].children.size(); i++)
                    delete $$[$0].children[i];
            }
            delete $$[$0];
        
break;
case 20: 
            this.$ = $$[$0-1]; 
        
break;
case 21:   
            this.$ = $$[$0-1];
            if (this.$) {
                this.$.children = $$[$0].children;
            } else {
                for (var i = 0; i < $$[$0].children.length; i++)
                delete $$[$0].children[i];
            }   
            delete $$[$0];
        
break;
case 22:
            this.$ = $$[$0];
        
break;
case 23: 
            this.$ = new ModuleInstantiation(); 
        
break;
case 24:
            this.$ = $$[$0-1];
            if (this.$) {
                if ($$[$0]) {
                    this.$.children.push($$[$0]);
                }
            } else {
                delete $$[$0];
            }
        
break;
case 25:   
            this.$ = new ModuleInstantiation();
            this.$.name = $$[$0-3];
            this.$.argnames = $$[$0-1].argnames;
            this.$.argexpr = $$[$0-1].argexpr;
            delete $$[$0-1];
        
break;
case 26:
            this.$ = $$[$0];
            if (this.$) {
                this.$.tag_root = true;
            }                
        
break;
case 27:
            this.$ = $$[$0];
            if (this.$) {
                this.$.tag_highlight = true;
            }
        
break;
case 28:
            /* - NOTE: Currently unimplemented, therefore not displaying parts marked with %
                this.$ = $$[$0];
                if (this.$) {
                    this.$.tag_background = true;
                }
            */
            delete $$[$0];
            this.$ = undefined;
        
break;
case 29:
            delete $$[$0];
            this.$ = undefined;
        
break;
case 30:
            this.$ = new Expression(true); 
        
break;
case 31: 
            this.$ = new Expression(false); 
        
break;
case 32:
            this.$ = new Expression(undefined);
        
break;
case 33:
            this.$ = new Expression();
            this.$.type = "L";
            this.$.var_name = $$[$0];
        
break;
case 34:   
            this.$ = new Expression();
            this.$.type = "N";
            this.$.children.push($$[$0-2]);
            this.$.var_name = $$[$0];
        
break;
case 35: 
            this.$ = new Expression(String($$[$0])); 
        
break;
case 36:
            this.$ = new Expression(Number($$[$0]));
        
break;
case 37:
            var e_one = new Expression(1.0);
            this.$ = new Expression();
            this.$.type = "R";
            this.$.children.push($$[$0-3]);
            this.$.children.push(e_one);
            this.$.children.push($$[$0-1]);
        
break;
case 38:
            this.$ = new Expression();
            this.$.type = "R";
            this.$.children.push($$[$0-5]);
            this.$.children.push($$[$0-3]);
            this.$.children.push($$[$0-1]);
        
break;
case 39:
            this.$ = new Expression([]); 
        
break;
case 40:
            this.$ = $$[$0-2]; 
        
break;
case 41: 
            this.$ = new Expression();
            this.$.type = '*';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 42: 
            this.$ = new Expression();
            this.$.type = '/';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 43: 
            this.$ = new Expression();
            this.$.type = '%';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 44: 
            this.$ = new Expression();
            this.$.type = '+';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 45: 
            this.$ = new Expression();
            this.$.type = '-';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 46: 
            this.$ = new Expression();
            this.$.type = '<';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 47: 
            this.$ = new Expression();
            this.$.type = '<=';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 48: 
            this.$ = new Expression();
            this.$.type = '==';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 49: 
            this.$ = new Expression();
            this.$.type = '!=';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 50: 
            this.$ = new Expression();
            this.$.type = '>=';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 51: 
            this.$ = new Expression();
            this.$.type = '>';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 52: 
            this.$ = new Expression();
            this.$.type = '&&';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 53: 
            this.$ = new Expression();
            this.$.type = '||';
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]); 
        
break;
case 54: 
            this.$ = $$[$0]; 
        
break;
case 55: 
            this.$ = new Expression();
            this.$.type = 'I';
            this.$.children.push($$[$0]);
        
break;
case 56: 
            this.$ = new Expression();
            this.$.type = '!';
            this.$.children.push($$[$0]);
        
break;
case 57: this.$ = $$[$0-1]; 
break;
case 58: 
            this.$ = new Expression();
            this.$.type = '?:';
            this.$.children.push($$[$0-4]);
            this.$.children.push($$[$0-2]);
            this.$.children.push($$[$0]);
        
break;
case 59: 
            this.$ = new Expression();
            this.$.type = '[]';
            this.$.children.push($$[$0-3]);
            this.$.children.push($$[$0-1]);
        
break;
case 60: 
            this.$ = new Expression();
            this.$.type = 'F';
            this.$.call_funcname = $$[$0-3];
            this.$.call_argnames = $$[$0-1].argnames;
            this.$.children = $$[$0-1].argexpr;
            delete $$[$0-1];
        
break;
case 63: 
            this.$ = new Expression();
            this.$.type = 'V';
            this.$.children.push($$[$0]);
        
break;
case 64:   
            this.$ = $$[$0-3];
            this.$.children.push($$[$0]);
        
break;
case 65:
            this.$ = new ArgsContainer();
        
break;
case 66:
            this.$ = new ArgsContainer();
            this.$.argnames.push($$[$0].argname);
            this.$.argexpr.push($$[$0].argexpr);
            delete $$[$0];
        
break;
case 67:
            this.$ = $$[$0-3];
            this.$.argnames.push($$[$0].argname);
            this.$.argexpr.push($$[$0].argexpr);
            delete $$[$0];
        
break;
case 68:
            this.$ = new ArgContainer();
            this.$.argname = $$[$0];
            this.$.argexpr = undefined;
        
break;
case 69:
            this.$ = new ArgContainer();
            this.$.argname = $$[$0-2];
            this.$.argexpr = $$[$0];
        
break;
case 70:
            this.$ = new ArgsContainer();
        
break;
case 71: 
            this.$ = new ArgsContainer();
            this.$.argnames.push($$[$0].argname);
            this.$.argexpr.push($$[$0].argexpr);
            delete $$[$0];
        
break;
case 72: 
            this.$ = $$[$0-3];
            this.$.argnames.push($$[$0].argname);
            this.$.argexpr.push($$[$0].argexpr);
            delete $$[$0];
        
break;
case 73: 
            this.$ = new ArgContainer();
            this.$.argexpr = $$[$0];
        
break;
case 74: 
            this.$ = new ArgContainer();
            this.$.argname = $$[$0-2];
            this.$.argexpr = $$[$0];
        
break;
}
},
table: [{1:[2,2],3:1,4:2,9:[2,2],10:[2,2],15:[2,2],16:[2,2],21:[2,2],22:[2,2],26:[2,2],31:[2,2],32:[2,2],33:[2,2],34:[2,2]},{1:[3]},{1:[2,1],5:3,7:4,9:[1,5],10:[2,7],15:[2,7],16:[2,7],21:[2,7],22:[2,7],26:[2,7],31:[2,7],32:[2,7],33:[2,7],34:[2,7]},{1:[2,3],9:[2,3],10:[2,3],15:[2,3],16:[2,3],21:[2,3],22:[2,3],26:[2,3],31:[2,3],32:[2,3],33:[2,3],34:[2,3]},{8:6,10:[1,10],15:[1,7],16:[1,8],18:9,21:[1,11],22:[1,12],25:19,26:[1,20],27:14,29:13,31:[1,15],32:[1,16],33:[1,17],34:[1,18]},{10:[1,21]},{1:[2,6],9:[2,6],10:[2,6],15:[2,6],16:[2,6],17:[2,6],21:[2,6],22:[2,6],26:[2,6],31:[2,6],32:[2,6],33:[2,6],34:[2,6]},{1:[2,9],9:[2,9],10:[2,9],15:[2,9],16:[2,9],17:[2,9],21:[2,9],22:[2,9],26:[2,9],31:[2,9],32:[2,9],33:[2,9],34:[2,9]},{6:22,9:[2,4],10:[2,4],15:[2,4],16:[2,4],17:[2,4],21:[2,4],22:[2,4],26:[2,4],31:[2,4],32:[2,4],33:[2,4],34:[2,4]},{1:[2,11],9:[2,11],10:[2,11],15:[2,11],16:[2,11],17:[2,11],21:[2,11],22:[2,11],26:[2,11],31:[2,11],32:[2,11],33:[2,11],34:[2,11]},{11:[1,24],19:[1,23]},{10:[1,25]},{1:[2,14],9:[2,14],10:[2,14],15:[2,14],16:[2,14],17:[2,14],21:[2,14],22:[2,14],26:[2,14],31:[2,14],32:[2,14],33:[2,14],34:[2,14]},{10:[1,30],15:[1,26],16:[1,29],18:28,23:27,25:19,26:[1,20],27:14,29:13,31:[1,15],32:[1,16],33:[1,17],34:[1,18]},{1:[2,22],9:[2,22],10:[2,22],15:[2,22],16:[2,22],17:[2,22],21:[2,22],22:[2,22],26:[2,22],28:[2,22],31:[2,22],32:[2,22],33:[2,22],34:[2,22]},{10:[1,30],29:31,31:[1,15],32:[1,16],33:[1,17],34:[1,18]},{10:[1,30],29:32,31:[1,15],32:[1,16],33:[1,17],34:[1,18]},{10:[1,30],29:33,31:[1,15],32:[1,16],33:[1,17],34:[1,18]},{10:[1,30],29:34,31:[1,15],32:[1,16],33:[1,17],34:[1,18]},{1:[2,18],9:[2,18],10:[2,18],15:[2,18],16:[2,18],17:[2,18],21:[2,18],22:[2,18],26:[2,18],28:[1,35],31:[2,18],32:[2,18],33:[2,18],34:[2,18]},{11:[1,36]},{11:[1,37]},{5:39,7:4,9:[1,5],10:[2,7],15:[2,7],16:[2,7],17:[1,38],21:[2,7],22:[2,7],26:[2,7],31:[2,7],32:[2,7],33:[2,7],34:[2,7]},{10:[1,44],11:[1,51],20:40,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,55],11:[1,51],14:[2,70],20:54,30:52,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49],57:[2,70],59:53},{11:[1,56]},{1:[2,20],9:[2,20],10:[2,20],15:[2,20],16:[2,20],17:[2,20],21:[2,20],22:[2,20],26:[2,20],28:[2,20],31:[2,20],32:[2,20],33:[2,20],34:[2,20]},{1:[2,21],9:[2,21],10:[2,21],15:[2,21],16:[2,21],17:[2,21],21:[2,21],22:[2,21],26:[2,21],28:[2,21],31:[2,21],32:[2,21],33:[2,21],34:[2,21]},{1:[2,15],9:[2,15],10:[2,15],15:[2,15],16:[2,15],17:[2,15],21:[2,15],22:[2,15],26:[2,15],28:[2,15],31:[2,15],32:[2,15],33:[2,15],34:[2,15]},{10:[2,23],17:[2,23],24:57,26:[2,23],31:[2,23],32:[2,23],33:[2,23],34:[2,23]},{11:[1,24]},{10:[2,26],15:[2,26],16:[2,26],26:[2,26],31:[2,26],32:[2,26],33:[2,26],34:[2,26]},{10:[2,27],15:[2,27],16:[2,27],26:[2,27],31:[2,27],32:[2,27],33:[2,27],34:[2,27]},{10:[2,28],15:[2,28],16:[2,28],26:[2,28],31:[2,28],32:[2,28],33:[2,28],34:[2,28]},{10:[2,29],15:[2,29],16:[2,29],26:[2,29],31:[2,29],32:[2,29],33:[2,29],34:[2,29]},{10:[1,30],16:[1,29],18:28,23:58,25:19,26:[1,20],27:14,29:13,31:[1,15],32:[1,16],33:[1,17],34:[1,18]},{10:[1,44],11:[1,51],20:59,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,62],12:60,14:[2,65],57:[2,65],58:61},{1:[2,10],9:[2,10],10:[2,10],15:[2,10],16:[2,10],17:[2,10],21:[2,10],22:[2,10],26:[2,10],31:[2,10],32:[2,10],33:[2,10],34:[2,10]},{9:[2,5],10:[2,5],15:[2,5],16:[2,5],17:[2,5],21:[2,5],22:[2,5],26:[2,5],31:[2,5],32:[2,5],33:[2,5],34:[2,5]},{15:[1,63],33:[1,67],34:[1,65],38:[1,64],41:[1,79],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78]},{14:[2,30],15:[2,30],33:[2,30],34:[2,30],38:[2,30],41:[2,30],42:[2,30],43:[2,30],45:[2,30],46:[2,30],47:[2,30],48:[2,30],49:[2,30],50:[2,30],51:[2,30],52:[2,30],53:[2,30],54:[2,30],55:[2,30],56:[2,30],57:[2,30]},{14:[2,31],15:[2,31],33:[2,31],34:[2,31],38:[2,31],41:[2,31],42:[2,31],43:[2,31],45:[2,31],46:[2,31],47:[2,31],48:[2,31],49:[2,31],50:[2,31],51:[2,31],52:[2,31],53:[2,31],54:[2,31],55:[2,31],56:[2,31],57:[2,31]},{14:[2,32],15:[2,32],33:[2,32],34:[2,32],38:[2,32],41:[2,32],42:[2,32],43:[2,32],45:[2,32],46:[2,32],47:[2,32],48:[2,32],49:[2,32],50:[2,32],51:[2,32],52:[2,32],53:[2,32],54:[2,32],55:[2,32],56:[2,32],57:[2,32]},{11:[1,80],14:[2,33],15:[2,33],33:[2,33],34:[2,33],38:[2,33],41:[2,33],42:[2,33],43:[2,33],45:[2,33],46:[2,33],47:[2,33],48:[2,33],49:[2,33],50:[2,33],51:[2,33],52:[2,33],53:[2,33],54:[2,33],55:[2,33],56:[2,33],57:[2,33]},{14:[2,35],15:[2,35],33:[2,35],34:[2,35],38:[2,35],41:[2,35],42:[2,35],43:[2,35],45:[2,35],46:[2,35],47:[2,35],48:[2,35],49:[2,35],50:[2,35],51:[2,35],52:[2,35],53:[2,35],54:[2,35],55:[2,35],56:[2,35],57:[2,35]},{14:[2,36],15:[2,36],33:[2,36],34:[2,36],38:[2,36],41:[2,36],42:[2,36],43:[2,36],45:[2,36],46:[2,36],47:[2,36],48:[2,36],49:[2,36],50:[2,36],51:[2,36],52:[2,36],53:[2,36],54:[2,36],55:[2,36],56:[2,36],57:[2,36]},{10:[1,44],11:[1,51],13:82,20:81,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],43:[2,62],44:83,46:[1,48],47:[1,49],57:[1,84]},{10:[1,44],11:[1,51],20:85,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:86,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:87,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:88,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{14:[1,89],57:[1,90]},{14:[2,71],57:[2,71]},{14:[2,73],33:[1,67],34:[1,65],38:[1,64],41:[1,79],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78],57:[2,73]},{11:[1,80],14:[2,33],19:[1,91],33:[2,33],34:[2,33],38:[2,33],41:[2,33],45:[2,33],46:[2,33],47:[2,33],48:[2,33],49:[2,33],50:[2,33],51:[2,33],52:[2,33],53:[2,33],54:[2,33],55:[2,33],56:[2,33],57:[2,33]},{10:[1,62],12:92,14:[2,65],57:[2,65],58:61},{10:[1,30],17:[1,93],18:94,25:19,26:[1,20],27:14,29:13,31:[1,15],32:[1,16],33:[1,17],34:[1,18]},{1:[2,19],9:[2,19],10:[2,19],15:[2,19],16:[2,19],17:[2,19],21:[2,19],22:[2,19],26:[2,19],28:[2,19],31:[2,19],32:[2,19],33:[2,19],34:[2,19]},{14:[1,95],33:[1,67],34:[1,65],38:[1,64],41:[1,79],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78]},{13:96,14:[2,62],57:[1,97]},{14:[2,66],57:[2,66]},{14:[2,68],19:[1,98],57:[2,68]},{1:[2,12],9:[2,12],10:[2,12],15:[2,12],16:[2,12],17:[2,12],21:[2,12],22:[2,12],26:[2,12],31:[2,12],32:[2,12],33:[2,12],34:[2,12]},{10:[1,99]},{10:[1,44],11:[1,51],20:100,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:101,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:102,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:103,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:104,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:105,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:106,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:107,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:108,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:109,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:110,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:111,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:112,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:113,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,44],11:[1,51],20:114,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{10:[1,55],11:[1,51],14:[2,70],20:54,30:115,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49],57:[2,70],59:53},{33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[1,116],43:[2,63],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78],57:[2,63]},{43:[1,117]},{13:118,43:[2,62],57:[1,119]},{10:[2,62],11:[2,62],13:120,14:[2,62],31:[2,62],35:[2,62],36:[2,62],37:[2,62],39:[2,62],40:[2,62],41:[2,62],43:[2,62],46:[2,62],47:[2,62],57:[1,84]},{14:[2,54],15:[2,54],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,54],43:[2,54],45:[1,66],46:[2,54],47:[2,54],48:[2,54],49:[2,54],50:[2,54],51:[2,54],52:[2,54],53:[2,54],54:[2,54],55:[2,54],56:[2,54],57:[2,54]},{14:[2,55],15:[2,55],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,55],43:[2,55],45:[1,66],46:[2,55],47:[2,55],48:[2,55],49:[2,55],50:[2,55],51:[2,55],52:[2,55],53:[2,55],54:[2,55],55:[2,55],56:[2,55],57:[2,55]},{14:[2,56],15:[2,56],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,56],43:[2,56],45:[1,66],46:[2,56],47:[2,56],48:[2,56],49:[2,56],50:[2,56],51:[2,56],52:[2,56],53:[2,56],54:[2,56],55:[2,56],56:[2,56],57:[2,56]},{14:[1,121],33:[1,67],34:[1,65],38:[1,64],41:[1,79],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78]},{10:[2,25],15:[2,25],16:[2,25],26:[2,25],31:[2,25],32:[2,25],33:[2,25],34:[2,25]},{10:[2,62],11:[2,62],13:122,31:[2,62],35:[2,62],36:[2,62],37:[2,62],39:[2,62],40:[2,62],41:[2,62],46:[2,62],47:[2,62],57:[1,84]},{10:[1,44],11:[1,51],20:123,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{13:124,14:[2,62],57:[1,97]},{1:[2,16],9:[2,16],10:[2,16],15:[2,16],16:[2,16],17:[2,16],21:[2,16],22:[2,16],26:[2,16],28:[2,16],31:[2,16],32:[2,16],33:[2,16],34:[2,16]},{10:[2,24],17:[2,24],26:[2,24],31:[2,24],32:[2,24],33:[2,24],34:[2,24]},{10:[1,30],16:[1,29],18:28,23:125,25:19,26:[1,20],27:14,29:13,31:[1,15],32:[1,16],33:[1,17],34:[1,18]},{14:[1,126]},{10:[2,62],13:127,14:[2,62],57:[1,84]},{10:[1,44],11:[1,51],20:128,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{14:[2,34],15:[2,34],33:[2,34],34:[2,34],38:[2,34],41:[2,34],42:[2,34],43:[2,34],45:[2,34],46:[2,34],47:[2,34],48:[2,34],49:[2,34],50:[2,34],51:[2,34],52:[2,34],53:[2,34],54:[2,34],55:[2,34],56:[2,34],57:[2,34]},{14:[2,41],15:[2,41],33:[2,41],34:[2,41],38:[1,64],41:[1,79],42:[2,41],43:[2,41],45:[2,41],46:[2,41],47:[2,41],48:[2,41],49:[2,41],50:[2,41],51:[2,41],52:[2,41],53:[2,41],54:[2,41],55:[2,41],56:[2,41],57:[2,41]},{14:[2,42],15:[2,42],33:[2,42],34:[2,42],38:[1,64],41:[1,79],42:[2,42],43:[2,42],45:[2,42],46:[2,42],47:[2,42],48:[2,42],49:[2,42],50:[2,42],51:[2,42],52:[2,42],53:[2,42],54:[2,42],55:[2,42],56:[2,42],57:[2,42]},{14:[2,43],15:[2,43],33:[2,43],34:[2,43],38:[1,64],41:[1,79],42:[2,43],43:[2,43],45:[2,43],46:[2,43],47:[2,43],48:[2,43],49:[2,43],50:[2,43],51:[2,43],52:[2,43],53:[2,43],54:[2,43],55:[2,43],56:[2,43],57:[2,43]},{14:[2,44],15:[2,44],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,44],43:[2,44],45:[1,66],46:[2,44],47:[2,44],48:[2,44],49:[2,44],50:[2,44],51:[2,44],52:[2,44],53:[2,44],54:[2,44],55:[2,44],56:[2,44],57:[2,44]},{14:[2,45],15:[2,45],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,45],43:[2,45],45:[1,66],46:[2,45],47:[2,45],48:[2,45],49:[2,45],50:[2,45],51:[2,45],52:[2,45],53:[2,45],54:[2,45],55:[2,45],56:[2,45],57:[2,45]},{14:[2,46],15:[2,46],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,46],43:[2,46],45:[1,66],46:[1,68],47:[1,69],48:[2,46],49:[2,46],50:[1,72],51:[1,73],52:[2,46],53:[2,46],54:[2,46],55:[2,46],56:[2,46],57:[2,46]},{14:[2,47],15:[2,47],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,47],43:[2,47],45:[1,66],46:[1,68],47:[1,69],48:[2,47],49:[2,47],50:[1,72],51:[1,73],52:[2,47],53:[2,47],54:[2,47],55:[2,47],56:[2,47],57:[2,47]},{14:[2,48],15:[2,48],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,48],43:[2,48],45:[1,66],46:[1,68],47:[1,69],48:[2,48],49:[2,48],50:[2,48],51:[2,48],52:[2,48],53:[2,48],54:[2,48],55:[2,48],56:[2,48],57:[2,48]},{14:[2,49],15:[2,49],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,49],43:[2,49],45:[1,66],46:[1,68],47:[1,69],48:[2,49],49:[2,49],50:[2,49],51:[2,49],52:[2,49],53:[2,49],54:[2,49],55:[2,49],56:[2,49],57:[2,49]},{14:[2,50],15:[2,50],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,50],43:[2,50],45:[1,66],46:[1,68],47:[1,69],48:[2,50],49:[2,50],50:[1,72],51:[1,73],52:[2,50],53:[2,50],54:[2,50],55:[2,50],56:[2,50],57:[2,50]},{14:[2,51],15:[2,51],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,51],43:[2,51],45:[1,66],46:[1,68],47:[1,69],48:[2,51],49:[2,51],50:[1,72],51:[1,73],52:[2,51],53:[2,51],54:[2,51],55:[2,51],56:[2,51],57:[2,51]},{14:[2,52],15:[2,52],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,52],43:[2,52],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[2,52],55:[2,52],56:[2,52],57:[2,52]},{14:[2,53],15:[2,53],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,53],43:[2,53],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[2,53],56:[2,53],57:[2,53]},{33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[1,129],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78]},{33:[1,67],34:[1,65],38:[1,64],41:[1,79],43:[1,130],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78]},{14:[1,131],57:[1,90]},{10:[1,44],11:[1,51],20:132,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{14:[2,39],15:[2,39],33:[2,39],34:[2,39],38:[2,39],41:[2,39],42:[2,39],43:[2,39],45:[2,39],46:[2,39],47:[2,39],48:[2,39],49:[2,39],50:[2,39],51:[2,39],52:[2,39],53:[2,39],54:[2,39],55:[2,39],56:[2,39],57:[2,39]},{43:[1,133]},{10:[2,62],11:[2,62],13:134,31:[2,62],35:[2,62],36:[2,62],37:[2,62],39:[2,62],40:[2,62],41:[2,62],43:[2,62],46:[2,62],47:[2,62],57:[1,84]},{10:[2,61],11:[2,61],14:[2,61],31:[2,61],35:[2,61],36:[2,61],37:[2,61],39:[2,61],40:[2,61],41:[2,61],43:[2,61],46:[2,61],47:[2,61]},{14:[2,57],15:[2,57],33:[2,57],34:[2,57],38:[2,57],41:[2,57],42:[2,57],43:[2,57],45:[2,57],46:[2,57],47:[2,57],48:[2,57],49:[2,57],50:[2,57],51:[2,57],52:[2,57],53:[2,57],54:[2,57],55:[2,57],56:[2,57],57:[2,57]},{10:[1,55],11:[1,51],20:54,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49],59:135},{14:[2,74],33:[1,67],34:[1,65],38:[1,64],41:[1,79],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78],57:[2,74]},{14:[1,136]},{1:[2,17],9:[2,17],10:[2,17],15:[2,17],16:[2,17],17:[2,17],21:[2,17],22:[2,17],26:[2,17],28:[2,17],31:[2,17],32:[2,17],33:[2,17],34:[2,17]},{10:[2,8],15:[2,8],16:[2,8],21:[2,8],22:[2,8],26:[2,8],31:[2,8],32:[2,8],33:[2,8],34:[2,8]},{10:[1,62],14:[2,61],58:137},{14:[2,69],33:[1,67],34:[1,65],38:[1,64],41:[1,79],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78],57:[2,69]},{10:[1,44],11:[1,51],20:138,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{14:[2,59],15:[2,59],33:[2,59],34:[2,59],38:[2,59],41:[2,59],42:[2,59],43:[2,59],45:[2,59],46:[2,59],47:[2,59],48:[2,59],49:[2,59],50:[2,59],51:[2,59],52:[2,59],53:[2,59],54:[2,59],55:[2,59],56:[2,59],57:[2,59]},{14:[2,60],15:[2,60],33:[2,60],34:[2,60],38:[2,60],41:[2,60],42:[2,60],43:[2,60],45:[2,60],46:[2,60],47:[2,60],48:[2,60],49:[2,60],50:[2,60],51:[2,60],52:[2,60],53:[2,60],54:[2,60],55:[2,60],56:[2,60],57:[2,60]},{33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[1,140],43:[1,139],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78]},{14:[2,40],15:[2,40],33:[2,40],34:[2,40],38:[2,40],41:[2,40],42:[2,40],43:[2,40],45:[2,40],46:[2,40],47:[2,40],48:[2,40],49:[2,40],50:[2,40],51:[2,40],52:[2,40],53:[2,40],54:[2,40],55:[2,40],56:[2,40],57:[2,40]},{10:[1,44],11:[1,51],20:141,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],43:[2,61],46:[1,48],47:[1,49]},{14:[2,72],57:[2,72]},{19:[1,142]},{14:[2,67],57:[2,67]},{14:[2,58],15:[2,58],33:[1,67],34:[1,65],38:[1,64],41:[1,79],42:[2,58],43:[2,58],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78],57:[2,58]},{14:[2,37],15:[2,37],33:[2,37],34:[2,37],38:[2,37],41:[2,37],42:[2,37],43:[2,37],45:[2,37],46:[2,37],47:[2,37],48:[2,37],49:[2,37],50:[2,37],51:[2,37],52:[2,37],53:[2,37],54:[2,37],55:[2,37],56:[2,37],57:[2,37]},{10:[1,44],11:[1,51],20:143,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{33:[1,67],34:[1,65],38:[1,64],41:[1,79],43:[2,64],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78],57:[2,64]},{10:[1,44],11:[1,51],20:144,31:[1,50],35:[1,41],36:[1,42],37:[1,43],39:[1,45],40:[1,46],41:[1,47],46:[1,48],47:[1,49]},{33:[1,67],34:[1,65],38:[1,64],41:[1,79],43:[1,145],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78]},{15:[1,146],33:[1,67],34:[1,65],38:[1,64],41:[1,79],45:[1,66],46:[1,68],47:[1,69],48:[1,70],49:[1,71],50:[1,72],51:[1,73],52:[1,74],53:[1,75],54:[1,76],55:[1,77],56:[1,78]},{14:[2,38],15:[2,38],33:[2,38],34:[2,38],38:[2,38],41:[2,38],42:[2,38],43:[2,38],45:[2,38],46:[2,38],47:[2,38],48:[2,38],49:[2,38],50:[2,38],51:[2,38],52:[2,38],53:[2,38],54:[2,38],55:[2,38],56:[2,38],57:[2,38]},{1:[2,13],9:[2,13],10:[2,13],15:[2,13],16:[2,13],17:[2,13],21:[2,13],22:[2,13],26:[2,13],31:[2,13],32:[2,13],33:[2,13],34:[2,13]}],
defaultActions: {},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == "undefined")
        this.lexer.yylloc = {};
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === "function")
        this.parseError = this.yy.parseError;
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || 1;
        if (typeof token !== "number") {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == "undefined") {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
        if (typeof action === "undefined" || !action.length || !action[0]) {
            var errStr = "";
            if (!recovering) {
                expected = [];
                for (p in table[state])
                    if (this.terminals_[p] && p > 2) {
                        expected.push("'" + this.terminals_[p] + "'");
                    }
                if (this.lexer.showPosition) {
                    errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                } else {
                    errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                }
                this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
            }
        }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0)
                    recovering--;
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
            if (ranges) {
                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
            }
            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
            if (typeof r !== "undefined") {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}
};
/* Jison generated lexer */
var lexer = (function(){
var lexer = ({EOF:1,
parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
        if (this.options.ranges) this.yylloc.range = [0,0];
        this.offset = 0;
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) this.yylloc.range[1]++;

        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length-1);
        this.matched = this.matched.substr(0, this.matched.length-1);

        if (lines.length-1) this.yylineno -= lines.length-1;
        var r = this.yylloc.range;

        this.yylloc = {first_line: this.yylloc.first_line,
          last_line: this.yylineno+1,
          first_column: this.yylloc.first_column,
          last_column: lines ?
              (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
              this.yylloc.first_column - len
          };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
less:function (n) {
        this.unput(this.match.slice(n));
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            tempMatch,
            index,
            col,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i=0;i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (!this.options.flex) break;
            }
        }
        if (match) {
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) this.yylineno += lines.length;
            this.yylloc = {first_line: this.yylloc.last_line,
                           last_line: this.yylineno+1,
                           first_column: this.yylloc.last_column,
                           last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
                this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
            if (this.done && this._input) this.done = false;
            if (token) return token;
            else return;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function lex() {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    },
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },
popState:function popState() {
        return this.conditionStack.pop();
    },
_currentRules:function _currentRules() {
        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
    },
topState:function () {
        return this.conditionStack[this.conditionStack.length-2];
    },
pushState:function begin(condition) {
        this.begin(condition);
    }});
lexer.options = {"flex":true};
lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {

var YYSTATE=YY_START
switch($avoiding_name_collisions) {
case 0: this.begin('cond_include'); 
break;
case 1: yy.filepath = yy_.yytext; 
break;
case 2: yy.filename = yy_.yytext; 
break;
case 3:  this.popState(); 
break;
case 4: this.begin('cond_use');
break;
case 5: yy.filename = yy_.yytext; 
break;
case 6: this.popState(); 
break;
case 7:return 9
break;
case 8:return 21
break;
case 9:return 26
break;
case 10:return 28
break;
case 11:return 35
break;
case 12:return 36
break;
case 13:return 37
break;
case 14: stringcontents += '    ';  
break;
case 15: stringcontents += '\n';  
break;
case 16: stringcontents += '\"';  
break;
case 17: stringcontents += '\r';  
break;
case 18: stringcontents += '\\';  
break;
case 19: stringcontents += '\0';  
break;
case 20: stringcontents += '\a';  
break;
case 21: stringcontents += '\b';  
break;
case 22: stringcontents += '\t';  
break;
case 23: stringcontents += '\n';  
break;
case 24: stringcontents += '\v';  
break;
case 25: stringcontents += '\f';  
break;
case 26: stringcontents += '\e';  
break;
case 27: /*"*/ 
                                stringcontents += yy_.yytext; 
                            
break;
case 28:
                                this.popState();
                                yy_.yytext = stringcontents; 
                                return 39; 
                            
break;
case 29: /*"*/ 
                                this.begin('cond_string');                                 
                                stringcontents = ""; 
                            
break;
case 30:/* Ignore */
break;
case 31:/* Ignore */
break;
case 32:/* Ignore */
break;
case 33:/* Ignore Note: multi-line comments are removed via a preparse regex. */
	console.log("here multi ligne comment?");
break;
case 34:return 40
break;
case 35:return 40
break;
case 36:return 40
break;
case 37:return 10
break;
case 38:return 49
break;
case 39:return 52
break;
case 40:return 50
break;
case 41:return 51
break;
case 42:return 54
break;
case 43:return 55
break;
case 44:return yy_.yytext;
break;
case 45:console.log(yy_.yytext);
break;
}
};
lexer.rules = [/^(?:include[ \t\r\n>]*<)/,/^(?:[^\t\r\n>]*\/)/,/^(?:[^\t\r\n>/]+)/,/^(?:>)/,/^(?:use[ \t\r\n>]*<)/,/^(?:[^\t\r\n>]+)/,/^(?:>)/,/^(?:module)/,/^(?:function)/,/^(?:if)/,/^(?:else)/,/^(?:true)/,/^(?:false)/,/^(?:undef)/,/^(?:\\t)/,/^(?:\\n)/,/^(?:\\")/,/^(?:\\r)/,/^(?:\\\\)/,/^(?:\\0)/,/^(?:\\a)/,/^(?:\\b)/,/^(?:\\t)/,/^(?:\\n)/,/^(?:\\v)/,/^(?:\\f)/,/^(?:\\e)/,/^(?:[^\\\n\"]+)/,/^(?:")/,/^(?:[\"])/,/^(?:[\n])/,/^(?:[\r\t ])/,/^(?:\/\/[^\n]*\n?)/,/^(?:\/\*.+\*\/)/,/^(?:([0-9])*\.([0-9])+([Ee][+-]?([0-9])+)?)/,/^(?:([0-9])+\.([0-9])*([Ee][+-]?([0-9])+)?)/,/^(?:([0-9])+([Ee][+-]?([0-9])+)?)/,/^(?:\$?[a-zA-Z0-9_]+)/,/^(?:<=)/,/^(?:>=)/,/^(?:==)/,/^(?:!=)/,/^(?:&&)/,/^(?:\|\|)/,/^(?:.)/,/^(?:.)/];
lexer.conditions = {"cond_include":{"rules":[0,1,2,3,4,7,8,9,10,11,12,13,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45],"inclusive":true},"cond_use":{"rules":[0,4,5,6,7,8,9,10,11,12,13,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45],"inclusive":true},"cond_comment":{"rules":[0,4,7,8,9,10,11,12,13,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45],"inclusive":true},"cond_string":{"rules":[0,4,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45],"inclusive":true},"cond_import":{"rules":[0,4,7,8,9,10,11,12,13,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45],"inclusive":true},"INITIAL":{"rules":[0,4,7,8,9,10,11,12,13,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45],"inclusive":true}};
return lexer;})()
parser.lexer = lexer;
return parser;
});

define('openscadCoffeeScadParser',['require','openscad-parser','Globals','openscad-parser-support'],function(require){

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
//Register in the values from the outer closure for common dependencies
    //as local almond modules
    define('underscore', function () {
        return _;
    });

    //Use almond's special top-level, synchronous require to trigger factory
    //functions, get the final module value, and export it as the public
    //value.
    return require('openscadCoffeeScadParser');
}));
