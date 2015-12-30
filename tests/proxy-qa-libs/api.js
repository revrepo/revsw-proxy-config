'use strict';

var Promise = require('bluebird');
var request = require('supertest');
module.exports = {

// domain_configs

    // Get a list of domains registered for a customer
    getDomainConfigs: function (url, login, password) {
        if (!url || url === '' || !login || login === '' || !password || password === '') {
            return;
        }
        return new Promise(function (resolve, reject) {
            return request(url)
                .get('/v1/domain_configs')
                .auth(login, password)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                });
        });
    },

    // Create a new domain configuration
    postDomainConfigs: function (body, url, login, password) {
        if (!body || body === '' || !url || url === '' || !login || login === '' || !password || password === '') {
            return;
        }
        return new Promise(function (resolve, reject) {
            return request(url)
                .post('/v1/domain_configs')
                .auth(login, password)
                .send(JSON.parse(body))
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                });
        });
    },

    getDomainConfigsById: function (domain_id, url, login, password) {
        if (!domain_id || domain_id === '' || !url || url === '' || !login || login === '' || !password || password === '') {
            return;
        }
        return new Promise(function (resolve, reject) {
            return request(url)
                .get('/v1/domain_configs/' + domain_id)
                .auth(login, password)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                });
        });
    },

    // Update detailed domain configuration ( options mast be set with ?options, example '?options=verify_only'
    putDomainConfigsById: function (domain_id, options, body, url, login, password) {
        if (!domain_id || domain_id === '' || !url || url === '' || !login || login === '' || !password || password === '') {
            return;
        }
        return new Promise(function (resolve, reject) {
            return request(url)
                .put('/v1/domain_configs/' + domain_id + options)
                .auth(login, password)
                .send(body)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                });
        });
    },

    // Delete a domain
    deleteDomainConfigsById: function (domain_id, url, login, password) {
        if (!domain_id || domain_id === '' || !url || url === '' || !login || login === '' || !password || password === '') {
            return;
        }
        return new Promise(function (resolve, reject) {
            return request(url)
                .del('/v1/domain_configs/' + domain_id)
                .auth(login, password)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                });
        });
    },

    // Get the publishing status of a domain configuration
    getDomainConfigsByIdStatus: function (domain_id, url, login, password) {
        if (!domain_id || domain_id === '' || !url || url === '' || !login || login === '' || !password || password === '') {
            return;
        }
        return new Promise(function (resolve, reject) {
            return request(url)
                .get('/v1/domain_configs/' + domain_id + '/config_status')
                .auth(login, password)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                });
        });
    },

    // Get a list of domain configuration versions
    getDomainConfigsByIdVersions: function (domain_id, url, login, password) {
        if (!domain_id || domain_id === '' || !url || url === '' || !login || login === '' || !password || password === '') {
            return;
        }
        return new Promise(function (resolve, reject) {
            return request(url)
                .get('/v1/domain_configs/' + domain_id + '/versions')
                .auth(login, password)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                });
        });
    },

// users

    // Get your user profile
    getUsersMyself: function (url, login, password) {
        if (!url || url === '' || !login || login === '' || !password || password === '') {
            return;
        }
        return new Promise(function (resolve, reject) {
            return request(url)
                .get('/v1/users/myself')
                .auth(login, password)
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