'use strict';

var api = require('./api.js');
var Promise = require('bluebird');
var request = require('supertest');
var async = require('async');

module.exports = {

  getRequest: function (url, get, expect) {
    expect = expect || 200;
    return new Promise(function (resolve, reject) {
      return request(url)
        .get(get)
        .expect(expect)
        .end(function (err, res) {
          if (err) {
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  getSDKRequest: function (url, get, host, revhost, revproto, expect) {
    expect = expect || 200;
    return new Promise(function (resolve, reject) {
      return request(url)
        .get(get)
        .set('Host', host)
        .set('X-Rev-Host', revhost)
        .set('X-Rev-Proto', revproto)
        .expect(expect)
        .end(function (err, res) {
          if (err) {
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  getSetRequest: function (url, get, set, expect) {
    expect = expect || 200;
    return new Promise(function (resolve, reject) {
      return request(url)
        .get(get)
        .set(set)
        .expect(expect)
        .end(function (err, res) {
          if (err) {
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  // Get content by url and get request with special Host
  getHostRequest: function (url, get, set, expect) {
    expect = expect || 200;
    return new Promise(function (resolve, reject) {
      return request(url)
        .get(get)
        .set('Host', set)
        .expect(expect)
        .end(function (err, res) {
          if (err) {
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  patchHostRequest: function (url, post, body, set, expect) {
    expect = expect || 200;
    return new Promise(function (resolve, reject) {
      return request(url)
        .patch(post)
        .set('Host', set)
        .send(body)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  postHostRequest: function (url, post, body, set, expect) {
    expect = expect || 200;
    return new Promise(function (resolve, reject) {
      return request(url)
        .post(post)
        .set('Host', set)
        .send(body)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  putHostRequest: function (url, put, body, set, expect) {
    expect = expect || 200;
    return new Promise(function (resolve, reject) {
      return request(url)
        .put(put)
        .set('Host', set)
        .send(body)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  delHostRequest: function (url, del, set, expect) {
    expect = expect || 200;
    return new Promise(function (resolve, reject) {
      return request(url)
        .del(del)
        .set('Host', set)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            throw reject(err);
          }
          return resolve(res);
        });
    });
  },

  waitPublishStatus: function (domain, url, login, password, loops, timeout) {
    return new Promise(function (resolve, reject) {
      var a = [],
        publishFlag = false,
        responseJson;

      for (var i = 0; i < loops; i++) {
        a.push(i);
      }

      async.eachSeries(a, function (n, callback) {
        setTimeout(function () {
          api.getDomainConfigsByIdStatus(domain, url, login, password).then(function (res, rej) {
            if (rej) {
              throw rej;
            }
            responseJson = res.body;
            // console.log('Iteraction ' + n + ', received response = ', JSON.stringify(responseJson));
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
          return resolve(true);
        }
      });
    });
  },

  waitAppPublishStatus: function (key, url, login, password, loops, timeout) {
    return new Promise(function (resolve, reject) {
      var a = [],
        publishFlag = false,
        responseJson;

      for (var i = 0; i < loops; i++) {
        a.push(i);
      }

      async.eachSeries(a, function (n, callback) {
        setTimeout(function () {
          api.getAppConfigsStatus(key, url, login, password).then(function (res, rej) {
            if (rej) {
              throw rej;
            }
            responseJson = res.body;
            // console.log('Iteraction ' + n + ', received response = ', JSON.stringify(responseJson));
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
          return resolve(true);
        }
      });
    });
  },

  waitPurgeStatus: function (key, url, login, password, loops, timeout) {
    return new Promise(function (resolve, reject) {
      var a = [],
        publishFlag = false,
        responseJson;

      for (var i = 0; i < loops; i++) {
        a.push(i);
      }

      async.eachSeries(a, function (n, callback) {
        setTimeout(function () {
          api.getPurgeStatus(key, url, login, password).then(function (res, rej) {
            if (rej) {
              throw rej;
            }
            responseJson = res.body;
            // console.log('Iteraction ' + n + ', received response = ', JSON.stringify(responseJson));
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
          return resolve(true);
        }
      });
    });
  },

  mySleep:function (milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
}

}
