'use strict';

var Sequelize = require('sequelize');
var db = require('./db');

var Session = db.define('Session', {
  real_ip:      Sequelize.STRING(15),
  real_port:    Sequelize.INTEGER,
  vpn_ip:       Sequelize.STRING(15),
  rx:           Sequelize.INTEGER,
  tx:           Sequelize.INTEGER,
  start_time:   Sequelize.INTEGER,
  duration: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
  active:   {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            }
  }, {
  indexes: [
    {
        fields: ['active']
    }
  ],
  getterMethods: {
    ip: function()  { return this.real_ip + ':' + this.real_port }
  },

  setterMethods: {
    ip: function(value) {
        var parts = value.split(':');

        this.setDataValue('real_ip', parts[0]);
        this.setDataValue('real_port', parts[1]);
    }
  },

  instanceMethods: {
    endSession: function() {
      // If session is not yet closed
      if (!this.getDataValue('duration')) {
        var masked_ip = this.getDataValue('real_ip').split('.').splice(0, 2).concat('?', '?').join('.');
        var now = parseInt((new Date()).getTime() / 1000);

        this.setDataValue('real_ip', masked_ip);
        this.setDataValue('duration', (this.getDataValue('start_time') - now));
        this.setDataValue('active', false);

        var session = this;
        var client_id = this.getDataValue('client_id');

        return this.save().then(function() {
          // Update client stats
          var Client = require('./client');
          return Client.findOne({
            where: {
              id: client_id
            }
          }).then(function(client) {
            if (client) {
              return client.updateStats(session);
            } else {
              return session
            }
          });

        });
      }
      return this;
    },
    updateClient: function() {
      if (!this.getDataValue('active')) {
        var session = this;
        var client_id = this.getDataValue('client_id');

        return this.save().then(function() {
          // Update client stats
          var Client = require('./client');
          return Client.findOne({
            where: {
              id: client_id
            }
          }).then(function(client) {
            if (client) {
              return client.updateStats(session);
            } else {
              return session
            }
          });
        });
      }
      return this;
    }
  },

  tableName: 'sessions'
});

module.exports = Session;