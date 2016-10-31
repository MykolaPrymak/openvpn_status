/*
 * OpenVPN status logger
 * Watcher module
 */

'use strict';
const fs = require('fs');
const fs_helper = require('./helpers/fs');
const config = require('./config');
const db = require('./models').db;
const Session = require('./models').Session;
const Client = require('./models').Client;

function parseStatus(path, data) {
    const rows = data.split('\n');
    const START_LIST = 'Common Name,Real Address,Bytes Received,Bytes Sent,Connected Since';
    const END_LIST = 'ROUTING TABLE';
    const START_ROUTE = 'Virtual Address,Common Name,Real Address,Last Ref';
    const END_ROUTE = 'GLOBAL STATS';

    var isClientRow = false;
    var isRouteRow = false;
    var clientRows = [];
    var routeRows = [];
    var clients = {};
    var routes = {};

    // Parse file
    rows.forEach(function(row) {
        if (isClientRow) {
            if (row === END_LIST) {
                isClientRow = false;
            } else {
                clientRows.push(row);
            }
        } else {
            if (row === START_LIST) {
                isClientRow = true;
            }
        }

        if (isRouteRow) {
            if (row === END_ROUTE) {
                isRouteRow = false;
            } else {
                routeRows.push(row);
            }
        } else {
            if (row === START_ROUTE) {
                isRouteRow = true;
            }
        }
    });

    // merge info
    clientRows.forEach(function(row) {
        var name, parts;
        parts = row.split(',');
        name = parts[0];

        if (!(name in clients)) {
            clients[name] = [];
        }
        clients[name].push({
            name: name,
            realIP: parts[1],
            rx: parseInt(parts[2]),
            tx: parseInt(parts[3]),
            connectedSince: ((new Date(parts[4])).getTime() / 1000)
        });
    });

    routeRows.forEach(function(row) {
        var parts, name, vpnIP, realIP, lastUpdate;
        parts = row.split(',');
        vpnIP = parts[0];
        name = parts[1];
        realIP = parts[2];
        lastUpdate = parts[3];

        if (name in clients) {
            var client = clients[name].find(function(client) {
                return client.realIP === realIP;
            });

            if (client) {
                client.vpnIP = vpnIP;
                client.lastUpdate = ((new Date(lastUpdate)).getTime() / 1000);
            }
        }
    });

    return [path, clients];
}

function getClientsStatus(path) {
    return new Promise(function(resolve, reject) {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            };
            resolve(parseStatus(path, data));
        });
    });
}

function printClientStatus(clients) {
    console.log('Clients ('+ Object.keys(clients).length + '):');

    for (let name in clients) {
        if (!clients.hasOwnProperty(name)) continue;
        console.log(name + ':');
        clients[name].forEach(function(client) {
            console.log('\t IP: \t\t' + client.realIP + ' -> ' + client.vpnIP);
            console.log('\t RX/TX: \t' + client.rx + '/' + client.tx);
            console.log('\t Connected: \t' + (new Date(client.connectedSince * 1000)));
            console.log('\t Updated: \t' + (new Date(client.lastUpdate * 1000)));
        });
    }
}

function isStatusReady(path) {
    return fs_helper.is_readable(path).then(fs_helper.is_file).then(fs_helper.is_smaller_that(config.get('watcher:fileMaxSize')));
}



function updateClientStatus(data) {
    var currentClients = data[1];
    printClientStatus(currentClients);

    return Session.findAll({
        where: {
            active: true
        },
        include: [{
            model: Client,
            as: 'client'
        }]
    }).then(function(sessions) {
        return Promise.all(sessions.map(function(session) {
            if (!(session.client.name in currentClients)) {
                //console.log(session.id, session.client.name, 'no clients with this name');
                return session.endSession();
            } else {
                // Check if session is exist in current sessions
                var currentSession = currentClients[session.client.name].find(function(client) {
                    return (
                        (client.connectedSince === session.start_time) &&
                        (client.realIP === session.ip)
                    );
                });

                if (!currentSession) {
                    // Not found in active - end it
                    //console.log(session.id, session.client.name, 'is not active anymore');
                    return session.endSession();
                } else {
                    //console.log(session.id, session.client.name, 'is still active');
                    // Found in active sessions - old session
                    currentSession.isOld = true;
                    // Update data
                    return session.update({
                        tx: currentSession.tx,
                        rx: currentSession.rx,
                        vpn_ip: currentSession.vpnIP
                    });
                }
            }
        })).then(function() {
            var newSessions = [];

            for (let name in currentClients) {
                var sessions = currentClients[name].filter(function(session) {return !session.isOld;});
                if (sessions.length) {
                    newSessions.push.apply(newSessions, sessions);
                }
            }

            return Promise.all(newSessions.map(function(session) {
                return Client.findOrCreate({where: {name: session.name}}).spread((client, isCreated) => {
                    return Session.create({
                        ip: session.realIP,
                        vpn_ip: session.vpnIP,
                        rx: session.rx,
                        tx: session.tx,
                        start_time: session.connectedSince
                    }).then(session => client.addSession(session));
                });
            }));
        }).then(results => data);
    }).catch(function(e) {
        console.log('Error update sessions', e);
        //throw e;
    });
}

function init(path) {
    //console.log('init watcher', path);

    isStatusReady(path).then(res => res.path)
        .then(getClientsStatus)
        .then(updateClientStatus)
        .then(function(data) {
            var path = data[0];
            console.log('Watch:', path);
            var timer;
            fs.watch(path, (event, filename) => {
                // Throttle rare events (like twice events fire for real single event)
                if (!timer) {
                    timer = setTimeout(function() {
                        //console.log('watch fire "', event, '" on ', filename);

                        getClientsStatus(path).then(updateClientStatus).then(function() {
                            timer = null;
                        }, function() {
                            timer = null;
                        });
                    }, 500);
                }
            });
        });
}

exports.init = init;