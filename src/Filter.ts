/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />

module ozone {

    export interface Filter {
        displayName : string;

        matches(store : RandomAccessStore, rowToken : any) : boolean;

        /**
         * Returns true if the the other filter is equivalent AND is guaranteed to give the same result to
         * matches().  The display name may differ.
         *
         * Always returns false if the other filter has a different prototype.
         */
        equals(filter : Filter) : boolean;
    }

    /**
     * Selects rows where a specific field has a specific value.  Note:  ColumnStore typically uses indexes to filter by
     * value, so this class is generally used only to trigger that code.
     */
    export class ValueFilter implements  Filter {
        constructor(public fieldDescriptor : FieldDescribing, public value : any, public displayName : string = null) {
            if (displayName===null) {
                this.displayName = value+" ("+fieldDescriptor.displayName+")";
            }
        }

        /**
         * Returns true if the row has the given value.  Note:  ColumnStore typically uses indexes to filter by
         * value, bypassing this method.
         */
        matches(store : RandomAccessStore, rowToken : any) : boolean {
            var field = <RandomAccessField<any>> store.field(this.fieldDescriptor.identifier);
            return field.rowHasValue(rowToken, this.value);
        }

        equals(f : Filter) : boolean {
            if (f === this) {
                return true;
            }
            if (Object.getPrototypeOf(f) !== Object.getPrototypeOf(this)) {
                return false;
            }
            var vf = <ValueFilter> f;
            if (vf.fieldDescriptor.identifier !== this.fieldDescriptor.identifier) {
                return false;
            }
            if (vf.value === this.value) {
                return true;
            }
            return vf.value.toString() === this.value.toString();  // non-primitive values, such as dates
        }
    }


    /**
     * Selects rows which match all of several values.  Note:  because this is a fundamental set operation, ColumnStore
     * generally uses its internal union operation when given a UnionFilter.
     *
     * As currently implemented, this works with an array of Filters, and makes no attempt to remove redundant filters.
     * In the future, the constructor might remove redundant filters, and the other methods might make assumptions
     * based on that.
     */
    export class UnionFilter implements Filter {
        filters : Filter[];
        displayName : string;

        constructor(...of : Filter[]) {
            this.filters = of;

            this.displayName = "All of { ";
            for (var i=0; i<this.filters.length; i++) {
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
        equals(f : Filter) : boolean {
            if (f===this) {
                return true;
            }
            if (Object.getPrototypeOf(f) !== Object.getPrototypeOf(this)) {
                return false;
            }
            var      that            = <UnionFilter> f;
            var matched : Filter[] = [];
            var unmatched : Filter[] = that.filters.concat();

            function checkForMatch(thisItem : Filter) : boolean {
                for (var unmatchedIndex = unmatched.length; unmatchedIndex >= 0; unmatchedIndex--) {
                    var thatItem = unmatched[unmatchedIndex];
                    if (thisItem.equals(thatItem)) {
                        unmatched.splice(unmatchedIndex, 1);
                        matched.push(thatItem);
                        return true;
                    }
                }
                return matched.some(function(thatItem) { return thisItem.equals(thatItem) });
            }

            for (var thisIndex = this.filters.length-1; thisIndex >= 0; thisIndex--) {
                var thisItem = this.filters[thisIndex];
                if ( ! checkForMatch(thisItem)) {
                    return false;
                }
            }
            return unmatched.length === 0;
        }

        /**
         * Returns false if (and only if) any of the filters don't match.  NOTE:  ColumnStore will typically bypass
         * this method and use column indexes to compute a union.
         */
        matches(store : RandomAccessStore, rowToken): boolean {
            return this.filters.every(function(f) { return f.matches(store, rowToken) });
        }
    }
}