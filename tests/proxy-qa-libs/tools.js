'use strict';

var api = require('./api.js');
var util = require('./util.js');
var Promise = require('bluebird');
var request = require('supertest');
var async = require('async');
var config = require('config');
var debug = false,
  testGroup = config.get('test_group'),
  timeout = config.get('waitTime'),
  loops = config.get('waitCount');

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

  getRequest: function (url, get, expect) {
    expect = expect || 200;
    return new Promise(function (response, reject) {
      return request(url)
        .get(get)
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

  getSDKRequest: function (url, get, host, revhost, revproto, expect) {
    expect = expect || 200;
    return new Promise(function (response, reject) {
      return request(url)
        .get(get)
        .set('Host', host)
        .set('X-Rev-Host', revhost)
        .set('X-Rev-Proto', revproto)
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

  getSetRequest: function (url, get, set, expect) {
    expect = expect || 200;
    return new Promise(function (response, reject) {
      return request(url)
        .get(get)
        .set(set)
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

  // Get content by url and get request with special Host
  getHostRequest: function (url, get, set, expect) {
    expect = expect || 200;
    return new Promise(function (response, reject) {
      return request(url)
        .get(get)
        .set('Host', set)
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

  patchHostRequest: function (url, post, body, set, expect) {
    expect = expect || 200;
    return new Promise(function (response, reject) {
      return request(url)
        .patch(post)
        .set('Host', set)
        .send(body)
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

  postHostRequest: function (url, post, body, set, expect) {
    expect = expect || 200;
    return new Promise(function (response, reject) {
      return request(url)
        .post(post)
        .set('Host', set)
        .send(body)
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

  putHostRequest: function (url, put, body, set, expect) {
    expect = expect || 200;
    return new Promise(function (response, reject) {
      return request(url)
        .put(put)
        .set('Host', set)
        .send(body)
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

  delHostRequest: function (url, del, set, expect) {
    expect = expect || 200;
    return new Promise(function (response, reject) {
      return request(url)
        .del(del)
        .set('Host', set)
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

  waitPublishStatus: function (domain) {
    return new Promise(function (response, reject) {
      var a = [],
        publishFlag = false,
        responseJson;

      for (var i = 0; i < loops; i++) {
        a.push(i);
      }

      async.eachSeries(a, function (n, callback) {
        setTimeout(function () {
          api.getDomainConfigsByIdStatus(domain).then(function (res, rej) {
            if (debug) {
              showDebugError(res.error);
            }
            if (rej) {
              throw rej;
            }
            responseJson = res.body;
            if (debug) {
              console.log('Iteraction ' + n + ', received response = ', JSON.stringify(responseJson));
            }
            if (responseJson.staging_status === 'Published' && responseJson.global_status === 'Published') {
              publishFlag = true;
              callback(true);
            } else {
              callback(false);
            }
          });
        }, timeout);
      }, function (err) {
        if (publishFlag === false) {
          throw reject('The configuraton is still not published. Last status response: ' + JSON.stringify(responseJson));
        } else {
          util.mySleep(15000);
          return response(true);
        }
      });
    });
  },

  waitAppPublishStatus: function (key) {
    return new Promise(function (response, reject) {
      var a = [],
        publishFlag = false,
        responseJson;

      for (var i = 0; i < loops; i++) {
        a.push(i);
      }

      async.eachSeries(a, function (n, callback) {
        setTimeout(function () {
          api.getAppConfigsStatus(key).then(function (res, rej) {
            if (debug) {
              showDebugError(res.error);
            }
            if (rej) {
              throw rej;
            }
            responseJson = res.body;
            if (debug) {
              console.log('Iteraction ' + n + ', received response = ', JSON.stringify(responseJson));
            }
            if (responseJson.staging_status === 'Published' && responseJson.global_status === 'Published') {
              publishFlag = true;
              callback(true);
            } else {
              callback(false);
            }
          });
        }, timeout);
      }, function (err) {
        if (publishFlag === false) {
          throw reject('The configuraton is still not published. Last status response: ' + JSON.stringify(responseJson));
        } else {
          util.mySleep(15000);
          return response(true);
        }
      });
    });
  },

  waitPurgeStatus: function (key) {
    return new Promise(function (response, reject) {
      var a = [],
        publishFlag = false,
        responseJson;

      for (var i = 0; i < loops; i++) {
        a.push(i);
      }

      async.eachSeries(a, function (n, callback) {
        setTimeout(function () {
          api.getPurgeStatus(key).then(function (res, rej) {
            if (debug) {
              showDebugError(res.error);
            }
            if (rej) {
              throw rej;
            }
            responseJson = res.body;
            if (debug) {
              console.log('Iteraction ' + n + ', received response = ', JSON.stringify(responseJson));
            }
            if (responseJson.message === 'Success') {
              publishFlag = true;
              callback(true);
            } else {
              callback(false);
            }
          });
        }, timeout);
      }, function (err) {
        if (publishFlag === false) {
          throw reject('The PURGE is still not finished. Last status response: ' + JSON.stringify(responseJson));
        } else {
          util.mySleep(15000);
          return response(true);
        }
      });
    });
  },

  createNewDomain: function (newDomainName, origin) {
    return new Promise(function (response, reject) {
      var AccountId = "",
        domainConfigId = "";
      console.log('[===] return AccountId');

      api.getUsersMyself()
        .then(function (res) {
          AccountId = res.body.companyId[0];
          console.log('[===] create new configuration for domain ' + newDomainName);
          var createDomainConfigJSON = {
            'domain_name': newDomainName,
            'account_id': AccountId,
            'origin_host_header': origin,
            'origin_server': origin,
            'origin_server_location_id': testGroup,
            'tolerance': '0'
          };
          return api.postDomainConfigs(createDomainConfigJSON)
        })
        .then(function (res) {
          domainConfigId = res.body.object_id;
          console.log('[===] wait till the global and staging config statuses are "Published"');
          return module.exports.waitPublishStatus(domainConfigId)
        })
        .then(function () {
          return response(domainConfigId);
        })
        .catch(function (err) {
          return reject(util.getError(err));
        });
    });
  },

  beforeSetDomain: function (newDomainName, origin) {
    return new Promise(function (response, reject) {
      var AccountId = "",
        domainConfigId = "";
      console.log('[===] return AccountId');

      api.getUsersMyself()
        .then(function (res) {
          AccountId = res.body.companyId[0];
          console.log('[===] create new configuration for domain ' + newDomainName);
          var createDomainConfigJSON = {
            'domain_name': newDomainName,
            'account_id': AccountId,
            'origin_host_header': origin,
            'origin_server': origin,
            'origin_server_location_id': testGroup,
            'tolerance': '0'
          };
          return api.postDomainConfigs(createDomainConfigJSON);
        })
        .then(function (res) {
          domainConfigId = res.body.object_id;
          return api.getDomainConfigsById(domainConfigId);
        })
        .then(function (res) {
          var responseJson = JSON.parse(res.text);
          delete responseJson.cname;
          delete responseJson.domain_name;
          var domainConfig = {}
          domainConfig.id = domainConfigId
          domainConfig.config = responseJson
          return response(domainConfig)
        })
        .catch(function (err) {
          return reject(util.getError(err));
        });
    });
  },

  afterSetDomain: function (domainConfigId, domainConfig) {
    return new Promise(function (response, reject) {
      api.putDomainConfigsById(domainConfigId, domainConfig)
        .then(function () {
          console.log('[===] wait till the global and staging config statuses are "Published"');
          return response(module.exports.waitPublishStatus(domainConfigId))
        })
        .catch(function (err) {
          return reject(util.getError(err));
        });
    });
  }
};
