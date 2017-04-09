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
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfig = '',
  domainConfigId = '',
  regexPagespeed = /[0-9]{1,10}\.[0-9]{1,10}\.[0-9]{1,10}\.[0-9-]{1,10}/m;

describe('Proxy Pagespeed control enable_optimization', function () {

  this.timeout(500000);

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

  it('should not get Pagespeed header in http request (after create)', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['x-page-speed']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should not get Pagespeed header in https request (after create)', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['x-page-speed']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should change domain config and set enable_optimization to true', function (done) {
    domainConfig.rev_component_co.enable_optimization = true;
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

  it('should get Pagespeed headers in http request (after config update)', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property(['x-page-speed']);
      if (res.header['x-page-speed']) {
        res.header['x-page-speed'].should.match(regexPagespeed);
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get Pagespeed headers in https request (after config update)', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property(['x-page-speed']);
      if (res.header['x-page-speed']) {
        res.header['x-page-speed'].should.match(regexPagespeed);
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should change domain config and set enable_optimization to false', function (done) {
    domainConfig.rev_component_co.enable_optimization = false;
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

  it('should not get Pagespeed header in http request (after set enable_optimization to false)', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['x-page-speed']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should not get Pagespeed header in https request (after set enable_optimization to false)', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['x-page-speed']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

});
