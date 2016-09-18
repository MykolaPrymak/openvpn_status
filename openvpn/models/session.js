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
  end_time: {
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
        console.log('endSession', this.getDataValue('end_time'));
        if (!this.getDataValue('end_time')) {
            var maked_ip = this.getDataValue('real_ip').split('.').splice(0, 2).concat('?', '?').join('.');
            
            this.setDataValue('real_ip', maked_ip);
            this.setDataValue('end_time', parseInt((new Date()).getTime() / 1000));
            this.setDataValue('active', false);

            return this.save();
        }
        return this;
    }
  },

  tableName: 'sessions'
});

module.exports = Session;