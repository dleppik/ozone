/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />
/**
 *  Contains public functions and tiny classes that are too small to merit their own file.
 */
var ozone;
(function (ozone) {
    /**
     * Minimum and maximum values (inclusive), and whether every number is an integer.  For our purposes, an integer is
     * defined according to Mozilla's Number.isInteger polyfill and ECMA Harmony specification, namely:
     *
     * typeof nVal === "number" && isFinite(nVal) && nVal > -9007199254740992 && nVal < 9007199254740992 && Math.floor(nVal) === nVal;
     *
     * ( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger )
     *
     * JSON.stringify(range) produces clean JSON that can be parsed back into an identical Range.
     */
    var Range = (function () {
        function Range(min, max, integerOnly) {
            this.min = min;
            this.max = max;
            this.integerOnly = integerOnly;
        }
        /**
         * Build from JSON;  in most cases you could just use the AJAX directly, but calling this provides
         * instanceof and toString().
         */
        Range.build = function (ajax) {
            return new Range(ajax.min, ajax.max, ajax.integerOnly);
        };
        Range.prototype.toString = function () {
            var intStr = (this.integerOnly) ? "integer" : "decimal";
            return this.min + " to " + this.max + " " + intStr;
        };
        return Range;
    })();
    ozone.Range = Range;
    var AbstractReducer = (function () {
        function AbstractReducer() {
            this.reset();
        }
        AbstractReducer.prototype.onItem = function (item) {
            throw new Error("Subclasses must implement");
        };
        /** Default implementation does nothing. */
        AbstractReducer.prototype.reset = function () {
        };
        AbstractReducer.prototype.yieldResult = function () {
            throw new Error("Subclasses must implement");
        };
        AbstractReducer.prototype.onEnd = function () {
            var result = this.yieldResult();
            this.reset();
            return result;
        };
        return AbstractReducer;
    })();
    ozone.AbstractReducer = AbstractReducer;
    /** Wraps an OrderedIterator so you can peek at the next item without modifying it. */
    var BufferedOrderedIterator = (function () {
        function BufferedOrderedIterator(inner) {
            this.inner = inner;
            if (inner.hasNext()) {
                this.current = inner.next();
            }
        }
        /** Returns the next value to be returned by next(), or undefined if hasNext() returns false. */
        BufferedOrderedIterator.prototype.peek = function () { return this.current; };
        BufferedOrderedIterator.prototype.skipTo = function (item) {
            if (this.current < item) {
                this.inner.skipTo(item);
                this.current = this.inner.hasNext() ? this.inner.next() : undefined;
            }
        };
        BufferedOrderedIterator.prototype.next = function () {
            var result = this.current;
            this.current = this.inner.hasNext() ? this.inner.next() : undefined;
            return result;
        };
        BufferedOrderedIterator.prototype.hasNext = function () {
            return typeof (this.current) !== 'undefined';
        };
        return BufferedOrderedIterator;
    })();
    ozone.BufferedOrderedIterator = BufferedOrderedIterator;
    /**
     * Combine all descriptors, with later ones overwriting values provided by earlier ones.  All non-inherited
     * properties are copied over, plus all FieldDescribing (inherited or otherwise).
     * If range and distinctValueEstimate are functions, the result's function calls the original object's function.
     * If they are not functions, the result's function returns the value.
     */
    function mergeFieldDescriptors() {
        var descriptors = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            descriptors[_i - 0] = arguments[_i];
        }
        return mergeObjects(["identifier", "displayName", "typeOfValue", "typeConstructor", "aggregationRule"], ["range", "distinctValueEstimate"], descriptors);
    }
    ozone.mergeFieldDescriptors = mergeFieldDescriptors;
    function mergeObjects(fields, functions, items) {
        if (items.length === 0) {
            return null;
        }
        var result = {};
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            for (var k in item) {
                if (item.hasOwnProperty(k)) {
                    result[k] = k;
                }
            }
            for (var j = 0; j < fields.length; j++) {
                var key = fields[j];
                if (typeof item[key] !== "undefined") {
                    result[key] = item[key];
                }
            }
            for (j = 0; j < functions.length; j++) {
                var key = functions[j];
                if (typeof item[key] === "function") {
                    (function (f) {
                        result[key] = function () { f(); };
                    })(item[key]);
                }
                else if (typeof item[key] !== "undefined") {
                    (function (value) {
                        result[key] = function () { return value; };
                    })(item[key]);
                }
            }
        }
        return result;
    }
    function convert(item, descriptor) {
        if (item === null) {
            return null;
        }
        if (descriptor.typeOfValue === "number") {
            if (typeof item === "string") {
                return Number(item);
            }
        }
        else if (descriptor.typeOfValue === "string") {
            if (typeof item === "number") {
                return "" + item;
            }
        }
        return item;
    }
    ozone.convert = convert;
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />
var ozone;
(function (ozone) {
    /**
     * Selects rows where a specific field has a specific value.  Note:  ColumnStore typically uses indexes to filter by
     * value, so this class is generally used only to trigger that code.
     */
    var ValueFilter = (function () {
        function ValueFilter(fieldDescriptor, value, displayName) {
            if (displayName === void 0) { displayName = null; }
            this.fieldDescriptor = fieldDescriptor;
            this.value = value;
            this.displayName = displayName;
            if (displayName === null) {
                this.displayName = value + " (" + fieldDescriptor.displayName + ")";
            }
        }
        /**
         * Returns true if the row has the given value.  Note:  ColumnStore typically uses indexes to filter by
         * value, bypassing this method.
         */
        ValueFilter.prototype.matches = function (store, rowToken) {
            var field = store.field(this.fieldDescriptor.identifier);
            return field.rowHasValue(rowToken, this.value);
        };
        ValueFilter.prototype.equals = function (f) {
            if (f === this) {
                return true;
            }
            if (Object.getPrototypeOf(f) !== Object.getPrototypeOf(this)) {
                return false;
            }
            var vf = f;
            if (vf.fieldDescriptor.identifier !== this.fieldDescriptor.identifier) {
                return false;
            }
            if (vf.value === this.value) {
                return true;
            }
            return vf.value.toString() === this.value.toString(); // non-primitive values, such as dates
        };
        return ValueFilter;
    })();
    ozone.ValueFilter = ValueFilter;
    /**
     * Selects rows which match all of several values.  Note:  because this is a fundamental set operation, ColumnStore
     * generally uses its internal union operation when given a UnionFilter.
     *
     * As currently implemented, this works with an array of Filters, and makes no attempt to remove redundant filters.
     * In the future, the constructor might remove redundant filters, and the other methods might make assumptions
     * based on that.
     */
    var UnionFilter = (function () {
        function UnionFilter() {
            var of = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                of[_i - 0] = arguments[_i];
            }
            this.filters = of;
            this.displayName = "All of { ";
            for (var i = 0; i < this.filters.length; i++) {
                if (i > 0) {
                    this.displayName += ", ";
                }
                this.displayName += this.filters[i].displayName;
            }
            this.displayName += " }";
        }
        /**
         * True if f is a UnionFilter, each of f's filters is equal to one of this's filters, and each of this's
         * filters is equal to one of f's filters.
         */
        UnionFilter.prototype.equals = function (f) {
            if (f === this) {
                return true;
            }
            if (Object.getPrototypeOf(f) !== Object.getPrototypeOf(this)) {
                return false;
            }
            var that = f;
            var matched = [];
            var unmatched = that.filters.concat();
            function checkForMatch(thisItem) {
                for (var unmatchedIndex = unmatched.length; unmatchedIndex >= 0; unmatchedIndex--) {
                    var thatItem = unmatched[unmatchedIndex];
                    if (thisItem.equals(thatItem)) {
                        unmatched.splice(unmatchedIndex, 1);
                        matched.push(thatItem);
                        return true;
                    }
                }
                return matched.some(function (thatItem) { return thisItem.equals(thatItem); });
            }
            for (var thisIndex = this.filters.length - 1; thisIndex >= 0; thisIndex--) {
                var thisItem = this.filters[thisIndex];
                if (!checkForMatch(thisItem)) {
                    return false;
                }
            }
            return unmatched.length === 0;
        };
        /**
         * Returns false if (and only if) any of the filters don't match.  NOTE:  ColumnStore will typically bypass
         * this method and use column indexes to compute a union.
         */
        UnionFilter.prototype.matches = function (store, rowToken) {
            return this.filters.every(function (f) { return f.matches(store, rowToken); });
        };
        return UnionFilter;
    })();
    ozone.UnionFilter = UnionFilter;
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />
var ozone;
(function (ozone) {
    var StoreProxy = (function () {
        function StoreProxy(source) {
            this.source = source;
        }
        StoreProxy.prototype.fields = function () { return this.source.fields(); };
        StoreProxy.prototype.field = function (key) { return this.source.field(key); };
        StoreProxy.prototype.sizeField = function () { return this.source.sizeField(); };
        StoreProxy.prototype.eachRow = function (rowAction) { this.source.eachRow(rowAction); };
        return StoreProxy;
    })();
    ozone.StoreProxy = StoreProxy;
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var columnStore;
    (function (columnStore) {
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
        function buildFromStore(source, params) {
            if (params === void 0) { params = {}; }
            var builders = {};
            var sourceFields = source.fields();
            var buildAllFields = !(params.buildAllFields === false);
            for (var i = 0; i < sourceFields.length; i++) {
                var sourceField = sourceFields[i];
                var sourceFieldIsUnary = typeof (sourceField["value"]) === "function";
                var newBuilder = null;
                var fieldParams = {};
                var buildThisField = buildAllFields;
                if (params.fields && params.fields[sourceField.identifier]) {
                    buildThisField = true;
                    fieldParams = params.fields[sourceField.identifier];
                    if (fieldParams["class"]) {
                        newBuilder = fieldParams["class"]["builder"](sourceField, fieldParams);
                    }
                }
                if (newBuilder === null && buildThisField) {
                    if (sourceFieldIsUnary && sourceField.distinctValueEstimate() > 500) {
                        newBuilder = columnStore.UnIndexedField.builder(sourceField, fieldParams);
                    }
                    else {
                        newBuilder = columnStore.IndexedField.builder(sourceField, fieldParams);
                    }
                }
                if (newBuilder !== null) {
                    builders[sourceField.identifier] = newBuilder;
                }
            }
            var length = 0;
            source.eachRow(function (rowToken) {
                var indexedToken = { index: length, rowToken: rowToken };
                length++;
                for (var id in builders) {
                    if (builders.hasOwnProperty(id)) {
                        builders[id].onItem(indexedToken);
                    }
                }
            });
            var resultFields = [];
            for (i = 0; i < sourceFields.length; i++) {
                sourceField = sourceFields[i];
                var builder = builders[sourceField.identifier];
                if (builder) {
                    resultFields.push(builder.onEnd());
                }
            }
            var sizeFieldId = source.sizeField() ? source.sizeField().identifier : null;
            return new columnStore.ColumnStore(length, resultFields, sizeFieldId);
        }
        columnStore.buildFromStore = buildFromStore;
        /** Used to implement ColumnStore.sum(). */
        function sum(store, fieldOrId) {
            var result = 0;
            var field = ((typeof fieldOrId === 'string') ? store.field(fieldOrId) : fieldOrId);
            if (!field || field.typeOfValue !== 'number') {
                return 0;
            }
            if (typeof field['value'] === 'function') {
                store.eachRow(function (r) { result += field.value(r); });
            }
            else {
                var sumFunc = function (a, b) { return a + b; };
                store.eachRow(function (r) { result += field.values(r).reduce(sumFunc, 0); });
            }
            return result;
        }
        columnStore.sum = sum;
    })(columnStore = ozone.columnStore || (ozone.columnStore = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var columnStore;
    (function (columnStore) {
        /**
         * A Field which is inefficient for filtering;  intended for columns where distinctValueEstimate is so large that
         * an IndexedField would use an unreasonable amount of memory. Stores the entire column in a single dense array.
         */
        var UnIndexedField = (function () {
            function UnIndexedField(descriptor, array, offset, nullProxy) {
                if (offset === void 0) { offset = 0; }
                if (nullProxy === void 0) { nullProxy = null; }
                this.array = array;
                this.offset = offset;
                this.nullProxy = nullProxy;
                this.identifier = descriptor.identifier;
                this.displayName = descriptor.displayName;
                this.typeOfValue = descriptor.typeOfValue;
                this.typeConstructor = descriptor.typeConstructor;
                this.valueEstimate = descriptor.distinctValueEstimate();
                this.aggregationRule = (descriptor.aggregationRule) ? descriptor.aggregationRule : null;
                var range = descriptor.range();
                if (typeof range === 'undefined' || descriptor.typeOfValue !== 'number') {
                    range = null;
                }
                this.rangeValue = range;
                if (typeof (this.valueEstimate) !== "number" || isNaN(this.valueEstimate) || this.valueEstimate > array.length) {
                    this.valueEstimate = array.length;
                }
                if (array.length > 0 && (array[0] === nullProxy || array[array.length - 1] === nullProxy)) {
                    throw new Error("Array must be trimmed (Field: " + this.identifier + ")");
                }
            }
            /**
             * Returns a reducer that can be run on a source DataStore to reproduce a sourceField.
             *
             * @param sourceField  the field which will be replicated
             * @param params       may override any FieldDescribing field, plus additional parameters:
             *                     nullValues   -- if provided, this is a list of values equivalent to null.
             *                     nullProxy    -- if provided, this is used instead of null for storing null values.  This
             *                                     may allow the JavaScript implementation to use an array of primitives.
             *                                     (Haven't yet checked to see if any JS implementations actually do this.)
             */
            UnIndexedField.builder = function (sourceField, params) {
                if (params === void 0) { params = {}; }
                var array = [];
                var offset = 0;
                var nullValues = (typeof (params["nullValues"]) === "object") ? params["nullValues"] : [];
                var nullProxy = (typeof (params["nullProxy"]) === "undefined") ? null : params["nullProxy"];
                var nullMap = {};
                for (var i = 0; i < nullValues.length; i++) {
                    var nv = nullValues[i];
                    nullMap["" + nv] = nv;
                }
                var descriptor = ozone.mergeFieldDescriptors(sourceField, params);
                return {
                    onItem: function (indexedRowToken) {
                        var value = ozone.convert(sourceField.value(indexedRowToken.rowToken), descriptor);
                        if (nullValues.length > 0 && nullMap["" + value] === value) {
                            value = nullProxy;
                        }
                        if (array.length === 0) {
                            if (value !== null) {
                                array[0] = value;
                                offset = indexedRowToken.index;
                            }
                        }
                        else {
                            var newIndex = indexedRowToken.index - offset;
                            while (array.length < newIndex) {
                                array.push(nullProxy);
                            }
                            array[newIndex] = value;
                        }
                    },
                    onEnd: function () {
                        while ((array.length > 0) && (array[array.length - 1] === nullProxy)) {
                            array.pop(); // Trim the end
                        }
                        return new UnIndexedField(descriptor, array, offset, nullProxy);
                    }
                };
            };
            UnIndexedField.prototype.value = function (rowToken) {
                var index = rowToken - this.offset;
                var result = this.array[index];
                return (this.isNull(result)) ? null : result;
            };
            UnIndexedField.prototype.isNull = function (item) {
                return (typeof (item) === null || typeof (item) === 'undefined' || item === this.nullProxy);
            };
            UnIndexedField.prototype.values = function (rowToken) {
                var result = this.value(rowToken);
                return (result === null) ? [] : [result];
            };
            UnIndexedField.prototype.range = function () {
                return this.rangeValue;
            };
            UnIndexedField.prototype.distinctValueEstimate = function () {
                return this.valueEstimate;
            };
            UnIndexedField.prototype.rowHasValue = function (rowToken, value) {
                var actualValue = this.value(rowToken);
                return actualValue === value;
            };
            /** Returns the first rowToken;  this is for serialization and not intended for queries. */
            UnIndexedField.prototype.firstRowToken = function () {
                return this.offset;
            };
            /** Returns a copy of the data array for serialization; not intended for queries. */
            UnIndexedField.prototype.dataArray = function () {
                return this.array.concat();
            };
            return UnIndexedField;
        })();
        columnStore.UnIndexedField = UnIndexedField;
    })(columnStore = ozone.columnStore || (ozone.columnStore = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var columnStore;
    (function (columnStore) {
        /**
         * This is the native internal format for Ozone DataStores.  The ColumnStore is little more than a container for
         * Fields.  IndexedFields are generally more efficient than UnIndexedFields-- with the assumption that
         * Field.distinctValueEstimate() is usually low.
         *
         * <p>
         *     Conceptually the DataStore represents a dense array of rows, and each row is identified by its array index.
         *     In fact there is no such array;  the index exists to identify records across Fields.
         * </p>
         *
         * <p>
         *     Confusingly, "index" refers both to the map of values to row identifiers (i.e. a database index) and an
         *     individual row identifier, since conceptually (but not literally) the DataStore is a dense array of rows.
         * </p>
         */
        var ColumnStore = (function () {
            function ColumnStore(theRowCount, fieldArray, sizeFieldId) {
                this.theRowCount = theRowCount;
                this.fieldArray = fieldArray;
                this.sizeFieldId = sizeFieldId;
                this.cachedSize = null;
                this.fieldMap = {};
                for (var i = 0; i < fieldArray.length; i++) {
                    var field = fieldArray[i];
                    this.fieldMap[field.identifier] = field;
                }
                if (sizeFieldId) {
                    var rcField = this.fieldMap[sizeFieldId];
                    if (rcField === null) {
                        throw new Error("No field named '" + sizeFieldId + "' for record count");
                    }
                    else if (rcField.typeOfValue !== 'number') {
                        throw new Error(sizeFieldId + " can't be used as a record count, it isn't numerical");
                    }
                    else if (typeof rcField.value !== 'function') {
                        throw new Error(sizeFieldId + " can't be used as a record count, it isn't unary");
                    }
                }
            }
            ColumnStore.prototype.size = function () {
                if (this.cachedSize === null) {
                    this.cachedSize = (this.sizeFieldId) ? this.sum(this.sizeFieldId) : this.theRowCount;
                }
                return this.cachedSize;
            };
            ColumnStore.prototype.rowCount = function () { return this.theRowCount; };
            ColumnStore.prototype.sum = function (field) { return ozone.columnStore.sum(this, field); };
            ColumnStore.prototype.intSet = function () { return new ozone.intSet.RangeIntSet(0, this.size()); };
            ColumnStore.prototype.fields = function () { return this.fieldArray; };
            ColumnStore.prototype.field = function (key) { return (this.fieldMap.hasOwnProperty(key)) ? this.fieldMap[key] : null; };
            ColumnStore.prototype.filter = function (fieldNameOrFilter, value) {
                return columnStore.filterColumnStore(this, this, columnStore.createFilter(this, fieldNameOrFilter, value));
            };
            ColumnStore.prototype.filters = function () { return []; };
            ColumnStore.prototype.simplifiedFilters = function () { return []; };
            ColumnStore.prototype.removeFilter = function (filter) { return this; };
            ColumnStore.prototype.partition = function (fieldAny) {
                var key = (typeof fieldAny === 'string') ? fieldAny : fieldAny.identifier;
                return columnStore.partitionColumnStore(this, this.field(key));
            };
            ColumnStore.prototype.eachRow = function (rowAction) {
                var max = this.rowCount();
                for (var i = 0; i < max; i++) {
                    rowAction(i);
                }
            };
            ColumnStore.prototype.sizeField = function () { return this.field(this.sizeFieldId); };
            return ColumnStore;
        })();
        columnStore.ColumnStore = ColumnStore;
    })(columnStore = ozone.columnStore || (ozone.columnStore = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ozone;
(function (ozone) {
    var columnStore;
    (function (columnStore) {
        function createFilter(store, fieldNameOrFilter, value) {
            if (typeof fieldNameOrFilter === "string") {
                return new ozone.ValueFilter(store.field(fieldNameOrFilter), value);
            }
            else if (typeof fieldNameOrFilter === "object") {
                if (typeof fieldNameOrFilter.distinctValueEstimate === "function" && typeof fieldNameOrFilter.identifier === "string") {
                    return new ozone.ValueFilter(fieldNameOrFilter, value);
                }
                if (typeof fieldNameOrFilter.matches === "function") {
                    return fieldNameOrFilter;
                }
            }
            throw "Not a filter: " + fieldNameOrFilter;
        }
        columnStore.createFilter = createFilter;
        /**
         * Used by ColumnStores to implement filtering
         *
         * @param source          the top-level ColumnStore
         * @param oldStore        the ColumnStore being filtered, which is source or a subset of source
         * @param filtersToAdd    the new filters
         * @returns a ColumnStore with all of oldStore's filters and filtersToAdd applied
         */
        function filterColumnStore(source, oldStore) {
            var filtersToAdd = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                filtersToAdd[_i - 2] = arguments[_i];
            }
            if (filtersToAdd.length === 0) {
                return oldStore;
            }
            var oldFilters = oldStore.filters();
            var filtersForIteration = [];
            var indexedValueFilters = [];
            var unionFilters = [];
            var numNewFilters = 0; // the total size of the buckets above, tracked separately to avoid bugs
            deduplicate: for (var i = 0; i < filtersToAdd.length; i++) {
                var newFilter = filtersToAdd[i];
                for (var j = 0; j < oldFilters.length; j++) {
                    var oldFilter = oldFilters[j];
                    if (oldFilter.equals(newFilter)) {
                        continue deduplicate;
                    }
                }
                var filterTarget = filtersForIteration; // Determines which bucket this filter belongs in
                if (newFilter instanceof ozone.UnionFilter) {
                    filterTarget = unionFilters;
                }
                else if (newFilter instanceof ozone.ValueFilter) {
                    var fieldId = newFilter.fieldDescriptor.identifier;
                    if (source.field(fieldId) instanceof columnStore.IndexedField) {
                        filterTarget = indexedValueFilters;
                    }
                }
                filterTarget.push(newFilter);
                numNewFilters++;
            }
            if (numNewFilters === 0) {
                return oldStore;
            }
            // IntSet intersection filtering
            var set = oldStore.intSet();
            if (indexedValueFilters.length > 0) {
                for (var i = 0; i < indexedValueFilters.length; i++) {
                    var intSetFilter = indexedValueFilters[i];
                    var fieldId = intSetFilter.fieldDescriptor.identifier;
                    var field = source.field(fieldId);
                    var fieldIntSet = field.intSetForValue(intSetFilter.value);
                    set = ozone.intSet.intersectionOfIntSets(set, fieldIntSet);
                }
            }
            // Iterative filtering
            if (filtersForIteration.length > 0) {
                var setBuilder = ozone.intSet.builder(set.min(), set.max());
                set.each(function (rowToken) {
                    for (var i = 0; i < filtersForIteration.length; i++) {
                        var filter = filtersForIteration[i];
                        if (!filter.matches(oldStore, rowToken)) {
                            return;
                        }
                        setBuilder.onItem(rowToken);
                    }
                });
                set = setBuilder.onEnd();
            }
            //  Unions, done last because they are slowest
            if (unionFilters.length > 0) {
                unionFilters.forEach(function (f) {
                    set = unionColumnStore(source, set, f.filters);
                });
            }
            var newFilters = oldStore.filters().concat(filtersForIteration, indexedValueFilters);
            newFilters.sort(compareFilterByName);
            return new FilteredColumnStore(source, newFilters, set);
        }
        columnStore.filterColumnStore = filterColumnStore;
        function applyFilter(source, initialSet, filter) {
            if (filter instanceof ozone.UnionFilter) {
                return unionColumnStore(source, initialSet, filter.filters);
            }
            if (filter instanceof ozone.ValueFilter) {
                var intSetFilter = filter;
                var fieldId = intSetFilter.fieldDescriptor.identifier;
                var field = source.field(fieldId);
                if (source.field(fieldId) instanceof columnStore.IndexedField) {
                    var fieldIntSet = field.intSetForValue(intSetFilter.value);
                    return ozone.intSet.intersectionOfIntSets(initialSet, fieldIntSet);
                }
            }
            var setBuilder = ozone.intSet.builder(initialSet.min(), initialSet.max());
            initialSet.each(function (rowToken) {
                if (filter.matches(source, rowToken)) {
                    setBuilder.onItem(rowToken);
                }
            });
            return setBuilder.onEnd();
        }
        function unionColumnStore(source, initialSet, filters) {
            if (filters.length === 0) {
                return initialSet;
            }
            var toUnion = [];
            for (var i = 0; i < filters.length; i++) {
                toUnion.push(applyFilter(source, initialSet, filters[i]));
            }
            return initialSet.intersectionOfUnion(toUnion);
        }
        function compareFilterByName(a, b) {
            if (a.displayName < b.displayName)
                return -1;
            if (a.displayName > b.displayName)
                return 1;
            return 0;
        }
        function partitionColumnStore(store, field) {
            if (store.rowCount() === 0) {
                return {};
            }
            var indexedField;
            if (field instanceof columnStore.IndexedField) {
                indexedField = field;
            }
            else {
                var indexedFieldBuilder = columnStore.IndexedField.builder(field);
                store.eachRow(function (row) {
                    indexedFieldBuilder.onItem({ index: row, rowToken: row });
                });
                indexedField = indexedFieldBuilder.onEnd();
            }
            var result = {};
            var allValues = indexedField.allValues();
            for (var i = 0; i < allValues.length; i++) {
                var value = allValues[i];
                var filtered = store.filter(new ozone.ValueFilter(field, value));
                if (filtered.size() > 0) {
                    result["" + value] = filtered;
                }
            }
            return result;
        }
        columnStore.partitionColumnStore = partitionColumnStore;
        var FilteredColumnStore = (function (_super) {
            __extends(FilteredColumnStore, _super);
            function FilteredColumnStore(source, filterArray, filterBits) {
                _super.call(this, source);
                this.source = source;
                this.filterArray = filterArray;
                this.filterBits = filterBits;
                this.cachedSize = null;
            }
            FilteredColumnStore.prototype.size = function () {
                if (this.cachedSize === null) {
                    this.cachedSize = (this.sizeField()) ? this.sum(this.sizeField()) : this.rowCount();
                }
                return this.cachedSize;
            };
            FilteredColumnStore.prototype.rowCount = function () { return this.filterBits.size(); };
            FilteredColumnStore.prototype.sum = function (field) { return columnStore.sum(this, field); };
            FilteredColumnStore.prototype.intSet = function () { return this.filterBits; };
            FilteredColumnStore.prototype.eachRow = function (rowAction) { this.filterBits.each(rowAction); };
            FilteredColumnStore.prototype.filter = function (fieldNameOrFilter, value) {
                return filterColumnStore(this.source, this, createFilter(this, fieldNameOrFilter, value));
            };
            FilteredColumnStore.prototype.filters = function () { return this.filterArray; };
            FilteredColumnStore.prototype.simplifiedFilters = function () { return this.filterArray; };
            FilteredColumnStore.prototype.removeFilter = function (filter) {
                var newFilters = [];
                for (var i = 0; i < this.filterArray.length; i++) {
                    var f = this.filterArray[i];
                    if (!f.equals(filter)) {
                        newFilters.push(f);
                    }
                }
                var result = this.source;
                for (var i = 0; i < newFilters.length; i++) {
                    result = result.filter(newFilters[i]);
                }
                return result;
            };
            FilteredColumnStore.prototype.partition = function (fieldAny) {
                var key = (typeof fieldAny === 'string') ? fieldAny : fieldAny.identifier;
                return partitionColumnStore(this, this.field(key));
            };
            return FilteredColumnStore;
        })(ozone.StoreProxy);
        columnStore.FilteredColumnStore = FilteredColumnStore;
    })(columnStore = ozone.columnStore || (ozone.columnStore = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var columnStore;
    (function (columnStore) {
        /**
         * A Field which stores values in an index, and each value is mapped to a list of row identifiers.  This is similar
         * to an SQL index on a column, except that SQL databases store both a row and (optionally) an index, whereas this
         * Field only stores the index-- the row itself is nothing more than an identifying row number.
         *
         * <p><b>Although values need not be strings, they are identified internally by their toString method.</b></p>
         *
         * It is legal for values to have empty intSets;  for example, a Month
         * field might contain all the months of the year in order, even if only a few have any values, to guarantee that
         * the UI looks right.
         */
        var IndexedField = (function () {
            function IndexedField(descriptor, valueList, valueMap) {
                this.valueList = valueList;
                this.valueMap = valueMap;
                var range = descriptor.range();
                if (typeof range === 'undefined' || descriptor.typeOfValue === 'number') {
                    range = null;
                }
                this.identifier = descriptor.identifier;
                this.displayName = descriptor.displayName;
                this.typeOfValue = descriptor.typeOfValue;
                this.typeConstructor = descriptor.typeConstructor;
                this.rangeVal = range;
                this.aggregationRule = (descriptor.aggregationRule) ? descriptor.aggregationRule : null;
            }
            /**
             * Returns a reducer that can be run on a source DataStore to reproduce a sourceField.
             *
             * @param sourceField  the field which will be replicated
             * @param params       additional parameters:
             *                     values       -- if provided, this is the list of values used and any values not in this
             *                                     list are ignored.  This also defines the order of values.
             *                     intSetSource -- if provided, a IntSetBuilding to override the default.  The default may
             *                                     change, and may be browser specific or determined based on the
             *                                     characteristics of sourceField.
             */
            IndexedField.builder = function (sourceField, params) {
                if (params === void 0) { params = {}; }
                var descriptor = ozone.mergeFieldDescriptors(sourceField, params);
                var addValues = !params.values;
                var valueList = []; // (addValues) ? [] : params.values.concat();
                if (params.values) {
                    for (var i = 0; i < params.values.length; i++) {
                        valueList.push(ozone.convert(params.values[i], descriptor));
                    }
                }
                var intSetSource = (params.intSetSource)
                    ? params.intSetSource
                    : ozone.intSet.ArrayIndexIntSet;
                var intSetBuilders = {};
                for (var i = 0; i < valueList.length; i++) {
                    var value = ozone.convert(valueList[i], descriptor);
                    intSetBuilders[value.toString()] = intSetSource.builder();
                }
                return {
                    onItem: function (indexedRowToken) {
                        var values = sourceField.values(indexedRowToken.rowToken);
                        for (var i = 0; i < values.length; i++) {
                            var value = ozone.convert(values[i], descriptor);
                            var builder = intSetBuilders[value.toString()];
                            if (typeof (builder) === "undefined" && addValues) {
                                builder = intSetSource.builder();
                                intSetBuilders[value.toString()] = builder;
                                valueList.push(value);
                            }
                            if (typeof (builder) === "object") {
                                builder.onItem(indexedRowToken.index);
                            }
                        }
                    },
                    onEnd: function () {
                        var valueMap = {};
                        if (addValues && valueList.length > 0) {
                            var firstValue = valueList[0];
                            if (firstValue instanceof Date) {
                                valueList.sort(function (a, b) { return a.getTime() - b.getTime(); });
                            }
                            else {
                                valueList.sort();
                            }
                        }
                        for (var i = 0; i < valueList.length; i++) {
                            var valueStr = valueList[i].toString();
                            valueMap[valueStr] = intSetBuilders[valueStr].onEnd();
                        }
                        return new IndexedField(descriptor, valueList, valueMap);
                    }
                };
            };
            IndexedField.prototype.allValues = function () {
                return this.valueList.concat();
            };
            IndexedField.prototype.values = function (rowToken) {
                var index = rowToken;
                var result = [];
                for (var i = 0; i < this.valueList.length; i++) {
                    var value = this.valueList[i];
                    var intSet = this.valueMap[value.toString()];
                    if (intSet.has(index)) {
                        result.push(value);
                    }
                }
                return result;
            };
            IndexedField.prototype.range = function () {
                return this.rangeVal;
            };
            /** Equivalent to allValues().length. */
            IndexedField.prototype.distinctValueEstimate = function () {
                return this.valueList.length;
            };
            IndexedField.prototype.rowHasValue = function (index, value) {
                var intSet = this.valueMap[value.toString()];
                if (intSet) {
                    return intSet.has(index);
                }
                return false;
            };
            /** Return the intSet matching value.toString(), or an empty intSet if the value is not found. */
            IndexedField.prototype.intSetForValue = function (value) {
                var set = this.valueMap[value.toString()];
                return (set) ? set : ozone.intSet.empty;
            };
            return IndexedField;
        })();
        columnStore.IndexedField = IndexedField;
    })(columnStore = ozone.columnStore || (ozone.columnStore = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2014 by Vocal Laboratories, Inc. All rights reserved.
 */
/// <reference path='../_all.ts' />
/**
 * Bitwise operations on 32-bit numbers.  These match the asm.js standard for "int":  32-bit, unknown sign,
 * intended for bitwise use only.  In practice, JavaScript bitwise operators convert numbers to 32-bit two's-complement,
 * so that's what we use here.  We might actually use asm.js at some point, but hand coding it is a pain (see
 * https://github.com/zbjornson/human-asmjs).
 *
 * See:  http://asmjs.org/spec/latest/
 */
var ozone;
(function (ozone) {
    var intSet;
    (function (intSet) {
        var bits;
        (function (bits) {
            function singleBitMask(bitPos) {
                return 1 << (bitPos % 32);
            }
            bits.singleBitMask = singleBitMask;
            /** Return a number with the bit at num%32 set to true. */
            function setBit(num, word) {
                word = word | 0; // JIT hint, same one used by asm.js to signify a bitwise int.  Also clears high bits.
                var mask = singleBitMask(num);
                var result = 0;
                result = word | mask;
                return result;
            }
            bits.setBit = setBit;
            /** Return a number with the bit at num%32 set to false. */
            function unsetBit(num, word) {
                word = word | 0;
                var mask = ~singleBitMask(num);
                return word & mask;
            }
            bits.unsetBit = unsetBit;
            /** Return true if the bit num%32 is set*/
            function hasBit(num, word) {
                if (word == null)
                    return false;
                if (word & singleBitMask(num)) {
                    return true;
                }
                else {
                    return false;
                }
            }
            bits.hasBit = hasBit;
            /** Returns the number of 1's set within the first 32-bits of this number. */
            function countBits(word) {
                if (word == null)
                    return 0;
                word = word | 0; // This is not just a JIT hint:  clears the high bits
                var result = 0;
                result = word & 1;
                while (word !== 0) {
                    word = word >>> 1;
                    result += (word & 1);
                }
                return result;
            }
            bits.countBits = countBits;
            /** Returns the position of the minimum true bit in the lowest 32 bits of word, or -1 if all are false. */
            function minBit(word) {
                if (word == null)
                    return -1;
                word = word | 0; // This is not just a JIT hint:  clears the high bits
                var mask = singleBitMask(0);
                var result = 0;
                while (result < 32 && ((mask & word) !== mask)) {
                    mask <<= 1;
                    result++;
                }
                if (result > 31)
                    result = -1;
                return result;
            }
            bits.minBit = minBit;
            /** Returns the position of the maximum true bit in the lowest 32 bits of word, or -1 if all are false. */
            function maxBit(word) {
                if (word == null)
                    return -1;
                word = word | 0; // This is not just a JIT hint:  clears the high bits
                var mask = singleBitMask(31);
                var result = 31;
                while (result >= 0 && ((mask & word) !== mask)) {
                    mask >>>= 1;
                    result--;
                }
                return result;
            }
            bits.maxBit = maxBit;
            /** Convert a string of 1's and 0's to a 32-bit number, throws an error if the string is too long. */
            function base2ToBits(str) {
                if (str.length > 32) {
                    throw new Error("More than 32 bits: '" + str + "'");
                }
                return parseInt(str, 2) | 0;
            }
            bits.base2ToBits = base2ToBits;
            /** Returns the 32-bit int 'bit' is in */
            function inWord(bit) {
                return Math.floor((bit | 0) / 32);
            }
            bits.inWord = inWord;
            /** Returns the offset into a 32-bit int that 'bit' is in */
            function offset(bit) {
                return bit % 32;
            }
            bits.offset = offset;
        })(bits = intSet.bits || (intSet.bits = {}));
    })(intSet = ozone.intSet || (ozone.intSet = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc.  Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var intSet;
    (function (intSet) {
        intSet.empty; // Initialized in RangeIntSet.ts
        function asString(input) { return JSON.stringify(toArray(input)); }
        intSet.asString = asString;
        function toArray(input) {
            var result = [];
            input.each(function (item) { result.push(item); });
            return result;
        }
        intSet.toArray = toArray;
        /**
         * A textbook binary search which returns the index where the item is found,
         * or two's complement of its insert location if it is not found.
         * Based on sample code from Oliver Caldwell at
         * http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
         *
         * but note that that implementation is buggy.
         */
        function search(searchElement, array, minIndex, maxIndex) {
            var currentIndex;
            var currentElement;
            if (maxIndex < 0 || array.length === 0) {
                return -1;
            }
            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0;
                currentElement = array[currentIndex];
                if (currentElement < searchElement) {
                    minIndex = currentIndex + 1;
                }
                else if (currentElement > searchElement) {
                    maxIndex = currentIndex - 1;
                }
                else {
                    return currentIndex;
                }
            }
            return ~Math.max(minIndex, maxIndex);
        }
        intSet.search = search;
        /** Convert from one IntSet type to another, using the provided builder. */
        function build(input, builderSource) {
            var builder = builderSource.builder(input.min(), input.max());
            var iterator = input.iterator();
            while (iterator.hasNext()) {
                builder.onItem(iterator.next());
            }
            return builder.onEnd();
        }
        intSet.build = build;
        /**
         * Return the default IntSet builder.  If min and max are provided, a builder optimized for that size may be returned.
         */
        function builder(min, max) {
            if (min === void 0) { min = 0; }
            if (max === void 0) { max = -1; }
            return intSet.BitmapArrayIntSet.builder(min, max);
        }
        intSet.builder = builder;
        /** Convert to a more efficient IntSet implementation if necessary. */
        function mostEfficientIntSet(input) {
            if (input.size() == 0) {
                return intSet.empty;
            }
            if (input.max() - input.min() + 1 == input.size()) {
                return ozone.intSet.RangeIntSet.fromTo(input.min(), input.max());
            }
            var builderSource;
            if (isSparse(input)) {
                if (input instanceof intSet.ArrayIndexIntSet) {
                    return input;
                }
                builderSource = intSet.ArrayIndexIntSet;
            }
            else {
                if (input instanceof intSet.BitmapArrayIntSet) {
                    return input;
                }
                builderSource = intSet.BitmapArrayIntSet;
            }
            return build(input, builderSource);
        }
        intSet.mostEfficientIntSet = mostEfficientIntSet;
        /**
         * If true, the input is sparse enough that an ArrayIndexIntSet is the best implementation to use.
         */
        function isSparse(input) {
            return (input.max() - input.min() + 1) / input.size() > 100;
        }
        /** If the any set is sparse, use an ArrayIndexIntSet, if it is dense, use BitmapArrayIntSet */
        function bestBuilderForIntersection() {
            var toIntersect = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                toIntersect[_i - 0] = arguments[_i];
            }
            for (var i = 0; i < toIntersect.length; i++) {
                if (isSparse(toIntersect[i])) {
                    return intSet.ArrayIndexIntSet;
                }
            }
            return intSet.BitmapArrayIntSet;
        }
        intSet.bestBuilderForIntersection = bestBuilderForIntersection;
        /** Return a IntSet containing all the numbers provided by the iterators. */
        function unionOfIterators() {
            var iterators = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                iterators[_i - 0] = arguments[_i];
            }
            if (iterators.length === 0) {
                return intSet.empty;
            }
            var values = [];
            for (var i = 0; i < iterators.length; i++) {
                var it = iterators[i];
                while (it.hasNext()) {
                    values.push(it.next());
                }
            }
            if (values.length === 0) {
                return intSet.empty;
            }
            values.sort(function (a, b) { return a - b; }); // Default sort function is alphabetical
            var builder = ozone.intSet.builder(values[0], values[values.length - 1]);
            var lastValue = NaN;
            for (i = 0; i < values.length; i++) {
                var val = values[i];
                if (val !== lastValue) {
                    builder.onItem(val);
                    lastValue = val;
                }
            }
            return builder.onEnd();
        }
        intSet.unionOfIterators = unionOfIterators;
        /**
         * Return a IntSet containing all the numbers provided by the ordered iterators. This is more efficient
         * than unionOfIterators.  Returns the type of IntSet most appropriate for the size of the data.
         */
        function unionOfOrderedIterators() {
            var iterators = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                iterators[_i - 0] = arguments[_i];
            }
            if (iterators.length === 0) {
                return intSet.empty;
            }
            var builder = ozone.intSet.builder();
            var nexts = [];
            var previous = -1;
            var smallestIndex = 0;
            for (var i = 0; i < iterators.length; i++) {
                if (iterators[i].hasNext()) {
                    nexts[i] = iterators[i].next();
                    if (nexts[smallestIndex] == -1 || nexts[i] < nexts[smallestIndex]) {
                        smallestIndex = i;
                    }
                }
                else {
                    nexts[i] = -1;
                }
            }
            while (nexts[smallestIndex] >= 0) {
                if (nexts[smallestIndex] > previous) {
                    builder.onItem(nexts[smallestIndex]);
                    previous = nexts[smallestIndex];
                }
                nexts[smallestIndex] = iterators[smallestIndex].hasNext() ? iterators[smallestIndex].next() : -1;
                // Find the new smallest value in nexts
                smallestIndex = 0;
                for (var i = 0; i < nexts.length; i++) {
                    if ((nexts[smallestIndex] == -1) || (nexts[i] != -1 && nexts[i] < nexts[smallestIndex])) {
                        smallestIndex = i;
                    }
                }
            }
            return mostEfficientIntSet(builder.onEnd());
        }
        intSet.unionOfOrderedIterators = unionOfOrderedIterators;
        function unionOfIntSets() {
            var intSets = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                intSets[_i - 0] = arguments[_i];
            }
            if (intSets.length === 0) {
                return intSet.empty;
            }
            var result = intSets[0];
            for (var i = 1; i < intSets.length; i++) {
                result = result.union(intSets[i]);
            }
            return result;
        }
        intSet.unionOfIntSets = unionOfIntSets;
        /** Return a IntSet containing only the numbers provided by all of the iterators. */
        function intersectionOfOrderedIterators() {
            var iterators = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                iterators[_i - 0] = arguments[_i];
            }
            if (iterators.length === 0) {
                return intSet.empty;
            }
            if (iterators.length === 1) {
                return unionOfOrderedIterators(iterators[0]); // The algorithm below assumes at least 2 iterators.
            }
            return mostEfficientIntSet(intersectionOfOrderedIteratorsWithBuilder(builder(), iterators));
        }
        intSet.intersectionOfOrderedIterators = intersectionOfOrderedIterators;
        function intersectionOfOrderedIteratorsWithBuilder(builder, iterators) {
            if (iterators.length === 0) {
                return builder.onEnd();
            }
            // Cycle through the iterators round-robbin style, skipping to the highest element so far.  When we have N
            // iterators in a row giving us the same value, that element goes into the builder.
            var currentIteratorIndex = 0;
            var numIteratorsWithCurrentValue = 1; // Always start with 1, for the current iterator
            var previousValue = NaN;
            var it = iterators[currentIteratorIndex];
            while (it.hasNext()) {
                var currentValue = it.next();
                if (currentValue === previousValue) {
                    numIteratorsWithCurrentValue++;
                    if (numIteratorsWithCurrentValue === iterators.length) {
                        builder.onItem(currentValue);
                    }
                }
                else {
                    previousValue = currentValue;
                    numIteratorsWithCurrentValue = 1; // Always start with 1, for the current iterator
                }
                currentIteratorIndex = (currentIteratorIndex + 1) % iterators.length;
                it = iterators[currentIteratorIndex];
                it.skipTo(currentValue);
            }
            return builder.onEnd();
        }
        intSet.intersectionOfOrderedIteratorsWithBuilder = intersectionOfOrderedIteratorsWithBuilder;
        function intersectionOfIntSets() {
            var intSets = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                intSets[_i - 0] = arguments[_i];
            }
            if (intSets.length === 0) {
                return intSet.empty;
            }
            // Eventually we may want to do something more clever, such as sort by length or type
            var result = intSets[0];
            for (var i = 1; i < intSets.length; i++) {
                result = result.intersection(intSets[i]);
            }
            return result;
        }
        intSet.intersectionOfIntSets = intersectionOfIntSets;
        /** Implementation of intersectionOfUnion that intersects each set in toUnion with container, then unions them. */
        function intersectionOfUnionBySetOperations(container, toUnion) {
            if (toUnion.length === 0) {
                return container;
            }
            var intersected = [];
            for (var i = 0; i < toUnion.length; i++) {
                intersected.push(container.intersection(toUnion[i]));
            }
            var result = intersected[0];
            for (var i = 1; i < intersected.length; i++) {
                result = result.union(intersected[i]);
            }
            return result;
        }
        intSet.intersectionOfUnionBySetOperations = intersectionOfUnionBySetOperations;
        /** Implementation of intersectionOfUnion that builds from iterators. */
        function intersectionOfUnionByIteration(container, toUnion) {
            if (toUnion.length === 0) {
                return container;
            }
            var containerIt = container.iterator();
            var toUnionIts = [];
            for (var i = 0; i < toUnion.length; i++) {
                toUnionIts.push(new ozone.BufferedOrderedIterator(toUnion[i].iterator()));
            }
            var builder = ozone.intSet.builder();
            while (containerIt.hasNext()) {
                var index = containerIt.next();
                var shouldInclude = toUnionIts.some(function (it) {
                    it.skipTo(index);
                    return it.hasNext() && it.peek() === index;
                });
                if (shouldInclude) {
                    builder.onItem(index);
                }
            }
            return builder.onEnd();
        }
        intSet.intersectionOfUnionByIteration = intersectionOfUnionByIteration;
        function equalIntSets(set1, set2) {
            if (set1 === set2) {
                return true;
            }
            if (set1 instanceof intSet.RangeIntSet) {
                return set1.equals(set2); // RangeIntSet has a nice quick implementation-independent equality check.
            }
            if (set2 instanceof intSet.RangeIntSet) {
                return set2.equals(set1);
            }
            if (set1.size() !== set2.size() || set1.min() !== set2.min() || set1.max() !== set2.max()) {
                return false;
            }
            if (set1.size() === 0) {
                return true; // both empty
            }
            var it1 = set1.iterator();
            var it2 = set2.iterator();
            while (it1.hasNext()) {
                if (it1.next() != it2.next()) {
                    return false;
                }
            }
            return true;
        }
        intSet.equalIntSets = equalIntSets;
        function packedBitwiseCompare(set1, set2, bitwiseCompare, hasNextCompare, minPicker) {
            //  When we get more packed types, might need to rethink this.
            if (set2.isPacked === true) {
                var myIterator = set1.wordIterator();
                var otherIterator = set2.wordIterator();
                var array = [];
                var currentWord;
                var offset = minPicker(set1.minWord(), set2.minWord());
                myIterator.skipTo(offset);
                otherIterator.skipTo(offset);
                while (hasNextCompare(myIterator.hasNext(), otherIterator.hasNext())) {
                    currentWord = bitwiseCompare(myIterator.next(), otherIterator.next());
                    array.push(currentWord);
                }
                return mostEfficientIntSet(new intSet.BitmapArrayIntSet(array, offset));
            }
            return ozone.intSet.unionOfOrderedIterators(set1.iterator(), set2.iterator());
        }
        intSet.packedBitwiseCompare = packedBitwiseCompare;
    })(intSet = ozone.intSet || (ozone.intSet = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013-2015 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var intSet;
    (function (intSet) {
        /**
         * Implements all IntSet methods in terms of iterator().
         */
        var AbstractIntSet = (function () {
            function AbstractIntSet() {
                this.cachedMin = null;
                this.cachedMax = null;
                this.cachedSize = null;
            }
            AbstractIntSet.prototype.generateStats = function () {
                var max = Number.MIN_VALUE;
                var size = 0;
                var previous = -1;
                this.each(function (n) {
                    previous = n;
                    size++;
                });
                this.cachedSize = size;
                this.cachedMax = previous;
            };
            AbstractIntSet.prototype.has = function (index) {
                var it = this.iterator();
                it.skipTo(index);
                return it.hasNext() && it.next() === index;
            };
            AbstractIntSet.prototype.min = function () {
                if (this.cachedMin === null) {
                    this.cachedMin = this.iterator().hasNext() ? this.iterator().next() : -1;
                }
                return this.cachedMin;
            };
            AbstractIntSet.prototype.max = function () {
                if (this.cachedMax === null) {
                    this.generateStats();
                }
                return this.cachedMax;
            };
            AbstractIntSet.prototype.size = function () {
                if (this.cachedSize === null) {
                    this.generateStats();
                }
                return this.cachedSize;
            };
            AbstractIntSet.prototype.each = function (action) {
                var it = this.iterator();
                while (it.hasNext()) {
                    var item = it.next();
                    action(item);
                }
            };
            AbstractIntSet.prototype.iterator = function () {
                throw new Error("Subclasses must provide an implementation of iterator()");
            };
            AbstractIntSet.prototype.union = function (bm) {
                return intSet.unionOfOrderedIterators(this.iterator(), bm.iterator());
            };
            AbstractIntSet.prototype.intersection = function (set) {
                return intSet.intersectionOfOrderedIteratorsWithBuilder(intSet.bestBuilderForIntersection(this, set).builder(), [this.iterator(), set.iterator()]);
            };
            AbstractIntSet.prototype.intersectionOfUnion = function (toUnion) {
                return ozone.intSet.intersectionOfUnionByIteration(this, toUnion);
            };
            AbstractIntSet.prototype.equals = function (bm) {
                return intSet.equalIntSets(this, bm);
            };
            return AbstractIntSet;
        })();
        intSet.AbstractIntSet = AbstractIntSet;
    })(intSet = ozone.intSet || (ozone.intSet = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013-2015 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var intSet;
    (function (intSet) {
        /**
         * ASCII Run-Length Encoding IntSet:  a fairly compact ASCII representation of a bitmap.  Intended for use in JSON,
         * where data should be short and/or easily compressed.  Being simple enough to spot-check values is also desirable,
         * and since JSON files are likely to be transmitted in a compressed format, we focus on compressibility rather than
         * actual compactness.
         *
         * This is a quick, good-enough implementation that doesn't require WindowBase64.btoa() (not in IE 9 or Node.js)
         * or ArrayBuffer (not in IE 9).  As a result, this is likely to go away once we drop support for IE 9.  (We are
         * likely to be considerably slower than Microsoft in dropping IE 9 support.)
         *
         * Consists of a string of numbers; single digit numbers are written verbatim, while multi-digit numbers are in
         * parentheses.  The base of the numbers varies; ARLE-10 is base-10, useful for debugging, ARLE-36 is the most
         * compact. Thus, the ARLE-10 string '4(32)123(18)' yields the numbers [4, 32, 1, 2, 3, 18].
         *
         * Once the string of numbers is decoded, interpretation is simple run-length encoding: the first digit is the
         * number of 0's, the second is the number of 1's, and so on.  Thus, the ARLE-10 string '3211' yields the
         * little-endian bits 0001101, which in turn means that the IntSet consists of 3, 4, and 6.  Similarly, '0123'
         * yields bits 100111, and the IntSet consists of the numbers [0, 3, 4, 5].  Note that '0' should only occur as the
         * first character, where it indicates that the IntSet includes 0.  Because the bits should always end with a 1,
         * there is always an even number of run-length numbers.
         */
        var ArleIntSet = (function (_super) {
            __extends(ArleIntSet, _super);
            function ArleIntSet(base, data) {
                _super.call(this);
                this.base = base;
                this.data = data;
            }
            ArleIntSet.builderWithBase = function (base) {
                var data = "";
                var done = false;
                var lastWritten = -1;
                var lastItem = -1;
                var numConsecutive = 0;
                var writeNumber = function (num) {
                    var str = num.toString(base);
                    data += (str.length === 1) ? str : "(" + str + ")";
                };
                var writePair = function (numFalse, numTrue) {
                    writeNumber(numFalse);
                    writeNumber(numTrue);
                };
                var numBlank = function () {
                    var consecutiveStart = lastItem - numConsecutive + 1;
                    return consecutiveStart - lastWritten - 1;
                };
                return {
                    onItem: function (item) {
                        if (done) {
                            throw new Error("Builder being called multiple times.");
                        }
                        if (lastItem === item - 1 || lastItem === -1) {
                            numConsecutive++;
                        }
                        else {
                            writePair(numBlank(), numConsecutive);
                            numConsecutive = 1;
                            lastWritten = lastItem;
                        }
                        lastItem = item;
                    },
                    onEnd: function () {
                        done = true;
                        if (lastItem === -1) {
                            return new ArleIntSet(base, "");
                        }
                        writePair(numBlank(), numConsecutive);
                        return new ArleIntSet(base, data);
                    }
                };
            };
            ArleIntSet.builder = function (min, max, base) {
                if (min === void 0) { min = 0; }
                if (max === void 0) { max = -1; }
                if (base === void 0) { base = 36; }
                return this.builderWithBase(base);
            };
            /** Iterates over the run length numbers. */
            ArleIntSet.prototype.runLengthIterator = function () {
                var data = this.data;
                var base = this.base;
                var dataIndex = 0;
                var hasNext = function () {
                    return dataIndex < data.length;
                };
                var nextRleNumber = function () {
                    if (hasNext()) {
                        var ch = data.charAt(dataIndex);
                        dataIndex++;
                        var result = (ch === '(') ? readLongNumber() : parseInt(ch, base);
                        return result;
                    }
                };
                var readLongNumber = function () {
                    var str = "";
                    var ch = "";
                    while (hasNext() && ch !== ')') {
                        ch = data.charAt(dataIndex);
                        str += ch;
                        dataIndex++;
                    }
                    if (ch !== ')') {
                        throw new Error("Unterminated parentheses");
                    }
                    return parseInt(str, base);
                };
                return {
                    hasNext: hasNext,
                    next: nextRleNumber
                };
            };
            ArleIntSet.prototype.iterator = function () {
                return new intSet.SimpleOrderedIterator(new RunLengthConversionIterator(this.runLengthIterator()));
            };
            return ArleIntSet;
        })(intSet.AbstractIntSet);
        intSet.ArleIntSet = ArleIntSet;
        /** Translates run-length data into OrderedIterator data. */
        var RunLengthConversionIterator = (function () {
            function RunLengthConversionIterator(runLengthIterator) {
                this.runLengthIterator = runLengthIterator;
                this.previous = -1;
                this.remainingTrues = 0;
            }
            RunLengthConversionIterator.prototype.hasNext = function () { return this.remainingTrues > 0 || this.runLengthIterator.hasNext(); };
            RunLengthConversionIterator.prototype.readPair = function () {
                this.previous += this.runLengthIterator.next(); // Skip to the next true
                this.remainingTrues = this.runLengthIterator.next(); // the next true
            };
            RunLengthConversionIterator.prototype.next = function () {
                if (this.hasNext()) {
                    if (!this.remainingTrues) {
                        this.readPair();
                    }
                    this.previous++;
                    this.remainingTrues--;
                    return this.previous;
                }
            };
            return RunLengthConversionIterator;
        })();
    })(intSet = ozone.intSet || (ozone.intSet = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013-2015 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var intSet;
    (function (intSet) {
        intSet.numberOfArrayIndexIntSetsConstructed = 0;
        /**
         * The most trivial of general-purpose IntSet implementations;  a sorted array of indexes.  This can work well for
         * sparse data.
         * We use this implementation and not a boolean[], because ECMA doesn't specify iteration order.
         */
        var ArrayIndexIntSet = (function () {
            /** Use builder() or fromArray() to construct. */
            function ArrayIndexIntSet(indexes) {
                this.indexes = indexes;
                intSet.numberOfArrayIndexIntSetsConstructed++;
            }
            /** Matches the API of other IntSet builders. */
            ArrayIndexIntSet.builder = function (min, max) {
                if (min === void 0) { min = 0; }
                if (max === void 0) { max = -1; }
                var array = [];
                var done = false;
                return {
                    onItem: function (item) {
                        if (done) {
                            throw new Error("Builder being called multiple times.");
                        }
                        array.push(item);
                    },
                    onEnd: function () { done = true; return new ArrayIndexIntSet(array); }
                };
            };
            /** Creates a set backed by a copy of this array. The array must be sorted from lowest to highest. */
            ArrayIndexIntSet.fromArray = function (elements) { return new ArrayIndexIntSet(elements.concat()); };
            ArrayIndexIntSet.prototype.size = function () { return this.indexes.length; };
            ArrayIndexIntSet.prototype.toArray = function () {
                return this.indexes.concat();
            };
            ArrayIndexIntSet.prototype.has = function (index) {
                return intSet.search(index, this.indexes, 0, this.indexes.length - 1) >= 0;
            };
            ArrayIndexIntSet.prototype.min = function () {
                return (this.indexes.length === 0) ? -1 : this.indexes[0];
            };
            ArrayIndexIntSet.prototype.max = function () {
                return (this.indexes.length === 0) ? -1 : this.indexes[this.indexes.length - 1];
            };
            ArrayIndexIntSet.prototype.each = function (action) {
                for (var i = 0; i < this.indexes.length; i++) {
                    action(this.indexes[i]);
                }
            };
            ArrayIndexIntSet.prototype.iterator = function () {
                return new OrderedArrayIterator(this.indexes);
            };
            ArrayIndexIntSet.prototype.equals = function (set) {
                return intSet.equalIntSets(this, set);
            };
            ArrayIndexIntSet.prototype.union = function (set) {
                if (this.size() === 0) {
                    return set;
                }
                if (set.size() === 0) {
                    return this; // Min and max aren't useful for comparisons with unions
                }
                if (set instanceof intSet.RangeIntSet && set.min() <= this.min() && set.max() >= this.max()) {
                    return set;
                }
                return intSet.unionOfOrderedIterators(this.iterator(), set.iterator());
            };
            ArrayIndexIntSet.prototype.intersection = function (set) {
                return intSet.intersectionOfOrderedIteratorsWithBuilder(intSet.bestBuilderForIntersection(this, set).builder(), [this.iterator(), set.iterator()]);
            };
            ArrayIndexIntSet.prototype.intersectionOfUnion = function (toUnion) { return ozone.intSet.intersectionOfUnionByIteration(this, toUnion); };
            ArrayIndexIntSet.prototype.toString = function () { return ozone.intSet.asString(this); };
            return ArrayIndexIntSet;
        })();
        intSet.ArrayIndexIntSet = ArrayIndexIntSet;
        /** Iterator over dense arrays;  does not work with sparse arrays. */
        var OrderedArrayIterator = (function () {
            function OrderedArrayIterator(array) {
                this.array = array;
                this.nextIndex = 0;
            }
            OrderedArrayIterator.prototype.hasNext = function () {
                return this.nextIndex < this.array.length;
            };
            OrderedArrayIterator.prototype.next = function () {
                return this.array[this.nextIndex++];
            };
            OrderedArrayIterator.prototype.skipTo = function (item) {
                if ((!this.hasNext()) || item <= this.array[this.nextIndex]) {
                    return;
                }
                var searchIndex = intSet.search(item, this.array, this.nextIndex, this.array.length);
                this.nextIndex = (searchIndex < 0) ? ~searchIndex : searchIndex;
            };
            return OrderedArrayIterator;
        })();
        intSet.OrderedArrayIterator = OrderedArrayIterator;
    })(intSet = ozone.intSet || (ozone.intSet = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var intSet;
    (function (intSet) {
        intSet.numberOfBitmapIntSetsConstructed = 0;
        /**
         * Stores indexes in an Array of numbers, treating them as 32-bit unsigned integers.
         */
        var BitmapArrayIntSet = (function () {
            /**
             * Constructs a BitmapArrayIntSet.
             * @param words         The bitmap (not including the offset bits) as a number array
             * @param wordOffset    The number of 32-bit words which are all zeroes which proceed the given array.
             */
            function BitmapArrayIntSet(words, wordOffset) {
                this.words = words;
                this.wordOffset = wordOffset;
                this.isPacked = true;
                this.cachedSize = null;
                intSet.numberOfBitmapIntSetsConstructed++;
                if (words == null || words.length == 0) {
                    this.cachedSize = 0;
                    this.minValue = -1;
                    this.maxValue = -1;
                }
                else {
                    var currentBit;
                    for (var i = 0; i < words.length; i++) {
                        currentBit = intSet.bits.minBit(words[i]);
                        if (currentBit >= 0) {
                            this.minValue = currentBit + (i + this.wordOffset) * 32;
                            break;
                        }
                    }
                    for (var i = words.length - 1; i >= 0; i--) {
                        currentBit = intSet.bits.maxBit(words[i]);
                        if (currentBit >= 0) {
                            this.maxValue = currentBit + (i + this.wordOffset) * 32;
                            break;
                        }
                    }
                }
                this.size();
            }
            /** Function matches other IntSets, but in this case we don't care about min and max. */
            BitmapArrayIntSet.builder = function (min, max) {
                if (min === void 0) { min = 0; }
                if (max === void 0) { max = -1; }
                var array = [];
                var isFirst = true;
                var numOfLeadingWords = 0;
                var currentWordIndex = 0;
                var currentWord = currentWord | 0; // This is not just a JIT hint:  clears the high bits
                return {
                    onItem: function (item) {
                        var thisWordIndex = intSet.bits.inWord(item) - numOfLeadingWords;
                        if (thisWordIndex < currentWordIndex) {
                            throw new Error("BitmapArrayIntSet.builder() requires a sorted array to parse.");
                        }
                        if (thisWordIndex > currentWordIndex) {
                            if (isFirst) {
                                // The index of the word which the first set bit is in is the same as the number of words
                                // which are filled with leading zeroes.
                                numOfLeadingWords = intSet.bits.inWord(item);
                                currentWordIndex = thisWordIndex - numOfLeadingWords;
                            }
                            else {
                                array[currentWordIndex] = currentWord;
                                currentWord = 0;
                                currentWord = currentWord | 0; // Needed to clear the high bits?
                                currentWordIndex = thisWordIndex;
                            }
                        }
                        currentWord = intSet.bits.setBit(intSet.bits.offset(item), currentWord);
                        isFirst = false;
                    },
                    onEnd: function () {
                        if (!isFirst) {
                            array[currentWordIndex] = currentWord;
                        }
                        return new BitmapArrayIntSet(array, numOfLeadingWords);
                    }
                };
            };
            BitmapArrayIntSet.prototype.size = function () {
                if (this.cachedSize === null) {
                    this.cachedSize = this.countSize();
                }
                return this.cachedSize;
            };
            BitmapArrayIntSet.prototype.countSize = function () {
                var result = 0;
                this.words.forEach(function (word) {
                    result += intSet.bits.countBits(word);
                });
                return result;
            };
            BitmapArrayIntSet.prototype.has = function (theBit) {
                var indexOffset = theBit - this.wordOffset * 32;
                if (indexOffset < 0) {
                    return false;
                }
                return intSet.bits.hasBit(intSet.bits.offset(indexOffset), this.words[intSet.bits.inWord(indexOffset)]);
            };
            /**
             * The lowest value for which has() returns true, or -1 if size === 0.  This should be
             * extremely fast.
             * The behavior when size === 0 may change in future versions.
             */
            BitmapArrayIntSet.prototype.min = function () {
                return this.minValue;
            };
            /**
             * The highest value for which has() returns true, or -1 if size === 0.  This should be
             * extremely fast.
             * The behavior when size === 0 may change in future versions.
             */
            BitmapArrayIntSet.prototype.max = function () {
                return this.maxValue;
            };
            /** Iterate over all "true" elements in order. */
            BitmapArrayIntSet.prototype.each = function (action) {
                for (var i = 0; i < this.words.length; i++) {
                    if (this.words[i] != null || this.words[i] != 0) {
                        for (var j = 0; j < 32; j++) {
                            if (this.words[i] & intSet.bits.singleBitMask(j)) {
                                action(i * 32 + j + this.wordOffset * 32);
                            }
                        }
                    }
                }
            };
            /** Iterate over all "true" elements in order. */
            BitmapArrayIntSet.prototype.iterator = function () {
                return new OrderedBitmapArrayWithOffsetIterator(this.words, this.maxValue, this.wordOffset);
            };
            /** Iterate over all the packed words in order. */
            BitmapArrayIntSet.prototype.wordIterator = function () {
                return new OrderedWordWithOffsetIterator(this.words, this.wordOffset);
            };
            /** Returns an IntSet containing all the elements in either IntSet. */
            BitmapArrayIntSet.prototype.union = function (set) {
                if (this.size() === 0) {
                    return set;
                }
                if (set.size() === 0) {
                    return this; // Min and max aren't useful for comparisons with unions
                }
                if (set instanceof intSet.RangeIntSet && set.min() <= this.min() && set.max() >= this.max()) {
                    return set;
                }
                if (set['isPacked']) {
                    var bitwiseCompare = function (word1, word2) { return word1 | word2; };
                    var hasNextCompare = function (next1, next2) { return next1 || next2; };
                    var minPicker = function (min1, min2) { return min1 <= min2 ? min1 : min2; };
                    return ozone.intSet.packedBitwiseCompare(this, set, bitwiseCompare, hasNextCompare, minPicker);
                }
                return ozone.intSet.unionOfOrderedIterators(this.iterator(), set.iterator());
            };
            /** Returns an IntSet containing only the elements that are found in both IntSets. */
            BitmapArrayIntSet.prototype.intersection = function (set) {
                if (this.size() === 0 || set.size() === 0) {
                    return intSet.empty;
                }
                if (set['isPacked']) {
                    var bitwiseCompare = function (word1, word2) { return word1 & word2; };
                    var hasNextCompare = function (next1, next2) { return next1 && next2; };
                    var minPicker = function (min1, min2) { return min1 >= min2 ? min1 : min2; };
                    return ozone.intSet.packedBitwiseCompare(this, set, bitwiseCompare, hasNextCompare, minPicker);
                }
                return intSet.intersectionOfOrderedIteratorsWithBuilder(intSet.bestBuilderForIntersection(this, set).builder(), [this.iterator(), set.iterator()]);
            };
            BitmapArrayIntSet.prototype.intersectionOfUnion = function (toUnion) {
                if (toUnion.every(function (set) { return set['isPacked']; })) {
                    return ozone.intSet.intersectionOfUnionBySetOperations(this, toUnion);
                }
                return ozone.intSet.intersectionOfUnionByIteration(this, toUnion);
            };
            /** Returns true if the iterators produce identical results. */
            BitmapArrayIntSet.prototype.equals = function (set) { return intSet.equalIntSets(this, set); };
            BitmapArrayIntSet.prototype.minWord = function () { return this.wordOffset; };
            /** Equals Math.floor(min()/32). */
            BitmapArrayIntSet.prototype.maxWord = function () { return intSet.bits.inWord(this.maxValue); };
            BitmapArrayIntSet.prototype.toString = function () { return ozone.intSet.asString(this); };
            return BitmapArrayIntSet;
        })();
        intSet.BitmapArrayIntSet = BitmapArrayIntSet;
        /**
         * Iterates over all the set bits in order.  This class does not support an index offset.
         */
        var OrderedBitmapArrayIterator = (function () {
            function OrderedBitmapArrayIterator(words, maxBit) {
                this.words = words;
                this.maxBit = maxBit;
                this.nextBit = 0; // The next bit to check (treating the data as one long array of 0's and 1's).
            }
            OrderedBitmapArrayIterator.prototype.hasNext = function () {
                return this.nextBit <= this.maxBit;
            };
            /**
             * Returns the index of the next set bit.
             *
             * @returns {number}
             */
            OrderedBitmapArrayIterator.prototype.next = function () {
                var result;
                while (this.hasNext() && result === undefined) {
                    var word = this.words[intSet.bits.inWord(this.nextBit)];
                    if (word) {
                        if (word & intSet.bits.singleBitMask(this.nextBit)) {
                            result = this.nextBit;
                        }
                        this.nextBit++;
                    }
                    else {
                        this.nextBit = (intSet.bits.inWord(this.nextBit) + 1) * 32;
                    }
                }
                return result;
            };
            OrderedBitmapArrayIterator.prototype.skipTo = function (item) {
                item = Math.ceil(item);
                if (this.nextBit < item) {
                    this.nextBit = item;
                }
            };
            return OrderedBitmapArrayIterator;
        })();
        intSet.OrderedBitmapArrayIterator = OrderedBitmapArrayIterator;
        /**
         * Iterates over all the set bits in order.  This class does support an index offset.
         */
        var OrderedBitmapArrayWithOffsetIterator = (function (_super) {
            __extends(OrderedBitmapArrayWithOffsetIterator, _super);
            function OrderedBitmapArrayWithOffsetIterator(words, maxBit, wordOffset) {
                this.bitOffset = wordOffset * 32;
                _super.call(this, words, maxBit - this.bitOffset);
            }
            OrderedBitmapArrayWithOffsetIterator.prototype.next = function () {
                return _super.prototype.next.call(this) + this.bitOffset;
            };
            OrderedBitmapArrayWithOffsetIterator.prototype.skipTo = function (item) {
                if (item >= this.bitOffset) {
                    _super.prototype.skipTo.call(this, item - this.bitOffset);
                }
                else {
                    _super.prototype.skipTo.call(this, 0);
                }
            };
            return OrderedBitmapArrayWithOffsetIterator;
        })(OrderedBitmapArrayIterator);
        intSet.OrderedBitmapArrayWithOffsetIterator = OrderedBitmapArrayWithOffsetIterator;
        var OrderedWordWithOffsetIterator = (function () {
            function OrderedWordWithOffsetIterator(words, wordOffset) {
                this.words = words;
                this.wordOffset = wordOffset;
                this.nextWord = 0 - wordOffset;
            }
            OrderedWordWithOffsetIterator.prototype.hasNext = function () {
                return this.nextWord < this.words.length;
            };
            OrderedWordWithOffsetIterator.prototype.next = function () {
                var result = 0 | 0;
                if (this.nextWord >= 0) {
                    result = this.words[this.nextWord];
                    if (typeof (result) === 'undefined') {
                        result = 0 | 0;
                    }
                }
                this.nextWord++;
                return result;
            };
            OrderedWordWithOffsetIterator.prototype.skipTo = function (item) {
                this.nextWord = item - this.wordOffset;
            };
            return OrderedWordWithOffsetIterator;
        })();
        intSet.OrderedWordWithOffsetIterator = OrderedWordWithOffsetIterator;
    })(intSet = ozone.intSet || (ozone.intSet = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var intSet;
    (function (intSet) {
        /**
         * A trivial intSet which contains all values in a range.
         */
        var RangeIntSet = (function () {
            function RangeIntSet(minValue, rangeSize) {
                this.minValue = minValue;
                this.rangeSize = rangeSize;
                if (rangeSize === 0) {
                    this.minValue = -1;
                }
            }
            /** Return a RangeIntSet from minValue to maxValue inclusive. */
            RangeIntSet.fromTo = function (minValue, maxValue) {
                if (minValue === -1 && maxValue === -1) {
                    return intSet.empty;
                }
                var length = 1 + maxValue - minValue;
                if (length <= 0) {
                    return intSet.empty;
                }
                if (maxValue < minValue) {
                    throw new Error("Max " + maxValue + " < " + " min " + minValue);
                }
                if (minValue < 0) {
                    throw new Error("Min must be at least 0 for non-empty intSet, is " + minValue + " (to " + maxValue + ")");
                }
                return new RangeIntSet(minValue, length);
            };
            RangeIntSet.prototype.size = function () { return this.rangeSize; };
            RangeIntSet.prototype.has = function (index) {
                return this.size() > 0 && index >= this.minValue && index <= this.max();
            };
            RangeIntSet.prototype.min = function () {
                return this.minValue;
            };
            RangeIntSet.prototype.max = function () {
                if (this.size() === 0) {
                    return -1;
                }
                return this.minValue + (this.size() - 1);
            };
            RangeIntSet.prototype.each = function (action) {
                for (var i = 0; i < this.size(); i++) {
                    action(i + this.minValue);
                }
            };
            RangeIntSet.prototype.iterator = function () {
                var index = this.minValue;
                var bm = this;
                var hasNext = function () {
                    return bm.size() > 0 && index <= bm.max();
                };
                return {
                    hasNext: hasNext,
                    next: function () { return hasNext() ? index++ : undefined; },
                    skipTo: function (i) { if (index < i)
                        index = i; }
                };
            };
            RangeIntSet.prototype.equals = function (bm) {
                // In the case of RangeIntSets, we need only check min, max, and size
                // because size is a function of min and max.
                //
                // Note that equalIntSets relies on this implementation.
                return this.size() === bm.size() && this.min() === bm.min() && this.max() === bm.max();
            };
            RangeIntSet.prototype.union = function (bm) {
                if (this.size() === 0) {
                    return (bm.size() === 0) ? intSet.empty : bm;
                }
                if (bm.size() === 0) {
                    return this;
                }
                if (typeof (bm["unionWithRangeIntSet"]) === "function") {
                    return bm["unionWithRangeIntSet"](this);
                }
                var lowBm = (this.min() < bm.min()) ? this : bm;
                var highBm = (lowBm === this) ? bm : this;
                if (bm instanceof RangeIntSet) {
                    if (bm.min() === this.min() && bm.size() === this.size()) {
                        return this;
                    }
                    if (lowBm.max() >= highBm.min()) {
                        return RangeIntSet.fromTo(lowBm.min(), Math.max(lowBm.max(), highBm.max()));
                    }
                }
                return ozone.intSet.unionOfOrderedIterators(highBm.iterator(), lowBm.iterator());
            };
            RangeIntSet.prototype.intersection = function (bm) {
                if (this.size() === 0 || bm.size() === 0) {
                    return intSet.empty;
                }
                if (typeof (bm["intersectionWithRangeIntSet"]) === "function") {
                    return bm["intersectionWithRangeIntSet"](this);
                }
                var min = Math.max(this.min(), bm.min());
                var max = Math.min(this.max(), bm.max());
                if (max < min) {
                    return intSet.empty;
                }
                if (bm instanceof RangeIntSet) {
                    return RangeIntSet.fromTo(min, max);
                }
                return ozone.intSet.intersectionOfOrderedIterators(this.iterator(), bm.iterator());
            };
            RangeIntSet.prototype.intersectionOfUnion = function (toUnion) { return ozone.intSet.intersectionOfUnionBySetOperations(this, toUnion); };
            RangeIntSet.prototype.toString = function () {
                if (this.size() === 0) {
                    return "empty";
                }
                return this.min() + "-" + this.max();
            };
            return RangeIntSet;
        })();
        intSet.RangeIntSet = RangeIntSet;
        intSet.empty = new RangeIntSet(-1, 0);
    })(intSet = ozone.intSet || (ozone.intSet = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013-2015 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var intSet;
    (function (intSet) {
        /**
         * Wraps an Iterator to build an OrderedIterator.
         */
        var SimpleOrderedIterator = (function () {
            function SimpleOrderedIterator(iterator) {
                this.iterator = iterator;
                this.hasNextItem = iterator.hasNext();
                if (this.hasNextItem) {
                    this.nextItem = iterator.next();
                }
            }
            SimpleOrderedIterator.prototype.hasNext = function () { return this.hasNextItem; };
            SimpleOrderedIterator.prototype.next = function () {
                var result = this.nextItem;
                this.hasNextItem = this.iterator.hasNext();
                this.nextItem = this.iterator.next();
                return result;
            };
            SimpleOrderedIterator.prototype.skipTo = function (item) {
                while (this.hasNext() && this.nextItem < item) {
                    this.next();
                }
            };
            return SimpleOrderedIterator;
        })();
        intSet.SimpleOrderedIterator = SimpleOrderedIterator;
    })(intSet = ozone.intSet || (ozone.intSet = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path="../_all.ts" />
var ozone;
(function (ozone) {
    var rowStore;
    (function (rowStore) {
        /** Build from a CSV file, with all resulting Fields treated as strings. */
        function buildFromCsv(csv) {
            var dataArray = csv.split(/(\r\n|\n|\r)/);
            var reader = new rowStore.CsvReader();
            var fieldInfo = (function () {
                reader.onItem(dataArray[0]);
                var result = {};
                for (var index in reader.columnNames) {
                    result[reader.columnNames[index]] = { typeOfValue: "string" };
                }
                reader.onEnd(); // Reset, so we can reuse it for reading data rows from dataArray
                return result;
            })();
            return build(fieldInfo, dataArray, reader);
        }
        rowStore.buildFromCsv = buildFromCsv;
        function buildFromStore(source, params) {
            if (params === void 0) { params = {}; }
            var sourceFields = source.fields();
            // Create all rows without regard to the type of field.  The JsonRowField classes are forgiving, so we can
            // build the rows after the fact
            var fieldsWithMultipleValues = {};
            var rows = [];
            source.eachRow(function (rowToken) {
                var newRow = {};
                sourceFields.forEach(function (field) {
                    var values = field.values(rowToken);
                    if (values.length === 1) {
                        newRow[field.identifier] = values[0];
                    }
                    else if (values.length > 1) {
                        newRow[field.identifier] = values;
                        if (!fieldsWithMultipleValues.hasOwnProperty(field.identifier)) {
                            fieldsWithMultipleValues[field.identifier] = true;
                        }
                    }
                });
                rows.push(newRow);
            });
            var fields = sourceFields.map(function (oldField) {
                var fProto = (fieldsWithMultipleValues.hasOwnProperty(oldField.identifier)) ? rowStore.JsonRowField : rowStore.UnaryJsonRowField;
                return new fProto(oldField.identifier, oldField.displayName, oldField.typeOfValue, oldField.typeConstructor, oldField.range(), oldField.distinctValueEstimate(), oldField.aggregationRule);
            });
            if (params.hasOwnProperty('sortCompareFunction')) {
                rows.sort(params.sortCompareFunction);
            }
            var sizeFieldId = source.sizeField() ? source.sizeField().identifier : null;
            return new rowStore.RowStore(fields, rows, null, sizeFieldId);
        }
        rowStore.buildFromStore = buildFromStore;
        /**
         * Build a RowStore.
         * @param fieldInfo          Descriptors for each Field, converted to FieldDescriptors via FieldDescriptor.build().
         * @param data               Data, either native (JsonField) format, or converted via a rowTransformer.
         * @param rowTransformer     Reducer, where onItem converts to a map from field IDs to values.
         * @param recordCountFieldId The name of the field used to calculate size() in any RandomAccessDataStore constructed
         *                           from this.
         */
        function build(fieldInfo, data, rowTransformer, recordCountFieldId) {
            if (rowTransformer === void 0) { rowTransformer = null; }
            if (recordCountFieldId === void 0) { recordCountFieldId = null; }
            var fieldDescriptors = [];
            var fields = [];
            var toComputeRange = [];
            var toComputeDistinctValues = [];
            for (var key in fieldInfo) {
                if (fieldInfo.hasOwnProperty(key)) {
                    var fd = ozone.FieldDescriptor.build(fieldInfo[key], key);
                    fieldDescriptors.push(fd);
                    if (fd.shouldCalculateDistinctValues) {
                        toComputeDistinctValues.push(key);
                    }
                    if (fd.typeOfValue === "number" && fd.range() === null) {
                        toComputeRange.push(key);
                    }
                    var fProto;
                    if (fd.multipleValuesPerRow)
                        fProto = rowStore.JsonRowField;
                    else
                        fProto = rowStore.UnaryJsonRowField;
                    var field = new fProto(fd.identifier, fd.displayName, fd.typeOfValue, null, fd.range(), fd.distinctValueEstimate(), fd.aggregationRule);
                    fields.push(field);
                }
            }
            var result = new rowStore.RowStore(fields, data, rowTransformer, recordCountFieldId);
            if (toComputeDistinctValues.length > 0 || toComputeRange.length > 0) {
                var rangeCalculators = {};
                for (var i = 0; i < toComputeRange.length; i++) {
                    key = toComputeRange[i];
                    rangeCalculators[key] = new rowStore.RangeCalculator(result.field(key));
                }
                var valueCalculators = {};
                for (var i = 0; i < toComputeDistinctValues.length; i++) {
                    key = toComputeDistinctValues[i];
                    valueCalculators[key] = new rowStore.ValueFrequencyCalculator(result.field(key));
                }
                result.eachRow(function (rowToken) {
                    for (var rangeKey in rangeCalculators) {
                        var rc = rangeCalculators[rangeKey];
                        rc.onItem(rowToken);
                    }
                    for (var valueKey in valueCalculators) {
                        var vc = valueCalculators[valueKey];
                        vc.onItem(rowToken);
                    }
                });
                for (var rangeKey in rangeCalculators) {
                    var rc = rangeCalculators[rangeKey];
                    var range = rc.onEnd();
                    var f = rc.field;
                    fProto = proto(f);
                    var newField = new fProto(f.identifier, f.displayName, f.typeOfValue, f.typeConstructor, range, f.distinctValueEstimate(), f.aggregationRule);
                    result = result.withField(newField);
                }
                for (var valueKey in valueCalculators) {
                    var vc = valueCalculators[valueKey];
                    var valueCounts = vc.onEnd();
                    var numValues = 0;
                    if (typeof Object["keys"] === "undefined") {
                        for (key in valueCounts) {
                            numValues++;
                        }
                    }
                    else {
                        numValues = Object.keys(valueCounts).length;
                    }
                    f = vc.field;
                    fProto = proto(f);
                    newField = new fProto(f.identifier, f.displayName, f.typeOfValue, f.typeConstructor, f.range(), numValues, f.aggregationRule);
                    result = result.withField(newField);
                }
            }
            return result;
        }
        rowStore.build = build;
        function proto(field) {
            if (typeof field["value"] === "function") {
                return rowStore.UnaryJsonRowField;
            }
            return rowStore.JsonRowField;
        }
    })(rowStore = ozone.rowStore || (ozone.rowStore = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    var rowStore;
    (function (rowStore) {
        /**
         * Converts CSV into simple JavaScript objects for use by RowStore.  The first row must provide column names.
         * The RowStore's data is the CSV as an array (each line is an element of the array, including the header row and
         * blank lines).  Thus, the line number corresponds is the array index plus one.  This also means that some lines
         * don't map to rows in a RowStore.
         *
         */
        var CsvReader = (function () {
            function CsvReader(parameters) {
                if (parameters === void 0) { parameters = {}; }
                this.delimiter = ',';
                this.quote = '"';
                this.ignoreFirstRow = false;
                this.rowNumber = 0;
                for (var key in parameters) {
                    if (parameters.hasOwnProperty(key)) {
                        this[key] = parameters[key];
                    }
                }
                this.reset();
            }
            CsvReader.prototype.reset = function () {
                this.columnNames = null;
                this.rowNumber = 0;
            };
            /** Resets, including forgetting the column names. */
            CsvReader.prototype.onEnd = function () {
                this.reset();
            };
            /**
             * Takes the next row in the CSV array and returns an object with column names mapping to column values.
             * Returns null if the row needs to be skipped, for example if it's the header row or a blank line.
             */
            CsvReader.prototype.onItem = function (row) {
                this.rowNumber++;
                if (this.ignoreFirstRow && this.rowNumber === 1) {
                    return null;
                }
                var resultArray = this.lineToArray(row);
                if (resultArray === null) {
                    return null;
                }
                if (this.columnNames === null && resultArray !== null) {
                    this.columnNames = resultArray;
                    return null;
                }
                var result = {};
                var valuesFoundCount = 0;
                for (var i = 0; i < this.columnNames.length && i < resultArray.length; i++) {
                    var key = this.columnNames[i];
                    var value = resultArray[i];
                    if (value !== '') {
                        valuesFoundCount++;
                        result[key] = value;
                    }
                }
                if (valuesFoundCount === 0) {
                    return null;
                }
                return result;
            };
            CsvReader.prototype.lineToArray = function (row) {
                var cells = [];
                var str = row;
                var quoteCharCode = this.quote.charCodeAt(0);
                var pos = 0;
                var parseQuote = function () {
                    pos++;
                    var start = pos;
                    for (; pos < str.length; pos++) {
                        if (str.charCodeAt(pos) === quoteCharCode) {
                            var soFar = str.substring(start, pos);
                            pos++;
                            if (str.charCodeAt(pos) === quoteCharCode) {
                                return soFar + '"' + parseQuote();
                            }
                            return soFar;
                        }
                    }
                    throw new Error("Line ended with unterminated quote.  Full line: " + str);
                };
                var skipWhitespace = function () {
                    while (pos < str.length && str.charAt(pos).match(/\s/)) {
                        pos++;
                    }
                };
                parseCell: while (pos < str.length) {
                    skipWhitespace();
                    var start = pos;
                    if (str.charAt(pos) === this.quote) {
                        cells.push(parseQuote());
                        skipWhitespace();
                        if (pos < str.length && str.charAt(pos) !== this.delimiter) {
                            throw new Error("Expected [" + this.delimiter + "], got [" + str.charAt(pos) + "] in [" + str.substring(pos) + "]");
                        }
                        pos++;
                    }
                    else {
                        for (; pos < str.length; pos++) {
                            if (str.charAt(pos) === this.delimiter) {
                                str.substring(start, pos);
                                cells.push(str.substring(start, pos).trim());
                                pos++;
                                continue parseCell;
                            }
                        }
                        cells.push(str.substring(start).trim());
                    }
                }
                return cells;
            };
            return CsvReader;
        })();
        rowStore.CsvReader = CsvReader;
    })(rowStore = ozone.rowStore || (ozone.rowStore = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path="../_all.ts" />
var ozone;
(function (ozone) {
    var rowStore;
    (function (rowStore) {
        /**
         * A row-oriented DataStore that acts on an array of rows.  The interpretation of the rows is done entirely by
         * the Fields.  This is mainly intended for server-side (node.js) usage to convert data into more efficient formats.
         *
         * Although the current implementation stores rows in an array, this may someday be changed to be stream-based to
         * handle data more efficiently.  For this reason the public API only allows row access from start to end.
         */
        var RowStore = (function () {
            function RowStore(fieldArray, rowData, rowTransformer, sizeFieldId) {
                this.fieldArray = fieldArray;
                this.rowData = rowData;
                this.rowTransformer = rowTransformer;
                this.sizeFieldId = sizeFieldId;
                this.fieldMap = {};
                for (var i = 0; i < fieldArray.length; i++) {
                    var field = fieldArray[i];
                    this.fieldMap[field.identifier] = field;
                }
                if (sizeFieldId !== null) {
                    var rcField = this.fieldMap[sizeFieldId];
                    if (rcField === null) {
                        throw new Error("No field named '" + sizeFieldId + "' for record count");
                    }
                    else if (rcField.typeOfValue !== 'number') {
                        throw new Error(sizeFieldId + " can't be used as a record count, it isn't numerical");
                    }
                    else if (typeof rcField.value !== 'function') {
                        throw new Error(sizeFieldId + " can't be used as a record count, it isn't unary");
                    }
                }
            }
            RowStore.prototype.fields = function () {
                return this.fieldArray;
            };
            RowStore.prototype.sizeField = function () { return this.fieldMap[this.sizeFieldId]; };
            RowStore.prototype.field = function (key) {
                return this.fieldMap.hasOwnProperty(key) ? this.fieldMap[key] : null;
            };
            RowStore.prototype.eachRow = function (rowAction) {
                for (var i = 0; i < this.rowData.length; i++) {
                    var rawRow = this.rowData[i];
                    var row = (this.rowTransformer === null) ? rawRow : this.rowTransformer.onItem(rawRow);
                    if (row !== null) {
                        rowAction(row);
                    }
                }
                if (this.rowTransformer) {
                    this.rowTransformer.onEnd();
                }
            };
            /** Replace an existing field with this one.  If the old field isn't found, the new one is added at the end. */
            RowStore.prototype.withField = function (newField) {
                var newFieldArray = this.fieldArray.concat();
                for (var i = 0; i < newFieldArray.length; i++) {
                    if (newFieldArray[i].identifier === newField.identifier) {
                        newFieldArray[i] = newField;
                        return new RowStore(newFieldArray, this.rowData, this.rowTransformer, this.sizeFieldId);
                    }
                }
                newFieldArray.concat(newField);
                return new RowStore(newFieldArray, this.rowData, this.rowTransformer, this.sizeFieldId);
            };
            /** Primarily for unit testing; returns the rows in RowStore-native format. */
            RowStore.prototype.toArray = function () {
                var _this = this;
                var result = [];
                this.eachRow(function (oldRow) {
                    var newRow = {};
                    _this.fields().forEach(function (field) {
                        newRow[field.identifier] = (field instanceof UnaryJsonRowField)
                            ? field.value(oldRow)
                            : field.values(oldRow);
                    });
                    result.push(newRow);
                });
                return result;
            };
            return RowStore;
        })();
        rowStore.RowStore = RowStore;
        /** The default non-unary Field type for RowStores. */
        var JsonRowField = (function () {
            /** Private constructor:  please use factory methods. */
            function JsonRowField(identifier, displayName, typeOfValue, typeConstructor, rangeVal, distinctValueEstimateVal, aggregationRuleMustNotBeUsed) {
                if (typeConstructor === void 0) { typeConstructor = null; }
                if (rangeVal === void 0) { rangeVal = null; }
                if (distinctValueEstimateVal === void 0) { distinctValueEstimateVal = Number.POSITIVE_INFINITY; }
                if (aggregationRuleMustNotBeUsed === void 0) { aggregationRuleMustNotBeUsed = null; }
                this.identifier = identifier;
                this.displayName = displayName;
                this.typeOfValue = typeOfValue;
                this.typeConstructor = typeConstructor;
                this.rangeVal = rangeVal;
                this.distinctValueEstimateVal = distinctValueEstimateVal;
            }
            JsonRowField.prototype.range = function () {
                return this.rangeVal;
            };
            JsonRowField.prototype.distinctValueEstimate = function () {
                return this.distinctValueEstimateVal;
            };
            JsonRowField.prototype.canHold = function (otherField) {
                if (this.typeOfValue === otherField.typeOfValue) {
                    if (this.typeOfValue === 'object') {
                        return this.typeConstructor === otherField.typeConstructor;
                    }
                    return true;
                }
                return false;
            };
            /**
             * Returns an array containing the values in this row.  The rowToken is the row as key/value pairs.
             * For this type of field, the format is forgiving: the entry
             * may be missing, it may be a single value, or it may be an array of values.
             */
            JsonRowField.prototype.values = function (rowToken) {
                if (!rowToken.hasOwnProperty(this.identifier)) {
                    return [];
                }
                var result = rowToken[this.identifier];
                if (result == null) {
                    return [];
                }
                return (Array.isArray(result)) ? result.concat() : [result];
            };
            return JsonRowField;
        })();
        rowStore.JsonRowField = JsonRowField;
        var UnaryJsonRowField = (function () {
            function UnaryJsonRowField(identifier, displayName, typeOfValue, typeConstructor, rangeVal, distinctValueEstimateVal, aggregationRule) {
                if (typeConstructor === void 0) { typeConstructor = null; }
                if (rangeVal === void 0) { rangeVal = null; }
                if (distinctValueEstimateVal === void 0) { distinctValueEstimateVal = Number.POSITIVE_INFINITY; }
                if (aggregationRule === void 0) { aggregationRule = null; }
                this.identifier = identifier;
                this.displayName = displayName;
                this.typeOfValue = typeOfValue;
                this.typeConstructor = typeConstructor;
                this.rangeVal = rangeVal;
                this.distinctValueEstimateVal = distinctValueEstimateVal;
                this.aggregationRule = aggregationRule;
            }
            UnaryJsonRowField.prototype.range = function () {
                return this.rangeVal;
            };
            UnaryJsonRowField.prototype.distinctValueEstimate = function () {
                return this.distinctValueEstimateVal;
            };
            UnaryJsonRowField.prototype.canHold = function (otherField) {
                if (this.typeOfValue === otherField.typeOfValue) {
                    if (this.typeOfValue === 'object') {
                        return this.typeConstructor === otherField.typeConstructor;
                    }
                    return true;
                }
                return false;
            };
            UnaryJsonRowField.prototype.values = function (rowToken) {
                var v = this.value(rowToken);
                return (v == null) ? [] : [v];
            };
            /** The rowToken is the row as key/value pairs.  Returns null if the column ID is missing. */
            UnaryJsonRowField.prototype.value = function (rowToken) {
                return (rowToken.hasOwnProperty(this.identifier)) ? rowToken[this.identifier] : null;
            };
            return UnaryJsonRowField;
        })();
        rowStore.UnaryJsonRowField = UnaryJsonRowField;
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
                    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
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
    })(rowStore = ozone.rowStore || (ozone.rowStore = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />
/**
 * Convert ColumnStores, IntSets, etc. to JSON-compatible data objects.
 */
var ozone;
(function (ozone) {
    var serialization;
    (function (serialization) {
        /**
         * Convenience function for reading a string containing CSV.  This simply calls rowStore.buildFromCsv() and sends
         * the result to columnStore.buildFromStore().
         */
        function buildFromCsv(csvText, metaData) {
            if (metaData === void 0) { metaData = {}; }
            return ozone.columnStore.buildFromStore(ozone.rowStore.buildFromCsv(csvText), metaData);
        }
        serialization.buildFromCsv = buildFromCsv;
        /** Read Ozone's native JSON format. */
        function readStore(storeData) {
            var fields = [];
            for (var i = 0; i < storeData.fields.length; i++) {
                fields[i] = readField(storeData.fields[i]);
            }
            var sizeFieldId = storeData.sizeFieldId ? storeData.sizeFieldId : null;
            return new ozone.columnStore.ColumnStore(storeData.rowCount, fields, sizeFieldId);
        }
        serialization.readStore = readStore;
        function writeStore(store) {
            var fieldData = [];
            var fields = store.fields();
            for (var i = 0; i < fields.length; i++) {
                fieldData.push(writeField(fields[i]));
            }
            var result = {
                rowCount: store.size(),
                fields: fieldData
            };
            if (store.sizeField()) {
                result['sizeFieldId'] = store.sizeField().identifier;
            }
            return result;
        }
        serialization.writeStore = writeStore;
        function readField(fieldData) {
            var type = parseType(fieldData.type);
            if (type.subTypes.length > 0) {
                throw new Error("Don't support subtypes for " + fieldData.type);
            }
            switch (type.mainType) {
                case "indexed": return readIndexedField(fieldData);
                case "unindexed": return readUnIndexedField(fieldData);
                default: throw new Error("Unknown field type: " + fieldData.type);
            }
        }
        serialization.readField = readField;
        function readIndexedField(data) {
            var descriptor = ozone.FieldDescriptor.build(data);
            var valueList = [];
            var valueMap = {};
            for (var i = 0; i < data.values.length; i++) {
                var valueData = data.values[i];
                valueList.push(valueData.value);
                valueMap[valueData.value.toString()] = readIntSet(valueData.data);
            }
            return new ozone.columnStore.IndexedField(descriptor, valueList, valueMap);
        }
        function readUnIndexedField(data) {
            var descriptor = ozone.FieldDescriptor.build(data);
            return new ozone.columnStore.UnIndexedField(descriptor, data.dataArray, data.offset);
        }
        function writeField(f) {
            if (f instanceof ozone.columnStore.IndexedField)
                return writeIndexedField(f);
            if (f instanceof ozone.columnStore.UnIndexedField)
                return writeUnIndexedField(f);
            throw new Error("Don't know how to write " + f.identifier);
        }
        serialization.writeField = writeField;
        function writeIndexedField(field) {
            var result = writeIndexMetaData(field, "indexed");
            var values = [];
            var fieldValues = field.allValues();
            for (var i = 0; i < fieldValues.length; i++) {
                var key = fieldValues[i];
                values[i] = {
                    value: key,
                    data: writeIntSet(field.intSetForValue(key.toString()))
                };
            }
            result['values'] = values;
            return result;
        }
        function writeUnIndexedField(field) {
            var result = writeIndexMetaData(field, "unindexed");
            result['offset'] = field.firstRowToken();
            result['dataArray'] = field.dataArray();
            return result;
        }
        function writeIndexMetaData(f, type) {
            var result = {
                type: type,
                identifier: f.identifier,
                displayName: f.displayName,
                typeOfValue: f.typeOfValue,
                distinctValueEstimate: f.distinctValueEstimate()
            };
            if (f.displayName === null) {
                result.displayName = f.identifier;
            }
            if (f.typeConstructor !== null) {
                result['typeConstructorName'] = f.typeConstructor.toString();
            }
            if (f.aggregationRule) {
                result['aggregationRule'] = f.aggregationRule;
            }
            var range = f.range();
            if (range !== null) {
                result['range'] = range;
            }
            return result;
        }
        function readIntSet(jsonData) {
            //
            // Types generally mirror the IntSet implementations, but there is no requirement that they serialize
            // one-to-one.
            //
            if (jsonData.hasOwnProperty("type")) {
                var type = parseType(jsonData.type);
                if (type.subTypes.length > 0 && type.mainType !== 'arle') {
                    throw new Error("Unknown subtypes: " + type.subTypes);
                }
                switch (type.mainType) {
                    case "array": return ozone.intSet.ArrayIndexIntSet.fromArray(jsonData.data); // No longer written
                    case "arle": return readIntSetArleData(type, jsonData);
                    case "empty": return ozone.intSet.empty;
                    case "range": return ozone.intSet.RangeIntSet.fromTo(jsonData.min, jsonData.max);
                    default: throw new Error("Unknown IntSet type: " + jsonData.type);
                }
            }
            throw new Error("IntSet type not specified");
        }
        serialization.readIntSet = readIntSet;
        function writeIntSet(toWrite) {
            if (toWrite.size() === 0)
                return { type: "empty" };
            if (toWrite instanceof ozone.intSet.RangeIntSet)
                return writeRangeIntSet(toWrite);
            return writeIntSetArleData(toWrite);
        }
        serialization.writeIntSet = writeIntSet;
        function writeRangeIntSet(rangeIntSet) {
            return {
                type: "range",
                min: rangeIntSet.min(),
                max: rangeIntSet.max()
            };
        }
        function readIntSetArleData(parsedType, jsonData) {
            var base = Number(parsedType.subTypes[0]);
            var arle = new ozone.intSet.ArleIntSet(base, jsonData.data);
            return ozone.intSet.mostEfficientIntSet(arle);
        }
        function writeIntSetArleData(toWrite) {
            var base = 36;
            var builder = ozone.intSet.ArleIntSet.builderWithBase(base);
            toWrite.each(builder.onItem);
            var arle = builder.onEnd();
            return {
                type: "arle/" + arle.base,
                data: arle.data
            };
        }
        function parseType(typeString) {
            var hintSplit = typeString.split(";");
            var nonHint = hintSplit[0];
            var hints = hintSplit.slice(1);
            var types = nonHint.split("/");
            var mainType = types[0];
            return new ParsedType(mainType, types.splice(1), hints);
        }
        serialization.parseType = parseType;
        var ParsedType = (function () {
            function ParsedType(mainType, subTypes, hints) {
                this.mainType = mainType;
                this.subTypes = subTypes;
                this.hints = hints;
            }
            ParsedType.prototype.next = function () {
                if (this.subTypes.length === 0) {
                    return null;
                }
                return new ParsedType(this.subTypes[0], this.subTypes.slice(1), this.hints);
            };
            return ParsedType;
        })();
        serialization.ParsedType = ParsedType;
    })(serialization = ozone.serialization || (ozone.serialization = {}));
})(ozone || (ozone = {}));
/**
 * Copyright 2015 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path="../_all.ts" />
/**
 * Data transformers:  modify a DataStore and produce a new DataStore that is independent of its source.
 * Transformers generally produce RowStores, and may produce a UnaryField when the original allowed multiple values.
 */
var ozone;
(function (ozone) {
    var transform;
    (function (transform) {
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
        function sort(dataStoreIn, sortColumns) {
            var sortFunctions = sortColumns.map(function (column) {
                var field = (typeof column === 'string') ? column : column.field;
                return { field: field, compare: compareFunction(dataStoreIn, column) };
            });
            var sortFunc = compareBySortOptionsFunction(dataStoreIn, sortFunctions);
            return ozone.rowStore.buildFromStore(dataStoreIn, { sortCompareFunction: sortFunc });
        }
        transform.sort = sort;
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
        function aggregate(dataStoreIn, options) {
            if (options === void 0) { options = {}; }
            var sizeFieldId = (options.sizeField) ? options.sizeField : "Records";
            var sortedStore = sortForAggregation(dataStoreIn, sizeFieldId, options);
            var oldStoreSizeColumn = sortedStore.field(sizeFieldId);
            var rows = [];
            var minSize = Number.POSITIVE_INFINITY;
            var maxSize = 0;
            function addRow(row) {
                var size = row[sizeFieldId];
                if (size < minSize) {
                    minSize = size;
                }
                if (size > maxSize) {
                    maxSize = size;
                }
                rows.push(row);
            }
            var fieldsToCopy = selectFieldsToCopy(sortedStore, sizeFieldId, options);
            var fieldsToCompare = [];
            var fieldsToSum = [];
            for (var i = 0; i < fieldsToCopy.length; i++) {
                var field = fieldsToCopy[i];
                if (field.aggregationRule) {
                    if (field.aggregationRule !== 'sum') {
                        throw new Error("Unknown aggregation rule: " + field.aggregationRule + " for " + field.identifier);
                    }
                    fieldsToSum.push(field);
                }
                else {
                    fieldsToCompare.push(field);
                }
            }
            var previousRowData = null;
            sortedStore.eachRow(function (row) {
                var countInRow = (oldStoreSizeColumn) ? oldStoreSizeColumn.value(row) : 1;
                var rowIsSame = (previousRowData === null) ? false : rowMatchesData(row, previousRowData, fieldsToCompare);
                if (rowIsSame) {
                    fieldsToSum.forEach(function (field) {
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
            var newFields = fieldsToCopy.map(function (oldField) {
                var fProto = (oldField instanceof ozone.rowStore.UnaryJsonRowField)
                    ? ozone.rowStore.UnaryJsonRowField
                    : ozone.rowStore.JsonRowField;
                return new fProto(oldField.identifier, oldField.displayName, oldField.typeOfValue, oldField.typeConstructor, oldField.range(), oldField.distinctValueEstimate(), oldField.aggregationRule);
            });
            if (oldStoreSizeColumn) {
                newFields.push(new ozone.rowStore.UnaryJsonRowField(oldStoreSizeColumn.identifier, oldStoreSizeColumn.displayName, 'number', null, new ozone.Range(minSize, maxSize, true), Number.POSITIVE_INFINITY, 'sum'));
            }
            else {
                newFields.push(new ozone.rowStore.UnaryJsonRowField(sizeFieldId, sizeFieldId, 'number', null, new ozone.Range(minSize, maxSize, true), Number.POSITIVE_INFINITY, 'sum'));
            }
            return new ozone.rowStore.RowStore(newFields, rows, null, sizeFieldId);
        }
        transform.aggregate = aggregate;
        function sortForAggregation(dataStoreIn, sizeFieldId, options) {
            if (options === void 0) { options = {}; }
            if (options.sortFields && options.sortFields === false) {
                if (!(dataStoreIn instanceof ozone.rowStore.RowStore)) {
                    throw new Error("Can only aggregate a sorted RowStore");
                }
                return dataStoreIn;
            }
            else {
                var sortFields = (options.sortFields) ? options.sortFields : [];
                var sortOptions = [];
                var usedColumns = {};
                sortFields.forEach(function (item) {
                    var name = (typeof (item) === 'string') ? item : item.field;
                    if (name !== sizeFieldId) {
                        sortOptions.push({ field: name, compare: compareFunction(dataStoreIn, item) });
                        usedColumns[name] = true;
                    }
                });
                dataStoreIn.fields().forEach(function (field) {
                    if (field.identifier !== sizeFieldId && !usedColumns[field.identifier] && !field.aggregationRule) {
                        sortOptions.push({ field: field.identifier, compare: compareFunction(dataStoreIn, field.identifier) });
                    }
                });
                return sort(dataStoreIn, sortOptions);
            }
        }
        function selectFieldsToCopy(store, sizeFieldId, options) {
            var fieldsToCopy = [];
            if (options.includeFields) {
                options.includeFields.forEach(function (fId) {
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
                store.fields().forEach(function (f) {
                    if (f.identifier !== sizeFieldId) {
                        fieldsToCopy.push(f);
                    }
                });
            }
            return fieldsToCopy;
        }
        function rowMatchesData(rowToken, rowData, fieldsToCompare) {
            for (var i = 0; i < fieldsToCompare.length; i++) {
                var field = fieldsToCompare[i];
                var fromToken = field.values(rowToken);
                var fromData = [];
                if (rowData.hasOwnProperty(field.identifier)) {
                    var v = rowData[field.identifier];
                    if (v !== null) {
                        fromData = (Array.isArray(v)) ? v : [v];
                    }
                }
                if (fromToken.length !== fromData.length) {
                    return false;
                }
                for (var j = 0; j < fromToken.length; j++) {
                    if (fromToken[j] !== fromData[j]) {
                        return false;
                    }
                }
            }
            return true;
        }
        function copyRow(row, fieldsToCopy) {
            var result = {};
            fieldsToCopy.forEach(function (field) {
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
        function compareBySortOptionsFunction(dataStore, sortOptions) {
            var fields = sortOptions.map(function (o) { return dataStore.field(o.field); });
            return function (rowA, rowB) {
                for (var i = 0; i < sortOptions.length; i++) {
                    var option = sortOptions[i];
                    var field = fields[i];
                    var valuesA = field.values(rowA);
                    var valuesB = field.values(rowB);
                    var commonValuesLength = Math.min(valuesA.length, valuesB.length);
                    for (var j = 0; j < commonValuesLength; j++) {
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
        function compareFunction(dataStoreIn, sortColumn) {
            if (typeof (sortColumn) === 'string') {
                var field = dataStoreIn.field(sortColumn);
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
                return sortColumn.compare;
            }
        }
        function stringCompareFunction() {
            if (Intl && Intl.Collator) {
                return new Intl.Collator().compare;
            }
            return function (a, b) { return a.localeCompare(b); };
        }
        /** For edge cases, just avoid equality, especially if we accidentally get the same thing twice. */
        var genericCompare = function (a, b) {
            return (typeof (a) + a).localeCompare(typeof (b) + b);
        };
        var numberCompare = function (a, b) {
            if (a < b)
                return -1;
            if (a > b)
                return 1;
            return 0;
        };
    })(transform = ozone.transform || (ozone.transform = {}));
})(ozone || (ozone = {}));
/// <reference path='interfaces.ts' />
/// <reference path='util.ts' />
/// <reference path='Field.ts' />
/// <reference path='Filter.ts' />
/// <reference path='StoreProxy.ts' />
/// <reference path='columnStore/functions.ts' />
/// <reference path='columnStore/UnIndexedField.ts' />
/// <reference path='columnStore/ColumnStore.ts' />
/// <reference path='columnStore/FilteredColumnStore.ts' />
/// <reference path='columnStore/IndexedField.ts' />
/// <reference path='intSet/bits.ts' />
/// <reference path='intSet/functions.ts' />
/// <reference path='intSet/AbstractIntSet.ts' />
/// <reference path='intSet/ArleIntSet.ts' />
/// <reference path='intSet/ArrayIndexIntSet.ts' />
/// <reference path='intSet/BitmapArrayIntSet.ts' />
/// <reference path='intSet/RangeIntSet.ts' />
/// <reference path='intSet/SimpleOrderedIterator.ts' />
/// <reference path='rowStore/functions.ts' />
/// <reference path='rowStore/CsvReader.ts' />
/// <reference path='rowStore/RowStore.ts' />
/// <reference path='serialization/jsonInterfaces.ts' />
/// <reference path='serialization/functions.ts' />
/// <reference path='transform/transform.ts' />
/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />
var ozone;
(function (ozone) {
    var FieldDescriptor = (function () {
        function FieldDescriptor(identifier, typeOfValue, typeConstructor, multipleValuesPerRow, displayName, precomputedRange, distinctValues, shouldCalculateDistinctValues, aggregationRule) {
            this.identifier = identifier;
            this.typeOfValue = typeOfValue;
            this.typeConstructor = typeConstructor;
            this.multipleValuesPerRow = multipleValuesPerRow;
            this.displayName = displayName;
            this.precomputedRange = precomputedRange;
            this.distinctValues = distinctValues;
            this.shouldCalculateDistinctValues = shouldCalculateDistinctValues;
            this.aggregationRule = aggregationRule;
        }
        /**
         * Factory method for building from AJAX.  The AJAX must contain typeOfValue.  If an identifier is not provided
         * separately, that must also be provided. Additionally it may provide displayName, precomputedRange,
         * distinctValues, and multipleValuesPerRow.  If "unlimitedValues" is true,
         * shouldCalculateDistinctValues will be false and distinctValues will be Number.POSITIVE_INFINITY.
         *
         * The default for multipleValuesPerRow is false.
         */
        FieldDescriptor.build = function (ajax, identifier) {
            if (identifier === void 0) { identifier = null; }
            var id = (identifier === null) ? ajax["identifier"] : identifier;
            var displayName = ajax["displayName"] ? ajax["displayName"] : id;
            var precomputedRange = ajax["range"] ? ozone.Range.build(ajax["range"]) : null;
            var shouldCalculateDistinctValues = ((!ajax["unlimitedValues"]) && typeof (ajax["distinctValues"]) !== "number");
            var distinctValues = (shouldCalculateDistinctValues || ajax["unlimitedValues"])
                ? Number.POSITIVE_INFINITY
                : ajax["distinctValues"];
            var allowsMultipleValues = (ajax.multipleValuesPerRow) ? true : false;
            var aggregationRule = ajax.aggregationRule ? ajax.aggregationRule : null;
            return new FieldDescriptor(id, ajax["typeOfValue"], null, allowsMultipleValues, displayName, precomputedRange, distinctValues, shouldCalculateDistinctValues, aggregationRule);
        };
        FieldDescriptor.prototype.range = function () {
            return this.precomputedRange;
        };
        FieldDescriptor.prototype.distinctValueEstimate = function () {
            return this.distinctValues;
        };
        return FieldDescriptor;
    })();
    ozone.FieldDescriptor = FieldDescriptor;
})(ozone || (ozone = {}));
//# sourceMappingURL=ozone.js.map
if (typeof(module) !== "undefined") { module.exports = ozone;}
