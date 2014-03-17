/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.serialization {

    export function readIntSet( jsonData : any) : IntSet {
        //
        // Types generally mirror the IntSet implementations, but there is no requirement that they serialize
        // one-to-one.
        //

        if (jsonData.hasOwnProperty("type")) {
            var type = parseType(jsonData.type);
            if (type.subTypes.length > 0) {
                throw new Error("Unknown subtypes: "+type.subTypes);
            }
            switch (type.mainType) {
                case "array" : return intSet.ArrayIndexIntSet.fromArray(jsonData.data);
                case "empty" : return ozone.intSet.empty;
                case "range" : return intSet.RangeIntSet.fromTo(jsonData.min, jsonData.max);
                default: throw new Error("Unknown IntSet type: "+jsonData.type)
            }
        }
        else {
            throw new Error("IntSet type not specified");
        }
    }

    export function writeIntSet( toWrite : IntSet ) : IntSetMetaData {
        if (toWrite.size === 0)                    return writeEmptyIntSet(toWrite);
        if (toWrite instanceof intSet.RangeIntSet) return writeRangeIntSet(<intSet.RangeIntSet> toWrite);
        return writeIntSetArrayData(toWrite);
    }

    function writeEmptyIntSet(toWrite : IntSet) : IntSetMetaData {
        return { type: "empty"};  // Trivial function, but this provides compile-time type safety
    }

    function writeRangeIntSet(rangeIntSet : intSet.RangeIntSet) : IntSetRangeData {
        return {
            type : "range",
            min: rangeIntSet.min(),
            max: rangeIntSet.max()
        };
    }

    function writeIntSetArrayData(toWrite : IntSet) : IntSetArrayData {
        var array : number[] = [];
        if (toWrite instanceof intSet.ArrayIndexIntSet) {
            array = (<intSet.ArrayIndexIntSet> toWrite).toArray();
        }
        else {
            toWrite.each(value => { array.push(value) });
        }
        return {
            type: "array",
            data: array
        };
    }

    export function parseType( typeString : String) {
        var hintSplit = typeString.split(";");
        var nonHint = hintSplit[0];
        var hints = hintSplit.slice(1);

        var types = nonHint.split("/");
        var mainType = types[0];
        return new ParsedType(mainType, types.splice(1), hints);
    }

    export class ParsedType {
        constructor(
            public mainType: string,
            public subTypes : string[],
            public hints: string[])
        {}

        next() : ParsedType {
            if (this.subTypes.length === 0) {
                return null;
            }
            return new ParsedType(this.subTypes[0], this.subTypes.slice(1), this.hints);
        }
    }
}