#!/usr/bin/env python

##
# This script searches a lucene index built from the HumanDO.obo disease ontology file
# and returns the results in JSON format to be interpreted by a web-frontend
#

import os
import sys

from lucene import (SimpleFSDirectory, File, StandardAnalyzer, 
                    IndexSearcher, Version, QueryParser, initVM,
                    MultiFieldQueryParser, PerFieldAnalyzerWrapper,
                    KeywordAnalyzer)

__author__ = "Cesar Arze"      
__copyyright__ = "Institute for Genome Science - University of Maryland School of Medicine"    
__license__ = "MIT"                  
__version__ = "1.0"                   
__maintainer__ = "Cesar Arze"                    
__email__ = "carze@som.umaryland.edu"    

# Start up lucene and instantiate all the objects we require
initVM()

ANALYZER_LOOKUP = { "keyword":    KeywordAnalyzer(Version.LUCENE_CURRENT),
                    "standard":   StandardAnalyzer(Version.LUCENE_CURRENT) }

def search_lucene_index(search_params, index_dir, index_metadata, records_per_page):
    """
    Uses the query term provided to search the disease ontology lucene index
    """
    results = []

    index_dir = SimpleFSDirectory(File(index_dir))
    analyzer = build_perfield_analyzer(index_metadata)
    searcher = IndexSearcher(index_dir)
    index_fields = index_metadata.keys()

    # Since we are paging results we want to grab what page we are on   
    page = (int(search_params.get('page', 1))) - 1

    # Doing something pretty hacky here since we are trying to move from 0-based to 1 
    # based indexing to match our pagingation display
    offset = int(page) * records_per_page

    # If we are executing an advanced search we will be building a BooleanQuery
    # in parts as opposed to the one MultiFieldQueryParser when doing a basic
    # serach
    query = None
    
    if search_params.get('adv_search') == "True":
        query = build_advanced_search_query(search_params, search_params.get('operator'), analyzer)
    else:
        parser = MultiFieldQueryParser(Version.LUCENE_CURRENT, index_fields, analyzer)
        query = MultiFieldQueryParser.parse(parser, process_query_param((search_params.get('q'))))

    # Parse through our hits
    hits = searcher.search(query, 10000)
    total_hits = hits.totalHits
    count = min(hits.totalHits - offset, records_per_page)

    for i in xrange(0, count):
        score_doc = hits.scoreDocs[offset+i]
        doc = searcher.doc(score_doc.doc)
        term_id = doc.get('term id')
        name = doc.get('name')
        explain = searcher.explain(query, score_doc.doc)
        match_fields = get_field_matches( explain.toString(), index_fields )

        results.append( (term_id, name, list(match_fields)) )

    searcher.close()
    return (results, total_hits)

def build_perfield_analyzer(index_fields):
    """
    This function creates a PerFieldAnalyzerWrapper which allows us 
    to associate different Lucene Analyzers to specific fields in our 
    Lucene index. 
    """
    analyzer = PerFieldAnalyzerWrapper(StandardAnalyzer(Version.LUCENE_CURRENT))

    for (index_name, analyzer_type) in index_fields.iteritems():
        if analyzer_type == "standard":
            continue

        analyzer.addAnalyzer(index_name, ANALYZER_LOOKUP.get(analyzer_type))
        
    return analyzer                    

def build_advanced_search_query(params, operator, analyzer):
    """
    Takes a dictionary containing key=value pairs where keys are fields in our
    lucene document and values are search terms provided by the user. A 
    BooleanQuery is built from these key=value pairs
    """
    parser = QueryParser(Version.LUCENE_CURRENT, "name", analyzer)        
    query_list = ["%s:\"%s\"" % (field, process_query_param(val)) 
                                   for (field, val) in 
                                        get_adv_query_packet(params)]

    return parser.parse("%s" % (" " + operator + " ").join(query_list))        

def process_query_param(param):
    """
    Escapes and lowercases all query params for searching in the lucene index.
    """
    processed_param = QueryParser.escape(param)
    return processed_param.lower()

def get_adv_query_packet(params):
    """
    Builds a tuple containing all the information for each dynamic field of our 
    advanced query. This tuple will contain the field name (name, synonym, etc),
    the value for this field and the boolean operator (AND/OR).
    """
    for (k, v) in sorted([(k, v) for (k, v) in params.iteritems() 
                                     if k.startswith("field-")]):
        (_field, field_number) = k.split("-")
        field_value = params.get("value-" + field_number)
        yield (v, field_value)

def get_field_matches(explain, index_fields):
    """
    Iterates over the toString output of the Lucene explain object to parse
    out which fields generated the current hit. Returns a list containing all
    fields involved in generating this hit
    """
    match_fields = set()

    for line in explain.split('\n'):
        if line.find('fieldNorm') != -1:
            field_name = line.split('field=')[1].split(',')[0]
            if field_name in index_fields: match_fields.add(field_name)

    return match_fields

