/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    export class ColumnStore implements RandomAccessStore {

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


        fields() : Field<any>[] {
            return this.fieldArray;
        }

        field(key:String) : Field<any> {
            return this.fieldMap[name];
        }

        filter(filter : Filter) : RandomAccessStore {
            throw new Error("Not written");
        }

        filters() : Filter[] {
            return [];
        }

        simplifiedFilters() : Filter[] {
            throw new Error("Not written");
        }

        removeFilter(filter : Filter) : RandomAccessStore {
            throw new Error("Not written");
        }


        eachRow(rowAction:Function) {
            for (var i=0; i<this.length; i++) {
                rowAction(i);
            }
        }

    }
}