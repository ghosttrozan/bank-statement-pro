package com.statementpro.pdf;

/**
 * Geometric dimensions and column bounds for Axis Bank Statement.
 * Derived from authentic Axis Bank reference statement (6-axis.pdf).
 *
 * Page: A4 = 595pt x 842pt
 * Margins: Left=36.0pt, Right=36.0pt -> Usable width = 523.0pt
 */
public final class AxisLayout {

    private AxisLayout() {}

    public static final float MARGIN_LEFT   = 36.0f;
    public static final float MARGIN_RIGHT  = 36.0f;
    public static final float MARGIN_TOP    = 36.0f;
    public static final float MARGIN_BOTTOM = 36.0f;

    public static final float PAGE_WIDTH    = 595.0f;
    public static final float PAGE_HEIGHT   = 842.0f;
    public static final float USABLE_WIDTH  = 523.0f;

    /**
     * Seven column widths:
     * Col 0: Tran Date    47.07pt  (x: 36.00 -> 83.07)
     * Col 1: Chq No       47.07pt  (x: 83.07 -> 130.14)
     * Col 2: Particulars 188.28pt  (x: 130.14 -> 318.42)
     * Col 3: Debit        62.76pt  (x: 318.42 -> 381.18)
     * Col 4: Credit       62.76pt  (x: 381.18 -> 443.94)
     * Col 5: Balance      88.91pt  (x: 443.94 -> 532.85)
     * Col 6: Init. Br     26.15pt  (x: 532.85 -> 559.00)
     *                    ────────
     *            Total   523.00pt
     */
    public static final float[] LEDGER_COLS = {
            47.07f,  // Tran Date
            47.07f,  // Chq No
            188.28f, // Particulars
            62.76f,  // Debit
            62.76f,  // Credit
            88.91f,  // Balance
            26.15f   // Init. Br
    };

    public static final int COL_TRAN_DATE   = 0;
    public static final int COL_CHQ_NO      = 1;
    public static final int COL_PARTICULARS = 2;
    public static final int COL_DEBIT       = 3;
    public static final int COL_CREDIT      = 4;
    public static final int COL_BALANCE     = 5;
    public static final int COL_INIT_BR     = 6;

    // Row targets
    public static final int FIRST_PAGE_TARGET_ROWS = 24; // Page 1 holds Opening Balance + up to 23 rows
    public static final int CONT_PAGE_TARGET_ROWS  = 34; // Continuation pages hold ~34 rows
}
