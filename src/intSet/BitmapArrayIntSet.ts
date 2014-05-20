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
            var onesCounter : number = 0;
            var isFirst : boolean = true;
            var numOfLeadingWords : number = 0;
            var currentWordIndex : number = 0;
            var currentWord : number = currentWord | 0; // This is not just a JIT hint:  clears the high bits

            return (<Reducer<number,IntSet>> {
                onItem: function(item : number) {
                    var thisWordIndex = bits.inWord(item);
                    if (thisWordIndex < currentWordIndex){
                        throw new Error("BitmapArrayIntSet.builder() requires a sorted array to parse.");
                        //Note: is there a better way to refer to the current method?
                    }
                    if (thisWordIndex > currentWordIndex) {
                        if (isFirst) {
                            // The index of the word which the first set bit is in is the same as the number of words
                            // which are filled with leading zeroes.
                            numOfLeadingWords = bits.inWord(item);
                        }
                        else {
                            array[currentWordIndex] = currentWord;
                            currentWord = 0;
                            currentWord = currentWord | 0; // Needed to clear the high bits?
                        }
                        currentWordIndex = thisWordIndex;
                    }
                    onesCounter++;
                    currentWord = bits.setBit(currentWord, bits.offset(item));
                    isFirst = false;

                },
                onEnd:  function() {
                    if (onesCounter > 0) {
                        array[currentWordIndex] = currentWord;
                    }
                    return new BitmapArrayIntSet(onesCounter, numOfLeadingWords, array);
                }
            });

        }

        private minTrue : number;
        private maxTrue : number;

        /**
         * Constructs a BitmapArrayIntSet
         * @param onesCount
         * @param wordOffset     The number of 32-bit words which are all zeroes which proceed the given array.
         * @param words          The bitmap (not including the offset bits) as a number array
         */
        constructor( public onesCount : number,
                    private wordOffset : number, private words : number[]) {
        }

        private notWritten() : any {
            throw new Error("This method has not been implemented yet."); // XXX
        }


        has(theBit : number) : boolean {
            var indexOffset : number = theBit - this.wordOffset*32;
            if (indexOffset < 0) {
                return false;
            }
            return bits.hasBit(bits.offset(indexOffset), this.words[bits.inWord(indexOffset)]);
        }


        /**
         * The lowest value for which has() returns true, or -1 if length === 0 and offset === 0.  This should be
         * extremely fast.
         * The behavior when size === 0 may change in future versions.
         */
        min() : number {
            if (this.wordOffset > 0 || this.words.length > 0) {
                return this.wordOffset*32 + this.minTrue;
            }
            else {
                return -1;
            }
        }

        /**
         * The highest value for which has() returns true, or -1 if length === 0 and offset === 0.  This should be
         * extremely fast.
         * The behavior when size === 0 may change in future versions.
         */
        max() : number {
            if (this.wordOffset > 0 || this.words.length > 0) {
                return this.wordOffset*32 + this.maxTrue;
            }
            else {
                return -1;
            }
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