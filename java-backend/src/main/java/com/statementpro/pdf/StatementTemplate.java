package com.statementpro.pdf;

import com.statementpro.model.StatementRecord;

public interface StatementTemplate {
    byte[] render(StatementRecord record) throws java.io.IOException;
}
