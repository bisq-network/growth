
    // ===================================================================
    // bisq-bot compensation request parser
    // this code is shared between linter_tool.html and the bot (index.js)

    var crParserNS = {

        BSQ_precision: 2, // decimal places
        USD_precision: 2, // decimal places
        compRequest: null,
        bsqRate: 0.99, // will be read from issues list
        cycle: 99,       // will be read from issues list
        strict: true,
        validTeams: [ "dev", "growth", "ops", "support", "security", "admin" ],

        writeLinterSummary: function() {
            var results = "";
            try {
                if (this.compRequest.infoList.length > 0) {
                    results += "## Info\n";
                    for (const i of this.compRequest.infoList) {
                        results += i + "\n";
                    }
                }
                if (this.compRequest.errorList.length > 0) {
                    results += "\n\n";
                    results += "## Errors\n";
                    for (const i of this.compRequest.errorList) {
                        results += i + "\n";
                    }
                    results += "\n";
                    return results; // stop here when we've encountered errors
                }
                results += "\n\n";
                results += "### NO ERRORS\n";
                results += "\n\n";
            }
            catch(e) {
                console.log(e);
                results += "[data error]: " + e.message;
            }
            return results;
        },

        writeIssuance: function() {
            var results = "";
            try {
                results += "\n";
                if (this.compRequest.errorList.length > 0) {
                    results += "Issuance cannot be displayed as there were errors in the comp request\n";
                    return results;
                }
                results += "## Issuance by Team:\n";
                results += "|team|amount BSQ|amount USD|\n";
                results += "|---|---|---|\n";
                var all_info = this.compRequest.issuance.byTeam;
                for (const res of this.compRequest.issuance.byTeam) {
                    results += "|" + res.team + "|"
                        + res.bsq.toFixed(this.BSQ_precision) + "|"
                        + res.usd.toFixed(this.USD_precision) + "|\n";
                }

                results += "\n";
                results += "Total Issuance: " + this.compRequest.issuance.total_BSQ.toFixed(this.BSQ_precision) + " BSQ";
                results += " (equivalent to: " + this.compRequest.issuance.total_USD.toFixed(this.USD_precision) + " USD)\n";
                results += "\n";
            }
            catch(e) {
                console.log(e);
                results += "[data error]: " + e.message;
            }
            return results;
        },

        // check the line items sum up to the summary requested amt
        verifyItemsMatchSummaryTotal : function() {
            var retVal = true;
            var tolerance = 1.00;
            if (this.compRequest.summary.usdRequested != null) {
                var usdDifference = Math.abs(this.compRequest.summary.usdRequested - this.compRequest.issuance.total_USD);
                if (usdDifference >= tolerance) {
                    this.compRequest.errorList.push("ERROR: Total USD does not match the sum of line items:");
                    this.compRequest.errorList.push("   - Summary total: " + this.compRequest.summary.usdRequested.toFixed(this.USD_precision) + " USD");
                    this.compRequest.errorList.push("   - Calculated total: " + this.compRequest.issuance.total_USD.toFixed(this.USD_precision) + " USD\n");
                    retVal = false;
                }
            }
            if (this.compRequest.summary.bsqRequested != null) {
                var bsqDerivedFromUsd = this.compRequest.summary.usdRequested / this.bsqRate;
                var bsqDifference = Math.abs(this.compRequest.summary.bsqRequested - bsqDerivedFromUsd);
                if (bsqDifference >= tolerance) {
                    this.compRequest.errorList.push("ERROR: Total BSQ does not match the sum of line items:");
                    this.compRequest.errorList.push("   - Summary total: " + this.compRequest.summary.bsqRequested.toFixed(this.BSQ_precision) + " BSQ");
                    this.compRequest.errorList.push("   - Calculated total: " + bsqDerivedFromUsd.toFixed(this.BSQ_precision) + " BSQ\n");
                    retVal = false;
                }
            }
            return retVal;
        },

        getTeamLabels : function() {
            var retVal = [];
            var all_info = this.compRequest.issuance.byTeam;
            for (const i of all_info) {
                retVal.push("team:"+i.team.toLowerCase());
            }
            return retVal;
        },

        validateTeam : function(team) {
            var cleanTeam = team.replace(/\*/g, '');
            if (this.validTeams.includes(cleanTeam.toLowerCase())) {
                return cleanTeam.toLowerCase();
            }
            this.compRequest.errorList.push("Unknown team specified: " + cleanTeam);
            return null;
        },

        validateAmount : function(amount) {
            try {
                var sanitizedNumber = Number(amount.replace(/[,]/g, '').replace(/USD/g, ''));
                if (typeof sanitizedNumber == "number" && !isNaN(sanitizedNumber)) {
                    return sanitizedNumber;
                }
            }
            catch(e) {
                console.log(e.message);
            }
            this.compRequest.errorList.push("Invalid amount specified: " + amount);
            return 0;
        },

        removeMultilineComments(lines) {
            var linesToRemove = [];
            var inComment = false;
            for (i=0; i < lines.length; i++) {
                var x = lines[i].toUpperCase().replace(/[ \t\r`*]/g, '');
                x = x.replace(/<!--[\s\S]*?-->/g, ''); // remove HTML comments
                if (x.match(/<!--/g)) { linesToRemove.push(i); inComment = true; }
                else if (x.match(/-->/g)) { linesToRemove.push(i); inComment = false; }
                else if (inComment == true) linesToRemove.push(i);
            }
            for (i=linesToRemove.length-1; i>=0; i--) {
                lines.splice(linesToRemove[i],1);
            }
            return lines;
        },

        // we need to parse summary info from comp request
        findCrSummaryInText : function(lines) {
            var retVal = true;
            var inSummary = false;
            for (i=0; i < lines.length; i++) {
                var x = lines[i].toUpperCase().replace(/[ \t\r`*-]/g, '');
                x = x.replace(/<!--[\s\S]*?-->/g, ''); // remove HTML comments
                if (x.match(/^##SUMMARY/g)) {
                    // found the summary section
                    this.compRequest.summary.startLine = i;
                    inSummary = true;
                    continue;
                }
                else if (x.match(/^##/g)) {
                    // we've found the next section
                    if (inSummary == true) {
                        this.compRequest.summary.endLine = i-1;
                    }
                    inSummary = false;
                    continue;
                }
                if (inSummary == true) {
                    // processing the summary section
                    if (x.match(/^USDREQUESTED:/g)) {
                        var y = x.replace(/^USDREQUESTED:/g, '');
                        var z = y.replace(/[^\d.]/g, '');
                        if (z.length > 0) {
                            this.compRequest.summary.usdRequested = Number(z);
                            this.compRequest.infoList.push("Read USD amount from summary: " + this.compRequest.summary.usdRequested);
                        }
                    }
                    if (x.match(/^BSQREQUESTED:/g)) {
                        var y = x.replace(/^BSQREQUESTED:/g, '').replace(/BSQ$/g, '').split("=");
                        var z = y[y.length-1].replace(/[^\d.]/g, '');
                        if (z.length > 0) {
                            this.compRequest.summary.bsqRequested = Number(z);
                            this.compRequest.infoList.push("Read BSQ amount from summary: " + this.compRequest.summary.bsqRequested);
                        }
                    }
                    if (x.match(/^BSQRATE:/g)) {
                        var y = x.replace(/^BSQRATE:|\(.*\.*.\)/g, '').split("USD");
                        var z = y[0].replace(/[^\d.]/g, '');
                        if (z.length > 0) {
                            var specifiedBsqRate = Number(z);
                            if (this.strict) {
                                var precision = 0.001;
                                if (Math.abs(this.bsqRate - specifiedBsqRate) > precision)	{
                                    this.compRequest.errorList.push("Incorrect BSQ rate specified: " + z + ", expected: " + this.bsqRate);
                                }
                            } else {
                                this.bsqRate = specifiedBsqRate;
                            }
                            this.compRequest.infoList.push("Read BSQ rate from summary: " + specifiedBsqRate);
                        }
                    }
                }
            }
            if (this.compRequest.summary.usdRequested == null) {
                this.compRequest.errorList.push("USD amount not specified in summary section");
                retVal = false;
            }
            if (this.compRequest.summary.bsqRequested == null) {
                this.compRequest.errorList.push("BSQ amount not specified in summary section");
                retVal = false;
            }
            return retVal;
        },
  
        // we need to parse data from compensation requests
        // the data is formatted in markdown tables
        // this routine will search the text for a table
        findNextTableInText : function(lines, tableInfo) {
            tableInfo.foundStart = -1;
            tableInfo.foundEnd = -1;
            var inProgress = false;
            for (i=tableInfo.beginAtLine; i < lines.length; i++) {
                var x = lines[i].replace(/[ \t\r]/g, '');
                x = x.replace(/<!--[\s\S]*?-->/g, ''); // remove HTML comments
                x = x.replace(/<!--[\s\S]*?/g, ''); // remove HTML comments
                x = x.replace(/[\s\S]*?-->/g, ''); // remove HTML comments
                if (x.match(/^##.*INPROGRESS/gi)) {
                    // found the in progress section - we'll have to skip this
                    inProgress = true;
                    continue;
                }
                else if (x.match(/^##/g)) {
                    // we've found the next section
                    inProgress = false;
                    continue;
                }
                if (inProgress == true) {
                    continue;   // skipping the inprogress section
                }
                if (tableInfo.foundStart < 0 && x.match(/TITLE\|TEAM\|USD\|LINK\|NOTES/gi)) {
                    // found the start of the markdown table.
                    tableInfo.foundStart = i;
                    continue;
                }
                if (tableInfo.foundStart >= 0 && tableInfo.foundEnd < 0 && x == '') {
                    // found the end of the markdown table.
                    tableInfo.foundEnd = i;
                    break;
                }
            }
            if (tableInfo.foundStart >= 0 && tableInfo.foundEnd < 0) {
                // edge case: found the end of the markdown table at EOF (thanks @m52go)
                tableInfo.foundEnd = lines.length;
            }
            if (tableInfo.foundStart < 0 || tableInfo.foundEnd < 0) {
                // error table not found
                return false;
            }
            // copy the table data into tableInfo.tableLines
            // skip the header line
            for (i=tableInfo.foundStart+1; i < tableInfo.foundEnd; i++) {
                var x = lines[i].replace(/[ \t\r]/g, '');
                if (!x.match(/^\|/gi)) x = "|"+x; // some people do not specify first bar
                if (x.match(/\|(-)\1{1,}\|(-)\1{1,}\|(-)\1{1,}\|(-)\1{1,}\|(-)\1{1,}\|/gi)) { continue; } // skip blank table rows
                if (x == "||||||") { continue; } // skip blank table rows
                tableInfo.tableLines.push(x);
            }
            return true;
        },

        // parse the contents of the table, ignore the header row
        parseRequestsFromTable : function(lines) {
            var recordsParsed = 0;
            var teams = new Set();
            for (i=0; i < lines.length; i++) {
                // each line should split into 5 fields: title,team,USD,link,notes
                var x = lines[i].replace(/[, \t\r]/g, '');
                x = x.replace(/<!--[\s\S]*?-->/g, ''); // remove HTML comments
                var fields = x.split('|');
                if (fields.length < 5) {
                    this.compRequest.errorList.push("Tableformat: request lineitem #"+(i+1)+" does not have the requisite number of fields.");
                    console.log("WRONG#FIELDS:"+x);
                    continue;
                }
                // ignore blank entries
                // - this allows the user to detail a list of work items and claim a total amount on the last line
                if ((fields[2] == "") && (fields[3] == "")) {
                    continue;
                }
                var requestLineItem = { team: this.validateTeam(fields[2]), amount: this.validateAmount(fields[3]) };
                if (requestLineItem.team) { // only process known valid teams
                    teams.add(requestLineItem.team);
                    this.compRequest.requests.push(requestLineItem);
                    this.compRequest.infoList.push("Parsed lineitem: " + JSON.stringify(requestLineItem));
                    recordsParsed += 1;
                } else {
                    this.compRequest.errorList.push("Tableformat: request lineitem #"+(i+1)+" did not pass validation.");
                }
            }
            this.compRequest.teams = Array.from(teams);
            if (recordsParsed < 1) {
                this.compRequest.errorList.push("No compensation lineitems found.");
            }
            return recordsParsed;
        },
        
        // we're given the complete issue text:
        // grab request items from one or more markdown tables
        // collate the amounts by team
        // validate against the summary total entered by users
        parseContributionRequest : function(crBodyText) {
            this.compRequest = {
                errorList: [],
                infoList: [],
                summary: { bsqRequested: null, usdRequested: null, startLine: 0, endLine: 0 }, 
                requests: [],
                issuance: {
                    total_USD: null, 
                    total_BSQ: null,
                    byTeam: []
                }
            };

            var lines = crBodyText.split('\n');
            lines = this.removeMultilineComments(lines);
            this.findCrSummaryInText(lines);
            // grab the markdown table(s), ignore the rest
            // start after the summary section
            var tableInfo = { beginAtLine: this.compRequest.summary.endLine+1, foundStart: -1, foundEnd: this.compRequest.summary.endLine, tableLines: [ ] }
            do {
                tableInfo.beginAtLine = tableInfo.foundEnd+1;
            } while (this.findNextTableInText(lines, tableInfo));
            
            if (this.parseRequestsFromTable(tableInfo.tableLines) > 0) {
                // now sum up the USD amount by team 
                // and calculate the equivalent BSQ amount based on proportion of total BSQ requested
                var issuancePerTeam = [ ];
                var compRequestTotalUsd = 0;
                var compRequestTotalBsq = 0;
                for (const currentTeam of this.compRequest.teams) {
                    var usdPerTeam = 0;
                    var all_info = this.compRequest.requests;
                    for (const i of all_info) {
                        if (i.team == currentTeam) {
                            usdPerTeam += i.amount;
                        }
                    }
                    var bsqPerTeam = this.compRequest.summary.bsqRequested*(usdPerTeam/this.compRequest.summary.usdRequested);
                    // only track the team bucket if amount claimed is greater than zero
                    if (bsqPerTeam > 0 || usdPerTeam > 0) {
                        issuancePerTeam.push({ team: currentTeam, bsq: Number(bsqPerTeam.toFixed(this.BSQ_precision)), usd: Number(usdPerTeam.toFixed(this.USD_precision)) });
                        compRequestTotalUsd += usdPerTeam;
                        compRequestTotalBsq += bsqPerTeam;
                    }
                }
                // set the team totals in the compRequest object
                this.compRequest.issuance.total_USD = Number(compRequestTotalUsd);
                this.compRequest.issuance.total_BSQ = Number(compRequestTotalBsq);
                this.compRequest.issuance.byTeam = issuancePerTeam;
                if (this.verifyItemsMatchSummaryTotal()) {
                    // after validating the amounts match (within tolerance), set the issuance equal to what was requested
                    // this is because sometimes users round their amounts up or down to the nearest whole number (which we consider acceptable)
                    this.compRequest.issuance.total_USD = Number(this.compRequest.summary.usdRequested);
                    this.compRequest.issuance.total_BSQ = Number(this.compRequest.summary.bsqRequested);
                }
            }
            return this.writeLinterSummary();
        },
        
        configLoadBsqRate : function(html) {
            var lines = html.split(',');
            for (i=0; i < lines.length; i++) {
                var x = lines[i].toUpperCase().replace(/[ \n\t\r`*-]/g, '');
                x = x.replace(/<!--[\s\S]*?-->/g, ''); // remove HTML comments
                if (x.match(/^"TITLE":/g)) {
                    // found line containing the rate
                    x = x.replace(/"TITLE":/g, '');
                    var cycleTxt = x.replace(/^"BSQRATEFORCYCLE/g, '');
                    var fields2 = cycleTxt.split("IS");
                    var y = fields2[0].replace(/[^\d.]/g, '');
                    if (y.length > 0) {
                        var specifiedBsqCycle = Number(y);
                        this.cycle = specifiedBsqCycle;
                    }
                    var rateTxt = x.replace(/^"BSQRATEFORCYCLE.*IS/g, '');
                    var fields = rateTxt.split("USD");
                    var z = fields[0].replace(/[^\d.]/g, '');
                    if (z.length > 0) {
                        var specifiedBsqRate = Number(z);
                        this.bsqRate = specifiedBsqRate;
                        return "Read from Github: BSQ rate=" + this.bsqRate + " cycle=" + this.cycle;
                    }
                }
            }
            return "failed to read BSQ rate/cycle from Github: " + lines.length;
        },


    };  // end of crParserNS

module.exports = crParserNS


