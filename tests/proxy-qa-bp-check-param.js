process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var request = require('supertest');
var should = require('should-http');
//var should = require('should');
var express = require('express');
var fs = require('fs');
var https = require('https');
var sleep = require('sleep');

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://testsjc20-api01.revsw.net:443';

var qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
    qaUserWithResellerPermPassword = 'password1',
    originHostHeader = 'httpbin.org',
    originServer = 'httpbin.org',
    url = 'http://testsjc20-bp03.revsw.net',
    newDomainName = 'delete-me-API-QA-name-' + Date.now() + '.revsw.net',
    testGroup = '55a56fa6476c10c329a90741',
    UserId = '',
    domainConfig = '',
    domainConfigId = '';

describe('Rev API Admin User', function () {

    this.timeout(60000);

    it('should return UserId', function (done) {
        request(testAPIUrl)
            .get('/v1/users/myself')
            .auth(qaUserWithAdminPerm, qaUserWithResellerPermPassword)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return reject(err);
                }
                response_json = JSON.parse(res.text);
                response_json.companyId[0].should.be.a.String();
                response_json.role.should.be.equal('admin');
                //console.log(response_json);
                UserId = res.body.companyId[0];
                done();
            });
    });

    it('should create new configuration for domain ' + newDomainName, function (done) {
        //console.log(UserId);
        var createDomainConfigJSON = {
            'domain_name': newDomainName,
            'account_id': UserId,
            'origin_host_header': originHostHeader,
            'origin_server': originServer,
            'origin_server_location_id': testGroup,
            'tolerance': '0'
        };
        request(testAPIUrl)
            .post('/v1/domain_configs')
            .auth(qaUserWithAdminPerm, qaUserWithResellerPermPassword)
            .send(createDomainConfigJSON)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    console.log(err);
                    throw err;
                }
                response_json = JSON.parse(res.text);
                response_json.statusCode.should.be.equal(200);
                response_json.object_id.should.be.a.String();
                response_json.message.should.be.equal('Successfully created new domain configuration');
                //console.log(response_json);
                domainConfigId = res.body.object_id;
                console.log(domainConfigId)
                done();
            });
    });

    it('should get domain config', function (done) {
        request(testAPIUrl)
            .get('/v1/domain_configs/' + domainConfigId)
            .auth(qaUserWithAdminPerm, qaUserWithResellerPermPassword)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return reject(err);
                }
                response_json = JSON.parse(res.text);
                //console.log(response_json);
                response_json.domain_name.should.be.equal(newDomainName);
                response_json.origin_server.should.be.equal(originServer);
                response_json.origin_host_header.should.be.equal(originHostHeader);
                domainConfig = response_json;
                done();
            });
    });

    it('should validate a domain config', function (done) {
        domainConfig.rev_component_co.enable_rum = true;
        delete domainConfig.cname;
        delete domainConfig.domain_name;
        //console.log(updatedConfigJson);
        request(testAPIUrl)
            .put('/v1/domain_configs/' + domainConfigId + '?options=verify_only')
            .auth(qaUserWithAdminPerm, qaUserWithResellerPermPassword)
            .send(domainConfig)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    console.log(res);
                    throw err;
                }
                response_json = JSON.parse(res.text);
                //console.log(response_json);
                response_json.statusCode.should.be.equal(200);
                response_json.message.should.be.equal('Successfully verified the domain configuration');
                done();
            });
    });

    it('should update a domain config with publish', function (done) {
        //console.log('Config to send: ', JSON.stringify(domainConfig));
        request(testAPIUrl)
            .put('/v1/domain_configs/' + domainConfigId + '?options=publish')
            .auth(qaUserWithAdminPerm, qaUserWithResellerPermPassword)
            .send(domainConfig)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                var response_json = res.body;
                response_json.statusCode.should.be.equal(202);
                response_json.message.should.be.equal('Successfully saved the domain configuration');
                done();
            });
    });

    it('should get rum code', function (done) {
        request(url)
            .get('/html')
            .set('Host', newDomainName)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                response_header = res.header;
                response_text = res.text;

                console.log(response_header);
                console.log(response_text);
                response_text.should.containEql('/rev-diablo/js/boomerang-rev.min.js');
                //response_text.should.not.containEql('/rev-diablo/js/boomerang-rev.min.js');
                done();
            });
    });

    it('should validate a domain config after changes', function (done) {
        domainConfig.rev_component_co.enable_rum = false;
        delete domainConfig.cname;
        delete domainConfig.domain_name;
        //console.log(updatedConfigJson);
        request(testAPIUrl)
            .put('/v1/domain_configs/' + domainConfigId + '?options=verify_only')
            .auth(qaUserWithAdminPerm, qaUserWithResellerPermPassword)
            .send(domainConfig)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    console.log(res);
                    throw err;
                }
                response_json = JSON.parse(res.text);
                //console.log(response_json);
                response_json.statusCode.should.be.equal(200);
                response_json.message.should.be.equal('Successfully verified the domain configuration');
                done();
            });
    });

    it('should update a domain config with publish after changes', function (done) {
        //console.log('Config to send: ', JSON.stringify(domainConfig));
        request(testAPIUrl)
            .put('/v1/domain_configs/' + domainConfigId + '?options=publish')
            .auth(qaUserWithAdminPerm, qaUserWithResellerPermPassword)
            .send(domainConfig)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                var response_json = res.body;
                response_json.statusCode.should.be.equal(202);
                response_json.message.should.be.equal('Successfully saved the domain configuration');
                done();
            });
    });

    it('should not get rum code', function (done) {
        request(url)
            .get('/html')
            .set('Host', newDomainName)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                response_header = res.header;
                response_text = res.text;

                console.log(response_header);
                console.log(response_text);
                //response_text.should.containEql('/rev-diablo/js/boomerang-rev.min.js');
                response_text.should.not.containEql('/rev-diablo/js/boomerang-rev.min.js');
                done();
            });
    });

    it('should delete the domain config', function (done) {
        request(testAPIUrl)
            .del('/v1/domain_configs/' + domainConfigId)
            .auth(qaUserWithAdminPerm, qaUserWithResellerPermPassword)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                response_json = JSON.parse(res.text);
                //console.log(response_json);
                response_json.statusCode.should.be.equal(202);
                response_json.message.should.be.equal('The domain has been scheduled for removal');
                done();
            });
    });

});