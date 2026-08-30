package com.statementpro.api;

import com.statementpro.model.AccountInfo;
import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;
import com.statementpro.model.StatementSettings;
import com.statementpro.model.Transaction;

import java.util.List;

public record GenerateStatementRequest(
        CustomerDetails customerDetails,
        BranchDetails branchDetails,
        AccountInfo accountInfo,
        StatementSettings settings,
        List<Transaction> transactions
) {
    public GenerateStatementRequest(CustomerDetails customerDetails, BranchDetails branchDetails, AccountInfo accountInfo, StatementSettings settings) {
        this(customerDetails, branchDetails, accountInfo, settings, null);
    }
}
