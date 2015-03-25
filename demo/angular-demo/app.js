/**
 * Created by ecgaschott on 3/24/15.
 */

(function(){

    var app = angular.module('angularDemo', []);

    app.controller('FilterController',function(){
        this.currentFilters=[];

    });

    app.controller('DataController', [ '$http', function($http){
        var dataCtrl = this;
        dataCtrl.db = {};

        $http.get("../SummerOlympicMedals.json")
            .success(function(data){
                dataCtrl.db = ozone.serialization.readStore(data);
                dataCtrl.fields = dataCtrl.db.fields();
            });

        this.distinct = function(field){
            return field.distinctValueEstimate()+" distinct values.";
        }

        this.occuranceValue = function(field,occurance) {
            if(field.valueMap)
                return field.valueMap[occurance]["indexes"].length;
            else return "Data is not indexed";
        }

        this.fields = [];

        this.displayField=function(field){
            return field.displayName + " has " + this.distinct(field);
        }

        this.applyFilter= function() {
          if(this.db!=={}){
              this.db= this.db.filter('Gender','M');
          }
        }

    }]);


})();