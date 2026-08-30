package com.statementpro.engine;

import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeoUtilsTest {

    private CustomerDetails customerWithAddress(String address) {
        return new CustomerDetails("Test User", "t@test.com", address, "123", "CIF1", "2020-01-01", "None", null, null);
    }

    @Test
    void detectsBangaloreFromAddress() {
        GeoInfo geo = GeoUtils.detectPrimaryCity(customerWithAddress("Whitefield, Bangalore"), null);
        assertEquals("BANGALORE", geo.city());
        assertEquals("KARNATAKA", geo.state());
        assertTrue(geo.atmLocations().size() > 0);
    }

    @Test
    void fallsBackToBranchNameWhenNoKnownCityMatches() {
        BranchDetails branch = new BranchDetails("Nagpur Main Branch", "Some Road", "001",
                "b@bank.com", "0000000000", "IFSC0001", "MICR001", "CKYCR1", null, null);
        GeoInfo geo = GeoUtils.detectPrimaryCity(customerWithAddress("Unknown Town"), branch);
        assertEquals("NAGPUR", geo.city());
        assertEquals("INDIA", geo.state());
    }
}
