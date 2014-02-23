# -*- coding: utf-8 -*-

from __future__ import unicode_literals

from django.db import models
from django.utils.encoding import python_2_unicode_compatible


@python_2_unicode_compatible
class Editor(models.Model):
    number = models.IntegerField()
    ip = models.IPAddressField()

    class Meta:
        verbose_name = 'Editor'
        verbose_name_plural = 'Editors'

    def __str__(self):
        return str(self.number)


@python_2_unicode_compatible
class Mapping(models.Model):
    editor = models.ForeignKey(Editor)
    words = models.CharField(max_length=200)
    chars = models.CharField(max_length=20)

    class Meta:
        verbose_name = 'Mapping'
        verbose_name_plural = 'Mappings'

    def __str__(self):
        return str(self.editor.number) + ': ' + self.words\
            + ' -> ' + self.chars


@python_2_unicode_compatible
class Command(models.Model):
    editor = models.ForeignKey(Editor)
    words = models.CharField(max_length=200)
    command = models.CharField(max_length=50)

    class Meta:
        verbose_name = 'Command'
        verbose_name_plural = 'Commands'

    def __str__(self):
        return str(self.editor.number) + ': ' + self.words\
            + ' -> ' + self.command


@python_2_unicode_compatible
class Save(models.Model):
    editor = models.ForeignKey(Editor)
    name = models.CharField(max_length=100)
    content = models.TextField()
    version = models.IntegerField()

    class Meta:
        verbose_name = 'Save'
        verbose_name_plural = 'Saves'

    def __str__(self):
        return str(self.editor.number) + ': '\
            + self.name + '(' + str(self.version) + ')'
