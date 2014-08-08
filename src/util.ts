/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */

/// <reference path='_all.ts' />


/**
 *  Contains public functions and tiny classes that are too small to merit their own file.
 */
module ozone {

    /**
     * Minimum and maximum values (inclusive), and whether every number is an integer.  For our purposes, an integer is
     * defined according to Mozilla's Number.isInteger polyfill and ECMA Harmony specification, namely:
     *
     * typeof nVal === "number" && isFinite(nVal) && nVal > -9007199254740992 && nVal < 9007199254740992 && Math.floor(nVal) === nVal;
     *
     * ( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger )
     *
     * JSON.stringify(range) produces clean JSON that can be parsed back into an identical Range.
     */
    export class Range {

        /**
         * Build from JSON;  in most cases you could just use the AJAX directly, but calling this provides
         * instanceof and toString().
         */
        public static build(ajax : any) : Range {
            return new Range(ajax.min, ajax.max, ajax.integerOnly);
        }

        constructor( public min: number, public max: number, public integerOnly : boolean) {}

        public toString() : string {
            var intStr = (this.integerOnly) ? "integer" : "decimal";
            return this.min+" to "+this.max+" "+intStr;
        }
    }

    export class AbstractReducer<I,R> implements Reducer<I,R> {

        constructor() {
            this.reset();
        }

        public onItem(item:I) {
            throw new Error("Subclasses must implement");
        }

        /** Default implementation does nothing. */
        public reset() {
        }

        public yieldResult() : R {
            throw new Error("Subclasses must implement");
        }

        public onEnd():R {
            var result : R = this.yieldResult();
            this.reset();
            return result;
        }
    }


    /**
     * Combine all descriptors, with later ones overwriting values provided by earlier ones.  All non-inherited
     * properties are copied over, plus all FieldDescribing (inherited or otherwise).
     * If range and distinctValueEstimate are functions, the result's function calls the original object's function.
     * If they are not functions, the result's function returns the value.
     */
    export function mergeFieldDescriptors(...descriptors : FieldDescribing[]) : FieldDescribing {
        return mergeObjects(
            ["identifier", "displayName", "typeOfValue", "typeConstructor"],
            ["range", "distinctValueEstimate"],
            descriptors);
    }


    function mergeObjects(fields : string[], functions : string[], items : any[]) : any {
        if (items.length === 0) {
            return null;
        }

        var result = {};
        for (var i=0; i<items.length; i++) {
            var item = items[i];

            for (var k in item) {
                if (item.hasOwnProperty(k)) {
                    result[k] = k;
                }
            }

            for (var j=0; j<fields.length; j++) {
                var key = fields[j];
                if (typeof item[key] !== "undefined") {
                    result[key] = item[key];
                }
            }
            for (j=0; j<functions.length; j++) {
                var key = functions[j];
                if (typeof item[key] === "function") {
                    (function(f) {
                        result[key] = function() { f() };
                    })(item[key]);
                }
                else if (typeof item[key] !== "undefined") {
                    (function(value) {
                        result[key] = function() { return value; };
                    })(item[key]);
                }
            }
        }
        return result;
    }

    export function convert(item : any, descriptor : FieldDescribing) : any {
        if (item===null) {
            return null;
        }

        if (descriptor.typeOfValue === "number") {
            if (typeof item === "string") {
                return Number(item);
            }
        }
        else if (descriptor.typeOfValue === "string") {
            if (typeof item === "number") {
                return ""+item;
            }
        }
        return item;
    }
}