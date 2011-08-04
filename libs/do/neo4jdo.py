##
# This class wraps the Neo4J REST API client module and provides more 
# specific functionality geared towards the needs of the Disease Ontology
# project as well as fills in some missing functionality from the REST
# module
#

import neo4jrestclient

from neo4jdo_exceptions import IndexNotFoundException

__author__ = "Cesar Arze"      
__copyyright__ = "Institute for Genome Science - University of Maryland School of Medicine"    
__license__ = "MIT"                  
__version__ = "1.0"                   
__maintainer__ = "Cesar Arze"                    
__email__ = "carze@som.umaryland.edu"    

class Neo4jDO:
    
    def __init__(self, neo4j_server_url):
        self.gdb = neo4jrestclient.GraphDatabase(neo4j_server_url)
        
    def get_node(self, id):
        """
        Retrieves a node from the Neo4J database (a term) using the supplied
        Neo4J ID.
        """
        return self.gdb.get(id)

    def get_root_nodes(self):
        """
        Retrieves all the root nodes from our root index category.
        """        
        return self._get_nodes_by_neo4j_index('rootnode', '1')

    def get_node_by_ontologyid(self, doid):
        """
        Retrieves a node from the Neo4J database (a term) using the supplied
        Disease Ontology ID. In order to do the proper index must be querried
        to retrieve the matching Neo4J ID which is then used to pull down the
        resulting node from the graph database.
        """    
        node = None
        nodes = self._get_node_by_neo4j_index('ontologyid', doid)

        # Not an amazingly great assumption to make but we shoud alwayss be
        # getting one node back from our index call
        try:
            node = nodes[0]
        except IndexError as e:
            pass

        return node
    
    def _get_node_by_neo4j_index(self, category, doid):
        """
        Queries a Neo4j index using the passed in index category and value (id)
        to retrieve the corresponding Neo4j ID. Raises an 
        IndexNotFoundException if the index/value combination are not found
        """
        try:
            index = self.gdb.nodes.indexes.get(category)
            nodes = index['id'][doid]
        except neo4jrestclient.NotFoundError:
            raise IndexNotFoundException(category, doid)

        return nodes

    def get_formatted_node_relationships(self, node, rel_types=["is_a"]):
        """
        Queries the Neo4j graph database to retrieve all incoming relationships
        to the passed in node. These relationships are formatted into a list
        of (<RELATIONSHIP TYPE>, <RELATIONSHIP NAME>, <RELATIONSHIP DOID>) 
        tuples. A list may also be passed in specifying relationship type to 
        filter on.
        """   
        relationships_list = []
        relationships = node.relationships.outgoing(rel_types)

        for relationship in relationships:
            start = relationship.end
            relationships_list.extend( [(relationship.type, 
                                        start.get('name'), 
                                        start.get('id'))] )
                                        
        return relationships_list           
