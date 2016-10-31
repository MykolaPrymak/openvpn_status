'use strict';

var db = require('./db');

var Session = require('./session');
var Client = require('./client');

// Add relations
Session.belongsTo(Client, {as: 'client', foreignKey: 'client_id'});
Client.hasMany(Session, {foreignKey: 'client_id', as: 'Sessions', constraints: false});

Client.belongsTo(Client, {as: 'parent', foreignKey: 'parent_id'});
Client.hasMany(Client, {foreignKey: 'id'});


exports.init = function(app) {
  return exports.createAll();
}


exports.sync = function(app) {
  //return db.sync({force: true});
  return db.sync();
}

exports.createAll = function() {
  return db.sync({force: true}).catch(function(err) {
    console.log('Fail create models.', err);
  });
}

exports.db = db;
exports.Session = Session;
exports.Client = Client;




