package com.statementpro.pdf;

import com.itextpdf.kernel.pdf.WriterProperties;
import com.statementpro.model.StatementRecord;

public interface StatementTemplate {
    default byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException;
}
