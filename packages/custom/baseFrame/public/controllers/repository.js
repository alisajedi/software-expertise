'use strict';

function showLoadingScreen(){
    angular.element('#loadingImage').css('display','block');
}

function hideLoadingScreen(){
    angular.element('#loadingImage').css('display','none');
}
var baseFrame = angular.module('mean.baseFrame');
baseFrame.controller('RepositoryController',
['$scope', '$http', '$location', '$resource',
function ($scope,  $http, $location, $resource) {
    findProject();

    // *************** SCOPE FUNCTIONS **************//

    //Change this to another controller
    $scope.selectTab = function (tab){
        angular.element('.tab').removeClass('active');
        angular.element('.tab-pane').addClass('hidden');

        if(tab == '.tabTable'){
            sendToTable();
        } else if(tab == '.tabGraph'){
            sendToGraph();
        }

        angular.element(tab).addClass('active');
        angular.element(tab).removeClass('hidden');
    }

    $scope.fullPopulateRepo = function(){
        var items = [
            'languages',
            'commits',
            'issues/comments',
            'commits/comments',
        ]

        for(var i in items){
            var item = items[i];
            showLoadingScreen();
            var Resource = $resource('/api/baseFrame/:projectId/populate/' +
                item);
            var filter = {
                projectId: $scope.selectedRepo._id
            }
            Resource.get(filter).$promise.then(function (response){
                hideLoadingScreen();
            });
        }
    }

    $scope.makeIssuesTags = function (){
        showLoadingScreen();
        var Resource = $resource('/api/baseFrame/:projectId/makeIssuesTags');
        var filter = {
            projectId: $scope.selectedRepo._id,
            project: $scope.selectedRepo
        }
        Resource.get(filter).$promise.then(function (response){
            hideLoadingScreen();
        });
    }

    /** Looks for repositories with the given filters
     */
    $scope.queryRepos = function () {
        showLoadingScreen();
        var URL = 'https://api.github.com/search/repositories?q=';
        if($scope.repositoryName)
            URL += $scope.repositoryName + '+in:name';
        if($scope.repoDescription)
            URL += '+' + $scope.repoDescription + '+in:description';
        if($scope.repoReadme)
            URL += '+' + $scope.repoReadme + '+in:readme';
        if($scope.repoUser)
            URL += '+user:' + $scope.repoUser;
        URL += '+fork:true&sort=stars&order=desc&per_page=100';

        $http.get(URL).then(function (response) {
            var results = response.data.items;

            var repos = [];
            for (var i in results) {
                var result = results[i];
                var repo = {
                    name: result.full_name,
                    _id: result.id,
                    language: result.language,
                    description: result.description
                };
                repos.push(repo);
            }
            $scope.repos = repos;
            hideLoadingScreen();
        }, function (response){
            hideLoadingScreen();
        });
    }

    $scope.saveProject = function(repo){
        var Project = $resource('/api/baseFrame/project/new/');
        Project.get(repo).$promise.then(function(project){
            getRepoInformation(repo);
        });
    }


    $scope.populateRepoResources = function (resource){
        showLoadingScreen();
        var Resource = $resource('/api/baseFrame/:projectId/populate/' + resource);
        var filter = {
            projectId: $scope.selectedRepo._id
        }
        Resource.get(filter).$promise.then(function (response){
            $scope.selectedRepo['empty' + resource] = false;
            hideLoadingScreen();
            getRepoInformation($scope.selectedRepo);
        }, function(response){console.log(response);});
    }

    /**
    * Displays the user portion of the expertise graph, based on StackOverflow
    * user tags.
    *
    * @param username - github username
    */
    $scope.selectUser = function (user){
        $scope.selectedUser = user;

        if(!user.soId){
            alert("User is not in StackOverflow.");
        }
        showLoadingScreen();
        sendToGraph();
        hideLoadingScreen();
    }

    $scope.deselect = function (resource){
        $scope['selected' + resource] = undefined;
        sendToGraph();
    }

    /**
    * display information based on issues
    *
    * @param issue - Dictionary with id, title and body from github issue
    */
    $scope.selectIssue = function (issue) {
        showLoadingScreen();
        $scope.selectedIssue = issue;

        if(!issue.parsed){
            var filter = {
                projectId: $scope.selectedRepo._id,
                _id: issue._id,
                project: $scope.selectedRepo
            };

            var Issue = $resource('/api/baseFrame/:projectId/makeIssuesTags');
            Issue.get(filter);
        }
        sendToGraph();
        sendToTable();
    }

    $scope.populateSOData = function() {
        showLoadingScreen();
        var filter = {
            soId: $scope.selectedUser.soId,
        }
        var url = '/api/baseFrame/user/:soId/populate/';
        var Resource = $resource(url + 'answers');
        Resource.get(filter);

        Resource = $resource(url + 'questions');
        Resource.get(filter);

        Resource = $resource(url + 'tags');
        Resource.get(filter).$promise.then(function (){
            hideLoadingScreen();
            $scope.selectedUser.soPopulated = true;
            sendToGraph();
        });
    }

    // *************** HELPER FUNCTIONS **************//

    /**
    * Gets the users and issues from the selected repository
    *
    * @param repo - The selected repository (id,name,language,description)
    */
    function getRepoInformation(repo) {
        $scope.selectedRepo = repo;
        $scope.search = false;
        $scope.repos = undefined;
        $scope.users = [];
        $scope.issues = [];
        $scope.selectedUser = undefined;
        $scope.selectedIssue = undefined;
        $scope.issueFilter = {
            assigned: 'true'
        };

        $scope.devFilter = {
            soUser: 'true'
        };

        $location.search('repoName', repo.name);

        showLoadingScreen();
        $scope.getRepoResources('issues');
        $scope.getRepoResources('users');
        hideLoadingScreen();
    }

    /**
    * Gets the github resources of the selected repository stored on the
    * database.
    *
    * @param resource - The desired resource for this repository (issues, users)
    */
    $scope.getRepoResources = function (resource){
        showLoadingScreen();
        var Resource = $resource('/api/baseFrame/:projectId/' + resource);
        var filter = {
            projectId: $scope.selectedRepo._id,
            assigned:  $scope.issueFilter.assigned,
            soUser: $scope.devFilter.soUser //Change this to send the entire filter or use two functions
        };
        console.log(filter);
        Resource.query(filter).$promise.then(function(resources){
            if(resources.length == 0){
                $scope.selectedRepo['empty' + resource] = true;
            }
            $scope[resource] = resources;
            hideLoadingScreen();
        }, function(response){console.log(response)});
    }

    function findProject(){
        $scope.search = true;
        var Project = $resource('/api/baseFrame/project/find/:name');
        var repoName = $location.search().repoName;
        if(repoName){
            Project.get({name: repoName}).$promise.then(function(project){
                getRepoInformation(project);
            });
        }
        angular.element('svg').remove();
    }

    function sendToTable(){
        var args = {};
        if($scope.selectedIssue){
            args.issueId = $scope.selectedIssue._id;
        }
        $scope.$broadcast('findMatches', args);
    }

    function sendToGraph(){
        hideLoadingScreen();
        var ids = {};
        if($scope.selectedIssue){
            ids.issueId = $scope.selectedIssue._id;
        }
        if($scope.selectedUser){
            ids.userId = $scope.selectedUser._id;
        }
        $scope.$broadcast('fetchGraphData', ids);
    }
}]);
