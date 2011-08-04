##
# Exceptions used by Disease Ontology's Neo4j querying scripts
#

__author__ = "Cesar Arze"      
__copyyright__ = "Institute for Genome Science - University of Maryland School of Medicine"    
__license__ = "MIT"                  
__version__ = "1.0"                   
__maintainer__ = "Cesar Arze"                    
__email__ = "carze@som.umaryland.edu"    

class IndexNotFoundException(Exception):
    """
    Exception that should be raised when a non-existant Neo4j index is 
    querried.
    """

    def __init__(self, category, id):
        self.error_msg = "Could not retrieve index for %s from category %s"

    def __str__(self):
        return repr(self.error_msg)

