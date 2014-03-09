# -*- coding: utf-8 -*-

from __future__ import unicode_literals

from django.db import models
from django.utils.encoding import python_2_unicode_compatible


@python_2_unicode_compatible
class Feature(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name = 'Feature'
        verbose_name_plural = 'Features'

    def __str__(self):
        return self.name


@python_2_unicode_compatible
class Editor(models.Model):
    number = models.IntegerField()
    ip = models.IPAddressField()
    features = models.ManyToManyField(Feature, blank=True)

    class Meta:
        verbose_name = 'Editor'
        verbose_name_plural = 'Editors'

    def __str__(self):
        return str(self.number)


@python_2_unicode_compatible
class Mapping(models.Model):
    editor = models.ForeignKey(Editor)
    words = models.CharField(max_length=200)
    chars = models.CharField(max_length=80)

    class Meta:
        verbose_name = 'Mapping'
        verbose_name_plural = 'Mappings'

    def __str__(self):
        return str(self.editor.number) + ': ' + self.words\
            + ' -> ' + self.chars


@python_2_unicode_compatible
class SayMapping(models.Model):
    words = models.CharField(max_length=200)
    say = models.CharField(max_length=200)
    chars = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'SayMapping'
        verbose_name_plural = 'SayMappings'

    def __str__(self):
        return self.words + ' -> ' + self.say + '(' + self.chars + ')'


@python_2_unicode_compatible
class Command(models.Model):
    function = models.CharField(max_length=50)
    argnum = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Command'
        verbose_name_plural = 'Commands'

    def __str__(self):
        return self.function + '(' + str(self.argnum) + ')'


@python_2_unicode_compatible
class CommandMapping(models.Model):
    editor = models.ForeignKey(Editor)
    words = models.CharField(max_length=200)
    command = models.ForeignKey(Command)

    class Meta:
        verbose_name = 'CommandMapping'
        verbose_name_plural = 'CommandMappings'

    def __str__(self):
        return str(self.editor.number) + ': ' + self.words\
            + ' -> ' + self.command.__str__()


@python_2_unicode_compatible
class Task(models.Model):
    name = models.CharField(max_length=100)
    content = models.TextField()
    editors = models.ManyToManyField(Editor, blank=True)

    def __str__(self):
        return self.name


@python_2_unicode_compatible
class Save(models.Model):
    editor = models.ForeignKey(Editor)
    content = models.TextField()
    task = models.ForeignKey(Task)
    time = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Save'
        verbose_name_plural = 'Saves'

    def __str__(self):
        return str(self.editor.number) + ': '\
            + self.task + '(' + str(self.time) + ')'


@python_2_unicode_compatible
class RandomMessage(models.Model):
    say = models.CharField(max_length=200)

    class Meta:
        verbose_name = 'RandomMessage'
        verbose_name_plural = 'RandomMessages'

    def __str__(self):
        return self.say
