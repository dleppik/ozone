/** Jasmine tests */

"use strict";

describe("RowStore", function() {
    describe("CsvReader", function() {
        var testCsv = function(line, expected) {
            var reader = new ozone.rowStore.CsvReader();
            reader.onItem(line);
            var lineOutput = reader.columnNames;
            expect(lineOutput).toEqual(expected);
        };

        it("ignores completely blank lines", function() {
            testCsv("", []);
        });
        it("treats blank records as empty strings", function() {
            testCsv(",,,", ['','','']);
        });
        it("reads a line with one column", function() {
            testCsv("a", ["a"]);
        });
        it("reads a simple line", function() {
            testCsv("a,b,c", ["a", "b", "c"]);
        });
        it("strips whitespace", function() {
            testCsv(" a , b, c ", ["a", "b", "c"]);
        });
        it ("handles quotes", function() {
            testCsv('"hello, world"', ['hello, world']);
            testCsv('"hello, ""world"""', ['hello, "world"']);
            testCsv('"hello"","" world"', ['hello"," world']);
            testCsv('"hello"","" world" , unquoted', ['hello"," world', 'unquoted']);
            testCsv('"hello, ""world""" , """hello"", world","""hello,"", ""world"""',
                [       'hello, "world"',   '"hello", world',     '"hello,", "world"']);
            testCsv(' """hello"" ,"""",world""""", " h "" w", """" ',
                [           '"hello" ,"",world""',  ' h " w', '"']);
        });

    });
});