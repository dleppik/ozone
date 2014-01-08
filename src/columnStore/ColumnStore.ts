/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    export interface ColumnStoreInterface extends RandomAccessStore {
        intSet() : IntSet;
    }

    export class ColumnStore implements ColumnStoreInterface {

        /**
         * ECMAScript doesn't require associative arrays to retain the order of their keys, although most
         * implementations do.  (Rhino doesn't.)  So a separate fieldArray isn't completely redundant.
         */
        private fieldMap : { [key: string]: Field<any>; } ;


        constructor( public size: number, private fieldArray : Field<any>[] ) {
            this.fieldMap = {};
            for (var i=0; i<fieldArray.length; i++) {
                var field = fieldArray[i];
                this.fieldMap[field.identifier] = field;
            }
        }

        intSet() : IntSet {
            return new ozone.intSet.RangeIntSet(0, this.size);
        }

        fields() : Field<any>[] {
            return this.fieldArray;
        }

        field(key:string) : Field<any> {
            return this.fieldMap[key];
        }

        filter(fieldNameOrFilter : any, value? : any) : RandomAccessStore {
            return filterColumnStore(this, this, createFilter(this, fieldNameOrFilter, value));
        }

        filters()           : Filter[] { return []; }
        simplifiedFilters() : Filter[] { return []; }

        removeFilter(filter : Filter) : RandomAccessStore { return this; }

        partition(fieldKey : string) {
            return partitionColumnStore(this, <RandomAccessField<any>> this.field(fieldKey));
        }

        eachRow(rowAction:Function) {
            for (var i=0; i<this.size; i++) {
                rowAction(i);
            }
        }

    }
}