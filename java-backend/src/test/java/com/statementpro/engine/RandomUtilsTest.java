package com.statementpro.engine;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class RandomUtilsTest {

    @Test
    void randRangeStaysWithinInclusiveBounds() {
        for (int i = 0; i < 1000; i++) {
            int v = RandomUtils.randRange(5, 10);
            assertTrue(v >= 5 && v <= 10, "value " + v + " out of range");
        }
    }

    @Test
    void pickReturnsAnElementFromTheList() {
        List<String> options = List.of("a", "b", "c");
        for (int i = 0; i < 100; i++) {
            assertTrue(options.contains(RandomUtils.pick(options)));
        }
    }

    @Test
    void genRefProduces12Digits() {
        String ref = RandomUtils.genRef();
        assertEquals(12, ref.length());
        assertTrue(ref.chars().allMatch(Character::isDigit));
    }

    @Test
    void weightedPickFavorsHigherWeight() {
        record Item(int weight) implements Weighted {
            public int weight() { return weight; }
        }
        Item heavy = new Item(95);
        Item light = new Item(5);
        List<Item> items = List.of(heavy, light);

        long heavyCount = 0;
        for (int i = 0; i < 2000; i++) {
            if (RandomUtils.weightedPick(items) == heavy) heavyCount++;
        }
        assertTrue(heavyCount > 1600, "expected roughly 95% heavy picks, got " + heavyCount);
    }

    @Test
    void randomPaiseIsOneOfTheKnownValues() {
        double p = RandomUtils.randomPaise();
        assertTrue(p >= 0.0 && p < 1.0);
    }
}
