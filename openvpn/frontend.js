'use strict';

var express = require('express');
//var bodyParser = require('body-parser');
//var session = require('express-session');
var jade = require('jade');
//var compress = require('compression');

var config = require('./config');
var models = require('./models');
//var modules = require('./modules');

var app = express();

app.set('x-powered-by', false);
app.set('views', config.get('view:path'));
app.set('view engine', config.get('view:engine'));
//app.set('view cache', true);
app.engine('jade', jade.__express);


//app.use(bodyParser.urlencoded({ extended: false }));

//app.use(compress());

//modules.init(app);

//console.info('Express server listening on port', config.get('port'));







exports.init = function() {
  app.use(express.static(config.get('publicDir')));


  app.get('/', function(req, res, next) {
    return models.Session.findAll({
        where: {
            active: true
        },
        include: [{
            model: models.Client,
            as: 'client'
        }]
    }).then(function(sessions) {    
      res.render('index', {
        pageTitle: 'Welcome!',
        pretty: true,
        version: config.get('version'),
        sessions: sessions.map(session => session.toJSON())
      });
    });
  });
}



app.listen(config.get('port'));
console.log('Listening on *:', config.get('port'));
//console.info('EOF');