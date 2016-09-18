/*
 * OpenVPN status logger
 * FS helper module
 */

'use strict';
var fs = require('fs');


function fs_stat_promise(path) {
    return new Promise(function(resolve, reject) {
        fs.stat(path, function(err, stats) {
            if (err) {
                reject(err);
            };
            resolve(stats);
        });
    });
}

function fs_access_promise(stats, path, mode) {
    return new Promise(function(resolve, reject) {
        fs.access(path, mode, function(err) {
            if (err) {
                reject(err);
            };
            resolve({stats: stats, path: path});
        });
    });
}

function fs_realpath_promise(res) {
    return new Promise(function(resolve, reject) {
        fs.realpath(res.path, function(err, resolvedPath) {
            if (err) {
                reject(err);
            }
            resolve({stats: res.stats, path: resolvedPath});
        });
    });
}

function is_file(res) {
    if (!res.stats.isFile()) {
        throw new Error('Is not a file!');
    }
    return res;
}

function is_smaller_that(size) {
    return function (res) {
        if (res.stats.size > size) {
            throw new Error('File is too large to parse! Size: ' + res.stats.size + ' bytes');
        }
        return res;
    }
}

function is_readable(path, silent) {
    return fs_stat_promise(path).then(function(stats) {
        return fs_access_promise(stats, path, fs.R_OK);
    }).then(fs_realpath_promise).catch(function(err) {
        if (!silent) {
            console.log('File is not readable. Error: ', err);
        }
        return Promise.reject(err)
    });
}

exports.is_file = is_file;
exports.is_smaller_that = is_smaller_that;
exports.is_readable = is_readable;
