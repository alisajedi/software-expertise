'use strict';

var mongoose = require('mongoose');
var SoUser = mongoose.model('SoUser');

var request = require('request');


//TODO: Refactor this class to have a common class with issue or anything that
// depends on the git api.
module.exports = function (BaseFrame){
    return {
        /** Looks for the given user (req.params) in the database.
        *
        * @param req - Express request
        * @param res - Express response
        */
        find: function (req, res){
            var repo = {repositories: req.params.projectId};

            SoUser.find(repo, 'soId _id tags', {sort: '-soId -updatedAt'}, function(err, users){
                res.send(users);
            });
        },

        /** Stores in the database all the users from the given repository.
        *
        * @param req - Express request
        * @param res - Express response
        */
        populate: function(req, res){
            var repo = req.params;

            var options = {
                headers: {
                    'User-Agent': 'software-expertise',
                    Accept: 'application/vnd.github.v3+json'
                },
                url: 'https://api.github.com/repositories/' +
                  repo.projectId + '/contributors?per_page=100'
            };

            /** Callback to the request. This will create the users and save
            * them in the database.
            *
            * @param error - Any errors ocurred during the http request
            * @param response - The response from the other server
            * @param body - The response body (string). Final html or JSON.
            */
            var callback = function (error, response, body){
                if (!error && response.statusCode == 200) {
                    var users = [];
                    var results = JSON.parse(body);

                    for (var i in results) {
                        var result = results[i];
                        var user = {
                            gitHubId: result.id,
                            $addToSet: {repositories: repo.projectId}
                        };

                        SoUser.update({_id: result.login}, user, {upsert: true}, function(err){
                            if(err){
                                console.log(err.message);
                            }else{
                                console.log('User saved successfully!');
                            }
                        });
                    }
                } else {
                    console.log(body);
                    res.sendStatus(500);
                }
                nextRequest(response.headers.link);
            }
            request(options, callback);
            res.sendStatus(200);

            /** This reads and parses the link header in GitHub API to get the
            * next url and avoid infinite loop (next of the last page
            * is the first one). This is specific for the GitHub API!
            *
            * @param link - Value of headers['link'] from the response
            */
            function nextRequest(link){
                if(link){
                    //The first entry of the links array is the next page
                    var next = link.split(', ')[0];
                    //This should be always 0, but just to make sure, will get the indexOf
                    var begin = next.indexOf('<');
                    var end = next.indexOf('>');

                    //This gets string = [begin, end)
                    var new_url = next.substring(begin + 1, end);

                    var lastEqualsIndex = new_url.lastIndexOf('=');
                    var nextPage = new_url.slice(lastEqualsIndex + 1, next.length);
                    if(nextPage != 1){
                        options.url = new_url;
                        request(options, callback);
                    }
                }
            }
        },

        populateUserTags: function (req, res){
            /** Filter is generated by stackexchange api. This one includes
            * count, name. Page and total are added to .wrapper fields.
            * To understand better how this works, check
            *https://api.stackexchange.com/docs/tags-on-users#pagesize=100&order=desc&sort=popular&ids=696885&filter=!4-J-dtwSuoIA.NOpA&site=stackoverflow
            */
            var url = '/tags?pagesize=100&order=desc&sort=popular&site=stackoverflow&filter=!4-J-dtwSuoIA.NOpA';

            var buildModels = function(items){
                var tags = [];
                for(var i in items){
                    var result = items[i];
                    var tag = {
                        _id: result.name,
                        count: result.count
                    };
                    tags.push(tag);
                }

                return {
                    dataSet: "tags",
                    models: tags
                }
            }

            stackOverflowRequest(url, req.params, res, buildModels);
        },

        populateUserAnswers: function (req, res){
            var url = '/answers?pagesize=100&order=desc&sort=activity&site=stackoverflow&filter=!t)IWIB_jIM*PQgVlKVx*bpK7iv9Avm9';

            var buildModels = function(items){
                var answers = [];
                for(var i in items){
                    var result = items[i];
                    var question = {
                        _id: result.answer_id,
                        questionId: result.question_id,
                        body: result.body,
                        tags: result.tags
                    };
                    answers.push(question);
                }

                return {
                    dataSet: "answers",
                    models: answers
                }
            }

            stackOverflowRequest(url, req.params, res, buildModels);
        },

        populateUserQuestions: function (req, res){
            var ids = req.params;

            var url = '/questions?pagesize=100&order=desc&sort=activity&site=stackoverflow&filter=!)re8-BBbvk3FbjEOb-AI';

            var buildModels = function(items){
                var questions = [];
                for(var i in items){
                    var result = items[i];
                    var question = {
                        _id: result.question_id,
                        title: result.title,
                        body: result.body,
                        tags: result.tags
                    };
                    questions.push(question);
                }

                return {
                    dataSet: "questions",
                    models: questions
                }
            }

            stackOverflowRequest(url, req.params, res, buildModels);
        }
    }

    /** This function should be used to do any StackOverflow requests. It
    * represents the basic flow to the StackExchange API. It retrives the
    * data and stores in the database. It checks for pagination following the
    * StackExchange pattern.
    *
    * @param url - The url that will receive the request. It's important that
        there is no page specified in. The pagination will be added as needed.
    * @param ids - An object with soId and userId to use in the model building.
    * @param res - The express response to be sent after the data is fetched.
    * @param callback - A callback to build the models. Because every model has
        different items and saving methods, this should be built in the Express
        function that calls this request.
    */
    function stackOverflowRequest(specificUrl, ids, res, callback){
        /* StackOverflow requests are compressed, if this is not set, the data
        * won't be readable.
        */
        var url = 'https://api.stackexchange.com/2.2/users/' + ids.soId +
            specificUrl;
        var options = {
            headers: {
                'Accept-Encoding': 'gzip'
            },
            gzip: true,
            url: url
        };

        request(options, function (error, response, body){
            if (!error && response.statusCode == 200) {
                var results = JSON.parse(body);
                console.log('Page ' + results.page);

                var build = callback(results.items);

                var updateFields = {
                    $addToSet: {}
                };

                updateFields.$addToSet[build.dataSet] = {
                    $each: build['models']
                };

                SoUser.findOne(ids, '_id soId tags', function(err, user){
                    if(err){
                        console.log(err.message);
                    }else{
                        user[build.dataSet] = build.models;
                        user.save(function (new_err){
                            if(!res.headersSent){
                                res.send(user);
                            }
                            console.log('User updated successfully!');
                        });
                    }
                });

                //Check for next page
                if(results.has_more){
                    var new_url = url + '&page=' + (parseInt(results.page) + 1);
                    options.url = new_url;
                    request(options, callback);
                }

            } else {
                console.log(body);
                if(!res.headersSent){
                    res.status(500).send(body);
                }
            }
        });
    }
}
