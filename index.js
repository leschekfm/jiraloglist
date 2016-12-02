const request = require('request')
const moment = require('moment')
const debug = require('debug')('jiraloglist')
const program = require('commander')

program
    .option('-d, --day-to-check [dayToCheck]', 'day to check in format "YYYY-MM-DD"', moment().startOf('day').subtract(1, 'd'))
    .parse(process.argv)

const baseUrl = "https://maloon.atlassian.net/rest/api/2/"

const req = request.defaults({
    auth: {
        user: process.env.JIRAUSER,
        pass: process.env.JIRAPASS
    },
    baseUrl: baseUrl
})

let tracking = {}

const dayToCheck = moment(program.dayToCheck)
debug('dayToCheck', dayToCheck)

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
            if (created.isAfter(dayToCheck) && created.isBefore(moment(dayToCheck).add(1, 'd'))) {
                debug(`${log.author.name} Logged ${log.timeSpent} on issue ${issue.fields.summary}`)
                if (!(log.author.name in tracking)) {
                    tracking[log.author.name] = { timeSpent: 0, issues: {} }
                }
                tracking[log.author.name].timeSpent += log.timeSpentSeconds
                if (!(issue.key in tracking[log.author.name])) {
                    tracking[log.author.name].issues[issue.key] = { desc: issue.fields.summary, timeSpent: log.timeSpentSeconds }
                }
                else {
                    tracking[log.author.name].issues[issue.key].timeSpent += log.timeSpentSeconds
                }
            }
            debug(`${log.author.name} Logged ${log.timeSpent} on issue ${issue.fields.summary}`)
        }
    }

    debug('result object', tracking)

    console.log(`WORKLOG for: ${dayToCheck.format('YYYY-MM-DD')}`)
    for (user in tracking) {
        const totalHours = tracking[user].timeSpent / 60 / 60
        console.log(`${user} logged ${totalHours.toFixed(1)}h`)
        for (issue in tracking[user].issues) {
            console.log(`${issue} - ${tracking[user].issues[issue].desc}: ${tracking[user].issues[issue].timeSpent / 60} mins`)
        }
    }

}) 