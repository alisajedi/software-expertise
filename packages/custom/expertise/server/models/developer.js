'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/** This is the generic Developer profile. It gathers all the other profiles based
* on the user's email. One developer can have several profiles on different platforms,
* like GitHub and StackOverflow. Any other profiles must be referenced on this schema.
*
* @class Developer
* @requires mongoose
**/
var DeveloperSchema = new Schema({
    /** The user email
    *
    * @inner
    * @memberof Developer
    * @type {String}
    **/
    _id: {
        type: String,
        unique: true,
        required: true,
    },

    /** This will have the references to all the profiles found with this email.
    * Right now, we have references to GitHub, StackOverflow and Bugzilla.
    * If a new profile is added, it must be referenced here.
    *
    * @inner
    * @memberof Developer
    * @type {Object}
    * @property {Array<String>} gh - The GitHub profiles related to this developer
    * @property {Array<Number>} so - The StackOverflow profiles related to this developer
    * @property {Array<Number>} bz - The Bugzilla profiles related to this developer
    * @see GitHubProfile
    * @see StackOverflowProfile
    * @see BugzillaProfile
    **/
    profiles: {
        gh: [{
            type: String,
            ref: 'GitHubProfile',
        }],
        so: [{
            type: Number,
            ref: 'StackOverflowProfile',
        }],
        bz: [{
            type: String,
            ref: 'BugzillaProfile',
        }],
        //To add a new profile: create the schema and then reference it here.
    },
}, {
    timestamps: true,
});

mongoose.model('Developer', DeveloperSchema);
