process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var async = require('async');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var originHostHeader = 'httpbin_org.revsw.net',
  testHTTPSUrl = config.get('test_proxy_https'),
  AccountId = '',
  appKeyID = '',
  appSdkKey = '',
  appSdkDomain = '';

describe('Proxy X-Forwarded-For check', function () {

  this.timeout(240000);
//1
  it('(smoke) should return AccountId', function (done) {
    api.getUsersMyself().then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.companyId[0];
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });
//2
  it('should create new app', function (done) {
    var createAppJSON = {
      "account_id": AccountId,
      "app_name": "testapp" + Date.now(),
      "app_platform": "Android"
    };

    api.postAppConfigs(createAppJSON)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        responseJson.statusCode.should.be.equal(200);
        responseJson.message.should.be.equal('The application record has been successfully created');
        appKeyID = responseJson.id;
        appSdkKey = responseJson.sdk_key;
        appSdkDomain = responseJson.sdk_key + '.revsdk.net';
        done();
      }).catch(function (err) { done(util.getError(err)); });
  });
//3
  it('should wait till the global and staging config statuses are "Published"', function (done) {
    tools.waitAppPublishStatus(appKeyID).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//4
  it('should make simple HTTP request and receive keep alive value step 1', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });
//5
  it('should make simple HTTP request and receive keep alive value step 2', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//6
  it('should make simple HTTPS request and receive keep alive value step 1', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'https'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });
//7
  it('should make simple HTTPS request and receive keep alive value step 2', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'https'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//8
  it('should make simple HTTP request and receive keep alive with missing x-rev-host', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders, 400).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header.should.not.have.property('x-rev-origin-ka');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//9
  it('should make simple HTTP request and receive keep alive with missing x-rev-proto', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//10
  it('should make simple HTTP request and with bad X-Rev-Proto', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'httx'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders, 400).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header.should.not.have.property('x-rev-origin-ka');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//11
  it('should make simple HTTP request and with bad Host', function (done) {
    setHeaders = {
      'Host': appSdkDomain + '1',
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders, 503).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header.should.not.have.property('x-rev-origin-ka');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//12
  it('should make simple HTTP request and receive keep alive value', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//13
  it('should make simple HTTP request and receive keep alive value', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//14
  it('should make simple HTTP request on 8888 port and receive keep alive value', function (done) {
    setHeaders = {
      'Host': appSdkDomain + ':8888',
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//15
  it('should make simple HTTPS request on 8889 port and receive keep alive value', function (done) {
    setHeaders = {
      'Host': appSdkDomain + ':8889',
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'https'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//16
  it('should make simple HTTP request on HTTPS port and receive keep alive value', function (done) {
    setHeaders = {
      'Host': appSdkDomain + ':443',
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//17
  it('should make simple HTTPS request on HTTP port and receive keep alive value', function (done) {
    setHeaders = {
      'Host': appSdkDomain + ':80',
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'https'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//18
  it('should make simple HTTP request and receive keep alive', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//19
  it('should make simple HTTP request and receive keep alive', function (done) {
    setHeaders = {
      'Host': appSdkDomain,
      'X-Rev-Host': originHostHeader,
      'X-Rev-Proto': 'http'
    };
    tools.getSetRequest(testHTTPSUrl, '/html', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      console.log(res.header['x-rev-origin-ka']);
      res.header['x-rev-origin-ka'].match(function(n) { return n >= 1; });
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

//20
  it('should delete app' + appKeyID, function (done) {
    api.deleteAppById(appKeyID).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.statusCode.should.be.equal(200);
      responseJson.message.should.be.equal('The application has been successfully deleted');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

});
