package com.statementpro.pdf;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.renderer.CellRenderer;
import com.itextpdf.layout.renderer.DrawContext;
import com.itextpdf.layout.renderer.IRenderer;

/**
 * A custom CellRenderer that draws cell borders as real PDF path operators
 * (moveTo / lineTo / stroke) instead of iText's internal SolidBorder paint.
 *
 * WHY THIS EXISTS:
 * iText's SolidBorder draws borders inside a graphics-state save/restore block,
 * but it does NOT emit standalone PDF line operators (the 'm', 'l', 'S' operators)
 * that PDF-analysis tools like pdfplumber look for when using strategy="lines_strict".
 * This renderer replaces the border drawing with explicit PdfCanvas line calls so
 * that every cell border appears as real vector line objects in the PDF stream.
 * pdfplumber (and any PDF parser that traces actual path operators) will then
 * detect the table grid correctly with strategy="lines_strict".
 */
public class CustomBorderCellRenderer extends CellRenderer {

    private static final DeviceRgb DEFAULT_COLOR = new DeviceRgb(0, 0, 0);

    private final float lineWidth;
    private final DeviceRgb strokeColor;
    private final boolean drawTop;
    private final boolean drawRight;
    private final boolean drawBottom;
    private final boolean drawLeft;

    /** Full 4-sided border in black, given width. */
    public CustomBorderCellRenderer(Cell cell, float lineWidth) {
        this(cell, lineWidth, DEFAULT_COLOR, true, true, true, true);
    }

    /** Full 4-sided border with custom color. */
    public CustomBorderCellRenderer(Cell cell, float lineWidth, DeviceRgb strokeColor) {
        this(cell, lineWidth, strokeColor, true, true, true, true);
    }

    /** Fine-grained per-side control. */
    public CustomBorderCellRenderer(Cell cell, float lineWidth, DeviceRgb strokeColor,
                                    boolean drawTop, boolean drawRight,
                                    boolean drawBottom, boolean drawLeft) {
        super(cell);
        this.lineWidth   = lineWidth;
        this.strokeColor = strokeColor;
        this.drawTop     = drawTop;
        this.drawRight   = drawRight;
        this.drawBottom  = drawBottom;
        this.drawLeft    = drawLeft;
    }

    @Override
    public IRenderer getNextRenderer() {
        return new CustomBorderCellRenderer(
                (Cell) getModelElement(), lineWidth, strokeColor,
                drawTop, drawRight, drawBottom, drawLeft);
    }

    /**
     * Replaces iText's internal border paint with explicit PDF path operators.
     *
     * Each side is drawn as:
     *   moveTo(x1, y1)  →  'm' operator
     *   lineTo(x2, y2)  →  'l' operator
     *   stroke()        →  'S' operator
     *
     * These are precisely the operators that pdfplumber's lines_strict strategy
     * scans for when building a table grid. Without this, SolidBorder borders are
     * invisible to any strategy that requires real PDF line objects.
     */
    @Override
    public void drawBorder(DrawContext drawContext) {
        Rectangle bbox = getOccupiedAreaBBox();
        if (bbox == null) return;

        float x1 = bbox.getLeft();
        float y1 = bbox.getBottom();
        float x2 = bbox.getRight();
        float y2 = bbox.getTop();

        PdfCanvas canvas = drawContext.getCanvas();
        canvas.saveState()
              .setLineWidth(lineWidth)
              .setStrokeColor(strokeColor);

        // Each call below emits real 'm' + 'l' + 'S' operators into the PDF stream
        if (drawBottom) canvas.moveTo(x1, y1).lineTo(x2, y1).stroke();
        if (drawTop)    canvas.moveTo(x1, y2).lineTo(x2, y2).stroke();
        if (drawLeft)   canvas.moveTo(x1, y1).lineTo(x1, y2).stroke();
        if (drawRight)  canvas.moveTo(x2, y1).lineTo(x2, y2).stroke();

        canvas.restoreState();
    }
}
