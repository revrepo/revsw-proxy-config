'use strict';

var Promise = require('bluebird');
var request = require('supertest');
var config = require('config');
var util = require('./util.js');
var debug = true;

var apiKey = config.get('apiKey'),
  testAPIUrl = config.get('testAPIUrl');

var authHeader = 'X-API-KEY ' + apiKey;

function showDebugError(message) {
  console.log('\x1b[36m');
  console.log('================ Debug ================');
  console.log(message.method);
  console.log(message.status);
  console.log(message.text);
  console.log('=======================================');
  console.log('\x1b[0m');
}

module.exports = {

  debugMode: function (status) {
    debug = status;
  },

// domain_configs

  // Get a list of domains registered for a customer
  getDomainConfigs: function () {
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/domain_configs')
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  },

  // Create a new domain configuration
  postDomainConfigs: function (body) {
    if (!body || body === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .post('/v1/domain_configs')
        .set('Authorization', authHeader)
        .send(body)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(5000);
          return response(res);
        });
    });
  },

  getDomainConfigsById: function (domainID) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/domain_configs/' + domainID)
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  },

  // Update detailed domain configuration ( options mast be set with ?options, example '?options=verify_only'
  putDomainConfigsById: function (domainID, body) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .put('/v1/domain_configs/' + domainID + '?options=publish')
        .set('Authorization', authHeader)
        .send(body)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return response(res);
        });
    });
  },

  // Delete a domain
  deleteDomainConfigsById: function (domainID) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .del('/v1/domain_configs/' + domainID)
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return response(res);
        });
    });
  },

  // Get the publishing status of a domain configuration
  getDomainConfigsByIdStatus: function (domainID) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/domain_configs/' + domainID + '/config_status')
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  },

  // Get a list of domain configuration versions
  getDomainConfigsByIdVersions: function (domainID) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/domain_configs/' + domainID + '/versions')
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  },

// apps

  // Get a list of currently registered mobile applications
  getAppConfigs: function (url) {
    if (!url || url === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/apps')
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  },

  // Get the publishing status of a domain configuration
  getAppConfigsStatus: function (key) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/apps/' + key + '/config_status')
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  },

  // Get a list of domain configuration versions
  getAppConfigsVersions: function (key) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/apps/' + key + '/versions')
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  },

  // Register a new mobile application configuration
  postAppConfigs: function (body) {
    if (!body || body === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .post('/v1/apps')
        .set('Authorization', authHeader)
        .send(body)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return response(res);
        });
    });
  },

  // Get current configuration of a mobile application
  getAppById: function (key) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/apps/' + key)
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  },

  // Update the current configuration of a mobile application ( options mast be set with ?options, example '?options=verify_only'
  putAppById: function (key, options, body) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .put('/v1/apps/' + key + options)
        .set('Authorization', authHeader)
        .send(body)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return response(res);
        });
    });
  },

  // Delete a mobile application configuration
  deleteAppById: function (key) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .del('/v1/apps/' + key)
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return response(res);
        });
    });
  },

// purge

  // Purge objects cached on Rev edge servers
  postPurge: function (body, expect) {
    if (!expect || expect === '') {
      expect = 200;
    }
    if (!body || body === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .post('/v1/purge')
        .set('Authorization', authHeader)
        .send(body)
        .expect(expect)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return response(res);
        });
    });
  },

  // Get the status of a previously submitted purge request
  getPurgeStatus: function (id, expect) {
    if (!expect || expect === '') {
      expect = 200;
    }
    if (!id || id === '') {
      return;
    }
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/purge/' + id)
        .set('Authorization', authHeader)
        .expect(expect)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  },

// users

  // Get your user profile
  getUsersMyself: function () {
    return new Promise(function (response, reject) {
      return request(testAPIUrl)
        .get('/v1/api_keys/myself')
        .set('Authorization', authHeader)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return response(res);
        });
    });
  }
};
