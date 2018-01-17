#!/opt/revsw-config/env/bin python
# Depends: python-m2crypto

import re
import socket
import SocketServer as ss
from cStringIO import StringIO
from tlslite import X509, X509CertChain, TLSConnection, parsePEMKey
from tlslite.checker import Checker

_re_length = re.compile(r"^Length:\s+([0-9]+)$")


def _getFingerprint(fname):
    s = open(fname).read()
    x509 = X509()
    x509.parse(s)
    cert = X509CertChain([x509])
    return cert.getFingerprint()


def _read_with_length(f):
    line = f.readline()
    match = _re_length.match(line)
    if not match:
        raise IOError("No data length received; ignoring reply")

    size = int(match.group(1))
    # print "Data size:", size
    data = StringIO()
    while size:
        got = f.read(size)
        data.write(got)
        size -= len(got)

    s = data.getvalue()
    data.close()
    return s


def _write_with_length(f, data):
    f.write("Length: %d\n" % len(data))
    f.write(data)
    f.flush()


class RevTLSCredentials:
    def __init__(self, cert_fname, pkey_fname, pkey_password, peer_cert_fname):
        # Read our own cert
        s = open(cert_fname).read()
        x509 = X509()
        x509.parse(s)
        self.cert = X509CertChain([x509])

        # Read our own primary key
        s = open(pkey_fname).read()
        self.pkey = parsePEMKey(
            s, private=True, passwordCallback=lambda: pkey_password)

        # Read our peer's cert
        s = open(peer_cert_fname).read()
        x509 = X509()
        x509.parse(s)
        cert = X509CertChain([x509])
        self.checker = Checker(cert.getFingerprint())


class RevTLSClient:
    def __init__(self, address, credentials):
        self.address = address
        self.__creds = credentials
        self.conn = None
        self.connect()

    def __enter__(self):
        return self

    def __exit__(self, type, value, traceback):
        self.close()

    def connect(self):
        if self.conn:
            return

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(self.address)

        self.conn = TLSConnection(sock)
        self.conn.handshakeClientCert(self.__creds.cert, self.__creds.pkey,
                                      checker=self.__creds.checker)
        self.fconn = self.conn.makefile()

    def sendall(self, data):
        _write_with_length(self.fconn, data)

    def recvall(self):
        return _read_with_length(self.fconn)

    def close(self):
        self.fconn.close()
        self.fconn = None
        self.conn.close()
        self.conn = None


class _ReqHandler(ss.StreamRequestHandler):
    def __init__(self, owner, *args, **kwargs):
        self.owner = owner
        ss.StreamRequestHandler.__init__(self, *args, **kwargs)

    def setup(self):
        conn = TLSConnection(self.request)
        conn.closeSocket = True
        conn.handshakeServer(certChain=self.owner.creds.cert, privateKey=self.owner.creds.pkey,
                             checker=self.owner.creds.checker, reqCert=True)
        self.rfile = conn.makefile('rb', self.rbufsize)
        self.wfile = conn.makefile('wb', self.wbufsize)
        self.owner.conn = conn

    def handle(self):
        # rfile is a file-like object created by the handler;
        # we can now use e.g. readline() instead of raw recv() calls
        data = _read_with_length(self.rfile)
        wfile = StringIO()

        # Call user-defined handler
        self.owner.handler(data, wfile)

        _write_with_length(self.wfile, wfile.getvalue())
        wfile.close()


class _Server(ss.ThreadingTCPServer):
    allow_reuse_address = 1
    daemon_threads = 1


class RevTLSServer:
    def __init__(self, address, credentials, handler):
        self.address = address
        self.creds = credentials
        self.conn = None
        self.handler = handler

        def newReqHandler(*args, **kwargs):
            return _ReqHandler(self, *args, **kwargs)

        self.server = _Server(self.address, newReqHandler)
        print 'Listening:', self.server.socket.getsockname()

    def run(self):
        self.server.serve_forever()
