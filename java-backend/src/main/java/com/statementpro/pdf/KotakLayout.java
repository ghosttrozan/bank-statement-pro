package com.statementpro.pdf;

import com.itextpdf.kernel.colors.DeviceRgb;

/**
 * Geometric, typography and color constants for Kotak Mahindra Bank statement template.
 * Pixel-accurate reverse-engineered from verified sample 21XXXXX953_01-02-2026_12-08-2026.pdf.
 */
public final class KotakLayout {

    private KotakLayout() {}

    public static final float PAGE_WIDTH = 595.0f;
    public static final float PAGE_HEIGHT = 842.0f;

    // Palette
    public static final DeviceRgb COLOR_BLACK = new DeviceRgb(0, 0, 0);
    public static final DeviceRgb COLOR_WHITE = new DeviceRgb(255, 255, 255);
    public static final DeviceRgb COLOR_KOTAK_RED = new DeviceRgb(237, 28, 35);    // #ED1C23
    public static final DeviceRgb COLOR_HEADER_GREY = new DeviceRgb(158, 161, 163);// #9EA1A3
    public static final DeviceRgb COLOR_TEXT_GREY = new DeviceRgb(159, 161, 164);  // #9FA1A4
    public static final DeviceRgb COLOR_DUMMY_RED = new DeviceRgb(230, 40, 40);

    // Margins
    public static final float MARGIN_LEFT = 36.0f;
    public static final float MARGIN_RIGHT = 36.0f;
    public static final float TABLE_WIDTH = 523.0f; // 559.0 - 36.0

    // 7 Columns: #, Date, Description, Chq/Ref. No., Withdrawal (Dr.), Deposit (Cr.), Balance
    public static final float[] COL_WIDTHS = {
        31.2f,   // #
        49.0f,   // Date
        155.5f,  // Description
        80.2f,   // Chq/Ref. No.
        69.0f,   // Withdrawal (Dr.)
        69.1f,   // Deposit (Cr.)
        69.0f    // Balance
    };

    public static final float[] COL_X = {
        36.0f,   // # start
        67.2f,   // Date start
        116.2f,  // Description start
        271.7f,  // Chq/Ref start
        351.9f,  // Withdrawal start
        420.9f,  // Deposit start
        490.0f,  // Balance start
        559.0f   // End of table
    };

    public static final int PAGE_1_ROWS = 18;
    public static final int PAGE_N_ROWS = 28;
}
