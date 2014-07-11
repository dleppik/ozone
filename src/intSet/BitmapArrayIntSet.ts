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
                    var thisWordIndex = bits.inWord(item) - numOfLeadingWords;
                    if (thisWordIndex < currentWordIndex){
                        throw new Error("BitmapArrayIntSet.builder() requires a sorted array to parse.");
                        //******* Note: is there a better way to refer to the current method?
                    }
                    if (thisWordIndex > currentWordIndex) {
                        if (isFirst) {
                            // The index of the word which the first set bit is in is the same as the number of words
                            // which are filled with leading zeroes.
                            numOfLeadingWords = bits.inWord(item);
                            currentWordIndex = thisWordIndex - numOfLeadingWords;
                        }
                        else {
                            array[currentWordIndex] = currentWord;
                            currentWord = 0;
                            currentWord = currentWord | 0; // Needed to clear the high bits?
                            currentWordIndex = thisWordIndex;
                        }
                    }
                    onesCounter++;
                    currentWord = bits.setBit(bits.offset(item), currentWord);
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

        public isPacked = true;
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
                        this.minValue = currentBit + (i + this.wordOffset)*32;
                        break;
                    }
                }
                for (var i = words.length-1; i >= 0; i--) {
                    currentBit = bits.maxBit(words[i]);
                    if (currentBit >= 0) {
                        this.maxValue = currentBit + (i + this.wordOffset)*32;
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
            return new OrderedBitmapArrayWithOffsetIterator<number>(this.words, this.maxValue, this.wordOffset);
        }

        /** Iterate over all the packed words in order. */
        wordIterator() : OrderedWordIterator<number> {
            return new OrderedWordIterator<number>(this.words);
        }

        /** Returns an IntSet containing only the elements that are found in both IntSets. */
        union(bm : IntSet) : IntSet {

            if (bm['isPacked']) {  // isPacked exists
                var that : PackedIntSet = <PackedIntSet> bm;
                if (that.isPacked === true) {
                    var myIterator     = this.wordIterator();
                    var otherIterator  = that.wordIterator();
                    var array:number[];
                    var currentWord:number;
                    var size:number = 0;

                    var offset:number = (this.minWord() >= that.minWord()) ? this.minWord() : that.minWord();
                    myIterator.skipTo(offset);
                    otherIterator.skipTo(offset);

                    while (myIterator.hasNext() && otherIterator.hasNext()) {
                        currentWord = myIterator.next() & otherIterator.next();
                        size += bits.countBits(currentWord);
                        array.push(currentWord);
                    }
                    return new BitmapArrayIntSet(array, offset, size);
                }
            }
            else {
                return bm.union(this);
            }
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

    }

    /**
     * Iterates over all the set bits in order.  This class does not support an index offset.
     */
    export class OrderedBitmapArrayIterator<number> implements OrderedIterator<number> {
        constructor( private words : number[], private maxBit : number ) {}

        private nextBit = 0;

        hasNext() : boolean {
            return this.nextBit <= this.maxBit;
        }

        /**
         * Returns the index of the next set bit.
         *
         * @returns {number}
         */
        next() : number {
            var word : number = this.words[bits.inWord(this.nextBit)];
            var result : number;

            while (this.hasNext() && typeof(result) === 'undefined') {
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


    /**
     * Iterates over all the set bits in order.  This class does support an index offset.
     */
    export class OrderedBitmapArrayWithOffsetIterator<number> extends OrderedBitmapArrayIterator<number>{

        private bitOffset : number;

        constructor( words : number[], maxBit : number, wordOffset : number ) {
            this.bitOffset = wordOffset * 32;
            super(words, maxBit - this.bitOffset);
        }

        next() : number {
            return super.next() + this.bitOffset;
        }

        skipTo(item : number) {
            if (item >= this.bitOffset) {
                super.skipTo(item - this.bitOffset);
            }
            else {
                super.skipTo(0);
            }
        }
    }


    export class OrderedWordIterator<number> implements OrderedIterator<number> {
        constructor( private words : number[]) {}

        private nextWord = 0;

        hasNext() : boolean {
            return this.nextWord < this.words.length;
        }

        next() : number {
            var result : number = this.words[this.nextWord++];
            if (typeof(result) === 'undefined') {
                result = 0;
            }
             return result;
        }

        skipTo(item : number) {
            this.nextWord = item;
        }
    }

}
