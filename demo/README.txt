These demos depend on JSON files created by buildDataStore.js.  After running that script,
you should be able to run the demos from a web server that serves files from this directory.

Note that as currently written, it takes a long time to run.  The culprit is sorting for
SummerOlympicMedalsAggregatedByAthlete.json.

SummerOlympicsMedalsAggregatedByAthleteAndYear.json isn't currently used for a demo, but is
created to show repeated aggregation.