/**
 * Temporary node script, until things are more formalized.
 * Run from Node REPL in this directory.
 */
var fs = require('fs');
eval(fs.readFileSync('../ozone.js', {encoding: 'utf-8'}));
var filename = 'Credit_card_complaints.csv';
filename = "SummerOlympicMedallists1896to2008.csv";
var rowStore = ozone.rowStore.buildCsv(fs.readFileSync(filename, {encoding: 'utf-8'}));
var columnStore = ozone.columnStore.buildFromStore(rowStore);

var o3 = ozone;

// Look at field values

var fieldInfo = function(db, fieldName) {
    "use strict";

    var result = "";
    var field = db.field(fieldName);
    var allValues = field.allValues();
    if (field) {
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
    if (typeof(field.allValues) === "function") {
        console.log("Values:");
        var values = field.allValues();
        for (var j=0; j<values.length; j++) {
            var value = values[j];
            var filtered = columnStore.filter(new o3.ValueFilter(field, value));
            var valueCount = filtered.length;
            console.log("    "+values[j]+" \t "+valueCount+fieldInfo(filtered, "Medal"));
        }
    }
    else {
        console.log("not a BitmapField: "+field.displayName);
    }
}
