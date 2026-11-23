package com.statementpro.pdf;

import com.itextpdf.kernel.colors.DeviceRgb;

/**
 * Geometric, typography and color constants for India Post Payments Bank (IPPB) statement template.
 * Pixel-accurate reverse-engineered from official reference statement
 * (AccountStatement_Report_6007230625_08052026_10_42 (1).pdf).
 */
public final class IppbLayout {

    private IppbLayout() {}

    // Page Geometry: US Letter
    public static final float PAGE_WIDTH  = 612.0f;
    public static final float PAGE_HEIGHT = 792.0f;

    // Margins
    public static final float MARGIN_LEFT  = 18.0f;
    public static final float MARGIN_RIGHT = 18.0f;
    public static final float TABLE_WIDTH  = 576.0f; // 594.0 - 18.0

    // Palette
    public static final DeviceRgb COLOR_MAROON = new DeviceRgb(144, 12, 63); // #900C3F
    public static final DeviceRgb COLOR_BLACK  = new DeviceRgb(0, 0, 0);
    public static final DeviceRgb COLOR_WHITE  = new DeviceRgb(255, 255, 255);

    // Table Column Boundaries (X coords): 7 segments (Date, TranID, Particulars, Withdrawal, Deposit, Balance, Cr/Dr)
    public static final float[] COL_X = {
        18.38f,
        75.07f,
        145.93f,
        347.76f,
        418.63f,
        489.49f,
        574.53f,
        593.63f
    };

    // Account Summary Table Columns (5 equal columns: 576 / 5 = 115.2)
    public static final float[] SUMM_COL_X = {
        18.0f,
        133.2f,
        248.4f,
        363.6f,
        478.8f,
        594.0f
    };

    // Header dimensions (Page 1)
    public static final float LOGO_X      = 19.5f;
    public static final float LOGO_Y      = 55.5f;   // from top
    public static final float LOGO_WIDTH  = 564.75f;
    public static final float LOGO_HEIGHT = 132.24f;

    // Table Y ranges
    public static final float P1_HEADER_TOP    = 368.75f;
    public static final float P1_HEADER_BOTTOM = 382.18f;
    public static final float P1_HEADER_HEIGHT = 13.43f;
    public static final float P1_OPENING_BAL_HEIGHT = 14.72f;
    public static final float P1_ROWS_START_Y  = 396.90f;
    public static final float P1_MAX_TABLE_Y   = 724.5f;

    public static final float CONT_HEADER_TOP    = 39.00f;
    public static final float CONT_HEADER_BOTTOM = 52.43f;
    public static final float CONT_ROWS_START_Y  = 54.00f;
    public static final float CONT_MAX_TABLE_Y   = 737.0f;
}
