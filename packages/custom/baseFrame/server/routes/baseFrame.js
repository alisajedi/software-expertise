'use strict';

module.exports = function (BaseFrame, app, auth, database) {
    //See how to nest this.
    var base = '/api/baseFrame/';
    var controllers = '../controllers/';

    var projects = require(controllers + 'projects')(BaseFrame);
    app.route(base + 'project/find/:name')
        .get(projects.find);
    app.route(base + 'project/new/')
        .get(projects.save);
    app.route(base + ':projectId/populate/users')
        .get(projects.populateContributors);
    app.route(base + ':projectId/populate/issues')
        .get(projects.populateIssues);
    app.route(base + ':projectId/populate/commits')
        .get(projects.populateCommits);
    app.route(base + ':projectId/populate/languages')
        .get(projects.populateLanguages);
    app.route(base + ':projectId/populate/issues/comments')
        .get(projects.populateIssuesComments);
    app.route(base + ':projectId/populate/commits/comments')
        .get(projects.populateCommitsComments);


    var issues = require(controllers + 'issues')(BaseFrame);
    app.route(base + ':projectId/issues/')
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
    app.route(base + 'populate/SoTags')
        .post(tags.populateSoTags);
    app.route(base + 'populate/CoOccurrences')
        .post(tags.populateCommonOccurrences);
    app.route(base + 'populate/SoUsers')
        .post(tags.populateSoUsers);
    app.route(base + 'issueTags')
        .post(tags.getIssueTags);
    app.route(base + 'coOccurrence')
        .post(tags.coOccurrence);

    var stopwords = require(controllers + 'stopWords')(BaseFrame);

    app.route(base + 'populate/StopWords')
        .post(stopwords.populateStopWords);
};
