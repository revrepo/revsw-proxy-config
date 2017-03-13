require('shelljs/global');

  function getMockOutput() {
var hered0c = heredoc(function () {/* Connected to 192.168.4.50:443
[0313/140216.463071:INFO:quic_session.cc(350)] REVSW: [5] locking g_dyn_stream_mutex for CloseStreamInner()
[0313/140216.463212:INFO:quic_session.cc(381)] REVSW: [5] erasing dynamic stream
[0313/140216.463239:INFO:quic_session.cc(383)] REVSW: [5] erased dynamic stream
[0313/140216.463261:INFO:quic_session.cc(394)] REVSW: [5] before OnClose()
[0313/140216.463734:INFO:quic_session.cc(396)] REVSW: [5] after OnClose()
[0313/140216.463757:INFO:quic_session.cc(401)] REVSW: [5] UNlocking g_dyn_stream_mutex for CloseStreamInner() (reason 2)
Request:
headers:
{
:method:GET
:authority:quic-test.revsw.net
:scheme:https
:path:/
}
body:

Response:
headers:
{
:version:HTTP/1.1
:status:200
cache-control:no-store, no-cache, must-revalidate, post-check=0, pre-check=0
pragma:no-cache
x-powered-by:PHP/5.6.30
x-rev-cache-be-1st-byte-time:164066
server:nginx
vary:Accept-Encoding
x-rev-be-1st-byte-time:164066
content-type:text/html; charset=UTF-8
connection:keep-alive
alternate-protocol:443:quic,p=1
x-rev-cache-total-time:164149
date:Mon, 13 Mar 2017 12:04:31 GMT
alt-svc:quic=":443"; p="1"; ma=120
set-cookie:Visitor=1; Path=/; Host=mbeans.com; Domain=mbeans.com; Expires=Thu, 31 Dec 2037 05:00:00 GMT; Max-Age=630720000InitialReferrer=; path=/; host=mbeans.com; domain=mbeans.com; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0SessionTest=1; Path=/; Domain=mbeans.comUserSession=%7B%22LastPage%22%3A%22http%3A%5C%2F%5C%2Fmbeans.com%5C%2FHome%22%7D; Path=/; Domain=mbeans.comUserSession=%7B%22LastPage%22%3A%22http%3A%5C%2F%5C%2Fmbeans.com%5C%2FHome%22%2C%22LastFile%22%3A%22Plugin%5C%2FMBeans-Home%5C%2FHome.php%22%7D; Path=/; Domain=mbeans.com
via:1.1 rev-cache
accept-ranges:bytes
x-rev-id:7050162
age:0
x-rev-cache:MISS
expires:Mon, 26 Jul 1997 05:00:00 GMT
content-length:67014
}

body: <!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en" class="no-js">
<head><script>var revJSSubst={nshards:0,domains:{'http://api.mixpanel.com':1,'http://cdn.mxpnl.com':1,'http://commondatastorage.googleapis.com':1,'http://connect.nosto.com':1,'http://dev.visualwebsiteoptimizer.com':1,'http://js.hs-analytics.net':1,'http://ocsp.omniroot.com':1,'http://px.steelhousemedia.com':1,'http://s7.addthis.com':1,'http://t.p.mybuys.com':1,'http://urs.microsoft.com':1,'http://vassg142.ocsp.omniroot.com':1,'http://www.google-analytics.com':1},keep_https:1};</script><script src='/rev-js/rev-js-substitute.min.js'></script>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>Magic Beans | Best Baby Store &amp; Toys | Boston MA Fairfield CT | Strollers, Baby Registry, Car Seats | Free Shipping</title>
<meta name="robots" content="all" />
<meta name="robots" content="follow,index,noodp,noydir" />
<meta name="googlebot" content="follow,index,noodp" />
<link rel="canonical" href="/" />
<meta name="keywords" content="baby toys gear strollers furniture nursery gift stores newest usa toy games plush alex blog infant activity kids bjorn organic family books stokke lego teethers playmobil blocks preschool rattles creativity playthings britax bugaboo boston registry" />
<meta name="description" content="Shop our handpicked selection of strollers &amp; baby gear, and our kid-tested menu of toys for all ages. Free gift wrap, free shipping on orders over $75." />
</div>	</div></div><script>PS.ExecuteOnLoad(function(){Billboard.Create({CatID:20,CatScriptName:'Home2',CatSettings:{"SwapTime":5},Entries:[[1038,'PS.Redirect(\'http://droolbabyexpo.com\');','Drool Baby Expo 2017 Billboard','','','Drool-Billboard-Jan2017-Desktop.jpg',980,325,'',0,0,'',0,0],[1044,'PS.Redirect(\'/Resource-Center-Baby-Gear-and-Toys\');','Car Seats Feb 2017','','','Car-Seats-Feb-2017-Desktop.jpg',980,325,'',0,0,'',0,0],[1046,'PS.Redirect(\'/strollers\');','Strollers - Feb 2017','','','Strollers-Feb-2017-Desktop.jpg',980,325,'',0,0,'',0,0],[1048,'PS.Redirect(\'/needhelp\');','Baby Carriers - Feb 2017','','','Baby-Carriers-Feb-2017-Desktop.jpg',980,325,'',0,0,'',0,0],[1050,'PS.Redirect(\'/nuna-sena-aire-travel-crib.html\');','Nuna Sena Aire','','','Nuna-Sena-Aire-Feb-2017-Desktop.jpg',980,325,'',0,0,'',0,0]]});});PS.ExecuteOnLoad(function(){Billboard.Create({CatID:19,CatScriptName:'Home-Small',CatSettings:{"SwapTime":5},Entries:[[1039,'PS.Redirect(\'http://droolbabyexpo.com\');','Drool Baby Expo 2017 Billboard','','','Drool-Billboard-Jan2017-Mobile.jpg',600,200,'',0,0,'',0,0],[1045,'PS.Redirect(\'/Resource-Center-Baby-Gear-and-Toys\');','Car Seats Feb 2017','','','Car-Seats-Feb-2017-Mobile.jpg',600,200,'',0,0,'',0,0],[1047,'PS.Redirect(\'/strollers\');','Strollers - Feb 2017','','','Strollers-Feb-2017-Mobile.jpg',600,200,'',0,0,'',0,0],[1049,'PS.Redirect(\'/needhelp\');','Baby Carriers - Feb 2017','','','Baby-Carriers-Feb-2017-Mobile.jpg',600,200,'',0,0,'',0,0],[1051,'PS.Redirect(\'/nuna-sena-aire-travel-crib.html\');','Nuna Sena Aire','','','Nuna-Sena-Aire-Feb-2017-Mobile.jpg',600,200,'',0,0,'',0,0]]});});</script></div></div></div><footer>
<div id="FooterBar"><div id="FooterNewsletter"><div id="FooterNewsletterText"><a href="#"><u>Sign up</u> for our newsletter <strong>beanstalk</strong> - get special deals, top picks &amp; more!</a></div><div id="FooterNewsletterButton"><a href="#"><span>Sign me up</span></a></div></div></div>	<div id="FooterInner">
<nav id="FooterLinks"><div class="FooterLinkList CustomerService"><div class="FooterLLTitle"><div class="FooterLLTIcon"></div><span>Customer Service</span></div><ul class="FooterLLList"><li><a href="/contact-magic-beans.html">Contact Us</a></li><li><a href="/order-status.html">Order Status</a></li><li><a href="/my-account.html">My Account</a></li><li><a href="/wish-lists">My Wish List</a></li><li><a href="/return-policy" onclick="PS.MeMSO.DynamicPopup('',22);return PS.NoDefault(event);">Return Policy</a></li><li><a href="/dynamic.php?pageid=71" onclick="PS.MeMSO.DynamicPopup('',71);return PS.NoDefault(event);">International Shipping</a></li><li><a href="/our-legal-policy.html" onclick="PS.MeMSO.DynamicPopup('',72);return PS.NoDefault(event);">Privacy Policy</a></li><li><a href="/terms-of-use" onclick="PS.MeMSO.DynamicPopup('',124);return PS.NoDefault(event);">Terms of Use</a></li><li><a href="/when-will-my-order-ship.html" onclick="PS.MeMSO.DynamicPopup('',24);return PS.NoDefault(event);">Shipping Policy</a></li></ul></div><div class="FooterLinkList About"><div class="FooterLLTitle"><div class="FooterLLTIcon"></div><span>About Magic Beans</span></div><ul class="FooterLLList"><li><a href="/about-us.html">About Us</a></li><li><a href="/Resource-Center-Baby-Gear-and-Toys">Resource Center</a></li><li><a href="/Magic-Beans-Frequently-Asked-Questions.html">FAQ</a></li><li><a href="/Stores">Stores &amp; Hours</a></li><li><a href="/Magic-Beans-Calendar-of-Events.html">Store Calendar/Events</a></li><li><a href="/jobs">Employment Opportunities</a></li></ul></div><div class="FooterLinkList Contact"><div class="FooterLLTitle"><div class="FooterLLTIcon"></div><span>Have a question?</span></div><ul class="FooterLLList"><li id="FooterLLCEmailUs"><a href="/contact-magic-beans.html"><span>Email us</span></a></li><li id="FooterLLCCallUs"><a href="tel:8666002326" class="Phone"><span><span id="FooterLLCCUCallUs">Call us:</span><span id="FooterLLCCUNumber">866-600-BEAN</span><span id="FooterLLCCUNumberParen">(2326)</span></span></a><span id="FooterLLCCUHours">M-F 9am-5pm ET</span></li></ul></div><div class="FooterLinkList Locations"><div class="FooterLLTitle"><div class="FooterLLTIcon"></div><span>Magic Beans locations</span></div><ul class="FooterLLList"><li id="FooterLLLOurStores"><a href="/Stores"><span>Our stores &amp; hours</span></a></li><li><a href="/baby-gear-and-toy-stores-boston-massachusetts"><span>Magic Beans, Boston, MA</span></a></li><li><a href="/baby-gear-and-toy-stores-brookline-massachusetts"><span>Magic Beans, Brookline, MA</span></a></li><li><a href="/baby-gear-and-toy-stores-norwell-massachusetts"><span>Magic Beans, Norwell, MA</span></a></li><li><a href="/baby-gear-and-toy-stores-wellesley-massachusetts"><span>Magic Beans, Wellesley, MA</span></a></li><li><a href="/baby-gear-and-toy-stores-cambridge-massachusetts"><span>Magic Beans, Cambridge, MA</span></a></li><li><a href="/baby-gear-and-toy-stores-fairfield-connecticut"><span>Magic Beans, Fairfield, CT</span></a></li></ul></div><div class="FooterLinkList Social"><div class="FooterLLTitle"><span>Can't get enough <span id="FooterLLMBeansBean">Magic Beans</span>?</span></div><ul id="FooterLLSList" class="SiteSocialLinkList"><li class="Facebook"><a href="http://www.facebook.com/magicbeans" target="_blank"><span>Like us on Facebook</span></a></li><li class="Twitter"><a href="http://twitter.com/mbeans" target="_blank"><span>Follow us on Twitter</span></a></li><li class="GooglePlus"><a href="https://plus.google.com/110142631944661975009" target="_blank"><span>Follow us on Google+</span></a></li><li class="Instagram"><a href="http://instagram.com/mbeansdotcom" target="_blank"><span>Follow us on Instagram</span></a></li><li class="Blog"><a href="/spillingthebeans"><span>Read our blog</span></a></li><li class="YouTube"><a href="https://www.youtube.com/user/MagicBeansVideos" target="_blank"><span>View our YouTube channel</span></a></li><li class="Catalog"><a href="/surprises"><span>View our online catalog</span></a></li><li class="SiteTAF"><a href="/contact-magic-beans.html"><span>Tell a friend about us</span></a></li></ul></div></nav><div id="FooterAwards">
<div id="FooterAwardTitle">
<span>Our Awards Include:</span>
</div>
<ul id="FooterAwardsInner">
<li class="FooterAward Communicator2015"><div></div></li>
<li class="FooterAward BoB2014"><div></div></li>
<li class="FooterAward FamFave2014"><div></div></li>
<li class="FooterAward IBBB2014 Double"><div></div></li>
<li class="FooterAward BAL2014 Double"><div></div></li>
<li class="FooterAward WebAward"><div></div></li>
Request succeeded (200).
*/});
    return hered0c;
  }

  function heredoc(fn) {
    return fn.toString().split('\n').slice(1,-1).join('\n') + '\n'
  }

  var stripPattern = /^\s*(?=[^\s]+)/mg
  heredoc.strip = function(fn) {
    var text = heredoc(fn)

    var indentLen = text.match(stripPattern)
                                 .reduce(function (min, line) {
      return Math.min(min, line.length)
    }, Infinity)

    var indent = new RegExp('^\\s{' + indentLen + '}', 'mg')
    return indentLen > 0
      ? text.replace(indent, '')
      : text
  }

  if (typeof exports === 'object') {
    module.exports = heredoc
  }
  else if (typeof define === 'function' && define.amd) {
    define(function() {
      return heredoc
    })
  }
  else {
    root.heredoc = heredoc
}

