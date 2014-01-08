/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />

module ozone {


    /**
     * An OLAP dimension.  Similar to a column in a database table, except that Fields may have multiple values per row.
     * Filtered stores may reuse fields from the unfiltered view.
     */
    export interface Field<T> extends FieldDescribing {

        /**
         * Returns all values for this row.  Never returns null.  This is called within DataStore.eachRow(), and uses
         * the token provided by that function.
         *
         * Filtered stores may reuse fields from the unfiltered view, resulting in erroneous results if called outside
         * of DataStore.eachRow().
         */
        values(rowToken : any) : T[];
    }

    /** All fields in a RandomAccessStore are RandomAccessFields. */
    export interface RandomAccessField<T> extends Field<T> {

        /**
         * Used to implement filtering and access methods within a RandomAccessStore;  it should only be called using
         * tokens supplied by its store.
         *
         * Filtered stores may reuse fields from the unfiltered view, resulting in erroneous results if called outside
         * of DataStore.eachRow().
         */
        rowHasValue(rowToken : any, value : any) : boolean;
    }

    /** A Field where values(row) returns at most one value. */
    export interface UnaryField<T> extends Field<T> {
        /**
         * Returns the single value of values(rowToken), or null.  This is called within DataStore.eachRow(), and uses
         * the token provided by that function.
         */
        value(rowToken : any) : T;
    }

    export class FieldDescriptor implements FieldDescribing {

        /**
         * Factory method for building from AJAX.  The AJAX must contain typeOfValue.  If an identifier is not provided
         * separately, that must also be provided. Additionally it may provide displayName, precomputedRange,
         * distinctValues, and multipleValuesPerRow.  If "unlimitedValues" is true,
         * shouldCalculateDistinctValues will be false and distinctValues will be Number.POSITIVE_INFINITY.
         *
         * The default for multipleValuesPerRow is false.
         */
        public static build(ajax : any, identifier : string = null) {
            var id = (identifier===null) ? ajax["identifier"] : identifier;
            var displayName : string = ajax["displayName"]  ?  ajax["displayName"]  :  id;
            var precomputedRange : Range = ajax["range"] ? ajax["range"] : null ;
            var shouldCalculateDistinctValues = ( (!ajax["unlimitedValues"]) &&  typeof(ajax["distinctValues"]) !== "number");
            var distinctValues : number = (shouldCalculateDistinctValues || ajax["unlimitedValues"])
                ?  Number.POSITIVE_INFINITY
                :  ajax["distinctValues"];

            var allowsMultipleValues = ajax["multipleValuesPerRow"] ? true : false;

            return new FieldDescriptor(id, ajax["typeOfValue"], null, allowsMultipleValues, displayName,
                precomputedRange, distinctValues, shouldCalculateDistinctValues);
        }

        constructor( public identifier : string,
                            public typeOfValue : string,
                            public typeConstructor : any,
                            public multipleValuesPerRow : boolean,
                            public displayName: string,
                            public precomputedRange : Range,
                            public distinctValues : number,
                            public shouldCalculateDistinctValues : boolean)
        {
        }

        public range() : Range {
            return this.precomputedRange;
        }

        public distinctValueEstimate() : number {
            return this.distinctValues;
        }
    }
}