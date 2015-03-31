/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    export function createFilter(store : ColumnStoreInterface, fieldNameOrFilter : any, value? : any) : Filter {
        if (typeof fieldNameOrFilter === "string") {
            return new ozone.ValueFilter(store.field(fieldNameOrFilter), value);
        }
        else if (typeof fieldNameOrFilter === "object") {
            if (typeof fieldNameOrFilter.distinctValueEstimate === "function" && typeof fieldNameOrFilter.identifier === "string") {
                return new ozone.ValueFilter(fieldNameOrFilter, value);
            }
            if (typeof fieldNameOrFilter.matches === "function") {
                return <Filter> fieldNameOrFilter;
            }
        }
        throw "Not a filter: "+fieldNameOrFilter;
    }

    /**
     * Used by ColumnStores to implement filtering
     *
     * @param source          the top-level ColumnStore
     * @param oldStore        the ColumnStore being filtered, which is source or a subset of source
     * @param filtersToAdd    the new filters
     * @returns a ColumnStore with all of oldStore's filters and filtersToAdd applied
     */
    export function filterColumnStore(source : ColumnStore, oldStore : ColumnStoreInterface, ...filtersToAdd : Filter[]) : ColumnStoreInterface {
        if (filtersToAdd.length === 0) {
            return oldStore;
        }

        var oldFilters = oldStore.filters();
        var filtersForIteration : Filter[] = [];
        var indexedValueFilters : Filter[] = [];
        var unionFilters        : Filter[] = [];
        var numNewFilters = 0;  // the total size of the buckets above, tracked separately to avoid bugs
        deduplicate: for (var i=0; i<filtersToAdd.length; i++) {
            var newFilter = filtersToAdd[i];
            for (var j=0; j<oldFilters.length; j++) {
                var oldFilter = oldFilters[j];
                if (oldFilter.equals(newFilter)) {
                    continue deduplicate;
                }
            }

            var filterTarget = filtersForIteration;  // Determines which bucket this filter belongs in
            if (newFilter instanceof UnionFilter) {
                filterTarget = unionFilters;
            }
            else if (newFilter instanceof ValueFilter) {
                var fieldId = (<ValueFilter> newFilter).fieldDescriptor.identifier;
                if (source.field(fieldId) instanceof IndexedField) {
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
            for (var i=0; i<indexedValueFilters.length; i++) {
                var intSetFilter = <ValueFilter> indexedValueFilters[i];
                var fieldId = intSetFilter.fieldDescriptor.identifier;
                var field = <IndexedField<any>> source.field(fieldId);
                var fieldIntSet = field.intSetForValue(intSetFilter.value);

                set = ozone.intSet.intersectionOfIntSets(set, fieldIntSet);
            }
        }

        // Iterative filtering

        if (filtersForIteration.length > 0) {
            var setBuilder = ozone.intSet.builder(set.min(), set.max());
            set.each(function(rowToken) {
                for (var i=0; i<filtersForIteration.length; i++) {
                    var filter = filtersForIteration[i];
                    if ( ! filter.matches(oldStore, rowToken)) {
                        return;
                    }
                    setBuilder.onItem(<number>rowToken);
                }
            });
            set = setBuilder.onEnd();
        }

        //  Unions, done last because they are slowest

        if (unionFilters.length > 0) {
            unionFilters.forEach(function(f : Filter) {
                set = unionColumnStore(source, set, (<UnionFilter>f).filters);
            });
        }

        var newFilters : Filter[] = oldStore.filters().concat(filtersForIteration, indexedValueFilters);
        newFilters.sort(compareFilterByName);
        return new FilteredColumnStore(source, newFilters, set);
    }

    function applyFilter(source : ColumnStore, initialSet : IntSet, filter : Filter) : IntSet {
        if (filter instanceof UnionFilter) {
            return unionColumnStore(source, initialSet, (<UnionFilter>filter).filters);
        }
        if (filter instanceof ValueFilter) {
            var intSetFilter = <ValueFilter> filter;
            var fieldId = intSetFilter.fieldDescriptor.identifier;
            var field = source.field(fieldId);
            if (source.field(fieldId) instanceof IndexedField) {
                var fieldIntSet = (<IndexedField<any>>field).intSetForValue(intSetFilter.value);
                return ozone.intSet.intersectionOfIntSets(initialSet, fieldIntSet);
            }
        }
        var setBuilder = ozone.intSet.builder(initialSet.min(), initialSet.max());
        initialSet.each(function(rowToken) {
           if (filter.matches(source, rowToken)) {
               setBuilder.onItem(rowToken);
           }
        });
        return setBuilder.onEnd();
    }


    function unionColumnStore(source : ColumnStore, initialSet : IntSet, filters : Filter[]) : IntSet {
        if (filters.length === 0) {
            return initialSet;
        }
        var toUnion : IntSet[] = [];
        for (var i=0; i<filters.length; i++) {
            toUnion.push(applyFilter(source, initialSet, filters[i]));
        }
        return initialSet.intersectionOfUnion(toUnion);
    }

    function compareFilterByName(a : Filter, b: Filter) : number {
        if (a.displayName < b.displayName) return -1;
        if (a.displayName > b.displayName) return  1;
        return 0;
    }

    export function partitionColumnStore(store : ColumnStoreInterface, field : RandomAccessField<any>)
        : { [value: string]: RandomAccessStore; }
    {
        if (store.size === 0) {
            return {};
        }

        var indexedField;
        if (field instanceof IndexedField) {
            indexedField = <IndexedField<any>> field;
        }
        else {
            var indexedFieldBuilder = IndexedField.builder(field);
            store.eachRow(function(row) {
                indexedFieldBuilder.onItem({index:row, rowToken:row});
            });
            indexedField = <IndexedField<any>> indexedFieldBuilder.onEnd();
        }

        var result : { [value: string]: RandomAccessStore; } = {};
        var allValues = indexedField.allValues();
        for (var i=0; i<allValues.length; i++) {
            var value = allValues[i];
            var filtered = store.filter(new ozone.ValueFilter(field, value));
            if (filtered.size > 0) {
                result[""+value] = filtered;
            }
        }
        return result;
    }

    export class FilteredColumnStore extends StoreProxy implements ColumnStoreInterface {

        size : number;

        constructor( public source : ColumnStore, private filterArray : Filter[], private filterBits : IntSet) {
            super(source);
            this.size = filterBits.size();
        }

        intSet() : IntSet { return this.filterBits; }

        eachRow(rowAction : (rowToken : any) => void) { this.filterBits.each(rowAction); }

        filter(fieldNameOrFilter : any, value? : any) : RandomAccessStore {
            return filterColumnStore(this.source, this, createFilter(this, fieldNameOrFilter, value));
        }

        filters() : Filter[] { return this.filterArray; }

        simplifiedFilters() : Filter[] { return this.filterArray; }

        removeFilter(filter : Filter) : RandomAccessStore {
            var newFilters : Filter[] = [];
            for (var i=0; i<this.filterArray.length; i++) {
                var f = this.filterArray[i];
                if ( ! f.equals(filter)) {
                    newFilters.push(f);
                }
            }
            var result : RandomAccessStore = this.source;
            for (var i=0; i<newFilters.length; i++) {
                result = result.filter(newFilters[i]);
            }
            return result;
        }

        partition(fieldAny : any) {
            var key : string = (typeof fieldAny === 'string') ? <string> fieldAny  : (<FieldDescriptor>fieldAny).identifier;
            return partitionColumnStore(this, <RandomAccessField<any>> this.field(key));
        }


    }

}