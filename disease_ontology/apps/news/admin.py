from django.contrib import admin

from disease_ontology.apps.news.models import NewsPost

class NewsAdmin(admin.ModelAdmin):
    """
    An admin class that handles adding news posts to the main page.
    """
    fields = ('title', 'body')
    list_display = ('title', 'author', 'pub_date')
    date_hierarchy = 'pub_date'

    def save_model(self, request, obj, form, change):
        """
        Override the behavior of creating a news post to set the author
        of the post to the current logged in user.
        """
        if not change:
            obj.author = request.user

        obj.save()


    class Meta:
        verbose_name_plural = "News"        

admin.site.register(NewsPost, NewsAdmin)
