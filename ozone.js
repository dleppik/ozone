/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='_all.ts' />
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='_all.ts' />
/**
*  Contains tiny classes that are too small to merit their own file.
*/
var ozone;
(function (ozone) {
    /**
    * Minimum, maximum, and whether every number is an integer.  For our purposes, an integer is defined according to
    * Mozilla's Number.isInteger polyfill and ECMA Harmony specification, namely:
    *
    * typeof nVal === "number" && isFinite(nVal) && nVal > -9007199254740992 && nVal < 9007199254740992 && Math.floor(nVal) === nVal;
    *
    * ( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger )
    *
    */
    var Range = (function () {
        function Range(min, max, integerOnly) {
            this.min = min;
            this.max = max;
            this.integerOnly = integerOnly;
        }
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
})(ozone || (ozone = {}));
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='_all.ts' />
var ozone;
(function (ozone) {
    var ValueFilter = (function () {
        function ValueFilter(fieldDescriptor, value, displayName) {
            if (typeof displayName === "undefined") { displayName = null; }
            this.fieldDescriptor = fieldDescriptor;
            this.value = value;
            this.displayName = displayName;
            if (displayName === null) {
                this.displayName = value + " (" + fieldDescriptor.displayName + ")";
            }
        }
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
            return vf.value.toString() === this.value.toString();
        };
        return ValueFilter;
    })();
    ozone.ValueFilter = ValueFilter;
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
        StoreProxy.prototype.fields = function () {
            return this.source.fields();
        };

        StoreProxy.prototype.field = function (key) {
            return this.source.field(key);
        };

        StoreProxy.prototype.eachRow = function (rowAction) {
            this.source.eachRow(rowAction);
        };
        return StoreProxy;
    })();
    ozone.StoreProxy = StoreProxy;
})(ozone || (ozone = {}));
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
    */
    /// <reference path='../_all.ts' />
    (function (columnStore) {
        /**
        * This is the recommended way to generate a ColumnStore unless you wish to override the default heuristics for
        * choosing field implementations.
        */
        function buildFromStore(source) {
            var builders = {};
            var sourceFields = source.fields();
            for (var i = 0; i < sourceFields.length; i++) {
                var sourceField = sourceFields[i];
                var sourceFieldIsUnary = typeof (sourceField["value"]) === "function";

                var newBuilder;
                if (sourceFieldIsUnary && sourceField.distinctValueEstimate() > 500) {
                    newBuilder = columnStore.ArrayField.builder(sourceField);
                } else {
                    newBuilder = columnStore.IntSetField.builder(sourceField);
                }
                builders[sourceField.identifier] = newBuilder;
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
            return new columnStore.ColumnStore(length, resultFields);
        }
        columnStore.buildFromStore = buildFromStore;
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
    */
    /// <reference path='../_all.ts' />
    (function (columnStore) {
        /**
        * Stores the entire column in a single dense array.
        */
        var ArrayField = (function () {
            function ArrayField(descriptor, array, offset, nullProxy) {
                if (typeof offset === "undefined") { offset = 0; }
                if (typeof nullProxy === "undefined") { nullProxy = null; }
                this.array = array;
                this.offset = offset;
                this.nullProxy = nullProxy;
                this.identifier = descriptor.identifier;
                this.displayName = descriptor.displayName;
                this.typeOfValue = descriptor.typeOfValue;
                this.typeConstructor = descriptor.typeConstructor;
                this.valueEstimate = descriptor.distinctValueEstimate();
                this.rangeValue = descriptor.range();

                if (array.length > 0 && (array[0] === nullProxy || array[array.length - 1] === nullProxy)) {
                    throw new Error("Array must be trimmed");
                }
            }
            ArrayField.builder = /**
            * Returns a reducer that can be run on a source DataStore to reproduce a sourceField.
            *
            * @param sourceField  the field which will be replicated
            * @param params       additional parameters:
            *                     nullValues   -- if provided, this is a list of values equivalent to null.
            *                     nullProxy    -- if provided, this is used instead of null for storing null values.  This
            *                                     may allow the JavaScript implementation to use an array of primitives.
            *                                     (Haven't yet checked to see if any JS implementations actually do this.)
            */
            function (sourceField, params) {
                if (typeof params === "undefined") { params = {}; }
                var array = [];
                var offset = 0;
                var nullValues = (typeof (params["nullValues"]) === "object") ? params["nullValues"] : [];
                var nullProxy = (typeof (params["nullProxy"]) === "undefined") ? params["nullProxy"] : [];
                var nullMap = {};
                for (var i = 0; i < nullValues.length; i++) {
                    var nv = nullValues[i];
                    nullMap["" + nv] = nv;
                }

                return {
                    onItem: function (indexedRowToken) {
                        var value = sourceField.value(indexedRowToken.rowToken);
                        if (nullValues.length > 0 && nullMap["" + value] === value) {
                            value = nullProxy;
                        }

                        if (array.length === 0) {
                            if (value !== null) {
                                array[0] = value;
                                offset = indexedRowToken.index;
                            }
                        } else {
                            var newIndex = indexedRowToken.index - offset;
                            while (array.length < newIndex) {
                                array.push(nullProxy);
                            }
                            array[newIndex] = value;
                        }
                    },
                    onEnd: function () {
                        return new ArrayField(sourceField, array, offset, nullProxy);
                    }
                };
            };

            ArrayField.prototype.value = function (rowToken) {
                var index = (rowToken) - this.offset;
                var result = this.array[index];
                return (typeof (result) === null || result === this.nullProxy) ? null : result;
            };

            ArrayField.prototype.values = function (rowToken) {
                var result = this.value(rowToken);
                return (result === null) ? [] : [result];
            };

            ArrayField.prototype.range = function () {
                return this.rangeValue;
            };

            ArrayField.prototype.distinctValueEstimate = function () {
                return this.valueEstimate;
            };

            ArrayField.prototype.rowHasValue = function (index, value) {
                return this.array[index] === value;
            };
            return ArrayField;
        })();
        columnStore.ArrayField = ArrayField;
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
    */
    /// <reference path='../_all.ts' />
    (function (columnStore) {
        var ColumnStore = (function () {
            function ColumnStore(length, fieldArray) {
                this.length = length;
                this.fieldArray = fieldArray;
                this.fieldMap = {};
                for (var i = 0; i < fieldArray.length; i++) {
                    var field = fieldArray[i];
                    this.fieldMap[field.identifier] = field;
                }
            }
            ColumnStore.prototype.intSet = function () {
                return new ozone.intSet.RangeIntSet(0, this.length);
            };

            ColumnStore.prototype.fields = function () {
                return this.fieldArray;
            };

            ColumnStore.prototype.field = function (key) {
                return this.fieldMap[key];
            };

            ColumnStore.prototype.filter = function (filter) {
                return columnStore.filterColumnStore(this, this, filter);
            };

            ColumnStore.prototype.filters = function () {
                return [];
            };
            ColumnStore.prototype.simplifiedFilters = function () {
                return [];
            };

            ColumnStore.prototype.removeFilter = function (filter) {
                return this;
            };

            ColumnStore.prototype.eachRow = function (rowAction) {
                for (var i = 0; i < this.length; i++) {
                    rowAction(i);
                }
            };
            return ColumnStore;
        })();
        columnStore.ColumnStore = ColumnStore;
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
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
    /// <reference path='../_all.ts' />
    (function (columnStore) {
        function filterColumnStore(source, oldStore) {
            var filtersToAdd = [];
            for (var _i = 0; _i < (arguments.length - 2); _i++) {
                filtersToAdd[_i] = arguments[_i + 2];
            }
            if (filtersToAdd.length === 0) {
                return oldStore;
            }

            var oldFilters = oldStore.filters();
            var filtersForIteration = [];
            var filtersForBitwiseOr = [];
            deduplicate:
            for (var i = 0; i < filtersToAdd.length; i++) {
                var newFilter = filtersToAdd[i];
                for (var j = 0; j < oldFilters.length; j++) {
                    var oldFilter = oldFilters[j];
                    if (oldFilter.equals(newFilter)) {
                        continue deduplicate;
                    }
                }
                var filterTarget = filtersForIteration;
                if (newFilter instanceof ozone.ValueFilter) {
                    var fieldId = (newFilter).fieldDescriptor.identifier;
                    if (source.field(fieldId) instanceof columnStore.IntSetField) {
                        filterTarget = filtersForBitwiseOr;
                    }
                }
                filterTarget.push(newFilter);
            }
            if (filtersForIteration.length + filtersForBitwiseOr.length === 0) {
                return oldStore;
            }

            // IntSet filtering
            var set = oldStore.intSet();

            for (var i = 0; i < filtersForBitwiseOr.length; i++) {
                var filter = newFilter;
                var fieldId = filter.fieldDescriptor.identifier;
                var field = source.field(fieldId);
                var fieldIntSet = field.intSetForValue(filter.value);
                // TODO
                // TODO  merge IntSets
                // TODO
            }

            // TODO
            // TODO  Use the IntSets generated above
            // TODO
            // Iterative filtering
            var setBuilder = ozone.intSet.ArrayIndexIntSet.builder(set.min(), set.max());

            // TODO
            // TODO Use an iterator, so we can skip
            // TODO
            oldStore.eachRow(function (rowToken) {
                for (var i = 0; i < filtersForIteration.length; i++) {
                    var filter = filtersForIteration[i];
                    if (!filter.matches(oldStore, rowToken)) {
                        return;
                    }
                    setBuilder.onItem(rowToken);
                }
            });
            set = setBuilder.onEnd();

            var newFilters = oldStore.filters().concat(filtersForIteration);
            newFilters.sort(compareFilterByName);
            return new FilteredColumnStore(source, newFilters, set);
        }
        columnStore.filterColumnStore = filterColumnStore;

        function compareFilterByName(a, b) {
            if (a.displayName < b.displayName)
                return -1;
            if (a.displayName > b.displayName)
                return 1;
            return 0;
        }

        var FilteredColumnStore = (function (_super) {
            __extends(FilteredColumnStore, _super);
            function FilteredColumnStore(source, filterArray, filterBits) {
                _super.call(this, source);
                this.source = source;
                this.filterArray = filterArray;
                this.filterBits = filterBits;
                this.length = filterBits.size;
            }
            FilteredColumnStore.prototype.intSet = function () {
                return this.filterBits;
            };

            FilteredColumnStore.prototype.eachRow = function (rowAction) {
                this.filterBits.each(rowAction);
            };

            FilteredColumnStore.prototype.filter = function (filter) {
                return filterColumnStore(this.source, this, filter);
            };

            FilteredColumnStore.prototype.filters = function () {
                return this.filterArray;
            };

            FilteredColumnStore.prototype.simplifiedFilters = function () {
                return this.filterArray;
            };

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
            return FilteredColumnStore;
        })(ozone.StoreProxy);
        columnStore.FilteredColumnStore = FilteredColumnStore;
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
    */
    /// <reference path='../_all.ts' />
    (function (columnStore) {
        /**
        * A Field which consists of intSets for each Value.  Although values need not be strings, they are identified
        * internally by their toString method.  It is legal for values to have empty intSets;  for example, a Month
        * field might contain all the months of the year in order, even if only a few have any values, to guarantee that
        * the UI looks right.
        */
        var IntSetField = (function () {
            function IntSetField(descriptor, valueList, valueMap) {
                this.valueList = valueList;
                this.valueMap = valueMap;
                this.identifier = descriptor.identifier;
                this.displayName = descriptor.displayName;
                this.typeOfValue = descriptor.typeOfValue;
                this.typeConstructor = descriptor.typeConstructor;
                this.rangeVal = descriptor.range();
            }
            IntSetField.builder = /**
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
            function (sourceField, params) {
                if (typeof params === "undefined") { params = {}; }
                var addValues = !params.values;
                var valueList = (addValues) ? [] : params.values.concat();

                var intSetSource = (params.intSetSource) ? params.intSetSource : ozone.intSet.ArrayIndexIntSet;
                var intSetBuilders = {};
                for (var i = 0; i < valueList.length; i++) {
                    var value = valueList[i];
                    intSetBuilders[value.toString()] = intSetSource.builder();
                }

                return {
                    onItem: function (indexedRowToken) {
                        var values = sourceField.values(indexedRowToken.rowToken);
                        for (var i = 0; i < values.length; i++) {
                            var value = values[i];
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
                            if (typeof firstValue === "object") {
                                if (firstValue["prototype"] === Date.prototype) {
                                    valueList.sort(function (a, b) {
                                        return a.getTime() - b.getTime();
                                    });
                                }
                            } else {
                                valueList.sort();
                            }
                        }
                        for (var i = 0; i < valueList.length; i++) {
                            var value = valueList[i];
                            valueMap[value.toString()] = intSetBuilders[value].onEnd();
                        }
                        return new IntSetField(sourceField, valueList, valueMap);
                    }
                };
            };

            IntSetField.prototype.allValues = function () {
                return this.valueList.concat();
            };

            IntSetField.prototype.values = function (rowToken) {
                var index = rowToken;
                var result = [];

                for (var i = 0; i < this.valueList.length; i++) {
                    var value = this.valueList[i];
                    var intSet = this.valueMap[value.toString()];
                    if (intSet.get(index)) {
                        result.push(value);
                    }
                }
                return result;
            };

            IntSetField.prototype.range = function () {
                return this.rangeVal;
            };

            /** Equivalent to allValues().length. */
            IntSetField.prototype.distinctValueEstimate = function () {
                return this.valueList.length;
            };

            IntSetField.prototype.rowHasValue = function (index, value) {
                var intSet = this.valueMap[value.toString()];
                if (intSet) {
                    return intSet.get(index);
                }
                return false;
            };

            /** Return the intSet matching value.toString(), or an empty intSet if the value is not found. */
            IntSetField.prototype.intSetForValue = function (value) {
                var set = this.valueMap[value.toString()];
                return (set) ? set : ozone.intSet.empty;
            };
            return IntSetField;
        })();
        columnStore.IntSetField = IntSetField;
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc.  Distributed under the Apache License 2.0.
    */
    /// <reference path='../_all.ts' />
    (function (intSet) {
        intSet.empty;

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
                } else if (currentElement > searchElement) {
                    maxIndex = currentIndex - 1;
                } else {
                    return currentIndex;
                }
            }
            return ~Math.max(minIndex, maxIndex);
        }
        intSet.search = search;

        /**
        * Return a IntSet builder.  If min and max are provided, a builder optimized for that size may be returned.
        */
        function builder(min, max) {
            if (typeof min === "undefined") { min = 0; }
            if (typeof max === "undefined") { max = -1; }
            return intSet.ArrayIndexIntSet.builder();
        }
        intSet.builder = builder;

        /** Return a IntSet containing all the numbers provided by the iterators. */
        function unionOfIterators() {
            var iterators = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                iterators[_i] = arguments[_i + 0];
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

            values.sort(function (a, b) {
                return a - b;
            });

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

        /** Return a IntSet containing only the numbers provided by all of the iterators. */
        function intersectionOfOrderedIterators() {
            var iterators = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                iterators[_i] = arguments[_i + 0];
            }
            if (iterators.length === 0) {
                return intSet.empty;
            }
            if (iterators.length === 1) {
                return unionOfIterators(iterators[0]);
            }

            // Cycle through the iterators round-robbin style, skipping to the highest element so far.  When we have N
            // iterators in a row giving us the same value, that element goes into the builder.
            var builder = intSet.ArrayIndexIntSet.builder();
            var currentIteratorIndex = 0;
            var numIteratorsWithCurrentValue = 1;
            var previousValue = NaN;
            var it = iterators[currentIteratorIndex];

            while (it.hasNext()) {
                var currentValue = it.next();
                if (currentValue === previousValue) {
                    numIteratorsWithCurrentValue++;
                    if (numIteratorsWithCurrentValue === iterators.length) {
                        builder.onItem(currentValue);
                    }
                } else {
                    previousValue = currentValue;
                    numIteratorsWithCurrentValue = 1;
                }
                currentIteratorIndex = (currentIteratorIndex + 1) % iterators.length;
                it = iterators[currentIteratorIndex];
                it.skipTo(currentValue);
            }
            return builder.onEnd();
        }
        intSet.intersectionOfOrderedIterators = intersectionOfOrderedIterators;
    })(ozone.intSet || (ozone.intSet = {}));
    var intSet = ozone.intSet;
})(ozone || (ozone = {}));
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
    */
    /// <reference path='../_all.ts' />
    (function (intSet) {
        /**
        * The most trivial of general-purpose IntSet implementations;  a sorted array of indexes.  This can work well for
        * sparse data.
        * We don't use a boolean[], because while in practice it should iterate in construction order or index
        * order, we don't want to rely on JS runtime implementation details.
        */
        var ArrayIndexIntSet = (function () {
            /** Always use builder() to construct. */
            function ArrayIndexIntSet(indexes) {
                this.indexes = indexes;
                this.size = indexes.length;
            }
            ArrayIndexIntSet.builder = /** Matches the API of other IntSet builders. */
            function (min, max) {
                if (typeof min === "undefined") { min = 0; }
                if (typeof max === "undefined") { max = -1; }
                var array = [];
                return ({
                    onItem: function (item) {
                        array.push(item);
                    },
                    onEnd: function () {
                        return new ArrayIndexIntSet(array);
                    }
                });
            };

            ArrayIndexIntSet.fromArray = function (elements) {
                return new ArrayIndexIntSet(elements.concat());
            };

            ArrayIndexIntSet.prototype.get = function (index) {
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
                if (set === this) {
                    return true;
                }
                if (set instanceof intSet.RangeIntSet) {
                    return set.equals(this);
                }
                if (this.size !== set.size || this.min() !== set.min() || this.max() !== set.max()) {
                    return false;
                }
                if (this.size === 0) {
                    return true;
                }

                var it1 = this.iterator();
                var it2 = set.iterator();

                while (it1.hasNext()) {
                    if (it1.next() != it2.next()) {
                        return false;
                    }
                }
                return true;
            };

            ArrayIndexIntSet.prototype.union = function (set) {
                if (this.size === 0) {
                    return set;
                }
                if (set.size === 0) {
                    return this;
                }
                if (set instanceof intSet.RangeIntSet && set.min() <= this.min() && set.max() >= this.max()) {
                    return set;
                }
                return intSet.unionOfIterators(this.iterator(), set.iterator());
            };

            ArrayIndexIntSet.prototype.intersection = function (set) {
                return intSet.intersectionOfOrderedIterators(this.iterator(), set.iterator());
            };
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
    })(ozone.intSet || (ozone.intSet = {}));
    var intSet = ozone.intSet;
})(ozone || (ozone = {}));
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
    */
    /// <reference path='../_all.ts' />
    (function (intSet) {
        /**
        * A trivial intSet which contains all values in a range.
        */
        var RangeIntSet = (function () {
            function RangeIntSet(minValue, size) {
                this.minValue = minValue;
                this.size = size;
                if (size === 0) {
                    this.minValue = -1;
                }
            }
            RangeIntSet.fromTo = /** Return a RangeIntSet from minValue to maxValue inclusive. */
            function (minValue, maxValue) {
                if (minValue === -1 && maxValue === -1) {
                    return ozone.intSet.empty;
                }
                var length = 1 + maxValue - minValue;
                if (length <= 0) {
                    return ozone.intSet.empty;
                }
                if (maxValue < minValue) {
                    throw new Error("Max " + maxValue + " < " + " min " + minValue);
                }
                if (minValue < 0) {
                    throw new Error("Min must be at least 0 for non-empty intSet, is " + minValue + " (to " + maxValue + ")");
                }

                return new RangeIntSet(minValue, length);
            };

            RangeIntSet.prototype.get = function (index) {
                return this.size > 0 && index >= this.minValue && index <= this.max();
            };

            RangeIntSet.prototype.min = function () {
                return this.minValue;
            };

            RangeIntSet.prototype.max = function () {
                if (this.size === 0) {
                    return -1;
                }
                return this.minValue + (this.size - 1);
            };

            RangeIntSet.prototype.each = function (action) {
                var max = this.max();
                for (var i = this.minValue; i < max; i++) {
                    action(i);
                }
            };

            RangeIntSet.prototype.iterator = function () {
                var index = this.minValue;
                var bm = this;
                var hasNext = function () {
                    return bm.size > 0 && index <= bm.max();
                };

                return {
                    hasNext: hasNext,
                    next: function () {
                        return hasNext() ? index++ : undefined;
                    },
                    skipTo: function (i) {
                        if (index < i)
                            index = i;
                    }
                };
            };

            RangeIntSet.prototype.equals = function (bm) {
                // In the case of RangeIntSets, we need only check min, max, and size
                // because size is a function of min and max.
                return this.size === bm.size && this.min() === bm.min() && this.max() === bm.max();
            };

            RangeIntSet.prototype.union = function (bm) {
                if (this.size === 0) {
                    return bm;
                }
                if (bm.size === 0) {
                    return this;
                }
                if (typeof (bm["unionWithRangeIntSet"]) === "function") {
                    return bm["unionWithRangeIntSet"](this);
                }

                var lowBm = (this.min() < bm.min()) ? this : bm;

                if (bm instanceof RangeIntSet) {
                    if (bm.min() === this.min() && bm.size === this.size) {
                        return this;
                    }
                    var highBm = (lowBm === this) ? bm : this;
                    if (lowBm.max() >= highBm.min()) {
                        return RangeIntSet.fromTo(lowBm.min(), Math.max(lowBm.max(), highBm.max()));
                    }
                }
                return ozone.intSet.unionOfIterators(highBm.iterator(), lowBm.iterator());
            };

            RangeIntSet.prototype.intersection = function (bm) {
                if (this.size === 0 || bm.size === 0) {
                    return ozone.intSet.empty;
                }
                if (typeof (bm["intersectionWithRangeIntSet"]) === "function") {
                    return bm["intersectionWithRangeIntSet"](this);
                }

                var min = Math.max(this.min(), bm.min());
                var max = Math.min(this.max(), bm.max());
                if (max < min) {
                    return ozone.intSet.empty;
                }
                if (bm instanceof RangeIntSet) {
                    return RangeIntSet.fromTo(min, max);
                }
                return ozone.intSet.intersectionOfOrderedIterators(this.iterator(), bm.iterator());
            };

            RangeIntSet.prototype.toString = function () {
                if (this.size === 0) {
                    return "empty";
                }
                return this.min() + "-" + this.max();
            };
            return RangeIntSet;
        })();
        intSet.RangeIntSet = RangeIntSet;

        intSet.empty = new RangeIntSet(-1, 0);
    })(ozone.intSet || (ozone.intSet = {}));
    var intSet = ozone.intSet;
})(ozone || (ozone = {}));
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
    */
    /// <reference path="../_all.ts" />
    (function (rowStore) {
        /** Build from a CSV file, with all resulting Fields treated as strings. */
        function buildCsv(csv) {
            var dataArray = csv.split(/(\r\n|\n|\r)/);
            var reader = new rowStore.CsvReader();
            var fieldInfo = (function () {
                reader.onItem(dataArray[0]);
                var result = {};
                for (var index in reader.columnNames) {
                    result[reader.columnNames[index]] = { typeOfValue: "string" };
                }
                reader.onEnd();
                return result;
            })();

            return build(fieldInfo, dataArray, reader);
        }
        rowStore.buildCsv = buildCsv;

        /**
        * Build a RowStore.
        * @param fieldInfo  Descriptors for each Field, converted to FieldDescriptors via FieldDescriptor.build().
        * @param data       Data, either native (JsonField) format, or converted via a rowTransformer.
        * @param rowTransformer
        */
        function build(fieldInfo, data, rowTransformer) {
            if (typeof rowTransformer === "undefined") { rowTransformer = null; }
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
                    var field = new fProto(fd.identifier, fd.displayName, fd.typeOfValue, null, fd.range(), fd.distinctValueEstimate());
                    fields.push(field);
                }
            }

            var result = new rowStore.RowStore(fields, data, rowTransformer);

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
                    var newField = new fProto(f.identifier, f.displayName, f.typeOfValue, f.typeConstructor, range, f.distinctValueEstimate());
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
                    } else {
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
        rowStore.build = build;

        function proto(field) {
            if (typeof field["value"] === "function") {
                return rowStore.UnaryJsonRowField;
            }
            return rowStore.JsonRowField;
        }
    })(ozone.rowStore || (ozone.rowStore = {}));
    var rowStore = ozone.rowStore;
})(ozone || (ozone = {}));
var ozone;
(function (ozone) {
    /**
    * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
    */
    /// <reference path='../_all.ts' />
    (function (rowStore) {
        /** Converts CSV into simple JavaScript objects for use by RowStore.  The first row must provide column names. */
        var CsvReader = (function () {
            function CsvReader(parameters) {
                if (typeof parameters === "undefined") { parameters = {}; }
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

                parseCell:
                while (pos < str.length) {
                    skipWhitespace();

                    var start = pos;

                    if (str.charAt(pos) === this.quote) {
                        cells.push(parseQuote());
                        skipWhitespace();
                        if (pos < str.length && str.charAt(pos) !== this.delimiter) {
                            throw new Error("Expected [" + this.delimiter + "], got [" + str.charAt(pos) + "] in [" + str.substring(pos) + "]");
                        }
                        pos++;
                    } else {
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
    })(ozone.rowStore || (ozone.rowStore = {}));
    var rowStore = ozone.rowStore;
})(ozone || (ozone = {}));
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
        *
        * Although the current implementation stores rows in an array, this may someday be changed to be stream-based to
        * handle data more efficiently.  For this reason the public API only allows row access from start to end.
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
                this.rowTransformer.onEnd();
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
        var JsonRowField = (function () {
            /** Private constructor:  please use factory methods. */
            function JsonRowField(identifier, displayName, typeOfValue, typeConstructor, rangeVal, distinctValueEstimateVal) {
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

            JsonRowField.prototype.values = function (rowToken) {
                var result = rowToken[this.identifier];
                return (result == null) ? [] : result;
            };
            return JsonRowField;
        })();
        rowStore.JsonRowField = JsonRowField;

        var UnaryJsonRowField = (function () {
            function UnaryJsonRowField(identifier, displayName, typeOfValue, typeConstructor, rangeVal, distinctValueEstimateVal) {
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

            UnaryJsonRowField.prototype.value = function (rowToken) {
                return rowToken[this.identifier];
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
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='_all.ts' />
var ozone;
(function (ozone) {
    var FieldDescriptor = (function () {
        function FieldDescriptor(identifier, typeOfValue, typeConstructor, multipleValuesPerRow, displayName, precomputedRange, distinctValues, shouldCalculateDistinctValues) {
            this.identifier = identifier;
            this.typeOfValue = typeOfValue;
            this.typeConstructor = typeConstructor;
            this.multipleValuesPerRow = multipleValuesPerRow;
            this.displayName = displayName;
            this.precomputedRange = precomputedRange;
            this.distinctValues = distinctValues;
            this.shouldCalculateDistinctValues = shouldCalculateDistinctValues;
        }
        FieldDescriptor.build = /**
        * Factory method for building from AJAX.  The AJAX must contain typeOfValue.  If an identifier is not provided
        * separately, that must also be provided. Additionally it may provide displayName, precomputedRange,
        * distinctValues, and multipleValuesPerRow.  If "unlimitedValues" is true,
        * shouldCalculateDistinctValues will be false and distinctValues will be Number.POSITIVE_INFINITY.
        *
        * The default for multipleValuesPerRow is false.
        */
        function (ajax, identifier) {
            if (typeof identifier === "undefined") { identifier = null; }
            var id = (identifier === null) ? ajax["identifier"] : identifier;
            var displayName = ajax["displayName"] ? ajax["displayName"] : id;
            var precomputedRange = ajax["range"] ? ajax["range"] : null;
            var shouldCalculateDistinctValues = ((!ajax["unlimitedValues"]) && typeof (ajax["distinctValues"]) !== "number");
            var distinctValues = (shouldCalculateDistinctValues || ajax["unlimitedValues"]) ? Number.POSITIVE_INFINITY : ajax["distinctValues"];

            var allowsMultipleValues = ajax["multipleValuesPerRow"] ? true : false;

            return new FieldDescriptor(id, ajax["typeOfValue"], null, allowsMultipleValues, displayName, precomputedRange, distinctValues, shouldCalculateDistinctValues);
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
