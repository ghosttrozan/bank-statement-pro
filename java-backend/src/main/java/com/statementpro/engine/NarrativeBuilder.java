package com.statementpro.engine;

public final class NarrativeBuilder {

    private NarrativeBuilder() {}

    public static String buildUpiNarrativeForMerchant(MerchantInfo merch, boolean isCredit, String bankStyle) {
        String ref = RandomUtils.genRef();
        String bank = MerchantData.pickUpiBank();
        String accountSuffix = randomDigits(RandomUtils.randRange(6, 8));
        String hh = pad2(RandomUtils.randRange(8, 22));
        String mm = pad2(RandomUtils.randRange(0, 59));
        String ss = pad2(RandomUtils.randRange(0, 59));
        String direction = isCredit ? "CR" : "DR";

        if ("SBI2".equalsIgnoreCase(bankStyle) || "SBI".equalsIgnoreCase(bankStyle)) {
            return "UPI/" + direction + "/" + ref + "/" + merch.name().toUpperCase() + "/" + bank + "/" + merch.handle() + "/Payme-";
        } else if ("BOI".equalsIgnoreCase(bankStyle)) {
            return "UPI/" + ref + "/" + hh + ":" + mm + ":" + ss + "/UPI/" + merch.handle() + "/" + direction;
        } else if ("Kotak".equalsIgnoreCase(bankStyle)) {
            return "UPI/" + direction + "/" + ref + "/" + merch.name() + "/" + merch.handle();
        }
        String tag = isCredit ? "UPIAB" : "UPIAR";
        return tag + "/" + ref + "/" + direction + "/" + merch.name() + "/" + bank + "/" + accountSuffix + "/Paymen";
    }

    public static String buildUpiNarrative(boolean isCredit, String bankStyle, String customName) {
        String ref = RandomUtils.genRef();
        String bank = MerchantData.pickUpiBank();
        String accountSuffix = randomDigits(RandomUtils.randRange(6, 8));
        String hh = pad2(RandomUtils.randRange(8, 22));
        String mm = pad2(RandomUtils.randRange(0, 59));
        String ss = pad2(RandomUtils.randRange(0, 59));
        String direction = isCredit ? "CR" : "DR";

        String name = customName != null ? customName
                : RandomUtils.pick(isCredit ? MerchantData.CREDIT_ONLY_NAMES : MerchantData.DEBIT_ONLY_NAMES);
        String firstName = name.split(" ")[0].toUpperCase();
        String vpaHandle = firstName.toLowerCase() + RandomUtils.randRange(10, 99);

        if ("SBI2".equalsIgnoreCase(bankStyle) || "SBI".equalsIgnoreCase(bankStyle)) {
            return "UPI/" + direction + "/" + ref + "/" + firstName + "/" + bank + "/" + vpaHandle + "/Payme-";
        } else if ("BOI".equalsIgnoreCase(bankStyle)) {
            String vpa = firstName.toLowerCase() + RandomUtils.randRange(10, 99) + RandomUtils.pick(MerchantData.VPA_SUFFIXES);
            return "UPI/" + ref + "/" + hh + ":" + mm + ":" + ss + "/UPI/" + vpa + "/" + direction;
        } else if ("Kotak".equalsIgnoreCase(bankStyle)) {
            String vpa = firstName.toLowerCase() + RandomUtils.randRange(10, 99) + RandomUtils.pick(MerchantData.VPA_SUFFIXES);
            return "UPI/" + direction + "/" + ref + "/" + firstName + "/" + vpa;
        }

        String vpa = firstName.toLowerCase() + RandomUtils.randRange(10, 99) + RandomUtils.pick(MerchantData.VPA_SUFFIXES);
        int styleSelector = RandomUtils.randRange(1, 4);
        return switch (styleSelector) {
            case 1 -> {
                String tag = isCredit ? "UPIAB" : "UPIAR";
                yield tag + "/" + ref + "/" + direction + "/" + firstName + "/" + bank + "/" + accountSuffix + "/Paymen";
            }
            case 2 -> "UPI/" + ref + "/" + direction + "/" + name.toUpperCase() + "/" + vpa;
            case 3 -> "UPI-TRANSFER-" + ref + "-" + vpa.toUpperCase();
            default -> "UPI/" + direction + "/" + ref + "/" + name.toUpperCase() + "/" + bank;
        };
    }

    private static String pad2(int value) {
        return String.format("%02d", value);
    }

    private static String randomDigits(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(RandomUtils.randRange(0, 9));
        }
        return sb.toString();
    }
}
