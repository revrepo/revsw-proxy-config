process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');
var sh = require('execSync');

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
  domainConfig = '',
  domainConfigId = '';

function send_quic(request){
  return JSON.parse(sh.exec("echo '" + request + "' | ./proxy-qa-cgi-bin/test_tool 2>/dev/null").stdout);
}

describe('Proxy test on open HTTP/QUIC proxy', function () {

  this.timeout(120000);

  it('(smoke) should return AccountId', function (done) {
    api.getUsersMyself(testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
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

    api.postDomainConfigs(JSON.stringify(createDomainConfigJSON), testAPIUrl, apiLogin,
      apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      domainConfigId = res.body.object_id;
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait max 3 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 18, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(util.getError(err)); });

  });

  it('should make request on 443 port by quic protocol and receive status 200', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = send_quic(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    done();
  });

  it('should make request on 443 port by quic protocol and receive status 503', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443", "Headers": { "Host": ["no-'+newDomainName+'"] } }';
      var resp = send_quic(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(503);
    done();
  });

  it('should make request on 80 port and receive status 200', function (done) {
    tools.getHostRequest(testHTTPUrl, '/', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 80 port and receive status 503', function (done) {
    tools.getHostRequest(testHTTPUrl, '/', 'no-'+newDomainName, 503).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 443 port and receive status 200', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 443 port and receive status 503', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/', 'no-'+newDomainName, 503).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 18000 port and receive status 200', function (done) {
    tools.getHostRequest(testHTTPUrl+":18000", '/', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 18000 port and receive status 503', function (done) {
    tools.getHostRequest(testHTTPUrl+":18000", '/', 'no-'+newDomainName, 503).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 19000 port and receive status 200', function (done) {
    tools.getHostRequest(testHTTPSUrl+":19000", '/', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 19000 port and receive status 503', function (done) {
    tools.getHostRequest(testHTTPSUrl+":19000", '/', 'no-'+newDomainName, 503).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
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
    }).catch(function (err) { done(util.getError(err)); });
  });

});
