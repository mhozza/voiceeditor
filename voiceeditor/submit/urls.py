from django.conf.urls import patterns, url

urlpatterns = patterns('voiceeditor.submit.views',
    url(r'^test/$', 'task_get_result', name='task_get_result'),
    url(r'^(?P<task_id>\d+)/$', 'task_submit_post', name='task_submit_post'),
)
