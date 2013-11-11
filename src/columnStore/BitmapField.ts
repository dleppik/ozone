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
     * A Field which consists of bitmaps for each Value.  Although values need not be strings, they are identified
     * internally by their toString method.  It is legal for values to have empty bitmaps;  for example, a Month
     * field might contain all the months of the year in order, even if only a few have any values, to guarantee that
     * the UI looks right.
     */
    export class BitmapField<T> implements RandomAccessField<T> {

        /**
         * Returns a reducer that can be run on a source DataStore to reproduce a sourceField.
         *
         * @param sourceField  the field which will be replicated
         * @param params       additional parameters:
         *                     values       -- if provided, this is the list of values used and any values not in this
         *                                     list are ignored.  This also defines the order of values.
         *                     bitmapSource -- if provided, a BitmapBuilding to override the default.  The default may
         *                                     change, and may be browser specific or determined based on the
         *                                     characteristics of sourceField.
         */
        public static builder<T>(sourceField : Field<T>, params : any = {} ) : Reducer<IndexedRowToken,BitmapField<T>> {
            var addValues =  ! params.values;
            var valueList : T[] = (addValues) ? [] : params.values.concat();

            var bitmapSource : BitmapBuilding = (params.bitmapSource)
                ? params.bitmapSource
                : ozone.columnStore.ArrayIndexBitmap;
            var bitmapBuilders : any = {};
            for (var i=0; i<valueList.length; i++) {
                var value = valueList[i];
                bitmapBuilders[value.toString()] = bitmapSource.builder();
            }

            return {
                onItem: function(indexedRowToken : IndexedRowToken) {
                    var values = sourceField.values(indexedRowToken.rowToken);
                    for (var i=0; i<values.length; i++) {
                        var value = <any> values[i];
                        var builder : Reducer<number,Bitmap> = bitmapBuilders[value.toString()];
                        if (typeof(builder) === "undefined"  &&  addValues) {
                            builder = bitmapSource.builder();
                            bitmapBuilders[value.toString()] = builder;
                            valueList.push(value);
                        }
                        if (typeof(builder) === "object") {
                            builder.onItem(indexedRowToken.index);
                        }
                    }
                },
                onEnd: function() : BitmapField<T> {
                    var valueMap =  <{(valueId:string) : Bitmap}>  {};
                    if (addValues && valueList.length > 0) {
                        var firstValue = valueList[0];
                        if (typeof firstValue === "object") {
                            if (firstValue["prototype"] === Date.prototype) {
                                valueList.sort(function(a : Date, b : Date) { return a.getTime() - b.getTime()} );
                            }
                        }
                        else {
                            valueList.sort();
                        }
                    }
                    for (var i=0; i< valueList.length; i++) {
                        var value = valueList[i];
                        valueMap[value.toString()] = bitmapBuilders[value].onEnd();
                    }
                    return new BitmapField<T>(sourceField, valueList, valueMap);
                }
            };
        }

        identifier: string;
        displayName : string;
        typeOfValue : string;
        typeConstructor : any;

        private rangeVal : Range;

        constructor(descriptor : FieldDescribing, private valueList : T[], private valueMap : {(valueId:string) : Bitmap}) {
            this.identifier = descriptor.identifier;
            this.displayName = descriptor.displayName;
            this.typeOfValue = descriptor.typeOfValue;
            this.typeConstructor = descriptor.typeConstructor;
            this.rangeVal = descriptor.range();
        }

        public allValues() : T[] {
            return this.valueList.concat();
        }

        public values(rowToken : any) : T[] {
            var index = <number> rowToken;
            var result : T[] = [];

            for (var i=0; i<this.valueList.length; i++) {
                var value = this.valueList[i];
                var bitmap = this.valueMap[value.toString()];
                if (bitmap.get(value)) {
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

    }
}