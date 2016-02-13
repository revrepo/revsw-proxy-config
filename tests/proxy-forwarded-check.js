process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var async = require('async');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var originHostHeader = 'httpbin_org.revsw.net',
  originServer = 'httpbin_org.revsw.net',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testAPIUrl = config.get('testAPIUrl'),
  testGroup = config.get('test_group'),
  AccountId = '',
  AccountIP = '',
  domainConfig = '',
  domainConfigId = '',
  appKeyID = '',
  appSdkKey = '',
  appSdkDomain = '',
  forwardedIP = '1.2.3.4',
  testProxyIp = config.get('test_proxy_ip'),
  cookie = '',
  ipCheckString = '';

tools.debugMode(false);

describe('Proxy X-Forwarded-For check', function () {

  this.timeout(120000);

  it('(smoke) should get system IP', function (done) {
    tools.getRequest('http://' + originServer, '/ip').then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      AccountIP = response_json.origin;
      ipCheckString = AccountIP + ', ' + testProxyIp;
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('(smoke) should return AccountId', function (done) {
    api.getUsersMyself().then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.companyId[0];
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should create new configuration for domain ' + newDomainName, function (done) {
    var createDomainConfigJSON = {
      'domain_name': newDomainName,
      'account_id': AccountId,
      'origin_host_header': originHostHeader,
      'origin_server': originServer,
      'origin_server_location_id': testGroup,
      'tolerance': '0'
    };

    api.postDomainConfigs(createDomainConfigJSON).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      domainConfigId = res.body.object_id;
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(util.getError(err)); });

  });

  it('should get HTTP origin IPs', function (done) {
    tools.getHostRequest(testHTTPUrl, '/ip', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get HTTPS origin IPs', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/ip', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send HTTP request with set XFF and check that proxy ignores it', function (done) {
    setHeaders = { 'Host': newDomainName, 'X-Forwarded-For': forwardedIP};
    tools.getSetRequest(testHTTPUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send HTTPS request with set XFF and check that proxy ignores it', function (done) {
    setHeaders = { 'Host': newDomainName, 'X-Forwarded-For': forwardedIP};
    tools.getSetRequest(testHTTPSUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send HTTP request with set QUIC and check that proxy ignores it', function (done) {
    setHeaders = { 'Host': newDomainName, 'X-Rev-Transport': 'QUIC'};
    tools.getSetRequest(testHTTPUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send HTTPS request with set QUIC and check that proxy ignores it', function (done) {
    setHeaders = { 'Host': newDomainName, 'X-Rev-Transport': 'QUIC'};
    tools.getSetRequest(testHTTPSUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send HTTP request with set XFF, QUIC and check that returned setted IPs', function (done) {
    setHeaders = { 'Host': newDomainName, 'X-Forwarded-For': forwardedIP, 'X-Rev-Transport': 'QUIC'};
    tools.getSetRequest(testHTTPUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(forwardedIP + ', ' + testProxyIp);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send HTTPS request with set XFF, QUIC and check that returned setted IPs', function (done) {
    setHeaders = { 'Host': newDomainName, 'X-Forwarded-For': forwardedIP, 'X-Rev-Transport': 'QUIC'};
    tools.getSetRequest(testHTTPSUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(forwardedIP + ', ' + testProxyIp);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should delete the domain config', function (done) {
    api.deleteDomainConfigsById(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      //console.log(response_json);
      responseJson.statusCode.should.be.equal(202);
      responseJson.message.should.be.equal('The domain has been scheduled for removal');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

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
        //console.log(res.text);
        var responseJson = JSON.parse(res.text);
        responseJson.statusCode.should.be.equal(200);
        responseJson.message.should.be.equal('The application record has been successfully created');
        appKeyID = responseJson.id;
        appSdkKey = responseJson.sdk_key;
        appSdkDomain = responseJson.sdk_key + '.revsdk.net';
        done();
      }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitAppPublishStatus(appKeyID).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(util.getError(err)); });

  });

  it('should make request with set XFF and check that proxy ignores it', function (done) {
    setHeaders = { 'Host': appSdkDomain, 'X-Rev-Host': originHostHeader, 'X-Rev-Proto': 'http', 'X-Forwarded-For': forwardedIP };
    tools.getSetRequest(testHTTPSUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request with set QUIC and check that proxy ignores it', function (done) {
    setHeaders = { 'Host': appSdkDomain, 'X-Rev-Host': originHostHeader, 'X-Rev-Proto': 'http', 'X-Rev-Transport': 'QUIC'};
    tools.getSetRequest(testHTTPSUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make HTTP request with set XFF, QUIC and check that returned setted IPs', function (done) {
    setHeaders = { 'Host': appSdkDomain, 'X-Rev-Host': originHostHeader, 'X-Rev-Proto': 'http', 'X-Forwarded-For': forwardedIP, 'X-Rev-Transport': 'QUIC'};
    tools.getSetRequest(testHTTPSUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(forwardedIP + ', ' + testProxyIp);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make HTTPS request with set XFF, QUIC and check that returned setted IPs', function (done) {
    setHeaders = { 'Host': appSdkDomain, 'X-Rev-Host': originHostHeader, 'X-Rev-Proto': 'https', 'X-Forwarded-For': forwardedIP, 'X-Rev-Transport': 'QUIC'};
    tools.getSetRequest(testHTTPSUrl, '/ip', setHeaders).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(forwardedIP + ', ' + testProxyIp);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

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
