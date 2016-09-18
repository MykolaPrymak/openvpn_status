'use strict';

var Sequelize = require('sequelize');
var db = require('./db');

var Client = db.define('Client', {
  parent_id:    Sequelize.INTEGER,
  name:         Sequelize.STRING,
  full_name:    Sequelize.STRING(256),
}, {
  indexes: [
    {
      unique: true,
      fields: ['id', 'parent_id']
    },
    {
      unique: true,
      fields: ['name']
    }
  ],
  setterMethods: {
    name: function(name) {
        this.setDataValue('name', name.toString().toLowerCase());
        if (!this.getDataValue('full_name')) {
            this.setDataValue('full_name', name);
        }
    }
  },
  tableName: 'clients'
});

module.exports = Client;