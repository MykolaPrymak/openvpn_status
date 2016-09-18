'use strict';

var config = require('../config');
var Sequelize = require('sequelize');


var sequelize = new Sequelize(config.get('db'));

module.exports = sequelize;
