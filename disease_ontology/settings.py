# Django settings for disease_ontology project.

import os
import ConfigParser

## All our config settings should be read in from a config file found 
## in our root htdocs/conf folder
config_file = os.path.abspath(os.path.dirname(__file__) + 
                              "/../conf/disease_ontology.conf")
config = ConfigParser.RawConfigParser()
config.read(config_file)

DEBUG = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    ('Cesar Arze', 'carze@som.umaryland.edu'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',   
        'NAME': config.get('DB', 'NAME'),      
        'USER': config.get('DB', 'USERNAME'),   
        'PASSWORD': config.get('DB', 'PASSWORD'),
        'HOST': config.get('DB', 'HOSTNAME'),
        'PORT': '',                       
    }
}

# The URL to our Neo4j server 
NEO4J_URL = config.get('NEO4J', 'SERVER_URL')

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = ''

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/media/'

# URL prefix for admin static files -- CSS, JavaScript and images.
# Make sure to use a trailing slash.
# Examples: "http://foo.com/static/admin/", "/static/admin/".
ADMIN_MEDIA_PREFIX = '/media/admin/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(os.path.dirname(__file__), 'media')
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = '$ex=t*8g_a*8w+r)#ly*r*-vnt_h!6y094f-4g!js(hhigi!8+'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
)

ROOT_URLCONF = 'disease_ontology.urls'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(os.path.dirname(__file__), 'templates')
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'disease_ontology.apps.news',
    'disease_ontology.apps.links',
    'disease_ontology.apps.content',
)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = { 
    'version': 1,
    'disable_existing_loggers': True,
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s' 
        },  
        'simple': {
            'format': '%(levelname)s %(message)s'
        },  
    },  
    'handlers': {
        'default': {
            'level': 'DEBUG',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(os.path.dirname(__file__), 'logs/debug.log'),
            'maxBytes': 1024*1024*5, # 5MB
            'formatter': 'simple',
        },  
    },  
    'loggers': {
        '': {
            'handlers': ['default'],
            'level': 'DEBUG',
            'propogate': True
        },  
    },  
}

######################################
#       APP SPECIFIC SETTINGS        #
######################################

#-------------------
# Content 
#-------------------

# Primary metadata that will be displayed in our metadata content
PRIMARY_METADATA = ['id', 'name', 'obsolete', 'definition']

# Path to the Lucene index generated from the Disease Ontology obo file
LUCENE_INDEX = config.get('LUCENE', 'INDEX_PATH')
#LUCENE_INDEX = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database/lucene/obo/') 

# Fields to search in our Lucene index -- this is a dictionary that contains a list of all 
# the valid fields in our index and what kind of Lucene analyzer to use on the field
OBO_INDEX_METADATA = { "term id":         'standard',
                       "name":            'standard',
                       "alt_id":          'standard',
                       "synonym":         'standard',
                       "xref":            'standard', 
                       "relationship":    'standard',
                       "subset":          'standard',
                       "definition":      'standard' }
                    
# ["term id", "name", "alt_id", "synonym", "xref", "relationship", "subset", "definition"]

# Number of search results to display per page
RECORDS_PER_PAGE=19

# Number of pages we should display in our pagination menu. This is a sliding 
# window that will increase as the user moves up or down the pages.
PAGE_WINDOW = 10

# Our recaptcha public and private API key
RECAPTCHA_PUBLIC_KEY = config.get('CAPTCHA', 'PUBLIC_KEY')
RECAPTCHA_PRIVATE_KEY = config.get('CAPTCHA', 'PRIVATE_KEY')
