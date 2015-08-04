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

    describe("ColumnStore", function() {
        var readStore = ozone.serialization.readStore;
        var writeStore = ozone.serialization.writeStore;

        describe("Writing", function() {
            it("writes a simple DataStore", function() {
                var serialized = writeStore(columnStore);
                expect(serialized.rowCount).toBe(columnStore.rowCount());
                expect(serialized.fields.length).toBe(4);
                for (var i=0; i<serialized.fields.length; i++) {
                    expect(serialized.fields[i].identifier).toBe(columnStore.fields()[i].identifier);
                }
            });
            it("writes an aggregate DataStore", function() {
                var aggregated = ozone.columnStore.buildFromStore(
                    ozone.transform.aggregate(columnStore, {includeFields: ['name', 'animal']})
                );
                var serialized = writeStore(aggregated);
                expect(serialized.rowCount).toBe(columnStore.rowCount());
            });
        });

        //
        // We'll just skip reading tests and go straight on to round trips;  there's not much
        // to go wrong at this level.
        //
        describe("Round Trip", function() {
            it("Writes to a string and reads back a non-aggregated Store", function() {
                var serialized = JSON.stringify(writeStore(columnStore));
                var deserialized = readStore(JSON.parse(serialized));

                expect(deserialized.size()).toBe(columnStore.size());
                expect(deserialized.fields().length).toBe(columnStore.fields().length);
                expect(deserialized.fields().length).toBe(4);
                for (var i=0; i<deserialized.fields().length; i++) {
                    var expectedField = columnStore.fields()[i];
                    var actualField = deserialized.fields()[i];
                    expect(expectedField.identifier).toBe(actualField.identifier);
                    expect(expectedField.displayName).toBe(actualField.displayName);
                }

                expect(  deserialized.filter("animal", "cow").size())
                    .toBe(columnStore.filter("animal", "cow").size());

                // What we shouldn't check:
                // columnStore.intSet() doesn't need to match
            });

            it("Writes to a string and reads back an aggregated Store", function() {
                var aggregated = ozone.columnStore.buildFromStore(
                    ozone.transform.aggregate(columnStore, {includeFields: ['name', 'animal']})
                );

                var serialized = JSON.stringify(writeStore(aggregated));
                var deserialized = readStore(JSON.parse(serialized));

                expect(deserialized.sizeField().identifier).toBe('Records');

                expect(deserialized.rowCount()).toBe(aggregated.rowCount());
                expect(deserialized.size()).toBe(aggregated.size());
                expect(deserialized.fields().length).toBe(aggregated.fields().length);
                expect(deserialized.fields().length).toBe(3);
                for (var i=0; i<deserialized.fields().length; i++) {
                    var expectedField = aggregated.fields()[i];
                    var actualField = deserialized.fields()[i];
                    expect(expectedField.identifier).toBe(actualField.identifier);
                    expect(expectedField.displayName).toBe(actualField.displayName);
                }

                expect(deserialized.sum('Records')).toBe(columnStore.size());

                expect(  deserialized.filter("animal", "cow").size())
                    .toBe(columnStore.filter("animal", "cow").size());

                // What we shouldn't check:
                // columnStore.intSet() doesn't need to match
            });
        });

    });

    describe("Field", function() {
        var readField = ozone.serialization.readField;
        var writeField = ozone.serialization.writeField;
        var IndexedField = ozone.columnStore.IndexedField;
        var UnIndexedField = ozone.columnStore.UnIndexedField;

        describe("Reading", function() {
            it("Reads an indexed Field", function() {
                var indexedField = {
                    type        : "indexed",
                    identifier  : "MyIndexed",
                    displayName : "My Indexed Field",
                    typeOfValue : "string",
                    distinctValueEstimate : 2,
                    values : [
                        {value : "a", data : {type: "empty"}},
                        {value : "b", data : {type: "range", min: 1, max: 10}}
                    ]
                };
                var deserialized = readField(indexedField);

                expect(deserialized instanceof IndexedField).toBe(true);
                expect(deserialized.identifier             ).toBe("MyIndexed");
                expect(deserialized.displayName            ).toBe("My Indexed Field");
                expect(deserialized.typeOfValue            ).toBe("string");
                expect(deserialized.distinctValueEstimate()).toBe(2);

                expect(deserialized.intSetForValue("a")).toEqual(ozone.intSet.empty);
                expect(deserialized.intSetForValue("b")).toEqual(RangeIntSet.fromTo(1, 10));

                var store = new ozone.columnStore.ColumnStore(11, [deserialized]);
                expect(store.filter("MyIndexed", "a").size() ).toBe(0);
                expect(store.filter("MyIndexed", "b").size() ).toBe(10);
            });

            it("Reads an un-indexed Field", function() {
                var unIndexedField = {
                    type        : "unindexed",
                    identifier  : "NotIndexed",
                    displayName : "My Not-so-indexed Field",
                    typeOfValue : "number",
                    range       : { min: 1, max: 9, integerOnly: false },
                    distinctValueEstimate : Number.MAX_VALUE,
                    offset : 10,
                    dataArray : [ 3.14, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5 ]
                };
                var deserialized = readField(unIndexedField);

                expect(deserialized instanceof UnIndexedField).toBe(            true);
                expect(deserialized.identifier               ).toBe(            "NotIndexed");
                expect(deserialized.displayName              ).toBe(            "My Not-so-indexed Field");
                expect(deserialized.typeOfValue              ).toBe(            "number");
                expect(deserialized.distinctValueEstimate()  ).toBeGreaterThan( 7);
                expect(deserialized.range()                  ).toEqual(         new ozone.Range(1, 9, false));
                expect(deserialized.value(10)                ).toBe(            3.14);
                expect(deserialized.value(20)                ).toBe(            5);
            });

            it("Null or undefined displayName use identifier, but other falsies are used literally", function() {
                var unIndexedField = {
                    type        : "unindexed",
                    identifier  : "NotIndexed",
                    typeOfValue : "string",
                    distinctValueEstimate : Number.MAX_VALUE,
                    offset : 10,
                    dataArray : [ "hello" ]
                };
                expect(readField(unIndexedField).displayName).toBe("NotIndexed");

                unIndexedField.displayName = null;
                expect(readField(unIndexedField).displayName).toBe("NotIndexed");

                unIndexedField.displayName = "0";
                expect(readField(unIndexedField).displayName).toBe("0");

                unIndexedField.displayName = "false";
                expect(readField(unIndexedField).displayName).toBe("false");
            });
        });

        describe("Writing", function() {
            it("Writes an indexed Field with strings", function() {
                var serialized = writeField(colorField);
                expect(serialized.type                 ).toBe("indexed");
                expect(serialized.identifier           ).toBe("color");
                expect(serialized.displayName          ).toBe("Favorite Color");
                expect(serialized.typeOfValue          ).toBe("string");
                expect(serialized.typeConstructorName  ).toBeUndefined();
                expect(serialized.distinctValueEstimate).toBe(colorField.distinctValueEstimate());

                var values = ["blue", "green", "red"];  // Column reader sorts them alphabetically
                expect(serialized.values.length).toBe(3);
                for (var i=0; i<values.length; i++) {
                    expect(serialized.values[i].value).toBe(values[i]);
                }
            });

            it("Writes an un-indexed Field with strings", function() {
                var serialized = writeField(nameField);
                expect(serialized.type                 ).toBe("unindexed");
                expect(serialized.identifier           ).toBe("name");
                expect(serialized.displayName          ).toBe("name");
                expect(serialized.typeOfValue          ).toBe("string");
                expect(serialized.typeConstructorName  ).toBeUndefined();
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
                expect(serialized.type                 ).toBe("unindexed");
                expect(serialized.identifier           ).toBe(pinField.identifier);
                expect(serialized.displayName          ).toBe(pinField.identifier);
                expect(serialized.typeOfValue          ).toBe("number");
                expect(serialized.typeConstructorName  ).toBeUndefined();
                expect(serialized.distinctValueEstimate).toBe(pinField.distinctValueEstimate());
                expect(serialized.offset).toBe(0);
                for (var i=0; i<8; i++) {
                    var expectedNum = 101+i;
                    expect(serialized.dataArray[i]).toBe(expectedNum);
                }
            });

            it("Writes an indexed Field with numbers", function() {
                var field = indexedFieldWithNumbers();
                var valueIds = field.allValues();

                var serialized = writeField(field);
                expect(serialized.type                 ).toBe("indexed");
                expect(serialized.identifier           ).toBe("NumField");
                expect(serialized.displayName          ).toBe("Number Field");
                expect(serialized.typeOfValue          ).toBe("number");
                expect(serialized.typeConstructorName  ).toBeUndefined();
                expect(serialized.distinctValueEstimate).toBe(valueIds.length);

                expect(serialized.values.length).toBe(valueIds.length);
                for (var i=0; i<valueIds.length; i++) {
                    var valueId = valueIds[i];
                    expect(serialized.values[i].value).toBe(valueId);
                    var valueArray = serialized.values[i].data.data;
                    var expectedValueArray = field.intSetForValue(valueId).toArray();
                    expect(valueArray).toEqual(expectedValueArray);
                }
            });
        });

        describe("Round trip, with JSON.stringify/parse", function() {

            function roundTripWithGenericAssertions(field) {
                var serialized = JSON.stringify(writeField(field));
                var result = readField(JSON.parse(serialized));
                expect(result.identifier  ).toEqual(field.identifier);
                expect(result.displayName ).toEqual(field.displayName);
                expect(result.typeOfValue ).toEqual(field.typeOfValue);
                return result;
            }

            function roundTripIndexedField(field) {
                var deserialized = roundTripWithGenericAssertions(field);

                var expectedValues = field.allValues();
                expect(deserialized.allValues()).toEqual(expectedValues);
                for (var i=0 ;i<expectedValues.length; i++) {
                    var value = expectedValues[i];
                    expect(deserialized.intSetForValue(value)).toEqual(field.intSetForValue(value));
                }
            }

            function roundTripUnIndexedField(field) {
                var deserialized = roundTripWithGenericAssertions(field);
                expect(deserialized.firstRowToken()).toEqual(field.firstRowToken());
                expect(deserialized.dataArray()    ).toEqual(field.dataArray());
            }

            it("Handles an   IndexedField with strings", function() { roundTripIndexedField(   colorField                ); });
            it("Handles an   IndexedField with numbers", function() { roundTripIndexedField(   indexedFieldWithNumbers() ); });
            it("Handles an UnIndexedField with strings", function() { roundTripUnIndexedField( nameField                 ); });
            it("Handles an UnIndexedField with numbers", function() { roundTripUnIndexedField( pinField                  ); });
        });

        function indexedFieldWithNumbers() {
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
            return new ozone.columnStore.IndexedField(descriptor, valueIds, valueData);
        }
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

        describe("Round trip, with JSON.stringify/parse", function() {
            it("Handles the empty set", function() {
                var serialized = JSON.stringify(writeIntSet(ozone.intSet.empty));
                var deserialized = readIntSet(JSON.parse(serialized));
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
});