import sys
import os
import json
from datetime import datetime

### helper functions

def objToDict( offersObject ):
    dictionary = {}
    for o in offersObject:
        dictionary[o['id']] = o
    return dictionary

### set environment

settingsFile = 'settings.env'

with open( settingsFile, 'r' ) as settings:
    bisqOffersPath = settings.read().split( '=' )[1].splitlines()[0]

### read bisq offers file

try:
    with open( bisqOffersPath, 'r' ) as bisqFile:
        bisqOffers = objToDict( json.loads( bisqFile.read() ) )
except IOError:
    print( 'Error opening Bisq offers file...did you put the correct full path in ' + settingsFile + '? No tildes.' )
    sys.exit()

### read existing offers file

thisTime = datetime.now()

resultsPath = os.getcwd() + "/data/%s%s%s.json" %( thisTime.year, \
    str(0) + str(thisTime.month) if ( thisTime.month < 10 ) else thisTime.month, \
    str(0) + str(thisTime.day) if ( thisTime.day < 10 ) else thisTime.day )

try:
    with open( resultsPath, 'r' ) as todayFile:
        existingOffers = objToDict( json.loads( todayFile.read() ) )      
except IOError:
    existingOffers = {}

### add any missing offers and log results

newOffers = 0

for o in bisqOffers:
    if( o not in existingOffers ):
        existingOffers[o] = bisqOffers[o]
        newOffers += 1

try:
    with open( resultsPath, 'w+' ) as todayFile:
        todayFile.write( json.dumps( existingOffers.values() ) )
except:
    print( 'failed to write results.' )

if( newOffers > 0 ):
    print( "total offers: %s; new: +%s; current: %s; time: %s" %( len(existingOffers), newOffers, len( bisqOffers ), thisTime ) )
