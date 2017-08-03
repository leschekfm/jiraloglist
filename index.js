const moment = require('moment')
const program = require('commander')
const rc = require('rc')

//const jiraloglist = require('./lib/jiraloglist').jll
const jiraloglist = require('./lib/gitlabloglist').gll

program
  .option('-d, --day-to-check [dayToCheck]', 'day to check in format "YYYY-MM-DD"', moment().startOf('day').subtract(1, 'd'))
  .option('-r, --range [range]', 'time range in days', 1)
  .parse(process.argv)

const config = rc('jiraloglist', {})

const dayToCheck = moment(program.dayToCheck)

const rangeToCheck = program.range

jiraloglist(config, dayToCheck, rangeToCheck)
