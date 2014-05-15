/**
 * Copyright 2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.intSet {
    /**
     * Stores indexes in an Array of numbers, treating them as 32-bit unsigned integers.
     */
    export class BitmapArrayIntSet implements PackedIntSet {

        public static builder(min : number = 0, max: number = -1) : Reducer<number,IntSet> {
            var array : number[] = [];
            return (<Reducer<number,IntSet>> {
                onItem: function(item : number) { array.push(item); },
                onEnd:  function() {
                    throw new Error("This method has not been implemented yet."); // XXX
                }
            });

        }

        /**
         * Constructs a BitmapArrayIntSet
         * @param offset    The number of leading 32 bit numbers which contain all zeros
         * @param bits      The bitmap (not including the offset) as a number array
         */
        constructor(private offset : number, private bits : number[]) { }

        private notWritten() : any {
            throw new Error("This method has not been implemented yet."); // XXX
        }


        has(index : number) : boolean {
            var indexOffset : number = index - this.offset*32;
            console.log("indexOffset = " + indexOffset);
            if (indexOffset < 0) {
                return false;
            }
            return bits.hasBit(indexOffset%32, this.bits[Math.floor(indexOffset/32]));
        }

        /**
         * The lowest value for which has() returns true, or -1 if size === 0.  This should be extremely fast.
         * The behavior when size === 0 may change in future versions.
         */
        min() : number {
            return this.notWritten();   // TODO
        }

        /**
         * The highest value for which has() returns true, or -1 if size === 0. This should be extremely fast.
         * The behavior when size === 0 may change in future versions.
         */
        max() : number {
            return this.notWritten();  // TODO
        }

        /** The number of values for which has() returns true. */
        size : number;

        /** Iterate over all "true" elements in order. */
        each(action : (index : number) => void) {
            return this.notWritten();  // TODO
        }

        /** Iterate over all "true" elements in order. */
        iterator() : OrderedIterator<number> {
            return this.notWritten();  // TODO
        }

        /** Returns an IntSet containing only the elements that are found in both IntSets. */
        union(bm : IntSet) : IntSet {
            return this.notWritten();  // TODO
        }

        /** Returns an IntSet containing all the elements in either IntSet. */
        intersection(bm : IntSet) : IntSet {
            return this.notWritten();  // TODO
        }

        /** Returns true if the iterators produce identical results. */
        equals(bm : IntSet) : boolean {
            return this.notWritten();  // TODO
        }

        /** Equals Math.floor(min()/32). */
        minBits() : number {
            return this.notWritten();  // TODO
        }

        /** Equals Math.floor(min()/32). */
        maxBits() : number {
            return this.notWritten();  // TODO
        }

        public isPacked = true;
    }
}