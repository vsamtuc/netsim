'''
	Proxy classes to the project repository.

	@author: jvlahou
'''

import functools
import logging
import pycouchdb
import os.path
from runner.config import project_repository

# Import pycouchdb exceptions in this namespace.
# Inheritance tree:
# Error -> UnexpectedError
#       -> FeedReaderError
#       -> ApiError  -> GenericError
#                    -> Conflict 
#                    -> NotFound
#                    -> BadRequest 
#                    -> AuthenticationFailed
from pycouchdb.exceptions import Error, UnexpectedError, \
	FeedReaderExited, ApiError, GenericError, \
	Conflict, NotFound, BadRequest, AuthenticationFailed

from models.project_repo import ApiEntity
from simgen.utils import docstring_template



class ProjectRepository(pycouchdb.Server):
	"""
	This class is used to abstract access to the Couchdb project repository.
	It is currently implemented as a very thin layer over pycouchdb.

	A CouchDbServer is used as a connection pool: it maintains open sockets to
	couchdb and resuses them to implement different connectors.
	"""

	def __init__(self, repo_url, **kwargs):
		super().__init__(repo_url, **kwargs)


	############################
	#
	#  API Implementation
	# 
	############################

	@property
	def PT(self):
		'''The Planning Tool database'''
		return self.database('dpcm_pt_repository')

	@property
	def SIM(self):
		'''The NetSim database'''
		return self.database('dpcm_simulator')


	def update_simulation(self, simid, **kwargs):
		'''Add fields to a simulation object. 
		Returns the new object.
		'''
		sim = self.SIM.get(simid)
		sim.update((), **kwargs)
		self.SIM.save(sim)
		return sim


	def get_projects(self):
		'''Return an iterator on all projects'''
		results = self.PT.query("_design/ptModels/_view/by_projectType", group='true')
		for prj in results:
			yield prj['value']

	def get_plans(self, prjid):
		'''Return an iterator on all plans for a given project'''
		results = self.PT.query("_design/ptModels/_view/plans_by_projectId", group='true', key=prjid)
		for obj in results:
			assert obj['key']==prjid
			for plan in obj['value']['planIds']['planIds']:
				yield plan

	def get_nsds(self):
		'''Return a list of NSD objects of the form
			{
				key: <the project id>
				value: <nsd synopsis>
				id: <nsd id>
			}
		'''
		return self.SIM.query("_design/nsdModel/_view/byProjectId")


	def create_models(self, MODELS):
		'''
		Create and upload design documents for the declared views.
		'''

		# avoid multiple instantiations of database
		database = functools.lru_cache(10)(self.database)

		for ddoc in MODELS:
			db = database(ddoc.entity.database.name)

			obj = ddoc.to_object()

			# copy revision to avoid conflict error
			try:
				oldobj = db.get(ddoc.id)
				obj['_rev'] = oldobj['_rev']
			except NotFound:
				pass

			db.save(obj)



#  Global variable
#	
PR = None

def repo():
	'''
	Return the (global) PR, and instance of class ProjectRepository.

	Note that this can only be used in the server. It CANNOT be used
	from any process created by execute_function(). Processes need to
	create their own instance. (N.B. This is because of connection 
	pooling).
	'''
	return PR


def initialize_repo(url=None, **kwargs):
	"""
	Initialize the global variable PR.
	It contains a ProjectRepository instance configured for use.
	"""
	global PR
	if PR is not None:
		logging.warn("Re-initializing PR")

	if url is None:
		url = project_repository()
	PR = ProjectRepository(url, **kwargs)
	logging.info("Initialized PR")





