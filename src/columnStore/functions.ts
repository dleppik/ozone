/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */

/// <reference path='../_all.ts' />

module ozone.columnStore {

    /**
     * This is the recommended way to generate a ColumnStore unless you wish to override the default heuristics for
     * choosing field implementations.
     */
    export function buildFromStore(source : DataStore)  : ColumnStore {
        var builders : any = {};
        var sourceFields = source.fields();
        for (var i=0; i< sourceFields.length; i++) {
            var sourceField = sourceFields[i];
            var sourceFieldIsUnary = typeof(sourceField["value"]) === "function";

            var newBuilder;
            if (sourceFieldIsUnary  &&  sourceField.distinctValueEstimate() > 500) {  // 500 is somewhat arbitrary
                console.log("Using ArrayField for "+sourceField.displayName); // XXX
                newBuilder = ArrayField.builder(<UnaryField>sourceField);
            }
            else {
                console.log("Using BitmapField for "+sourceField.displayName); // XXX
                newBuilder = BitmapField.builder(sourceField);
            }
            builders[sourceField.identifier] = newBuilder;
        }
        var length = 0;
        source.eachRow(function(rowToken) {
            var indexedToken : IndexedRowToken = {index: length, rowToken:rowToken};
            length++;
            for (var id in builders) {
                if (builders.hasOwnProperty(id)) {
                    builders[id].onItem(indexedToken);
                }
            }
        });

        var resultFields : Field<any>[] = [];
        for (i=0; i< sourceFields.length; i++) {
            sourceField = sourceFields[i];
            var builder = builders[sourceField.identifier];
            if (builder) {
                resultFields.push(builder.onEnd());
            }
        }
        return new ColumnStore(length, resultFields);
    }
}