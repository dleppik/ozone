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
        size : number;
        fields : FieldMetaData[];
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
}