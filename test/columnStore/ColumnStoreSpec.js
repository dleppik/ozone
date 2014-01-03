"use strict";

describe("ColumnStore", function() {

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
            name: { class: ozone.columnStore.ArrayField },
            pin:  { class: ozone.columnStore.ArrayField,
                    typeOfValue: "number",
                    range: new Range(101, 108, true)
            }
        }
    };

    var    rowStore = ozone.rowStore.buildCsv(data);
    var columnStore = ozone.columnStore.buildFromStore( rowStore, storeParams );
    var   nameField = columnStore.field("name");
    var  colorField = columnStore.field("color");
    var animalField = columnStore.field("animal");
    var    pinField = columnStore.field("pin");

    var ValueFilter = ozone.ValueFilter;

    it("Builds from a RowStore", function() {
        var fields = columnStore.fields();
        for (var i=0; i < fields.length; i++) {
            var field = fields[i];
            expect(field).toBeDefined();
            expect(field).toBe(columnStore.field(field.identifier));
        }

        expect(  nameField instanceof ozone.columnStore.ArrayField ).toBe(true);
        expect( colorField instanceof ozone.columnStore.IntSetField).toBe(true);
        expect(animalField instanceof ozone.columnStore.IntSetField).toBe(true);
        expect(   pinField instanceof ozone.columnStore.ArrayField ).toBe(true);
    });

    it("Builds ignoring fields when buildAllFields is false", function() {
        var params = {
            fields: {
                pin: { typeOfValue: "string" }
            },
            buildAllFields: false
        };
        var db = ozone.columnStore.buildFromStore( rowStore, params);
        expect(db.fields().length).toBe(1);
        expect(db.field("pin")).toBeDefined();
    });

    describe("IntSetField", function() {
        it("Has a builder which converts from strings to numbers", function() {
            var params = {
                fields: {
                    pin: { typeOfValue: "number", range: new Range(101,108,true) }
                },
                buildAllFields: false
            };
            var db = ozone.columnStore.buildFromStore( rowStore, params);
            var f = db.field("pin");
            expect(f instanceof ozone.columnStore.IntSetField).toBe(true);
            expect(f.values(0)[0]).toBe(101);
        });

        it("Has the right values", function() {
            var colors = colorField.allValues();
            expect(colors.length).toBe(3);
            var expectedColors = ["red", "green", "blue"];
            columnStore.eachRow(function(row) {
                var expected = expectedColors[row % expectedColors.length];
                expect(colorField.values(row)[0]).toBe(expected);
            });
        });
    });

    describe("ArrayField", function() {

        it("Has a builder which converts from strings to numbers", function() {
            expect(pinField.value(0)).toBe(101);
        });

        it("Has the right values", function() {
            var values = ["Alice", "Bob", "Chris", "Doug", "Ellie", "Frank", "Greg", "Hubert"];
            columnStore.eachRow(function(row) {
                expect(nameField.value(row)).toBe(values[row]);
                expect(nameField.values(row)[0]).toBe(values[row]);
            });
        });

        it("Implements rowHasValue correctly", function() {
            var dougCount = 0;
            var otherCount = 0;
            columnStore.eachRow(function(rowToken) {
                if (nameField.rowHasValue(rowToken, "Doug")) {
                    dougCount++;
                }
                else {
                    otherCount++;
                }
            });
            expect(dougCount).toBe(1);
            expect(otherCount).toBe(columnStore.length-1);
        });
    });


    describe("Filtering", function() {
        it("Filters on a single IntSetField", function() {
            var redStore = columnStore.filter( new ValueFilter(colorField, "red") );
            expect(redStore.length).toBe(3);

            var blueStore = columnStore.filter(new ValueFilter(colorField, "blue"));
            expect(blueStore.length).toBe(2);
        });

        it("Filters multiple IntSetFields", function() {
            var redDb = columnStore.filter( new ValueFilter(colorField, "red") );
            var redCatDb = redDb.filter( new ValueFilter(animalField, "cat") );
            expect(redCatDb.length).toBe(1);
            redCatDb.eachRow(function(rowToken) {
                expect(nameField.rowHasValue(rowToken, "Greg")).toBe(true);
            });
        });

        it("Filters on a single ArrayField", function() {
            var frankDb = columnStore.filter( new ValueFilter(nameField, "Frank") );
            expect(frankDb.length).toBe(1);
            frankDb.eachRow(function(rowToken) {
                expect(nameField.rowHasValue("Frank")).toBe(true);
            });
        });

        it("Filters on multiple ArrayFields", function() {
            var frankDb = columnStore.filter( new ValueFilter(nameField, "Frank") );
            expect(frankDb.filter(new ValueFilter(pinField, 106)).length).toBe(1);
            expect(frankDb.filter(new ValueFilter(pinField, 105)).length).toBe(0);
        });

        it("Filters ArrayFields and IntSetFields together", function() {
            var db = columnStore
                .filter( new ValueFilter(  nameField, "Frank"))
                .filter( new ValueFilter( colorField, "blue"))
                .filter( new ValueFilter(animalField, "dog"))
                .filter( new ValueFilter(   pinField, 106));
            expect(db.length).toBe(1);
        });
    });


});