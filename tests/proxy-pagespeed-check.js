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
    regexPagespeed = /[0-9]{1,10}\.[0-9]{1,10}\.[0-9]{1,10}\.[0-9-]{1,10}/m;

describe('Proxy Pagespeed control enable_optimization', function () {

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

    it('should get domain config and enable_optimization must be false', function (done) {
        api.getDomainConfigsById(domainConfigId, testAPIUrl, apiLogin, apiPassword)
            .then(function (res, rej) {
                if (rej) {
                    throw rej;
                }
                var responseJson = JSON.parse(res.text);
                responseJson.rev_component_co.enable_optimization.should.be.false;
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

    it('should not get Pagespeed header in http request (after create)', function (done) {
        tools.getHostRequest(httpUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.property(['x-page-speed']);
            done();
        });
    });

    it('should not get Pagespeed header in https request (after create)', function (done) {
        tools.getHostRequest(httpsUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.property(['x-page-speed']);
            done();
        });
    });

    it('should change domain config and set enable_optimization to true', function (done) {
        domainConfig.rev_component_co.enable_optimization = true;
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

    it('should get Pagespeed headers in http request (after config update)', function (done) {
        tools.getHostRequest(httpUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.have.property(['x-page-speed']);
            if (res.header['x-page-speed']) { res.header['x-page-speed'].should.match(regexPagespeed); }
            done();
        });
    });

    it('should get Pagespeed headers in https request (after config update)', function (done) {
        tools.getHostRequest(httpsUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.have.property(['x-page-speed']);
            if (res.header['x-page-speed']) { res.header['x-page-speed'].should.match(regexPagespeed); }
            done();
        });
    });

    it('should change domain config and set enable_optimization to false', function (done) {
        domainConfig.rev_component_co.enable_optimization = false;
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

    it('should not get Pagespeed header in http request (after set enable_optimization to false)', function (done) {
        tools.getHostRequest(httpUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.property(['x-page-speed']);
            done();
        });
    });

    it('should not get Pagespeed header in https request (after set enable_optimization to false)', function (done) {
        tools.getHostRequest(httpsUrl, '/html', newDomainName).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            //console.log(res.header);
            res.header.should.not.have.property(['x-page-speed']);
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
