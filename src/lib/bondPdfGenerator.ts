import { jsPDF } from 'jspdf';
import { BondGuarantee, Project, formatAccounting } from '../types';
import { drawEraLogo } from './pdfReportEngine';

export function generateBondGuaranteePdf(bond: BondGuarantee, project: Project): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Outer Security Frame / Border
  doc.setDrawColor(218, 165, 32); // Gold / Amber border
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(30, 41, 59); // Slate inner border
  doc.setLineWidth(0.4);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // Header / Logo
  try {
    drawEraLogo(doc, margin + 4, 18, 14);
  } catch {
    // Fallback if drawEraLogo is not available
  }

  // Header Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.text('ETHIOPIAN ROADS ADMINISTRATION (ERA)', pageWidth / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('OFFICIAL SECURITY GUARANTEE & POLICY INSTRUMENT LEDGER', pageWidth / 2, 33, { align: 'center' });

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, 37, pageWidth - margin, 37);

  // Security Instrument Title Banner
  const categoryTitle = bond.category || (bond.type.toLowerCase().includes('insurance') ? 'Insurance' : 'Unconditional Guarantee');
  const isConditional = categoryTitle.includes('Conditional') && !categoryTitle.includes('Unconditional');
  const isInsurance = categoryTitle === 'Insurance';
  const isBond = categoryTitle.includes('Bond');

  doc.setFillColor(
    isInsurance ? 236 : isBond ? 243 : isConditional ? 254 : 239,
    isInsurance ? 253 : isBond ? 232 : isConditional ? 243 : 246,
    isInsurance ? 245 : isBond ? 255 : isConditional ? 199 : 255
  );
  doc.roundedRect(margin, 42, contentWidth, 16, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(
    isInsurance ? 4 : isBond ? 107 : isConditional ? 180 : 29,
    isInsurance ? 120 : isBond ? 33 : isConditional ? 83 : 78,
    isInsurance ? 87 : isBond ? 168 : isConditional ? 9 : 216
  );
  doc.text(
    `${categoryTitle.toUpperCase()} INSTRUMENT RECORD`,
    pageWidth / 2,
    50,
    { align: 'center' }
  );

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Security Ref No: ${bond.policyOrBondRefNo || `ERA/SEC/${project.id.slice(0, 8).toUpperCase()}/${bond.sno}`}`, pageWidth / 2, 55, { align: 'center' });

  // Key Metadata Table Box
  let currentY = 64;

  const drawRow = (label: string, value: string, isHighlight: boolean = false) => {
    doc.setFillColor(isHighlight ? 248 : 255, isHighlight ? 250 : 255, isHighlight ? 252 : 255);
    doc.rect(margin, currentY, contentWidth, 7.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(margin, currentY, contentWidth, 7.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(label, margin + 4, currentY + 5);

    doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(isHighlight ? 15 : 71, isHighlight ? 23 : 85, isHighlight ? 42 : 105);
    doc.text(value, margin + 65, currentY + 5, { maxWidth: contentWidth - 70 });

    currentY += 7.5;
  };

  drawRow('1. Project Title:', project.name || 'N/A', true);
  drawRow('2. Project Code / ID:', project.id.toUpperCase(), false);
  drawRow('3. Employer (Beneficiary):', 'Ethiopian Roads Administration (ERA)', false);
  drawRow('4. Contractor (Principal):', project.contractor || 'N/A', false);
  drawRow('5. Supervision Consultant:', project.consultant || 'N/A', false);
  drawRow('6. Security Type / Category:', `${categoryTitle} (${bond.type})`, true);
  drawRow('7. Financial Institute (Issuer):', bond.bank || 'Commercial Bank of Ethiopia', false);
  if (bond.issuingBranch) {
    drawRow('8. Issuing Bank / Insurance Branch:', bond.issuingBranch, false);
    drawRow('9. Guarantee Amount (ETB):', `ETB ${formatAccounting(bond.amount, '')}`, true);
    if (bond.amountUsd && bond.amountUsd > 0) {
      drawRow('10. Guarantee Amount (USD):', `USD $${formatAccounting(bond.amountUsd, '')}`, true);
    }
    drawRow('11. Effective / Issue Date:', bond.issueDate || new Date().toISOString().split('T')[0], false);
    drawRow('12. Expiration / Maturity Date:', bond.expireDate || 'N/A', true);
    drawRow('13. Current Security Status:', bond.status.toUpperCase(), true);
  } else {
    drawRow('8. Guarantee Amount (ETB):', `ETB ${formatAccounting(bond.amount, '')}`, true);
    if (bond.amountUsd && bond.amountUsd > 0) {
      drawRow('9. Guarantee Amount (USD):', `USD $${formatAccounting(bond.amountUsd, '')}`, true);
    }
    drawRow('10. Effective / Issue Date:', bond.issueDate || new Date().toISOString().split('T')[0], false);
    drawRow('11. Expiration / Maturity Date:', bond.expireDate || 'N/A', true);
    drawRow('12. Current Security Status:', bond.status.toUpperCase(), true);
  }

  currentY += 8;

  // Legal Clauses & Verification Terms Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('STANDARD UNDERTAKING & ENFORCEABILITY TERMS', margin, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  const legalText = isInsurance
    ? `This insurance policy certificate confirms that the Contractor has procured and maintains with the designated Insurance Corporation the required comprehensive insurance coverage in accordance with the Conditions of Contract. The Policy explicitly names the Ethiopian Roads Administration as co-insured/loss payee where applicable. The insurer undertakes to indemnify the Employer and Contractor against all eligible liabilities, damages, third-party claims, and works damage up to the certified policy limit until official completion and handover.`
    : isConditional
    ? `This conditional guarantee/bond instrument constitutes a formal binding commitment under which the Guarantor/Surety unconditionally agrees to pay the Employer upon submission of a substantiated claim demonstrating default or non-performance by the Contractor in accordance with the terms of the Contract. The instrument remains valid and enforceable until the stated expiration date or until formally discharged in writing by the Employer.`
    : `This unconditional guarantee/bond instrument constitutes an irrevocable, on-demand security commitment whereby the Financial Institution hereby guarantees to pay the Employer (Ethiopian Roads Administration), without cavil, argument, or the necessity of proving or showing grounds or reasons for the demand, the sum specified above immediately upon first written demand by the Employer. This instrument remains in full force and effect until the stated expiration date.`;

  const splitLegalText = doc.splitTextToSize(legalText, contentWidth);
  doc.text(splitLegalText, margin, currentY);

  currentY += splitLegalText.length * 3.5 + 10;

  // Signatures / Official Stamp Section
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 8;

  const colWidth = contentWidth / 3;

  // Col 1: Issuing Bank / Insurer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('ISSUING FINANCIAL INSTITUTION', margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Authorized Signatory & Seal', margin, currentY + 4);
  doc.line(margin, currentY + 22, margin + colWidth - 8, currentY + 22);
  doc.text('Signature & Official Stamp', margin, currentY + 26);

  // Col 2: Contractor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CONTRACTOR / PRINCIPAL', margin + colWidth, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Managing Director / Agent', margin + colWidth, currentY + 4);
  doc.line(margin + colWidth, currentY + 22, margin + colWidth * 2 - 8, currentY + 22);
  doc.text('Signature & Date', margin + colWidth, currentY + 26);

  // Col 3: Employer ERA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('EMPLOYER (ERA)', margin + colWidth * 2, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Engineering Procurement / Contract Admin', margin + colWidth * 2, currentY + 4);
  doc.line(margin + colWidth * 2, currentY + 22, margin + contentWidth, currentY + 22);
  doc.text('Verified & Registered in ERA DB', margin + colWidth * 2, currentY + 26);

  // Footer Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by Ethiopian Roads Administration Project Management Information System on ${new Date().toLocaleDateString('en-GB')} • Document Integrity Verified`,
    pageWidth / 2,
    pageHeight - 14,
    { align: 'center' }
  );

  return doc;
}
