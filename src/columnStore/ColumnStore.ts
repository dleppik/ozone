/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    export interface ColumnStoreInterface extends RandomAccessStore {
        intSet() : IntSet;
    }

    /**
     * This is the native internal format for Ozone DataStores.  The ColumnStore is little more than a container for
     * Fields.  IndexedFields are generally more efficient than UnIndexedFields-- with the assumption that
     * Field.distinctValueEstimate() is usually low.
     *
     * <p>
     *     Conceptually the DataStore represents a dense array of rows, and each row is identified by its array index.
     *     In fact there is no such array;  the index exists to identify records across Fields.
     * </p>
     *
     * <p>
     *     Confusingly, "index" refers both to the map of values to row identifiers (i.e. a database index) and an
     *     individual row identifier, since conceptually (but not literally) the DataStore is a dense array of rows.
     * </p>
     */
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