#
# JSON Reader 
#
# A class for parsing json into model objects
# 

from models.validation import Context, fail, fatal, inform, warn, add_context
from models.mf import RelKind, python_type, annotation_class, Attribute




##################################################################
#
# Some attribute annotations.  See nsd.py for an example
#
##################################################################

# Declare a class model in nsd.py to correspond to a PR entity model
# defined in project_repo.py
repository = annotation_class('repository', ('entity',))

# Declare an attribute to have another name in json
json_name = annotation_class('json_name', ('name',))

# Declare a required attribute to map
required = annotation_class('required',())()

# Declare an ignored attribute. Even if it can be
# mapped in json, it is left alone!
ignore = annotation_class('ignore', ())()

# Declare a function transforming the json value to 
# a model value
json_filter = annotation_class('json_filter',('function',))


#
# relationship annotation
#

# Create (if needed) an object for this relationship and 
# descend into the json object.
# Json objects correspond to ref and json arrays to 
# ref_list or refs.
#
# Example:
#
#class Foo:
#    a = ref(...)
#    descend(a)
#
#    b = ref_list(...)
#    descend(b)
#
#json = {
#    ...
#    "a "= { 
#        ...
#    },
#
#    "b" = [ 
#        { ... },
#        { ... }
#    ],
#}

descend = annotation_class('descend',())()


#
#  
#


class TransformValueError(ValueError):
    '''
    Error transforming a value from json.
    '''
    def __init__(self, attr, value):
        super().__init__(attr,value)
        self.attr = attr
        self.value = value

class RequiredMissingError(NameError):
    '''
    A required attribute of relationship is missing
    '''
    def __init__(self, element):
        super().__init__(element)
        self.element = element

class DescendError(TypeError):
    '''
    Error descending to a json subobject.
    '''
    def __init__(self, rel):
        self.rel=rel


def transform_value(attr, value):
    """
    Transform a value so that it is assignment-compatible the given mf.Attribute.
    """
    assert isinstance(attr, Attribute)
    
    try:
        if json_filter.has(attr):
            return json_filter.get(attr).function(value)

        if isinstance(value, attr.type):
            return value 

        if attr.nullable and value is None:
            return value
    
        # try a default python conversion
        tval = attr.type(value)
        return tval
    except Exception as e:
        fail('Incompatible value. Expected %s and got %s', attr.type, type(value).__name__)



class JSONReader:
    '''
    Instances of this class can be used to provide for translation
    of a json object into a hierarchy of model objects.
    '''

    def transform_value(self, attr, name):
        '''
        Simply call transform_value
        '''
        return transform_value(attr, name)

    def populate_modeled_instance(self, model, json, **defaults):
        """
        Given a model object and a json dict, fill in the attributes of model
        from the json dict.
        
        This method will cast certain types to others, using transform_value.
        """

        metamodel = model.__model_class__
        json_fields = set(json.keys())

        with Context(importing=metamodel.name):
        
            # Map the model attributes         
            for attr in metamodel.all_attributes:
                with Context(reading=attr.name):

                    # Respect 'ignore' annotation
                    if ignore.has(attr):
                        continue

                    if attr.name in defaults:
                        setattr(model, attr.name, tval)

                    # here we respect name mapping by a 'json_name' annotation
                    json_field = json_name.get_item(attr, default=attr.name)

                    # look up attribute in json object
                    if json_field in json:
                        json_fields.remove(json_field)
                        tval = self.transform_value(attr, json[json_field])
                        setattr(model, attr.name, tval)                
                    else:
                        if required.has(attr):
                            fail("Missing required attribute '%s' of %s", attr.name, metamodel.name)

            # Map the relationships
            for rel in metamodel.relationships:

                with Context(reading=rel.name):

                    # only process those relationships annotated as 'descend'
                    if not descend.has(rel): continue

                    # here we respect name mapping by a 'json_name' annotation
                    json_field = json_name.get_item(rel, default=rel.name)

                    # look up name in json object
                    if json_field in json:
                        json_value = json[json_field]

                        if isinstance(json_value, list)==(rel.kind is RelKind.ONE):
                            expected_found = ('one','many') if rel.kind is RelKind.ONE else ('many','one')
                            fail("For attribute '%s' of %s, expected %s and got %s", 
                                json_field, metamodel.name, expected_found[0], expected_found[1])

                        # ok, now create subobject(s) (must be default constructibe)
                        submodel_class = python_type.get_item(rel.target)
                        # a small trick: to handle both a json subobject and a sublist
                        # in the same way, make the object into a list of one item!
                        if not isinstance(json_value, list):
                            subitems = [json_value]
                        else:
                            subitems = json_value

                        # loop over subitems
                        for subitem in subitems:               
                            subobj = submodel_class()
                            self.populate_modeled_instance(subobj, subitem)
                            # establish the association
                            getattr(model.__class__, rel.name).associate(model, subobj)

                        # all done, mark field as processed
                        json_fields.remove(json_field)

                    else:
                        if required.has(rel):
                            fail("Missing required subobject '%s' of %s", rel.name, metamodel.name)


