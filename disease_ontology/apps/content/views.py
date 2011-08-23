import logging
import sys

from neo4jdo import Neo4jDO
from do_lucene_search import search_lucene_index
from math import ceil, floor
from recaptcha.client import  captcha

from django import forms
from django.http import HttpResponse, HttpResponseRedirect
from django.template import Context
from django.template.loader import get_template
from django.shortcuts import render_to_response
from django.conf import settings
from django.core.mail import send_mail
from django.views.decorators.csrf import csrf_exempt

from disease_ontology.apps.news.models import NewsPost

logger = logging.getLogger(__name__)

class ContactForm(forms.Form):
    """
    A forms to get in touch with an administrator for the Disease Ontology
    website
    """
    FEEDBACK_CHOICES = (
        ('Comment', 'Comment'),
        ('Suggestion', 'Suggestion'),
        ('Bug', 'Bug'),
    )
    feedbackType = forms.ChoiceField(widget=forms.Select, choices=FEEDBACK_CHOICES, label="Feedback Type:")
    senderName = forms.CharField(label="Name:")
    senderEmail = forms.EmailField(label="Email:")

    message = forms.CharField(label="Message:", widget=forms.Textarea)

def welcome_content(request):
    """
    Our welcome tab panel which will contain news and update 
    informsation
    """
    template = get_template('content/welcome_content.html')

    variables = Context({
        'news_list': NewsPost.objects.all()[:3]
    })

    output = template.render(variables)
    return HttpResponse(output)

def metadata_content(request, doid_term):
    """
    Load our term metadata into our ExtJS TabPanel as a fragment. This function
    queries the Neo4j database using our Neo4j wrapper class and pulls down. 
    Node metadata is retrieved and the id and name are explicitly pulled out
    and removed from the metadata keys list. The rest of the metadata is stored
    in a list of tuples of key, value to be passed to the template.
    """
    # A list of elements we don't want included in the secondary_meta list
    primary_meta = settings.PRIMARY_METADATA
    graph_db = Neo4jDO(settings.NEO4J_URL)

    try:
        node = graph_db.get_node_by_ontologyid(doid_term)
    except IndexError as e:
        logger.exception("Term %s not found in database" % doid_term)
        return render_to_response('404.html', {'error_msg': error_msg})

    neo4j_id = node.id
    term_id = node.get('id')
    name = node.get('name')
    definition = node.get('definition', None)

    relationships = graph_db.get_formatted_node_relationships(node)

    secondary_metadata = []
    for key in [x for x in node.properties.keys() if x not in primary_meta]:
        value = node.get(key)
        secondary_metadata.append( (key, value) )


    template = get_template('content/metadata_content.html')
    variables = Context({
        'neo4j_id': neo4j_id,
        'term_id': term_id,
        'term_name': name,
        'term_definition': definition,
        'secondary_meta': secondary_metadata,
        'relationships': relationships,
    })

    output = template.render(variables)
    return HttpResponse(output)

def search_content(request):
    """
    Searches through the lucene index and generates a page displaying all 
    all search results.
    """
    results = []

    index_metadata = settings.OBO_INDEX_METADATA
    index_dir = settings.LUCENE_INDEX
    records_per_page = settings.RECORDS_PER_PAGE
    page_window = settings.PAGE_WINDOW

    (results, total_hits) = search_lucene_index(request.GET, index_dir, index_metadata, records_per_page)
    
    # Need to setup a couple variables to house the next page and previous pages (if they exist)
    # of search results, a string containing a serialized representation of our forms parameters
    # and the total number of results pages
    current_page = int(request.GET.get('page', 1))
    total_pages = ceil(float(total_hits) / records_per_page) if total_hits > 0 else 1
    page_range = get_page_range(current_page, page_window, total_pages)        

    # Get our serialized string of parameters and remove the pages var as we will set that 
    # ourselves
    params_str = request.GET.urlencode()
    params_str = params_str.replace("&page=%s" % current_page, '')

    # Now setup our next page and previous page variables if both exist
    prev_page = current_page - 1 if current_page != 1 else None
    next_page = current_page + 1 if current_page != total_pages else None

    print >> sys.stderr, len(results)

    # Setup our results bounds...
    lower_bound = 1
    upper_bound = len(results)
    if current_page > 1:
        upper_bound = min(records_per_page * current_page, total_hits)
        lower_bound = upper_bound - (len(results) - 1)
               
    template = get_template('content/search_content.html')
    variables = Context({
        'results': results,
        'page_range': xrange(page_range[0], page_range[1] + 1),
        'total_pages': int(total_pages),
        'total_hits': int(total_hits),
        'current_page': current_page,
        'previous_page': prev_page,
        'next_page': next_page,
        'lower_bound': lower_bound,
        'upper_bound': upper_bound,
        'serialized_params': params_str
    })

    output = template.render(variables)
    return HttpResponse(output)

def get_page_range(current_page, window_size, total_pages):
    """
    This function will produce a window of size defined by the window_size
    variable that can be used to present a small subset of the number of pages 
    returned from a lucene search
    """
    ne_half = floor(window_size/2)
    upper_limit = total_pages - window_size
    start = max(min(current_page - ne_half, upper_limit), 1) if current_page > ne_half else 1
    end = min(current_page + ne_half + (window_size % 2), total_pages) if current_page > ne_half else min(window_size, total_pages) 
    return [start, end]

def visualize_content(request, doid, name):
    """
    Returns a page containing a visualization of the immediate relationships
    between the specified node (doid) and its parents/children.
    """    
    template = get_template('content/visualize_content.html')
    variables = Context({
        'title': "Disease Ontology - Visulization %s" % name,
        'doid': doid,
        'name': name,
        'content_type': 'visual'
    })

    output = template.render(variables)
    return HttpResponse(output)

def validate_captcha(request, form):
    """
    Validates the captcha challenge found on the contact form
    """
    response = captcha.submit(
        request.POST.get('recaptcha_challenge_field'),
        request.POST.get('recaptcha_response_field'),
        settings.RECAPTCHA_PRIVATE_KEY,
        request.META.get('REMOTE_ADDR', None)
    )        

    return response.is_valid

@csrf_exempt
def contact(request):
    valid_captcha = True

    if request.method == "POST":
        form = ContactForm(request.POST)
        valid_captcha = validate_captcha(request, form)
    
        if form.is_valid() and valid_captcha:
            feedback_type = form.cleaned_data['feedbackType']
            sender_name = form.cleaned_data['senderName']
            sender_email = form.cleaned_data['senderEmail']
            message = form.cleaned_data['message']
            subject = "disease-ontology.org %s - %s" % (feedback_type, sender_name)

            send_mail(subject, message, sender_email, [x[1] for x in settings.ADMINS])
            return HttpResponseRedirect('/contact/thanks/')
    else:                            
        form = ContactForm()
        
    return render_to_response('support_contact.html', {
        'form': form,
        'recaptcha_pub_key': settings.RECAPTCHA_PUBLIC_KEY,
        'valid_captcha': valid_captcha,
    })
