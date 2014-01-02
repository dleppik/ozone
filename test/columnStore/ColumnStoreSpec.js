"use strict";

describe("ColumnStore", function() {

    var data =
        "name,   color, animal\n"+
        "Alice,    red,    cow\n"+
        "Bob,    green,    dog\n"+
        "Chris,   blue,    cat\n"+
        "Doug,     red,    rat\n"+
        "Ellie,  green,    cow\n"+
        "Frank,   blue,    dog\n"+
        "Greg,     red,    cat\n"+
        "Hubert, green,    rat\n";
    var columnStore = ozone.columnStore.buildFromStore( ozone.rowStore.buildCsv(data) );
    var   nameField = columnStore.field("name");
    var  colorField = columnStore.field("color");
    var animalField = columnStore.field("animal");

    it("Builds from a RowStore", function() {
        var fields = columnStore.fields();
        for (var i=0; i < fields.length; i++) {
            var field = fields[i];
            expect(field).toBeDefined();
            expect(field).toBe(columnStore.field(field.identifier));
        }

        expect(nameField).toBeDefined();
        expect(colorField).toBeDefined();
        expect(animalField).toBeDefined();

        expect(colorField instanceof ozone.columnStore.IntSetField).toBe(true);
        expect(animalField instanceof ozone.columnStore.IntSetField).toBe(true);
    });

    describe("IntSetField", function() {
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

    describe("Filtering", function() {
        it("Filters a single IntSetField value", function() {
            var redFilter = new ozone.ValueFilter(colorField, "red");
            var redStore = columnStore.filter(redFilter);
            expect(redStore.length).toBe(3);

            var blueFilter = new ozone.ValueFilter(colorField, "blue");
            var blueStore = columnStore.filter(blueFilter);
            expect(blueStore.length).toBe(2);
        });
    });

    describe("ArrayField", function() {
        it("Unit tests need to be written", function() {
            expect("Need to write").toBe(true);
        });
    });

});