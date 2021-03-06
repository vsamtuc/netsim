
from runner.config import cfg
from runner.dpcmrepo import ProjectRepository
from vectorl.base import CompilerErrorLine
from vectorl.model import ModelFactory
from vectorl.runtime import Runner
from simgen.utils import execute_function
from models.project_repo import VECTORL
from models.validation import Process, inform
import tempfile
import logging
import os.path

class ProjectModelFactory(ModelFactory):

	def __init__(self, project_id, process_factory):
		super().__init__(process_factory=process_factory)
		self.project_id = project_id
		self.repo = ProjectRepository(cfg.project_repository)
		self.object_map = {}
		self.id_map = {}

	def get_model_source(self, name):
		'''
		Get an object from the project repository for the
		specified name, in the project given.
		'''

		obj = { 'project_id': self.project_id, 'name': name }
		vlid = VECTORL.id_for_primary_key(obj)
		self.id_map[name] = vlid
		vlobj = self.repo.db_of(VECTORL).get(vlid)
		self.object_map[name] = vlobj
		return vlobj['code']



class JsonHandler(logging.Handler):
	'''
	A handler that appends json objects to
	a given list.
	'''
	def __init__(self, records):
		super().__init__(logging.INFO)
		self.records = records
		self.setFormatter(CompilerErrorLine())

	def emit(self, record):
		obj = {
			'level': record.levelname,
			'message': self.format(record)
		}
		self.records.append(obj)


class ProcProcess(Process):
	'''
	This class creates instances of binds the attribute to a fixed list.
	This is to ensure that all handlers created by instances
	append to the same list.

	Static method new_factory() returns a new factory function
	for this class, bound to a specified list.
	'''

	def __init__(self, record_list, name=None, logger=logging.getLogger('vectorl.proc')):
		super().__init__(name=name, logger = logger)
		self.record_list = record_list
		if logger:
			self.addScopeHandler(JsonHandler(self.record_list))

	@staticmethod
	def new_factory(blist):
		def factory(*args, **kwargs):
			return ProcProcess(blist, *args, **kwargs)
		return factory


def process_vectorl(project_id, model_name, run=False, until=None, steps=None):
	'''
	Compile and return results.
	'''

	output_list = []
	pf = ProcProcess.new_factory(output_list)
	factory = ProjectModelFactory(project_id, pf)
	varlist = []

	with pf(name='top process', logger=None) as top:
		top.suppress(Exception)
		factory.get_model(model_name)
		if top.success:
			 varlist = [v.full_name for v in factory.all_variables() if v.toplevel]
		inform("Got model")

	logging.info("Output list: %s",output_list)

	comp_output = {
		'type': 'vectorl_compiler_output',
		'project_id': project_id,
		'vectorl_model_name': model_name,
		'id_map' : factory.id_map,
		'vectorl_object_map': factory.object_map,
		'success': top.success,
		'compiler_output': list(output_list),  # make a copy!
		"variables": varlist
	}


	if not run:
		return comp_output

	# we are also asked to run the model
	result = {
		'compiler': comp_output
	}
	if not top.success:
		return result

	# ok, we compiled correctly, now we need to run!
	# first, we empty the output list
	del output_list[:]

	assert top.success
	runner = None
	with top:
		runner = Runner(factory)
		runner.start(until, steps)

	result.update({
		'type': 'vectorl_run_output',
		'success': top.success,
		'run_output': output_list
		})

	if runner is not None:
		result.update({
			'maximum_steps': str(steps),
			'maximum_time': str(until),
			'run_steps': runner.step,
			'end_time': runner.now
			})

	return result


def proc_vectorl_model(project_id, model_name, run=False, until=None, steps=None):
	'''
	Entry function for processing vectorl files in another process.
	'''
	with tempfile.TemporaryDirectory() as fileloc:
		retval = execute_function(fileloc, process_vectorl, 'vl', True, 
			project_id, model_name, run=run, until=until, steps=steps)
		with open(os.path.join(fileloc, 'stdout.vl.txt'), 'r') as f:
			retval['stdout'] = f.read()
		with open(os.path.join(fileloc, 'stderr.vl.txt'), 'r') as f:
			retval['stderr'] = f.read()
	return retval

