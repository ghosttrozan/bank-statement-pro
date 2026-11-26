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

    @Test
    public void testSlashedDatesConversion() throws Exception {
        CustomerDetails customer = new CustomerDetails(
                "ALKAIF",
                "637821120288",
                "DEWAS BRANCH , JIYAGAON , JIYAGAON,DEWAS - - DEWAS MADHYA PRADESH 455336",
                "XXXXX0625",
                "JXXXXXX5@gmail.com",
                null,
                "01-01-2020",
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
                null,
                "DEWAS",
                "455336"
        );
        AccountInfo accountInfo = new AccountInfo(
                87662.28,
                240968.01,
                "INR",
                "Active",
                "Savings"
        );
        StatementSettings settings = new StatementSettings(
                "IPPB",
                "6 Months",
                "custom",
                "2026-05-27",
                "2026-11-23",
                "Auto",
                2,
                "Normal",
                "Personal",
                "auto",
                "",
                null,
                "",
                "",
                false
        );

        List<Transaction> transactions = new ArrayList<>();
        transactions.add(new Transaction("tx_1", "27/05/2026", "27/05/2026", "TO ATM WD-ATM CARD-9751 HDFC ATM DEWAS", "S67959698", 1500.0, null, 86162.28));
        transactions.add(new Transaction("tx_2", "23/11/2026", "23/11/2026", "UPI~263736795887~DR~APOLLO~UTIB~apollopharma@icici~", "S69998535", 1764.25, null, 84398.03));

        StatementRecord record = new StatementRecord(
                "rec_test_slash",
                "2026-11-26T10:45:00",
                customer,
                branch,
                accountInfo,
                settings,
                transactions,
                84398.03,
                0.0,
                3264.25,
                2,
                0
        );

        StatementTemplate template = PdfTemplateFactory.forBankStyle("IPPB");
        byte[] pdfBytes = template.render(record);
        assertNotNull(pdfBytes);

        // Verify with iText / PdfReader that extracted text contains official IPPB date format
        com.itextpdf.kernel.pdf.PdfReader reader = new com.itextpdf.kernel.pdf.PdfReader(new java.io.ByteArrayInputStream(pdfBytes));
        com.itextpdf.kernel.pdf.PdfDocument doc = new com.itextpdf.kernel.pdf.PdfDocument(reader);
        String text = com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor.getTextFromPage(doc.getPage(1));
        doc.close();

        assertTrue(text.contains("27-May-2026 to 23-Nov-2026"), "Header period must use official dd-MMM-yyyy format! Got: " + text);
        assertTrue(text.contains("27-05-2026"), "Transaction date must use dd-MM-yyyy format! Got: " + text);
        assertTrue(text.contains("Savings Account"), "Account type must be Savings Account! Got: " + text);
    }
}
