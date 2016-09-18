'use strict';

var Sequelize = require('sequelize');
var sequelize = require('./sequelize');
var hash = require('../modules/auth/password_hash');

var User = sequelize.define('User', {
  id:       {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true
            },
  login:    {
              type: Sequelize.STRING,
              unique: true,
              set: function(login) {
                this.setDataValue('login', login.toString().toLowerCase());
              },
              validate: {
                len: [3]
              }
            },
  password: {
              type: Sequelize.STRING(256),
              set: function(val) {
                this.setDataValue('password', hash.createSync(val))
              }
            },
  firstName:Sequelize.STRING,
  lastName: Sequelize.STRING
}, {
  getterMethods: {
    name: function()  { return this.firstName + ' ' + this.lastName }
  },

  setterMethods: {
    name: function(value) {
        var names = value.split(' ');

        this.setDataValue('firstName', names.slice(0, -1).join(' '));
        this.setDataValue('lastName', names.slice(-1).join(' '));
    },
  },

  instanceMethods: {
    verifyPassword: function(password) { return hash.verify(password, this.getDataValue('password')); }
  },

  tableName: 'users'
});

module.exports = User;