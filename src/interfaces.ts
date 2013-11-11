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
        // TODO  User-friendly API for filtering and slicing;  something that's as compact as jQuery and as .
        // TODO  This is going to be the really cool part of this project when I get to it...
        // TODO

        /** Returns a proxy with the filter applied.  Applying the same filter twice has no effect. */
        filter(filter : Filter) : RandomAccessStore;


        /** Returns all filters that have been applied, even if some are redundant. */
        filters() : Filter[];

        /**
         * Returns all filters that have been applied, with redundant ones merged.  This is optional, and meant for
         * user-friendly display, so it should only be applied if filters are redundant by definition.  For example,
         * an Or/Intersection filter may be removed when one of the intersected Filters is returned by filters().
         * Or a Month filter may be removed if it is redundant with a Date filter.
         */
        simplifiedFilters() : Filter[];

        /**
         *  Returns a RandomAccessStore that does not contain this filter.  If the filter is not applied, returns
         * itself.
         */
        removeFilter(filter : Filter) : RandomAccessStore;

        /** The number of elements in the DataStore. */
        length : number;
    }

    export interface Filter {
        displayName : string;

        /** Used by RandomAccessStore to apply a filter. */
        applyFilter(store : RandomAccessStore) : Bitmap;
    }

    export interface RandomAccessField<T> extends Field<T> {
        // TODO provide bitmaps for values
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
        //canHold(otherField: Field<T>);

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
        /** Calls to onItem should generally be done inside an iterator, and done in order. */
        onItem(item : I);

        /** Returns the result and (often) resets for safe reuse. */
        onEnd() : R;
    }

    export interface Iterator<I> {
        /** Returns true if the iterator has more items. */
        hasNext() : boolean;

        /** Returns the next item.  Returns undefined if hasNext() is false. */
        next() : I;
    }

    /** Iterate over an ordered collection of items. */
    export interface OrderedIterator<I> extends Iterator<I> {
        /**
         * Skip all items before "item."  The next call to next() will return the next element greater than or equal to
         * "item."
         *
         * Thus, for an iterator returning all integers from 1 to 10 where next() has never been
         * called, skipTo(0) and skipTo(1) do nothing, whereas skipTo(11) causes hasNext() to return false.
         */
        skipTo(item : I);
    }

    /**
     * Our favorite column storage type is a bitmap for each value, with each bit representing a row index.  For
     * browser compatibility, and to test performance, we allow for many implementations.  These are read-only.
     */
    export interface Bitmap {

        get(index : number) : boolean;

        /** The lowest value for which get() returns true, or -1 if size === 0. */
        min() : number;

        /** The highest value for which get() returns true, or -1 if size === 0. */
        max() : number;

        /** The number of values for which get() returns true. */
        size : number;

        /** Iterate over all "true" elements in order. */
        each(action : (index : number) => void);

        /** Iterate over all "true" elements in order. */
        iterator() : OrderedIterator<number>;
    }

    /** Packs bits in 32-bit unsigned ints.   */
    export interface PackedBitmap {

        /** Equals Math.floor(min()/32). */
        minBits() : number;

        /** Equals Math.floor(min()/32). */
        maxBits() : number;

        /** If true, the PackedBitmap methods are not just available, but preferred. */
        isPacked : boolean;
    }

    /** Most Bitmap class objects should be BitmapBuilding to provide a factory method. */
    export interface BitmapBuilding {
        /**
         * The returned builder is meant to be used once, to build exactly one Bitmap.  A call to onItem()
         * sets a bit, and calls should be done in order from lowest to highest.
         */
        builder(min? : number, max?: number) : Reducer<number,Bitmap>
    }
}