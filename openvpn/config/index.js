'use strict';

var fs = require('fs');
var path = require('path');
var nconf = require('nconf');

nconf.argv()
     .env();


nconf.file(path.join(__dirname, 'config.json'));

// Read default config file
try {
    nconf.defaults(JSON.parse(fs.readFileSync(path.join(__dirname, 'config_default.json'), 'utf8')));
} catch(e) {
    console.error('Fail to load default configuration file');
    throw e;
}

module.exports = nconf;