/// <reference path="../ozone.d.ts" />
"use strict";

function testIntersections(millisPerTest, onEachCompletion, onDone) {
    var intSetTypes = [
        { name: "ArrayIndexIntSet",  intSetSource: ozone.intSet.ArrayIndexIntSet },
        { name: "BitmapArrayIntSet", intSetSource: ozone.intSet.BitmapArrayIntSet}
    ];
    var dataShapes = [
        {name: "Small, high density", density: 0.5,  size:      30, numberOfSets: 500},
        {name: "1k, high density",    density: 0.5,  size:    1000, numberOfSets: 160},
        {name: "1k, 1% density",      density: 0.01, size:    1000, numberOfSets: 160},

        {name: "10k, high density",   density: 0.5,  size:   10000, numberOfSets: 160},
        {name: "10k, 1% density",     density: 0.01, size:   10000, numberOfSets: 160},

        {name: "100k, high density",  density: 0.5,  size:  100000, numberOfSets: 160},
        {name: "100k, 1% density",    density: 0.01, size:  100000, numberOfSets: 160},

        {name: "1m, high density",    density: 0.5,  size: 1000000, numberOfSets:  20},
        {name: "1m, 1% density",      density: 0.01, size: 1000000, numberOfSets:  20}
    ];

    var dataSets = [];

    dataShapes.forEach(function(shape) {
        intSetTypes.forEach(function(intSetSource) {
            dataSets.push({
                name: intSetSource.name+" "+shape.name,
                shape: shape,
                intSetSource: intSetSource
            });
        });
    });

    var doNextItem = function () {
        if (dataSets.length > 0) {
            var item = dataSets.shift();
            var name = item.name;
            var shape = item.shape;
            var intSetSource = item.intSetSource;
            var pairs = randomIntSetPairs(shape.density, shape.size, intSetSource.intSetSource, shape.numberOfSets, shape.numberOfSets*4);
            var reps = timeTest(pairs, millisPerTest, function(a, b) {
                return a.intersection(b);
            });
            onEachCompletion({name: name, reps: reps});

            if (dataSets.length > 0) {
                if (window) {
                    window.setTimeout(function() { doNextItem(); }, 1);
                }
                else {
                    doNextItem();
                }
            }
            else if (onDone) {
                onDone();
            }
        }
    };

    if (window) {
        window.setTimeout(function() { doNextItem() }, 1);
    }
    else {
        doNextItem();
    }
}

function timeTest(pairsOfSets, durationMillis, testFunction) {
    var reps = 0;
    var endTime = Date.now() + durationMillis;
    while (true) {
        for (var i=0; i<pairsOfSets.length; i++) {
            var pair = pairsOfSets[i];
            testFunction(pair[0], pair[1]);
            reps++;
            if (Date.now() >= endTime) {
                return reps;
            }
        }
    }
}

function randomIntSetPairs(density, size, intSetSource, numberOfSets, numberOfPairs) {
    var sets = [];
    for (var i=0; i<numberOfSets; i++) {
        sets.push(randomIntSet(density, size, intSetSource));
    }

    var pairsOfSets = [];
    for (i=0; i<numberOfPairs; i++) {
        var setA = sets[Math.random()*sets.length | 0];
        var setB = setA;
        while (setA === setB) {
            setB = sets[Math.random()*sets.length | 0];
        }
        pairsOfSets[pairsOfSets.length] = [setA, setB];
    }
    return pairsOfSets;
}

/**
 * Returns an IntSet with a range from 0 to 'size', with 'density' being the probability that each element within that
 * range is populated.  Thus if size=100 and density = 0.75, then each value from 0 to 99 has a 75% probability of being
 * in the set.
 */
function randomIntSet(density, size, intSetSource) {
    var data = [];
    for (var i=0; i<size; i++) {
        if (Math.random() < density) {
            data.push(i);
        }
    }
    return  ozone.intSet.build(ozone.intSet.ArrayIndexIntSet.fromArray(data), intSetSource);
}

