process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var request = require('supertest');
var should = require('should-http');
var async = require('async');
var https = require('https');

var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');

var testAPIUrl = (process.env.API_QA_URL) ? process.env.API_QA_URL : 'https://testsjc20-api01.revsw.net:443';

var qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  originHostHeader = 'httpbin.org',
  originServer = 'httpbin.org',
  url = 'http://testsjc20-bp01.revsw.net',
  newDomainName = 'delete-me-API-QA-name-' + Date.now() + '.revsw.net',
  testGroup = '55a56fa6476c10c329a90741',
  AccountId = '',
  domainConfig = '',
  domainConfigId = '',
  rumBeaconString = /<script\ src='\/rev\-diablo\/js\/boomerang\-rev\.min\.js'><\/script><script>BOOMR\.init\(\{RT:\{cookie:'REV\-RT'\,\ strict_referrer:\ false\}\,\ beacon_url:\ 'https:\/\/testsjc20\-rum01\.revsw\.net\/service'\}\);\ BOOMR\.addVar\('user_ip'\,\ '.*?'\);<\/script>/m;


describe('Proxy RUM control enable_rum', function() {

  this.timeout(240000);

  it('should return AccountId', function(done) {
    api.getUsersMyself(testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function(res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.companyId[0];
      done();
    });
  });

  it('should create new configuration for domain ' + newDomainName, function(done) {
    var createDomainConfigJSON = {
      'domain_name': newDomainName,
      'account_id': AccountId,
      'origin_host_header': originHostHeader,
      'origin_server': originServer,
      'origin_server_location_id': testGroup,
      'tolerance': '0'
    };

    api.postDomainConfigs(JSON.stringify(createDomainConfigJSON), testAPIUrl, qaUserWithAdminPerm,
      qaUserWithAdminPermPassword).then(function(res, rej) {
      if (rej) {
        throw rej;
      }
      domainConfigId = res.body.object_id;
      done();
    });
  });

  it('should get domain config and enable_rum must be false', function(done) {
    api.getDomainConfigsById(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .then(function(res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        responseJson.rev_component_co.enable_rum.should.be.false;
        domainConfig = responseJson;
        delete domainConfig.cname;
        delete domainConfig.domain_name;
        done();
      });
  });

  it('should wait max 3 minutes till the global and staging config statuses are "Published" (after create)', function(done) {
    var a = [],
      publishFlag = false,
      responseJson;

    for (var i = 0; i < 18; i++) {
      a.push(i);
    }

    async.eachSeries(a, function(n, callback) {
      setTimeout(function() {
        api.getDomainConfigsByIdStatus(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function(res, rej) {
          if (rej) {
            throw rej;
          }
          responseJson = res.body;
          //console.log('Iteraction ' + n + ', received response = ', JSON.stringify(responseJson));
          if (responseJson.staging_status === 'Published' && responseJson.global_status === 'Published') {
            publishFlag = true;
            callback(true);
          } else {
            callback(false);
          }
        });
      }, 10000);
    }, function(err) {
      if (publishFlag === false) {
        throw 'The configuraton is still not published. Last status response: ' + JSON.stringify(responseJson);
      } else {
        done();
      }
    });
  });

  it('should not get rum code (after create)', function(done) {
    tools.getHostRequest(url, '/html', newDomainName).then(function(res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.not.match(rumBeaconString);
      done();
    });
  });

  it('should change domain config and set enable_rum to true', function(done) {
    domainConfig.rev_component_co.enable_rum = true;
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function(res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after update)', function(done) {
    var a = [],
      publishFlag = false,
      responseJson;

    for (var i = 0; i < 12; i++) {
      a.push(i);
    }

    async.eachSeries(a, function(n, callback) {
      setTimeout(function() {
        api.getDomainConfigsByIdStatus(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function(res, rej) {
          if (rej) {
            throw rej;
          }
          responseJson = res.body;
          //console.log('Iteraction ' + n + ', received response = ', JSON.stringify(responseJson));
          if (responseJson.staging_status === 'Published' && responseJson.global_status === 'Published') {
            publishFlag = true;
            callback(true);
          } else {
            callback(false);
          }
        });
      }, 10000);
    }, function(err) {
      if (publishFlag === false) {
        throw 'The configuraton is still not published. Last status response: ' + JSON.stringify(responseJson);
      } else {
        done();
      }
    });
  });

  it('should get rum code ( after set enable_rum to true )', function(done) {
    tools.getHostRequest(url, '/html', newDomainName).then(function(res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.text.should.match(rumBeaconString);
      done();
    });
  });

  it('should change domain config and set enable_rum to false', function(done) {
    domainConfig.rev_component_co.enable_rum = false;
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function(res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (final update)', function(done) {
    var a = [],
      publishFlag = false,
      responseJson;

    for (var i = 0; i < 12; i++) {
      a.push(i);
    }

    async.eachSeries(a, function(n, callback) {
      setTimeout(function() {
        api.getDomainConfigsByIdStatus(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function(res, rej) {
          if (rej) {
            throw rej;
          }
          responseJson = res.body;
          //console.log('Iteraction ' + n + ', received response = ', JSON.stringify(responseJson));
          if (responseJson.staging_status === 'Published' && responseJson.global_status === 'Published') {
            publishFlag = true;
            callback(true);
          } else {
            callback(false);
          }
        });
      }, 10000);
    }, function(err) {
      if (publishFlag === false) {
        throw 'The configuraton is still not published. Last status response: ' + JSON.stringify(responseJson);
      } else {
        done();
      }
    });
  });

  it('should not get RUM code (after set enable_rum to false)', function(done) {
    tools.getHostRequest(url, '/html', newDomainName).then(function(res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.not.match(rumBeaconString);
      done();
    });
  });

  it('should delete the domain config', function(done) {
    api.deleteDomainConfigsById(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function(res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      //console.log(response_json);
      responseJson.statusCode.should.be.equal(202);
      responseJson.message.should.be.equal('The domain has been scheduled for removal');
      done();
    });
  });

});
