'use strict';

//I still don't know how to connect this with the server routes.
angular.module('mean.baseFrame').config(['$stateProvider',
function ($stateProvider){
    $stateProvider.state('Expertise', {
        url: '/expertise',
        templateUrl: 'baseFrame/views/index.html'
    }).state('Expertise Table', {
        url: '/expertise/table',
        templateUrl: 'baseFrame/views/expertise_table.html'
    });
}]);
