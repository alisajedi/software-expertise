'use strict';

//Module dependencies (following the Articles model)
var mongoose = require('mongoose');
var Tag = mongoose.model('Tag');
var SoUser = mongoose.model('SoUser');
var CommonOccurrence = mongoose.model('CommonOccurrence');

var fs = require('fs');
var cf = require('crossfilter');
var d3 = require('d3');

/** The callback called once each file is read. It creates the models and
* save all of them to the database (as one big collection).
*
* @param err - The error (if any) generated from opening/reading the file.
* @param result - The read file as a variable
* @param res - The response for the route
* @param MongooseModel - The model that is responsible for the database connection.
*/
function readFilesCallback(err, result, res, MongooseModel){
    if(err) console.error(err);
    else {
        var convertResults = d3.tsv.parse(result);
        console.log('Data file loaded');

        /*I am still not sure if this is the best approach of if I should
        * copy each result. Probably, it will have the same results in the end.
        */
        var models = createModel(convertResults, MongooseModel.modelName);

        console.log('Models created. Saving to the database.');
        /*Find a way of telling the user that the common occurrences will take a
        *long time. Maybe send the response before saving.
        */
        MongooseModel.collection.insert(models, function(err){
            if(err){
                console.log(err.message);
            }else{
                console.log('Models saved successfully!');
            }
        });
        res.sendStatus(200);
    }
}
/** This receives the converted results from reading a file
* and returns an array with models based on these results.
*
* @param convertResults - an array of dicts with the first row as keys
* @param modelName - The name of model that will be created.
* @return array of models to be saved on the database.
*/
function createModel(convertResults, modelName){
    var models = [];

    for(var index in convertResults){
        var result = convertResults[index];
        var model = {};

        /*The keys here (result.key) are the keys in the file (first row).
        * If the file pattern changes, The results will be undefined
        * and, probably, one erraneous occurence will
        * be saved in the database.
        */

        switch (modelName) {
            case 'Tag':
                model['name'] = result.TagName;
                model['soTotalCount'] = result.Count;
                break;
            case 'SoUser':
                model['soId'] = result.SOId;
                model['gitUsername'] = result.login;
                model['email'] = result.email;
            case 'CommonOccurrence':
                model['source'] = result.Tag1 ;
                model['target'] = result.Tag2 ;
                model['occurrences'] = result.CoOccurrence;
        }

        models.push(model);
    }

    return models;
}

module.exports = function (Tags){
    console.log('load data files 0/3');
    return {
        populateSoTags: function (req, res){
            fs.readFile('tags.tsv', 'utf8', function (err, result){
                readFilesCallback(err, result, res, Tag);
            });
        },

        populateCommonOccurrences: function (req, res){
            fs.readFile('coOccurrences.tsv', 'utf8', function (err, result){
                readFilesCallback(err, result, res, CommonOccurrence);
            });
        },

        populateSoUsers: function (req, res){
            fs.readFile('commonUsers.tsv', 'utf8', function(err, result){
                readFilesCallback(err, result, res, SoUser);
            });
        },

        getIssueTags: function(req, res){
            var allTags = {};
            var tagsFromIssue = {};

            var issue = req.body;

            var title = issue.title.toLowerCase().split(' ');
            var allWords = issue.body.toLowerCase().split(' ');

            for(var index in title) {
                var word = title[index];
                allWords.push(word);
            }
            Tag.find({name: {$in: allWords }}, 'name soTotalCount', function(err, tags){
                if(err){
                    console.log(err.msgerror);
                    return {};
                }

                for(var index in tags){
                    //I don't have the count for the issue right now.
                    tagsFromIssue[tags[index].name] = 1;
                }

                res.json(tagsFromIssue);
            });

            function checkWord(word){
                if(allTags[word] !== undefined){
                    if(tagsFromIssue[word] === undefined){
                        tagsFromIssue[word] = 1;
                    }else{
                        tagsFromIssue[word] += 1;
                    }
                }
            }
        },

        soIDFromUser: function(req, res){
            var gitUsername = req.body.gitName;
            SoUser.findOne({gitUsername: gitUsername}, 'soId', {lean:true},
            function(err, user){
                if(user){
                    res.json(user.soId);
                }else {
                    res.json(undefined);
                }
            });
        },

        coOccurrence: function (req, res) {
            //These tags come from 'displayIssueTags' on repository.js
            var tags = req.body.tags.split(',');
            tags = tags.slice(0, -1); //Remove the last empty string

            var conditions = {
                $and:
                  [{source: {$in: tags}} ,
                  {target: {$in: tags}} ]
            }

            CommonOccurrence.find(conditions, function(err, occurrences){
                res.json(occurrences);
            });
        }
    }
}
