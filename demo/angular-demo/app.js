/**
 * Created by Erin Gaschott and Reilly Grant on 3/24/15.
 */

(function(){

    var app = angular.module('angularDemo', []);


    app.controller('DataController', [ '$scope', '$http', function($scope, $http){

        var dataCtrl=this;

        $http.get("../SummerOlympicMedals.json")
            .success(function(data){
                $scope.nfdb = ozone.serialization.readStore(data);
                $scope.fields = $scope.nfdb.fields();
                $scope.recievedData = true;
                $scope.db = $scope.nfdb;
                dataCtrl.processFields($scope.fields);
            });



        $scope.choiceFilters=[];


        this.cantSubmit= function(){
            for(var i= 0; i<$scope.choiceFilters.length; i++ ){
                var chosenFilter= $scope.choiceFilters[i];
                if(chosenFilter.applied && chosenFilter.sValue===""){
                    return true;
                }
            }
            return false;
        };


        this.updateFilters= function(){
            this.clearFilters();
            for(var i =0; i<$scope.choiceFilters.length;i++){
                var choiceFilter=$scope.choiceFilters[i];
                if(choiceFilter.applied){
                    this.addFilter(choiceFilter.id,choiceFilter.sValue);
                }
            }
            this.applyFilters();
        };

        this.processFields=function(fields){
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                var selector = this.selectorForField(field);
                var values = field.valueList;
                var id = field.identifier;
                var name= field.displayName;
                var applied = false;
                $scope.choiceFilters.push({selector: selector,
                                            values : values,
                                            id     : id,
                                            applied: applied,
                                            name   : name,
                                            sValue : ""});
            }
            return $scope.choiceFilters;
        };

        this.selectorForField=function(field){
                var selector;
                if (field.distinctValueEstimate() < 5) {
                    selector = "checkbox";

                }
                else if (field.distinctValueEstimate() < 100 ) {
                    selector = "drop-down menu";

                }
                else {
                    selector = "search field";

                }
            return selector;
        };



        $scope.nfdb = {}; // data that will not have filters applied
        $scope.db={};

        $scope.fields = [];
        $scope.recievedData=false;
        $scope.currentFilters= [];


        this.distinct = function(field){
            return field.distinctValueEstimate()+" distinct values.";
        };

        this.addFilter=function(identifier,value){
            $scope.currentFilters.push({ id:identifier, value:value });
        };

        this.clearFilters=function(){
            $scope.db=$scope.nfdb;
            $scope.currentFilters=[];
        };

        this.occuranceValue = function(field,occurance) {
                return $scope.db.filter(field,occurance).size;
        };

        /*this.occuranceDisplay= function(field,occurance){
                return occurance + ",  "+ data.occuranceValue(field,occurance)
        }*/

        this.displayField=function(field){
            return field.displayName + " has " + this.distinct(field);
        };

        this.applyFilters= function() {
          if($scope.recievedData){
              $scope.db=$scope.nfdb;
              var cFilters= $scope.currentFilters;
              for(var i=0;i<cFilters.length;i++) {
                  var cFilter= cFilters[i];
                  $scope.db = $scope.db.filter(cFilter.id, cFilter.value);
              }
              $scope.fields= $scope.db.fields();
          }
        };



    }]);


})();