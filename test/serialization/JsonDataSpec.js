/**
 * Copyright 2014 by Vocal Laboratories, Inc. All rights reserved.
 */

"use strict";

describe("JSON Serialization", function() {
    var ArrayIndexIntSet = ozone.intSet.ArrayIndexIntSet;
    var RangeIntSet = ozone.intSet.RangeIntSet;

    var data =
        "name,   color, animal, pin\n"+
            "Alice,    red,    cow, 101\n"+
            "Bob,    green,    dog, 102\n"+
            "Chris,   blue,    cat, 103\n"+
            "Doug,     red,    rat, 104\n"+
            "Ellie,  green,    cow, 105\n"+
            "Frank,   blue,    dog, 106\n"+
            "Greg,     red,    cat, 107\n"+
            "Hubert, green,    rat, 108\n";

    var storeParams = {
        fields: {
            name: { class: ozone.columnStore.UnIndexedField },
            color: { displayName : "Favorite Color" },
            pin:  { class: ozone.columnStore.UnIndexedField,
                typeOfValue: "number",
                range: new ozone.Range(101, 108, true)
            }
        }
    };

    var    rowStore = ozone.rowStore.buildFromCsv(data);
    var columnStore = ozone.columnStore.buildFromStore( rowStore, storeParams );
    var   nameField = columnStore.field("name");
    var  colorField = columnStore.field("color");
    var animalField = columnStore.field("animal");
    var    pinField = columnStore.field("pin");


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

    describe("Field", function() {
        var readField = ozone.serialization.readField;
        var writeField = ozone.serialization.writeField;

        describe("Reading", function() {
            it("Reads an indexed Field", function() {
                expect("Not written").toBeUndefined();
            });
            it("Reads an un-indexed Field", function() {
                expect("Not written").toBeUndefined();
            });
            it("Reads null and undefined displayName the both as null", function() {
                expect("Not written").toBeUndefined();
            });
        });

        describe("Writing", function() {
            it("Writes an indexed Field with strings", function() {
                var serialized = writeField(colorField);
                expect(serialized.type).toBe("indexed");
                expect(serialized.identifier).toBe("color");
                expect(serialized.displayName).toBe("Favorite Color");
                expect(serialized.typeOfValue).toBe("string");
                expect(serialized.typeConstructorName).toBeUndefined();
                expect(serialized.distinctValueEstimate).toBe(colorField.distinctValueEstimate());

                var values = ["blue", "green", "red"];  // Column reader sorts them alphabetically
                expect(serialized.values.length).toBe(3);
                for (var i=0; i<values.length; i++) {
                    expect(serialized.values[i].value).toBe(values[i]);
                }
            });

            it("Writes an un-indexed Field with strings", function() {
                var serialized = writeField(nameField);
                expect(serialized.type).toBe("unindexed");
                expect(serialized.identifier).toBe("name");
                expect(serialized.displayName).toBe("name");
                expect(serialized.typeOfValue).toBe("string");
                expect(serialized.typeConstructorName).toBeUndefined();
                expect(serialized.distinctValueEstimate).toBe(nameField.distinctValueEstimate());
                var expectedValues = ["Alice", "Bob", "Chris", "Doug", "Ellie", "Frank", "Greg", "Hubert"];

                expect(serialized.offset).toBe(0);
                expect(serialized.dataArray.length).toBe(expectedValues.length);
                for (var i=0; i<expectedValues.length; i++) {
                    expect(serialized.dataArray[i]).toBe(expectedValues[i]);
                }
            });

            it("Writes an un-indexed Field with numbers", function() {
                var field = pinField;
                var serialized = writeField(pinField);
                expect(serialized.type).toBe("unindexed");
                expect(serialized.identifier).toBe(pinField.identifier);
                expect(serialized.displayName).toBe(pinField.identifier);
                expect(serialized.typeOfValue).toBe("number");
                expect(serialized.typeConstructorName).toBeUndefined();
                expect(serialized.distinctValueEstimate).toBe(pinField.distinctValueEstimate());
                expect(serialized.offset).toBe(0);
                for (var i=0; i<8; i++) {
                    var expectedNum = 101+i;
                    expect(serialized.dataArray[i]).toBe(expectedNum);
                }
            });

            it("Writes an indexed Field with numbers", function() {
                var valueIds = ["a", "b", "c"];
                var valueData = {
                    a: new ArrayIndexIntSet([1, 3, 5, 9]),
                    b: new ArrayIndexIntSet([2, 4, 6, 8]),
                    c: new ArrayIndexIntSet([0, 1, 8, 16])
                };

                var descriptor = {
                    identifier: "NumField",
                    displayName: "Number Field",
                    typeOfValue: "number",
                    typeConstructor : null,
                    range: function() { return new ozone.Range(0, 16, true); },
                    distinctValueEstimate : function() { return valueData.length; }
                };

                var field = new ozone.columnStore.IndexedField(descriptor, valueIds, valueData);

                var serialized = writeField(field);
                expect(serialized.type).toBe("indexed");
                expect(serialized.identifier).toBe("NumField");
                expect(serialized.displayName).toBe("Number Field");
                expect(serialized.typeOfValue).toBe("number");
                expect(serialized.typeConstructorName).toBeUndefined();
                expect(serialized.distinctValueEstimate).toBe(valueIds.length);

                expect(serialized.values.length).toBe(valueIds.length);
                for (var i=0; i<valueIds.length; i++) {
                    var valueId = valueIds[i];
                    expect(serialized.values[i].value).toBe(valueId);
                    var valueArray = serialized.values[i].data.data;
                    var expectedValueArray = valueData[valueId].toArray();
                    expect(valueArray).toEqual(expectedValueArray);
                }
            });
        });

        describe("Round trip", function() {
            // TODO test indexed field IntSets
            expect("Not written").toBeUndefined();
        });
    });

    describe("IntSet", function() {
        var readIntSet = ozone.serialization.readIntSet;
        var writeIntSet = ozone.serialization.writeIntSet;

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
                expect(result.data).toEqual(array);
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