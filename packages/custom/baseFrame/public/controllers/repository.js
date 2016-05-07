'use strict';

function showLoadingScreen(){
    d3.select('#loadingImage').style('display','block');
}

function hideLoadingScreen(){
    d3.select('#loadingImage').style('display','none');
}

var baseFrame = angular.module('mean.baseFrame');

baseFrame.controller('RepositoryController',
['$scope', '$http', '$location', '$resource',
function ($scope,  $http, $location, $resource) {

    var tagsFromIssue;
    var tagsFromUserOnSO;


    // *************** SCOPE FUNCTIONS **************//

    $scope.populateSoTags = function(){
        populateRequest('/api/baseFrame/populateSoTags');
    }

    $scope.populateSoUsers = function(){
        populateRequest('/api/baseFrame/populateSoUsers');
    }

    $scope.populateCoOccurrences = function(){
        populateRequest('/api/baseFrame/populateCoOccurrences');
    }

    $scope.populateStopWords = function(){
        populateRequest('/api/baseFrame/populateStopWords');
    }
    /**
     * Looks for repositories with the given filters
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
        URL += '&sort=stars&order=desc&per_page=100';

        $http.get(URL).then(function (response) {
            var results = response.data.items;
            // console.log(response.headers());
            // TODO: Figure out how to get next items

            var repos = [];
            for (var i in results) {
                var repo = {
                    name: results[i].full_name,
                    id: results[i].id
                };
                repos.push(repo);
            }
            $scope.repos = repos;
            hideLoadingScreen();
        });
    }
    /**
    * Gets the users and issues from the selected repository
    *
    * @param repo - Select repository name
    */
    $scope.getRepoInformation = function (repo) {
        $scope.repos = undefined;
        $scope.selectedRepo = repo;
        showLoadingScreen();
        getRepoContributors(repo.name);
        getRepoIssues(repo.name);
        hideLoadingScreen();
    }

    $scope.saveProject = function(){
        console.log("entrou");
        var Project = $resource('/api/baseFrame/project/:id/:name');

        var project = Project.get({id: $scope.selectedRepo.id, name:$scope.selectedRepo.name});
        console.log(project);

    }

    /**
    * Displays the user portion of the expertise graph
    * I think this should be in a different file.
    *
    * @param username - github username
    */
    $scope.displayUserExpertise = function(username){
        $location.search('username', username);

        getSOIDForUser(username);

        /**
        * Makes an http post request to get the users matching SO information
        *
        * @param userName - GitHub username
        * @return soId - Stack Overflow id for the given username
        */
        function getSOIDForUser(userName){
            var apiCallUrl  = '/api/baseFrame/soIDFromUser'; //Not sure if this will work everytime
            $http({
                method: 'POST',
                url: apiCallUrl,
                data: 'gitName=' + userName,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).success(function (soId) {
                if(soId){
                    getSOTagsFromUser(soId);
                } else {
                    console.log('User is not on StackOverflow');
                    return 'User is not on StackOverflow';
                }
            });
        }

        /**
        * Gets the Stack Overflow tags related to the given user.
        *
        * @param soId - StackOverflow Id
        */
        function getSOTagsFromUser(soId){
            var soURLStr = 'http://api.stackexchange.com/2.2/users/' +
            soId + '/tags?pagesize=100&order=desc&sort=popular&site=stackoverflow&filter=!-.G.68phH_FJ'
            $http.get(soURLStr).success(function(soTags) {
                tagsFromUserOnSO = {}
                for(let tag of soTags.items){
                    tagsFromUserOnSO[tag.name] = tag.count;
                }
                sendToGraph();
            });
        }
    }

    /**
    * display information based on issues
    *
    * @param issue - Dictionary with id, title and body from github issue
    */
    $scope.getIssueTags = function (issue) {
        $location.search('issueId', issue.id);

        //Any word from the issue that is an SO tag will be in this array.
        //This is the array that is sent to '/api/baseFrame/coOccurrence'
        showLoadingScreen();
        $http({
            method: 'POST',
            url: '/api/baseFrame/getIssueTags',
            data: 'title=' + issue.title + '&body=' + issue.body,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).success(function (response) {
            hideLoadingScreen();
            tagsFromIssue = response;
            sendToGraph();
        });
    }


    // *************** HELPER FUNCTIONS **************//

    /**
    * Executes a populate request on the server
    *
    * @param url - The url to have populate the data
    */
    function populateRequest(url){
        showLoadingScreen();
        $http({
            method: 'POST',
            url: url,
            data: '',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).success(function (response){
            console.log("Success");
            hideLoadingScreen();
        });
    }


    /**
    * Gets the contributors of the selected repository
    *
    * @param repo - Name (user/name) of the selected repo
    */
    function getRepoContributors(repo){
        $location.search('repoName', repo);
        $scope.repoName = repo;

        var contributorsURL = 'https://api.github.com/repos/' +
          repo +
          '/contributors';

        $http.get(contributorsURL).success(function (results) {
            $scope.users = [];
            for (var result of results) {
                $scope.users.push( result.login );
            }
        });
    }

    /**
    * Gets the github issues of the selected repository
    *
    * @param repo - Name (user/name) of the selected repo
    */
    function getRepoIssues(repo){
        var issuesURL = 'https://api.github.com/repos/' +
          repo +
          '/issues';
        $http.get(issuesURL).success(function (results) {
            $scope.issues = [];
            for (var result of results) {
                var issue = {
                    id: result.id,
                    body: result.body,
                    title: result.title
                }

                $scope.issues.push(issue);
            }
        });
    }

    function sendToGraph(){
        var graphs = new ExpertiseGraph();
        graphs.drawWithNewData(tagsFromIssue, tagsFromUserOnSO, $http);
    }
}]);
