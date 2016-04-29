'use strict';

angular.module('sampleApp').service('fndata', function ($http){
  var _self = {};

  _self.all= function (){
    return $http.get('scripts/data.js');
  };
  return _self;
});

