package com.statementpro.pdf;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.statementpro.model.AccountInfo;
import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.StatementSettings;
import com.statementpro.model.Transaction;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class IppbTemplateTest {

    @Test
    public void testGenerateIppbStatement() throws Exception {
        CustomerDetails customer = new CustomerDetails(
                "VARUN",
                "JXXXXXX5@gmail.com",
                ", JIYAGAON , JIYAGAON,DEWAS - - DEWAS MADHYA PRADESH 455336",
                "027810033405",
                "XXXXX0625",
                "2026-04-01",
                "",
                "DEWAS",
                "455336"
        );

        BranchDetails branch = new BranchDetails(
                "DEWAS BRANCH",
                "DEWAS BRANCH , JIYAGAON , JIYAGAON,DEWAS - - DEWAS MADHYA PRADESH 455336",
                "0278",
                "contact@ippbonline.in",
                "155299",
                "IPOS0000001",
                "455768001",
                "XXXXX0625",
                "DEWAS",
                "455336"
        );

        AccountInfo accountInfo = new AccountInfo(
                122.73,
                2.5,
                "INR",
                "Active",
                "Savings Account"
        );

        StatementSettings settings = new StatementSettings(
                "IPPB",
                "1 Month",
                "custom",
                "2026-04-01",
                "2026-04-30",
                "Auto",
                200,
                "Normal",
                "Personal",
                "auto",
                "",
                null,
                "",
                "",
                false
        );

        // Load extracted 200 transactions
        List<Transaction> transactions = new ArrayList<>();
        Path jsonPath = Paths.get("extracted_ippb_txs.json");
        if (!Files.exists(jsonPath)) {
            jsonPath = Paths.get("..", "extracted_ippb_txs.json");
        }
        if (!Files.exists(jsonPath)) {
            jsonPath = Paths.get("..", "..", "extracted_ippb_txs.json");
        }
        System.out.println("Reading transactions from: " + jsonPath.toAbsolutePath() + ", exists=" + Files.exists(jsonPath));

        if (Files.exists(jsonPath)) {
            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> rawList = mapper.readValue(jsonPath.toFile(), new TypeReference<>() {});
            int idx = 0;
            for (Map<String, Object> m : rawList) {
                String dt = (String) m.get("date");
                String ref = (String) m.get("refNo");
                String details = (String) m.get("details");
                Double dr = m.get("debit") != null ? ((Number) m.get("debit")).doubleValue() : null;
                Double cr = m.get("credit") != null ? ((Number) m.get("credit")).doubleValue() : null;
                Double bal = m.get("balance") != null ? ((Number) m.get("balance")).doubleValue() : 0.0;
                transactions.add(new Transaction("tx_" + idx, dt, dt, details, ref, dr, cr, bal));
                idx++;
            }
        }
        System.out.println("Loaded " + transactions.size() + " transactions for test");

        StatementRecord record = new StatementRecord(
                "rec_ippb_test",
                "2026-05-08T10:42:14",
                customer,
                branch,
                accountInfo,
                settings,
                transactions,
                443.99,
                129573.0,
                129251.74,
                160,
                40
        );

        StatementTemplate template = PdfTemplateFactory.forBankStyle("IPPB");
        assertNotNull(template);
        assertTrue(template instanceof IppbTemplate);

        byte[] pdfBytes = template.render(record);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 50000, "PDF size should be substantial");

        // Write to output file
        File outFile = new File("../../Ippb_Generated_Statement.pdf");
        if (!outFile.getParentFile().exists()) {
            outFile = new File("../Ippb_Generated_Statement.pdf");
        }
        try (FileOutputStream fos = new FileOutputStream(outFile)) {
            fos.write(pdfBytes);
        }
        System.out.println("Generated IPPB statement successfully at: " + outFile.getAbsolutePath() + " (size: " + pdfBytes.length + " bytes)");
    }
}
