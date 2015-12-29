'use strict';

var Promise = require('bluebird');
var request = require('supertest');
var async = require('async');

module.exports = {

    // Get content by url and get request with special Host
    getHostRequest: function (url, get, set) {
        return new Promise(function (resolve, reject) {
            return request(url)
                .get(get)
                .set('Host', set)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                });
        });
    }
}
