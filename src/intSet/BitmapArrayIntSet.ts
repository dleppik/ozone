/**
 * Copyright 2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.intSet {

    /**
     * Stores indexes in an Array of numbers, treating them as 32-bit unsigned integers.
     */
    export class BitmapArrayIntSet implements PackedIntSet {


        /***** Note: should we be ignoring min and max like this?  ******/
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
                    return new BitmapArrayIntSet(array, numOfLeadingWords,onesCounter);
                }
            });

        }

        private minValue : number;
        private maxValue : number;

        /**
         * Constructs a BitmapArrayIntSet.
         * @param words         The bitmap (not including the offset bits) as a number array
         * @param wordOffset    The number of 32-bit words which are all zeroes which proceed the given array.
         * @param size          The number of ones in the array (0 if 'words' is empty)
         */
        constructor(
            private words : number[],
            private wordOffset : number,
            public size : number)
        {
            if (words == null || words.length == 0) {
                size = 0;
                this.minValue = -1;
                this.maxValue = -1;
            }
            else  {
                var currentBit : number;
                for (var i = 0; i < words.length; i++) {
                    currentBit = bits.minBit(words[i]);
                    if (currentBit >= 0) {
                        this.minValue = currentBit + i*32;
                        break;
                    }
                }
                for (var i = words.length-1; i >= 0; i--) {
                    currentBit = bits.maxBit(words[i]);
                    if (currentBit >= 0) {
                        this.maxValue = currentBit + i*32;
                        break;
                    }
                }
            }
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
         * The lowest value for which has() returns true, or -1 if size === 0.  This should be
         * extremely fast.
         * The behavior when size === 0 may change in future versions.
         */
        min() : number {
            return this.minValue;
        }

        /**
         * The highest value for which has() returns true, or -1 if size === 0.  This should be
         * extremely fast.
         * The behavior when size === 0 may change in future versions.
         */
        max() : number {
            return this.maxValue;
        }

        /** Iterate over all "true" elements in order. */
        each(action : (index : number) => void) : void {
            for(var i = 0; i < this.words.length; i++) {
                if (this.words[i] != null || this.words[i] != 0) {
                    for (var j = 0; j < 32; j++) {
                        if (this.words[i] & bits.singleBitMask(j)) {
                            action(i*32 + j);
                        }
                    }
                }
            }
        }

        /** Iterate over all "true" elements in order. */
        iterator() : OrderedIterator<number> {
            return new OrderedBitmapArrayIterator<number>(this.words);
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

        minWord() : number {
            return this.wordOffset;
        }

        /** Equals Math.floor(min()/32). */
        maxWord() : number {
            return bits.inWord(this.maxValue);
        }

        public isPacked = true;
    }

    export class OrderedBitmapArrayIterator<number> implements OrderedIterator<number> {
        constructor( private words : number[] ) {}

        private nextBit = 0;
        private lastBit = this.words.length * 32 - 1;

        hasNext() : boolean {
            return this.nextBit <= this.lastBit;
        }

        next() : number {
            var word : number = this.words[bits.inWord(this.nextBit)];
            var result : number = -1;  // NOTE: should I be returning -1 or undefined?

            while (this.hasNext() && result < 0) {
                if (word) {
                    if (word & bits.singleBitMask(this.nextBit)) {
                        result = this.nextBit;
                    }
                    this.nextBit++;
                }
                else {
                    this.nextBit = (bits.inWord(this.nextBit) + 1) * 32;
                }
            }
            return result;
        }

        skipTo(item : number) {
            this.nextBit = item;
        }
    }
}