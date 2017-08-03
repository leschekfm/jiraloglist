const moment = require('moment')
const WebClient = require('@slack/client').WebClient

const debug = require('debug')('gitlabloglist')

const Config = require('gitlab-time-tracker/include/config');
const Report = require('gitlab-time-tracker/models/report')

async function gll(config, dayToCheck = moment().startOf('day').subtract(1, 'd'), range = 1) {

}

async function fetchGitlabData(/*config, dayToCheck*/) {
    // create a default config
    let config = new Config();

    // set some vars on config
    config.set('url', 'https://gitlab.com/api/v4/')
    config.set('token', 'XXX');
    config.set('project', 'namespace/project');
    //config.set('closed', true);

    // create report
    let report = new Report(config);

    // chain promises to query and process data
    await report.getProject()
    await report.getIssues()
    await report.getMergeRequests()
    await report.processIssues()
    await report.processMergeRequests()

    // access data on report
    report.issues.forEach(issue => {
        console.log(issue.times);
        console.log(issue.times[0].time);
    });
    report.mergeRequests.forEach(mergeRequest => {
        console.log(mergeRequests.times);
        console.log(issue.times[0].user);
    });

}

module.exports = {
    gll: gll,
    //createTrackingObject: createTrackingObject,
    fetchGitlabData: fetchGitlabData,
    //generateSlackMessage: generateSlackMessage
}