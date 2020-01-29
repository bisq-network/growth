#!/usr/bin/env bash

mkdir -p data

while true
do
    python parse-offers.py
    sleep 30
done
