/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path="../_all.ts" />

module ozone.rowStore {

    /** Build from a CSV file, with all resulting Fields treated as strings. */
    export function buildFromCsv(csv : string) : RowStore {
        var dataArray = csv.split(/(\r\n|\n|\r)/);
        var reader = new CsvReader();
        var fieldInfo  = (function() {
            reader.onItem(dataArray[0]);
            var result : {[key : string] : any} = {};
            for (var index in reader.columnNames) {
                result[reader.columnNames[index]] = {typeOfValue: "string"};
            }
            reader.onEnd();
            return result;
        })();

        return build(fieldInfo, dataArray, reader);
    }

        /**
         * Build a RowStore.
         * @param fieldInfo  Descriptors for each Field, converted to FieldDescriptors via FieldDescriptor.build().
         * @param data       Data, either native (JsonField) format, or converted via a rowTransformer.
         * @param rowTransformer
         */
    export function build(
        fieldInfo : {[key : string] : any},
        data : any[],
            rowTransformer : Reducer<any,void> = null) : RowStore
        {
            var fieldDescriptors : FieldDescriptor[] = [];
            var fields : Field<any>[] = [];
            var toComputeRange : string[] = [];
            var toComputeDistinctValues : string[] = [];
            for (var key in fieldInfo) {
                if (fieldInfo.hasOwnProperty(key)) {
                    var fd = FieldDescriptor.build(fieldInfo[key], key);
                    fieldDescriptors.push(fd);
                    if (fd.shouldCalculateDistinctValues) {
                        toComputeDistinctValues.push(key);
                    }
                    if (fd.typeOfValue === "number"  && fd.range()===null) {
                        toComputeRange.push(key);
                    }

                    var fProto : any;
                    if (fd.multipleValuesPerRow)
                        fProto = JsonRowField;
                    else
                        fProto = UnaryJsonRowField;
                    var field = new fProto(fd.identifier, fd.displayName, fd.typeOfValue, null, fd.range(), fd.distinctValueEstimate());
                    fields.push(field);
                }
            }

            var result = new RowStore(fields, data, rowTransformer);

            if (toComputeDistinctValues.length > 0  || toComputeRange.length > 0) {
                var rangeCalculators = {};
                for (var i=0; i< toComputeRange.length; i++) {
                    key = toComputeRange[i];
                    rangeCalculators[key] = new RangeCalculator(result.field(key));
                }

                var valueCalculators = {};
                for (var i=0; i< toComputeDistinctValues.length; i++) {
                    key = toComputeDistinctValues[i];
                    valueCalculators[key] = new ValueFrequencyCalculator(result.field(key));
                }

                result.eachRow(function (rowToken) {
                    for (var rangeKey in rangeCalculators) {
                        var rc = <RangeCalculator> rangeCalculators[rangeKey];
                        rc.onItem(rowToken);
                    }
                    for (var valueKey in valueCalculators) {
                        var vc = valueCalculators[valueKey];
                        vc.onItem(rowToken);
                    }
                });

                for (var rangeKey in rangeCalculators) {
                    var rc = <RangeCalculator> rangeCalculators[rangeKey];
                    var range = <Range> rc.onEnd();
                    var f = rc.field;
                    fProto = proto(f);
                    var newField =  new fProto(f.identifier, f.displayName, f.typeOfValue, f.typeConstructor, range, f.distinctValueEstimate());
                    result = result.withField(newField);
                }

                for (var valueKey in valueCalculators) {
                    var vc = valueCalculators[valueKey];
                    var valueCounts = vc.onEnd();
                    var numValues = 0;
                    if (typeof Object["keys"] === "undefined") { // IE 8 support
                        for (key in valueCounts) {
                            numValues++;
                        }
                    }
                    else {
                        numValues = Object.keys(valueCounts).length;
                    }
                    f = vc.field;
                    fProto = proto(f);
                    newField = new fProto(f.identifier, f.displayName, f.typeOfValue, f.typeConstructor, f.range(), numValues);
                    result = result.withField(newField);
                }
            }
            return result;
        }

    function proto(field : Field<any>) : any {
        if (typeof field["value"] === "function") {
            return UnaryJsonRowField;
        }
        return JsonRowField;
    }
}