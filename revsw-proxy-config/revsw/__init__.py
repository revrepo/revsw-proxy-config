if __name__ == "__main__":
    import sys
    from tls import *

    if len(sys.argv) == 2 and sys.argv[1] == "-s":
        print "Running TLS server"

        def handle_req(rd, wr):
            while True:
                line = rd.readline()
                if len(line) == 0:
                    return
                print "Received:", line

        creds = RevTLSCredentials(
            "./srvcert.pem", "./srvkey.pem", "alabala", "./clicert.pem")
        s = RevTLSServer(("localhost", 16000), creds, handle_req)
        s.run()
    else:
        print "Running TLS client"
        creds = RevTLSCredentials(
            "./clicert.pem", "./clikey.pem", "alabala", "./srvcert.pem")
        c = RevTLSClient(("localhost", 16000), creds)
        c.conn.send("HALLELUJAH")
        c.close()
