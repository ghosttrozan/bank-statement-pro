package com.statementpro.engine;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public final class AmountGenerator {

    private AmountGenerator() {}

    public static DetailAndAmount getMerchantDebit(String bankStyle) {
        MerchantInfo merch = MerchantData.pickMerchant();
        double paise = RandomUtils.randomPaise();
        double rawAmount = switch (merch.category()) {
            case "food" -> RandomUtils.randRange(110, 680) + paise;
            case "grocery" -> RandomUtils.randRange(220, 2450) + paise;
            case "shopping" -> RandomUtils.randRange(350, 4850) + RandomUtils.pick(List.of(0.00, 0.50, 0.99));
            case "travel" -> RandomUtils.randRange(95, 2900) + RandomUtils.pick(List.of(0.00, 0.50));
            case "fuel" -> Math.round(RandomUtils.randRange(300, 2400) / 50.0) * 50.0;
            case "health" -> RandomUtils.randRange(85, 1850) + paise;
            case "entertainment", "digital" -> RandomUtils.randRange(49, 1250) + RandomUtils.pick(List.of(0.00, 0.50));
            default -> RandomUtils.randRange(150, 1800) + paise;
        };

        String detail = NarrativeBuilder.buildUpiNarrativeForMerchant(merch, false, bankStyle);
        return new DetailAndAmount(detail, round2(rawAmount));
    }

    public static double getP2pDebitAmount(boolean isMicro) {
        double paise = RandomUtils.randomPaise();
        return isMicro
                ? round2(RandomUtils.randRange(12, 495) + paise)
                : round2(RandomUtils.randRange(510, 4800) + paise);
    }

    public static double getContinuousCreditAmount() {
        double r = ThreadLocalRandom.current().nextDouble();
        double paise = RandomUtils.randomPaise();
        if (r < 0.55) {
            return round2(RandomUtils.randRange(120, 1500) + paise);
        } else if (r < 0.90) {
            return round2(RandomUtils.randRange(1600, 4800) + paise);
        } else {
            return round2(RandomUtils.randRange(5000, 8500) + paise);
        }
    }

    public static double getRefundAmount() {
        return round2(RandomUtils.randRange(85, 950) + RandomUtils.randomPaise());
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
