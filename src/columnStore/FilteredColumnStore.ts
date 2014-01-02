/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {

    import ArrayIndexBitmap = ozone.bitmap.ArrayIndexBitmap;
    import RangeBitmap = ozone.bitmap.RangeBitmap;

    export function filterColumnStore(source : ColumnStore, oldStore : ColumnStoreInterface, ...filtersToAdd : Filter[]) : ColumnStoreInterface {
        if (filtersToAdd.length === 0) {
            return oldStore;
        }

        var oldFilters = oldStore.filters();
        var filtersForIteration : Filter[] = [];
        var filtersForBitwiseOr : Filter[] = [];
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
                if (source.field(fieldId) instanceof BitmapField) {
                    filterTarget = filtersForBitwiseOr;
                }
            }
            filterTarget.push(newFilter);
        }
        if (filtersForIteration.length + filtersForBitwiseOr.length === 0) {
            return oldStore;
        }


        // Bitmap filtering

        var bitmap = oldStore.bitmap();

        for (var i=0; i<filtersForBitwiseOr.length; i++) {
            var filter = <ValueFilter> newFilter;
            var fieldId = filter.fieldDescriptor.identifier;
            var field = <BitmapField> source.field(fieldId);
            var fieldBitmap = field.bitmapForValue(filter.value);
            // TODO
            // TODO  merge bitmaps
            // TODO
        }

        // TODO
        // TODO  Use the bitmap generated above
        // TODO


        // Iterative filtering

        var bitmapBuilder = ArrayIndexBitmap.builder(bitmap.min(), bitmap.max());

        // TODO
        // TODO Use an iterator, so we can skip
        // TODO
        oldStore.eachRow(function(rowToken) {
            for (var i=0; i<filtersForIteration.length; i++) {
                var filter = filtersForIteration[i];
                if ( ! filter.matches(oldStore, rowToken)) {
                    return;
                }
                bitmapBuilder.onItem(rowToken);
            }
        });
        bitmap = bitmapBuilder.onEnd();

        var newFilters : Filter[] = oldStore.filters().concat(filtersForIteration);
        newFilters.sort(compareFilterByName);
        return new FilteredColumnStore(source, newFilters, bitmap);
    }

    function compareFilterByName(a : Filter, b: Filter) : number {
        if (a.displayName < b.displayName) return -1;
        if (a.displayName > b.displayName) return  1;
        return 0;
    }

    export class FilteredColumnStore extends StoreProxy implements ColumnStoreInterface {

        length : number;

        constructor( public source : ColumnStore, private filterArray : Filter[], private filterBits : Bitmap) {
            super(source);
            this.length = filterBits.size;
        }

        bitmap() : Bitmap {
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

    }

}