package com.statementpro.engine;

import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;

import java.util.List;

public final class GeoUtils {

    private GeoUtils() {}

    public static GeoInfo detectPrimaryCity(CustomerDetails customer, BranchDetails branch) {
        String text = ((customer != null ? customer.address() : "") + " "
                + (branch != null ? branch.branchName() : "") + " "
                + (branch != null ? branch.branchAddress() : "")).toUpperCase();

        if (text.contains("BANGALORE") || text.contains("BENGALURU") || text.contains("WHITEFIELD") || text.contains("5600")) {
            return new GeoInfo("BANGALORE", "KARNATAKA",
                    List.of("SBI ATM WHITEFIELD BLR", "SBI ATM INDIRANAGAR BLR", "HDFC ATM KORAMANGALA BLR", "SBI ATM MARATHAHALLI BLR", "ICICI ATM HSR LAYOUT BLR"),
                    List.of("SWIGGY BANGALORE", "SHELL PETROL PUMP BLR", "DMART WHITEFIELD", "APOLLO PHARMA KORAMANGALA", "BIGBASKET INDIRANAGAR"));
        }
        if (text.contains("BHOPAL") || text.contains("GOVINDPURA") || text.contains("4620")) {
            return new GeoInfo("BHOPAL", "MADHYA PRADESH",
                    List.of("SBI ATM GOVINDPURA BPL", "SBI ATM NEW MARKET BPL", "HDFC ATM ARERA COLONY BPL", "SBI ATM MP NAGAR BPL"),
                    List.of("SWIGGY BHOPAL", "HPCL PETROL BPL", "DMART MP NAGAR", "APOLLO PHARMA ARERA COLONY", "BIGBASKET BHOPAL"));
        }
        if (text.contains("DELHI") || text.contains("NOIDA") || text.contains("GURUGRAM") || text.contains("1100")) {
            return new GeoInfo("DELHI NCR", "DELHI",
                    List.of("SBI ATM CONNAUGHT PLACE DEL", "SBI ATM DWARKA DEL", "HDFC ATM NOIDA SEC 18", "SBI ATM GURUGRAM"),
                    List.of("SWIGGY DELHI", "SHELL PETROL NOIDA", "DMART DWARKA", "APOLLO PHARMA CYBER CITY"));
        }
        if (text.contains("MUMBAI") || text.contains("ANDHERI") || text.contains("BANDRA") || text.contains("4000")) {
            return new GeoInfo("MUMBAI", "MAHARASHTRA",
                    List.of("SBI ATM ANDHERI W MUMBAI", "SBI ATM BKC MUMBAI", "HDFC ATM POWAI MUMBAI", "SBI ATM THANE"),
                    List.of("SWIGGY MUMBAI", "SHELL PETROL BANDRA", "DMART ANDHERI", "APOLLO PHARMA BKC"));
        }
        if (text.contains("PUNE") || text.contains("HINJEWADI") || text.contains("4110")) {
            return new GeoInfo("PUNE", "MAHARASHTRA",
                    List.of("SBI ATM HINJEWADI PUNE", "SBI ATM VIMAN NAGAR PUNE", "HDFC ATM BANER PUNE"),
                    List.of("SWIGGY PUNE", "SHELL PETROL HINJEWADI", "DMART KOTHRUD"));
        }
        if (text.contains("HYDERABAD") || text.contains("GACHIBOWLI") || text.contains("5000")) {
            return new GeoInfo("HYDERABAD", "TELANGANA",
                    List.of("SBI ATM HITEC CITY HYD", "SBI ATM GACHIBOWLI HYD", "HDFC ATM JUBILEE HILLS"),
                    List.of("SWIGGY HYDERABAD", "SHELL PETROL GACHIBOWLI", "DMART KUKATPALLY"));
        }

        String extractedCity = ((branch != null && branch.branchName() != null) ? branch.branchName() : "CITY")
                .split("[\\s,]+")[0].toUpperCase();
        return new GeoInfo(extractedCity, "INDIA",
                List.of("SBI ATM " + extractedCity, "HDFC ATM " + extractedCity, "ICICI ATM " + extractedCity),
                List.of("SWIGGY " + extractedCity, "PETROL PUMP " + extractedCity, "DMART " + extractedCity));
    }
}
