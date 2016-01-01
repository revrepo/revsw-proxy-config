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
    httpUrl = config.get('test_proxy_http'),
    httpsUrl = config.get('test_proxy_https'),
    newDomainName = 'delete-me-API-QA-name-' + Date.now() + '.revsw.net',
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
        var a = [],
            publishFlag = false,
            responseJson;

        for (var i = 0; i < 18; i++) {
            a.push(i);
        }

        async.eachSeries(a, function (n, callback) {
            setTimeout(function () {
                api.getDomainConfigsByIdStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
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
        }, function (err) {
            if (publishFlag === false) {
                throw 'The configuraton is still not published. Last status response: ' + JSON.stringify(responseJson);
            } else {
                done();
            }
        });
    });

    it('should not get quic header in http request (after create)', function (done) {
        tools.getHostRequest(httpUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.properties(['alternate-protocol','alt-svc']);
            done();
        });
    });

    it('should not get quic header in https request (after create)', function (done) {
        tools.getHostRequest(httpsUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.properties(['alternate-protocol','alt-svc']);
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

    it('should wait max 2 minutes till the global and staging config statuses are "Published" (after update)', function (done) {
        var a = [],
            publishFlag = false,
            responseJson;

        for (var i = 0; i < 12; i++) {
            a.push(i);
        }

        async.eachSeries(a, function (n, callback) {
            setTimeout(function () {
                api.getDomainConfigsByIdStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
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
        }, function (err) {
            if (publishFlag === false) {
                throw 'The configuraton is still not published. Last status response: ' + JSON.stringify(responseJson);
            } else {
                done();
            }
        });
    });

    it('should get quic headers in http request (after config update)', function (done) {
        tools.getHostRequest(httpUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.have.properties(['alternate-protocol','alt-svc']);
            if (res.header['alternate-protocol']) { res.header['alternate-protocol'].should.equal(headerAlternateProtocol); }
            if (res.header['alt-svc']) { res.header['alt-svc'].should.startWith(headerAltSvc); }
            done();
        });
    });

    it('should get quic headers in https request (after config update)', function (done) {
        tools.getHostRequest(httpsUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.have.properties(['alternate-protocol','alt-svc']);
            if (res.header['alternate-protocol']) { res.header['alternate-protocol'].should.equal(headerAlternateProtocol); }
            if (res.header['alt-svc']) { res.header['alt-svc'].should.startWith(headerAltSvc); }
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

    it('should wait max 2 minutes till the global and staging config statuses are "Published" (final update)', function (done) {
        var a = [],
            publishFlag = false,
            responseJson;

        for (var i = 0; i < 12; i++) {
            a.push(i);
        }

        async.eachSeries(a, function (n, callback) {
            setTimeout(function () {
                api.getDomainConfigsByIdStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
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
        }, function (err) {
            if (publishFlag === false) {
                throw 'The configuraton is still not published. Last status response: ' + JSON.stringify(responseJson);
            } else {
                done();
            }
        });
    });

    it('should not get quic header in http request (after set enable_quic to false)', function (done) {
        tools.getHostRequest(httpUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.properties(['alternate-protocol','alt-svc']);
            done();
        });
    });

    it('should not get quic header in https request (after set enable_quic to false)', function (done) {
        tools.getHostRequest(httpsUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.properties(['alternate-protocol','alt-svc']);
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
