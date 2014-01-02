/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.bitmap {
    /**
     * The most trivial of general-purpose bitmap implementations;  a sorted array of indexes.  This can work well for
     * sparse data.
     * We don't use a boolean[], because while in practice it should iterate in construction order or index
     * order, we don't want to rely on JS runtime implementation details.
     */
    export class ArrayIndexBitmap implements Bitmap {

        /** Matches other bitmap builders. */
        public static builder(min : number = 0, max: number = -1) : Reducer<number,Bitmap> {
            var array : number[] = [];
            return (<Reducer<number,Bitmap>> {
                onItem: function(item : number) { array.push(item); },
                onEnd:  function() { return new ArrayIndexBitmap(array)}
            });
        }

        public static fromArray(elements : number[]) {
            return new ArrayIndexBitmap(elements.concat());
        }

        public size : number;

        /** Always use builder() to construct. */
        constructor(private indexes : number[]) {
            this.size = indexes.length;
        }

        get(index : number) : boolean {
            return search(index, this.indexes, 0, this.indexes.length-1) >= 0;
        }


        min() : number {
            return (this.indexes.length === 0)  ?  -1  :  this.indexes[0];
        }

        max() : number {
            return (this.indexes.length===0) ? -1 : this.indexes[this.indexes.length-1];
        }

        each(action : (index : number) => void) {
            for (var i=0; i<this.indexes.length; i++) {
                action(this.indexes[i]);
            }
        }

        iterator() : OrderedIterator<number> {
            return new OrderedArrayIterator<number>(this.indexes);
        }

        equals(bm : Bitmap) : boolean {
            if (bm===this) {
                return true;
            }
            if (bm instanceof RangeBitmap) {
                return bm.equals(this);
            }
            if (this.size !== bm.size  || this.min() !== bm.min()  || this.max() !== bm.max()) {
                return false;
            }
            if (this.size===0) {
                return true;  // both empty
            }

            var it1 = this.iterator();
            var it2 = bm.iterator();

            while(it1.hasNext()) {
                if (it1.next() != it2.next()) {
                    return false;
                }
            }
            return true;
        }


        union(bm : Bitmap) : Bitmap {
            if (this.size === 0) {
                return bm;
            }
            if (bm.size === 0) {
                return this; // Min and max aren't useful for comparisons with unions
            }
            if (bm instanceof RangeBitmap && bm.min() <= this.min() && bm.max() >= this.max()) {
                return bm;
            }
            console.log("ArrayIndexBitmap union with:"); // XXX
            console.log(bm); // XXX
            console.log("min: "+bm.min()+" vs. "+this.min()); // XXX
            console.log("max: "+bm.max()+" vs. "+this.max()); // XXX

            return unionOfIterators(this.iterator(), bm.iterator());
        }

        intersection(bm : Bitmap) : Bitmap {
            return intersectionOfOrderedIterators(this.iterator(), bm.iterator());
        }
    }

    /** Iterator over dense arrays;  does not work with sparse arrays. */
    export class OrderedArrayIterator<T> implements OrderedIterator<T> {
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
}