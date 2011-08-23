from django.conf.urls.defaults import patterns, include, url
from django.contrib import admin
from django.views.generic.simple import direct_to_template, redirect_to

from disease_ontology.apps.news.views import news
from disease_ontology.apps.links.views import links
from disease_ontology.apps.content.views import (welcome_content, 
                metadata_content, search_content, visualize_content, contact)

admin.autodiscover()

urlpatterns = patterns('',
    url(r'^$', direct_to_template, {
        'template': 'index.html', 
        'extra_context': {
             'title': 'Disease Ontology - Institute for Genome Sciences @ University of Maryland',
             'ext': True,
         }
    }, "home"),
    url(r'^term/(.+)/$', metadata_content, name="metadata"),
    url(r'^search$', search_content, name="search"),
    url(r'^visual/(.+)/(.+)/$', visualize_content, name="visual"),
    url(r'^news/$', news, name="news"),
    url(r'^downloads/$', direct_to_template, {
        'template': 'downloads.html',
        'extra_context': {
            'title': 'Disease Ontology - Institute for Genome Science - Downloads',
            'ext': False
        }
    }, "downloads"),
    url(r'^link/$', links, name="links"),
    url(r'^about/$', direct_to_template, {
        'template': 'about.html',
        'extra_context': {
            'title': 'Disease Ontology - Institute for Genome Sciences - About',
            'ext': False
        }
    }, "about"),
    url(r'^support/$', direct_to_template, {
        'template': 'support.html',
        'extra_context': {
            'title': 'Disease Ontology - Institute for Genome Sciences - Support',
            'ext': False
        }
    }, "support"),
    url(r'^contact/$', contact, name="contact"),
    url(r'^contact/thanks/$', direct_to_template, {
        'template': 'thanks.html',
        'extra_context': {
            'title': 'Disease Ontology - Institute for Genome Sciences - Contact',
            'ext': False
        }
    }, "thanks"),
    url(r'^tutorial/$', direct_to_template, {
        'template': 'tutorial.html',
        'extra_context': {
            'title': 'Disease Ontology - Institute for Genome Sciences - Tutorial',
            'ext': False
        }
    }, "tutorial"),
    (r'^welcome/$', welcome_content),
    (r'^blank_results/$', direct_to_template, {
        'template': 'content/blank_results.html',
        'extra_context': {
            'title': 'Disease Ontology - Institute for Genome Sciences - Links',
            'ext': False,
        }
    }),
    (r'^arbor_key/$', direct_to_template, { 'template': 'content/key_tbl.html' }),
    
    # Uncomment the next line to enable the admin:
    (r'^admin/', include(admin.site.urls)),
)
