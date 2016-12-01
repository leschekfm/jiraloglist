const request = require('request')
const moment = require('moment')
const debug = require('debug')('jiraloglist')

const baseUrl = "https://maloon.atlassian.net/rest/api/2/"

const req = request.defaults({
    auth: {
        user: process.env.JIRAUSER,
        pass: process.env.JIRAPASS
    },
    baseUrl: baseUrl
})

let tracking = {}
const yesterday = moment().startOf('day').subtract(1, 'd')
const dayToCheck = yesterday // will get an option to be overriden by a param

req.get({
    uri: 'search',
    qs: {
        jql: `updated > ${dayToCheck.format('YYYY-MM-DD')} and project in (CMD) and timespent > 0`,
        fields: "summary,worklog",
        maxResults: 1000
    }
}, (err, res, body) => {
    const response = JSON.parse(body)

    for (issue of response.issues) {
        for (log of issue.fields.worklog.worklogs) {
            const created = moment(log.created)
            debug('log entry created', created)
            if (created.isAfter(dayToCheck) && created.isBefore(moment(dayToCheck).add(1,'d'))) {
                debug(`${log.author.name} Logged ${log.timeSpent} on issue ${issue.fields.summary}`)
                if (!(log.author.name in tracking)) {
                    tracking[log.author.name] = {}
                }
                if (!(issue.key in tracking[log.author.name])) {
                    tracking[log.author.name][issue.key] = { desc: issue.fields.summary, timeSpent: log.timeSpentSeconds }
                }
                else {
                    tracking[log.author.name][issue.key].timeSpent += log.timeSpentSeconds
                }
            }
            debug(`${log.author.name} Logged ${log.timeSpent} on issue ${issue.fields.summary}`)
        }
    }

    debug('result object', tracking)

    console.log('WORKLOG')
    for (user in tracking) {
        console.log('For: ' + user)
        for (issue in tracking[user]) {
            console.log(`${issue} - ${tracking[user][issue].desc}: ${tracking[user][issue].timeSpent / 60} mins`)
        }
    }

}) 