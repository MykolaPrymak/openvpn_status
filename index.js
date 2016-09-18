/*
 * OpenVPN status logger
 *
 */

'use strict';

var config = require('./openvpn/config')
const watcher = require('./openvpn/watcher');
const models = require('./openvpn/models');
const frontend = require('./openvpn/frontend');

//models.init();

models.sync().then(function() {
    watcher.init(config.get('watcher:path'));
    frontend.init();
});

