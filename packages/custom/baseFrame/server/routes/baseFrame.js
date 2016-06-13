'use strict';

module.exports = function (BaseFrame, app, database) {
    //See how to nest this.
    var base = '/api/baseFrame/';
    var controllers = '../controllers/';

    var projects = require(controllers + 'projects')(BaseFrame);
    app.route(base + 'project/get/:name')
        .get(projects.get);
    app.route(base + 'project/find')
        .get(projects.find);
    app.route(base + 'project/new/')
        .get(projects.save);

    var issues = require(controllers + 'issues')(BaseFrame);
    app.route(base + ':projectId/issues')
        .get(issues.find);

    var users = require(controllers + 'users')(BaseFrame);
    app.route(base + ':projectId/users')
        .get(users.find);
    app.route(base + 'user/:soId/populate/tags')
        .get(users.populateTags);
    app.route(base + 'user/:soId/populate/answers')
        .get(users.populateAnswers);
    app.route(base + 'user/:soId/populate/questions')
        .get(users.populateQuestions);

    var tags = require(controllers + 'tags')(BaseFrame);
    app.route(base + ':projectId/makeIssuesTags')
        .get(tags.makeIssuesTags);

    var admin = require(controllers + 'admin')(BaseFrame);
    app.route(base + 'generate')
        .get(admin.generate);
    app.route(base + 'populate')
        .get(admin.populate);
    app.route(base + 'download')
        .get(admin.download);
    app.route(base + 'check')
        .get(admin.check);
    /** My idea here is to be able to fetch data from different places.
    * The modes, for now, will be 'default' and 'default' to fetch data from our
    * database (populated from github/SO).
    **/
    var graph = require(controllers + 'graph')(BaseFrame);
    app.route(base + ':modeIssue/:modeUser/graphData')
        .get(graph.getDataForGraph);
    app.route(base + 'calculate/:similarity/')
        .get(graph.calculateSimilarity);
    app.route(base + 'find/:issueId/matches')
        .get(graph.findMatches);
    app.route(base + ':projectId/calculate/matches/averages')
        .get(graph.findMatchAverage);
};
