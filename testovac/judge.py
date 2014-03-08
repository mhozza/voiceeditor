#!/usr/bin/env python2
import SocketServer
import json
import os
import time
import sys
import subprocess

DIR = '/tmp/submits/submits/EDITOR/'
QUEUE_DIR = '/tmp/submits/queue/'
TEMP_DIR = '/tmp/submits/temp/'
INPUT_DIR = '/tmp/submits/input/'
WRAPPER_PATH = '/tmp/submits/wrapper'

def write_file(what, where):
    try:
       os.makedirs(os.path.split(where)[0])
    except:
       pass
    with open(where, 'w+') as destination:
       destination.write(what)

def judge(filepath):
    f = open(filepath)
    obj = json.loads(f.readline())
    user_id = obj['user']
    task_id = obj['task']
    data = obj['data']
    submit_id = obj['protocol']
    filename = obj['filename']
    f.close()

    # write the file somewhere
    os.makedirs(TEMP_DIR)
    os.chdir(TEMP_DIR)
    w = open(filename, 'w+')
    w.write(data)
    w.close()
    
    # detect language
    lang = filename.split('.')[1]
    res = {}
    if lang == 'cc':
        # is c++
        # compile
        proc = subprocess.Popen(['g++', '-std=gnu++11', '-O2', '-static', '-o', 'compiled.bin', filename], stderr=subprocess.PIPE)
        proc.wait()
        if (proc.returncode != 0):
            res = {'error': 'CERR', 'msg': proc.stderr.readlines()}
    elif lang == 'c':
        # is c
        # compile
        proc = subprocess.Popen(['gcc', '-std=gnu1x', '-O2', '-static', '-o', 'compiled.bin', filename], stderr=subprocess.PIPE)
        proc.wait()
        if (proc.returncode != 0):
            res = {'error': 'CERR', 'msg': proc.stderr.readlines()}
    elif lang == 'pas':
        # is pascal
        # compile
        proc = subprocess.Popen(['fpc', '-O2', '-o', 'compiled.bin', filename], stderr=subprocess.PIPE)
        proc.wait()
        if (proc.returncode != 0):
            res = {'error': 'CERR', 'msg': proc.stderr.readlines()}
    else:
        # not supported!
        pass

    if res != {}:
        print("Compilation error!")
    else:
        print("Compilation passed!")
        res['error'] = 'OK'
        res['log'] = {}
        # find all the testcases for the task and test each of them
        input_dir = os.path.join(INPUT_DIR, task_id)
        log = {}
        for item in os.listdir(input_dir):
            if (item.split('.')[1] != 'in'): # only test inputs
                continue
            print "Testing: ", item
            infile = os.path.join(input_dir, item)
            outfile = os.path.join(input_dir, item.split('.')[0] + '.out')
            testfile = os.path.join(input_dir, item.split('.')[0] + '.test')
            # 3 seconds, 256MB RAM usage
            proc = subprocess.Popen([WRAPPER_PATH, '-a2', '-f', '-m', '256000', '-t', '3', '-i', infile, '-o', testfile, 'compiled.bin'], stderr=subprocess.PIPE, stdout=subprocess.PIPE)
            # test OUTPUT
            proc.wait()            
            error = proc.stderr.readlines()[3].split(':')[1][1:]
            if (error == "0\n"):
                error = 'OK'
            else:
                error = error[:-1]
            if (proc.returncode == 0):
                # Result was OK, check for WA
                diff = subprocess.Popen(["diff", "-b", "-y", "--suppress-common-lines", testfile, outfile], stderr=subprocess.PIPE, stdout=subprocess.PIPE)
                diff.wait()
                difflist = diff.stdout.readlines()
                if (len(difflist) > 0):
                    # if any errors occurred
                    error = 'WA'
            if (res['error'] == 'OK' and error != 'OK'):
                res['error'] = error
            res['log'][item] = error
            print "Result: ", error

    # write ret as JSON:    
    r = open(os.path.join(DIR, str(user_id), str(task_id), "%s.protokol"%(submit_id)), 'w+')
    r.write(json.dumps(res))
    r.close()

    # remove the temp directory
    os.chdir(DIR)
    subprocess.call(['rm', '-rf', TEMP_DIR])

if __name__ == "__main__":
    while(True):
        submit_list = os.listdir(QUEUE_DIR)
        if len(submit_list) > 0:
            for item in submit_list:
                judge(os.path.join(QUEUE_DIR, item))
                os.remove(os.path.join(QUEUE_DIR, item))

        time.sleep(1)
