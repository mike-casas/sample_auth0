'use strict';
angular.module('sampleApp')
  .controller('MainCtrl', function ($scope, $routeParams, fndata) {
    fndata.all()
    .success(function(data){
      var templatesarray=[];
       async.each(data, function(x, callback) {
          async.each(x.templates, function(i){
                templatesarray.push(i);
              });
          return callback(null, 'asi es'); // show that no errors happened
      }, function(err,result) {
          console.log(result);
          if(err) {
              console.log('There was an error' + err);
          } else {
              fncallback(templatesarray);
              //console.log(templatesarray);
          }
      });
    });

    function fncallback(templatesarray){
       var config=[];
      async.forEachOf(templatesarray, function (value, key, callback) {
        if (value.id===$routeParams.sampleID){
           config= value;
        }
        callback();
      }, function (err) {
        if (err) {console.error(err.message);}
        $scope.rule= config;
        console.log(config);
      });
    }

    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
