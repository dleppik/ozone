/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */

/// <reference path='../_all.ts' />

module ozone.columnStore {

    /**
     * This is the recommended way to generate a ColumnStore.
     *
     * @params  provides optional arguments:
     *
     *          fields:  maps from field identifiers in the source to field-specific params.  All FieldDescribing
     *                  properties and Builder parameters can be specified here.
     *
     *                   class: (within fields:) a Field class, such as UnIndexedField, or other object with a "builder" method.
     *
     *          buildAllFields: boolean, default is true.  If false, any fields not listed under 'Fields' are ignored.
     */
    export function buildFromStore(source : DataStore, params: any = {})  : ColumnStore {
        var builders : any = {};
        var sourceFields = source.fields();
        var buildAllFields = ! (params.buildAllFields === false);

        for (var i=0; i< sourceFields.length; i++) {
            var sourceField = sourceFields[i];
            var sourceFieldIsUnary = typeof(sourceField["value"]) === "function";

            var newBuilder : any = null;

            var fieldParams = {};
            var buildThisField = buildAllFields;
            if (params.fields  &&  params.fields[sourceField.identifier]) {
                buildThisField = true;
                fieldParams = params.fields[sourceField.identifier];
                if (fieldParams["class"]) {
                    newBuilder = fieldParams["class"]["builder"](sourceField, fieldParams);
                }
            }

            if (newBuilder === null && buildThisField ) {
                if (sourceFieldIsUnary  &&  sourceField.distinctValueEstimate() > 500) {  // 500 is arbitrary
                    newBuilder = UnIndexedField.builder(<UnaryField<any>>sourceField, fieldParams);
                }
                else {
                    newBuilder = IndexedField.builder(sourceField, fieldParams);
                }
            }
            if (newBuilder !== null) {
                builders[sourceField.identifier] = newBuilder;
            }
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

        var resultFields = <RandomAccessField<any>[]> [];
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