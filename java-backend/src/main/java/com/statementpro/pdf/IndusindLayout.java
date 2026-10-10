package com.statementpro.pdf;

import com.itextpdf.kernel.colors.DeviceRgb;

/**
 * Geometric, typography and color constants for IndusInd Bank (INDIE) statement template.
 * Pixel-accurate reverse-engineered from verified sample ADHOC10092026211406-100296834836.pdf.
 */
public final class IndusindLayout {

    private IndusindLayout() {}

    public static final float PAGE_WIDTH = 595.0f;
    public static final float PAGE_HEIGHT = 842.0f;

    // Palette
    public static final DeviceRgb COLOR_BLACK = new DeviceRgb(0, 0, 0);
    public static final DeviceRgb COLOR_WHITE = new DeviceRgb(255, 255, 255);
    public static final DeviceRgb COLOR_RED = new DeviceRgb(230, 80, 61);          // #E6503D
    public static final DeviceRgb COLOR_LIGHT_PINK = new DeviceRgb(252, 236, 234); // #FCECEA
    public static final DeviceRgb COLOR_CREAM_BG = new DeviceRgb(253, 246, 243);   // #FDF6F3
    public static final DeviceRgb COLOR_GREY_DIVIDER = new DeviceRgb(210, 210, 210);// #D2D2D2
    public static final DeviceRgb COLOR_DUMMY_RED = new DeviceRgb(230, 50, 50);

    // Margins and containers
    public static final float CONTAINER_LEFT = 51.0f;
    public static final float CONTAINER_RIGHT = 544.0f;
    public static final float CONTAINER_WIDTH = 493.0f;

    // 6 Columns: Date, Particulars, Chq No/Ref No, Withdrawal, Deposit, Balance
    public static final float[] COL_WIDTHS = {
        73.6f,   // Date
        122.7f,  // Particulars
        73.6f,   // Chq No/Ref No
        73.6f,   // Withdrawal
        73.6f,   // Deposit
        73.6f    // Balance
    };

    public static final float TABLE_HEADER_HEIGHT = 27.9f;
    public static final float ROW_HEIGHT = 40.72f;

    public static final int PAGE_1_ROWS = 5;
    public static final int PAGE_N_ROWS = 17;
}
