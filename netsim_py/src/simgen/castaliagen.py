
import os.path
from runner.config import castalia_path
from models.nsd import *
from models.castalia_sim import *
from models.mf import Attribute
from simgen.utils import docstring_template
import pyproj


def generate_castalia(gen):
    '''
    Main entry routine for generating a castalia simulation from the NSD
    '''

    gen.log.info("The NSD object=%s", repr(gen.nsd))
    cm = m2m_nsd_to_castalia(gen, gen.nsd)
    m2t_castalia_model(gen, cm)
    gen.log.debug("Code generated from NSD")

#
# M2M transform: NSD -> CastaliaModel
#

def m2m_nsd_to_castalia(gen, nsd):
    '''
    Create castalia model from nsd.
    '''
    cm = CastaliaModel()
    cm.omnetpp = m2m_nsd_to_omnetpp(gen, nsd)
    cm.network = m2m_nsd_to_network(gen, nsd)
    return cm

def m2m_nsd_to_omnetpp(gen, nsd):
    '''
    Create Omnetpp model from NSD
    '''
    o = Omnetpp()
    o.sim_time_limit = nsd.parameters.sim_time_limit
    o.simtime_scale = nsd.parameters.simtime_scale
    o.cpu_time_limit = nsd.parameters.cpu_time_limit
    o.castalia_path = castalia_path()
    return o


def m2m_nsd_to_network(gen, nsd):
    '''
    Create castalia module network.
    '''
    net = Network(None, 'SN')

    # create nodes
    node_modules = []
    for mote in nsd.network.motes:
        node = Node(net, 'node', len(node_modules))
        node.name = mote.node_id
        node.mote = mote
        node.ApplicationName = 'ConnectivityMatrix'
        node_modules.append(node)
    assert len(node_modules)>0

    AOI = compute_positions(node_modules)

    # silly code
    net.field_x = AOI[0]
    net.field_y = AOI[1]
    net.field_z = AOI[2]

    net.numNodes = len(node_modules)
    net.numPhysicalProcesses = 1
    net.physicalProcessName = 'foo'


    return net
    

def compute_positions(node_modules):
    '''
    Takes an array of Node objects and adorns them with coordinates.
    Returns the area of interest.
    '''
    #
    # create Proj objects for mapping
    #

    # all PT coordinates in epsg 4326
    from_proj = pyproj.Proj(init='epsg:4326')

    # for output coordinates, create an appropriate UTM projection
    to_proj = pyproj.Proj(proj='utm', 
        lon_0=node_modules[0].mote.position.lon, 
        ellps='WGS84')

    # all position pairs
    all_pos = []
    for n in node_modules:
        x,y = pyproj.transform(from_proj, to_proj, n.mote.position.lon, n.mote.position.lat)

        z = n.mote.position.alt + n.mote.elevation
        all_pos.append( (x,y,z) )


    # rebase coordinates to the (0,0)-(P,Q) rectangle
    pmin = [0]*3
    for p in range(3):
        val = min(P[p] for P in all_pos)
        print("val=",val)
        pmin[p] = val


    final_pos = [(x-pmin[0], y-pmin[1], z-pmin[2]) for x,y,z in all_pos]

    # initialize
    for i in range(len(node_modules)):
        node = node_modules[i]
        node.xCoor = final_pos[i][0]
        node.yCoor = final_pos[i][1]
        node.zCoor = final_pos[i][2]

    aoi = [0]*3
    for p in range(3):
        aoi[p] = max(P[p] for P in final_pos)

    print('aoi=',aoi)
    return aoi


#
# M2T transform:  CastaliaModel 
# 

def m2t_castalia_model(gen, cm):
    '''
    Create the simulation files.
    '''
    generate_omnetpp(gen, cm)


def generate_omnetpp(gen, cm):
    '''
    Generate the omnetpp.ini file.
    '''
    gen.log.debug("Generating omnetpp.ini")    
    with gen.output_file("omnetpp.ini") as omnetpp:
        omnetpp.write(omnetpp_preamble(cm))
        generate_omnetpp_for_module(omnetpp, cm.network)