module.exports = {
  send: function (req){
    console.log('QUIC request = ', req);
    var request = JSON.parse(req)
    var host = " "
    var headers = " "
    var method = " "
    var body = " "
    var port = " --port=443 "
    if (request.Headers["Host"].length > 0) {
      host = "--host=" + request.Headers.Host[0];
    }
    if (request.Method) {
      method = " --method=" + request.Method;
    }
    if (request.Data) {
      body = " --body=\"" + request.Data + "\"";
    }
    params = host + headers + port + method + body + " --disable-certificate-verification " + request.Endpoint;
    binary = "./proxy-qa-cgi-bin/quic_client_v3 " + params;
    //console.log("Running",  binary);

    var output = exec(binary, {silent:true}).stdout;
    if (output == null) {
      throw "no output from binary";
    }
    //var output = getMockOutput();

    var lines = output.split(/\n/);
    const st_need_request = 1;
    const st_need_req_headers = 2;
    const st_in_req_headers = 3;
    const st_need_request_body = 4;
    const st_in_req_body = 5;
    // need response:
    const st_need_resp_headers = 7;
    const st_in_resp_headers = 8;
    const st_need_resp_body = 9;
    const st_in_resp_body = 10;
    // need response body
    const st_done = 100;
    const st_err = 101;

    var JS = {};
    JS.Req_headers = {};
    JS.Headers = {};
    JS.Reply = "";
    JS.Status = 0;
    var status = st_need_request;

    for (i = 0; i < lines.length; i++)  {
      //console.log("parsing", status, i, lines[i])
      if (st_need_request == status && 0 == lines[i].indexOf("Request:")) {
        status = st_need_req_headers;
        continue;
      }
      if (st_need_req_headers == status && 0 == lines[i].indexOf("headers:")) {
        status = st_in_req_headers;
      }
      if (st_in_req_headers == status) {
        if (-1 == lines[i].indexOf(":") && "{" != lines[i]) {
          status = st_need_request_body;
        } else {
          //
        }
        continue
      }
      if (st_need_request_body == status) {
        if (0 == lines[i].indexOf("body:")) {
          status = st_in_req_body
        }

        continue
      }
      if (st_in_req_body == status) {
        if (0 == lines[i].indexOf("Response:")) {
          status = st_need_resp_headers;
        } else {
          JS.Req += lines[i]
        }
        continue
      }
      if (st_need_resp_headers == status) {
        if (0 == lines[i].indexOf("headers:")) {
          status = st_in_resp_headers;
        }
        continue
      }
      if (st_in_resp_headers == status) {
        if (-1 == lines[i].indexOf(":") && "{" != lines[i]) {
          status = st_need_resp_body;
        } else {
          lines[i] = lines[i].replace(/^\s*/g, "")
          if (0 == lines[i].indexOf(":version") || 0 == lines[i].indexOf(":status")) {
            lines[i][0] = "_";
            if (0 == lines[i].indexOf(":status")) {
              JS.Status = parseInt(lines[i].split(":", 3)[2])
            }
          }
          var hdrParts = lines[i].split(":", 2);
          if (2 != hdrParts.length) {
            continue;
          }
          if (hdrParts[0].length < 2) { // keep quic spdy headers
            hdrParts = lines[i].split(":", 3)
            hdrParts[0] = hdrParts[1]
            hdrParts[1] = hdrParts[2]
            hdrParts[2] = ""
          } else { // rename normal headers
            hdrParts[0] = hdrParts[0].replace(/(\b[a-z](?!\s))/g, function(x){return x.charAt(0).toUpperCase() + x.slice(1);});
          }

          if (JS.Headers[hdrParts[0]] == null) {
            JS.Headers[hdrParts[0]] = [];
          }
          //console.log("saving hdr", "*"+hdrParts[0]+"*", "as", hdrParts[1])
          JS.Headers[hdrParts[0] ].push(hdrParts[1]);
        }
        continue
      }
      if (st_need_resp_body == status) {
        if (lines[i].indexOf("body:") != -1) {
          status = st_in_resp_body
        }
        continue
      }
      if (st_in_resp_body == status) {
        if (-1 != lines[i].indexOf("Request succeeded (") && lines.length - 1 == i) {
          var re = /Request.*\((\d*)\)\./;
          var st = lines[i].match(re);
          JS.Status = parseInt(st[1]);
          status = st_done;
        } else {
          JS.Reply += lines[i]
          if (lines.length - 1 == i) {
            status = st_done;
          }
        }
      }
    }

    if (status != st_done) {
      throw "can't parse quic response, stopped at " + status;
    }

    return JS;
    //var response = JSON.parse(output);
    //console.log('QUIC response = ', response);
    //return response;
  }
};
