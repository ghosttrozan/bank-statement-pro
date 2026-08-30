package com.statementpro.pdf;

import com.statementpro.model.Transaction;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TemplateUtilsTest {

    private Transaction tx(int i) {
        return new Transaction("tx" + i, "01/01/2026", "01/01/2026", "detail" + i, "ref" + i, null, 100.0, 100.0);
    }

    @Test
    void chunksFirstPageThenRemainingPagesBySize() {
        List<Transaction> txs = new ArrayList<>();
        for (int i = 0; i < 30; i++) txs.add(tx(i));

        List<List<Transaction>> pages = TemplateUtils.chunkTransactions(txs, 8, 22);

        assertEquals(2, pages.size());
        assertEquals(8, pages.get(0).size());
        assertEquals(22, pages.get(1).size());
    }

    @Test
    void chunksMultiPagesWhenExceedingNextPageSize() {
        List<Transaction> txs = new ArrayList<>();
        for (int i = 0; i < 30; i++) txs.add(tx(i));

        List<List<Transaction>> pages = TemplateUtils.chunkTransactions(txs, 8, 20);

        assertEquals(3, pages.size());
        assertEquals(8, pages.get(0).size());
        assertEquals(20, pages.get(1).size());
        assertEquals(2, pages.get(2).size());
    }

    @Test
    void emptyTransactionListProducesOneEmptyPage() {
        List<List<Transaction>> pages = TemplateUtils.chunkTransactions(List.of(), 8, 20);
        assertEquals(1, pages.size());
        assertEquals(0, pages.get(0).size());
    }

    @Test
    void formatCurrencyUsesIndianDigitGrouping() {
        assertEquals("1,50,000.00", TemplateUtils.formatCurrency(150000.0));
        assertEquals("1,00,00,000.50", TemplateUtils.formatCurrency(10000000.50));
        assertEquals("500.00", TemplateUtils.formatCurrency(500.0));
        assertEquals("", TemplateUtils.formatCurrency(null));
    }

    @Test
    void addressWithFewerThanFiveLinesJoinsAsIs() {
        String result = TemplateUtils.formatAddress4Lines("Flat 4B, MG Road, Bangalore");
        assertEquals("Flat 4B\nMG Road\nBangalore", result);
    }
}
