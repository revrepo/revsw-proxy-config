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
  domainConfig = '',
  domainConfigId = '',
  headerAltSvc = 'quic=":443"; p="1"; ma=',
  headerAlternateProtocol = '443:quic,p=1';
// put test vars inside describe block

describe('Proxy QUIC control enable_quic', function () { // Proxy QUIC control enable quic test ?

  this.timeout(240000);

  before(function (done) {
    tools.beforeSetDomain(newDomainName, originServer)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        domainConfigId = res.id;
        domainConfig = res.config;
        return tools.afterSetDomain(domainConfigId, domainConfig);
      })
      .catch(function(err) { done(util.getError(err)) })
      .then(function() { done(); })
  });

  after(function (done) {
    console.log('[===] delete the domain config');
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

  it('should not get quic header in http request (after create)', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should not get quic header in https request (after create)', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should change domain config and set enable_quic to true', function (done) {
    domainConfig.rev_component_bp.enable_quic = true;
    api.putDomainConfigsById(domainConfigId, domainConfig).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
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

  it('should get quic headers in http request (after config update)', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.properties(['alternate-protocol', 'alt-svc']);
      if (res.header['alternate-protocol']) {
        res.header['alternate-protocol'].should.equal(headerAlternateProtocol);
      }
      if (res.header['alt-svc']) {
        res.header['alt-svc'].should.startWith(headerAltSvc);
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get quic headers in https request (after config update)', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.properties(['alternate-protocol', 'alt-svc']);
      if (res.header['alternate-protocol']) {
        res.header['alternate-protocol'].should.equal(headerAlternateProtocol);
      }
      if (res.header['alt-svc']) {
        res.header['alt-svc'].should.startWith(headerAltSvc);
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should change domain config and set enable_quic to false', function (done) {
    domainConfig.rev_component_bp.enable_quic = false;
    api.putDomainConfigsById(domainConfigId, domainConfig).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
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

  it('should not get quic header in http request (after set enable_quic to false)', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should not get quic header in https request (after set enable_quic to false)', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

});
