process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var async = require('async');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');

var apiLogin = config.get('qaUserWithAdminPerm'),
  apiPassword = config.get('qaUserWithAdminPermPassword'),
  originHostHeader = 'httpbin_org.revsw.net',
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

describe('Proxy X-Forwarded-For check', function () {

  this.timeout(80000);

  it('(smoke) should get system IP', function (done) {
    tools.getRequest('http://' + originServer, '/ip').then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      AccountIP = response_json.origin;
      ipCheckString = AccountIP + ', ' + testProxyIp;
      done();
    }).catch(done);
  });

  it('(smoke) should return AccountId', function (done) {
    api.getUsersMyself(testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.companyId[0];
      done();
    }).catch(done);
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

    api.postDomainConfigs(JSON.stringify(createDomainConfigJSON), testAPIUrl, apiLogin,
      apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      domainConfigId = res.body.object_id;
      done();
    }).catch(done);
  });

  it('should wait max 1 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 6, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(done);
  });

  it('should get HTTP origin IPs', function (done) {
    tools.getHostRequest(testHTTPUrl, '/ip', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(done);
  });

  it('should get HTTPS origin IPs', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/ip', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      response_json.origin.should.equal(ipCheckString);
      done();
    }).catch(done);
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
    }).catch(done);
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
    }).catch(done);
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
    }).catch(done);
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
    }).catch(done);
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
    }).catch(done);
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
    }).catch(done);
  });

  it('should delete the domain config', function (done) {
    api.deleteDomainConfigsById(domainConfigId, testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      //console.log(response_json);
      responseJson.statusCode.should.be.equal(202);
      responseJson.message.should.be.equal('The domain has been scheduled for removal');
      done();
    }).catch(done);
  });

  it('should create new app', function (done) {
    var createAppJSON = {
      "account_id": AccountId,
      "app_name": "testapp" + Date.now(),
      "app_platform": "Android"
    };

    api.postAppConfigs(JSON.stringify(createAppJSON), testAPIUrl, apiLogin, apiPassword)
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
      }).catch(done);
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitAppPublishStatus(appKeyID, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(done);
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
    }).catch(done);
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
    }).catch(done);
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
    }).catch(done);
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
    }).catch(done);
  });

  it('should delete app' + appKeyID, function (done) {
    api.deleteAppById(appKeyID, testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.statusCode.should.be.equal(200);
      responseJson.message.should.be.equal('The application has been successfully deleted');
      done();
    }).catch(done);
  });

});
