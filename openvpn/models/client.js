'use strict';

var Sequelize = require('sequelize');
var db = require('./db');

var Client = db.define('Client', {
  parent_id:    Sequelize.INTEGER,
  name:         Sequelize.STRING,
  full_name:    Sequelize.STRING(256),
  rx:           {
                  type: Sequelize.INTEGER,
                  defaultValue: 0
                },
  tx:           {
                  type: Sequelize.INTEGER,
                  defaultValue: 0
                },
  total_time:   {
                  type: Sequelize.INTEGER,
                  defaultValue: 0
                }
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
  instanceMethods: {
    updateStats: function(session) {
      if (session) {
        var rx = this.getDataValue('rx') + session.getDataValue('rx');
        var tx = this.getDataValue('tx') + session.getDataValue('rx');
        var total_time = (this.getDataValue('total_time') || 0) + session.getDataValue('duration');
        var parent_id = this.getDataValue('parent_id');

        this.setDataValue('rx', rx);
        this.setDataValue('tx', tx);
        this.setDataValue('total_time', total_time);

        return this.save().then(function() {
          // Update parent stats
          if (parent_id) {
            return Client.findOne({
              where: {
                id: parent_id
              }
            }).then(function(client) {
              if (client) {
                return client.updateStats(session);
              } else {
                return session
              }
            });
          } else {
            return session;
          }
        });
      }
      return session;
    },
    clearStats: function() {
      this.setDataValue('rx', 0);
      this.setDataValue('tx', 0);
      this.setDataValue('total_time', 0);

      return this.save();
    }
  },
  tableName: 'clients'
});

module.exports = Client;