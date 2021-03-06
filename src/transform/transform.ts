/**
 * Copyright 2015 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path="../_all.ts" />

/**
 * Data transformers:  modify a DataStore and produce a new DataStore that is independent of its source.
 * Transformers generally produce RowStores, and may produce a UnaryField when the original allowed multiple values.
 */
module ozone.transform {

    export interface SortOptions {
        /** The identifier for the field */
        field : string;

        /** Comparison function for each value in a row */
        compare : (a,b) => number;
    }


    /**
     * Return a new DataStore with columns sorted.
     *
     * When a row has multiple values for a field, this currently sorts in the order presented by the DataStore.
     * However, Ozone DataStores don't generally preserve or care about the order of values.  But if they present
     * the data out of the original order, it is in some deterministic order.
     *
     * In other words:  if two cells with multiple values are compared, each value is compared in array order.  Thus,
     * [1, 10, 2] does not compare as equal with [1, 2, 10].  However, if you had consistent order when you first
     * imported the data, you should have consistent (if different) order even if the data has been converted from a
     * RowStore into a ColumnStore and back a few times.
     *
     * @see ozone.Field.values() for more discussion.
     */
    export function sort(dataStoreIn : DataStore, sortColumns :  Array<string | SortOptions>) : rowStore.RowStore {
        var sortFunctions = sortColumns.map((column) => {
            var field : string = (typeof column === 'string') ? <string>column : (<SortOptions>column).field;
            return {field: field, compare: compareFunction(dataStoreIn, column)};
        });
        var sortFunc = compareBySortOptionsFunction(dataStoreIn, sortFunctions);
        return rowStore.buildFromStore(dataStoreIn, {sortCompareFunction: sortFunc});
    }

    export interface AggregateParams {
        sizeField? : string;
        sortFields? : boolean | Array<string | SortOptions>;
        includeFields? : string[];
    }

    /**
     * Remove redundant rows and keep the original number of rows in a recordCountField; the resulting DataStore is
     * sorted on all the fields used for merging.  (A pair of rows can only be merged if they are consecutive.)
     *
     * @param dataStoreIn  the initial data source
     *
     * @param options      May include the following:
     *
     *          sizeField  the name of the field in the output DataStore that holds the number of aggregate records.
     *                     If it exists in dataStoreIn, it will be treated as an existing size field: it must be a
     *                     UnaryField<number>, and merged records will use the sum of the existing values.
     *                     Default is "Records".
     *
     *         sortFields  specifies the sort order (and optionally the compare function) for the columns.  Not all
     *                     columns must be specified; the remaining columns that are needed for merging will be sorted
     *                     in the order listed in dataStoreIn.  To explicitly disable sorting, set this to "false".
     *
     *      includeFields  the name of the fields to include in the output, not including the size field.  By default,
     *                     all fields are included.
     */
    export function aggregate(
        dataStoreIn : DataStore,
        options : AggregateParams = {}
    ) : rowStore.RowStore {

        var sizeFieldId = (options.sizeField) ? options.sizeField : "Records";

        var sortedStore = sortForAggregation(dataStoreIn, sizeFieldId, options);

        var oldStoreSizeColumn = <rowStore.UnaryJsonRowField<number>> sortedStore.field(sizeFieldId);

        var rows = [];
        var minSize = Number.POSITIVE_INFINITY;
        var maxSize = 0;

        function addRow(row) {
            var size : number = row[sizeFieldId];
            if (size < minSize) {
                minSize = size;
            }
            if (size > maxSize) {
                maxSize = size;
            }
            rows.push(row);
        }

        var fieldsToCopy = selectFieldsToCopy(sortedStore, sizeFieldId, options);
        var fieldsToCompare : Field<any>[] = [];
        var fieldsToSum : Field<any>[] = [];
        for (var i=0; i<fieldsToCopy.length; i++) {
            var field = fieldsToCopy[i];
            if (field.aggregationRule) {
                if (field.aggregationRule !== 'sum') {
                    throw new Error("Unknown aggregation rule: "+field.aggregationRule+" for "+field.identifier);
                }
                fieldsToSum.push(field);
            }
            else {
                fieldsToCompare.push(field);
            }
        }

        var previousRowData : any = null;
        sortedStore.eachRow(function(row) {
            var countInRow : number = (oldStoreSizeColumn) ? oldStoreSizeColumn.value(row) : 1;
            var rowIsSame = (previousRowData === null)  ?  false  :  rowMatchesData(row, previousRowData, fieldsToCompare);
            if (rowIsSame) {
                fieldsToSum.forEach(function(field) {
                    if (previousRowData.hasOwnProperty(field.identifier)) {
                        previousRowData[field.identifier] += field.value(row);
                    }
                    else {
                        previousRowData[field.identifier] = field.value(row);
                    }
                });
                previousRowData[sizeFieldId] += countInRow;
            }
            else {
                if (previousRowData !== null) {
                    addRow(previousRowData);
                }
                previousRowData = copyRow(row, fieldsToCopy);
                previousRowData[sizeFieldId] = countInRow;
            }
        });
        if (previousRowData) {
            addRow(previousRowData);
        }

        var newFields = fieldsToCopy.map((oldField) => {
            var fProto : any = (oldField instanceof ozone.rowStore.UnaryJsonRowField)
                ? ozone.rowStore.UnaryJsonRowField
                : ozone.rowStore.JsonRowField;
            return new fProto(
                oldField.identifier,
                oldField.displayName,
                oldField.typeOfValue,
                oldField.typeConstructor,
                oldField.range(),
                oldField.distinctValueEstimate(),
                oldField.aggregationRule);
        });

        if (oldStoreSizeColumn) {
            newFields.push(
                new ozone.rowStore.UnaryJsonRowField(
                    oldStoreSizeColumn.identifier,
                    oldStoreSizeColumn.displayName,
                    'number',
                    null,
                    new ozone.Range(minSize, maxSize, true),
                    Number.POSITIVE_INFINITY,
                    'sum')
            );
        }
        else {
            newFields.push( new ozone.rowStore.UnaryJsonRowField(
                sizeFieldId,
                sizeFieldId,
                'number',
                null,
                new ozone.Range(minSize, maxSize, true),
                Number.POSITIVE_INFINITY,
                'sum'));
        }

        return new rowStore.RowStore(newFields, rows, null, sizeFieldId);
    }

