const Agenda = require('agenda')
const rc = require('rc')

const config = rc('jiraloglist', {})

const agenda = new Agenda({db: {address: config.mongo}})

const jiraloglist = require('./lib/jiraloglist').jll

// or override the default collection name:
// var agenda = new Agenda({db: {address: mongoConnectionString, collection: "jobCollectionName"}});

// or pass additional connection options:
// var agenda = new Agenda({db: {address: mongoConnectionString, collection: "jobCollectionName", options: {server:{auto_reconnect:true}}}});

// or pass in an existing mongodb-native MongoClient instance
// var agenda = new Agenda({mongo: myMongoClient});

agenda.define('daily worklog', function (job, done) {
  jiraloglist(config)
  done()
})

agenda.on('ready', function () {
  agenda.every(config.cron.interval, 'daily worklog')

  // Alternatively, you could also do:
  // agenda.every('*/3 * * * *', 'delete old users');

  agenda.start()
})
