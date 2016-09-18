'use strict';

var config = require('../config');
var Sequelize = require('sequelize');


var sequelize = new Sequelize(config.get('db:name'), config.get('db:options:user'), config.get('db:options:password'), {
  host: config.get('db:options:host'),
  dialect: config.get('db:type'),
  dialectOptions: {
    socketPath: config.get('db:options:socketPath')
  },

  pool: {
    max: 5,
    min: 0,
    idle: 10000
  }
});

module.exports = sequelize;