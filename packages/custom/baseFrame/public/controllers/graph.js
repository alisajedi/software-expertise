'use strict';
/**
 * Class that handles drawing of the expertise graph
 **/

function showLoadingScreen(){
    angular.element('#loadingImage').css('display','block');
}

function hideLoadingScreen(){
    angular.element('#loadingImage').css('display','none');
}
var controllerCallback = function ($scope,  $http, $resource) {
    $scope.graphData = {
        nodes: [],
        links: []
    };

    $scope.graphOptions = {
        occurrencesSo: 'regular',
        tagText: 'sqrt',
        direction: 'undirected'
    };

    $scope.similarityOptions = {
        type: 'cosine'
    };

    var fetchGraphData = function (event, params){
        showLoadingScreen();
        var GraphData = $resource('api/baseFrame/:modeIssue/:modeUser/graphData');
        params.modeIssue = 'default';
        params.modeUser = 'default';
        GraphData.get(params).$promise.then(function (graphData){
            $scope.graphData.nodes = graphData.nodes;
            $scope.graphData.links = graphData.links;
            drawGraph(graphData);
            if(params.issueId && params.userId){
                $scope.applySimilarityOptions();
            } else {
                $scope.similarity = undefined;
                $scope.methods = undefined;
            }
            hideLoadingScreen();
        });
    }

    var findMatches = function (event, params) {
        if(params.issueId){
            $scope.issueId = params.issueId;
            showLoadingScreen();
            var Match = $resource('api/baseFrame/find/:issueId/match/:similarity');
            params.similarity = $scope.similarityOptions.type;

            Match.get(params).$promise.then(function (matches){
                $scope.bestUsers = matches.similarities;
                $scope.similaritiesAmount = matches.amount;
                hideLoadingScreen();
            });
        }
    }

    $scope.$on('fetchGraphData', fetchGraphData);

    $scope.$on('findMatches', findMatches);

    $scope.applyGraphOptions = function (){
    }

    $scope.applySimilarityOptions = function (){
        showLoadingScreen();
        var Similarity = $resource('api/baseFrame/calculate/:similarity');

        var params = {
            similarity: $scope.similarityOptions.type
        };

        params.nodes = $scope.graphData.nodes
        Similarity.get(params).$promise.then(function (response){
            $scope.similarity = response.similarity;
            $scope.methods = response.args;
            findMatches(null, {issueId: $scope.issueId});
        });
        hideLoadingScreen();
    }
}

var baseFrame = angular.module('mean.baseFrame');
baseFrame.controller('GraphController', ['$scope', '$http', '$resource', controllerCallback]);

function drawGraph(graphData){
    var width = $('#expertiseGraph').innerWidth();
    var height = $('#leftSelectionPanel').innerHeight();

    var MAX_DISTANCE = Math.min(width, height) - 50;
    var MIN_DISTANCE = MAX_DISTANCE/3;

    var calculateDistance = function (edge){
        var num = 2 * edge.occurrences;
        var den = edge.source.issueCount + edge.target.issueCount;

        if(den == 0){
            den = edge.source.userCount + edge.target.userCount;
            if(den == 0){
                return 0;
            }
        }

        var distance = num/den;
        return Math.min(MAX_DISTANCE, distance + MIN_DISTANCE);
    }

    var force = d3.layout.force()
        .size([width, height])
        .charge(-400)
        .linkDistance(calculateDistance)
        .on("tick", tick);

    var drag = force.drag()
        .on("dragstart", dragstart);

    d3.select('svg').remove(); //Remove old svg before adding a new one.

    var svg = d3.select('#expertiseGraph').append('svg')
        .attr('width', width)
        .attr('height', height);

    var link = svg.selectAll(".link");
    var node = svg.selectAll(".node");

    /* In order to draw the graph, force must receive an ARRAY of nodes.
    * Each node must have at least a name.
    *
    * You must also pass an ARRAY of links. Each link must have a source
    * and a target, both are INDEXES of a node.
    **/

    force
        .nodes(graphData.nodes)
        .links(graphData.links)
        .start();

    link = link.data(graphData.links)
        .enter().append("line")
        .attr("class", "link");

    /* Force graphs don't accept a circle with any other data, like a label.
    * To show any other information, a 'g' tag is necessary (group)
    **/
    node = svg.selectAll('.node')
        .data(graphData.nodes)
        .enter().append('g')
        .attr('class', 'node')
        .on("dblclick", dblclick)
        .call(drag);

    node.append('text')
        .attr('dx', 12)
        .text(function(d) { return d._id });

    node.append("circle")
        .attr('r', function(d) { return calculateCircleRatio(d.commonCount); })
        .style('fill', 'purple');

    node.append("circle")
        .attr('r', function(d) {
            var a = 0;
            var origin = 'none';
            if(d.userCount > d.issueCount){
                d.fill = 'lightblue';
                a = calculateCircleRatio(d.userCount);
                var origin = 'user';

            } else if(d.userCount == d.issueCount) {
                d.fill = '';
                a = 0;//return 0;
                var origin = 'equals';

            } else {
                d.fill = 'lightsalmon';
                a = calculateCircleRatio(d.issueCount);
                var origin = 'issue';

            }
            console.log(d._id, d.userCount, d.issueCount, a, origin);
            return a;
        })
        .style('fill', function (d) {
            return d.fill;
        });

    function tick() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
    }

    function dblclick(d) {
        d3.select(this).classed("fixed", d.fixed = false);
    }

    function dragstart(d) {
        d3.select(this).classed("fixed", d.fixed = true);
    }
}

var calculateCircleRatio = function (counter){
    var MIN_RATIO = 5;
    var result = 0;
    if(counter > 10){
        var log = Math.log10(counter);
        if(log != 0){
            result = 1/log;
        }
    }
    // var MAX_RATIO = 15; //Add max ratio because 1 is too small to see
    return result + MIN_RATIO;
    // return (1 - result) * MAX_RATIO || MIN_RATIO;
}
