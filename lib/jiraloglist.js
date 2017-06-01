const request = require('request')
const moment = require('moment')
const WebClient = require('@slack/client').WebClient

const debug = require('debug')('jiraloglist')

async function jll (config, dayToCheck = moment().startOf('day').subtract(1, 'd'), range = 1) {
  debug('config', config)
  debug('dayToCheck', dayToCheck)
  debug('range', range)

  const response = await fetchJiraData(config, dayToCheck)

  let tracking = createTrackingObject(response, dayToCheck, range)

  debug('result object', tracking)

  function generateMessage (tracking) {
    let message = ''
    message += `WORKLOG for: ${dayToCheck.format()} to ${moment(dayToCheck).add(range, 'd').format()}\n`
    for (const user in tracking) {
      const totalHours = tracking[user].timeSpent / 60 / 60
      message += `${user} logged ${totalHours.toFixed(1)}h\n`
      for (const issue in tracking[user].issues) {
        message += `${issue} - ${tracking[user].issues[issue].desc}: ${tracking[user].issues[issue].timeSpent / 60} mins\n`
      }
    }
    return message
  }

  function sendSlackmessage (message, config) {
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
    const message = generateSlackMessage(tracking, dayToCheck, range)
    sendSlackmessage(message, config)
  } else {
    console.dir(generateMessage(tracking))
  }
}

async function fetchJiraData (config, dayToCheck) {
  const baseUrl = config.url + '/rest/api/2/'

  const reqConfig = {
    auth: {
      user: config.user,
      pass: config.pass
    },
    baseUrl: baseUrl
  }

  const req = request.defaults(reqConfig)

  return new Promise((resolve, reject) => {
    req.get({
      uri: 'search',
      qs: {
        jql: `updated > '${dayToCheck.format('YYYY-MM-DD HH:mm')}' and project in (${config.projects}) and timespent > 0`,
        fields: 'summary,worklog,timetracking',
        maxResults: 1000
      }
    }, (err, res, body) => {
      if (err) {
        reject(err)
      }

      const response = JSON.parse(body)
      resolve(response)
    })
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
        if (!(issue.key in tracking[log.author.name].issues)) {
          tracking[log.author.name].issues[issue.key] = {
            desc: issue.fields.summary,
            timeSpent: log.timeSpentSeconds,
            remaining: issue.fields.timetracking.remainingEstimate
          }
        } else {
          tracking[log.author.name].issues[issue.key].timeSpent += log.timeSpentSeconds
        }
      }
      debug(`${log.author.name} Logged ${log.timeSpent} on issue ${issue.fields.summary}`)
    }
  }
  return tracking
}

function generateSlackMessage (tracking, dayToCheck, range) {
  const message = {
    text: `WORKLOG for: ${dayToCheck.format()} to ${moment(dayToCheck).add(range, 'd').format()}`,
    attachments: []
  }
  for (const user in tracking) {
    const attachment = {}
    const fields = []
    const totalHours = tracking[user].timeSpent / 60 / 60
    attachment.title = `${user} logged ${totalHours.toFixed(1)}h`
    attachment.color = totalHours >= 5 ? 'good' : 'warning'
    for (const issueKey in tracking[user].issues) {
      const issue = tracking[user].issues[issueKey]
      const warning = issue.remaining === '0m' ? ':warning:' : ''
      fields.push({
        title: `${issueKey} - ${issue.desc}`,
        value: `${issue.timeSpent / 60} mins, Remaining: ${issue.remaining} ${warning}`,
        short: true
      })
    }
    attachment.fields = fields
    message.attachments.push(attachment)
  }
  return message
}

module.exports = {
  jll: jll,
  createTrackingObject: createTrackingObject,
  fetchJiraData: fetchJiraData,
  generateSlackMessage: generateSlackMessage
}
