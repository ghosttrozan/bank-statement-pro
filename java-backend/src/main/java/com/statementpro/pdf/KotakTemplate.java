package com.statementpro.pdf;

import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.WriterProperties;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Pixel-accurate Kotak Mahindra Bank Statement Template.
 * Exact replication of official Kotak statements (AccountStatement_01-Oct-2026_21-Oct-2026.pdf).
 */
public class KotakTemplate implements StatementTemplate {

    private static final NumberFormat CURRENCY_FMT = NumberFormat.getNumberInstance(new Locale("en", "IN"));

    static {
        CURRENCY_FMT.setMinimumFractionDigits(2);
        CURRENCY_FMT.setMaximumFractionDigits(2);
    }

    private static final String[][] NARRATIONS_DATA = {
        {"AP - Autopay for Billpay", "Netcard - Netc@rd transaction"},
        {"ATL - ATM withdrawal done from other bank ATM machine", "OS - Online Shopping transaction"},
        {"ATW - ATM withdrawal done from Kotak ATM machine", "OT - Online Trading transaction via Payment Gateway"},
        {"BP - Bill Pay transaction", "PB - Transaction done through Phone Banking (IVR)"},
        {"CDM - Kotak Cash Deposit Machine", "PCI/PCD - POS transaction"},
        {"CMS - Cash Management Service", "RTGS - Real Time Gross Settlement"},
        {"IB - Transaction done on Kotak Net Banking", "UPI - Unified Payment Interface"},
        {"IMPS - Immediate Payment Service", "VISACCPAY - Visa Credit Card Payment"},
        {"IMT - Instant Money Transfer", "VMT - VISA Money Transfer"},
        {"KB - Billpay transaction via Keya Chatbot", "WB - Billpay transaction via WhatsApp Banking"},
        {"MB - Transaction done on Mobile banking", "Int. Pd. - Interest credited on your savings account balance"},
        {"NACH - National Automated Clearing House", "Sweep transfer to - Booking new Term Deposit"},
        {"NEFT - National Electronic Funds Transfer", "Sweep transfer from - Broken existing Term Deposit"}
    };

    private static final String[] IMPORTANT_INFO_BULLETS = {
        "RBI mandates Positive Pay for high-value cheques from Jan 1, 2021. Customers must submit cheque details via Net/Mobile Banking or at the branch on the day of issuance or before handing it to the beneficiary. For more details, visit www.kotak.bank.in.",
        "From October 4, 2025, same-day cheque clearing will be implemented across all banks. Cheques will be credited or debited within a few hours of issuance.",
        "Complimentary insurance cover on Kotak Debit Cards (linked to Saving and Current accounts) will be discontinued w.e.f. July 20, 2025. All claims will be accepted until July 20, 2025, as per the existing process. Salary account holders may view their insurance covers under Debit Card Services in the Cards & FASTag section on the web portal. For any queries related to Debit Card insurance, write to dc.insurance@kotak.com or visit https://www.kotak.bank.in/en/personal-banking /cards/debit-cards/debit-card-services/insurnace-on-debit-card.html",
        "TDS is applicable from time to time as per the Income Tax Act, 2025 (IT Act) and Income Tax Rules, 2026. Currently, TDS is deducted when the aggregate interest paid / credited across all FDs, RDs exceeds the threshold limit of Rs. 50,000/- for residents and Rs. 1,00,000/- for resident senior citizens in a financial year (FY) for a customer.",
        "You can avail a Tax Deduction at Source (TDS) exemption on the interest earned on your existing or new Fixed Deposits for the current financial year by submitting Form 121 (earlier Form 15G/15H). This exemption is available if you are eligible and the total interest earned on your bank deposits in a financial year exceeds the TDS exemption threshold. If the total interest earned on your bank deposits is below the TDS exemption threshold, submission of Form 121 is not required. A fresh Form 121 must be submitted at the beginning of each financial year for Fixed Deposits and Recurring Deposits.",
        "RBI, vide its circular DOR.CRE.REC.23/21.08.008/2022-23 dated April 19, 2022, has issued guidelines pertaining to the opening and maintenance of Current Account(s) of customers who have availed various credit facilities from the banking system. The term \"banking system\" refers to Scheduled Commercial Banks and Payments Banks. Banks (whether lending banks or otherwise) are required to monitor all Current Account, Overdraft, and Cash Credit accounts on a regular basis, at least on a half-yearly frequency. This monitoring must specifically consider the aggregate exposure of the banking system to the borrower vis-à-vis the individual bank's share in that exposure, in order to ensure compliance with the said instructions. Detailed guidelines are available in the aforementioned circular.",
        "Deposits of up to \u20B95,00,000 per depositor are fully insured by the Deposit Insurance and Credit Guarantee Corporation, under the Deposit Insurance Scheme.",
        "Keep your account active for uninterrupted access to your funds: Inoperative accounts can be easily reactivated by submitting a signed request along with valid KYC documents. For details, please click https://www.kotak.bank.in/en/reach-us.html",
        "Registering a nominee is strongly recommended: A nominee can help your family access funds lying in your inoperative account smoothly. In the event of the account holder\u2019s demise, the nominee may visit our nearest branch with the required documents for verification and settlement of claims.",
        "Goods and Services Tax (GST), at the applicable rate of 18%, is levied on relevant service charges.",
        "Dear Customer, any inaccurate, incomplete or false disclosure of statement of financial transaction or reportable account by you would lead to penal consequence on the Bank under applicable law. The Bank shall be entitled to recover from you such amount levied due to such inaccuracy, incompleteness or false disclosure. You will indemnify the Bank in respect of all or any liabilities incurred by Bank, by reason of any of the information or particulars given by you, being incorrect or false or being suppressed or omitted.",
        "Please note: This statement/ advice should not be construed as a Tax Invoice under the Goods and Services Tax Act."
    };

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    @Override
    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (writerProperties == null) {
            writerProperties = new WriterProperties();
        }
        writerProperties.setPdfVersion(com.itextpdf.kernel.pdf.PdfVersion.PDF_1_5);
        writerProperties.setFullCompressionMode(true);

        PdfWriter writer = new PdfWriter(out, writerProperties);

