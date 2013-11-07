var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
    */
    /// <reference path="../_all.ts" />
    (function (rowStore) {
        /**
        * A row-oriented DataStore that acts on an array of rows.  The interpretation of the rows is done entirely by
        * the Fields.  This is mainly intended for server-side (node.js) usage to convert data into more efficient formats.
        */
        var RowStore = (function () {
            function RowStore(fieldArray, rowData, rowTransformer) {
                this.fieldArray = fieldArray;
                this.rowData = rowData;
                this.rowTransformer = rowTransformer;
                this.fieldMap = {};
                for (var i = 0; i < fieldArray.length; i++) {
                    var field = fieldArray[i];
                    this.fieldMap[field.identifier] = field;
                }
            }
            RowStore.prototype.fields = function () {
                return this.fieldArray;
            };

            RowStore.prototype.field = function (name) {
                return this.fieldMap[name];
            };

            RowStore.prototype.eachRow = function (rowAction) {
                for (var i = 0; i < this.rowData.length; i++) {
                    var rawRow = this.rowData[i];
                    var row = (this.rowTransformer === null) ? rawRow : this.rowTransformer.onItem(rawRow);
                    if (row !== null) {
                        rowAction(row);
                    }
                }
            };

            /** Replace an existing field with this one.  If the old field isn't found, the new one is added at the end. */
            RowStore.prototype.withField = function (newField) {
                var newFieldArray = this.fieldArray.concat();
                for (var i = 0; i < newFieldArray.length; i++) {
                    if (newFieldArray[i].identifier === newField.identifier) {
                        newFieldArray[i] = newField;
                        return new RowStore(newFieldArray, this.rowData, this.rowTransformer);
                    }
                }
                newFieldArray.concat(newField);
                return new RowStore(newFieldArray, this.rowData, this.rowTransformer);
            };
            return RowStore;
        })();
        rowStore.RowStore = RowStore;

        /** The default non-unary Field type for RowStores. */
        var AjaxRowField = (function () {
            /** Private constructor:  please use factory methods. */
            function AjaxRowField(identifier, displayName, typeOfValue, typeConstructor, rangeVal, distinctValueEstimateVal) {
                if (typeof typeConstructor === "undefined") { typeConstructor = null; }
                if (typeof rangeVal === "undefined") { rangeVal = null; }
                if (typeof distinctValueEstimateVal === "undefined") { distinctValueEstimateVal = Number.POSITIVE_INFINITY; }
                this.identifier = identifier;
                this.displayName = displayName;
                this.typeOfValue = typeOfValue;
                this.typeConstructor = typeConstructor;
                this.rangeVal = rangeVal;
                this.distinctValueEstimateVal = distinctValueEstimateVal;
            }
            AjaxRowField.prototype.range = function () {
                return this.rangeVal;
            };

            AjaxRowField.prototype.distinctValueEstimate = function () {
                return this.distinctValueEstimateVal;
            };

            AjaxRowField.prototype.canHold = function (otherField) {
                if (this.typeOfValue === otherField.typeOfValue) {
                    if (this.typeOfValue === 'object') {
                        return this.typeConstructor === otherField.typeConstructor;
                    }
                    return true;
                }
                return false;
            };

            AjaxRowField.prototype.values = function (rowToken) {
                var result = rowToken[this.identifier];
                return (result == null) ? [] : result;
            };
            return AjaxRowField;
        })();
        rowStore.AjaxRowField = AjaxRowField;

        var UnaryAjaxRowField = (function () {
            function UnaryAjaxRowField(identifier, displayName, typeOfValue, typeConstructor, rangeVal, distinctValueEstimateVal) {
                if (typeof typeConstructor === "undefined") { typeConstructor = null; }
                if (typeof rangeVal === "undefined") { rangeVal = null; }
                if (typeof distinctValueEstimateVal === "undefined") { distinctValueEstimateVal = Number.POSITIVE_INFINITY; }
                this.identifier = identifier;
                this.displayName = displayName;
                this.typeOfValue = typeOfValue;
                this.typeConstructor = typeConstructor;
                this.rangeVal = rangeVal;
                this.distinctValueEstimateVal = distinctValueEstimateVal;
            }
            UnaryAjaxRowField.prototype.range = function () {
                return this.rangeVal;
            };

            UnaryAjaxRowField.prototype.distinctValueEstimate = function () {
                return this.distinctValueEstimateVal;
            };

            UnaryAjaxRowField.prototype.canHold = function (otherField) {
                if (this.typeOfValue === otherField.typeOfValue) {
                    if (this.typeOfValue === 'object') {
                        return this.typeConstructor === otherField.typeConstructor;
                    }
                    return true;
                }
                return false;
            };

            UnaryAjaxRowField.prototype.values = function (rowToken) {
                var v = this.value(rowToken);
                return (v == null) ? [] : [v];
            };

            UnaryAjaxRowField.prototype.value = function (rowToken) {
                return rowToken[this.identifier];
            };
            return UnaryAjaxRowField;
        })();
        rowStore.UnaryAjaxRowField = UnaryAjaxRowField;

        var RangeCalculator = (function (_super) {
            __extends(RangeCalculator, _super);
            function RangeCalculator(field) {
                _super.call(this);
                this.field = field;
            }
            RangeCalculator.prototype.reset = function () {
                this.min = Number.POSITIVE_INFINITY;
                this.max = Number.NEGATIVE_INFINITY;
                this.integerOnly = true;
            };

            RangeCalculator.prototype.onItem = function (rowToken) {
                var values = this.field.values(rowToken);
                for (var i = 0; i < values.length; i++) {
                    var n = values[i];
                    if (n < this.min) {
                        this.min = n;
                    }
                    if (n > this.max) {
                        this.max = n;
                    }

                    if (!(isFinite(n) && n > -9007199254740992 && n < 9007199254740992 && Math.floor(n) === n)) {
                        this.integerOnly = false;
                    }
                }
            };

            RangeCalculator.prototype.yieldResult = function () {
                return new ozone.Range(this.min, this.max, this.integerOnly === true);
            };
            return RangeCalculator;
        })(ozone.AbstractReducer);
        rowStore.RangeCalculator = RangeCalculator;

        var ValueFrequencyCalculator = (function () {
            function ValueFrequencyCalculator(field) {
                this.field = field;
                this.map = {};
            }
            ValueFrequencyCalculator.prototype.onItem = function (rowToken) {
                var values = this.field.values(rowToken);
                for (var i = 0; i < values.length; i++) {
                    var v = "" + values[i];
                    this.map[v] = (typeof this.map[v] === "undefined") ? 1 : 1 + this.map[v];
                }
            };

            ValueFrequencyCalculator.prototype.onEnd = function () {
                var result = this.map;
                this.map = {};
                return result;
            };
            return ValueFrequencyCalculator;
        })();
        rowStore.ValueFrequencyCalculator = ValueFrequencyCalculator;
    })(ozone.rowStore || (ozone.rowStore = {}));
    var rowStore = ozone.rowStore;
})(ozone || (ozone = {}));
//# sourceMappingURL=RowStore.js.map
