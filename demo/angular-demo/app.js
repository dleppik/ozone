/**
 * Created by Erin Gaschott and Reilly Grant on 3/24/15.
 */

(function(){

    var app = angular.module('angularDemo', []);

    app.controller('DataController', [ '$scope', '$http', function($scope, $http){

        var dataCtrl=this;

        $scope.allPossibleFilters=[];

        $scope.unfilteredDb = {}; // data that will not have filters applied
        $scope.db={};

        $scope.fields = [];
        $scope.recievedData=false;
        $scope.currentFilters= [];


        $http.get("../SummerOlympicMedals.json")
            .success(function(data){
                $scope.unfilteredDb = ozone.serialization.readStore(data);
                $scope.fields = $scope.unfilteredDb.fields();
                $scope.recievedData = true;
                $scope.db = $scope.unfilteredDb;
                dataCtrl.configureAllPossibleFilters($scope.fields);
            });


        this.configureAllPossibleFilters=function(fields){
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                var values = field.valueList;
                var id = field.identifier;
                var name= field.displayName;
                var applied = false;
                $scope.allPossibleFilters.push({ values : values,
                    id     : id,
                    applied: applied,
                    name   : name,
                    sValue : ""});
            }
            return $scope.allPossibleFilters;
        };


        this.addFilter=function(identifier,value){
            $scope.currentFilters.push({ id:identifier, value:value });
        };


        this.applyFilters= function() {
            if($scope.recievedData){
                $scope.db=$scope.unfilteredDb;
                var cFilters= $scope.currentFilters;
                for(var i=0;i<cFilters.length;i++) {
                    var cFilter= cFilters[i];
                    $scope.db = $scope.db.filter(cFilter.id, cFilter.value);
                }
                $scope.fields= $scope.db.fields();
            }

        };


        this.clearFilters=function(){
            $scope.db=$scope.unfilteredDb;
            $scope.currentFilters=[];
        };


        this.updateFilters= function(){
            this.clearFilters();
            for(var i =0; i<$scope.allPossibleFilters.length;i++){
                var choiceFilter=$scope.allPossibleFilters[i];
                if(choiceFilter.applied){
                    this.addFilter(choiceFilter.id,choiceFilter.sValue);
                }
            }
            this.applyFilters();
        };


        this.cantSubmit= function(){
            for(var i= 0; i<$scope.allPossibleFilters.length; i++ ){
                var chosenFilter= $scope.allPossibleFilters[i];
                if(chosenFilter.applied && chosenFilter.sValue===""){
                    return true;
                }
            }
            return false;
        };


        this.distinctValueString = function(field){
           var p = $scope.db.partition(field);

            var counter = 0;
            for (var name in p){
               counter++
            }

            if(counter == 0)
                return "no values";
            else if(counter == 1)
                return "1 distinct value";
            else
                return counter + " distinct values";
        };


        this.occuranceValue = function(field,occurance) {
                return $scope.db.filter(field,occurance).size;
        };


        this.displayField=function(field){
            return field.displayName + ", " + this.distinctValueString(field);
        };


    }]);

})();