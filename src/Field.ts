/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />

module ozone {


    /**
     * An OLAP dimension.  Similar to a column in a database table, except that Fields may have multiple values per row.
     * Filtered stores should reuse fields from the unfiltered view.
     */
    export interface Field<T> extends FieldDescribing {

        /**
         * Returns all values for this row.  Never returns null.  This is called within DataStore.eachRow(), and uses
         * the token provided by that function.
         *
         * Filtered stores may reuse fields from the unfiltered view, resulting in erroneous results if called outside
         * of DataStore.eachRow().
         *
         * The values should be treated as a set, but this is not required.  Fields may sort values and ignore
         * duplicate values--but they are not required to.  Thus, one type of Field might return [1, 3, 3, 2] while
         * another type of field might present the same data as [1, 2, 3].
         *
         * If the order of the original import is not preserved, they should at least be in a deterministic order.
         * Thus, if one row returns [1, 2, 3], but the original data import was [1, 3, 2], every row with the same
         * values will return [1, 2, 3].
         */
        values(rowToken : any) : T[];

        /** Exists only on a UnaryField.  You can check for a UnaryField with (typeof field['value'] === 'function'). */
        value? : (rowToken : any) => T;
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

    /**
     * A Field where values(row) returns at most one value. This corresponds to a FieldDescriptor with
     * multipleValuesPerRow=false.
     */
    export interface UnaryField<T> extends Field<T> {
        /**
         * Returns the single value of values(rowToken), or null.  This is called within DataStore.eachRow(), and uses
         * the token provided by that function.
         */
        value(rowToken : any) : T;
    }

    /** Describes the JSON that FieldDescriptor.build() can take. */
    export interface FieldDescriptorOptions {
        typeOfValue      : string;
        identifier?      : string;
        displayName?     : string;
        unlimitedValues? : boolean;
        range?           : Range;
        multipleValuesPerRow? : boolean;
        distinctValues?  : number;
        aggregationRule? : string;
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
        public static build(ajax : FieldDescriptorOptions, identifier : string = null) {
            var id = (identifier===null) ? ajax["identifier"] : identifier;
            var displayName : string = ajax["displayName"]  ?  ajax["displayName"]  :  id;
            var precomputedRange : Range = ajax["range"] ? Range.build(ajax["range"]) : null ;
            var shouldCalculateDistinctValues = ( (!ajax["unlimitedValues"]) &&  typeof(ajax["distinctValues"]) !== "number");
            var distinctValues : number = (shouldCalculateDistinctValues || ajax["unlimitedValues"])
                ?  Number.POSITIVE_INFINITY
                :  ajax["distinctValues"];

            var allowsMultipleValues = (ajax.multipleValuesPerRow) ? true : false;

            var aggregationRule = ajax.aggregationRule ? ajax.aggregationRule : null;

            return new FieldDescriptor(id, ajax["typeOfValue"], null, allowsMultipleValues, displayName,
                precomputedRange, distinctValues, shouldCalculateDistinctValues, aggregationRule);
        }

        constructor( public identifier : string,
                            public typeOfValue : string,
                            public typeConstructor : any,
                            public multipleValuesPerRow : boolean,
                            public displayName: string,
                            public precomputedRange : Range,
                            public distinctValues : number,
                            public shouldCalculateDistinctValues : boolean,
                            public aggregationRule : string)
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