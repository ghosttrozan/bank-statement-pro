package com.statementpro.pdf;

/**
 * Estimates the rendered height of a single ledger table row WITHOUT actually
 * rendering it via iText.
 *
 * WHY THIS EXISTS:
 * iText's automatic table splitting crosses page boundaries invisibly, making
 * it impossible to repeat the table header or control pagination on
 * the correct page. This estimator lets the caller pre-calculate how many
 * transaction rows fit on each page so pages can be rendered as separate iText
 * Table objects with explicit breaks and repeated headers.
 *
 * ACCURACY CONTRACT:
 * The estimator intentionally over-estimates row heights (conservative) so page
 * breaks happen slightly earlier. This avoids content clipping without requiring
 * a live layout pass. The empirical constants below are tuned for Helvetica 9pt
 * in 1.05f leading (the widest cell configuration in Sbi2Template).
 */
public final class RowHeightEstimator {

    private RowHeightEstimator() {}

    /**
     * Average character width for Helvetica 9 pt (empirical, conservative).
     * True average is ~4.8 pt; using 4.5 pt causes slight over-estimation,
     * meaning the estimator predicts more line wraps than actually occur →
     * earlier-than-necessary page breaks (safe side).
     */
    private static final float AVG_CHAR_WIDTH_9PT = 4.3f;

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Result of a row height estimation.
     *
     * @param estimatedHeight  estimated height in points
     * @param oversized        true if the row alone exceeds {@link SbiLayout#MAX_SINGLE_ROW_HEIGHT}
     */
    public record Measurement(float estimatedHeight, boolean oversized) {}

    /**
     * Estimates the rendered height of one transaction row.
     *
     * @param txnDate     formatted transaction-date string (may contain '\n')
     * @param valueDate   formatted value-date string (may contain '\n')
     * @param description formatted description string (may contain '\n')
     * @param refLine     formatted reference-number string (may contain '\n')
     */
    public static Measurement measure(
            String txnDate,
            String valueDate,
            String description,
            String refLine) {

        float txnDateUsable = usable(SbiLayout.LEDGER_COLS[SbiLayout.COL_TXN_DATE]);
        float valDateUsable = usable(SbiLayout.LEDGER_COLS[SbiLayout.COL_VALUE_DATE]);
        float descUsable    = usable(SbiLayout.LEDGER_COLS[SbiLayout.COL_DESCRIPTION]);
        float refUsable     = usable(SbiLayout.LEDGER_COLS[SbiLayout.COL_REF_NO]);

        int txnLines  = estimateLines(txnDate, txnDateUsable);
        int valLines  = estimateLines(valueDate, valDateUsable);
        int descLines = estimateLines(description, descUsable);
        int refLines  = estimateLines(refLine, refUsable);

        int maxLines = Math.max(Math.max(txnLines, valLines),
                                Math.max(descLines, refLines));
        maxLines = Math.max(1, maxLines);

        // Calibrated with exact iText Helvetica 9pt line metrics with multiplied leading 0.82f:
        // 1 line: 10.5 pt; 2 lines: 18.7 pt; 3 lines: 26.9 pt; 4 lines: 35.1 pt; 5 lines: 43.3 pt:
        float estimatedH = 10.5f + (maxLines - 1) * 8.2f;

        boolean oversized = estimatedH > SbiLayout.MAX_SINGLE_ROW_HEIGHT;
        return new Measurement(estimatedH, oversized);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Estimates the number of visual lines that {@code text} occupies when
     * rendered in a column of {@code usableWidth} points.
     */
    static int estimateLines(String text, float usableWidth) {
        if (text == null || text.isEmpty()) return 1;

        int charsPerLine = Math.max(1, (int) (usableWidth / AVG_CHAR_WIDTH_9PT));
        int total = 0;

        for (String segment : text.split("\n", -1)) {
            // Strip zero-width spaces when counting characters
            String clean = segment.replace("\u200B", "");
            if (clean.isEmpty()) {
                total++;
            } else {
                total += (clean.length() + charsPerLine - 1) / charsPerLine;
            }
        }
        return Math.max(1, total);
    }

    /** Inner usable width of a column = column width − left padding − right padding. */
    private static float usable(float colWidth) {
        float inner = colWidth - SbiLayout.CELL_PADDING_LEFT - SbiLayout.CELL_PADDING_RIGHT;
        return Math.max(inner, colWidth * 0.6f); // never narrower than 60% of col
    }
}
