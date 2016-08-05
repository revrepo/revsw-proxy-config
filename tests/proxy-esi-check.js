process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var async = require('async');
var https = require('https');

var api = require('./proxy-qa-libs/api.js');
var cds = require('./proxy-qa-libs/cds.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var originServer = 'test-proxy-esi-config.revsw.net',
  testBPHTTPUrl = config.get('test_proxy_http') + ':80',
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfigId = '',
  cdsConfig,
  expectedValidESIResponse = 'Code: Secret Code from CGI\n',
  expectedInvalidESIResponse = 'Code: <esi:include src="/cgi-bin/test.cgi"/>';

describe('Proxy edge side includes support check', function () {

  this.timeout(240000);

  it('should return AccountId', function (done) {
    api.getUsersMyself().then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.account_id;
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should create new configuration for domain ' + newDomainName, function (done) {
    var createDomainConfigJSON = {
      'domain_name': newDomainName,
      'account_id': AccountId,
      'origin_host_header': originServer,
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
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should get domain config for recently created domain', function (done) {
    cds.getDomainConfigsById(domainConfigId)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        cdsConfig = tools.removePrivateDOmainConfigFields(JSON.parse(res.text));
        done();
      });
  });

  it('should update domain config with caching rules with ESI enabled', function (done) {
    cdsConfig.caching_rules = [
      {
        "browser_caching": {
          "force_revalidate": false,
          "new_ttl": 0,
          "override_edge": false
        },
        "cookies": {
          "ignore_all": false,
          "keep_or_ignore_list": [],
          "list_is_keep": false,
          "override": false,
          "remove_ignored_from_request": false,
          "remove_ignored_from_response": false
        },
        "edge_caching": {
          "new_ttl": 0,
          "override_no_cc": false,
          "override_origin": false,
          "query_string_keep_or_remove_list": []
        },
        "url": {
          "is_wildcard": true,
          "value": "**"
        },
        "version": 1,
        "serve_stale": {
          "enable": false,
          "while_fetching_ttl": 8,
          "origin_sick_ttl": 15
        }
      },
      {
        "version": 1,
        "url": {
          "is_wildcard": true,
          "value": "/test-cgi-esi-include.html"
        },
        "enable_esi": true,
        "edge_caching": {
          "new_ttl": 5,
          "override_no_cc": false,
          "override_origin": false,
          "query_string_list_is_keep": false,
          "query_string_keep_or_remove_list": []
        },
        "browser_caching": {
          "force_revalidate": false,
          "new_ttl": 0,
          "override_edge": true
        },
        "cookies": {
          "ignore_all": false,
          "keep_or_ignore_list": [],
          "list_is_keep": false,
          "override": false,
          "remove_ignored_from_request": false,
          "remove_ignored_from_response": false
        },
        "serve_stale": {
          "enable": false,
          "while_fetching_ttl": 8,
          "origin_sick_ttl": 15
        }
      }
    ];
    cdsConfig.updated_by = 'yegor@revsw.com';
    cds.putDomainConfigsById(domainConfigId, cdsConfig).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    });
  });

  it('should wait till the global and staging config statuses are "Published"', function (done) {
    tools.waitPublishStatus(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    });
  });

  it('should confirm, that ESI include does not work for random url on ' + newDomainName, function (done) {
    tools.getHostRequest(testBPHTTPUrl, '/test-cgi-esi-include-no-cache.html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.be.equal(expectedInvalidESIResponse);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });


  it('should confirm, that ESI include works for ' + newDomainName, function (done) {
    tools.getHostRequest(testBPHTTPUrl, '/test-cgi-esi-include.html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.be.equal(expectedValidESIResponse);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });
});
