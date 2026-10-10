package com.statementpro.pdf;

/**
 * Geometric, typography and color constants for Punjab National Bank statement template.
 * Pixel-accurate reverse-engineered from verified sample 9-pnb.pdf.
 */
public final class PnbLayout {

    private PnbLayout() {}

    public static final float PAGE_WIDTH = 595.5f;
    public static final float PAGE_HEIGHT = 842.25f;

    public static final float MARGIN_LEFT = 23.25f;
    public static final float MARGIN_RIGHT = 23.25f;

    public static final float TABLE_WIDTH = 549.0f; // 595.5 - 2 * 23.25

    // 6 Columns: Transaction Date, Cheque Number, Withdrawal, Deposit, Balance, Narration
    public static final float[] COL_WIDTHS = {
        66.0f,   // Transaction Date
        54.75f,  // Cheque Number
        76.5f,   // Withdrawal
        77.25f,  // Deposit
        87.75f,  // Balance
        186.75f  // Narration
    };

    public static final float HEADER_HEIGHT = 27.75f;
    public static final float ROW_HEIGHT = 24.0f;

    public static final int PAGE_1_ROWS = 15;
    public static final int PAGE_N_ROWS = 30;
}
