'use strict';

// Database connections
var mongoose = require('mongoose');
var Tag = mongoose.model('Tag');
var SoUser = mongoose.model('SoUser');
var CommonOccurrence = mongoose.model('CommonOccurrence');
var StopWord = mongoose.model('StopWord');

var fs = require('fs');
var csv = require('fast-csv');
var pullAll = require('lodash.pullall');

module.exports = function (BaseFrame){
    return {
        populateSoTags: function (req, res){
            readFile('files/tags.csv', res, Tag);
        },

        populateCommonOccurrences: function (req, res){
            readFile('files/coOccurrences.csv', res, CommonOccurrence);
        },

        populateSoUsers: function (req, res){
            readFile('files/commonUsers.csv', res, SoUser);
        },

        getIssueTags: function(req, res){
            var issue = req.body;

            var title = issue.title.toLowerCase().split(' ');
            var allWords = issue.body.toLowerCase().split(' ');

            for(var index in title) {
                var word = title[index];
                allWords.push(word);
            }

            StopWord.find({}, '_id', {lean: true}, function (err, words){
                if(err) {
                    console.log(err.message);
                } else {
                    var stopWords = []
                    for(var index in words){
                        stopWords.push(words[index]._id);
                    }
                    pullAll(allWords, stopWords);
                }

                // Any tag that has any of the words in the given array
                // The lean option is to avoid Mongoose wrapers. It returns just a json
                Tag.find({_id: {$in: allWords }}, '_id soTotalCount', {lean: true}, function(err, tags){
                    if(err){
                        console.log(err.message);
                        res.sendStatus(500);
                    }

                    var tagsFromIssue = {};
                    for(var index in tags){
                        //I don't have the count for the issue right now.
                        tagsFromIssue[tags[index]._id] = 1;
                    }

                    res.json(tagsFromIssue);
                });
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
//TODO: Add this to a module or something like that, so I can reuse it.
/** Helper function to read the files
*
* @param file - The file address/name. The path given should be from the root
  folder instead of from the baseFrame package!
* @param res - The response to be sent.
* @param MongooseModel - The MongooseModel to be used to save to the database.
*/

function readFile(file, res, MongooseModel){
    //Using readStream to avoid memory explosion
    var readable = fs.createReadStream(file, {encoding: 'utf8'});

    csv.fromStream(readable, {ignoreEmpty: true})
    .on("data", function(data){
        // readable.pause();
        var model = createModel(data, MongooseModel.modelName);
        MongooseModel.create(model, function(err){
            if(err){
                console.log(err.message);
            }else{
                console.log(MongooseModel.modelName + ' saved successfully!');
            }
        });
    })
    .on("end", function(){
        console.log("done");
    });
    res.sendStatus(200);
}

/** This receives the converted results from reading a file
* and returns an array with models based on these results.
*
* @param convertResults - an array of dicts with the first row as keys
* @param modelName - The name of model that will be created.
* @return array of models to be saved on the database.
*/
function createModel(line, modelName){
    var model = {};

    switch (modelName) {
        case 'Tag':
            //line[0] is an id that is not being used
            model['_id'] = line[1];
            model['soTotalCount'] = line[2];
            break;
        case 'SoUser':
            model['soId'] = line[0];
            model['_id'] = line[1];
            model['email'] = line[2];
            break;
        case 'CommonOccurrence':
            model['source'] = line[0];
            model['target'] = line[1];
            model['occurrences'] = line[2];
            break;
    }

    return model;
}
