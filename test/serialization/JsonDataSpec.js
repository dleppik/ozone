/**
 * Copyright 2014 by Vocal Laboratories, Inc. All rights reserved.
 */

"use strict";

describe("JSON Serialization", function() {

    describe("Type string parsing", function() {
        it ("Parses", function() {
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
            it("Writes the empty set", function() {
                var result = writeIntSet(ozone.intSet.empty);
                expect(result.type).toBe("empty");
            });

            it("Writes a range", function() {
                var result = writeIntSet(RangeIntSet.fromTo(10, 50));
                expect(result.type).toBe("range");
                expect(result.min).toBe(10);
                expect(result.max).toBe(50);
            });

            it("Writes an array", function() {
                var array = [1,3,7,15];
                var intSet = new ArrayIndexIntSet(array);
                var result = writeIntSet(intSet);
                expect(result.type).toBe("array");
                expect(result.data.length).toBe(array.length);
                for (var i=0; i<array.length; i++) {
                    expect(result.data[i]).toBe(array[i]);
                }
            });
        });

        describe("Round trip", function() {
            it("Handles the empty set", function() {
                var serialized = writeIntSet(ozone.intSet.empty);
                var deserialized = readIntSet(serialized);
                expect(deserialized).toBe(ozone.intSet.empty);  // not toEqual-- we want the same object
            });

            it ("Handles an array", function() {
                var initialSet = new ArrayIndexIntSet([1,3,7,15]);
                var serialized = writeIntSet(initialSet);
                var deserialized = readIntSet(serialized);
                expect(deserialized).toEqual(initialSet);
            });

            it ("Handles an array", function() {
                var initialSet = RangeIntSet.fromTo(10, 50);
                var serialized = writeIntSet(initialSet);
                var deserialized = readIntSet(serialized);
                expect(deserialized).toEqual(initialSet);
            });
        });
    });
});