/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    class ColumnStore implements RandomAccessStore {

        public length : number;

        fields() : Field<any>[] {
            throw new Error("Not written");
        }

        field(key:String):ozone.Field<any> {
            throw new Error("Not written");
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
            throw new Error("Not written");
        }

    }
}