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

            var $controller;

            beforeEach(inject(function(_$controller_){
                // The injector unwraps the underscores (_) from around the parameter names when matching
                $controller = _$controller_;
            }));


            beforeEach(inject(function(_$httpBackend_, $rootScope){
                $httpBackend = _$httpBackend_;
                $httpBackend.expectGET("../SummerOlympicMedals.json").
                    respond(JSON.stringify(ozone.serialization.writeStore(columnStore)));

                scope = $rootScope.$new();
                ctrl = $controller('DataController', { $scope: scope });
            }));


            it("loaded data correctly and initilizes properly", function(){
                expect(scope.db).toEqual({});
                $httpBackend.flush();

                expect(scope.db).toBeTruthy();

                expect(scope.currentFilters).toEqual([]);
                expect(scope.allPossibleFilters).toBeTruthy();


                expect(scope.unfilteredDb).toBeTruthy(); // data that will not have filters applied;
                expect(scope.db).toBeTruthy();

                expect(scope.fields).toBeTruthy();
                expect(scope.recievedData).toEqual(true);
            });

            it("updates and changes filters correctly",function(){
                $httpBackend.flush();

                var initialdb= scope.db;
                ctrl.addFilter('color','red');
                expect(scope.currentFilters).not.toEqual([]);
                expect(initialdb).toEqual(scope.db);

                var field=scope.fields[1];
                this.checkFilterNotApplied=function() {
                    expect(ctrl.occuranceValue(field, "red")).not.toEqual(0);
                    expect(ctrl.occuranceValue(field, "green")).not.toEqual(0);
                    expect(ctrl.occuranceValue(field, "blue")).not.toEqual(0);
                };
                ctrl.applyFilters();
                expect(ctrl.occuranceValue(field,"red")).not.toEqual(0);
                expect(ctrl.occuranceValue(field, "green")).toEqual(0);
                expect(ctrl.occuranceValue(field,"blue")).toEqual(0);
                ctrl.clearFilters();
                this.checkFilterNotApplied();
                expect(scope.currentFilters).toEqual([]);
                scope.allPossibleFilters[0].applied=true;

                expect(ctrl.cantSubmit()).toBe(true);


                for(var i=0; i<scope.allPossibleFilters.length; i++){
                    scope.allPossibleFilters[i].sValue="a";
                }

                expect(ctrl.cantSubmit()).toBe(false);
            });


        });
    });

});