        try (PdfDocument pdfDoc = new PdfDocument(writer)) {
            // Set metadata matching official OpenPDF 2.0.3 output
            com.itextpdf.kernel.pdf.PdfDocumentInfo info = pdfDoc.getDocumentInfo();
            info.setProducer("OpenPDF 2.0.3");
            info.setCreator("");
            info.setTitle("");
            info.setAuthor("");
            info.setSubject("");
            info.setKeywords("");

            String utcDate = java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                    .withZone(java.time.ZoneOffset.UTC)
                    .format(java.time.Instant.now());
            info.setMoreInfo("CreationDate", "D:" + utcDate + "Z");
            info.setMoreInfo("ModDate", null);

            com.itextpdf.kernel.pdf.PdfDictionary infoDict = pdfDoc.getTrailer().getAsDictionary(com.itextpdf.kernel.pdf.PdfName.Info);
            if (infoDict != null) {
                infoDict.remove(com.itextpdf.kernel.pdf.PdfName.ModDate);
            }

            // Load Source Sans 3 TrueType fonts
            byte[] ssRegularBytes = loadResourceBytes("/fonts/SourceSans3-Regular.ttf");
            byte[] ssSemiBoldBytes = loadResourceBytes("/fonts/SourceSans3-Semibold.ttf");

            PdfFont fontRegular = ssRegularBytes != null
                    ? PdfFontFactory.createFont(ssRegularBytes, PdfEncodings.IDENTITY_H)
                    : PdfFontFactory.createFont(StandardFonts.HELVETICA);

            PdfFont fontSemiBold = ssSemiBoldBytes != null
                    ? PdfFontFactory.createFont(ssSemiBoldBytes, PdfEncodings.IDENTITY_H)
                    : PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

            // Images
            byte[] headerImgBytes = loadResourceBytes("/images/kotak/kotak_header.jpeg");
            byte[] heroBannerBytes = loadResourceBytes("/images/kotak/kotak_hero_banner.jpeg");
            byte[] phoneIconBytes = loadResourceBytes("/images/kotak/kotak_phone_icon.png");
            byte[] branchIconBytes = loadResourceBytes("/images/kotak/kotak_branch_icon.png");
            byte[] mobileIconBytes = loadResourceBytes("/images/kotak/kotak_mobile_icon.png");
            byte[] qrCodeBytes = loadResourceBytes("/images/kotak/kotak_qr.jpeg");
            byte[] bulletIconBytes = loadResourceBytes("/images/kotak/kotak_bullet.png");

            List<Transaction> transactions = record.transactions() != null ? record.transactions() : List.of();

            String startDateStr = transactions.isEmpty() ? "01 Oct 2026" : formatKotakDate(transactions.get(0).valueDate());
            String endDateStr   = transactions.isEmpty() ? "21 Oct 2026" : formatKotakDate(transactions.get(transactions.size() - 1).valueDate());
            String periodStr    = startDateStr + " - " + endDateStr;

            String accNum = record.customerDetails().accountNumber() != null && !record.customerDetails().accountNumber().isBlank()
                    ? record.customerDetails().accountNumber() : "6145810535";

            double openingBal = record.accountInfo() != null ? record.accountInfo().openingBalance() : 16319.50;
            double closingBal = transactions.isEmpty() ? openingBal : transactions.get(transactions.size() - 1).balance();

            String generatedOnStr = "Statement Generated on " + DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").format(LocalDateTime.now());

            // Paginate transactions
            List<List<Transaction>> txPages = paginateTransactions(transactions, fontRegular);
            int txPageCount = txPages.isEmpty() ? 1 : txPages.size();
            int totalPages = txPageCount + 2; // Always has 2 dedicated closing pages: Page 8 (Summary) and Page 9 (Important Info)

            int currentSerial = 1;

            // Render Transaction Pages
            for (int pIdx = 0; pIdx < txPageCount; pIdx++) {
                int pageNum = pIdx + 1;
                boolean isFirstPage = (pIdx == 0);
                List<Transaction> pageTxList = txPages.isEmpty() ? List.of() : txPages.get(pIdx);

                PdfPage page = pdfDoc.addNewPage(new PageSize(KotakLayout.PAGE_WIDTH, KotakLayout.PAGE_HEIGHT));
                PdfCanvas canvas = new PdfCanvas(page);

                if (isFirstPage) {
                    renderPage1Header(canvas, record, headerImgBytes, fontRegular, fontSemiBold, accNum, periodStr);
                    renderTableBannerAndHeader(canvas, fontRegular, KotakLayout.PAGE_1_TABLE_START_Y);

                    // Opening Balance row
                    renderOpeningBalanceRow(canvas, fontRegular, KotakLayout.PAGE_1_ROWS_START_Y, openingBal);

                    float curTopY = KotakLayout.PAGE_1_ROWS_START_Y + 14.0f;
                    for (Transaction tx : pageTxList) {
                        curTopY = renderTransactionRow(canvas, tx, fontRegular, curTopY, currentSerial);
                        currentSerial++;
                    }
                } else {
                    renderContinuationHeader(canvas, record, fontRegular, fontSemiBold, accNum, periodStr);
                    renderTableBannerAndHeader(canvas, fontRegular, KotakLayout.PAGE_N_TABLE_START_Y);

                    float curTopY = KotakLayout.PAGE_N_ROWS_START_Y;
                    for (Transaction tx : pageTxList) {
                        curTopY = renderTransactionRow(canvas, tx, fontRegular, curTopY, currentSerial);
                        currentSerial++;
                    }
                }

                renderPageFooter(canvas, fontRegular, generatedOnStr, pageNum, totalPages);
            }

            // Dedicated Closing Page 1: Account Summary & Assistance
            {
                int pageNum = txPageCount + 1;
                PdfPage page = pdfDoc.addNewPage(new PageSize(KotakLayout.PAGE_WIDTH, KotakLayout.PAGE_HEIGHT));
                PdfCanvas canvas = new PdfCanvas(page);

                renderContinuationHeader(canvas, record, fontRegular, fontSemiBold, accNum, periodStr);
                renderClosingSummaryPage(canvas, record, fontRegular, fontSemiBold, openingBal, closingBal,
                        heroBannerBytes, phoneIconBytes, branchIconBytes, mobileIconBytes, qrCodeBytes);
                renderPageFooter(canvas, fontRegular, generatedOnStr, pageNum, totalPages);
            }

            // Dedicated Closing Page 2: Important Information & Narrations
            {
                int pageNum = txPageCount + 2;
                PdfPage page = pdfDoc.addNewPage(new PageSize(KotakLayout.PAGE_WIDTH, KotakLayout.PAGE_HEIGHT));
                PdfCanvas canvas = new PdfCanvas(page);

                renderContinuationHeader(canvas, record, fontRegular, fontSemiBold, accNum, periodStr);
                renderImportantInformationPage(canvas, fontRegular, fontSemiBold, bulletIconBytes);
                renderPageFooter(canvas, fontRegular, generatedOnStr, pageNum, totalPages);
            }
        }

