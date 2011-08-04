##
# Custom filters for use when rendering any metadata output
#

import re
import logging

from django import template
from django.utils.safestring import mark_safe
from doutils import get_resource_url

__author__ = "Cesar Arze"      
__copyyright__ = "Institute for Genome Science - University of Maryland School of Medicine"    
__license__ = "MIT"                  
__version__ = "1.0"                   
__maintainer__ = "Cesar Arze"                    
__email__ = "carze@som.umaryland.edu"    

register = template.Library()
logger = logging.getLogger(__name__)

@register.filter
def cap(value):
    namelist = value.split(' ')
    fixed = ''
    for name in namelist:
        name = name.lower()
        # fixes mcdunnough
        if name.startswith('mc'):
            sub = name.split('mc')
            name = "Mc" + sub[1].capitalize()
        # fixes "o'neill"
        elif name.startswith('o\''): 
            sub = name.split('o\'')
            name = "O'" + sub[1].capitalize()

        else: name = name.capitalize()
        
        nlist = name.split('-')
        for n in nlist:
            if len(n) > 1:
                up = n[0].upper()
                old = "-%s" % (n[0],)
                new = "-%s" % (up,)
                name = name.replace(old,new)

        fixed = fixed + " " + name
    return fixed

@register.filter
def format_synonym_metadata(value):
    """
    Takes a synonym metadata string from the Disease Ontology of format
    "<SYNONYM NAME> <TYPE> <ID>" and returns a formatted string of 
    <SYNONYM NAME> [<TYPE>]
    """
    logger.debug("SYNONYM: " + value)

    synonym_matches = re.search('(.+)\s+(EXACT|RELATED|BROAD|NARROW)\s+(.+)?', value)
    synonym_name = synonym_matches.group(1)
    synonym_type = synonym_matches.group(2)
    formatted_metadata = "%s [%s]" % (synonym_name, synonym_type.upper())
    return formatted_metadata

@register.filter
def format_definition_metadata(value):
    """
    Takes a definition metadata string from the Disease Ontology and returns
    a cleaned up formatted string
    """
    (_ignore, def_text, refs) = value.split('"', 2)

    url_matches = re.search('(URL:.+)\]', refs, re.IGNORECASE)
    
    if url_matches:
        urls = url_matches.group(1)
        urls = urls.replace('URL:', '')
        urls = urls.replace('url:', '')
        urls = urls.replace('\:', ':')
        def_text = "%s <br /> %s" % (def_text, urls)

    return mark_safe(def_text)
format_definition_metadata.is_safe = True    


@register.filter
def url_target_blank(text):
    return text.replace('<a ', '<a target="_blank" ')
    url_target_blank = register.filter(url_target_blank)    
url_target_blank.is_safe = True

@register.filter
def xref_url_link(text):
    """
    Takes an xref identifier and looks up the resource if it is a valid 
    resource. 
    """
    xref_url = get_resource_url(text)
    
    if xref_url:
        href_tag = "<a target=\"_blank\" href=%s>%s</a>" % (xref_url, text)
        text = href_tag

    return mark_safe(text)
xref_url_link.is_safe = True
    
