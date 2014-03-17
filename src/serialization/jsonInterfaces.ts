/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */

/// <reference path='../_all.ts' />

/*
 * This file contains specifications for the JSON file formats, in the form of TypeScript interfaces.  We will try to
 * maintain backwards compatibility in future readers, so that non-JavaScript implementations won't need to be
 * rewritten.
 *
 * A "type" field is used to specify a sub-interface.  Types may be nested with a slash, and hints are specified
 * at the end with a semicolon.  Unknown hints may be ignored.
 */

module ozone.serialization {

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