const moment = require('moment')
const WebClient = require('@slack/client').WebClient

const debug = require('debug')('gitlabloglist')

const Config = require('gitlab-time-tracker/include/config')
const Report = require('gitlab-time-tracker/models/report')
const Output = {
  table: require('gitlab-time-tracker/output/table'),
  csv: require('gitlab-time-tracker/output/csv'),
  pdf: require('gitlab-time-tracker/output/pdf'),
  markdown: require('gitlab-time-tracker/output/markdown')
}

async function gll (config, dayToCheck = moment().startOf('day').subtract(1, 'd'), range = 1) {
  fetchGitlabData(config, dayToCheck)
}

async function fetchGitlabData (config, dayToCheck) {
    // create a default gttConfig
  let gttConfig = new Config()

    // set some vars on gttConfig
  gttConfig.set('url', config.gitlab.url)
  gttConfig.set('token', config.gitlab.token)
  gttConfig.set('project', config.gitlab.project)
  gttConfig.set('closed', config.gitlab.closed)
  gttConfig.set('showWithoutTimes', config.gitlab.showWithoutTimes)
  gttConfig.set('output', config.gitlab.output)

    // create report
  let report = new Report(gttConfig)

  // chain promises to query and process data
  await report.getProject()
  await report.getIssues()
  await report.getMergeRequests()
  await report.processIssues()
  await report.processMergeRequests()

  let output = new Output[gttConfig.get('output')](gttConfig, report)
  output.make()
  output.toStdOut()

  function sendSlackmessage (message, config) {
    const web = new WebClient(config.slack.token)
    debug(message)
    web.files.upload('tracking.md', {content: message, channels: config.slack.channel}, function (err, res) {
      if (err) {
        console.log('Error:', err)
      } else {
        console.log('Message sent: ', res)
      }
    })
  }

  sendSlackmessage(output.out, config)
    // access data on report
    /* report.issues.forEach(issue => {
        console.log(issue.times);
        console.log(issue.times[0].time);
    });
    report.mergeRequests.forEach(mergeRequest => {
        console.log(mergeRequests.times);
        console.log(issue.times[0].user);
    }); */
}

module.exports = {
  gll: gll,
    // createTrackingObject: createTrackingObject,
  fetchGitlabData: fetchGitlabData
    // generateSlackMessage: generateSlackMessage
}
