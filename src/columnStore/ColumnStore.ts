/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    import ArrayIndexBitmap = ozone.bitmap.ArrayIndexBitmap;
    import RangeBitmap = ozone.bitmap.RangeBitmap;


    export interface ColumnStoreInterface extends RandomAccessStore {
        bitmap() : Bitmap;
    }

    export class ColumnStore implements ColumnStoreInterface {

        /**
         * ECMAScript doesn't require associative arrays to retain the order of their keys, although most
         * implementations do.  (Rhino doesn't.)  So a separate fieldArray isn't completely redundant.
         */
        private fieldMap : { [key: string]: Field<any>; } ;


        constructor( public length: number, private fieldArray : Field<any>[] ) {
            this.fieldMap = {};
            for (var i=0; i<fieldArray.length; i++) {
                var field = fieldArray[i];
                this.fieldMap[field.identifier] = field;
            }
        }

        bitmap() : Bitmap {
            return new RangeBitmap(0, this.length);
        }

        fields() : Field<any>[] {
            return this.fieldArray;
        }

        field(key:string) : Field<any> {
            return this.fieldMap[key];
        }

        filter(filter : Filter) : RandomAccessStore {
            return filterColumnStore(this, this, filter);
        }

        filters()           : Filter[] { return []; }
        simplifiedFilters() : Filter[] { return []; }

        removeFilter(filter : Filter) : RandomAccessStore { return this; }


        eachRow(rowAction:Function) {
            for (var i=0; i<this.length; i++) {
                rowAction(i);
            }
        }

    }
}