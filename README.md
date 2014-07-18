Ozone
=====

![Ozone](icons/ozone-64.png "Ozone")

A JavaScript OLAP database for realtime data analysis and visualization

Ozone is a special-purpose database for filtering and counting. It's good for answering questions of the form "how many... in each...?"  And it's particularly good as a client-side back end for data visualization libraries such as [D3](http://d3js.org/).  Because Ozone runs in the web browser, data visualizations can avoid querying the server when adding or removing filters.  Ozone consists of two components:

  * An API for OLAP-style (counting/filtering/partitioning) queries from JavaScript, similar in style to jQuery and D3—and intended for use with D3 or jQuery.

  * Back-end [TypeScript](http://www.typescriptlang.org/) interfaces which separate the views of the underlying data from the data format.  Well-defined interfaces make it easy to convert data from one format to another, or to provide multiple query implementations.  Multiple implementations simplify support for browsers with different features or performance characteristics.  This component is typically used with node.js to generate Ozone-ready data files.

There are also things Ozone is not designed to do.  Ozone is column-oriented, rather than row-oriented: it is not made for accessing individual records.  Ozone is also not well suited for data that can't be summarized easily, such as names or identifiers.  In general, it's best at handling large columns with a small number of individual values, such as answers to multiple-choice questions.

The major differences between Ozone and a traditional SQL database (most of these are not unusual for OLAP databases):

* Ozone uses its own jQuery-like JavaScript API, not SQL or MDX.

* Ozone is read-only;  if any record changes, the entire database should be regenerated.

* Ozone does not explicitly support primary keys.  Since Ozone is primarily used for counting and summarizing, access to individual records is not optimized.

* Ozone does not support multiple tables within a single database.  A database is treated as one giant table, equivalent to joining several tables together.

Demo
----

[Summer Olympics Medals](http://www.vocalabs.com/open-source/ozone/demo/olympics.html)

Querying Ozone
--------------

Start with a database, such as a CSV file:

```JavaScript
var ozone = require("ozone-db");  // If you are running from node, rather than in a web browser
var db = ozone.columnStore.buildFromStore(o3.rowStore.buildFromCsv(rawData));
```

Filter or partition to create a subset of the database, which can be treated as its own database:

```JavaScript
var dbOfWomen = db.filter('Gender', 'F');
var dbOfMaleGermans = db.filter('Gender', 'M').filter('Country', 'Germany');
var numberOfMaleGermans = dbOfMaleGermans.size;

var genderDbs = db.partition('Gender');
if (genderDbs['F'].size === dbOfWomen.size) {
   console.log("It works!");
}
if (genderDbs['M'].filter('Country', 'Germany').size === dbOfMaleGermans.size) {
   console.log("It works!");
}
```

Field objects can be used to describe the data, and also as identifiers for filters.  Fields from filtered views
can be used interchangeably with fields from the original database.

```JavaScript

var genderField = db.field('Gender');

var itWorks = genderField.identifier  === 'Gender'  &&
              genderField.displayName === 'Participant Gender' &&
              genderField.typeOfValue === 'string';

var filteringByFieldWorks = dbOfWomen.size === db.filter(genderField, 'F').size &&
                            dbOfWomen.size === db.filter(dbOfMaleGermans.field('Gender', 'F')).size;
```

Use field.distinctValueEstimate() to determine how to present the fields

```JavaScript

var fields = db.fields();
for (var i=0; i<fields.length; i++) {
    var field = fields[i];
    var selector;
    if (field.distinctValueEstimate() < 5) {
       selector = "checkbox";
    }
    else if (field.distinctValueEstimate() < 100 ) {
       selector = "drop-down menu";
    }
    else {
       selector = "search field";
    }
    console.log("I will use a "+ selector +" to choose the "+ field.displayName);
}

```


You cannot access rows directly.  Instead, filter down to the size that you want and then iterate over the rows via the eachRow function.

```JavaScript

var nameField = db.field('Name');
var q8Field   = db.field('Question8Responses');
dbOfMaleGermans.eachRow(function(row) {
    console.log( nameField.value(row) + " has these responses to question 8:");

    // Question 8 is multiple choice, so q8Field doesn't have a value function.

    var responses = q8Field.values(row);
    for (var i=0 i<responses.length; i++) {
        console.log(responses[i]);
    }
});

```


Getting data into Ozone
-----------------------

Node.js users can convert CSV files into Ozone's format; see [demo/buildDataStore.js](https://github.com/dleppik/ozone/blob/master/demo/buildDataStore.js) for an example.

Although Ozone supports multiple data formats, querying is only supported from its native column-oriented format.  For more than a trivial amount of data, the browser should read the data in a column-oriented format.  The native formats are intended to be easy to write to from a variety of server-side languages.

For maximum efficiency, rows should be sorted on at least one column.


Performance
-----------

Ozone is low latency and memory efficient.  It allows larger data sets than would otherwise be possible in a web browser.  However, JavaScript is a harsh environment for big datasets.  The language provides little support for memory management, it's easy to accidentally keep things in closure scope longer than needed, and different browsers on different devices have vastly different capabilities.  Test your code carefully under memory-constrained conditions on all supported platforms!

Ozone will never be a "Big Data" tool, if by Big Data you mean it should handle more data than will fit on a single computer. However, Ozone can work on subsets of data provided by a server-side Big Data back end.

History
-------

Ozone is an TypeScript rewrite of portions of [Vocal Laboratories'](http://www.vocalabs.com/) proprietary JVM-based reporting engine.

