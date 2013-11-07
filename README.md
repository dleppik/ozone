Ozone
=====

![Ozone](icons/ozone-64.png "Ozone")

A JavaScript database for realtime data analysis and visualization

Ozone is a special-purpose database for filtering and counting. It's good for answering questions of the form "how many... in each...?"  And it's particularly good as a client-side back end for data visualization libraries such as [D3](http://d3js.org/).  Because Ozone runs in the web browser, data visualizations can avoid querying the server when adding or removing filters.  Ozone consists of two components:

  * An API for OLAP-style (counting/filtering/slicing) queries from JavaScript, similar to jQuery and D3--and intended for use with D3 or jQuery.

  * Back-end [TypeScript](http://www.typescriptlang.org/) interfaces which separate the views of the underlying data from the data format.  Well-defined interfaces make it easy to convert data from one format to another, or to provide multiple query implementations.  Multiple implementations simplify support for browsers with different features or performance characteristics.

There are also things Ozone is not designed to do.  Ozone is column-oriented, rather than row-oriented: it is not made for accessing individual records.  Ozone is also not well suited for data that can't be summarized easily, such as names or identifiers.  In general, it's best at handling large columns with a small number of individual values, such as answers to multiple-choice questions.

Usage
-----

Ozone is currently under development.  More details will arrive when they are available.

Getting data into Ozone
-----------------------

Although Ozone supports many different data formats, querying is only supported from column-oriented formats.  For more than a trivial amount of data, the browser should read the data in a column-oriented format.  Ozone provides a command-line tool for converting more common row-oriented files into Ozone's column-oriented native formats.

Querying Ozone
--------------


Performance
-----------

Ozone is intended to be low latency and memory efficient.  It should allow larger datasets than would otherwise be possible in a web browser.  However, JavaScript is a harsh environment for big datasets.  The language provides little support for memory management, it's easy to accidentally keep things in closure scope longer than needed, and different browsers on different devices have vastly different capabilities.  Test your code carefully under memory-constrained conditions on all supported platforms!

Ozone will never be a "Big Data" tool, if by Big Data you mean it should handle more data than will fit on a single computer. However, Ozone can work on subsets of data provided by a server-side Big Data back end.

History
-------

Ozone is an open source TypeScript rewrite of portions of [Vocal Laboratories'](http://www.vocalabs.com/) proprietary reporting engine.  The fact that Ozone shares data formats with Vocalabs's server-side Java/Scala-based engine simplifies data transfer between client and server.

TODO
----

[ ] Unit tests
[ ] Array format
[ ] Column-oriented JSON format
[ ] Row-oriented JSON format
[ ] CSV reader
[ ] CSV sample data