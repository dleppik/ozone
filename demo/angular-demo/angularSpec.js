/**
 * Created by Erin Gaschott on 3/25/15, data comes from ColumnStoreSpec.js by David Leppik
 */

"use strict";

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


    describe('Angular Controllers:', function(){

        describe('the DataController:', function() {
            var $httpBackend, ctrl, scope;

            beforeEach(module('angularDemo'));

           /* beforeEach(function(){
                angular.module('angularDemo', ['ngMock']);
                angular.inject('angularDemo');

            });*/

            beforeEach(inject(function(_$httpBackend_, $rootScope, $controller){
                $httpBackend = _$httpBackend_;
                $httpBackend.expectGET("../SummerOlympicMedals.json").
                    respond(JSON.stringify(ozone.serialization.writeStore(columnStore)));

                scope = $rootScope.$new();
                ctrl = $controller('DataController');
            }));

            it("tests to see if data is loaded", function(){
                expect(ctrl.db).toEqual({});
                $httpBackend.flush();

                expect(ctrl.db).toBeTruthy();
                expect(ctrl.db.field("color")).toBeTruthy();
            });

        });

        describe ('the FilterController:', function(){



        });
    });

});