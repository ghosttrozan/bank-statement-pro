package com.statementpro.pdf;

/**
 * Single source of truth for all SBI statement layout dimensions.
 *
 * WHY THIS EXISTS (table: "Column boundaries"):
 * Previously column widths were hard-coded in two separate places in Sbi2Template,
 * causing divergence between dossier and ledger boundaries. All borders, cell
 * positions, and wrapping widths are now derived from this one configuration.
 *
 * A4 printable area = 595pt wide. Margins = 36pt each side → usable = 523pt.
 */
public final class SbiLayout {

    private SbiLayout() {}

    // ── Page ────────────────────────────────────────────────────────────────
    /** Left/right/top/bottom margins in points (matches authentic SBI statement). */
    public static final float MARGIN = 36f;

    /** Total usable page width = A4 (595pt) − 2 × MARGIN. */
    public static final float USABLE_WIDTH = 595f - 2 * MARGIN; // 523pt

    // ── Dossier table ───────────────────────────────────────────────────────
    /**
     * Two-column dossier layout: [label column, value column].
     * Value column contains ": " prefix in the same text run to prevent detached ":" objects.
     * All widths must sum to USABLE_WIDTH (523pt).
     */
    public static final float[] DOSSIER_COLS = { 116f, 407f };

    // ── Ledger table ────────────────────────────────────────────────────────
    /**
     * Seven-column ledger layout — matching authentic SBI statement (Neha reference):
     * Col 0: Txn Date        53.0pt  (x: 36.0 -> 89.0)
     * Col 1: Value Date      53.0pt  (x: 89.0 -> 142.0)
     * Col 2: Description    132.0pt  (x: 142.0 -> 274.0)
     * Col 3: Ref No / Chq    79.0pt  (x: 274.0 -> 353.0)
     * Col 4: Debit           63.5pt  (x: 353.0 -> 416.5)
     * Col 5: Credit          63.5pt  (x: 416.5 -> 480.0)
     * Col 6: Balance         79.0pt  (x: 480.0 -> 559.0)
     *                       ───────
     *               Total   523.0pt  ✓
     */
    public static final float[] LEDGER_COLS = { 53.0f, 53.0f, 132.0f, 79.0f, 63.5f, 63.5f, 79.0f };

    // Convenience indices so callers never use magic numbers
    public static final int COL_TXN_DATE    = 0;
    public static final int COL_VALUE_DATE  = 1;
    public static final int COL_DESCRIPTION = 2;
    public static final int COL_REF_NO      = 3;
    public static final int COL_DEBIT       = 4;
    public static final int COL_CREDIT      = 5;
    public static final int COL_BALANCE     = 6;

    // ── Cell padding ────────────────────────────────────────────────────────
    public static final float CELL_PADDING         = 1.5f;
    public static final float CELL_PADDING_LEFT    = 2.0f;
    public static final float CELL_PADDING_RIGHT   = 3.0f;
    public static final float HEADER_PADDING_TOP   = 4.0f;
    public static final float HEADER_PADDING_BOT   = 2.0f;

    // ── Border line width ────────────────────────────────────────────────────
    /** Stroke width used by CustomBorderCellRenderer for all ledger lines. */
    public static final float BORDER_WIDTH = 0.5f;

    // ── Font sizes ───────────────────────────────────────────────────────────
    public static final float FONT_CELL    = 9.0f;
    public static final float FONT_DOSSIER = 9.0f;

    // ── Page dimensions (A4) ─────────────────────────────────────────────────
    /** A4 page height in points. */
    public static final float PAGE_HEIGHT   = 842f;

    /** Usable vertical space = A4 height − top margin − bottom margin. */
    public static final float USABLE_HEIGHT = PAGE_HEIGHT - 2 * MARGIN;   // 770 pt

    // ── Vertical space consumed by non-row elements ──────────────────────────
    /**
     * Measured height used on page 1 above data rows:
     *   logo (60 pt) + dossier table (~280 pt) + period title (~38 pt) + table-header row (25 pt) = ~403 pt
     * Results in Table starting at Y ≈ 414 pt (matching authentic SBI reference).
     */
    public static final float FIRST_PAGE_FIXED_HEIGHT   = 403f;

    /** Height of the repeated table-header row on continuation pages. */
    public static final float CONTINUATION_FIXED_HEIGHT = 28f;

    /**
     * Vertical space reserved at the bottom of the LAST page for disclaimers.
     * Applied only when accommodating the final rows on the closing page.
     */
    public static final float FOOTER_RESERVED_HEIGHT    = 65f;

    /** Extra safety buffer to guarantee iText never triggers unintended table overflow splits. */
    public static final float SAFETY_BUFFER             = 25f;

    // ── Per-page row height budgets ───────────────────────────────────────────

    /**
     * Maximum cumulative row height on the first page.
     * Table starts at Y ≈ 408pt, page bottom margin at Y = 806pt → usable = 398pt.
     * Header row is ~25pt, safety buffer 28pt → 345pt row budget.
     * Guarantees that Page 1 never overflows and causes accidental row spillover onto Page 2.
     */
    public static final float FIRST_PAGE_ROW_BUDGET = 345f;

    /**
     * Maximum cumulative row height on continuation pages.
     * Usable height = 770pt − repeated header ~25pt − safety 30pt = 715pt.
     */
    public static final float CONTINUATION_ROW_BUDGET = 715f;

    /**
     * Target row count for the first page (with full dossier, bank logo, and title).
     * Authentic SBI statements hold up to 11 rows on Page 1.
     */
    public static final int FIRST_PAGE_TARGET_ROWS = 11;

    /**
     * Target row count for continuation pages.
     */
    public static final int CONTINUATION_TARGET_ROWS = 24;

    /**
     * Hard upper limit for a single row's height.
     * Rows taller than this raise an {@link IllegalStateException} — fonts are never
     * silently shrunk to force content to fit (table: "Page overflow").
     */
    public static final float MAX_SINGLE_ROW_HEIGHT = 120f;
}
