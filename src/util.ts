/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */

/// <reference path='_all.ts' />

module ozone {

    /**
     * Minimum, maximum, and whether every number is an integer.  For our purposes, an integer is defined according to
     * Mozilla's Number.isInteger polyfill and ECMA Harmony specification, namely:
     *
     * typeof nVal === "number" && isFinite(nVal) && nVal > -9007199254740992 && nVal < 9007199254740992 && Math.floor(nVal) === nVal;
     *
     * ( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger )
     *
     */
    export class Range {
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
}