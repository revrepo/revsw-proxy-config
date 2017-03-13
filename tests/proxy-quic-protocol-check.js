process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');
var quic = require('./proxy-qa-libs/quic-runner.js')

var originHostHeader = 'httpbin_org.revsw.net',
  originServer = 'httpbin_org.revsw.net',
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testGroup = config.get('test_group'),
  AccountId = '',
  AccountIP = '',
  ipCheckString = '',
  forwardedIP = '1.2.3.4',
  testProxyIp = config.get('test_proxy_ip'),
  domainConfig = '',
  domainConfigId = '';

describe('Proxy QUIC protocol control', function () {

  this.timeout(240000);

  before(function (done) {
    tools.beforeSetDomain(newDomainName, originServer)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        domainConfigId = res.id;
        domainConfig = res.config;
        return tools.afterSetDomain(domainConfigId, domainConfig);
      })
      .catch(function(err) { done(util.getError(err)) })
      .then(function() { done(); })
  });

  after(function (done) {
    console.log('[===] delete the domain config');
    api.deleteDomainConfigsById(domainConfigId).then(function (res, rej) {
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

  it('(smoke) should return AccountId', function (done) {
    api.getUsersMyself().then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.account_id;
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('(smoke) should get system IP', function (done) {
    tools.getRequest('http://' + originServer, '/ip').then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      AccountIP = response_json.origin;
      ipCheckString = AccountIP + ', ' + testProxyIp;
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('(smoke) should / make request by 443 port and check status code', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }
    resp.Status.should.be.equal(200);
    done();
  });

  it('should make / request on 443 port and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Headers.Age.should.be.containEql('0');
    resp.Headers['Content-Type'].should.be.containEql('text/html; charset=utf-8');
    resp.Headers['X-Rev-Beresp-Grace'].should.be.containEql('60.000');
    resp.Headers['X-Rev-Beresp-Ttl'].should.be.containEql('0.000');
    resp.Headers['X-Rev-Cache'].should.be.containEql('MISS');

    //console.log(resp.Headers);
    done();
  });

  it('should make /cache/5 request and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/cache/5", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Headers['Content-Type'].should.be.containEql('application/json');
    resp.Headers['X-Rev-Beresp-Grace'].should.be.containEql('60.000');
    resp.Headers['X-Rev-Beresp-Ttl'].should.be.containEql('5.000');
    resp.Headers['X-Rev-Cache'].should.be.containEql('MISS');
    resp.Headers['Cache-Control'].should.be.containEql('public, max-age=5');
    resp.Headers['X-Rev-Origin-Ka'].should.be.not.containEql('1');

    //console.log(resp.Headers);
    done();
  });

  it('should make /cache/5 again request and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/cache/5", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Headers['Content-Type'].should.be.containEql('application/json');
    resp.Headers['X-Rev-Beresp-Grace'].should.be.containEql('60.000');
    resp.Headers['X-Rev-Beresp-Ttl'].should.be.containEql('5.000');
    resp.Headers['X-Rev-Cache'].should.be.containEql('HIT');
    resp.Headers['Cache-Control'].should.be.containEql('public, max-age=5');
    resp.Headers['X-Rev-Origin-Ka'].should.be.not.containEql('1');

    //console.log(resp.Headers);
    done();
  });

  it('should make /cache/60 request and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/cache/60", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Headers['Content-Type'].should.be.containEql('application/json');
    resp.Headers['X-Rev-Beresp-Grace'].should.be.containEql('60.000');
    resp.Headers['X-Rev-Beresp-Ttl'].should.be.containEql('60.000');
    resp.Headers['X-Rev-Cache'].should.be.containEql('MISS');
    resp.Headers['Cache-Control'].should.be.containEql('public, max-age=60');
    resp.Headers['X-Rev-Origin-Ka'].should.be.not.containEql('1');

    //console.log(resp.Headers);
    done();
  });

  it('should make /ip request and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/ip", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Reply.should.be.containEql(ipCheckString);
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /ip request with set XFF and check that proxy ignores it', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/ip", "Headers": { "Host": ["'+newDomainName+'"], "X-Forwarded-For": ["'+forwardedIP+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Reply.should.be.containEql(ipCheckString);
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /ip request with set QUIC and check that proxy ignores it', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/ip", "Headers": { "Host": ["'+newDomainName+'"], "X-Rev-Transport": ["QUIC"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Reply.should.be.containEql(ipCheckString);
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /post request and check status', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/post", "Headers": { "Host": ["'+newDomainName+'"] }, "Method": "POST", "Data": "test=test" }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Reply.should.be.containEql(ipCheckString);
    resp.Reply.should.be.containEql("test=test");
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /post request and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/post", "Headers": { "Host": ["'+newDomainName+'"] }, "Method": "POST", "Data": "test=test" }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Headers['X-Rev-Cache'].should.be.containEql('MISS');
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /patch request and check status', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/patch", "Headers": { "Host": ["'+newDomainName+'"] }, "Method": "PATCH" }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Reply.should.be.containEql(ipCheckString);
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /patch request and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/patch", "Headers": { "Host": ["'+newDomainName+'"] }, "Method": "PATCH" }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Headers['X-Rev-Cache'].should.be.containEql('MISS');
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /put request and check status', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/put", "Headers": { "Host": ["'+newDomainName+'"] }, "Method": "PUT" }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Reply.should.be.containEql(ipCheckString);
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /put request and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/put", "Headers": { "Host": ["'+newDomainName+'"] }, "Method": "PUT" }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Headers['X-Rev-Cache'].should.be.containEql('MISS');
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /delete request and check status', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/delete", "Headers": { "Host": ["'+newDomainName+'"] }, "Method": "DELETE" }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Reply.should.be.containEql(ipCheckString);
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('should make /delete request and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/delete", "Headers": { "Host": ["'+newDomainName+'"] }, "Method": "DELETE" }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Headers['X-Rev-Cache'].should.be.containEql('MISS');
    //console.log(resp.Reply)
    //console.log(resp.Headers);
    done();
  });

  it('(smoke) should get CSS file request by 443 port', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/static/file.css", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }
    resp.Status.should.be.equal(200);
    //console.log(resp.Headers);
    done();
  });

  it('should get CSS file request by 443 port and check headers', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/static/file.css", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }
    resp.Status.should.be.equal(200);
    //console.log(resp.Headers);

    resp.Headers['Content-Type'].should.be.containEql('text/css');
    resp.Headers['X-Rev-Host'].should.be.containEql(newDomainName);
    resp.Headers['X-Rev-Url'].should.be.containEql('/static/file.css');

    done();
  });

  it('should get CSS file request by 443 port and check cache', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443/static/file.css", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = quic.send(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(200);
    resp.Headers['X-Rev-Cache'].should.be.containEql('HIT');
    resp.Headers['X-Rev-Beresp-Ttl'].should.be.containEql('1440000.000');
    resp.Headers['X-Rev-Cache-Be-1st-Byte-Time'].should.be.containEql('0');
    resp.Headers['X-Rev-Be-1st-Byte-Time'].should.be.containEql('0');
    resp.Headers['X-Rev-Beresp-Grace'].should.be.containEql('60.000');
    resp.Headers.should.have.properties(['X-Rev-Obj-Ttl', 'X-Rev-Cache-Total-Time', 'X-Rev-Cache-Hits']);
    resp.Headers.should.not.have.properties(['Set-Cookie', 'X-Rev-Hit-For-Pass']);

    done();
  });

});
