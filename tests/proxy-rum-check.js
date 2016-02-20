process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var async = require('async');
var https = require('https');

var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var originHostHeader = 'httpbin_org.revsw.net',
  originServer = 'httpbin_org.revsw.net',
  testHTTPUrl = config.get('test_proxy_http'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfig = '',
  domainConfigId = '',
  rumBeaconString = /<script\ src='\/rev\-diablo\/js\/boomerang\-rev\.min\.js'><\/script><script>BOOMR\.init\(\{RT:\{cookie:'REV\-RT'\,\ strict_referrer:\ false\}\,\ beacon_url:\ 'https:\/\/testsjc20\-rum01\.revsw\.net\/service'\}\);\ BOOMR\.addVar\('user_ip'\,\ '.*?'\);<\/script>/m;


describe('Proxy RUM control enable_rum', function () {
  this.timeout(120000);

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

  it('should not get rum code (after create)', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.not.match(rumBeaconString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should change domain config and set enable_rum to true', function (done) {
    domainConfig.rev_component_co.enable_rum = true;
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

  it('should get rum code (after set enable_rum to true)', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.text.should.match(rumBeaconString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should change domain config and set enable_rum to false', function (done) {
    domainConfig.rev_component_co.enable_rum = false;
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

  it('should not get RUM code (after set enable_rum to false)', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.not.match(rumBeaconString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

});
