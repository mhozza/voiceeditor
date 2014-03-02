# -*- coding: utf-8 -*-
# Create your views here.

from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.db import models
from django.http import Http404, HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.core.exceptions import PermissionDenied
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.conf import settings
from voiceeditor.submit.models import Submit
from voiceeditor.submit.helpers import write_file, process_submit_raw, get_path_raw, update_submit
import os
import xml.etree.ElementTree as ET
import json
from voiceeditor.models import Editor

def task_submit_post(request, task_id):
    '''Spracovanie uploadnuteho submitu'''

    # Raise Not Found when not submitting through POST
    #if request.method != "POST":
        #raise Http404

    # vyzrat z ip-cky user-a
    user_ip = request.META['REMOTE_ADDR']
    user_id = get_object_or_404(Editor, ip=user_ip).number

    sfile = request.POST['data']
    language = request.POST['language']

    submit_id = process_submit_raw(sfile, 'EDITOR', task_id, language, user_id)
    # Source file-name is id.data
    sfiletarget = os.path.join(get_path_raw('EDITOR',
        task_id, user_id), submit_id + '.data')
    write_file(sfile, sfiletarget)
    sub = Submit(task=task_id,
                 person=user_id,
                 points=0,
                 filepath=sfiletarget,
                 testing_status='in queue',
                 protocol_id=submit_id)
    sub.save()
    return HttpResponse(json.dumps({'id': submit_id}), content_type='application/json')
