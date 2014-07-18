/**
 * Convert the Olympics CSV file to an Ozone JSON file.
 *
 * Usage (must be run from this directory):
 *
 * node buildDataStore.js
 */
var fs = require('fs');
var ozone = require('ozone-db');        // Usage when installed from npm
// var ozone = require('../ozone.js');  // Usage when building from source



var filename = "../test/SummerOlympicMedallists1896to2008.csv";
var rowStore = ozone.rowStore.buildFromCsv(fs.readFileSync(filename, {encoding: 'utf-8'}));

// metaData lets us override the import defaults.
var metaData = {
    fields: {
        Edition: { displayName: "Year"                      }, // Replace the Olympic committee's cryptic names
        NOC:     { displayName: "Country"                   },
        Medal:   {     values : ["Bronze", "Silver", "Gold"]}  // Override default alphabetical order
    }
};
var columnStore = ozone.columnStore.buildFromStore(rowStore, metaData);
var columnStoreString = JSON.stringify(ozone.serialization.writeStore(columnStore));

fs.writeFileSync("SummerOlympicMedallists.json", columnStoreString, {encoding: 'utf-8'});

