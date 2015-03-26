/**
 * Created by Erin Gaschott on 3/25/15, data comes from ColumnStoreSpec.js by David Leppik
 */

"use strict"

describe("testing of angular demo", function() {


    var data =
        "name,   color, animal, pin\n" +
        "Alice,    red,    cow, 101\n" +
        "Bob,    green,    dog, 102\n" +
        "Chris,   blue,    cat, 103\n" +
        "Doug,     red,    rat, 104\n" +
        "Ellie,  green,    cow, 105\n" +
        "Frank,   blue,    dog, 106\n" +
        "Greg,     red,    cat, 107\n" +
        "Hubert, green,    rat, 108\n";

    var storeParams = {
        fields: {
            name: {class: ozone.columnStore.UnIndexedField},
            pin: {
                class: ozone.columnStore.UnIndexedField,
                typeOfValue: "number",
                range: new ozone.Range(101, 108, true)
            }
        }
    };

    var rowStore = ozone.rowStore.buildFromCsv(data);
    var columnStore = ozone.columnStore.buildFromStore(rowStore, storeParams);
    var nameField = columnStore.field("name");
    var colorField = columnStore.field("color");
    var animalField = columnStore.field("animal");
    var pinField = columnStore.field("pin");

    var ValueFilter = ozone.ValueFilter;


    it("test true", function(){
        var a = 3;

        expect(a).toEqual(3);
    });



    describe('Angular Controllers', function(){

        describe('DataController', function() {
            var $httpBackend, ctrl;

           // beforeEach(function(){
                //angular.module('angularDemo', ['ngMock']);
                //angular.inject(fns);

           // })

            beforeEach(module('angularDemo'));

            beforeEach(inject(function(_$httpBackend_, $controller){
                $httpBackend = _$httpBackend_;
                $httpBackend.expectGET("../SummerOlympicMedals.json").
                    respond(data);

                ctrl = $controller('DataController');
            }));



            it("returns the correct number of distinct values", function(){
                expect(this.db.distinct(color)).toEqual(3);
                expect(this.db.distinct(name)).toEqual(8);
            });

            it("returns correct number of occurances", function(){
                expect(this.db.occuranceValue(animal, rat)).toEqual(2);
                expect(this.db.occuranceValue(color, green)).toEqual(3);
            });

            it("gives the expected display of field name", function(){
                expect(this.db.displayField(name)).toMatch("name has 9 distinct fields");
                expect(this.db.displayField(animal)).toMatch("animal has 4 distinct fields");
            });



        });

    });

});