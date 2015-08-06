/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    export interface ColumnStoreInterface extends RandomAccessStore {

        /** Returns the row identifiers, which happen to be integers. */
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
        private fieldMap : { [key: string]: RandomAccessField<any>; } ;

        private cachedSize: number = null;

        constructor( private theRowCount: number, private fieldArray : RandomAccessField<any>[], private sizeFieldId : string ) {
            this.fieldMap = {};
            for (var i=0; i<fieldArray.length; i++) {
                var field = fieldArray[i];
                this.fieldMap[field.identifier] = field;
            }

            if (sizeFieldId) {
                var rcField = this.fieldMap[sizeFieldId];
                if (rcField===null) {
                    throw new Error("No field named '"+sizeFieldId+"' for record count");
                }
                else if (rcField.typeOfValue !== 'number') {
                    throw new Error(sizeFieldId+" can't be used as a record count, it isn't numerical");
                }
                else if (typeof rcField.value !== 'function') {
                    throw new Error(sizeFieldId+" can't be used as a record count, it isn't unary");
                }
            }
        }

        size() : number {
            if (this.cachedSize === null) {
                this.cachedSize = (this.sizeFieldId)  ?  this.sum(this.sizeFieldId)  :  this.theRowCount;
            }
            return this.cachedSize;
        }

        rowCount():number { return this.theRowCount; }

        sum(field : string | Field<number>) : number { return ozone.columnStore.sum(this, field); }

        intSet() : IntSet { return new ozone.intSet.RangeIntSet(0, this.size()); }

        fields() : RandomAccessField<any>[] { return this.fieldArray; }

        field(key:string) : RandomAccessField<any> { return (this.fieldMap.hasOwnProperty(key)) ? this.fieldMap[key] : null; }

        filter(fieldNameOrFilter : any, value? : any) : RandomAccessStore {
            return filterColumnStore(this, this, createFilter(this, fieldNameOrFilter, value));
        }

        filters()           : Filter[] { return []; }
        simplifiedFilters() : Filter[] { return []; }

        removeFilter(filter : Filter) : RandomAccessStore { return this; }

        partition(fieldAny : any) {
            var key : string = (typeof fieldAny === 'string') ? <string> fieldAny  : (<FieldDescriptor>fieldAny).identifier;
            return partitionColumnStore(this, this.field(key));
        }

        eachRow(rowAction:Function) {
            var max = this.rowCount();
            for (var i=0; i<max; i++) {
                rowAction(i);
            }
        }

        sizeField() : UnaryField<number> { return <any> this.field(this.sizeFieldId); }
    }
}