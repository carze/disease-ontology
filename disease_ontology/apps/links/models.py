from django.db import models

class Links(models.Model):
    """ 
    An class that represents a link out to a resource.

    This class contains three key pieces of data:
        1.) The name of the resource.
        2.) The URL to the resource
        3.) A short text description of the resource

    """
    title = models.CharField(max_length=200)
    url = models.URLField()
    description = models.TextField()

    def __unicode__(self):
        return self.title
