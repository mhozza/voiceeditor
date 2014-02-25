from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'voiceeditor.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),
    url(r'^$', 'voiceeditor.views.editor', name='editor'),
    url(r'^api/commands/$', 'voiceeditor.views.get_commands', name='commands'),
    url(r'^api/features/$', 'voiceeditor.views.get_features', name='features'),
    url(r'^api/mapping/$', 'voiceeditor.views.get_mapping', name='mapping'),
    url(r'^admin/', include(admin.site.urls)),
)
