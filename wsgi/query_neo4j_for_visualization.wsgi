#/usr/bin/env python

###
# A simple script to handle any requests that will be recieved from the 
# web front-end and return JSON packets to be drawn using a visualization
# package

import os
import sys
import json
import ConfigParser

from cgi import parse_qs, escape
from neo4jrestclient import GraphDatabase, request

__author__ = "Cesar Arze"      
__copyyright__ = "Institute for Genome Science - University of Maryland School of Medicine"    
__license__ = "MIT"                  
__version__ = "1.0"                   
__maintainer__ = "Cesar Arze"                    
__email__ = "carze@som.umaryland.edu"    

# Enable cache-ing of requests to the same URL
request.CACHE = False

# Server URL 
config = ConfigParser.RawConfigParser()
config.read(os.path.abspath( os.path.dirname(__file__) + "/../conf/disease_ontology.conf"))
NEO4J_DB_URL = config.get('NEO4J', 'SERVER_URL')

def query_neo4j_packet(gdb, id, query_index=False):
    """
    Querries the Neo4j graph database to pull down a "packet" of data. A packet
    of data can be defined as a sub-tree of the graph containing the queried 
    node and its immediate children.

    By default this function is expecting a raw Neo4j ID but can accept a
    DOID ID if the query_index parameter is set to true.

    If the root node is passed in as the query node (denoted by the ID 
    'root') the root node is pulled down by making use of the root Neo4j
    index
    """
    node = None
    neo4j_children = []
    neo4j_parents = []

    if (query_index):
        index_category = "ontologyid"
        if (id == 'root'):
            index_category = "root"
            id = '1'
        
        node  = query_neo4j_index(gdb, id, index_category)
    else:         
        node = gdb.nodes.get(id)

    # Deal with any children this node might have
    relationships_in = node.relationships.incoming()
    for relation in relationships_in:
        node_color = "gray"
        child = relation.start
           
        # Check if our child has children itself and color accordingly.     
        # 
        #       GREEN   --> Has children
        #       GRAY    --> Has no children
        child_relations = child.relationships.incoming()


        if child_relations: 
            node_color = "green"

        neo4j_children.append( dict(id=child.id, 
                                    doid=child.get('id'), 
                                    name=child.get('name'), 
                                    direction="out",
                                    color=node_color) 
        )

    # Now deal with any parents the node may have
    relationships_out = node.relationships.outgoing()
    for relation in relationships_out:
        node_color = "gray"
        parent = relation.end

        # Check if our parent node has more than 1 child and color accordingly
        parent_relations = parent.relationships.incoming()

        if len(parent_relations) >= 1:
            node_color = "green"
                    
    
        neo4j_parents.append( dict(id=parent.id, 
                                   doid=parent.get('id'), 
                                   name=parent.get('name'), 
                                   direction="in",
                                   color=node_color) 
        )

    return dict(children=neo4j_children, parents=neo4j_parents)
    
def query_neo4j_index(gdb, id, category):
    """
    Query a Neo4j index specified by the category passed into this 
    function.
    """
    index = gdb.nodes.indexes.get(category)
    nodes = index.get('id', id)

    # TODO: When we load the logical defs ontology we will have to deal with
    #       multiple root nodes
    return nodes[0]

def application(environ, start_response):
    http_params = parse_qs(environ['QUERY_STRING'])
    
    node_id = http_params.get('id')[0]
    query_index = http_params.get('index', False)
    gdb = GraphDatabase(NEO4J_DB_URL)
 
    neo4j_json = query_neo4j_packet(gdb, node_id, query_index)
    
    status = '200 OK'
    response_headers = [('Content-type', 'application/json')]
    start_response(status, response_headers)

    return json.dumps(neo4j_json)
