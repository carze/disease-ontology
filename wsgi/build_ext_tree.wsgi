#!/usr/bin/env python

###
# This CGI script generates portions of our disease ontology tree based off
# a passed in ontology ID. This ontology ID is used to query against our 
# graph DB index and pull down the neo4j ID for this node. From here the 
# relationships are pulled down and used to create a JSON object that
# can be consumed by Ext's asynchronous tree loader

import os
import sys
import json
import neo4jrestclient
import httplib2
import ConfigParser

from cgi import parse_qs
from operator import itemgetter

__author__ = "Cesar Arze"      
__copyyright__ = "Institute for Genome Science - University of Maryland School of Medicine"    
__license__ = "MIT"                  
__version__ = "1.0"                   
__maintainer__ = "Cesar Arze"                    
__email__ = "carze@som.umaryland.edu"    

# Server URL 
config = ConfigParser.RawConfigParser()
config.read(os.path.abspath( os.path.dirname(__file__) + "/../conf/disease_ontology.conf"))
NEO4J_DB_URL = config.get('NEO4J', 'SERVER_URL')

def get_neo4jid_from_ontology_id(termId, indexCategory="ontologyid"):
    """
    Retrieves the neo4j ID provided an ontology ID.
    """
    neo4jIds = []
    indexUrl = "/".join([NEO4J_DB_URL, "index/node", indexCategory, "id", termId])
    http = httplib2.Http()

    # We want to use httplib here to grab down the specific node that is
    # being requested. Because we are going to use a mixture of the  
    # neo4j REST client and my own code invoking a POST call this is 
    # going to be some very messy code. Will want to figure out a better
    # way to do this in the future
    response, content = http.request(indexUrl, "GET")

    # Make sure we got a valid response
    if response.status == 401:
        raise Exception("Authorization Required")
    elif response.status == 404:
        raise Exception(response.status, "Node not found")
    elif response.status == 200:
        # Valid response, about to do some really ugly code right here
        indices = json.loads(content)
        
        # Neo4j should return to us a list of indicies, most of the time we only
        # need the first element but in special situations like building our the 
        # root(s) of our tree we must return a list of neo4j id's
        for index in indices:
            neo4jIndexUrl = index.get('self')

            # Now here comes the ugly, the neo4j ID only seems to be found in a 
            # URL's, we need the term ID if we want to use the rest client to play nicely
            # here, luckily it should always be the last element of the URL if we split 
            # on '/'
            urlElems = neo4jIndexUrl.split('/')
            neo4jIds.append(urlElems[-1])
                
    return neo4jIds

def build_root_treenode(gdb):
    """
    Build the root node tree structure by querying the rootnode index
    on our neo4j database
    """
    rootNodes = []
    children = []
    rootNodeIds = get_neo4jid_from_ontology_id('0', indexCategory='rootnodes')

    for id in rootNodeIds:
        # For this example we only need to grab the name of our 
        # term and its ontology ID for subsequent lookups.
        node = gdb.nodes.get(id)
        name = node['name']
        termId = node['id']
        
        # Also want to add the children for this node
        root_relations = node.relationships.incoming()
        if root_relations:
            children = build_nonpath_children_tree(root_relations)

        rootNodes.append( dict(text=name, id=termId, expanded=True, children=children) )

    return rootNodes

def build_search_subtree(gdb, ontologyId):
    """
    Given a term name this function will retrieve all the paths
    between the root node and said term and build subgraphs of these
    paths for display in the ExtJS tree.
    """
    jsonTree = []
    searchId = ( get_neo4jid_from_ontology_id(ontologyId) )[0]
    rootNodeId = ( get_neo4jid_from_ontology_id('0', indexCategory='rootnodes') )[0]

    # The call to the neo4j paths function will return an array (in order of 
    # root node -> search term) containing a path between our root node and search
    # term.
    nodePaths = get_node_paths(rootNodeId, searchId)

    if nodePaths:
        tree = build_path_dict(gdb, nodePaths)
        jsonTree.append(tree)
    
    return jsonTree
    
def get_node_paths(root, search):
    """
    Calls the neo4j paths function to retrieve the path between the root
    and search nodes (ids passed in).
    """
    paths = []
    headers = {}
    http = httplib2.Http() # Initialize httplib2 object

    pathsUrl = "/".join([NEO4J_DB_URL, "node", root, "paths"])
    targetUrl = "/".join([NEO4J_DB_URL, "node", search])

    pathsData = dict(to=targetUrl, relationships=dict(type="is_a", direction="in"), algorithm="shortestPath")
    pathsData['max depth'] = 50000
    
    headers['Content-Type'] = 'application/json'
    body = json.dumps(pathsData, ensure_ascii=True)
    response, content = http.request(pathsUrl, 'POST', headers=headers, body=body)

    if response.status == 401:
        raise Exception("Authorization Required")
    elif response.status == 404:
        raise Exception(response.status, "Node not found")
    elif response.status == 200:
        pathContent = json.loads(content)
        
        if pathContent:
            nodeUrls = pathContent[0]['nodes']
            paths = format_path_nodes(nodeUrls)

    return paths
         
