package com.statementpro.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.statementpro.model.AccountInfo;
import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;
import com.statementpro.model.StatementSettings;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class StatementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private GenerateStatementRequest validRequest(String bankStyle) {
        CustomerDetails customer = new CustomerDetails(
                "Test User", "t@test.com", "MG Road, Bangalore", "1234567890", "CIF001",
                "2020-01-01", "None", "Bangalore", "560001");
        BranchDetails branch = new BranchDetails(
                "Bangalore Main", "MG Road", "0001", "b@bank.com", "0000000000",
                "SBIN0000001", "560002001", "CKYCR1", "Bangalore", "560001");
        AccountInfo account = new AccountInfo(90000.0, 2.5, "INR", "Active", "Savings");
        StatementSettings settings = new StatementSettings(
                bankStyle, "1 Month", "duration", null, null,
                "2 Pages", 0, "Normal", "Personal", "manual",
                "ACME CORP", 60000.0, "1", null, false);

        return new GenerateStatementRequest(customer, branch, account, settings);
    }

    @Test
    void validPayloadReturnsRecordAndPdfForSbi() throws Exception {
        String responseJson = mockMvc.perform(post("/api/statements/generate")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(validRequest("SBI"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> response = objectMapper.readValue(responseJson, Map.class);
        Map<?, ?> record = (Map<?, ?>) response.get("record");
        assertNotNull(record);
        assertFalse(((java.util.List<?>) record.get("transactions")).isEmpty());

        String pdfBase64 = (String) response.get("pdfBase64");
        byte[] pdfBytes = Base64.getDecoder().decode(pdfBase64);
        assertEquals("%PDF", new String(pdfBytes, 0, 4));
    }

    @Test
    void validPayloadReturnsRecordAndPdfForSbi2() throws Exception {
        String responseJson = mockMvc.perform(post("/api/statements/generate")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(validRequest("SBI2"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> response = objectMapper.readValue(responseJson, Map.class);
        Map<?, ?> record = (Map<?, ?>) response.get("record");
        assertNotNull(record);
        assertFalse(((java.util.List<?>) record.get("transactions")).isEmpty());

        String pdfBase64 = (String) response.get("pdfBase64");
        byte[] pdfBytes = Base64.getDecoder().decode(pdfBase64);
        assertEquals("%PDF", new String(pdfBytes, 0, 4));
    }

    @Test
    void missingCustomerDetailsReturns400() throws Exception {
        mockMvc.perform(post("/api/statements/generate")
                        .contentType("application/json")
                        .content("{\"branchDetails\":{},\"accountInfo\":{},\"settings\":{}}"))
                .andExpect(status().isBadRequest());
    }
}
