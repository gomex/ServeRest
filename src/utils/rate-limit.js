/* istanbul ignore file */

/*
O limite de requests está em arquivo apartado (rate-limit.js), e não no 'app.js',
para não ser afetado pelo teste de mutação.

Esse arquivo está marcado para ser ignorado no arquivo stryker.conf.js
*/

const slowDown = require('express-slow-down')

const speedLimiter = slowDown({
  windowMs: 1 * 60 * 1000, // 1 min
  delayAfter: 1,
  delayMs: 4750,
  maxDelayMs: 4750
})

module.exports = app => app.use(speedLimiter)
