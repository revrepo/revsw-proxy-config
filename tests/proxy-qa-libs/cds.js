'use strict';

var Promise = require('bluebird');
var request = require('supertest');
var debug = false;

function showDebugError(message) {
  console.log("\x1b[36m");
  console.log("================ Debug ================");
  console.log(message.method);
  console.log(message.status);
  console.log(message.text);
  console.log("=======================================");
  console.log("\x1b[0m");
}

function mySleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    //console.log(new Date().getTime() - start);
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
}

module.exports = {

  debugMode: function (status) {
    debug = status;
  },

// domain_configs

  // Get a list of domains registered for a customer
  getDomainConfigs: function (url, token) {
    if (!url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
  postDomainConfigs: function (body, url, token) {
    if (!body || body === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .post('/v1/domain_configs')
        .set('Authorization', 'Bearer ' + token)
        .send(JSON.parse(body))
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          mySleep(2000);
          return resolve(res);
        });
    });
  },

  getDomainConfigsById: function (domainID, url, token) {
    if (!domainID || domainID === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
  putDomainConfigsById: function (domainID, options, body, url, token) {
    if (!domainID || domainID === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .put('/v1/domain_configs/' + domainID + options)
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
          mySleep(2000);
          return resolve(res);
        });
    });
  },

  // Delete a domain
  deleteDomainConfigsById: function (domainID, url, token) {
    if (!domainID || domainID === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
          mySleep(2000);
          return resolve(res);
        });
    });
  },

  // Get the publishing status of a domain configuration
  getDomainConfigsByIdStatus: function (domainID, url, token) {
    if (!domainID || domainID === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
  getDomainConfigsByIdVersions: function (domainID, url, token) {
    if (!domainID || domainID === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
  getAppConfigs: function (url, token) {
    if (!url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
  getAppConfigsStatus: function (key, url, token) {
    if (!key || key === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
  getAppConfigsVersions: function (key, url, token) {
    if (!key || key === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
  postAppConfigs: function (body, url, token) {
    if (!body || body === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .post('/v1/apps')
        .set('Authorization', 'Bearer ' + token)
        .send(JSON.parse(body))
        .end(function (err, res) {
          if (err) {
            if (debug) {
              showDebugError(res.error);
            }
            throw reject(err);
          }
          mySleep(2000);
          return resolve(res);
        });
    });
  },

  // Get current configuration of a mobile application
  getAppById: function (key, url, token) {
    if (!key || key === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
  putAppById: function (key, options, body, url, token) {
    if (!key || key === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
          mySleep(2000);
          return resolve(res);
        });
    });
  },

  // Delete a mobile application configuration
  deleteAppById: function (key, url, token) {
    if (!key || key === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
          mySleep(2000);
          return resolve(res);
        });
    });
  },

// purge

  // Purge objects cached on Rev edge servers
  getPurge: function (key, url, token, expect) {
    if (!expect || expect === '') {
      expect = 200;
    }
    if (!body || body === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
  getPurgeJobsStatus: function (url, token, expect) {
    if (!expect || expect === '') {
      expect = 200;
    }
    if (!id || id === '' || !url || url === '' || !token || token === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
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
