'use strict';

var Promise = require('bluebird');
var request = require('supertest');
var config = require('config');
var util = require('./util.js');
var debug = false,
  testCDSUrl = config.get('testCDSServers1'),
  token = config.get('token_with_api_scope');

function showDebugError(message) {
  console.log("\x1b[36m");
  console.log("================ Debug ================");
  console.log(message.method);
  console.log(message.status);
  console.log(message.text);
  console.log("=======================================");
  console.log("\x1b[0m");
}

module.exports = {

  debugMode: function (status) {
    debug = status;
  },

// domain_configs

  // Get a list of domains registered for a customer
  getDomainConfigs: function () {
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/domain_configs')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  // Create a new domain configuration
  postDomainConfigs: function (body) {
    if (!body || body === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .post('/v1/domain_configs')
        .set('Authorization', 'Bearer ' + token)
        .send(body)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return resolve(res);
        });
    });
  },

  getDomainConfigsById: function (domainID) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/domain_configs/' + domainID)
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  // Update detailed domain configuration ( options mast be set with ?options, example '?options=verify_only'
  putDomainConfigsById: function (domainID, body) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .put('/v1/domain_configs/' + domainID + '?options=publish')
        .set('Authorization', 'Bearer ' + token)
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
          return resolve(res);
        });
    });
  },

  // Delete a domain
  deleteDomainConfigsById: function (domainID) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .del('/v1/domain_configs/' + domainID)
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return resolve(res);
        });
    });
  },

  // Get the publishing status of a domain configuration
  getDomainConfigsByIdStatus: function (domainID) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/domain_configs/' + domainID + '/config_status')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  // Get a list of domain configuration versions
  getDomainConfigsByIdVersions: function (domainID) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/domain_configs/' + domainID + '/versions')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

// apps

  // Get a list of currently registered mobile applications
  getAppConfigs: function () {
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/apps')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  // Get the publishing status of a domain configuration
  getAppConfigsStatus: function (key) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/apps/' + key + '/config_status')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  // Get a list of domain configuration versions
  getAppConfigsVersions: function (key) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/apps/' + key + '/versions')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  // Register a new mobile application configuration
  postAppConfigs: function (body) {
    if (!body || body === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .post('/v1/apps')
        .set('Authorization', 'Bearer ' + token)
        .send(body)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return resolve(res);
        });
    });
  },

  // Get current configuration of a mobile application
  getAppById: function (key) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/apps/' + key)
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  // Update the current configuration of a mobile application ( options mast be set with ?options, example '?options=verify_only'
  putAppById: function (key, options, body) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .put('/v1/apps/' + key + options)
        .set('Authorization', 'Bearer ' + token)
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
          return resolve(res);
        });
    });
  },

  // Delete a mobile application configuration
  deleteAppById: function (key) {
    if (!key || key === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .del('/v1/apps/' + key)
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(2000);
          return resolve(res);
        });
    });
  },

// purge

  // Purge objects cached on Rev edge servers
  getPurge: function (key, expect) {
    if (!expect || expect === '') {
      expect = 200;
    }
    if (!body || body === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/purge/' + key)
        .set('Authorization', 'Bearer ' + token)
        .expect(expect)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  // Get the status of a previously submitted purge request
  getPurgeJobsStatus: function (expect) {
    if (!expect || expect === '') {
      expect = 200;
    }
    return new Promise(function (resolve, reject) {
      return request(testCDSUrl)
        .get('/v1/purge_jobs/status')
        .set('Authorization', 'Bearer ' + token)
        .expect(expect)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          return resolve(res);
        });
    });
  }
}
