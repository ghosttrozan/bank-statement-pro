package com.statementpro.pdf;

/**
 * Single source of truth for Bank of Baroda (bob World) statement layout dimensions.
 * Derived directly from authentic Bank of Baroda reference statement (2-bob.pdf).
 *
 * Page: A4 = 595pt x 842pt
 * Left / Right margins: 19.5pt -> Usable width = 555pt
 */
public final class BobLayout {

    private BobLayout() {}

    // ── Page Geometry ────────────────────────────────────────────────────────
    public static final float MARGIN_LEFT   = 19.5f;
    public static final float MARGIN_RIGHT  = 19.5f;
    public static final float MARGIN_TOP    = 19.5f;
    public static final float MARGIN_BOTTOM = 20.0f;

    public static final float PAGE_WIDTH    = 595.0f;
    public static final float PAGE_HEIGHT   = 842.0f;
    public static final float USABLE_WIDTH  = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 556.0pt (matches 574.5 - 19.5 = 555.0pt)

    // ── Header Banner Dimensions ─────────────────────────────────────────────
    public static final float HEADER_HEIGHT = 148.0f; // y: 19.5 to 167.5

    // ── Dossier (Account Details) Box ────────────────────────────────────────
    public static final float DOSSIER_Y_START = 176.0f;
    public static final float DOSSIER_HEIGHT  = 228.0f; // down to y: 404.0

    // ── Ledger Table Columns (8 columns) ────────────────────────────────────
    /**
     * Vertical boundaries from reference PDF:
     * x0: 20.75
     * Col 0: Serial No        27.0pt  (x: 20.75 -> 47.75)
     * Col 1: Transaction Date 53.5pt  (x: 47.75 -> 101.25)
     * Col 2: Value Date       48.0pt  (x: 101.25 -> 149.25)
     * Col 3: Description     169.0pt  (x: 149.25 -> 318.25)
     * Col 4: Cheque Number    45.0pt  (x: 318.25 -> 363.25)
     * Col 5: Debit            66.0pt  (x: 363.25 -> 429.25)
     * Col 6: Credit           66.0pt  (x: 429.25 -> 495.25)
     * Col 7: Balance          79.0pt  (x: 495.25 -> 574.25)
     *                        ───────
     *                Total   553.5pt  (covers 20.75 to 574.25)
     */
    public static final float[] LEDGER_COLS = {
            27.0f,  // Serial No
            53.5f,  // Transaction Date
            48.0f,  // Value Date
            169.0f, // Description
            45.0f,  // Cheque Number
            66.0f,  // Debit
            66.0f,  // Credit
            79.0f   // Balance
    };

    public static final int COL_SERIAL    = 0;
    public static final int COL_TXN_DATE  = 1;
    public static final int COL_VAL_DATE  = 2;
    public static final int COL_DESC      = 3;
    public static final int COL_CHQ_NO    = 4;
    public static final int COL_DEBIT     = 5;
    public static final int COL_CREDIT    = 6;
    public static final int COL_BALANCE   = 7;

    // ── Colors ───────────────────────────────────────────────────────────────
    // Primary BOB orange: #F25C05 / (242, 92, 5)
    // Table header gray: (204, 204, 204) -> rgb 0.8
    // Table border gray: (153, 153, 153) -> rgb 0.6
    // Alternate row zebra tint: (231, 231, 231) -> rgb 0.906
    // Account details box header tint: (255, 222, 214)
    // Account details box border: (255, 153, 153)
    // Note pill background: (204, 204, 204)

    // ── Row Targets ──────────────────────────────────────────────────────────
    public static final int FIRST_PAGE_TARGET_ROWS = 12;
    public static final int CONT_PAGE_TARGET_ROWS  = 22;

    // Row heights: ~22pt for single/two-line rows
    public static final float ROW_BASE_HEIGHT = 22.0f;
}
