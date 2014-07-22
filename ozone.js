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

    /**
    * Combine all descriptors, with later ones overwriting values provided by earlier ones.  All non-inherited
    * properties are copied over, plus all FieldDescribing (inherited or otherwise).
    * If range and distinctValueEstimate are functions, the result's function calls the original object's function.
    * If they are not functions, the result's function returns the value.
    */
    function mergeFieldDescriptors() {
        var descriptors = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            descriptors[_i] = arguments[_i + 0];
        }
        return mergeObjects(["identifier", "displayName", "typeOfValue", "typeConstructor"], ["range", "distinctValueEstimate"], descriptors);
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
                        result[key] = function () {
                            f();
                        };
                    })(item[key]);
                } else if (typeof item[key] !== "undefined") {
                    (function (value) {
                        result[key] = function () {
                            return value;
                        };
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
        } else if (descriptor.typeOfValue === "string") {
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
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
var ozone;
(function (ozone) {
    /// <reference path='../_all.ts' />
    (function (columnStore) {
        /**
        * This is the recommended way to generate a ColumnStore.
        *
        * @params  provides optional arguments:
        *
        *          fields:  maps from field identifiers in the source to field-specific params.  All FieldDescribing
        *                  properties and Builder parameters can be specified here.
        *
        *                   class: a Field class, such as UnIndexedField, or other object with a "builder" method.
        *
        *          buildAllFields: boolean, default is true.  If false, any fields not listed under 'Fields' are ignored.
        */
        function buildFromStore(source, params) {
            if (typeof params === "undefined") { params = {}; }
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
                        newBuilder = ozone.columnStore.UnIndexedField.builder(sourceField, fieldParams);
                    } else {
                        newBuilder = ozone.columnStore.IndexedField.builder(sourceField, fieldParams);
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
            return new ozone.columnStore.ColumnStore(length, resultFields);
        }
        columnStore.buildFromStore = buildFromStore;
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
/**
* Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    (function (columnStore) {
        /**
        * A Field which is inefficient for filtering;  intended for columns where distinctValueEstimate is so large that
        * an IndexedField would use an unreasonable amount of memory. Stores the entire column in a single dense array.
        */
        var UnIndexedField = (function () {
            function UnIndexedField(descriptor, array, offset, nullProxy) {
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

                var range = descriptor.range();
                if (typeof range === 'undefined' || descriptor.typeOfValue !== 'number') {
                    range = null;
                }
                this.rangeValue = range;

                if (typeof (this.valueEstimate) !== "number" || isNaN(this.valueEstimate) || this.valueEstimate > array.length) {
                    this.valueEstimate = array.length;
                }

                if (array.length > 0 && (array[0] === nullProxy || array[array.length - 1] === nullProxy)) {
                    throw new Error("Array must be trimmed");
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
                        } else {
                            var newIndex = indexedRowToken.index - offset;
                            while (array.length < newIndex) {
                                array.push(nullProxy);
                            }
                            array[newIndex] = value;
                        }
                    },
                    onEnd: function () {
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
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
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
            function ColumnStore(size, fieldArray) {
                this.size = size;
                this.fieldArray = fieldArray;
                this.fieldMap = {};
                for (var i = 0; i < fieldArray.length; i++) {
                    var field = fieldArray[i];
                    this.fieldMap[field.identifier] = field;
                }
            }
            ColumnStore.prototype.intSet = function () {
                return new ozone.intSet.RangeIntSet(0, this.size);
            };

            ColumnStore.prototype.fields = function () {
                return this.fieldArray;
            };

            ColumnStore.prototype.field = function (key) {
                return this.fieldMap[key];
            };

            ColumnStore.prototype.filter = function (fieldNameOrFilter, value) {
                return ozone.columnStore.filterColumnStore(this, this, ozone.columnStore.createFilter(this, fieldNameOrFilter, value));
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

            ColumnStore.prototype.partition = function (fieldAny) {
                var key = (typeof fieldAny === 'string') ? fieldAny : fieldAny.identifier;
                return ozone.columnStore.partitionColumnStore(this, this.field(key));
            };

            ColumnStore.prototype.eachRow = function (rowAction) {
                for (var i = 0; i < this.size; i++) {
                    rowAction(i);
                }
            };
            return ColumnStore;
        })();
        columnStore.ColumnStore = ColumnStore;
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ozone;
(function (ozone) {
    (function (columnStore) {
        function createFilter(store, fieldNameOrFilter, value) {
            if (typeof fieldNameOrFilter === "string") {
                return new ozone.ValueFilter(store.field(fieldNameOrFilter), value);
            } else if (typeof fieldNameOrFilter === "object") {
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
            var intSetFilters = [];
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
                    var fieldId = newFilter.fieldDescriptor.identifier;
                    if (source.field(fieldId) instanceof ozone.columnStore.IndexedField) {
                        filterTarget = intSetFilters;
                    }
                }
                filterTarget.push(newFilter);
            }
            if (filtersForIteration.length + intSetFilters.length === 0) {
                return oldStore;
            }

            // IntSet filtering
            var set = oldStore.intSet();

            if (intSetFilters.length > 0) {
                for (var i = 0; i < intSetFilters.length; i++) {
                    var intSetFilter = intSetFilters[i];
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

            var newFilters = oldStore.filters().concat(filtersForIteration, intSetFilters);
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

        function partitionColumnStore(store, field) {
            if (store.size === 0) {
                return {};
            }

            var indexedField;
            if (field instanceof ozone.columnStore.IndexedField) {
                indexedField = field;
            } else {
                var indexedFieldBuilder = ozone.columnStore.IndexedField.builder(field);
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
                if (filtered.size > 0) {
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
                this.size = filterBits.size;
            }
            FilteredColumnStore.prototype.intSet = function () {
                return this.filterBits;
            };

            FilteredColumnStore.prototype.eachRow = function (rowAction) {
                this.filterBits.each(rowAction);
            };

            FilteredColumnStore.prototype.filter = function (fieldNameOrFilter, value) {
                return filterColumnStore(this.source, this, createFilter(this, fieldNameOrFilter, value));
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

            FilteredColumnStore.prototype.partition = function (fieldAny) {
                var key = (typeof fieldAny === 'string') ? fieldAny : fieldAny.identifier;
                return partitionColumnStore(this, this.field(key));
            };
            return FilteredColumnStore;
        })(ozone.StoreProxy);
        columnStore.FilteredColumnStore = FilteredColumnStore;
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
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
                if (typeof params === "undefined") { params = {}; }
                var descriptor = ozone.mergeFieldDescriptors(sourceField, params);

                var addValues = !params.values;
                var valueList = [];
                if (params.values) {
                    for (var i = 0; i < params.values.length; i++) {
                        valueList.push(ozone.convert(params.values[i], descriptor));
                    }
                }

                var intSetSource = (params.intSetSource) ? params.intSetSource : ozone.intSet.ArrayIndexIntSet;
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
                                valueList.sort(function (a, b) {
                                    return a.getTime() - b.getTime();
                                });
                            } else {
                                valueList.sort();
                            }
                        }
                        for (var i = 0; i < valueList.length; i++) {
                            var value = valueList[i];
                            valueMap[value.toString()] = intSetBuilders[value].onEnd();
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
    })(ozone.columnStore || (ozone.columnStore = {}));
    var columnStore = ozone.columnStore;
})(ozone || (ozone = {}));
/**
* Copyright 2014 by Vocal Laboratories, Inc. All rights reserved.
*/
var ozone;
(function (ozone) {
    (function (intSet) {
        /// <reference path='../_all.ts' />
        /**
        * Bitwise operations on 32-bit numbers.  These match the asm.js standard for "int":  32-bit, unknown sign,
        * intended for bitwise use only.  In practice, JavaScript bitwise operators convert numbers to 32-bit two's-complement,
        * so that's what we use here.  We might actually use asm.js at some point, but hand coding it is a pain (see
        * https://github.com/zbjornson/human-asmjs).
        *
        * See:  http://asmjs.org/spec/latest/
        */
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
                } else {
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
                return Math.floor(bit / 32);
            }
            bits.inWord = inWord;

            /** Returns the offset into a 32-bit int that 'bit' is in */
            function offset(bit) {
                return bit % 32;
            }
            bits.offset = offset;
        })(intSet.bits || (intSet.bits = {}));
        var bits = intSet.bits;
    })(ozone.intSet || (ozone.intSet = {}));
    var intSet = ozone.intSet;
})(ozone || (ozone = {}));
/**
* Copyright 2013-2014 by Vocal Laboratories, Inc.  Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
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
            return ozone.intSet.ArrayIndexIntSet.builder();
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
            }); // Default sort function is alphabetical

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

        function unionOfIntSets() {
            var intSets = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                intSets[_i] = arguments[_i + 0];
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
            var builder = ozone.intSet.ArrayIndexIntSet.builder();
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
                    numIteratorsWithCurrentValue = 1; // Always start with 1, for the current iterator
                }
                currentIteratorIndex = (currentIteratorIndex + 1) % iterators.length;
                it = iterators[currentIteratorIndex];
                it.skipTo(currentValue);
            }
            return builder.onEnd();
        }
        intSet.intersectionOfOrderedIterators = intersectionOfOrderedIterators;

        function intersectionOfIntSets() {
            var intSets = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                intSets[_i] = arguments[_i + 0];
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
    })(ozone.intSet || (ozone.intSet = {}));
    var intSet = ozone.intSet;
})(ozone || (ozone = {}));
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
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
            /** Matches the API of other IntSet builders. */
            ArrayIndexIntSet.builder = function (min, max) {
                if (typeof min === "undefined") { min = 0; }
                if (typeof max === "undefined") { max = -1; }
                var array = [];
                var done = false;
                return {
                    onItem: function (item) {
                        if (done) {
                            throw new Error("Builder being called multiple times.");
                        }
                        array.push(item);
                    },
                    onEnd: function () {
                        done = true;
                        return new ArrayIndexIntSet(array);
                    }
                };
            };

            ArrayIndexIntSet.fromArray = function (elements) {
                return new ArrayIndexIntSet(elements.concat());
            };

            ArrayIndexIntSet.prototype.toArray = function () {
                return this.indexes.concat();
            };

            ArrayIndexIntSet.prototype.has = function (index) {
                return ozone.intSet.search(index, this.indexes, 0, this.indexes.length - 1) >= 0;
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
                if (set instanceof ozone.intSet.RangeIntSet) {
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
                if (set instanceof ozone.intSet.RangeIntSet && set.min() <= this.min() && set.max() >= this.max()) {
                    return set;
                }
                return ozone.intSet.unionOfIterators(this.iterator(), set.iterator());
            };

            ArrayIndexIntSet.prototype.intersection = function (set) {
                return ozone.intSet.intersectionOfOrderedIterators(this.iterator(), set.iterator());
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
                var searchIndex = ozone.intSet.search(item, this.array, this.nextIndex, this.array.length);
                this.nextIndex = (searchIndex < 0) ? ~searchIndex : searchIndex;
            };
            return OrderedArrayIterator;
        })();
        intSet.OrderedArrayIterator = OrderedArrayIterator;
    })(ozone.intSet || (ozone.intSet = {}));
    var intSet = ozone.intSet;
})(ozone || (ozone = {}));
/**
* Copyright 2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    (function (intSet) {
        /**
        * Stores indexes in an Array of numbers, treating them as 32-bit unsigned integers.
        */
        var BitmapArrayIntSet = (function () {
            /**
            * Constructs a BitmapArrayIntSet.
            * @param words         The bitmap (not including the offset bits) as a number array
            * @param wordOffset    The number of 32-bit words which are all zeroes which proceed the given array.
            * @param size          The number of ones in the array (0 if 'words' is empty)
            */
            function BitmapArrayIntSet(words, wordOffset, size) {
                this.words = words;
                this.wordOffset = wordOffset;
                this.size = size;
                this.isPacked = true;
                if (words == null || words.length == 0) {
                    size = 0;
                    this.minValue = -1;
                    this.maxValue = -1;
                } else {
                    var currentBit;
                    for (var i = 0; i < words.length; i++) {
                        currentBit = ozone.intSet.bits.minBit(words[i]);
                        if (currentBit >= 0) {
                            this.minValue = currentBit + (i + this.wordOffset) * 32;
                            break;
                        }
                    }
                    for (var i = words.length - 1; i >= 0; i--) {
                        currentBit = ozone.intSet.bits.maxBit(words[i]);
                        if (currentBit >= 0) {
                            this.maxValue = currentBit + (i + this.wordOffset) * 32;
                            break;
                        }
                    }
                }
            }
            /***** Note: should we be ignoring min and max like this?  ******/
            BitmapArrayIntSet.builder = function (min, max) {
                if (typeof min === "undefined") { min = 0; }
                if (typeof max === "undefined") { max = -1; }
                var array = [];
                var onesCounter = 0;
                var isFirst = true;
                var numOfLeadingWords = 0;
                var currentWordIndex = 0;
                var currentWord = currentWord | 0;

                return {
                    onItem: function (item) {
                        var thisWordIndex = ozone.intSet.bits.inWord(item) - numOfLeadingWords;
                        if (thisWordIndex < currentWordIndex) {
                            throw new Error("BitmapArrayIntSet.builder() requires a sorted array to parse.");
                            //******* Note: is there a better way to refer to the current method?
                        }
                        if (thisWordIndex > currentWordIndex) {
                            if (isFirst) {
                                // The index of the word which the first set bit is in is the same as the number of words
                                // which are filled with leading zeroes.
                                numOfLeadingWords = ozone.intSet.bits.inWord(item);
                                currentWordIndex = thisWordIndex - numOfLeadingWords;
                            } else {
                                array[currentWordIndex] = currentWord;
                                currentWord = 0;
                                currentWord = currentWord | 0; // Needed to clear the high bits?
                                currentWordIndex = thisWordIndex;
                            }
                        }
                        onesCounter++;
                        currentWord = ozone.intSet.bits.setBit(ozone.intSet.bits.offset(item), currentWord);
                        isFirst = false;
                    },
                    onEnd: function () {
                        if (onesCounter > 0) {
                            array[currentWordIndex] = currentWord;
                        }
                        return new BitmapArrayIntSet(array, numOfLeadingWords, onesCounter);
                    }
                };
            };

            BitmapArrayIntSet.prototype.notWritten = function () {
                throw new Error("This method has not been implemented yet.");
            };

            BitmapArrayIntSet.prototype.has = function (theBit) {
                var indexOffset = theBit - this.wordOffset * 32;
                if (indexOffset < 0) {
                    return false;
                }
                return ozone.intSet.bits.hasBit(ozone.intSet.bits.offset(indexOffset), this.words[ozone.intSet.bits.inWord(indexOffset)]);
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
                            if (this.words[i] & ozone.intSet.bits.singleBitMask(j)) {
                                action(i * 32 + j);
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
                return new OrderedWordIterator(this.words);
            };

            /** Returns an IntSet containing only the elements that are found in both IntSets. */
            BitmapArrayIntSet.prototype.union = function (bm) {
                if (bm['isPacked']) {
                    var that = bm;
                    if (that.isPacked === true) {
                        var myIterator = this.wordIterator();
                        var otherIterator = that.wordIterator();
                        var array;
                        var currentWord;
                        var size = 0;

                        var offset = (this.minWord() >= that.minWord()) ? this.minWord() : that.minWord();
                        myIterator.skipTo(offset);
                        otherIterator.skipTo(offset);

                        while (myIterator.hasNext() && otherIterator.hasNext()) {
                            currentWord = myIterator.next() & otherIterator.next();
                            size += ozone.intSet.bits.countBits(currentWord);
                            array.push(currentWord);
                        }
                        return new BitmapArrayIntSet(array, offset, size);
                    }
                } else {
                    return bm.union(this);
                }
            };

            /** Returns an IntSet containing all the elements in either IntSet. */
            BitmapArrayIntSet.prototype.intersection = function (bm) {
                return this.notWritten();
            };

            /** Returns true if the iterators produce identical results. */
            BitmapArrayIntSet.prototype.equals = function (bm) {
                return this.notWritten();
            };

            BitmapArrayIntSet.prototype.minWord = function () {
                return this.wordOffset;
            };

            /** Equals Math.floor(min()/32). */
            BitmapArrayIntSet.prototype.maxWord = function () {
                return ozone.intSet.bits.inWord(this.maxValue);
            };
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
                this.nextBit = 0;
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
                var word = this.words[ozone.intSet.bits.inWord(this.nextBit)];
                var result;

                while (this.hasNext() && typeof (result) === 'undefined') {
                    if (word) {
                        if (word & ozone.intSet.bits.singleBitMask(this.nextBit)) {
                            result = this.nextBit;
                        }
                        this.nextBit++;
                    } else {
                        this.nextBit = (ozone.intSet.bits.inWord(this.nextBit) + 1) * 32;
                    }
                }
                return result;
            };

            OrderedBitmapArrayIterator.prototype.skipTo = function (item) {
                this.nextBit = item;
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
                } else {
                    _super.prototype.skipTo.call(this, 0);
                }
            };
            return OrderedBitmapArrayWithOffsetIterator;
        })(OrderedBitmapArrayIterator);
        intSet.OrderedBitmapArrayWithOffsetIterator = OrderedBitmapArrayWithOffsetIterator;

        var OrderedWordIterator = (function () {
            function OrderedWordIterator(words) {
                this.words = words;
                this.nextWord = 0;
            }
            OrderedWordIterator.prototype.hasNext = function () {
                return this.nextWord < this.words.length;
            };

            OrderedWordIterator.prototype.next = function () {
                var result = this.words[this.nextWord++];
                if (typeof (result) === 'undefined') {
                    result = 0;
                }
                return result;
            };

            OrderedWordIterator.prototype.skipTo = function (item) {
                this.nextWord = item;
            };
            return OrderedWordIterator;
        })();
        intSet.OrderedWordIterator = OrderedWordIterator;
    })(ozone.intSet || (ozone.intSet = {}));
    var intSet = ozone.intSet;
})(ozone || (ozone = {}));
/**
* Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
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
            /** Return a RangeIntSet from minValue to maxValue inclusive. */
            RangeIntSet.fromTo = function (minValue, maxValue) {
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

            RangeIntSet.prototype.has = function (index) {
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
                for (var i = 0; i < this.size; i++) {
                    action(i + this.minValue);
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

        ozone.intSet.empty = new RangeIntSet(-1, 0);
    })(ozone.intSet || (ozone.intSet = {}));
    var intSet = ozone.intSet;
})(ozone || (ozone = {}));
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path="../_all.ts" />
var ozone;
(function (ozone) {
    (function (rowStore) {
        /** Build from a CSV file, with all resulting Fields treated as strings. */
        function buildFromCsv(csv) {
            var dataArray = csv.split(/(\r\n|\n|\r)/);
            var reader = new ozone.rowStore.CsvReader();
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
        rowStore.buildFromCsv = buildFromCsv;

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
                        fProto = ozone.rowStore.JsonRowField;
                    else
                        fProto = ozone.rowStore.UnaryJsonRowField;
                    var field = new fProto(fd.identifier, fd.displayName, fd.typeOfValue, null, fd.range(), fd.distinctValueEstimate());
                    fields.push(field);
                }
            }

            var result = new ozone.rowStore.RowStore(fields, data, rowTransformer);

            if (toComputeDistinctValues.length > 0 || toComputeRange.length > 0) {
                var rangeCalculators = {};
                for (var i = 0; i < toComputeRange.length; i++) {
                    key = toComputeRange[i];
                    rangeCalculators[key] = new ozone.rowStore.RangeCalculator(result.field(key));
                }

                var valueCalculators = {};
                for (var i = 0; i < toComputeDistinctValues.length; i++) {
                    key = toComputeDistinctValues[i];
                    valueCalculators[key] = new ozone.rowStore.ValueFrequencyCalculator(result.field(key));
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
                return ozone.rowStore.UnaryJsonRowField;
            }
            return ozone.rowStore.JsonRowField;
        }
    })(ozone.rowStore || (ozone.rowStore = {}));
    var rowStore = ozone.rowStore;
})(ozone || (ozone = {}));
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
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
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path="../_all.ts" />
var ozone;
(function (ozone) {
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
    })(ozone.rowStore || (ozone.rowStore = {}));
    var rowStore = ozone.rowStore;
})(ozone || (ozone = {}));
/**
* Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
/**
* Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
*/
/// <reference path='../_all.ts' />
var ozone;
(function (ozone) {
    /**
    * Convert ColumnStores, IntSets, etc. to JSON-compatible data objects.
    */
    (function (serialization) {
        /**
        * Convenience function for reading a string containing CSV.  This simply calls rowStore.buildFromCsv() and sends
        * the result to columnStore.buildFromStore().
        */
        function buildFromCsv(csvText, metaData) {
            if (typeof metaData === "undefined") { metaData = {}; }
            return ozone.columnStore.buildFromStore(ozone.rowStore.buildFromCsv(csvText), metaData);
        }
        serialization.buildFromCsv = buildFromCsv;

        /** Read Ozone's native JSON format. */
        function readStore(storeData) {
            var fields = [];
            for (var i = 0; i < storeData.fields.length; i++) {
                fields[i] = readField(storeData.fields[i]);
            }
            return new ozone.columnStore.ColumnStore(storeData.size, fields);
        }
        serialization.readStore = readStore;

        function writeStore(store) {
            var fieldData = [];
            var fields = store.fields();
            for (var i = 0; i < fields.length; i++) {
                fieldData.push(writeField(fields[i]));
            }
            return {
                size: store.size,
                fields: fieldData
            };
        }
        serialization.writeStore = writeStore;

        function readField(fieldData) {
            var type = parseType(fieldData.type);
            if (type.subTypes.length > 0) {
                throw new Error("Don't support subtypes for " + fieldData.type);
            }
            switch (type.mainType) {
                case "indexed":
                    return readIndexedField(fieldData);
                case "unindexed":
                    return readUnIndexedField(fieldData);
                default:
                    throw new Error("Unknown field type: " + fieldData.type);
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
                if (type.subTypes.length > 0) {
                    throw new Error("Unknown subtypes: " + type.subTypes);
                }
                switch (type.mainType) {
                    case "array":
                        return ozone.intSet.ArrayIndexIntSet.fromArray(jsonData.data);
                    case "empty":
                        return ozone.intSet.empty;
                    case "range":
                        return ozone.intSet.RangeIntSet.fromTo(jsonData.min, jsonData.max);
                    default:
                        throw new Error("Unknown IntSet type: " + jsonData.type);
                }
            }
            throw new Error("IntSet type not specified");
        }
        serialization.readIntSet = readIntSet;

        function writeIntSet(toWrite) {
            if (toWrite.size === 0)
                return writeEmptyIntSet(toWrite);
            if (toWrite instanceof ozone.intSet.RangeIntSet)
                return writeRangeIntSet(toWrite);
            return writeIntSetArrayData(toWrite);
        }
        serialization.writeIntSet = writeIntSet;

        function writeEmptyIntSet(toWrite) {
            return { type: "empty" };
        }

        function writeRangeIntSet(rangeIntSet) {
            return {
                type: "range",
                min: rangeIntSet.min(),
                max: rangeIntSet.max()
            };
        }

        function writeIntSetArrayData(toWrite) {
            var array = [];
            if (toWrite instanceof ozone.intSet.ArrayIndexIntSet) {
                array = toWrite.toArray();
            } else {
                toWrite.each(function (value) {
                    array.push(value);
                });
            }
            return {
                type: "array",
                data: array
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
    })(ozone.serialization || (ozone.serialization = {}));
    var serialization = ozone.serialization;
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
/// <reference path='intSet/ArrayIndexIntSet.ts' />
/// <reference path='intSet/BitmapArrayIntSet.ts' />
/// <reference path='intSet/RangeIntSet.ts' />
/// <reference path='rowStore/functions.ts' />
/// <reference path='rowStore/CsvReader.ts' />
/// <reference path='rowStore/RowStore.ts' />
/// <reference path='serialization/jsonInterfaces.ts' />
/// <reference path='serialization/functions.ts' />
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
        /**
        * Factory method for building from AJAX.  The AJAX must contain typeOfValue.  If an identifier is not provided
        * separately, that must also be provided. Additionally it may provide displayName, precomputedRange,
        * distinctValues, and multipleValuesPerRow.  If "unlimitedValues" is true,
        * shouldCalculateDistinctValues will be false and distinctValues will be Number.POSITIVE_INFINITY.
        *
        * The default for multipleValuesPerRow is false.
        */
        FieldDescriptor.build = function (ajax, identifier) {
            if (typeof identifier === "undefined") { identifier = null; }
            var id = (identifier === null) ? ajax["identifier"] : identifier;
            var displayName = ajax["displayName"] ? ajax["displayName"] : id;
            var precomputedRange = ajax["range"] ? ozone.Range.build(ajax["range"]) : null;
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
if (typeof(module) !== "undefined") { module.exports = ozone;}
