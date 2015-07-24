/**
 * Temporary node script, until things are more formalized.
 * Run from Node REPL in this directory.
 */
var fs = require('fs');
eval(fs.readFileSync('../ozone.js', {encoding: 'utf-8'}));


var filename = "SummerOlympicMedallists1896to2008.csv";
var rowStore = ozone.rowStore.buildFromCsv(fs.readFileSync(filename, {encoding: 'utf-8'}));
var columnStore = ozone.columnStore.buildFromStore(rowStore);

var o3 = ozone;

// Look at field values

var fieldInfo = function(db, fieldName) {
    "use strict";

    var result = "";
    var field = db.field(fieldName);
    if (field) {
        var allValues = field.allValues();
        for (var i=0; i<allValues.length; i++) {
            var value = allValues[i];
            var filtered = db.filter(new o3.ValueFilter(field, value));
            result += "\t"+filtered.length+" "+value;
        }
    }
    return result;
};

for (var i=0; i< columnStore.fields().length; i++) {
    var field = columnStore.fields()[i];
    console.log(field.displayName+" has "+field.distinctValueEstimate()+" distinct values.");
    if (field.distinctValueEstimate() < 200) {
        console.log("Values:");
        var valueMap = columnStore.partition(field.identifier);
        for (var entry in valueMap) {
            console.log("    " + entry + " \t" + valueMap[entry].size());
        }
    }
    else {
        console.log("not a BitmapField: "+field.displayName);
    }
}
