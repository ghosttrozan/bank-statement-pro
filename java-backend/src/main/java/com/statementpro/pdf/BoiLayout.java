package com.statementpro.pdf;

/**
 * Pixel-accurate geometry and layout constants for Bank of India (BOI mPassbook) statements.
 * Derived directly from official BOI reference statement (2004202320223100_882046.pdf).
 *
 * Page: A4 = 595.0pt x 842.0pt
 * Left / Right margins: 62.15pt -> Table width = 470.7pt (covers 62.15 to 532.85)
 */
public final class BoiLayout {

    private BoiLayout() {}

    // ── Page Geometry ────────────────────────────────────────────────────────
    public static final float PAGE_WIDTH    = 595.0f;
    public static final float PAGE_HEIGHT   = 842.0f;
    public static final float MARGIN_LEFT   = 62.15f;
    public static final float MARGIN_RIGHT  = 62.15f;
    public static final float MARGIN_TOP    = 36.0f;
    public static final float MARGIN_BOTTOM = 36.0f;
    public static final float TABLE_WIDTH   = 470.7f; // 532.85 - 62.15

    // ── Header Section (Page 1) ──────────────────────────────────────────────
    public static final float LOGO_X        = 270.0f;
    public static final float LOGO_Y        = 42.0f;  // from top (y from bottom: 842 - 92 = 750)
    public static final float LOGO_WIDTH    = 50.0f;
    public static final float LOGO_HEIGHT   = 50.0f;

    public static final float REPORT_DATE_Y = 101.0f; // baseline y from top

    public static final float BANNER_LINE1_Y = 120.0f; // baseline y from top
    public static final float BANNER_LINE2_Y = 135.0f; // baseline y from top

    // ── Customer Details Section (Page 1) ────────────────────────────────────
    public static final float CUST_HEADER_Y = 167.0f; // baseline y from top

    public static final float CUST_BOX_TOP    = 171.0f;
    public static final float CUST_BOX_BOTTOM = 223.0f;
    public static final float CUST_BOX_HEIGHT = 52.0f;
    public static final float CUST_BOX_LEFT   = 64.15f;
    public static final float CUST_BOX_MID    = 297.5f;
    public static final float CUST_BOX_RIGHT  = 530.85f;

    // ── Table Geometry ───────────────────────────────────────────────────────
    public static final float P1_TABLE_HEADER_TOP    = 243.0f;
    public static final float P1_TABLE_HEADER_BOTTOM = 267.0f;
    public static final float P1_TABLE_HEADER_HEIGHT = 24.0f;

    public static final float P1_ROWS_START_Y = 267.0f;
    public static final float P1_MAX_TABLE_Y  = 795.0f;

    public static final float CONT_ROWS_START_Y = 36.0f;
    public static final float CONT_MAX_TABLE_Y  = 801.0f;

    // ── Column Coordinates and Widths ────────────────────────────────────────
    public static final float[] COL_X = {
            62.15f,   // Col 0: Transaction Date
            120.99f,  // Col 1: Instrument Id
            188.23f,  // Col 2: Narration
            364.74f,  // Col 3: Debit
            415.17f,  // Col 4: Credit
            465.61f,  // Col 5: Balance
            532.85f   // Table right edge
    };

    public static final float[] COL_WIDTHS = {
            58.84f,   // 120.99 - 62.15
            67.24f,   // 188.23 - 120.99
            176.51f,  // 364.74 - 188.23
            50.43f,   // 415.17 - 364.74
            50.44f,   // 465.61 - 415.17
            67.24f    // 532.85 - 465.61
    };

    public static final int COL_TXN_DATE = 0;
    public static final int COL_INST_ID  = 1;
    public static final int COL_NARR     = 2;
    public static final int COL_DEBIT    = 3;
    public static final int COL_CREDIT   = 4;
    public static final int COL_BALANCE  = 5;
}

