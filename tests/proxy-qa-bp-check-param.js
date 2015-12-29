process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var request = require('supertest');
var should = require('should-http');
//var should = require('should');
var fs = require('fs');
var vm = require('vm');

var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');

var express = require('express');
var async = require('async');
var https = require('https');
var sleep = require('sleep');

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://testsjc20-api01.revsw.net:443';

var qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
    qaUserWithAdminPermPassword = 'password1',
    originHostHeader = 'httpbin.org',
    originServer = 'httpbin.org',
    url = 'http://testsjc20-bp03.revsw.net',
    newDomainName = 'delete-me-API-QA-name-' + Date.now() + '.revsw.net',
    testGroup = '55a56fa6476c10c329a90741',
    AccountId = '',
    domainConfig = '',
    domainConfigId = '';

describe('API external test - check enable_rum parameter', function () {

    this.timeout(240000);

    it('should return AccountId', function (done) {
        api.get_users_myself(testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function (res) {
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

        api.post_domain_configs(JSON.stringify(createDomainConfigJSON), testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function (res, rej) {
            if (rej) {
                throw rej;
            }
            domainConfigId = res.body.object_id;
            done();
        });
    });

    it('should get domain config and enable_rum must be false', function (done) {
        api.get_domain_configs_by_id(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function (res) {
                response_json = JSON.parse(res.text);
                response_json.rev_component_co.enable_rum.should.be.false;
                domainConfig = response_json;
                delete domainConfig.cname;
                delete domainConfig.domain_name;
                done();
            });
    });

    it('should wait max 3 minutes till the global and staging config statuses are "Published" ( after create )', function (done) {
        var a = [],
            publishFlag = false,
            response_json;

        for (var i = 0; i < 18; i++) { a.push(i); }

        async.eachSeries(a, function (n, callback) {
            setTimeout(function () {
                api.get_domain_configs_by_id_status(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function (res) {
                    response_json = res.body;
                    //console.log('Iteraction ' + n + ', received response = ', JSON.stringify(response_json));
                    if (response_json.staging_status === 'Published' && response_json.global_status === 'Published') {
                        publishFlag = true;
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            }, 10000);
        }, function (err) {
            if (publishFlag === false) {
                throw 'The configuraton is still not published. Last status response: ' + JSON.stringify(response_json);
            } else {
                done();
            }
        });
    });

    it('should not get rum code ( after create )', function (done) {
        tools.get_host_request(url,'/html', newDomainName).then(function(res){
            res.text.should.not.containEql('/rev-diablo/js/boomerang-rev.min.js');
            done();
        });
    });

    it('should change domain config and set enable_rum to true', function (done) {
        domainConfig.rev_component_co.enable_rum = true;
        domainConfig.rev_component_bp.enable_cache = false;
        api.put_domain_configs_by_id(domainConfigId, '?options=publish', domainConfig, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function (res) {
            done();
        });
    });

    it('should wait max 2 minutes till the global and staging config statuses are "Published" ( after update )', function (done) {
        var a = [],
            publishFlag = false,
            response_json;

        for (var i = 0; i < 12; i++) { a.push(i); }

        async.eachSeries(a, function (n, callback) {
            setTimeout(function () {
                api.get_domain_configs_by_id_status(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function (res) {
                    response_json = res.body;
                    //console.log('Iteraction ' + n + ', received response = ', JSON.stringify(response_json));
                    if (response_json.staging_status === 'Published' && response_json.global_status === 'Published') {
                        publishFlag = true;
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            }, 10000);
        }, function (err) {
            if (publishFlag === false) {
                throw 'The configuraton is still not published. Last status response: ' + JSON.stringify(response_json);
            } else {
                done();
            }
        });
    });

    it('should get rum code ( after set enable_rum to true )', function (done) {
        tools.get_host_request(url,'/html', newDomainName).then(function(res){
            res.text.should.containEql('/rev-diablo/js/boomerang-rev.min.js');
            done();
        });
    });

    it('should change domain config and set enable_rum to false', function (done) {
        domainConfig.rev_component_co.enable_rum = false;
        domainConfig.rev_component_bp.enable_cache = false;
        api.put_domain_configs_by_id(domainConfigId, '?options=publish', domainConfig, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function (res) {
            done();
        });
    });

    it('should wait max 2 minutes till the global and staging config statuses are "Published" ( final update )', function (done) {
        var a = [],
            publishFlag = false,
            response_json;

        for (var i = 0; i < 12; i++) { a.push(i); }

        async.eachSeries(a, function (n, callback) {
            setTimeout(function () {
                api.get_domain_configs_by_id_status(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function (res) {
                    response_json = res.body;
                    //console.log('Iteraction ' + n + ', received response = ', JSON.stringify(response_json));
                    if (response_json.staging_status === 'Published' && response_json.global_status === 'Published') {
                        publishFlag = true;
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            }, 10000);
        }, function (err) {
            if (publishFlag === false) {
                throw 'The configuraton is still not published. Last status response: ' + JSON.stringify(response_json);
            } else {
                done();
            }
        });
    });

    it('should not get rum code ( after set enable_rum to false )', function (done) {
        tools.get_host_request(url,'/html', newDomainName).then(function(res){
            res.text.should.not.containEql('/rev-diablo/js/boomerang-rev.min.js');
            done();
        });
    });

    it('should delete the domain config', function (done) {
        api.delete_domain_configs_by_id(domainConfigId, testAPIUrl, qaUserWithAdminPerm, qaUserWithAdminPermPassword).then(function (res) {
            response_json = JSON.parse(res.text);
            //console.log(response_json);
            response_json.statusCode.should.be.equal(202);
            response_json.message.should.be.equal('The domain has been scheduled for removal');
            done();
        });
    });

});