const Agenda = require('agenda')
const rc = require('rc')
const moment = require('moment')

const config = rc('jiraloglist', {})

const agenda = new Agenda({db: {address: config.mongo}})

const jiraloglist = require('./lib/jiraloglist').jll
const gll = require('./lib/gitlabloglist').gll

// or override the default collection name:
// var agenda = new Agenda({db: {address: mongoConnectionString, collection: "jobCollectionName"}});

// or pass additional connection options:
// var agenda = new Agenda({db: {address: mongoConnectionString, collection: "jobCollectionName", options: {server:{auto_reconnect:true}}}});

// or pass in an existing mongodb-native MongoClient instance
// var agenda = new Agenda({mongo: myMongoClient});

agenda.define('daily jira worklog', function (job, done) {
  let range = 1
  let start = moment().startOf('day').subtract(1, 'd').add(5, 'h')
  if (moment().day() === 1) { // on monday
    start = moment().startOf('day').subtract(3, 'd').add(5, 'h')
    range = 3
  }

  jiraloglist(config, start, range)
  done()
})

agenda.define('daily gitlab cp2 worklog', function (job, done) {
  let range = 1
  let start = moment().startOf('day').subtract(1, 'd').add(5, 'h')
  if (moment().day() === 1) { // on monday
    start = moment().startOf('day').subtract(3, 'd').add(5, 'h')
    range = 3
  }

  gll(config, start, range)
  done()
})

agenda.on('ready', function () {
  agenda.every(config.cron.interval, 'daily jira worklog')
  agenda.every(config.cron.interval, 'daily gitlab cp2 worklog')

  // Alternatively, you could also do:
  // agenda.every('*/3 * * * *', 'delete old users');

  agenda.start()
})