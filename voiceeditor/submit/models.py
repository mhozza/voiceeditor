# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.utils.encoding import python_2_unicode_compatible

from django.db import models
import os

@python_2_unicode_compatible
class Submit(models.Model):
    task = models.CharField(max_length=128, verbose_name='úloha')
    time = models.DateTimeField(auto_now_add=True)
    person = models.IntegerField(verbose_name='človek')
    points = models.IntegerField(verbose_name='body')
    filepath = models.CharField(max_length=128, verbose_name='súbor')
    testing_status = models.CharField(
        max_length=128, verbose_name='stav testovania')
    tester_response = models.CharField(
        max_length=10, verbose_name='odpoveď testovača')
    protocol_id = models.CharField(
        max_length=128, verbose_name='číslo protokolu')

    class Meta:
        verbose_name = 'Submit'
        verbose_name_plural = 'Submity'

    def __str__(self):
        return str(self.person) + ' - ' + str(self.task)

    def filename(self):
        return os.path.basename(self.filepath)
