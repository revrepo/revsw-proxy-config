process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var async = require('async');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');

var apiLogin = config.get('qaUserWithAdminPerm'),
    apiPassword = config.get('qaUserWithAdminPermPassword'),
    originHostHeader = 'httpbin.org',
    originServer = 'httpbin.org',
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

describe('Proxy QUIC control enable_quic', function () {

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

    it('should get domain config and enable_quic must be false', function (done) {
        api.getDomainConfigsById(domainConfigId, testAPIUrl, apiLogin, apiPassword)
            .then(function (res, rej) {
                if (rej) {
                    throw rej;
                }
                var responseJson = JSON.parse(res.text);
                responseJson.rev_component_bp.enable_quic.should.be.false;
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

    it('should not get quic header in http request (after create)', function (done) {
        tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
            done();
        });
    });

    it('should not get quic header in https request (after create)', function (done) {
        tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
            done();
        });
    });

    it('should change domain config and set enable_quic to true', function (done) {
        domainConfig.rev_component_bp.enable_quic = true;
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
        });
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
        });
    });

    it('should change domain config and set enable_quic to false', function (done) {
        domainConfig.rev_component_bp.enable_quic = false;
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

    it('should not get quic header in http request (after set enable_quic to false)', function (done) {
        tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
            done();
        });
    });

    it('should not get quic header in https request (after set enable_quic to false)', function (done) {
        tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
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
