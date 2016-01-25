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

  getDomainConfigsById: function (domainID, url, login, password) {
    if (!domainID || domainID === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .get('/v1/domain_configs/' + domainID)
        .auth(login, password)
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
  putDomainConfigsById: function (domainID, options, body, url, login, password) {
    if (!domainID || domainID === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .put('/v1/domain_configs/' + domainID + options)
        .auth(login, password)
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
  deleteDomainConfigsById: function (domainID, url, login, password) {
    if (!domainID || domainID === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .del('/v1/domain_configs/' + domainID)
        .auth(login, password)
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
  getDomainConfigsByIdStatus: function (domainID, url, login, password) {
    if (!domainID || domainID === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .get('/v1/domain_configs/' + domainID + '/config_status')
        .auth(login, password)
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
  getDomainConfigsByIdVersions: function (domainID, url, login, password) {
    if (!domainID || domainID === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .get('/v1/domain_configs/' + domainID + '/versions')
        .auth(login, password)
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
  getAppConfigs: function (url, login, password) {
    if (!url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .get('/v1/apps')
        .auth(login, password)
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
  getAppConfigsStatus: function (key, url, login, password) {
    if (!key || key === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .get('/v1/apps/' + key + '/config_status')
        .auth(login, password)
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
  getAppConfigsVersions: function (key, url, login, password) {
    if (!key || key === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .get('/v1/apps/' + key + '/versions')
        .auth(login, password)
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
  postAppConfigs: function (body, url, login, password) {
    if (!body || body === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .post('/v1/apps')
        .auth(login, password)
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
  getAppById: function (key, url, login, password) {
    if (!key || key === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .get('/v1/apps/' + key)
        .auth(login, password)
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
  putAppById: function (key, options, body, url, login, password) {
    if (!key || key === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .put('/v1/apps/' + key + options)
        .auth(login, password)
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
  deleteAppById: function (key, url, login, password) {
    if (!key || key === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .del('/v1/apps/' + key)
        .auth(login, password)
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
  postPurge: function (body, url, login, password, expect) {
    if (!expect || expect === '') {
      expect = 200;
    }
    if (!body || body === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .post('/v1/purge')
        .auth(login, password)
        .send(body)
        .expect(expect)
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

  // Get the status of a previously submitted purge request
  getPurgeStatus: function (id, url, login, password, expect) {
    if (!expect || expect === '') {
      expect = 200;
    }
    if (!id || id === '' || !url || url === '' || !login || login === '' || !password || password === '') {
      return;
    }
    return new Promise(function (resolve, reject) {
      return request(url)
        .get('/v1/purge/' + id)
        .auth(login, password)
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
