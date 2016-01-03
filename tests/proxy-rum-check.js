process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var async = require('async');
var https = require('https');

var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');

var apiLogin = config.get('qaUserWithAdminPerm'),
    apiPassword = config.get('qaUserWithAdminPermPassword'),
    originHostHeader = 'httpbin.org',
    originServer = 'httpbin.org',
    testHTTPUrl = config.get('test_proxy_http'),
    newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
    testAPIUrl = config.get('testAPIUrl'),
    testGroup = config.get('test_group'),
    AccountId = '',
    domainConfig = '',
    domainConfigId = '',
    rumBeaconString = /<script\ src='\/rev\-diablo\/js\/boomerang\-rev\.min\.js'><\/script><script>BOOMR\.init\(\{RT:\{cookie:'REV\-RT'\,\ strict_referrer:\ false\}\,\ beacon_url:\ 'https:\/\/testsjc20\-rum01\.revsw\.net\/service'\}\);\ BOOMR\.addVar\('user_ip'\,\ '.*?'\);<\/script>/m;


describe('Proxy RUM control enable_rum', function () {

    this.timeout(240000);

    it('should return AccountId', function (done) {
        api.getUsersMyself(testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            AccountId = res.body.companyId[0];
            done();
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
        });
    });

    it('should get domain config and enable_rum must be false', function (done) {
        api.getDomainConfigsById(domainConfigId, testAPIUrl, apiLogin, apiPassword)
            .then(function (res, rej) {
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

    it('should wait max 3 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
        tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 18, 10000).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            res.should.be.ok;
            done();
        });
    });

    it('should not get rum code (after create)', function (done) {
        tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            res.text.should.not.match(rumBeaconString);
            done();
        });
    });

    it('should change domain config and set enable_rum to true', function (done) {
        domainConfig.rev_component_co.enable_rum = true;
        api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
            testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            done();
        });
    });

    it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
        tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
            if (rej) {
                    throw rej;
            }
            res.should.be.ok;
            done();
        });
    });

    it('should get rum code (after set enable_rum to true)', function (done) {
        tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.text);
            res.text.should.match(rumBeaconString);
            done();
        });
    });

    it('should change domain config and set enable_rum to false', function (done) {
        domainConfig.rev_component_co.enable_rum = false;
        api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
            testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            done();
        });
    });

    it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
        tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
            if (rej) {
                    throw rej;
            }
            res.should.be.ok;
            done();
        });
    });

    it('should not get RUM code (after set enable_rum to false)', function (done) {
        tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            res.text.should.not.match(rumBeaconString);
            done();
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
        });
    });

});