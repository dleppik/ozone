/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.intSet {
    /**
     * The most trivial of general-purpose IntSet implementations;  a sorted array of indexes.  This can work well for
     * sparse data.
     * We don't use a boolean[], because while in practice it should iterate in construction order or index
     * order, we don't want to rely on JS runtime implementation details.
     */
    export class ArrayIndexIntSet implements IntSet {

        /** Matches the API of other IntSet builders. */
        public static builder(min : number = 0, max: number = -1) : Reducer<number,IntSet> {
            var array : number[] = [];
            return (<Reducer<number,IntSet>> {
                onItem: function(item : number) { array.push(item); },
                onEnd:  function() { return new ArrayIndexIntSet(array)}
            });
        }

        public static fromArray(elements : number[]) {
            return new ArrayIndexIntSet(elements.concat());
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

        equals(set : IntSet) : boolean {
            if (set===this) {
                return true;
            }
            if (set instanceof RangeIntSet) {
                return set.equals(this);
            }
            if (this.size !== set.size  || this.min() !== set.min()  || this.max() !== set.max()) {
                return false;
            }
            if (this.size===0) {
                return true;  // both empty
            }

            var it1 = this.iterator();
            var it2 = set.iterator();

            while(it1.hasNext()) {
                if (it1.next() != it2.next()) {
                    return false;
                }
            }
            return true;
        }


        union(set : IntSet) : IntSet {
            if (this.size === 0) {
                return set;
            }
            if (set.size === 0) {
                return this; // Min and max aren't useful for comparisons with unions
            }
            if (set instanceof RangeIntSet && set.min() <= this.min() && set.max() >= this.max()) {
                return set;
            }
            return unionOfIterators(this.iterator(), set.iterator());
        }

        intersection(set : IntSet) : IntSet {
            return intersectionOfOrderedIterators(this.iterator(), set.iterator());
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