    function sortForAggregation(dataStoreIn : DataStore, sizeFieldId : string, options:AggregateParams = {}) : rowStore.RowStore {
        if (options.sortFields  &&  options.sortFields === false) {
            if ( ! (dataStoreIn instanceof rowStore.RowStore) ) {
                throw new Error("Can only aggregate a sorted RowStore");
            }
            return <rowStore.RowStore> dataStoreIn;
        }
        else {
            var sortFields = <Array<string | SortOptions>> (options.sortFields) ? options.sortFields : [];
            var sortOptions : Array<SortOptions> = [];
            var usedColumns = {};
            (<Array<string | SortOptions>>sortFields).forEach(function(item) {
                var name : string = (typeof(item) === 'string') ? <string>item : (<SortOptions>item).field;
                if (name !== sizeFieldId) {
                    sortOptions.push({field : name, compare: compareFunction(dataStoreIn, item)});
                    usedColumns[name] = true;
                }
            });

            dataStoreIn.fields().forEach((field) => {
                if (field.identifier !== sizeFieldId  &&  !usedColumns[field.identifier]  &&  !field.aggregationRule) {
                    sortOptions.push({field : field.identifier, compare: compareFunction(dataStoreIn, field.identifier)});
                }
            });
            return sort(dataStoreIn, sortOptions);
        }
    }

    function selectFieldsToCopy(store : DataStore, sizeFieldId : string, options : AggregateParams) : Field<any>[] {
        var fieldsToCopy : Field<any>[] = [];
        if (options.includeFields) {
            options.includeFields.forEach((fId) => {
                if (fId !== sizeFieldId) {
                    var f = store.field(fId);
                    if (f === null) {
                        throw new Error("Field '" + fId + "' does not exist");
                    }
                    fieldsToCopy.push(f);
                }
            });
        }
        else {
            store.fields().forEach((f) => {
                if (f.identifier !== sizeFieldId) {
                    fieldsToCopy.push(f);
                }
            });
        }
        return fieldsToCopy;
    }

    function rowMatchesData(rowToken: any, rowData : any, fieldsToCompare : Field<any>[]) : boolean {
        for (var i=0; i<fieldsToCompare.length; i++) {
            var field = fieldsToCompare[i];
            var fromToken = field.values(rowToken);
            var fromData : any[] = [];
            if (rowData.hasOwnProperty(field.identifier)) {
                var v = rowData[field.identifier];
                if (v !== null) {
                    fromData = (Array.isArray(v)) ? v : [v];
                }
            }
            if (fromToken.length !== fromData.length) {
                return false;
            }
            for (var j=0; j<fromToken.length; j++) {
                if (fromToken[j] !== fromData[j]) {
                    return false;
                }
            }
        }
        return true;
    }

    function copyRow(row: any, fieldsToCopy : Field<any>[]) : any {
        var result : any = {};
        fieldsToCopy.forEach(function(field) {
            var values = field.values(row);
            if (values.length === 1) {
                result[field.identifier] = values[0];
            }
            else if (values.length > 1) {
                result[field.identifier] = values;
            }
        });
        return result;
    }

    function compareBySortOptionsFunction(dataStore : DataStore, sortOptions : Array<SortOptions>) : (rowA,rowB) => number {
        var fields = sortOptions.map((o) => {return dataStore.field(o.field)});

        return function(rowA, rowB) {
            for (var i=0; i<sortOptions.length; i++) {
                var option = sortOptions[i];
                var field = fields[i];
                var valuesA = field.values(rowA);
                var valuesB = field.values(rowB);

                var commonValuesLength = Math.min(valuesA.length, valuesB.length);
                for (var j=0; j<commonValuesLength; j++) {
                    var valueA = valuesA[j];
                    var valueB = valuesB[j];
                    var compareResult = option.compare(valueA, valueB);
                    if (compareResult !== 0) {
                        return compareResult;
                    }
                }
                if (valuesA.length < valuesB.length) {
                    return -1;
                }
                else if (valuesA.length > valuesB.length) {
                    return 1;
                }
            }
            return 0;
        };
    }


    function compareFunction(dataStoreIn : DataStore, sortColumn :  string | SortOptions) : (a,b) => number {
        if (typeof(sortColumn) === 'string') {
            var field = dataStoreIn.field(<string> sortColumn);
            if (field) {
                if (field.typeOfValue === 'number') {
                    return numberCompare;
                }
                if (field.typeOfValue === 'string') {
                    return stringCompareFunction();
                }
            }
            else {
                return genericCompare;
            }
        }
        else {
            return (<SortOptions>sortColumn).compare;
        }
    }

    function stringCompareFunction() : (a:string,b:string) => number {
        if (Intl && Intl.Collator) {
            return new Intl.Collator().compare;
        }
        return function(a : string, b : string) { return a.localeCompare(b); };
    }

    /** For edge cases, just avoid equality, especially if we accidentally get the same thing twice. */
    var genericCompare = function(a,b) {
        return (typeof(a)+a).localeCompare(typeof(b)+b);
    };

    var numberCompare = function(a : number, b: number) {
        if (a < b) return -1;
        if (a > b) return  1;
        return 0;
    }
}