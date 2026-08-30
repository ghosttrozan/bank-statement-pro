package com.statementpro.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JsonRoundTripTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void transactionRoundTripsThroughJson() throws Exception {
        Transaction tx = new Transaction("tx_1", "01/04/2026", "01/04/2026",
                "UPI/123/CR/TEST", "123456789012", null, 500.0, 90500.0);

        String json = mapper.writeValueAsString(tx);
        Transaction back = mapper.readValue(json, Transaction.class);

        assertEquals(tx, back);
    }

    @Test
    void statementSettingsRoundTripsThroughJson() throws Exception {
        String json = """
            {"bankStyle":"SBI2","duration":"3 Months","generationMode":"duration",
             "fromDate":null,"toDate":null,"pageCount":"5 Pages","customTransactionsCount":0,
             "transactionMode":"Normal","profile":"Personal","salaryMode":"auto",
             "companyName":null,"monthlySalary":null,"salaryDay":"1",
             "pdfPassword":null,"enablePdfPassword":false}
            """;

        StatementSettings settings = mapper.readValue(json, StatementSettings.class);
        assertEquals("SBI2", settings.bankStyle());
        assertEquals("5 Pages", settings.pageCount());
    }
}
