const moment = require('moment')

const jll = require('./jiraloglist')

describe('createTrackingObject', () => {
  const response = require('./testResponse.json')

  test('should not error with predefined data', () => {
    expect(() => tracking = jll.createTrackingObject(response, moment('2017-03-01'), 1)).not.toThrow()
  })

  describe('patricks worklog', () => {
    const tracking = jll.createTrackingObject(response, moment('2017-03-01'), 1)
    const data = tracking['patrick.krassler']

    test('should have worked on 3 issues', () => {
      expect(Object.keys(data.issues).length).toBe(3)
    })
    test('should have a total of 5h', () => {
      expect(data.timeSpent).toBe(5 * 60 * 60)
    })
    test('should have worked 45m on CMD-2840', () => {
      expect(data.issues['CMD-2840'].timeSpent).toBe(45 * 60)
    })
    test('should have worked 1h 15m on CMD-2839', () => {
      expect(data.issues['CMD-2840'].timeSpent).toBe(75 * 60)
    })
    test('should have worked 3h on CMD-2707', () => {
      expect(data.issues['CMD-2840'].timeSpent).toBe(3 * 60 * 60)
    })
  })
})