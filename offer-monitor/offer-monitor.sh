#!/usr/bin/env bash
# goal: this script aims to collect all bisq offers that go online in 24-hour periods. 
#   leave it running and it will collect all offers for each calendar day in a separate file.
# requires: python 2.
# instructions: set full path in settings.env and start bisq with --dumpStatistics=true.

mkdir -p data

while true
do
    python parse-offers.py
    sleep 10
done
