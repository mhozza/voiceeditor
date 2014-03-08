#!/usr/bin/env python2
import SocketServer
import json
import os

DIR = '/tmp/submits/submits/EDITOR/'
QUEUE_DIR = '/tmp/submits/queue/'

def write_file(what, where):
    try:
       os.makedirs(os.path.split(where)[0])
    except:
       pass
    with open(where, 'w+') as destination:
       destination.write(what)

class Testovac(SocketServer.BaseRequestHandler):
    """
    The RequestHandler class for our server.

    It is instantiated once per connection to the server, and must
    override the handle() method to implement communication to the
    client.
    """

    def handle(self):
        # self.request is the TCP socket connected to the client
        self.data = self.request.recv(1024*1024).strip() ## receive up to 1 MB
        print "Connection from: " + str(self.client_address)
        data_str = str(self.data)
        data_obj = data_str.split('\n', 6)
        print(data_obj)
        submit_id = data_obj[1]
        task_id = data_obj[2].split('-')[1]
        user_id = data_obj[3].split('.')[0].split('-')[1]
        data = data_obj[6]
        
        obj = {
                'user': user_id,
                'task': task_id,
                'data': data,
                'protocol': submit_id,
                'filename': data_obj[5],
                }

        write_file(json.dumps(obj), os.path.join(QUEUE_DIR, submit_id + '.queue'))               
        

if __name__ == "__main__":
    HOST, PORT = "localhost", 9998

    # Create the server, binding to localhost on port 9999
    server = SocketServer.TCPServer((HOST, PORT), Testovac)

    # Activate the server; this will keep running until you
    # interrupt the program with Ctrl-C
    server.serve_forever()
