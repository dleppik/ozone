/**
 * Quick and dirty converter from the Olympics CSV file to an Ozone JSON file.
 *
 * Run from Node REPL in this directory.
 */
var fs = require('fs');
eval(fs.readFileSync('../ozone.js', {encoding: 'utf-8'}));


var filename = "../test/SummerOlympicMedallists1896to2008.csv";
var rowStore = ozone.rowStore.buildFromCsv(fs.readFileSync(filename, {encoding: 'utf-8'}));
var metaData = {
    fields: {
        Edition: { displayName: "Year" },
        NOC:     { displayName: "Country" },
        Medal:   { values : ["Bronze", "Silver", "Gold"]}
    }
};
var columnStore = ozone.columnStore.buildFromStore(rowStore, metaData);
var o3 = ozone;

var columnStoreString = JSON.stringify(o3.serialization.writeStore(columnStore));

fs.writeFileSync("SummerOlympicMedallists.json", columnStoreString, {encoding: 'utf-8'});

