from django.shortcuts import render
from django.http import HttpResponse
from django.core import serializers
from models import Editor, Mapping, CommandMapping, Task, Save, SayMapping,\
    RandomMessage
from django.core.exceptions import ObjectDoesNotExist

import json


def editor(request):
    return render(request, 'voiceeditor/editor.html')


def get_editor(request):
    if 'HTTP_X_REAL_IP' in request.META:
        ip = request.META['HTTP_X_REAL_IP']
    else:
        ip = request.META['REMOTE_ADDR']
    return Editor.objects.get(ip=ip)


def get_editor_id(request):
    return HttpResponse(get_editor(request).pk)


def get_mapping(request):
    editor = get_editor(request)
    data = serializers.serialize('json', Mapping.objects.filter(editor=editor))
    return HttpResponse(data, content_type='application/json')


def get_saymapping(request):
    data = serializers.serialize('json', SayMapping.objects.all())
    return HttpResponse(data, content_type='application/json')


def get_randommessages(request):
    data = json.dumps(
        [x['say'] for x in RandomMessage.objects.all().values('say')]
    )
    return HttpResponse(data, content_type='application/json')


def get_features(request):
    editor = get_editor(request)
    data = serializers.serialize('json', editor.features.all())
    return HttpResponse(data, content_type='application/json')


def get_commands(request):
    editor = get_editor(request)
    data = serializers.serialize(
        'json',
        CommandMapping.objects.filter(editor=editor).select_related('command'),
        relations=('command', ),
    )
    return HttpResponse(data, content_type='application/json')


def get_tasks(request):
    data = serializers.serialize('json', Task.objects.all())
    return HttpResponse(data, content_type='application/json')


def get_load(request):
    try:
        editor = get_editor(request)
        task_id = request.POST['task_id']
        task = Task.objects.get(pk=task_id)
        print task
	save = Save.objects.filter(editor=editor, task=task).order_by('-time')[0]
	print save
        return HttpResponse(save.content)
    except:
        return HttpResponse('')


def save_task(request):
    editor = get_editor(request)
    task_id = request.POST['task_id']
    content = request.POST['content']
    task = Task.objects.get(pk=task_id)
    save = Save(editor=editor, task=task, content=content)
    save.save()

    return HttpResponse(
        json.dumps({'status': 'ok'}),
        content_type='application/json'
    )
