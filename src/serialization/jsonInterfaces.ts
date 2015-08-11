/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */

/// <reference path='../_all.ts' />

/*
 * This file contains specifications for the JSON file formats, in the form of TypeScript interfaces.  We will try to
 * maintain backwards compatibility in future readers, so that non-JavaScript implementations won't need to be
 * rewritten.
 *
 * Nulls are not allowed to be written for any values specified below;  where a property may be null, it has a separate
 * interface.  When reading, nulls should be interpreted as undefined.  This is because, while nulls are legal in JSON,
 * they are uncommon, and JSON libraries for other languages have sometimes not handled them properly.
 *
 * A "type" field is used to specify a sub-interface.  Types may be nested with a slash, and hints are specified
 * at the end with a semicolon.  Unknown hints may be ignored.
 */

module ozone.serialization {

    /** Mirrors DataStore.  Really should be called DataStoreData, but that would be silly. */
    export interface StoreData {
        rowCount : number;
        fields : FieldMetaData[];
        sizeFieldId? : string;
    }

    /**
     * Mirrors FieldDescribing.  Type may currently be "indexed" or "unindexed."
     * Note that distinctValueEstimate may not be infinite since JSON doesn't allow infinity,
     * but for unindexed Fields it can be a gross overestimate of the exact values.
     */
    export interface FieldMetaData {
        type: string;
        identifier : string;
        displayName: string;
        typeOfValue : string;
        distinctValueEstimate : number;
        aggregationRule? : string;
    }

    export interface NumericalFieldMetaData extends FieldMetaData {
        range : RangeData;
    }

    /**  Required when typeOfValue==='object';  this is experimental and might go away.  */
    export interface TypeConstructorFieldMetaData extends FieldMetaData {
        typeConstructorName : string;
    }

    export interface RangeData {
        min : number;
        max : number;
        integerOnly : boolean;
    }

    export interface IndexedFieldData extends FieldMetaData {
        values : ValueIndexData[];
    }

    export interface ValueIndexData {
        value : any;
        data : IntSetMetaData;
    }

    export interface UnIndexedFieldData extends FieldMetaData {
        offset : number;
        dataArray : any[];
        // nullProxy is an experimental feature which we don't currently serialize
    }

    export interface IntSetMetaData {
        /**
         * Determines the sub-interface.  Subtypes are specified with a slash, hints are appended with a semicolon.
         *
         * The special type "empty" has no sub-interface.
         */
        type: string;
    }

    /** Type = "range". */
    export interface IntSetRangeData extends IntSetMetaData {
        min: number;
        max: number;
    }

    /** Stores data as a sorted array.  Type = "array". */
    export interface IntSetArrayData extends IntSetMetaData {
        /** The values, sorted from lowest to highest. */
        data : number[];
    }

    /**
     * ASCII Run-Length Encoding IntSet:  a fairly compact ASCII representation of a bitmap.  Type = "arle/n" where n
     * is the base.  Typically arle/36.
     *
     * This is a quick, good-enough implementation that doesn't require WindowBase64.btoa() (not in IE 9 or Node.js)
     * or ArrayBuffer (not in IE 9).  As a result, this is likely to go away once we drop support for IE 9.  (We are
     * likely to be considerably slower than Microsoft in dropping IE 9 support.)
     *
     * Consists of a string of numbers; single digit numbers are written verbatim, while multi-digit numbers are in
     * parentheses.  The base of the numbers varies; ARLE-10 is base-10, useful for debugging, ARLE-36 is the most
     * compact. Thus, the ARLE-10 string '4(32)123(18)' yields the numbers [4, 32, 1, 2, 3, 18].
     *
     * Once the string of numbers is decoded, interpretation is simple run-length encoding: the first digit is the
     * number of 0's, the second is the number of 1's, and so on.  Thus, the ARLE-10 string '3211' yields the
     * little-endian bits 0001101, which in turn means that the IntSet consists of 3, 4, and 6.  Similarly, '0123'
     * yields bits 100111, and the IntSet consists of the numbers [0, 3, 4, 5].  Note that '0' should only occur as the
     * first character, where it indicates that the IntSet includes 0.  Because the bits should always end with a 1,
     * there is always an even number of run-length numbers.
     */
    export interface IntSetArleData extends IntSetMetaData {
        data : string;
    }
}