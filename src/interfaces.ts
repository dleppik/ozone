/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />

module ozone {

    /**
     * A collection of Fields.  This is designed for bulk reading, particularly to convert from one type of DataStore
     * to another.
     */
    export interface DataStore {

        /** Returns the list of fields in their preferred order. */
        fields() : Field<any>[];

        /** Returns the field matching the key. */
        field(key : string) : Field<any>;

        /**
         * Iterate over the rows of the DataStore.  Use in conjunction with Field.values() and UnaryField.value().
         */
        eachRow(rowAction : (rowToken : any) => void);
    }

    /**
     * A DataStore that can be queried.  Also the result of most queries.
     */
    export interface RandomAccessStore extends DataStore {
        // TODO
        // TODO  This is going to be the really cool part of this project when I get to it...
        // TODO
    }


    /**
     * An OLAP dimension.  Similar to a column in a database table, except that Fields may have multiple values per row.
     */
    export interface Field<T> extends FieldDescribing {

        /**
         * If true, this field's data type is exactly convertible from of the other field's, and therefore it can
         * hold the other field's data.  For example, a UnaryField<string> can hold the values from a Field<string>.
         * Similarly, the DataStore may provide conversions from numbers to Dates or from booleans to strings.
         *
         * This is particularly useful for building proxy DataStores which can convert from one format to another on
         * the fly.
         */
        // TODO  This really needs to be a property of transformers
        canHold(otherField: Field<T>);

        /**
         * Returns all values for this row.  Never returns null.  This is called within DataStore.eachRow(), and uses
         * the token provided by that function.
         */
        values(rowToken : any) : T[];
    }

    /** A Field where values(row) returns at most one value. */
    export interface UnaryField<T> extends Field<T> {
        /**
         * Returns the single value of values(rowToken), or null.  This is called within DataStore.eachRow(), and uses
         * the token provided by that function.
         */
        value(rowToken : any) : T;
    }


    /** Shared properties of Field and FieldDescriptor. */
    export interface FieldDescribing {
        /** The name used to access the field from its the DataStore. */
            identifier: string;

        /** The name users see for the field. */
            displayName : string;

        /** The data type of T. */
            typeOfValue : string;

        /** The prototype for T, for identifying types when typeOfValue='object'. */
            typeConstructor : any;

        /**
         * If typeOfValue="number", describes the range and whether or not it is limited to integers.
         * Otherwise returns null.
         */
        range() : Range;

        /**
         * An estimate of the number of distinct values that this has.  It is intended to be used to determine how (or
         * whether) another Store will store its values.  If the number of values is expected to be small (under
         * 1000), it should give an exact count.  If the number is expected to be large (over a tenth of the total
         * number of records), it is reasonable to return Number.POSITIVE_INFINITY.
         */
        distinctValueEstimate() : number;
    }

    /**
     * Follows the MapReduce pattern, although as written this is not intended to be thread safe.
     */
    export interface Reducer<I,R> {
        onItem(item : I);
        onEnd() : R;
    }
}