def generate_omnetpp_for_module(omnetpp, m):
    # first, iterate over module parameters
    mclass = m.__model_class__
    pname = m.full_name()
    for param in mclass.all_attributes:
        if Param.has(param):
            omnetpp.write(omnetpp_module_param(m,pname,param))

    # now, iterate over submodules
    for sm in m.submodules:
        generate_omnetpp_for_module(omnetpp,sm)



#
#  omnetpp.ini
#

@docstring_template
def omnetpp_module_param(mod, modpath, param):
    """
    {{modpath}}.{{param.name}} = {{value}}
    """
    value = str(getattr(mod, param.name))
    return locals()


@docstring_template
def omnetpp_preamble(cm):
    r"""\
#
#  Generated by netsim generator.
# 

[General]

# ==========================================================
# The main Castalia.ini file is included inline (!)
# ==========================================================

cmdenv-express-mode = true
cmdenv-module-messages = true
cmdenv-event-banners = false
cmdenv-performance-display = false
cmdenv-interactive = false

ned-path = {{cm.omnetpp.castalia_path}}/src

network = SN    # this line is for Cmdenv

output-vector-file = Castalia-statistics.vec
output-scalar-file = Castalia-statistics.sca

# 11 random number streams (or generators as OMNeT calls them)
num-rngs = 11 

# ===========================================================
# Map the 11 RNGs streams with the various module RNGs. 
# ==========================================================

SN.wirelessChannel.rng-0        = 1     # used to produce the random shadowing effects
SN.wirelessChannel.rng-2        = 9 # used in temporal model
                                    
SN.node[*].Application.rng-0        = 3 # Randomizes the start time of the application
SN.node[*].Communication.Radio.rng-0    = 2 # used to decide if a receiver, with X probability.
                        # to receive a packet, will indeed receive it

SN.node[*].Communication.MAC.rng-0  = 4 # Produces values compared against txProb
SN.node[*].Communication.MAC.rng-1  = 5 # Produces values between [0 ....  randomTxOffset]

SN.node[*].ResourceManager.rng-0    = 6 # Produces values of the clock drift of the CPU of each node
SN.node[*].SensorManager.rng-0      = 7 # Produces values of the sensor devices' bias
SN.node[*].SensorManager.rng-1      = 8 # Produces values of the sensor devices' noise

SN.physicalProcess[*].rng-0         = 10    # currently used only in CarsPhysicalProcess

SN.node[*].MobilityManager.rng-0    = 0 # used to randomly place the nodes

sim-time-limit = 100s

SN.field_x = 30                                 # meters
SN.field_y = 30                                 # meters

# Specifying number of nodes and their deployment
SN.numNodes = 9
SN.deployment = "3x3"

# Removing variability from wireless channel
SN.wirelessChannel.bidirectionalSigma = 0
SN.wirelessChannel.sigma = 0

# Select a Radio and a default Tx power
SN.node[*].Communication.Radio.RadioParametersFile = "../Parameters/Radio/CC2420.txt"
SN.node[*].Communication.Radio.TxOutputPower = "-5dBm"

# Using connectivity map application module with default parameters
SN.node[*].ApplicationName = "ConnectivityMap"

[Config varyTxPower]
SN.node[*].Communication.Radio.TxOutputPower = ${TXpower="0dBm","-1dBm","-3dBm","-5dBm"}

[Config varySigma]
SN.wirelessChannel.sigma = ${Sigma=0,1,3,5}


"""

    return locals()


"""
sim-time-limit = {{cm.omnetpp.sim_time_limit}}s
simtime-scale = {{cm.omnetpp.simtime_scale}}
% if cm.omnetpp.cpu_time_limit is not None:
cpu-time-limit = {{cm.omnetpp.cpu_time_limit}}
% end

"""



