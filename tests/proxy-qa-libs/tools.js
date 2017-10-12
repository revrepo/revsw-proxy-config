'use strict';
var https = require('https');
var tls = require('tls');
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
  if (message) {
    console.log("\x1b[36m");
    console.log("================ Debug ================");
    console.log(message.method);
    console.log(message.status);
    console.log(message.text);
    console.log("=======================================");
    console.log("\x1b[0m");
  }
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
              console.log('          Iteraction ' + n + ', response = ', responseJson.staging_status, ' / ', responseJson.global_status);
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
          return reject('The configuraton is still not published. Last status response: ' + JSON.stringify(responseJson));
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
      console.log('    \u001b[33m♦\u001b[36m return AccountId\u001B[0m');

      api.getUsersMyself()
        .then(function (res) {
          AccountId = res.body.account_id;
          console.log('    \u001b[33m♦\u001b[36m create new configuration for domain' + newDomainName + '\u001B[0m');
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
          console.log('\u001b[33m♦\u001b[36m wait till the global and staging config statuses are "Published"\u001B[0m');
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
      console.log('    \u001b[33m♦\u001b[36m return AccountId\u001B[0m');

      api.getUsersMyself()
        .then(function (res) {
          AccountId = res.body.account_id;
          console.log('    \u001b[33m♦\u001b[36m create new configuration for domain ' + newDomainName + '\u001B[0m');
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
          console.log('    \u001b[33m♦\u001b[36m return domain config for domain ' + newDomainName + '\u001B[0m');
          return api.getDomainConfigsById(domainConfigId);
        })
        .then(function (res) {
          var responseJson = JSON.parse(res.text);
          delete responseJson.cname;
          delete responseJson.domain_name;
          delete responseJson.published_domain_version;
          delete responseJson.last_published_domain_version;
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
          console.log('    \u001b[33m♦\u001b[36m wait till the global and staging config statuses are "Published"\u001B[0m');
          return response(module.exports.waitPublishStatus(domainConfigId))
        })
        .catch(function (err) {
          return reject(util.getError(err));
        });
    });
  },

  deleteDomain: function (domainConfigId) {
    return new Promise(function (response, reject) {
      api.deleteDomainConfigsById(domainConfigId).then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        responseJson.statusCode.should.be.equal(202);
        responseJson.message.should.be.equal('The domain has been scheduled for removal');
        console.log('    \u001b[33m♦\u001b[36m domain deleting\u001B[0m');
        return response(true);
      }).catch(function (err) {
        return reject(util.getError(err));
      });
    });
  },

  // Get content ower SSL by url and get request with special Host
  getSSLHostRequest: function (url, get, set, expect) {
    expect = expect || 200;
    var options = {
      host: url,
      port: 443,
      path: get,
      method: 'GET',
      headers: {'Host': set}
    };
    return new Promise(function (response, reject) {
      var req = https.get(options, function (res) {
        var buf = '';
        res.should.have.property('statusCode', expect);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          buf += chunk
        });
        res.on('error', function (err) {
          reject(err);
        });
        res.on('end', function () {
          res.data = buf
          console.log(res.data);
          return response(res);
        });
      });
    });
  },

  // Get content ower SSL by url and get request with special Host
  getTLSHostRequest: function (server, host, ciphers , protocol) {
    protocol = protocol || 'TLSv1_method';
    var options = {'servername': host, 'secureProtocol': protocol, headers: {'Host': host}};
    if (ciphers){
      options.ciphers = ciphers;
    }
    return new Promise(function (response, reject) {
      var client = tls.connect(443, server, options, function (res) {
        client.on('close', function () {});
        process.stdin.pipe(client);
        //process.stdin.resume();
        client.write('GET /\r\n');
        client.write('\r\n');
        client.setEncoding('utf8');
        client.on('error', function (err) {
          return reject(err);
        });
        client.on('data', function () {});
        return response(client);
      });
    });
  },

  removePrivateCDSDomainConfigFields: function (jsonDomainConfig) {
    delete jsonDomainConfig._id;
    delete jsonDomainConfig.__v;
    delete jsonDomainConfig.account_id;
    delete jsonDomainConfig.cname;
    delete jsonDomainConfig.created_at;
    delete jsonDomainConfig.updated_at;
    delete jsonDomainConfig.created_by;
    delete jsonDomainConfig.deleted;
    delete jsonDomainConfig.deleted_at;
    delete jsonDomainConfig.domain_name;
    delete jsonDomainConfig.origin_server_location_id;
    delete jsonDomainConfig.last_published_domain_version;
    delete jsonDomainConfig.published_domain_version;
    delete jsonDomainConfig.serial_id;
    delete jsonDomainConfig.tolerance;
    delete jsonDomainConfig.cname_domain;
    delete jsonDomainConfig.proxy_config.cname;
    delete jsonDomainConfig.proxy_config.domain_name;
    return jsonDomainConfig;
  },

  removePrivateAPIDomainConfigFields: function (jsonDomainConfig) {
    delete jsonDomainConfig.id;
    delete jsonDomainConfig.cname;
    delete jsonDomainConfig.domain_name;
    delete jsonDomainConfig.last_published_domain_version;
    delete jsonDomainConfig.published_domain_version;
    delete jsonDomainConfig.updated_by;
    return jsonDomainConfig;
  }
};
