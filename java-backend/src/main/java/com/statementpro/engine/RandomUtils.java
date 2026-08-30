package com.statementpro.engine;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public final class RandomUtils {

    private static final double[] PAISE_VALUES = {
            0.15, 0.28, 0.35, 0.42, 0.50, 0.64, 0.78, 0.85, 0.92, 0.25, 0.75, 0.40, 0.80, 0.18, 0.67
    };

    private RandomUtils() {}

    public static int randRange(int min, int max) {
        return (int) Math.floor(ThreadLocalRandom.current().nextDouble() * (max - min + 1)) + min;
    }

    public static <T> T pick(List<T> options) {
        return options.get((int) Math.floor(ThreadLocalRandom.current().nextDouble() * options.size()));
    }

    public static String genRef() {
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(ThreadLocalRandom.current().nextInt(10));
        }
        return sb.toString();
    }

    public static <T extends Weighted> T weightedPick(List<T> items) {
        int total = items.stream().mapToInt(Weighted::weight).sum();
        double r = ThreadLocalRandom.current().nextDouble() * total;
        for (T item : items) {
            r -= item.weight();
            if (r <= 0) return item;
        }
        return items.get(items.size() - 1);
    }

    public static double randomPaise() {
        return pick(java.util.Arrays.stream(PAISE_VALUES).boxed().toList());
    }
}