def format_path_nodes(urls):
    """
    Takes the content response from a neo4j REST API paths call (URLs to paths)
    and returns a list of just the node ID's
    """
    nodeIds = []

    for url in urls:
        nodeIds.append(url.split("/")[-1])

    return nodeIds        

def build_path_dict(gdb, pathList):
    """
    Takes a list of nodes representing the path between a start and end node
    and builds a dictinary in format that can be consumed by ExtJS:

    [{name: <NAME> children: [{name: <NAME>, children: ....
    """
    node = gdb.nodes.get(pathList[0])
    nodeId = node.get('id')
    name = node.get('name')
    relationships = node.relationships.incoming()
    children = []

    if len(pathList) == 1:
        nodeDict = dict(id=nodeId, text=name, iconCls='search-select-icon')

        if not relationships:
            nodeDict['leaf'] = True

        return nodeDict
    elif pathList:
        if relationships:
            nonPathChildren = [x for x in relationships if str(x.start.id) not in pathList]
            children = build_nonpath_children_tree(nonPathChildren)
    
        children.append(build_path_dict(gdb, pathList[1:]))
        return dict(id=nodeId, text=name, expanded=True, children=sorted(children, key=itemgetter('text')))

def build_nonpath_children_tree(relationships):
    """
    For a given parent node build an ExtJS TreePanel friendly representation 
    of all its children. This will entail returning a list of dictionaries 
    containing the child name and their DOID id.
    """
    children = []

    for relation in relationships:
        node = relation.start

        nodeDict = dict()
        nodeDict['id'] = node.get('id')
        nodeDict['text'] = node.get('name')
        
        if node.relationships.incoming():
            nodeDict['leaf'] = False
        else:
            nodeDict['leaf'] = True
            nodeDict['iconCls'] = 'tree-leaf-icon'
            
        children.append( nodeDict )                         

    return sorted(children, key=itemgetter('text'))

def build_tree_from_neo4j(gdb, id):
    """
    Builds a tree (containing only the immediate children) from the 
    provided neo4j id.
    """
    treeNodes = []
    nodeId = ( get_neo4jid_from_ontology_id(id) )[0]

    node = gdb.nodes.get(nodeId)
    relationships = node.relationships.incoming()

    if relationships:
        for relation in relationships:
            child = relation.start
 
            nodeDict = dict()
            nodeDict['id'] = child.get('id')
            nodeDict['text'] = child.get('name')
            nodeDict['leaf'] = False

            # Check if this child has relationships, if not denote it as a leaf
            # TODO: Find a better way to do this
            if not child.relationships.incoming():
                nodeDict['leaf'] = True
                nodeDict['iconCls'] = 'tree-leaf-icon'
                                   
            treeNodes.append( nodeDict )
    else:
        # Dealing with a leaf node, specify that
        treeNodes.append( dict(id=node.get('id'), text=node.get('name'), leaf=True, iconCls='tree-leaf-icon') )

    return sorted(treeNodes, key=itemgetter('text'))

def application(environ, start_response):
    httpParams = parse_qs(environ['QUERY_STRING'])
    termId = httpParams.get('node')[0]
    searchTree = httpParams.get('search', False)
    jsonTree = None

    gdb = neo4jrestclient.GraphDatabase(NEO4J_DB_URL)

    # If the provided term ID is 'root' we just want to build our root 
    # node in the tree (Better question to ask is how we determine what is 
    # a root and what isn't)
    if termId == "root":
        jsonTree = build_root_treenode(gdb)
    elif searchTree:
        # If true is passed in to our 'search' param we will be building a subtree 
        # from our search term back to root. 
        jsonTree = build_search_subtree(gdb, termId)
    else:        
        # First we want to retrieve the neo4j ID for this specific term.
        # We should have had an ontology ID passed into this CGI script

        # Now that we have our neo4j id we can pull up the individual term
        # and pull up its immediate children to create the tree-like JSON
        # structure to send off to ExtJS
        jsonTree = build_tree_from_neo4j(gdb, termId)

    status = '200 OK'
    response_headers = [('Content-type', 'application/json')]
                  
    start_response(status, response_headers)
    return json.dumps(jsonTree)                       
