from django.db import models
from django.contrib.auth.models import User

class NewsPost(models.Model):
    """ 
    An object that resembles a news post on our 'Welcome' page.
    """
    author = models.ForeignKey(User, related_name='posts')
    title = models.CharField(max_length=200)
    body = models.TextField()
    pub_date = models.DateTimeField('Date Published', auto_now_add=True)

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ['-pub_date']
                
