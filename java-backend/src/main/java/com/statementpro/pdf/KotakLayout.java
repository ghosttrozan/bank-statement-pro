package com.statementpro.pdf;

import com.itextpdf.kernel.colors.DeviceRgb;

/**
 * Geometric, typography and color constants for Kotak Mahindra Bank statement template.
 * Pixel-accurate reverse-engineered from verified official statement AccountStatement_01-Oct-2026_21-Oct-2026.pdf.
 */
public final class KotakLayout {

    private KotakLayout() {}

    public static final float PAGE_WIDTH = 595.0f;
    public static final float PAGE_HEIGHT = 842.0f;

    // Official Kotak Palette
    public static final DeviceRgb COLOR_BLACK = new DeviceRgb(0, 0, 0);
    public static final DeviceRgb COLOR_WHITE = new DeviceRgb(255, 255, 255);
    public static final DeviceRgb COLOR_KOTAK_RED = new DeviceRgb(237, 28, 36);      // #ED1C24
    public static final DeviceRgb COLOR_GREY_HEADER = new DeviceRgb(159, 161, 164);  // #9FA1A4
    public static final DeviceRgb COLOR_TEXT_GREY = new DeviceRgb(159, 161, 164);    // #9FA1A4
    public static final DeviceRgb COLOR_TEXT_DARK = new DeviceRgb(0, 0, 0);
    public static final DeviceRgb COLOR_LINE_GREY = new DeviceRgb(159, 161, 164);    // #9FA1A4
    public static final DeviceRgb COLOR_REMEMBER_BG = new DeviceRgb(234, 236, 237);  // #EAECED
    public static final DeviceRgb COLOR_DUMMY_RED = new DeviceRgb(220, 38, 38);      // #DC2626

    // Table margins & bounds
    public static final float TABLE_X0 = 36.0f;
    public static final float TABLE_X1 = 559.0f;
    public static final float TABLE_WIDTH = 523.0f; // 559.0 - 36.0

    // Column boundaries (X coords): 7 columns
    // Col 0 (#): 36.00 to 67.18 (w=31.18)
    // Col 1 (Date): 67.18 to 116.18 (w=49.00)
    // Col 2 (Description): 116.19 to 271.66 (w=155.47)
    // Col 3 (Chq/Ref. No.): 271.66 to 351.85 (w=80.19)
    // Col 4 (Withdrawal (Dr.)): 351.85 to 420.90 (w=69.05)
    // Col 5 (Deposit (Cr.)): 420.90 to 489.95 (w=69.05)
    // Col 6 (Balance): 489.95 to 559.00 (w=69.05)
    public static final float[] COL_X = {
        36.0f,
        67.18f,
        116.18f,
        271.66f,
        351.85f,
        420.90f,
        489.95f,
        559.00f
    };

    public static final float BANNER_HEIGHT = 25.0f;
    public static final float HEADER_ROW_HEIGHT = 25.0f;

    // Transaction rows limits
    public static final float PAGE_1_TABLE_START_Y = 329.5f;
    public static final float PAGE_1_ROWS_START_Y = 379.5f;
    public static final float PAGE_1_MAX_Y = 792.0f;

    public static final float PAGE_N_TABLE_START_Y = 80.0f;
    public static final float PAGE_N_ROWS_START_Y = 130.0f;
    public static final float PAGE_N_MAX_Y = 792.0f;
}
