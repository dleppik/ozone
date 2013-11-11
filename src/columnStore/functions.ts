/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */

/// <reference path='../_all.ts' />

module ozone.columnStore {
    export function buildFromStore(source : DataStore)  : ColumnStore {
        var builders : any = {};
        var sourceFields = source.fields();
        for (var i=0; i< sourceFields.length; i++) {
            var sourceField = sourceFields[i];
            builders[sourceField.identifier] = BitmapField.builder(sourceField);
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