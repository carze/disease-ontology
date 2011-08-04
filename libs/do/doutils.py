#!/usr/bin/env python

####
# A set of utility functions for the Disease Ontology website
#

import os
import ConfigParser

__author__ = "Cesar Arze"      
__copyyright__ = "Institute for Genome Science - University of Maryland School of Medicine"    
__license__ = "MIT"                  
__version__ = "1.0"                   
__maintainer__ = "Cesar Arze"                    
__email__ = "carze@som.umaryland.edu"    

def get_resource_url(xref):
    """
    Builds the corresponding URL to an external resource given a valid xref
    identifier. Valid xref identifiers are defined in the do_xref.config file 
    that should be found in the same directory as this module.

    If an invalid xref identifier is passed in None is returned.
    """
    xref_url = None

    config_file = os.path.abspath( os.path.dirname( os.path.realpath(__file__) )
                                   + "/../../conf/do_xref.ini" )
    config = ConfigParser.RawConfigParser()
    config.read(config_file)

    # Our xref identifier should always be passed in in the format of
    # <DB NAME>:<IDENTIFIER>
    (db_name, identifier) = xref.split(':')

    if config.has_option('xref', db_name):
        reference_url = config.get('xref', db_name)
        xref_url = reference_url + identifier

    return xref_url        
