process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var async = require('async');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var apiLogin = config.get('qaUserWithAdminPerm'),
  apiPassword = config.get('qaUserWithAdminPermPassword'),
  originHostHeader = 'cdn.mbeans2.com',
  originServer = 'cdn.mbeans2.com',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testAPIUrl = config.get('testAPIUrl'),
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfig = '',
  domainConfigId = '',
  contentHTTPLength='',
  contentHTTPSLength='';

api.debugMode(false);

describe('Proxy decompression control ', function () {

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

  it('should get domain config and enable_decompression must be true if present on config', function (done) {
    api.getDomainConfigsById(domainConfigId, testAPIUrl, apiLogin, apiPassword)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        if (responseJson.rev_component_co.enable_decompression) {
          responseJson.rev_component_co.enable_decompression.should.equal(true);
        }
        //console.log(responseJson);
        //responseJson.rev_component_co.enable_decompression.should.be.equal(true);
        domainConfig = responseJson;
        delete domainConfig.cname;
        delete domainConfig.domain_name;
        done();
      }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published"', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(util.getError(err)); });

  });

  it('should get HTTP content length after domain create', function (done) {
    tools.getHostRequest(testHTTPUrl, '/media/fonts/ProximaNova.svg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }

      if (res.req.socket.bytesRead) {
        contentHTTPLength = res.req.socket.bytesRead;
      } else if (res.req.socket.socket.bytesRead) {
        contentHTTPLength = res.req.socket.socket.bytesRead;
      }

      //console.log(contentHTTPLength);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get HTTPS content length after domain create', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/media/fonts/ProximaNova.svg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }

      if (res.req.socket.bytesRead) {
        contentHTTPSLength = res.req.socket.bytesRead;
      } else if (res.req.socket.socket.bytesRead) {
        contentHTTPSLength = res.req.socket.socket.bytesRead;
      }
      //console.log(contentHTTPSLength);
      done();
    }).catch(function (err) { done(util.getError(err)); });;
  });

  it('should change domain config and disable enable_decompression and enable_cache', function (done) {
    domainConfig.rev_component_bp.enable_cache = false;
    domainConfig.rev_component_co.enable_decompression = false;
    api.putDomainConfigsById(domainConfigId, domainConfig, testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published"', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(util.getError(err)); });

  });

  it('should get HTTP content length and check that it is smaller after config changes', function (done) {
    tools.getHostRequest(testHTTPUrl, '/media/fonts/ProximaNova.svg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      if (res.req.socket.bytesRead) {
        var HTTPLength = res.req.socket.bytesRead;
      } else if (res.req.socket.socket.bytesRead) {
        var HTTPLength = res.req.socket.socket.bytesRead;
      }
      HTTPLength.should.match(function(n) { return n < contentHTTPLength; });
      contentHTTPLength = HTTPLength;
      //console.log(contentHTTPLength);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

    it('should get HTTPS content length and check that it is smaller after config changes', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/media/fonts/ProximaNova.svg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      if (res.req.socket.bytesRead) {
        var HTTPSLength = res.req.socket.bytesRead;
      } else if (res.req.socket.socket.bytesRead) {
        var HTTPSLength = res.req.socket.socket.bytesRead;
      }
      HTTPSLength.should.match(function(n) { return n < contentHTTPSLength; });
      contentHTTPSLength = HTTPSLength;
      //console.log(contentHTTPSLength);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should change domain config and set enable_decompression to true', function (done) {
    domainConfig.rev_component_co.enable_decompression = true;
    api.putDomainConfigsById(domainConfigId, domainConfig, testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published"', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get HTTP content length and check that it is bigger after config changes', function (done) {
    tools.getHostRequest(testHTTPUrl, '/media/fonts/ProximaNova.svg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      if (res.req.socket.bytesRead) {
        var HTTPLength = res.req.socket.bytesRead;
      } else if (res.req.socket.socket.bytesRead) {
        var HTTPLength = res.req.socket.socket.bytesRead;
      }
      HTTPLength.should.match(function(n) { return n > contentHTTPLength; });
      contentHTTPLength = HTTPLength;
      //console.log(contentHTTPLength);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get HTTPS content length and check that it is bigger after config changes', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/media/fonts/ProximaNova.svg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      if (res.req.socket.bytesRead) {
        var HTTPSLength = res.req.socket.bytesRead;
      } else if (res.req.socket.socket.bytesRead) {
        var HTTPSLength = res.req.socket.socket.bytesRead;
      }
      HTTPSLength.should.match(function(n) { return n > contentHTTPSLength; });
      contentHTTPSLength = HTTPSLength;
      //console.log(contentHTTPSLength);
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
