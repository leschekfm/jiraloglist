const request = require('request')
const moment = require('moment')
const rc = require('rc')
const WebClient = require('@slack/client').WebClient

const debug = require('debug')('jiraloglist')

function jll(config, dayToCheck = moment().startOf('day').subtract(1, 'd'), range = 1) {
  debug('config', config)
  debug('dayToCheck', dayToCheck)
  debug('range', range)

  const baseUrl = config.url + '/rest/api/2/'

  const reqConfig = {
    auth: {
      user: config.user,
      pass: config.pass
    },
    baseUrl: baseUrl
  }

  const req = request.defaults(reqConfig)

  req.get({
    uri: 'search',
    qs: {
      jql: `updated > ${dayToCheck.format('YYYY-MM-DD')} and project in (${config.projects}) and timespent > 0`,
      fields: 'summary,worklog',
      maxResults: 1000
    }
  }, (err, res, body) => {
    if (err) {
      throw new Error(err)
    }

    const response = JSON.parse(body)

    let tracking = createTrackingObject(response, dayToCheck, range)

    debug('result object', tracking)

    function generateMessage(tracking) {
      let message = ''
      message += `WORKLOG for: ${dayToCheck.format('YYYY-MM-DD')} to ${moment(dayToCheck).add(range, 'd').format('YYYY-MM-DD')}\n`
      for (const user in tracking) {
        const totalHours = tracking[user].timeSpent / 60 / 60
        message += `${user} logged ${totalHours.toFixed(1)}h\n`
        for (const issue in tracking[user].issues) {
          message += `${issue} - ${tracking[user].issues[issue].desc}: ${tracking[user].issues[issue].timeSpent / 60} mins\n`
        }
      }
      return message
    }

    function generateSlackMessage(tracking, config) {
      const message = {
        text: `WORKLOG for: ${dayToCheck.format('YYYY-MM-DD')} to ${moment(dayToCheck).add(range, 'd').format('YYYY-MM-DD')}`,
        attachments: []
      }
      for (const user in tracking) {
        const attachment = {}
        const fields = []
        const totalHours = tracking[user].timeSpent / 60 / 60
        attachment.title = `${user} logged ${totalHours.toFixed(1)}h\n`
        attachment.color = totalHours >= 5 ? 'good' : 'warning'
        for (const issue in tracking[user].issues) {
          fields.push({
            title: `${issue} - ${tracking[user].issues[issue].desc}`,
            value: `${tracking[user].issues[issue].timeSpent / 60} mins\n`,
            short: true
          })
        }
        attachment.fields = fields
        message.attachments.push(attachment)
      }
      return message
    }

    function sendSlackmessage(message, config) {
      const web = new WebClient(config.slack.token)
      debug(message)
      web.chat.postMessage(config.slack.channel, message.text, message, (err, res) => {
        if (err) {
          throw new Error(err)
        }
        debug(res)
      })
    }

    if (config.slack) {
      const message = generateSlackMessage(tracking, config)
      sendSlackmessage(message, config)
    } else {
      console.dir(generateMessage(tracking))
    }
  })
}

const createTrackingObject = function (response, dayToCheck, range) {
  let tracking = {}
  for (const issue of response.issues) {
    for (const log of issue.fields.worklog.worklogs) {
      // use log.started instead of log.created
      // sometimes you forget to log something and add it the next day
      const created = moment(log.started)
      debug('log entry created', created)
      if (created.isAfter(dayToCheck) && created.isBefore(moment(dayToCheck).add(range, 'd'))) {
        debug('entry is in the specified range')
        if (!(log.author.name in tracking)) {
          tracking[log.author.name] = { timeSpent: 0, issues: {} }
        }
        tracking[log.author.name].timeSpent += log.timeSpentSeconds
        if (!(issue.key in tracking[log.author.name])) {
          tracking[log.author.name].issues[issue.key] = { desc: issue.fields.summary, timeSpent: log.timeSpentSeconds }
        } else {
          tracking[log.author.name].issues[issue.key].timeSpent += log.timeSpentSeconds
        }
      }
      debug(`${log.author.name} Logged ${log.timeSpent} on issue ${issue.fields.summary}`)
    }
  }
  return tracking
}

module.exports = {
  jll:jll,
  createTrackingObject: createTrackingObject
}
