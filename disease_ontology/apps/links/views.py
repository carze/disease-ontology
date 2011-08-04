##
# Handles generating views for the Disease Ontology's Links page.

import logging

from django.http import HttpResponse
from django.template import Context
from django.template.loader import get_template

from disease_ontology.apps.links.models import Links

__author__ = "Cesar Arze"      
__copyyright__ = "Institute for Genome Science - University of Maryland School of Medicine"    
__license__ = "MIT"                  
__version__ = "1.0"                   
__maintainer__ = "Cesar Arze"                    
__email__ = "carze@som.umaryland.edu"    

logger = logging.getLogger(__name__)

def links(request):
    """
    Generates a page containing link outs to resources that are relevant to 
    the disease ontology website.
    """
    template = get_template('links/links.html')

    variables = Context({
        'title': "Disease Ontology - Institute for Genome Sciences - Links",
        'links': Links.objects.all()
    })

    output = template.render(variables)
    return HttpResponse(output)
