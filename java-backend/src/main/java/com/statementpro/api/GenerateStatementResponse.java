package com.statementpro.api;

import com.statementpro.model.StatementRecord;

public record GenerateStatementResponse(StatementRecord record, String pdfBase64) {}
