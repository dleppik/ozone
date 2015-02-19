/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />

/*
 *  This is the best place to start for an overview of the API.
 */
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
     * A DataStore that can be queried.  Also the result of most queries.  Fields from filtered views can be used
     * interchangeably with fields from the original database.
     *
     * More technically:
     *
     * A RandomAccessStore's rows are identified by internal IDs which exist solely to allow for efficient querying.
     * These IDs are unique to a particular RandomAccessStore:  reconstructing the store in a slightly different way
     * may yield completely different IDs.
     *
     * The default implementation (ColumnStore) uses integers for IDs because it is built around IntSets;  future
     * implementations (e.g. unions of stores) may use something else for IDs.
     */
    export interface RandomAccessStore extends DataStore {

        /** Returns a subset of this DataStore with the filter applied.  Applying the same filter twice has no effect. */
        filter(filter  : Filter)                  : RandomAccessStore;
        /** Creates an applies a ValueFilter. */
        filter(fieldId : string,     value : any) : RandomAccessStore;
        filter(field   : Field<any>, value : any) : RandomAccessStore;

        /** Returns all filters that have been applied, even if some are redundant. */
        filters() : Filter[];

        /**
         * Returns all filters that have been applied, with redundant ones merged.  This is optional, and meant for
         * user-friendly display, so it should only be applied if filters are redundant by definition.  For example,
         * an Or/Intersection filter may be removed when one of the intersected Filters is applied separately.
         */
        simplifiedFilters() : Filter[];

        /**
         *  Returns a RandomAccessStore that does not contain this filter.  If the filter is not applied, returns
         * itself.
         */
        removeFilter(filter : Filter) : RandomAccessStore;

        /**
         * Filters on all values of a Field at once, returns a map from value strings to filtered RandomAccessStores.
         * Does not return any values with empty Stores.
         */
        partition(fieldId : string) : { [value: string]: RandomAccessStore; };

        /** Returns partition(field.identifier). */
        partition(fieldDescription : FieldDescribing) : { [value: string]: RandomAccessStore; };

        /** The number of elements in the DataStore. */
        size : number;
    }


    /** Shared properties of Field and FieldDescriptor. */
    export interface FieldDescribing {
        /** The name used to access the field from its the DataStore. */
            identifier: string;

        /** The name users see for the field. */
            displayName : string;

        /** The data type of T;  the result of calling "typeof" on an item. */
            typeOfValue : string;

        /** The prototype for T, for identifying types when typeOfValue='object'.  This is experimental and might go away.*/
            typeConstructor : any;

        /**
         * If typeOfValue="number", describes the range and whether or not it is limited to integers.
         * Otherwise returns null.
         */
        range() : Range;

        /**
         * An estimate of the number of distinct values in the field (a.k.a. the attribute cardinality).  It
         * is intended to be used to determine how (or whether) another Store will store its values or what kind of
         * selection tool a UI will present.  Thus an exact value is of diminishing importance the more distinct values
         * there are. If the number of values is expected to be small (under 1000), it should give an exact count.  If
         * the number is expected to be large (over a tenth of the total number of records), it is reasonable to return
         * Number.POSITIVE_INFINITY.
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

        /** Returns the next item; subsequent calls return subsequent items.  Returns undefined if hasNext() is false. */
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
     * An unchanging list of non-negative integers.  To work well under a variety of circumstances, we allow for many
     * implementations.  The interface is written as if it were from a low-level, non-JavaScript language in the hopes
     * that we can coerce JavaScript implementations to compile it into something extremely efficient.
     */
    export interface IntSet {

        has(index : number) : boolean;

        /**
         * The lowest value for which has() returns true, or -1 if size === 0.  This should be extremely fast.
         * The behavior when size === 0 may change in future versions.
         */
        min() : number;

        /**
         * The highest value for which has() returns true, or -1 if size === 0. This should be extremely fast.
         * The behavior when size === 0 may change in future versions.
         */
        max() : number;

        /** The number of values for which has() returns true. */
        size() : number;

        /** Iterate over all "true" elements in order. */
        each(action : (index : number) => void);

        /** Iterate over all "true" elements in order. */
        iterator() : OrderedIterator<number>;

        /** Returns an IntSet containing only the elements that are found in both IntSets. */
        union(bm : IntSet) : IntSet;

        /** Returns an IntSet containing all the elements in either IntSet. */
        intersection(bm : IntSet) : IntSet;

        /** Returns true if the iterators produce identical results. */
        equals(bm : IntSet) : boolean;
    }

    /** An IntSet which stores its values as bits in 32-bit unsigned ints.   */
    export interface PackedIntSet extends IntSet {

        /** Word which has the minimum true bit */
        minWord() : number;

        /** Word which has the maximum true bit */
        maxWord() : number;

        /** Iterate over all the packed words in order. */
        wordIterator() : OrderedIterator<number>;

        /** If true, the PackedIntSet methods are not just available, but preferred. */
        isPacked : boolean;
    }

    /** Most IntSet class objects should be IntSetBuilding to provide a factory method. */
    export interface IntSetBuilding {
        /**
         * The returned Reducer is meant to be used once, to build exactly one IntSet.  A call to onItem()
         * sets a value, and calls should be done in order from lowest to highest.
         */
        builder(min? : number, max?: number) : Reducer<number,IntSet>
    }
}