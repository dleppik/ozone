/**
 * Temporary node script, until things are more formalized.
 * Run from Node REPL in this directory.
 */
var fs = require('fs');

eval(fs.readFileSync('../lib/ozone.js', {encoding: 'utf-8'}));

//var data = JSON.parse(fs.readFileSync("trivialSampleData.json"), {encoding: "utf-8"});
//var store = ozone.RowStore.build(data.fields, data.data);

var filename = 'foo.csv';

var dataArray = fs.readFileSync(filename, {encoding: 'utf-8'}).split("\n");

var extractColumns = function() {
    var reader = new ozone.CsvReader();
    reader.read(dataArray[0]);
    var result = {};
    for (var index in reader.columnNames) {
        result[reader.columnNames[index]] = {typeOfValue: "string"};
    }
    return result;
};

extractColumns();

var store = ozone.RowStore.build(extractColumns(), dataArray, new ozone.CsvReader());