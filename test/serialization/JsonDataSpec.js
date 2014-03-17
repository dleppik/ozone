/**
 * Copyright 2014 by Vocal Laboratories, Inc. All rights reserved.
 */

"use strict";

describe("JSON Serialization", function() {
    var ArrayIterator = ozone.intSet.OrderedArrayIterator;

    describe("Type string parsing", function() {
        var parse = ozone.serialization.parseType;
        expect(parse( "a"     ).mainType).toEqual( "a" );
        expect(parse( "a/b"   ).mainType).toEqual( "a" );
        expect(parse( "a/b;c" ).mainType).toEqual( "a" );

        expect(parse( "a"       ).subTypes).toEqual( [] );
        expect(parse( "a/b"     ).subTypes).toEqual( ["b"] );
        expect(parse( "a/b/c;d" ).subTypes).toEqual( ["b","c"] );

        expect(parse( "a"       ).hints).toEqual( [] );
        expect(parse( "a;b"     ).hints).toEqual( ["b"] );
        expect(parse( "a/b;c;d" ).hints).toEqual( ["c", "d"] );
    });

    describe("IntSet", function() {
        var readIntSet = ozone.serialization.readIntSet;
        var writeIntSet = ozone.serialization.writeIntSet;
        var ArrayIndexIntSet = ozone.intSet.ArrayIndexIntSet;
        var RangeIntSet = ozone.intSet.RangeIntSet;

        describe("Reading", function() {
            it("Reads an empty type to be the empty set", function() {
                expect(readIntSet( {type:"empty"} )).toBe(ozone.intSet.empty);
            });

            describe("range", function() {
                expect(readIntSet( {type:"range", min:1, max:100} )).toEqual(RangeIntSet.fromTo(1, 100));
            });

            describe("array", function() {
                it("Reads array data", function() {
                    var expected = new ArrayIndexIntSet([1, 3, 5]);
                    expect(readIntSet( {type:"array", data:[1,3,5]} )).toEqual(expected);
                });
            });
        });

        describe("Writing", function() {
            expect("not written").toBeFalsy();
        });

        describe("Round trip", function() {
            expect("not written").toBeFalsy();
        });
    });
});