'use strict';

var express = require('express');
var jade = require('jade');
var compress = require('compression');
var moment = require('moment');

var config = require('./config');
var models = require('./models');

var app = express();

app.set('x-powered-by', false);
app.set('views', config.get('view:path'));
app.set('view engine', config.get('view:engine'));
//app.set('view cache', true);
app.engine('jade', jade.__express);


app.use(compress());

//modules.init(app);


function handleError(res, errorCode) {
  return function(e) {
      res.render('error', {
        pageTitle: 'OpenVPN Status - Error',
        pretty: true,
        version: config.get('version'),
        error: {
          code: errorCode,
          description: e.toString()
        }
      });
  }
}

exports.init = function() {
  app.use(express.static(config.get('staticDir')));


  app.get('/', function(req, res, next) {
    if ('refresh' in req.query) {
      models.Client.findAll().then(function(clients) {
        if (!clients) {
          return true;
        }

        return Promise.all(clients.map(function(client) {
          return client.clearStats();
        })).then(function() {
          return models.Session.findAll({
            where: {
              active: false
            }
          }).then(function(sessions) {
            if (!sessions || !sessions.length) {
              return true;
            }

            return Promise.all(sessions.map(function(session) {
              return session.updateClient();
            }));
          });
        });
      }).then(function() {
        res.redirect("/");
      }).catch(handleError(res, 500));
    } else {
      return models.Session.findAll({
        where: {
          active: true
        },
        include: [{
          model: models.Client,
          as: 'client'
        }],
        ordrer: [
          ['id', 'DESC'],
        ]
      }).then(function(sessions) {
        res.render('index', {
          pageTitle: 'OpenVPN Status',
          pretty: true,
          version: config.get('version'),
          sessions: sessions.map(session => {
            session = session.toJSON();
            session.start_time = moment(session.start_time, 'X').format('YYYY/MM/DD HH:mm:ss (Z)');
            return session;
          })
        });
      });
    }
  });

  app.get('/clients/', function(req, res, next) {
    return models.Client.findAll({
      ordrer: [
        ['name', 'ASC'],
      ]
    }).then(function(clients) {
      if (!clients) {
        res.redirect('/');
      }

      res.render('clients', {
        pageTitle: 'OpenVPN Clients',
        pretty: true,
        version: config.get('version'),
        clients: clients.map(client => {
          client = client.toJSON();

          // Fix for more that 365 days
          let total_time_format = 'HH:mm:ss';
          if (client.total_time > (24 * 60 * 60)) {
            total_time_format = 'DDD day(s)' + total_time_format;
          }
          client.total_time = moment.utc(client.total_time, 'X').format(total_time_format);

          client.createdAt = moment(client.createdAt).format('YYYY/MM/DD HH:mm:ss (Z)');
          return client;
        })
      });
    }).catch(handleError(res, 500));
  });

  app.get('/clients/:clientName', function(req, res, next) {
    var clientName = req.params.clientName;

    return models.Client.findOne({
      where: {
        name: clientName
      }
    }).then(function(client) {
      if (!client) {
        res.redirect('/');
      }

      return client.getSessions({order: [['id', 'DESC']]}).then(function(sessions) {
        res.render('client', {
          pageTitle: 'OpenVPN Client - ' + client.name,
          pretty: true,
          version: config.get('version'),
          client: client.toJSON(),
          sessions: sessions.map(session => {
            session = session.toJSON();

            let total_time_format = 'HH:mm:ss';
            let duration = session.duration;
            if (duration > (24 * 60 * 60)) {
              // We hope that sessions is shorten that year
              total_time_format = 'DDD day(s)' + total_time_format;
            }

            session.duration = moment.utc(duration, 'X').format(total_time_format);
            session.start_time = moment(session.start_time, 'X').format('YYYY/MM/DD HH:mm:ss (Z)');
            session.end_time = moment((session.start_time + duration), 'X').format('YYYY/MM/DD HH:mm:ss (Z)');

            return session;
          })
        });
      });
    }).catch(handleError(res, 500));
  });

  // Hanle 404. Must be last in list
  app.all('*', function(req, res, next) {
    res.redirect('/');
  });

  console.log('Listening on *:', config.get('port'));
  app.listen(config.get('port'));
}



