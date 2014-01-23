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

    export class ValueFilter implements  Filter {
        constructor(public fieldDescriptor : FieldDescribing, public value : any, public displayName : string = null) {
            if (displayName===null) {
                this.displayName = value+" ("+fieldDescriptor.displayName+")";
            }
        }

        matches(store : RandomAccessStore, rowToken : any) : boolean {
            var field = <RandomAccessField<any>> store.field(this.fieldDescriptor.identifier);
            return field.rowHasValue(rowToken, this.value);
        }

        equals(f : Filter) : boolean {
            if (f===this) {
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
}