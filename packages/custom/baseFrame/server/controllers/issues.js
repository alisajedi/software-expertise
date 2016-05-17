'use strict';

var mongoose = require('mongoose');
var Issue = mongoose.model('Issue');

var request = require('request');

module.exports = function (BaseFrame){
    return {
        /** Looks for the issues of the given repository in the database
        *
        * @param req - Express request
        * @param res - Express response
        */
        find: function (req, res){
            var filter = req.params

            //Filter for future pagination!!
            filter._id = {};
            filter._id[req.query.order] = req.query.id;

            Issue.find(req.params, 'state title body pull_request', {sort: '-state pull_request', lean: true, limit: 500}, function(err, issues){

                res.send(issues);
            });
        },

        findOne: function (req, res){
            Issue.findOne(req.params, 'tags', function(err, issue){
                res.send(issue);
            });
        }
    }
}