        byte[] pdfBytes = out.toByteArray();
        return stripITextMarkers(pdfBytes);
    }

    private byte[] stripITextMarkers(byte[] data) {
        String content = new String(data, java.nio.charset.StandardCharsets.ISO_8859_1);
        boolean modified = false;

        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("%iText-Core-[0-9a-zA-Z.]+");
        java.util.regex.Matcher matcher = pattern.matcher(content);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String match = matcher.group();
            StringBuilder replacement = new StringBuilder("%");
            for (int i = 1; i < match.length(); i++) {
                replacement.append(" ");
            }
            matcher.appendReplacement(sb, replacement.toString());
            modified = true;
        }
        matcher.appendTail(sb);
        content = sb.toString();

        java.util.regex.Pattern prodPattern = java.util.regex.Pattern.compile("/Producer\\(OpenPDF 2\\.0\\.3; modified using .*?\\)(?=/Subject|\\n|>>)");
        java.util.regex.Matcher prodMatcher = prodPattern.matcher(content);
        if (prodMatcher.find()) {
            String fullMatch = prodMatcher.group();
            String desired = "/Producer(OpenPDF 2.0.3)";
            StringBuilder padded = new StringBuilder(desired);
            while (padded.length() < fullMatch.length()) {
                padded.append(' ');
            }
            content = prodMatcher.replaceFirst(java.util.regex.Matcher.quoteReplacement(padded.toString()));
            modified = true;
        }

        return modified ? content.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1) : data;
    }

    // -------------------------------------------------------------------------
    // PAGE 1 HEADER
    // -------------------------------------------------------------------------
    private void renderPage1Header(PdfCanvas canvas, StatementRecord record, byte[] headerImgBytes,
                                   PdfFont fontRegular, PdfFont fontSemiBold, String accNum, String periodStr) {
        float H = KotakLayout.PAGE_HEIGHT;

        canvas.saveState();

        // 1. Full-width top header banner image (0.0 to 595.0, height 74.85)
        if (headerImgBytes != null) {
            try {
                canvas.addImageFittedIntoRectangle(
                        ImageDataFactory.create(headerImgBytes),
                        new com.itextpdf.kernel.geom.Rectangle(0.0f, H - 74.85f, 595.0f, 74.85f),
                        false
                );
            } catch (Exception ignored) {}
        }

        // 2. Title & Statement Period
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.beginText();
        canvas.setFontAndSize(fontSemiBold, 25.0f);
        canvas.moveText(36.0f, H - 116.0f);
        canvas.showText("Account Statement");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 11.0f);
        canvas.moveText(36.0f, H - 134.0f);
        canvas.showText(periodStr);
        canvas.endText();

        // 3. Customer Dossier Left (x = 38.0)
        CustomerDetails cust = record.customerDetails();
        BranchDetails branch = record.branchDetails();

        String custName = cust.accountHolderName() != null ? cust.accountHolderName() : "Jitendra Sapray";
        String cif = cust.cifNumber() != null ? cust.cifNumber() : "";
        String crnSuffix = cif.length() >= 3 ? cif.substring(cif.length() - 3)
                : (accNum.length() >= 3 ? accNum.substring(accNum.length() - 3) : "815");
        String crn = "CRN xxxxxx" + crnSuffix;

        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.beginText();
        canvas.setFontAndSize(fontSemiBold, 14.0f);
        canvas.moveText(38.0f, H - 182.0f);
        canvas.showText(custName);
        canvas.endText();

        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 11.0f);
        canvas.moveText(38.0f, H - 198.0f);
        canvas.showText(crn);
        canvas.endText();

        // Customer Address Lines
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        String rawAddr = cust.address() != null ? cust.address() : "379 Rukhmani Nagar\nChota Bangarda Road\nIndore\nIndore - 452005\nMadhya Pradesh - India";
        String[] addrParts = rawAddr.split("[\\r\\n]+");
        float adrBaseline = H - 231.0f;
        for (int i = 0; i < Math.min(5, addrParts.length); i++) {
            String line = addrParts[i].trim();
            if (!line.isEmpty()) {
                canvas.beginText();
                canvas.setFontAndSize(fontRegular, 9.0f);
                canvas.moveText(38.0f, adrBaseline);
                canvas.showText(line);
                canvas.endText();
                adrBaseline -= 15.0f;
            }
        }

        // MICR & IFSC Line
        String micr = branch.micrCode() != null && !branch.micrCode().isBlank() ? branch.micrCode() : "452485007";
        String ifsc = branch.ifscCode() != null && !branch.ifscCode().isBlank() ? branch.ifscCode() : "KKBK0005942";

        float micrY = H - 317.0f;
        float micrX = 38.0f;

        // "MICR "
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.moveText(micrX, micrY);
        canvas.showText("MICR ");
        float wMicrLabel = fontRegular.getWidth("MICR ", 9.0f);

        // micr value
        canvas.setFontAndSize(fontSemiBold, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.moveText(wMicrLabel, 0);
        canvas.showText(micr);
        canvas.endText();

        float wMicrVal = fontSemiBold.getWidth(micr, 9.0f);
        float ifscX = micrX + wMicrLabel + wMicrVal + 14.0f;

        // "IFSC Code "
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.moveText(ifscX, micrY);
        canvas.showText("IFSC Code ");
        float wIfscLabel = fontRegular.getWidth("IFSC Code ", 9.0f);

        // ifsc value
        canvas.setFontAndSize(fontSemiBold, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.moveText(wIfscLabel, 0);
        canvas.showText(ifsc);
        canvas.endText();

        // 4. Dossier Right Side (x = 347.5f)
        float rX = 347.5f;
        String branchName = branch.branchName() != null ? branch.branchName() : "Indore -Cloth Market";
        String accType = record.accountInfo() != null && record.accountInfo().accountType() != null
                ? record.accountInfo().accountType() : "Savings";

        renderLabelValue(canvas, fontRegular, fontSemiBold, rX, H - 176.5f, "Account No. ", accNum);
        renderLabelValue(canvas, fontRegular, fontSemiBold, rX, H - 192.5f, "Account Type ", accType);
        renderLabelValue(canvas, fontRegular, fontSemiBold, rX, H - 208.5f, "Branch ", branchName);
        renderLabelValue(canvas, fontRegular, fontSemiBold, rX, H - 234.5f, "Account Status ", "Active");
        renderLabelValue(canvas, fontRegular, fontSemiBold, rX, H - 250.5f, "Nominee Registered ", "No");
        renderLabelValue(canvas, fontRegular, fontSemiBold, rX, H - 276.5f, "Currency ", "INDIAN RUPEE");

        canvas.restoreState();
    }

    private void renderLabelValue(PdfCanvas canvas, PdfFont fontRegular, PdfFont fontSemiBold,
                                  float x, float baselineY, String label, String value) {
        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(x, baselineY);
        canvas.showText(label);
        float lw = fontRegular.getWidth(label, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.setFontAndSize(fontSemiBold, 9.0f);
        canvas.moveText(lw, 0);
        canvas.showText(value);
        canvas.endText();
    }

    // -------------------------------------------------------------------------
    // CONTINUATION HEADER (Pages 2 to N)
    // -------------------------------------------------------------------------
    private void renderContinuationHeader(PdfCanvas canvas, StatementRecord record,
                                         PdfFont fontRegular, PdfFont fontSemiBold,
                                         String accNum, String periodStr) {
        float H = KotakLayout.PAGE_HEIGHT;
        CustomerDetails cust = record.customerDetails();
        String custName = cust.accountHolderName() != null ? cust.accountHolderName().toUpperCase() : "JITENDRA SAPRAY";

        canvas.saveState();

        // Customer Name
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(36.0f, H - 20.0f);
        canvas.showText(custName);
        canvas.endText();

        // Account No.
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.moveText(36.0f, H - 32.0f);
        canvas.showText("Account No. ");
        float lw1 = fontRegular.getWidth("Account No. ", 9.0f);
        canvas.setFontAndSize(fontSemiBold, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.moveText(lw1, 0);
        canvas.showText(accNum);
        canvas.endText();

        // Account Statement Period
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.moveText(36.0f, H - 44.0f);
        canvas.showText("Account Statement ");
        float lw2 = fontRegular.getWidth("Account Statement ", 9.0f);
        canvas.setFontAndSize(fontSemiBold, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.moveText(lw2, 0);
        canvas.showText(periodStr);
        canvas.endText();

        canvas.restoreState();
    }

    // -------------------------------------------------------------------------
    // TABLE BANNER & COLUMN HEADER
    // -------------------------------------------------------------------------
    private void renderTableBannerAndHeader(PdfCanvas canvas, PdfFont fontRegular, float bannerTopY) {
        float H = KotakLayout.PAGE_HEIGHT;

        canvas.saveState();

        // 1. Red Banner (36.0 to 559.0, height 25.0)
        canvas.setFillColor(KotakLayout.COLOR_KOTAK_RED);
        canvas.rectangle(36.0f, H - bannerTopY - 25.0f, 523.0f, 25.0f);
        canvas.fill();

        // Banner text centered
        String bannerTitle = "Savings Account Transactions";
        float bw = fontRegular.getWidth(bannerTitle, 12.0f);
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 12.0f);
        canvas.moveText(36.0f + (523.0f - bw) / 2.0f, H - bannerTopY - 17.5f);
        canvas.showText(bannerTitle);
        canvas.endText();

        // 2. Grey Header Row (height 25.0)
        float headerTopY = bannerTopY + 25.0f;
        canvas.setFillColor(KotakLayout.COLOR_GREY_HEADER);
        canvas.rectangle(36.0f, H - headerTopY - 25.0f, 523.0f, 25.0f);
        canvas.fill();

        // White dividers between columns in header row
        canvas.setStrokeColor(KotakLayout.COLOR_WHITE);
        canvas.setLineWidth(0.75f);
        for (int i = 1; i < KotakLayout.COL_X.length - 1; i++) {
            canvas.moveTo(KotakLayout.COL_X[i], H - headerTopY);
            canvas.lineTo(KotakLayout.COL_X[i], H - headerTopY - 25.0f);
            canvas.stroke();
        }

        // Header titles
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        float titleBaseY = H - headerTopY - 16.5f;

        renderText(canvas, fontRegular, 9.0f, 44.0f, titleBaseY, "#");
        renderText(canvas, fontRegular, 9.0f, 75.18f, titleBaseY, "Date");
        renderText(canvas, fontRegular, 9.0f, 124.19f, titleBaseY, "Description");
        renderText(canvas, fontRegular, 9.0f, 279.66f, titleBaseY, "Chq/Ref. No.");
        renderText(canvas, fontRegular, 9.0f, 354.85f, titleBaseY, "Withdrawal (Dr.)");
        renderText(canvas, fontRegular, 9.0f, 428.90f, titleBaseY, "Deposit (Cr.)");
        renderText(canvas, fontRegular, 9.0f, 497.95f, titleBaseY, "Balance");

        canvas.restoreState();
    }

    // -------------------------------------------------------------------------
    // OPENING BALANCE ROW
    // -------------------------------------------------------------------------
    private void renderOpeningBalanceRow(PdfCanvas canvas, PdfFont fontRegular, float topY, double openingBal) {
        float H = KotakLayout.PAGE_HEIGHT;
        float rowH = 14.0f;
        float baseY = H - topY - 10.5f;

        canvas.saveState();

        // White cell background rectangles (matches OpenPDF vector table grid for table parsers)
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        for (int i = 0; i < KotakLayout.COL_X.length - 1; i++) {
            float x0 = KotakLayout.COL_X[i];
            float x1 = KotakLayout.COL_X[i + 1];
            canvas.rectangle(x0, H - topY - rowH, x1 - x0, rowH);
        }
        canvas.fill();

        canvas.setFillColor(KotakLayout.COLOR_BLACK);

        renderText(canvas, fontRegular, 7.7f, 39.0f, baseY, "-");
        renderText(canvas, fontRegular, 7.7f, 70.18f, baseY, "-");
        renderText(canvas, fontRegular, 7.7f, 119.19f, baseY, "Opening Balance");
        renderText(canvas, fontRegular, 7.7f, 274.66f, baseY, "-");
        renderText(canvas, fontRegular, 7.7f, 415.51f, baseY, "-");
        renderText(canvas, fontRegular, 7.7f, 484.56f, baseY, "-");

        String balStr = CURRENCY_FMT.format(openingBal);
        float bw = fontRegular.getWidth(balStr, 7.7f);
        renderText(canvas, fontRegular, 7.7f, 556.0f - bw, baseY, balStr);

        // Divider line below row
        canvas.setStrokeColor(KotakLayout.COLOR_LINE_GREY);
        canvas.setLineWidth(0.5f);
        canvas.moveTo(36.0f, H - topY - rowH);
        canvas.lineTo(559.0f, H - topY - rowH);
        canvas.stroke();

        canvas.restoreState();
    }

    // -------------------------------------------------------------------------
    // TRANSACTION ROW
    // -------------------------------------------------------------------------
    private float renderTransactionRow(PdfCanvas canvas, Transaction tx, PdfFont fontRegular,
                                       float topY, int serialNo) {
        float H = KotakLayout.PAGE_HEIGHT;
        float colDescWidth = 271.66f - 116.19f - 6.0f; // 149.47f
        List<String> descLines = wrapText(tx.details() != null ? tx.details() : "", fontRegular, 7.7f, colDescWidth);
        int lineCount = Math.max(1, descLines.size());

        float rowHeight = lineCount == 1 ? 15.0f : (lineCount == 2 ? 21.36f : 29.0f);
        float baseY = H - topY - 10.5f;

        canvas.saveState();

        // White cell background rectangles (matches OpenPDF vector table grid for table parsers)
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        for (int i = 0; i < KotakLayout.COL_X.length - 1; i++) {
            float x0 = KotakLayout.COL_X[i];
            float x1 = KotakLayout.COL_X[i + 1];
            canvas.rectangle(x0, H - topY - rowHeight, x1 - x0, rowHeight);
        }
        canvas.fill();

        canvas.setFillColor(KotakLayout.COLOR_BLACK);

        // Serial No (#)
        renderText(canvas, fontRegular, 7.7f, 39.0f, baseY, String.valueOf(serialNo));

        // Date
        String dStr = formatKotakDate(tx.valueDate());
        renderText(canvas, fontRegular, 7.7f, 73.10f, baseY, dStr);

        // Description
        float curLineY = baseY;
        for (String dl : descLines) {
            renderText(canvas, fontRegular, 7.7f, 119.19f, curLineY, dl);
            curLineY -= 7.68f;
        }

        // Chq / Ref No.
        String refStr = tx.refNo() != null && !tx.refNo().isBlank() ? tx.refNo() : "-";
        renderText(canvas, fontRegular, 7.7f, 274.66f, baseY, refStr);

        // Withdrawal / Deposit
        Double dr = tx.debit();
        Double cr = tx.credit();
        double bal = tx.balance();

        if (dr != null && dr > 0.001) {
            String drStr = CURRENCY_FMT.format(dr);
            float w = fontRegular.getWidth(drStr, 7.7f);
            renderText(canvas, fontRegular, 7.7f, 417.90f - w, baseY, drStr);
        }

        if (cr != null && cr > 0.001) {
            String crStr = CURRENCY_FMT.format(cr);
            float w = fontRegular.getWidth(crStr, 7.7f);
            renderText(canvas, fontRegular, 7.7f, 486.95f - w, baseY, crStr);
        }

        // Balance
        String balStr = CURRENCY_FMT.format(bal);
        float bw = fontRegular.getWidth(balStr, 7.7f);
        renderText(canvas, fontRegular, 7.7f, 556.00f - bw, baseY, balStr);

        // Divider line below row
        canvas.setStrokeColor(KotakLayout.COLOR_LINE_GREY);
        canvas.setLineWidth(0.5f);
        canvas.moveTo(36.0f, H - topY - rowHeight);
        canvas.lineTo(559.0f, H - topY - rowHeight);
        canvas.stroke();

        canvas.restoreState();

        return topY + rowHeight;
    }

    // -------------------------------------------------------------------------
    // CLOSING SUMMARY & ASSISTANCE PAGE (Page 8 in 9-page statement)
    // -------------------------------------------------------------------------
    private void renderClosingSummaryPage(PdfCanvas canvas, StatementRecord record,
                                          PdfFont fontRegular, PdfFont fontSemiBold,
                                          double openingBal, double closingBal,
                                          byte[] heroBannerBytes, byte[] phoneIconBytes,
                                          byte[] branchIconBytes, byte[] mobileIconBytes,
                                          byte[] qrCodeBytes) {
        float H = KotakLayout.PAGE_HEIGHT;

        canvas.saveState();

        // 1. Account Summary Banner (36.0 to 559.0 at y = 80.0, height 25.0)
        canvas.setFillColor(KotakLayout.COLOR_KOTAK_RED);
        canvas.rectangle(36.0f, H - 80.0f - 25.0f, 523.0f, 25.0f);
        canvas.fill();

        String sumTitle = "Account Summary";
        float sw = fontRegular.getWidth(sumTitle, 12.0f);
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 12.0f);
        canvas.moveText(36.0f + (523.0f - sw) / 2.0f, H - 80.0f - 17.5f);
        canvas.showText(sumTitle);
        canvas.endText();

        // 2. Summary Table Header (height 33.0)
        canvas.setFillColor(KotakLayout.COLOR_GREY_HEADER);
        canvas.rectangle(36.0f, H - 105.0f - 33.0f, 523.0f, 33.0f);
        canvas.fill();

        canvas.setStrokeColor(KotakLayout.COLOR_WHITE);
        canvas.setLineWidth(0.75f);
        canvas.moveTo(273.73f, H - 105.0f);
        canvas.lineTo(273.73f, H - 105.0f - 33.0f);
        canvas.stroke();
        canvas.moveTo(416.36f, H - 105.0f);
        canvas.lineTo(416.36f, H - 105.0f - 33.0f);
        canvas.stroke();

        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        renderText(canvas, fontRegular, 9.0f, 48.0f, H - 124.0f, "Particulars");
        renderText(canvas, fontRegular, 9.0f, 285.73f, H - 124.0f, "Opening Balance");
        renderText(canvas, fontRegular, 9.0f, 428.36f, H - 124.0f, "Closing Balance");

        // 3. Summary Table Row
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        renderText(canvas, fontRegular, 7.7f, 39.0f, H - 149.0f, "Savings Account (SA):");
        String opStr = CURRENCY_FMT.format(openingBal);
        renderText(canvas, fontRegular, 7.7f, 355.82f, H - 149.0f, opStr);
        String clStr = CURRENCY_FMT.format(closingBal);
        renderText(canvas, fontRegular, 7.7f, 502.27f, H - 149.0f, clStr);

        canvas.setStrokeColor(KotakLayout.COLOR_LINE_GREY);
        canvas.setLineWidth(0.5f);
        canvas.moveTo(36.0f, H - 151.68f);
        canvas.lineTo(559.0f, H - 151.68f);
        canvas.stroke();

        // 4. End of Statement Block (Centered)
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        String eos = "End of Statement";
        float eosW = fontRegular.getWidth(eos, 12.0f);
        renderText(canvas, fontRegular, 12.0f, (595.0f - eosW) / 2.0f, H - 244.0f, eos);

        String disc1 = "Any discrepancy in the statement should be brought to the notice of Kotak Mahindra Bank Ltd. within";
        float d1W = fontRegular.getWidth(disc1, 9.1f);
        renderText(canvas, fontRegular, 9.1f, (595.0f - d1W) / 2.0f, H - 260.0f, disc1);

        String disc2 = "one month from the date of receipt of the statement.";
        float d2W = fontRegular.getWidth(disc2, 9.1f);
        renderText(canvas, fontRegular, 9.1f, (595.0f - d2W) / 2.0f, H - 274.0f, disc2);

        String disc3 = "This is a system generated report and does not require signature and stamp.";
        float d3W = fontRegular.getWidth(disc3, 9.1f);
        renderText(canvas, fontRegular, 9.1f, (595.0f - d3W) / 2.0f, H - 289.0f, disc3);

        // 5. Hero Banner Image (Hausla hai toh ho jayega, 36.0 to 559.0, height 86.31)
        if (heroBannerBytes != null) {
            try {
                canvas.addImageFittedIntoRectangle(
                        ImageDataFactory.create(heroBannerBytes),
                        new com.itextpdf.kernel.geom.Rectangle(36.0f, H - 407.99f, 523.0f, 86.31f),
                        false
                );
            } catch (Exception ignored) {}
        }

        // 6. Assistance Section (y = 579.0, height 25.0)
        canvas.setFillColor(KotakLayout.COLOR_KOTAK_RED);
        canvas.rectangle(36.0f, H - 579.0f - 25.0f, 523.0f, 25.0f);
        canvas.fill();

        String astTitle = "For assistance, reach out to us at:";
        float astW = fontRegular.getWidth(astTitle, 12.0f);
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        renderText(canvas, fontRegular, 12.0f, 36.0f + (523.0f - astW) / 2.0f, H - 579.0f - 17.5f, astTitle);

        // Vertical dividers between 3 assistance columns: at 152.22 and 442.78
        canvas.setStrokeColor(KotakLayout.COLOR_LINE_GREY);
        canvas.setLineWidth(0.5f);
        canvas.moveTo(152.22f, H - 619.0f);
        canvas.lineTo(152.22f, H - 675.0f);
        canvas.stroke();
        canvas.moveTo(442.78f, H - 619.0f);
        canvas.lineTo(442.78f, H - 675.0f);
        canvas.stroke();

        // Column 1: Phone Icon + Contact Us
        if (phoneIconBytes != null) {
            try {
                canvas.addImageFittedIntoRectangle(
                        ImageDataFactory.create(phoneIconBytes),
                        new com.itextpdf.kernel.geom.Rectangle(83.61f, H - 637.0f, 21.0f, 21.0f),
                        false
                );
            } catch (Exception ignored) {}
        }
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        renderCenterText(canvas, fontRegular, 9.1f, 36.0f, 152.22f, H - 649.0f, "Contact Us");
        renderCenterText(canvas, fontRegular, 9.1f, 36.0f, 152.22f, H - 661.0f, "1800 4100");
        renderCenterText(canvas, fontRegular, 9.1f, 36.0f, 152.22f, H - 673.0f, "(Toll-free number)");

        // Column 2: Branch Icon + Branch Address
        if (branchIconBytes != null) {
            try {
                canvas.addImageFittedIntoRectangle(
                        ImageDataFactory.create(branchIconBytes),
                        new com.itextpdf.kernel.geom.Rectangle(287.0f, H - 637.0f, 21.0f, 21.0f),
                        false
                );
            } catch (Exception ignored) {}
        }
        BranchDetails branch = record.branchDetails();
        String bAddr1 = branch.branchAddress() != null ? branch.branchAddress() : "85 -Rang Mahal Sir Seth Hukum Chand Marg, Cloth Market Itwariya";
        String bAddr2 = branch.city() != null ? branch.city() + ", Indore-452002, Madhya Pradesh, India" : "Bazar,Indore, Indore-452002, Madhya Pradesh, India";
        renderCenterText(canvas, fontRegular, 9.0f, 152.22f, 442.78f, H - 649.0f, "Branch Address");
        renderCenterText(canvas, fontRegular, 9.0f, 152.22f, 442.78f, H - 661.0f, bAddr1);
        renderCenterText(canvas, fontRegular, 9.0f, 152.22f, 442.78f, H - 673.0f, bAddr2);

        // Column 3: Mobile Icon + Branch Phone Number
        if (mobileIconBytes != null) {
            try {
                canvas.addImageFittedIntoRectangle(
                        ImageDataFactory.create(mobileIconBytes),
                        new com.itextpdf.kernel.geom.Rectangle(490.39f, H - 637.0f, 21.0f, 21.0f),
                        false
                );
            } catch (Exception ignored) {}
        }
        String bPhone = branch.branchPhone() != null && !branch.branchPhone().isBlank() ? branch.branchPhone() : "9522204785";
        renderCenterText(canvas, fontRegular, 9.0f, 442.78f, 559.0f, H - 649.0f, "Branch Phone Number");
        renderCenterText(canvas, fontRegular, 9.0f, 442.78f, 559.0f, H - 661.0f, bPhone);

        // 7. Security Alert ("Remember!" Rounded Box) (36.0 to 559.0 at y = 686.0, height 70.0)
        canvas.setFillColor(KotakLayout.COLOR_REMEMBER_BG);
        canvas.roundRectangle(36.0f, H - 756.0f, 523.0f, 70.0f, 6.0f);
        canvas.fill();

        // Vertical divider in Remember box at 384.67
        canvas.setStrokeColor(KotakLayout.COLOR_LINE_GREY);
        canvas.setLineWidth(0.5f);
        canvas.moveTo(384.67f, H - 696.0f);
        canvas.lineTo(384.67f, H - 747.0f);
        canvas.stroke();

        // Remember Text (Left side)
        canvas.setFillColor(KotakLayout.COLOR_KOTAK_RED);
        renderText(canvas, fontSemiBold, 12.0f, 51.0f, H - 710.0f, "Remember!");
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        renderText(canvas, fontRegular, 12.0f, 51.0f, H - 726.0f, "Never share personal/sensitive information like PIN, CVV, OTP");
        renderText(canvas, fontRegular, 12.0f, 51.0f, H - 742.0f, "or passwords with anyone.");

        // QR Code & Safe banking text (Right side)
        if (qrCodeBytes != null) {
            try {
                canvas.addImageFittedIntoRectangle(
                        ImageDataFactory.create(qrCodeBytes),
                        new com.itextpdf.kernel.geom.Rectangle(399.84f, H - 743.6f, 45.6f, 45.6f),
                        false
                );
            } catch (Exception ignored) {}
        }
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        renderText(canvas, fontRegular, 10.0f, 458.61f, H - 712.0f, "Scan for");
        renderText(canvas, fontRegular, 10.0f, 458.61f, H - 724.0f, "more safe");
        renderText(canvas, fontRegular, 10.0f, 458.61f, H - 736.0f, "banking tips");

        // 8. Corporate Footer
        canvas.setStrokeColor(KotakLayout.COLOR_LINE_GREY);
        canvas.setLineWidth(0.5f);
        canvas.moveTo(36.0f, H - 766.0f);
        canvas.lineTo(559.0f, H - 766.0f);
        canvas.stroke();

        String corp1 = "Kotak Mahindra Bank Ltd. | CIN: L65110MH1985PLC038137";
        float c1W = fontRegular.getWidth(corp1, 8.5f);
        renderText(canvas, fontRegular, 8.5f, (595.0f - c1W) / 2.0f, H - 778.0f, corp1);

        String corp2 = "Registered Office: 27 BKC, C 27, G Block, Bandra Kurla Complex, Bandra (E), Mumbai - 400 051. www.kotak.bank.in";
        float c2W = fontRegular.getWidth(corp2, 8.5f);
        renderText(canvas, fontRegular, 8.5f, (595.0f - c2W) / 2.0f, H - 790.0f, corp2);

        canvas.restoreState();
    }

    // -------------------------------------------------------------------------
    // IMPORTANT INFORMATION & NARRATIONS PAGE (Page 9 in 9-page statement)
    // -------------------------------------------------------------------------
    private void renderImportantInformationPage(PdfCanvas canvas, PdfFont fontRegular, PdfFont fontSemiBold,
                                                byte[] bulletIconBytes) {
        float H = KotakLayout.PAGE_HEIGHT;

        canvas.saveState();

        // 1. Red Banner: Important Information (y = 80.0, height 25.0)
        canvas.setFillColor(KotakLayout.COLOR_KOTAK_RED);
        canvas.rectangle(36.0f, H - 80.0f - 25.0f, 523.0f, 25.0f);
        canvas.fill();

        String infoTitle = "Important Information";
        float iw = fontRegular.getWidth(infoTitle, 12.0f);
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        renderText(canvas, fontRegular, 12.0f, 36.0f + (523.0f - iw) / 2.0f, H - 80.0f - 17.5f, infoTitle);

        // 2. Rounded Border Box (36.0 to 559.0 from y = 115.0 to 545.0, height 430.0)
        canvas.setStrokeColor(KotakLayout.COLOR_LINE_GREY);
        canvas.setLineWidth(0.75f);
        canvas.roundRectangle(36.0f, H - 545.0f, 523.0f, 430.0f, 6.0f);
        canvas.stroke();

        // 12 Bullet points inside rounded box
        float bulletTextX = 68.53f;
        float bulletTextMaxW = 475.0f;
        float curBulletY = 135.0f;

        for (String bulletText : IMPORTANT_INFO_BULLETS) {
            // Draw bullet icon
            if (bulletIconBytes != null) {
                try {
                    canvas.addImageFittedIntoRectangle(
                            ImageDataFactory.create(bulletIconBytes),
                            new com.itextpdf.kernel.geom.Rectangle(48.0f, H - curBulletY - 1.0f, 6.0f, 6.0f),
                            false
                    );
                } catch (Exception ignored) {}
            }

            List<String> wrapped = wrapText(bulletText, fontRegular, 7.68f, bulletTextMaxW);
            canvas.setFillColor(KotakLayout.COLOR_BLACK);
            for (String line : wrapped) {
                renderText(canvas, fontRegular, 7.68f, bulletTextX, H - curBulletY, line);
                curBulletY += 7.68f;
            }
            curBulletY += 6.0f; // space between bullets
        }

        // 3. Red Banner: Commonly Used Narrations (y = 563.0, height 25.0)
        canvas.setFillColor(KotakLayout.COLOR_KOTAK_RED);
        canvas.rectangle(36.0f, H - 563.0f - 25.0f, 523.0f, 25.0f);
        canvas.fill();

        String narTitle = "Commonly Used Narrations";
        float nw = fontRegular.getWidth(narTitle, 12.0f);
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        renderText(canvas, fontRegular, 12.0f, 36.0f + (523.0f - nw) / 2.0f, H - 563.0f - 17.5f, narTitle);

        // 4. Narrations Table (36.0 to 559.0, height 178.0, 13 rows)
        float narTopY = 588.0f;
        float narRowH = 13.68f;

        canvas.setStrokeColor(KotakLayout.COLOR_LINE_GREY);
        canvas.setLineWidth(0.5f);
        canvas.rectangle(36.0f, H - (narTopY + 13 * narRowH), 523.0f, 13 * narRowH);
        canvas.stroke();

        // Middle vertical divider line at x = 297.5f
        canvas.moveTo(297.5f, H - narTopY);
        canvas.lineTo(297.5f, H - (narTopY + 13 * narRowH));
        canvas.stroke();

        for (int r = 0; r < NARRATIONS_DATA.length; r++) {
            float rowY = narTopY + r * narRowH;
            float baseY = H - rowY - 10.0f;

            if (r > 0) {
                canvas.moveTo(36.0f, H - rowY);
                canvas.lineTo(559.0f, H - rowY);
                canvas.stroke();
            }

            canvas.setFillColor(KotakLayout.COLOR_BLACK);
            renderText(canvas, fontRegular, 7.7f, 39.0f, baseY, NARRATIONS_DATA[r][0]);
            renderText(canvas, fontRegular, 7.7f, 300.5f, baseY, NARRATIONS_DATA[r][1]);
        }

        canvas.restoreState();
    }

    // -------------------------------------------------------------------------
    // PAGE FOOTER
    // -------------------------------------------------------------------------
    private void renderPageFooter(PdfCanvas canvas, PdfFont fontRegular, String generatedOnStr,
                                  int pageNum, int totalPages) {
        float H = KotakLayout.PAGE_HEIGHT;

        canvas.saveState();
        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);

        // Generated on
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.6f);
        canvas.moveText(36.0f, H - 826.0f);
        canvas.showText(generatedOnStr);
        canvas.endText();

        // Page X of Y
        String pageStr = "Page " + pageNum + " of " + totalPages;
        float pw = fontRegular.getWidth(pageStr, 10.0f);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 10.0f);
        canvas.moveText(559.0f - pw, H - 826.0f);
        canvas.showText(pageStr);
        canvas.endText();

        canvas.restoreState();
    }

    // -------------------------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------------------------
    private void renderText(PdfCanvas canvas, PdfFont font, float fontSize, float x, float y, String text) {
        canvas.beginText();
        canvas.setFontAndSize(font, fontSize);
        canvas.moveText(x, y);
        canvas.showText(text);
        canvas.endText();
    }

    private void renderCenterText(PdfCanvas canvas, PdfFont font, float fontSize, float minX, float maxX, float y, String text) {
        float w = font.getWidth(text, fontSize);
        float x = minX + (maxX - minX - w) / 2.0f;
        renderText(canvas, font, fontSize, x, y, text);
    }

    private List<List<Transaction>> paginateTransactions(List<Transaction> transactions, PdfFont font) {
        List<List<Transaction>> pages = new ArrayList<>();
        if (transactions == null || transactions.isEmpty()) {
            return pages;
        }

        float colDescWidth = 271.66f - 116.19f - 6.0f;
        List<Transaction> curPage = new ArrayList<>();
        float curY = KotakLayout.PAGE_1_ROWS_START_Y + 14.0f;
        float maxY = KotakLayout.PAGE_1_MAX_Y;

        for (Transaction tx : transactions) {
            List<String> lines = wrapText(tx.details() != null ? tx.details() : "", font, 7.7f, colDescWidth);
            float h = lines.size() <= 1 ? 15.0f : (lines.size() == 2 ? 21.36f : 29.0f);

            if (curY + h > maxY) {
                pages.add(curPage);
                curPage = new ArrayList<>();
                curY = KotakLayout.PAGE_N_ROWS_START_Y;
                maxY = KotakLayout.PAGE_N_MAX_Y;
            }

            curPage.add(tx);
            curY += h;
        }

        if (!curPage.isEmpty()) {
            pages.add(curPage);
        }

        return pages;
    }

    private List<String> wrapText(String text, PdfFont font, float fontSize, float maxWidth) {
        List<String> result = new ArrayList<>();
        if (text == null || text.isBlank()) {
            result.add("");
            return result;
        }

        List<String> tokens = new ArrayList<>();
        String[] spaceTokens = text.split(" ");
        for (String st : spaceTokens) {
            if (st.contains("/") && font.getWidth(st, fontSize) > maxWidth) {
                String[] slashParts = st.split("(?<=/)");
                for (String sp : slashParts) {
                    tokens.add(sp);
                }
            } else {
                tokens.add(st);
            }
        }

        StringBuilder currentLine = new StringBuilder();
        for (String token : tokens) {
            String candidate = currentLine.length() == 0 ? token
                    : (currentLine.toString().endsWith("/") || token.endsWith("/") ? currentLine + token : currentLine + " " + token);
            float w = font.getWidth(candidate, fontSize);
            if (w <= maxWidth) {
                currentLine.setLength(0);
                currentLine.append(candidate);
            } else {
                if (currentLine.length() > 0) {
                    result.add(currentLine.toString());
                    currentLine = new StringBuilder(token);
                } else {
                    // Token alone exceeds maxWidth: split by characters
                    StringBuilder piece = new StringBuilder();
                    for (char ch : token.toCharArray()) {
                        if (font.getWidth(piece.toString() + ch, fontSize) > maxWidth) {
                            if (piece.length() > 0) {
                                result.add(piece.toString());
                                piece = new StringBuilder();
                            }
                        }
                        piece.append(ch);
                    }
                    if (piece.length() > 0) {
                        currentLine = piece;
                    }
                }
            }
        }

        if (currentLine.length() > 0) {
            result.add(currentLine.toString());
        }

        return result;
    }

    private String formatKotakDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) return "01 Oct 2026";
        try {
            if (rawDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
                LocalDate ld = LocalDate.parse(rawDate);
                return ld.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
            } else if (rawDate.matches("\\d{2}/\\d{2}/\\d{4}")) {
                LocalDate ld = LocalDate.parse(rawDate, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                return ld.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
            } else if (rawDate.matches("\\d{2}-\\d{2}-\\d{4}")) {
                LocalDate ld = LocalDate.parse(rawDate, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                return ld.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
            }
        } catch (Exception ignored) {}
        return rawDate;
    }

    private byte[] loadResourceBytes(String resourcePath) {
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            if (is != null) {
                return is.readAllBytes();
            }
        } catch (Exception ignored) {}
        return null;
    }
}
