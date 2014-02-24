from django.shortcuts import render
from django.http import HttpResponse
from django.core import serializers
from models import Editor, Mapping, Command


def editor(request):
    return render(request, 'voiceeditor/editor.html')


def get_editor(request):
    ip = request.META['REMOTE_ADDR']
    return Editor.objects.get(ip=ip)


def get_mapping(request):
    editor = get_editor(request)
    data = serializers.serialize('json', Mapping.objects.filter(editor=editor))
    return HttpResponse(data, content_type='application/json')


def get_features(request):
    editor = get_editor(request)
    data = serializers.serialize('json', editor.features.all())
    return HttpResponse(data, content_type='application/json')


def get_commands(request):
    editor = get_editor(request)
    data = serializers.serialize('json', Command.objects.filter(editor=editor))
    return HttpResponse(data, content_type='application/json')
