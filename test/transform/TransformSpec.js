"use strict";

describe("transform.sort", function() {

    var fieldInfo = {
        num:   {typeOfValue: "string"},
        str:   {typeOfValue: "number"},
        multi: {typeOfValue: "string", multipleValuesPerRow: true}
    };
    var data = [
        {num:    6, str:     '', multi: [ 'm', 'p', 'a']},
        {num:    5, str:   null, multi: [ 'a', 'w', 't']},
        {num:    7, str:  'abc', multi: [ 'a', 'a', 'c']},
        {num:    2, str:  'aab', multi: [ 'a', 'a'     ]},
        {num:    1, str:  'aac', multi: [ 'a', 'b', 'c']},
        {num:    4, str:  'mpa', multi: [              ]},
        {num:    3, str:   'aa', multi: [ 'a', 'b',  '']},
        {num: null, str: 'null', multi: ['aa', 'b', 'c']}
    ];
    var db = ozone.rowStore.build(fieldInfo, data);

    it("sorts string columns lexicographically, with nulls first", function() {
        var sorted = ozone.transform.sort(db, ['str']).toArray();

        expect(sorted[0].num  ).toBe(5);
        expect(sorted[0].multi).toEqual(['a', 'w', 't']);

        var strings = sorted.map(function(row){ return row['str'] });
        expect(strings).toEqual([null, '', 'aa', 'aab', 'aac', 'abc', 'mpa', 'null']);
    });

    it("sorts number columns numerically", function() {
        var sorted = ozone.transform.sort(db, ['num']).toArray();

        expect(sorted[0].str  ).toBe('null');
        expect(sorted[0].multi).toEqual(['aa', 'b', 'c']);

        var nums = sorted.map(function(row){ return row['num'] });
        expect(nums).toEqual([null, 1, 2, 3, 4, 5, 6, 7]);
    });

    it("sorts multiple values within a cell in the order presented", function() {
        var sorted = ozone.transform.sort(db, ['multi']).toArray();

        expect(sorted[0].str ).toBe('mpa');
        expect(sorted[0].num ).toBe(4);

        var ms = sorted.map(function(row){ return row['multi'].join(',') });
        expect(ms).toEqual(['', 'a,a', 'a,a,c', 'a,b,', 'a,b,c', 'a,w,t', 'aa,b,c', 'm,p,a']);
    });

    it("sorts multiple columns", function() {
        var itemsInfo = { a: {typeOfValue: "number"}, b: {typeOfValue: "number"}, c: {typeOfValue: "number"}};
        var items = [
            {a: 1, b: 1, c: 1},
            {a: 1, b: 2, c: 1},
            {a: 1, b: 3, c: 1},
            {a: 2, b: 1, c: 1},
            {a: 2, b: 2, c: 1},
            {a: 2, b: 3, c: 1},
            {a: 3, b: 1, c: 1},
            {a: 3, b: 2, c: 1},
            {a: 3, b: 3, c: 1},

            {a: 1, b: 1, c: 2},
            {a: 1, b: 2, c: 2},
            {a: 1, b: 3, c: 2},
            {a: 2, b: 1, c: 2},
            {a: 2, b: 2, c: 2},
            {a: 2, b: 3, c: 2},
            {a: 3, b: 1, c: 2},
            {a: 3, b: 2, c: 2},
            {a: 3, b: 3, c: 2},

            {a: 1, b: 1, c: 3},
            {a: 1, b: 2, c: 3},
            {a: 1, b: 3, c: 3},
            {a: 2, b: 1, c: 3},
            {a: 2, b: 2, c: 3},
            {a: 2, b: 3, c: 3},
            {a: 3, b: 1, c: 3},
            {a: 3, b: 2, c: 3},
            {a: 3, b: 3, c: 3}

        ];
        var db1 = ozone.rowStore.build(itemsInfo, items);

        function mkStr(array, column) {
            return array.map(function(a) { return a[column]; }).join('');
        }

        var pos1 = "111111111222222222333333333";
        var pos2 = "111222333111222333111222333";
        var pos3 = "123123123123123123123123123";

        var abc = ozone.transform.sort(db1, ['a', 'b', 'c']).toArray();
        expect(mkStr(abc, 'a')).toBe(pos1);
        expect(mkStr(abc, 'b')).toBe(pos2);
        expect(mkStr(abc, 'c')).toBe(pos3);

        var cba = ozone.transform.sort(db1, ['c', 'b', 'a']).toArray();
        expect(mkStr(cba, 'c')).toBe(pos1);
        expect(mkStr(cba, 'b')).toBe(pos2);
        expect(mkStr(cba, 'a')).toBe(pos3);

        var bac = ozone.transform.sort(db1, ['b', 'a', 'c']).toArray();
        expect(mkStr(bac, 'b')).toBe(pos1);
        expect(mkStr(bac, 'a')).toBe(pos2);
        expect(mkStr(bac, 'c')).toBe(pos3);
    });

});

