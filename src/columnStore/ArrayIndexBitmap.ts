/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.columnStore {
    /**
     * The most trivial of bitmap implementations;  a sorted array of indexes.  This can work well for sparse data.
     * We don't use a boolean[], because while in practice it should iterate in construction order or index
     * order, we don't want to rely on JS runtime implementation details.
     */
    export class ArrayIndexBitmap implements Bitmap {

        public static builder(min : number = 0, max: number = -1) : Reducer<number,Bitmap> {
            var array : number[] = [];
            return (<Reducer<number,Bitmap>> {
                onItem: function(item : number) { array.push(item); },
                onEnd:  function() { return new ArrayIndexBitmap(array)}
            });
        }

        public size : number;

        /** Always use builder() to construct. */
        constructor(private indexes : number[]) {
            this.size = indexes.length;
        }

        public get(index : number) : boolean {
            return search(index, this.indexes, 0, this.indexes.length-1) >= 0;
        }


        public min() : number {
            return (this.indexes.length === 0)  ?  -1  :  this.indexes[0];
        }

        public max() : number {
            return (this.indexes.length===0) ? -1 : this.indexes[this.indexes.length-1];
        }

        public each(action : (index : number) => void) {
            for (var i=0; i<this.indexes.length; i++) {
                action(this.indexes[i]);
            }
        }

        public iterator() : OrderedIterator<number> {
            return new OrderedArrayIterator<number>(this.indexes);
        }
    }

    /** Iterator over dense arrays;  does not work with sparse arrays. */
    class OrderedArrayIterator<T> implements OrderedIterator<T> {
        constructor( private array :T[] ) {}

        private nextIndex = 0;

        hasNext(): boolean {
            return this.nextIndex < this.array.length;
        }

        next():T {
            return this.array[ this.nextIndex++ ];
        }

        skipTo(item:T) {
            if ( (!this.hasNext())  ||  item <= this.array[this.nextIndex]) {
                return;
            }
            var searchIndex = search(item, this.array, this.nextIndex, this.array.length);
            this.nextIndex = (searchIndex < 0)  ?  ~searchIndex  :  searchIndex;
        }
    }

    /**
     * A textbook binary search which returns the index where the item is found,
     * or two's complement of its insert location if it is not found.
     * Based on sample code from Oliver Caldwell at
     * http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
     *
     * but note that that implementation is buggy.
     */
    export function search(searchElement : any, array : any[], minIndex : number, maxIndex : number) : number {
        var currentIndex : number;
        var currentElement : any;

        if (maxIndex < 0 || array.length === 0) {
            return -1;
        }

        while (minIndex <= maxIndex) {
            currentIndex = (minIndex + maxIndex) / 2 | 0;
            currentElement = array[currentIndex];
            if (currentElement < searchElement) {
                minIndex = currentIndex + 1;
            }
            else if (currentElement > searchElement) {
                maxIndex = currentIndex - 1;
            }
            else {
                return currentIndex;
            }
        }
        return ~Math.max(minIndex, maxIndex);
    }
}