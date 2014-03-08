from django.conf.urls import patterns, include, url
import voiceeditor.submit.urls

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^$', 'voiceeditor.views.editor', name='editor'),
    url(r'^submit/', include(voiceeditor.submit.urls)),
    url(r'^api/commands/$', 'voiceeditor.views.get_commands', name='commands'),
    url(r'^api/features/$', 'voiceeditor.views.get_features', name='features'),
    url(r'^api/mapping/$', 'voiceeditor.views.get_mapping', name='mapping'),
    url(r'^api/saymapping/$', 'voiceeditor.views.get_saymapping', name='saymapping'),
    url(r'^api/randommessages/$', 'voiceeditor.views.get_randommessages', name='random_messages'),
    url(r'^api/tasks/$', 'voiceeditor.views.get_tasks', name='tasks'),
    url(r'^api/load/$', 'voiceeditor.views.get_load', name='apiload'),
    url(r'^api/save/$', 'voiceeditor.views.save_task', name='save'),
    url(r'^api/editorid/$', 'voiceeditor.views.get_editor_id', name='editorid'),
    url(r'^admin/', include(admin.site.urls)),
)
