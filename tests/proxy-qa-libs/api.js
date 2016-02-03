'use strict';

var Promise = require('bluebird');
var request = require('supertest');
var config = require('config');
var util = require('./util.js');
var debug = false;

var apiLogin = config.get('qaUserWithAdminPerm'),
  apiPassword = config.get('qaUserWithAdminPermPassword'),
  testAPIUrl = config.get('testAPIUrl');

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
      return request(testAPIUrl)
        .get('/v1/domain_configs')
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .post('/v1/domain_configs')
        .auth(apiLogin, apiPassword)
        .send(body)
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          util.mySleep(5000);
          return resolve(res);
        });
    });
  },

  getDomainConfigsById: function (domainID) {
    if (!domainID || domainID === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testAPIUrl)
        .get('/v1/domain_configs/' + domainID)
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .put('/v1/domain_configs/' + domainID + '?options=publish')
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .del('/v1/domain_configs/' + domainID)
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .get('/v1/domain_configs/' + domainID + '/config_status')
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .get('/v1/domain_configs/' + domainID + '/versions')
        .auth(apiLogin, apiPassword)
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
  getAppConfigs: function (url) {
    if (!url || url === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testAPIUrl)
        .get('/v1/apps')
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .get('/v1/apps/' + key + '/config_status')
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .get('/v1/apps/' + key + '/versions')
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .post('/v1/apps')
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .get('/v1/apps/' + key)
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .put('/v1/apps/' + key + options)
        .auth(apiLogin, apiPassword)
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
      return request(testAPIUrl)
        .del('/v1/apps/' + key)
        .auth(apiLogin, apiPassword)
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
  postPurge: function (body, expect) {
    if (!expect || expect === '') {
      expect = 200;
    }
    if (!body || body === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(testAPIUrl)
        .post('/v1/purge')
        .auth(apiLogin, apiPassword)
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
          return resolve(res);
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
    return new Promise(function (resolve, reject) {
      return request(testAPIUrl)
        .get('/v1/purge/' + id)
        .auth(apiLogin, apiPassword)
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

// users

  // Get your user profile
  getUsersMyself: function () {
    return new Promise(function (resolve, reject) {
      return request(testAPIUrl)
        .get('/v1/users/myself')
        .auth(apiLogin, apiPassword)
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
  }

}
