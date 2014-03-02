from django.conf.urls import patterns, url

urlpatterns = patterns('voiceeditor.submit.views',
    url(r'^(?P<task_id>\d+)/$', 'task_submit_post', name='task_submit_post'),
)
