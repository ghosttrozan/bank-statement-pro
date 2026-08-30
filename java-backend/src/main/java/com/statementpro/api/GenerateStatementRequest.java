package com.statementpro.api;

import com.statementpro.model.AccountInfo;
import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;
import com.statementpro.model.StatementSettings;

public record GenerateStatementRequest(
        CustomerDetails customerDetails,
        BranchDetails branchDetails,
        AccountInfo accountInfo,
        StatementSettings settings
) {}
