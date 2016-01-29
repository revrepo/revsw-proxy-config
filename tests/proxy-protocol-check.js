process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var async = require('async');
var https = require('https');

var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

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


describe('Proxy origin secure protocol checker', function () {

  this.timeout(120000);

  it('should return AccountId', function (done) {
    api.getUsersMyself(testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.companyId[0];
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
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
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should get domain config and origin_secure_protocol must be use_end_user_protocol', function (done) {
    api.getDomainConfigsById(domainConfigId, testAPIUrl, apiLogin, apiPassword)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        //console.log(responseJson);
        responseJson.origin_secure_protocol.should.equal('use_end_user_protocol');
        domainConfig = responseJson;
        delete domainConfig.cname;
        delete domainConfig.domain_name;
        done();
      }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });

  });

  it('should check origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('http');
      //console.log(responseJson.headers);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('https');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('80');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('443');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should change domain config and set origin_secure_protocol to http_only', function (done) {
    domainConfig.origin_secure_protocol = 'http_only';
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('http');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('http');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('80');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('80');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should change domain config and set origin_secure_protocol to https_only', function (done) {
    domainConfig.origin_secure_protocol = 'https_only';
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('https');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('https');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('443');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should check origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('443');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

// disable cache

  it('should change domain config disable cache and set origin_secure_protocol to http_only', function (done) {
    domainConfig.origin_secure_protocol = 'http_only';
    domainConfig.rev_component_bp.enable_cache = false;

    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache and check origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('http');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache and check origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('http');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache and check origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('80');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache and check origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('80');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache and change domain config and set origin_secure_protocol to https_only', function (done) {
    domainConfig.origin_secure_protocol = 'https_only';
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache and check origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('https');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache and check origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('https');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache and check origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('443');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache and check origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('443');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

// enable cache and set co_bypass_locations

  it('should change domain config enable cache, set co_bypass_locations and origin_secure_protocol to http_only', function (done) {
    domainConfig.origin_secure_protocol = 'http_only';
    domainConfig.rev_component_bp.enable_cache = true;
    domainConfig.rev_component_bp.co_bypass_locations = ["/"];

    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set co_bypass_locations and check origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('http');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set co_bypass_locations and check origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('http');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set co_bypass_locations and check origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('80');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set co_bypass_locations and check origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('80');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set co_bypass_locations and change domain config and set origin_secure_protocol to https_only', function (done) {
    domainConfig.origin_secure_protocol = 'https_only';
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set co_bypass_locations and check origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('https');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set co_bypass_locations and check origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('https');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set co_bypass_locations and check origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('443');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set co_bypass_locations and check origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('443');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

// disable cache and set co_bypass_locations

  it('should change domain config disable cache, set co_bypass_locations and origin_secure_protocol to http_only', function (done) {
    domainConfig.origin_secure_protocol = 'http_only';
    domainConfig.rev_component_bp.enable_cache = true;
    domainConfig.rev_component_bp.co_bypass_locations = ["/"];

    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache, set co_bypass_locations and check origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('http');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache, set co_bypass_locations and check origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('http');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache, set co_bypass_locations and check origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('80');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache, set co_bypass_locations and check origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('80');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache, set co_bypass_locations and change domain config and set origin_secure_protocol to https_only', function (done) {
    domainConfig.origin_secure_protocol = 'https_only';
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache, set co_bypass_locations and check origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('https');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache, set co_bypass_locations and check origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/get?show_env=1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var responseJson = JSON.parse(res.text);
      responseJson.headers['X-Forwarded-Proto'].should.be.equal('https');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache, set co_bypass_locations and check origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('443');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable cache, set co_bypass_locations and check origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/envjson.cgi', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      responseJson.SERVER_PORT.should.be.equal('443');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

// enable cache and set cache_bypass_locations

  it('should change domain config enable cache, set cache_bypass_locations and origin_secure_protocol to http_only', function (done) {
    domainConfig.origin_secure_protocol = 'http_only';
    domainConfig.rev_component_bp.enable_cache = true;
    domainConfig.rev_component_bp.cache_bypass_locations = ["/static"];

    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set cache_bypass_locations and check header on origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/image/jpeg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property['x-rev-cache'];
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set cache_bypass_locations and check header on origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/image/jpeg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property['x-rev-cache'];
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set cache_bypass_locations and check header on origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property['x-rev-cache'];
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set cache_bypass_locations and check header on origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property['x-rev-cache'];
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set cache_bypass_locations and change domain config and set origin_secure_protocol to https_only', function (done) {
    domainConfig.origin_secure_protocol = 'https_only';
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set cache_bypass_locations and check header on origin HTTP port', function (done) {
    tools.getHostRequest(testHTTPUrl, '/image/jpeg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property['x-rev-cache'];
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set cache_bypass_locations and check header on origin HTTPS port', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/image/jpeg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property['x-rev-cache'];
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set cache_bypass_locations and check header on origin HTTP port in static folder', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.header.should.not.have.property['x-rev-cache'];
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should set cache_bypass_locations and check header on origin HTTPS port in static folder', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.header.should.not.have.property['x-rev-cache'];
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
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
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

});
