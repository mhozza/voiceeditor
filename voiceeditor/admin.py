from django.contrib import admin
from voiceeditor.models import *
from voiceeditor.submit.models import *

admin.site.register(Editor)
admin.site.register(Mapping)
admin.site.register(Command)
admin.site.register(Save)
admin.site.register(Feature)
admin.site.register(CommandMapping)
admin.site.register(SayMapping)
admin.site.register(Submit)
admin.site.register(Task)
