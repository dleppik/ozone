/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    export interface IndexedRowToken {
        index : number;
        rowToken : any;
    }

    /**
     * A Field which stores values in an index, and each value is mapped to a list of row identifiers.  This is similar
     * to an SQL index on a column, except that SQL databases store both a row and (optionally) an index, whereas this
     * Field only stores the index-- the row itself is nothing more than an identifying row number.
     *
     * <p><b>Although values need not be strings, they are identified internally by their toString method.</b></p>
     *
     * It is legal for values to have empty intSets;  for example, a Month
     * field might contain all the months of the year in order, even if only a few have any values, to guarantee that
     * the UI looks right.
     */
    export class IndexedField<T> implements RandomAccessField<T> {

        /**
         * Returns a reducer that can be run on a source DataStore to reproduce a sourceField.
         *
         * @param sourceField  the field which will be replicated
         * @param params       additional parameters:
         *                     values       -- if provided, this is the list of values used and any values not in this
         *                                     list are ignored.  This also defines the order of values.
         *                     intSetSource -- if provided, a IntSetBuilding to override the default.  The default may
         *                                     change, and may be browser specific or determined based on the
         *                                     characteristics of sourceField.
         */
        public static builder<T>(sourceField : Field<T>, params : any = {} ) : Reducer<IndexedRowToken,IndexedField<T>> {
            var descriptor : FieldDescribing = mergeFieldDescriptors(sourceField, params);

            var addValues =  ! params.values;
            var valueList : T[] = []; // (addValues) ? [] : params.values.concat();
            if (params.values) {
                for (var i=0; i<params.values.length; i++) {
                    valueList.push(ozone.convert(params.values[i], descriptor));
                }
            }

            var intSetSource : IntSetBuilding = (params.intSetSource)
                ? params.intSetSource
                : ozone.intSet.ArrayIndexIntSet;
            var intSetBuilders : any = {};
            for (var i=0; i<valueList.length; i++) {
                var value = ozone.convert(valueList[i], descriptor);
                intSetBuilders[value.toString()] = intSetSource.builder();
            }

            return {
                onItem: function(indexedRowToken : IndexedRowToken) {
                    var values = sourceField.values(indexedRowToken.rowToken);

                    for (var i=0; i<values.length; i++) {
                        var value = <any> ozone.convert(values[i], descriptor);
                        var builder : Reducer<number,IntSet> = intSetBuilders[value.toString()];

                        if (typeof(builder) === "undefined"  &&  addValues) {
                            builder = intSetSource.builder();
                            intSetBuilders[value.toString()] = builder;
                            valueList.push(value);
                        }
                        if (typeof(builder) === "object") {
                            builder.onItem(indexedRowToken.index);
                        }
                    }
                },
                onEnd: function() : IndexedField<T> {
                    var valueMap =  <{(valueId:string) : IntSet}>  {};
                    if (addValues && valueList.length > 0) {
                        var firstValue = valueList[0];
                        if (firstValue instanceof Date) {
                            valueList.sort(function(a : any, b : any) { return a.getTime() - b.getTime()} );
                        }
                        else {
                            valueList.sort();
                        }
                    }
                    for (var i=0; i< valueList.length; i++) {
                        var valueStr = valueList[i].toString();
                        valueMap[valueStr] = intSetBuilders[valueStr].onEnd();
                    }
                    return new IndexedField<T>(descriptor, valueList, valueMap);
                }
            };
        }

        identifier: string;
        displayName : string;
        typeOfValue : string;
        typeConstructor : any;

        private rangeVal : Range;

        constructor(descriptor : FieldDescribing, private valueList : T[], private valueMap : {(valueId:string) : IntSet}) {
            var range : Range = descriptor.range();
            if (typeof range === 'undefined' || descriptor.typeOfValue=== 'number') {
                range = null;
            }
            this.identifier      = descriptor.identifier;
            this.displayName     = descriptor.displayName;
            this.typeOfValue     = descriptor.typeOfValue;
            this.typeConstructor = descriptor.typeConstructor;
            this.rangeVal        = range;
        }

        public allValues() : T[] {
            return this.valueList.concat();
        }

        public values(rowToken : any) : T[] {
            var index = <number> rowToken;
            var result : T[] = [];

            for (var i=0; i<this.valueList.length; i++) {
                var value = this.valueList[i];
                var intSet = this.valueMap[value.toString()];
                if (intSet.has(index)) {
                    result.push(value);
                }
            }
            return result;
        }

        public range() : Range {
            return this.rangeVal;
        }

        /** Equivalent to allValues().length. */
        public distinctValueEstimate() : number {
            return this.valueList.length;
        }

        public rowHasValue(index : number, value : any) : boolean {
            var intSet : IntSet = this.valueMap[value.toString()];
            if (intSet) {
                return intSet.has(index);
            }
            return false;
        }

        /** Return the intSet matching value.toString(), or an empty intSet if the value is not found. */
        intSetForValue( value : any ) : IntSet {
            var set : IntSet = this.valueMap[value.toString()];
            return (set)  ?  set  :  intSet.empty;
        }
    }
}