describe("transform.aggregate", function() {

    function assertProperSize(size, db) {
        expect(db.size()).toBe(size);
        var numMatchingRows = 0;
        db.eachRow(function(row) {
            expect(db.field("Records").value(row)).toBe(size);
            numMatchingRows++;
        });
        expect(numMatchingRows).toBe(1);
    }

    var data = [
        {a: 'cat', b: 'MN', c:'red',    n: 4},  // 5 copies
        {a: 'dog', b: 'NY', c:'yellow', n: 8},  // 4 copies
        {a: 'cat', b: 'CA', c:'white',  n: 3},  // 3 copies
        {a: 'dog', b: 'SD', c:'yellow', n: 2},  // 2 copies
        {a: 'cat', b: 'TX', c:'red',    n: 7},  // unique

        {a: 'cat', b: 'MN', c:'red',    n: 6},
        {a: 'dog', b: 'NY', c:'yellow', n: 9},
        {a: 'cat', b: 'CA', c:'white',  n: 4},
        {a: 'dog', b: 'SD', c:'yellow'      },

        {a: 'cat', b: 'MN', c:'red',    n: 2},
        {a: 'dog', b: 'NY', c:'yellow', n: 8},
        {a: 'cat', b: 'CA', c:'white',  n: 3},

        {a: 'cat', b: 'MN', c:'red',    n: 8},
        {a: 'dog', b: 'NY', c:'yellow', n: 6},

        {a: 'cat', b: 'MN', c:'red',    n: 1}
    ];
    var fieldInfo = {
        a: {typeOfValue: "string"},
        b: {typeOfValue: "string"},
        c: {typeOfValue: "string"},
        n: {typeOfValue: "number", aggregationRule: "sum"}};
    var initialDb = ozone.rowStore.build(fieldInfo, data);
    var aggregatedRowDb = ozone.transform.aggregate( initialDb );
    var aggregatedColumnDb = ozone.columnStore.buildFromStore( aggregatedRowDb );


    it("Creates an accurate size column", function() {

        expect(aggregatedColumnDb.size()).toBe(data.length);
        expect(aggregatedColumnDb.rowCount()).toBe(5);

        assertProperSize(5, aggregatedColumnDb.filter('a', 'cat').filter('b', 'MN').filter('c', 'red'));
        assertProperSize(4, aggregatedColumnDb.filter('a', 'dog').filter('b', 'NY').filter('c', 'yellow'));
        assertProperSize(3, aggregatedColumnDb.filter('a', 'cat').filter('b', 'CA').filter('c', 'white'));
        assertProperSize(2, aggregatedColumnDb.filter('a', 'dog').filter('b', 'SD').filter('c', 'yellow'));
        assertProperSize(1, aggregatedColumnDb.filter('a', 'cat').filter('b', 'TX').filter('c', 'red'));
    });

    it("Merges with an aggregationRule correctly", function() {
        function assertSum(sum, filteredDb) {
            expect(filteredDb.rowCount()).toBe(1);
            filteredDb.eachRow(function(row) {
                expect(filteredDb.field('n').values(row)[0]).toBe(sum);
            });
        }

        assertSum(4+6+2+8+1, aggregatedColumnDb.filter('a', 'cat').filter('b', 'MN').filter('c', 'red'));
        assertSum(  8+9+8+6, aggregatedColumnDb.filter('a', 'dog').filter('b', 'NY').filter('c', 'yellow'));
        assertSum(    3+4+3, aggregatedColumnDb.filter('a', 'cat').filter('b', 'CA').filter('c', 'white'));
        assertSum(        2, aggregatedColumnDb.filter('a', 'dog').filter('b', 'SD').filter('c', 'yellow'));
        assertSum(        7, aggregatedColumnDb.filter('a', 'cat').filter('b', 'TX').filter('c', 'red'));
    });

    it("Reuses an existing size column", function() {
        var noStateRowDb = ozone.transform.aggregate(aggregatedColumnDb, {includeFields: ['a', 'c']});
        var noStateColumnDb = ozone.columnStore.buildFromStore(noStateRowDb);

        expect(noStateColumnDb.size()).toBe(data.length);
        expect(noStateColumnDb.rowCount()).toBe(3);

        assertProperSize(6, noStateColumnDb.filter('a', 'cat').filter('c', 'red'));
        assertProperSize(6, noStateColumnDb.filter('a', 'dog').filter('c', 'yellow'));
        assertProperSize(3, noStateColumnDb.filter('a', 'cat').filter('c', 'white'));
    });

    it("Includes only the specified columns and the size column", function() {
        var aggregated = ozone.transform.aggregate(initialDb, {includeFields: ['a', 'c'], sizeField: 'sz'});
        expect(aggregated.fields().length).toBe(3);
        expect(aggregated.field('a')).toBeTruthy();
        expect(aggregated.field('c')).toBeTruthy();
        expect(aggregated.field('sz')).toBeTruthy();
    });
});