/**
 * Temporary node script, until things are more formalized.
 * Run from Node REPL in this directory.
 */
var fs = require('fs');
eval(fs.readFileSync('../ozone.js', {encoding: 'utf-8'}));
var filename = 'foo.csv';
var rowStore = ozone.rowStore.buildCsv(fs.readFileSync(filename, {encoding: 'utf-8'}));
var columnStore = ozone.columnStore.buildFromStore(rowStore);