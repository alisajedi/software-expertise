'use strict';
/**
 * Generates the expertise table
 **/
var controllerCallback = function ($scope, $resource, $uibModal, screen) {
    $scope.assigneePosition = undefined

    var findMatches = function (event, params) {
        if(params.issueId){
            $scope.bestUsers = undefined;
            screen.loading();
            var Match = $resource('api/expertise/find/:source/:issueId/matches');

            Match.get(params).$promise.then(function (matches){
                $scope.bestUsers = matches.similarities;
                screen.ready();
            }, function (error) {
                screen.ready();
                alert('Error! Contact the system administrator');
            });
            $scope.selectedUsers = [];
        }
    }

    $scope.parameter = '-cosine';
    $scope.selectedUsers = [];
    $scope.comparison = false;

    $scope.selectUser = function (user){
        user.selected = !user.selected;
        if(user.selected){
            $scope.selectedUsers.push(user);
        } else {
            var index = $scope.selectedUsers.indexOf(user);
            $scope.selectedUsers.splice(index, 1);
        }
    }

    $scope.compare = function (){
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'compare-table',
            controller: 'ModalController',
            size: 'lg',
            resolve: {
                users: function (){
                    return $scope.selectedUsers;
                }
            }
        });
    }

    $scope.sort = function(item){
        $scope.parameter = item;
    }

    $scope.$on('findMatches', findMatches);
}

// Please note that $uibModalInstance represents a modal window (instance) dependency.
// It is not the same as the $uibModal service used above.

angular.module('mean.expertise')
.controller('ModalController', function ($scope, $uibModalInstance, users) {
    $scope.users = users;

    $scope.ok = function () {
        $uibModalInstance.close();
    };

    $scope.parameter = '-cosine';
    $scope.sort = function(item){
        $scope.parameter = item;
    }
});

var expertise = angular.module('mean.expertise');
expertise.controller('TableController', controllerCallback);
