/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    export function filterColumnStore(source : ColumnStore, oldStore : ColumnStoreInterface, ...filtersToAdd : Filter[]) : ColumnStoreInterface {
        if (filtersToAdd.length === 0) {
            return oldStore;
        }

        var oldFilters = oldStore.filters();
        var filtersForIteration : Filter[] = [];
        var intSetFilters : Filter[] = [];
        deduplicate: for (var i=0; i<filtersToAdd.length; i++) {
            var newFilter = filtersToAdd[i];
            for (var j=0; j<oldFilters.length; j++) {
                var oldFilter = oldFilters[j];
                if (oldFilter.equals(newFilter)) {
                    continue deduplicate;
                }
            }
            var filterTarget = filtersForIteration;
            if (newFilter instanceof ValueFilter) {
                var fieldId = (<ValueFilter> newFilter).fieldDescriptor.identifier;
                if (source.field(fieldId) instanceof IntSetField) {
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
            for (var i=0; i<intSetFilters.length; i++) {
                var intSetFilter = <ValueFilter> intSetFilters[i];
                var fieldId = intSetFilter.fieldDescriptor.identifier;
                var field = <IntSetField> source.field(fieldId);
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

        var newFilters : Filter[] = oldStore.filters().concat(filtersForIteration, intSetFilters);
        newFilters.sort(compareFilterByName);
        return new FilteredColumnStore(source, newFilters, set);
    }

    function compareFilterByName(a : Filter, b: Filter) : number {
        if (a.displayName < b.displayName) return -1;
        if (a.displayName > b.displayName) return  1;
        return 0;
    }

    export function partitionColumnStore(store : ColumnStoreInterface, field : RandomAccessField<any>)
        : { [value: string]: RandomAccessStore; }
    {
        if (store.length === 0) {
            return {};
        }

        var indexedField;
        if (field instanceof IntSetField) {
            indexedField = <IntSetField> field;
        }
        else {
            var indexedFieldBuilder = IntSetField.builder(field);
            store.eachRow(function(row) {
                indexedFieldBuilder.onItem({index:row, rowToken:row});
            });
            indexedField = <IntSetField> indexedFieldBuilder.onEnd();
        }

        var result = {};
        var allValues = indexedField.allValues();
        for (var i=0; i<allValues.length; i++) {
            var value = allValues[i];
            var filtered = store.filter(new ozone.ValueFilter(field, value));
            if (filtered.length > 0) {
                result[""+value] = filtered;
            }
        }
        return result;
    }

    export class FilteredColumnStore extends StoreProxy implements ColumnStoreInterface {

        length : number;

        constructor( public source : ColumnStore, private filterArray : Filter[], private filterBits : IntSet) {
            super(source);
            this.length = filterBits.size;
        }

        intSet() : IntSet {
            return this.filterBits;
        }

        eachRow(rowAction : (rowToken : any) => void) {
            this.filterBits.each(rowAction);
        }

        filter(filter : Filter) : ColumnStoreInterface {
            return filterColumnStore(this.source, this, filter);
        }

        filters() : Filter[] {
            return this.filterArray;
        }

        simplifiedFilters() : Filter[] {
            return this.filterArray;
        }

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

        partition(fieldKey : string) {
            return partitionColumnStore(this, <RandomAccessField<any>> this.field(fieldKey));
        }

    }

}