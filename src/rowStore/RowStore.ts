/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path="../_all.ts" />

module ozone.rowStore {

    /**
     * A row-oriented DataStore that acts on an array of rows.  The interpretation of the rows is done entirely by
     * the Fields.  This is mainly intended for server-side (node.js) usage to convert data into more efficient formats.
     */
    export class RowStore implements DataStore {

        /**
         * ECMAScript doesn't require associative arrays to retain the order of their keys, although most
         * implementations do.  (Rhino doesn't.)  So a separate fieldArray isn't completely redundant.
         */
        private fieldMap : { [key: string]: Field<any>; } ;

        constructor(private fieldArray : Field<any>[], private rowData : any[], private rowTransformer : Reducer<any,any>) {
            this.fieldMap = {};
            for (var i=0; i<fieldArray.length; i++) {
                var field = fieldArray[i];
                this.fieldMap[field.identifier] = field;
            }
        }

        public fields() : Field<any>[] {
            return this.fieldArray;
        }

        public field(name : string) : Field<any> {
            return this.fieldMap[name];
        }

        public eachRow(rowAction : (rowToken : any) => void) {
            for (var i=0; i<this.rowData.length; i++) {
                var rawRow = this.rowData[i];
                var row = (this.rowTransformer===null) ? rawRow : this.rowTransformer.onItem(rawRow);
                if (row !== null) {
                    rowAction(row);
                }
            }
            this.rowTransformer.onEnd();
        }

        /** Replace an existing field with this one.  If the old field isn't found, the new one is added at the end. */
        public withField(newField : Field<any>) : RowStore {
            var newFieldArray : Field<any>[] = this.fieldArray.concat();
            for (var i=0; i<newFieldArray.length; i++) {
                if (newFieldArray[i].identifier === newField.identifier) {
                    newFieldArray[i] = newField;
                    return new RowStore(newFieldArray, this.rowData, this.rowTransformer);
                }
            }
            newFieldArray.concat(newField);
            return new RowStore(newFieldArray, this.rowData, this.rowTransformer);
        }
    }

    /** The default non-unary Field type for RowStores. */
    export class JsonRowField<T> implements Field<T> {

        /** Private constructor:  please use factory methods. */
        constructor( public identifier : string,
                     public displayName : string,
                     public typeOfValue : string,
                     public typeConstructor : any = null,
                     private rangeVal : Range = null,
                     private distinctValueEstimateVal : number = Number.POSITIVE_INFINITY)
        {
        }

        public range() : Range {
            return this.rangeVal;
        }

        public distinctValueEstimate() {
            return this.distinctValueEstimateVal;
        }

        public canHold(otherField : Field<T>) : boolean {
            if (this.typeOfValue === otherField.typeOfValue) {
                if (this.typeOfValue === 'object') {
                    return this.typeConstructor === otherField.typeConstructor;
                }
                return true;
            }
            return false;
        }

        public values(rowToken : any) : T[] {
            var result = <T[]> rowToken[this.identifier];
            return (result==null) ? [] : result;
        }
    }

    export class UnaryJsonRowField<T> implements UnaryField<T> {
        constructor( public identifier : string,
                     public displayName : string,
                     public typeOfValue : string,
                     public typeConstructor : any = null,
                     private rangeVal : Range = null,
                     private distinctValueEstimateVal : number = Number.POSITIVE_INFINITY)
        {
        }

        public range() : Range {
            return this.rangeVal;
        }

        public distinctValueEstimate() {
            return this.distinctValueEstimateVal;
        }

        public canHold(otherField : Field<T>) : boolean {
            if (this.typeOfValue === otherField.typeOfValue) {
                if (this.typeOfValue === 'object') {
                    return this.typeConstructor === otherField.typeConstructor;
                }
                return true;
            }
            return false;
        }

        public values(rowToken : any) : T[] {
            var v = this.value(rowToken);
            return (v==null) ? [] : [v];
        }

        public value(rowToken : any) : T {
            return rowToken[this.identifier];
        }
    }

    export class RangeCalculator extends AbstractReducer<any,Range> {
        private min : number;
        private max : number;
        private integerOnly : boolean;

        constructor(public field:Field<number>) {
           super();
        }

        public reset() {
            this.min = Number.POSITIVE_INFINITY;
            this.max = Number.NEGATIVE_INFINITY;
            this.integerOnly = true;
        }

        public onItem(rowToken : any) {
            var values = this.field.values(rowToken);
            for (var i=0; i<values.length; i++) {
                var n = values[i];
                if (n < this.min) {
                    this.min = n;
                }
                if (n > this.max) {
                    this.max = n;
                }
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
                if ( ! (isFinite(n) && n > -9007199254740992 && n < 9007199254740992 && Math.floor(n) === n)) {
                    this.integerOnly = false;
                }
            }
        }

        public yieldResult() : Range {
            return new Range(this.min, this.max, this.integerOnly===true);
        }
    }

    export class ValueFrequencyCalculator implements Reducer<any, {[key: string] : number}> {
        private map : {[key: string] : number} = {};

        constructor (public field : Field<any>) {
        }

        public onItem(rowToken : any) {
            var values = this.field.values(rowToken);
            for (var i=0; i<values.length; i++) {
                var v = ""+values[i];
                this.map[v] = (typeof this.map[v] === "undefined") ? 1 : 1 + this.map[v];
            }
        }

        public onEnd() {
            var result = this.map;
            this.map = {};
            return result;
        }
    }
}