/**
 * Convert the Olympics CSV file to Ozone JSON files.  Note that each JSON file is a separate database showing
 * off different features.
 *
 * Usage (must be run from this directory):
 *
 * node buildDataStore.js
 */
var fs = require('fs');
//var ozone = require('ozone-db');        // Usage when installed from npm
var ozone = require('../ozone.js');  // Usage when building from source

var filename = "../test/SummerOlympicMedallists1896to2008.csv";
var rowStore = ozone.rowStore.buildFromCsv(fs.readFileSync(filename, {encoding: 'utf-8'}));

var buildParams = {
    // This lets us override the default behaviors for that buildFromStore finds.  See the documentation in the source
    // code for FieldDescribing, found in interfaces.ts, for a list of parameters.  FieldDescribing has a few functions
    // (range and distinctValueEstimate);  you can instead provide the data you'd like the function to return.
    fields: {
        Edition: { displayName: "Year"                      }, // Replace the Olympic committee's cryptic names
            NOC: { displayName: "Country"                   },
          Medal: {     values : ["Bronze", "Silver", "Gold"]}  // Override default alphabetical order
    }
};
var columnStore = ozone.columnStore.buildFromStore(rowStore, buildParams);
var columnStoreString = JSON.stringify(ozone.serialization.writeStore(columnStore));

fs.writeFileSync("SummerOlympicMedallists.json", columnStoreString, {encoding: 'utf-8'});

// Now create a version which doesn't include athletes.  That is the one column that isn't indexed because the values
// are nearly unique per row.  So visualizations that don't need to recreate the original row don't need it, and
// it takes up a lot of space.

var noAthleteBuildParams = {
    buildAllFields: false,  // Only build the fields listed below
    fields: {
                City: {                                       },
             Edition: { displayName: "Year"                   },
               Sport: {                                       },
          Discipline: {                                       },
                 NOC: { displayName: "Country"                },
              Gender: {                                       },
        Event_gender: { displayName: "Gender of Event"        },
               Medal: { values : ["Bronze", "Silver", "Gold"] }
    }
};

var noAthleteStore = ozone.columnStore.buildFromStore(rowStore, noAthleteBuildParams);
var noAthleteJson = JSON.stringify(ozone.serialization.writeStore(noAthleteStore));
fs.writeFileSync("SummerOlympicMedals.json", noAthleteJson, {encoding: 'utf-8'});

//
// Aggregation
//

// Without the athlete names, we don't need a row for every basketball player on the same team who got the same medal.
// So create an aggregate DataStore that just keeps a count of athletes.  This transformation creates a RowStore,
// which is best if we want to apply more transformations, but as always, we want a ColumnStore for actual querying.

var athleteCountRowStore = ozone.transform.aggregate(noAthleteStore);
var athleteCountColumnStore = ozone.columnStore.buildFromStore(athleteCountRowStore);
var athleteCountJson = JSON.stringify(ozone.serialization.writeStore(athleteCountColumnStore));

fs.writeFileSync("SummerOlympicMedalsAggregatedByAthlete.json", athleteCountJson, {encoding: 'utf-8'});

// We can continue to shrink the data by removing columns and aggregating.  If we don't care when the event took place,
// we can remove the year and city.
//
// Aggregation can be done on a RowStore or ColumnStore, but because it iterates over every row, it may be quicker to
// start from a RowStore.

var noAthleteOrYearStore = ozone.columnStore.buildFromStore(
    ozone.transform.aggregate(athleteCountRowStore,
        {includeFields: ['Sport', 'Discipline', 'Gender', 'Event_gender', 'Medal']}));
var noAthleteOrYearJson = JSON.stringify(ozone.serialization.writeStore(noAthleteOrYearStore));
fs.writeFileSync("SummerOlympicMedalsAggregatedByAthleteAndYear.json", noAthleteOrYearJson, {encoding: 'utf-8'});
