package com.statementpro.engine;

import java.util.List;

public final class MerchantData {

    private MerchantData() {}

    public static final List<String> DEBIT_ONLY_NAMES = List.of(
            "Aakash Pandey", "Preeti Sundaram", "Suhas Mahajan", "Shweta Jha", "Naveen Shetty",
            "Anjali Saxena", "Rahul Mehta", "Sanjay Dutt", "Priya Dhar", "Deepak Chauhan",
            "Meera Krishnan", "Vijay Merchant", "Vikram Rathore", "Rohit Aggarwal", "Arjun Nambiar",
            "Kavita Sharma", "Aditya Verma", "Pradeep Kumar", "Siddharth N", "Venkatesh R",
            "Tanvi Shah", "Harish Patel", "Deepa Menon", "Anand K", "Sandeep Kulkarni");

    public static final List<String> CREDIT_ONLY_NAMES = List.of(
            "Nikhil Gupta", "Rohan Deshmukh", "Meenakshi Rao", "Swati Joshi", "Gaurav Mishra",
            "Pooja Agarwal", "Archana Nair", "Varun Kapoor", "Shruti Saxena", "Manish Reddy",
            "Ritu Bhatia", "Alok Choudhury", "Kriti Sen", "Abhishek Tiwari", "Divya Iyer",
            "Kiran More", "Vishal Singhal", "Neha Bansal", "Rajeev Pillai", "Bhavna Hegde",
            "Sunil Chhetri", "Tarun Varma", "Devika Pillai", "Manoj Bajpayee", "Sneha Kapoor");

    public static final List<MerchantInfo> MERCHANTS = List.of(
            new MerchantInfo("SWIGGY", "swiggy@icici", "food"),
            new MerchantInfo("ZOMATO", "zomato@hdfcbank", "food"),
            new MerchantInfo("BLINKIT", "blinkit@axisbank", "grocery"),
            new MerchantInfo("ZEPTO", "zepto@icici", "grocery"),
            new MerchantInfo("AMAZON PAY", "amazon@apl", "shopping"),
            new MerchantInfo("FLIPKART", "flipkart@ybl", "shopping"),
            new MerchantInfo("MYNTRA", "myntra@icici", "shopping"),
            new MerchantInfo("BIGBASKET", "bigbasket@bbnow", "grocery"),
            new MerchantInfo("UBER INDIA", "uber@icici", "travel"),
            new MerchantInfo("OLA CABS", "olacabs@ybl", "travel"),
            new MerchantInfo("IRCTC", "irctc@iserve", "travel"),
            new MerchantInfo("MAKEMYTRIP", "mmt@icici", "travel"),
            new MerchantInfo("BOOKMYSHOW", "bms@ybl", "entertainment"),
            new MerchantInfo("APOLLO PHARMACY", "apollopharma@icici", "health"),
            new MerchantInfo("NETMEDS", "netmeds@axisbank", "health"),
            new MerchantInfo("SHELL PETROL PUMP", "shellfuel@sbi", "fuel"),
            new MerchantInfo("HPCL PETROL STATION", "hpcl@sbi", "fuel"),
            new MerchantInfo("BPCL FUEL POINT", "bpcl@icici", "fuel"),
            new MerchantInfo("DMART RETAIL", "dmart@hdfcbank", "shopping"),
            new MerchantInfo("DECATHLON SPORTS", "decathlon@ybl", "shopping"),
            new MerchantInfo("RELIANCE SMART", "reliancesmart@icici", "shopping"),
            new MerchantInfo("PAYTM MERCHANT", "paytm-merchant@paytm", "general"),
            new MerchantInfo("PHONEPE MERCHANT", "mrd@ybl", "general"),
            new MerchantInfo("GOOGLE PLAY STORE", "googleplay@okaxis", "digital"));

    record BankCode(String code, int weight) implements Weighted {
        public int weight() { return weight; }
    }

    public static final List<BankCode> REAL_UPI_BANK_CODES = List.of(
            new BankCode("SBIN", 20), new BankCode("HDFC", 18), new BankCode("ICIC", 16),
            new BankCode("UTIB", 14), new BankCode("YESB", 10), new BankCode("BKID", 10),
            new BankCode("AIRP", 7), new BankCode("PYTM", 5));

    public static final List<String> VPA_SUFFIXES = List.of(
            "@okaxis", "@okhdfcbank", "@okicici", "@ybl", "@ibl", "@paytm", "@apl", "@postbank");

    public static MerchantInfo pickMerchant() {
        return RandomUtils.pick(MERCHANTS);
    }

    public static String pickUpiBank() {
        return RandomUtils.weightedPick(REAL_UPI_BANK_CODES).code();
    }
}
