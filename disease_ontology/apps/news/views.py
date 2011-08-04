##
# Handles generating views for the Disease Ontology's News pages
#

import logging

from django.http import HttpResponse
from django.template import Context
from django.template.loader import get_template

from disease_ontology.apps.news.models import NewsPost

__author__ = "Cesar Arze"      
__copyyright__ = "Institute for Genome Science - University of Maryland School of Medicine"    
__license__ = "MIT"                  
__version__ = "1.0"                   
__maintainer__ = "Cesar Arze"                    
__email__ = "carze@som.umaryland.edu"    

logger = logging.getLogger(__name__)

def news(request):
    """
    Generates a simple page containing all news posts in a paginated-view.
    All news posts are sorted by date.
    """
    template = get_template('news/news.html')
    
    variables = Context({
        'title': "Disease Ontology - Institute for Genome Sciences - News",
        'news_list': NewsPost.objects.all()
    })

    output = template.render(variables)
    return HttpResponse(output)
