# offer-monitor

This script watches the Bisq offer book and collects all offers that go online. Leave it running and it will collect all offers for each calendar day in a separate file.

## Requirements

Python 2

## Instructions

Set the full path to `btc_mainnet/db/offers_statistics.json` in `settings.env`, start Bisq with `--dumpStatistics=true`, and then run `offer-monitor.sh`.

## Intentions

Help determine the characteristics of a healthy offer book: what kind of offer book correlates with higher volume?