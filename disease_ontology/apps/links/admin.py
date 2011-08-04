from django.contrib import admin

from disease_ontology.apps.links.models import Links

class LinksAdmin(admin.ModelAdmin):
    """
    An admin class handling adding new links to the contact page.
    """
    fields = ('title', 'description', 'url')
    list_display = ('title', 'url')

    class Meta:
        verbose_name_plural = "Links"

admin.site.register(Links, LinksAdmin)    
