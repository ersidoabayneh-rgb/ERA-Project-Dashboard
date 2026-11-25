import { jsPDF } from 'jspdf';
import {
  ConsultantEvaluationCriterion,
  DimensionId,
  Project,
  QualitativeGradeThreshold,
  SupervisionConsultantInfo,
  User
} from '../types';
import {
  CONSULTANT_EVALUATION_CRITERIA,
  DEFAULT_GRADE_THRESHOLDS,
  DIMENSIONS_META,
  getCriterionSourceInfo,
  parseJvEntities
} from '../data/consultantEvaluationMatrix';
import {
  drawStandardPdfPageFrame,
  enforceArchivedProjectDataSource,
  getCredentialSignatures,
  safeSplitText,
  STRICT_1_INCH_MARGIN
} from './pdfReportEngine';

export type Section2PaperPrintMode = 'blank_paper' | 'with_current_scores';

export interface CriterionEvaluationEntry {
  score?: number;
  notes?: string;
  autoEvaluated?: boolean;
  isUserEvaluated?: boolean;
  calculationSource?: string;
  evaluator?: string;
  evaluatedAt?: string;
}

export interface Section2PdfOptions {
  project: Project;
  consultant: SupervisionConsultantInfo;
  criteriaList?: ConsultantEvaluationCriterion[];
  evaluations?: Record<string, CriterionEvaluationEntry>;
  customCriterionWeights?: Record<string, number>;
  customThresholds?: QualitativeGradeThreshold[];
  contractTypeMode?: 'ALL' | 'DB' | 'DBB';
  entityScopeLabel?: string;
  paperMode?: Section2PaperPrintMode;
  includeRubrics?: boolean;
  includeSummarySheet?: boolean;
  evaluationPeriodLabel?: string;
  currentUser?: User | any;
}

const DIMENSION_ORDER: DimensionId[] = ['A', 'B', 'C', 'D', 'E'];

const DIMENSION_RGB: Record<DimensionId, { banner: [number, number, number]; accent: [number, number, number]; tint: [number, number, number] }> = {
  A: { banner: [30, 58, 138], accent: [79, 70, 229], tint: [238, 242, 255] },
  B: { banner: [146, 64, 14], accent: [217, 119, 6], tint: [255, 251, 235] },
  C: { banner: [3, 105, 161], accent: [2, 132, 199], tint: [240, 249, 255] },
  D: { banner: [6, 95, 70], accent: [5, 150, 105], tint: [236, 253, 245] },
  E: { banner: [88, 28, 135], accent: [124, 58, 237], tint: [245, 243, 255] }
};

function drawPaperCheckboxes(
  doc: jsPDF,
  x: number,
  y: number,
  colW: number,
  rowH: number,
  checkedScore?: number
) {
  const ratings = [1, 2, 3, 4, 5];
  const boxSize = 9;
  const labelGap = 2.5;
  const itemSpan = Math.min(22, (colW - 10) / 5);
  const totalWidth = itemSpan * 5;
  const startX = x + Math.max(4, (colW - totalWidth) / 2);
  const centerY = y + Math.min(18, Math.max(11, rowH / 2 - boxSize / 2));

  ratings.forEach((rating, idx) => {
    const rx = startX + idx * itemSpan;
    const isChecked = checkedScore !== undefined && Math.round(checkedScore) === rating;

    if (isChecked) {
      doc.setFillColor(30, 64, 175);
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.9);
      doc.rect(rx, centerY, boxSize, boxSize, 'FD');

      // White checkmark inside box
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.1);
      doc.line(rx + 2, centerY + 4.8, rx + 3.9, centerY + 6.8);
      doc.line(rx + 3.9, centerY + 6.8, rx + 7.2, centerY + 2.4);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.75);
      doc.rect(rx, centerY, boxSize, boxSize, 'FD');
    }

    doc.setFont('helvetica', isChecked ? 'bold' : 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(isChecked ? 30 : 51, isChecked ? 64 : 65, isChecked ? 175 : 85);
    doc.text(String(rating), rx + boxSize + labelGap, centerY + boxSize - 1.5);
  });

  // Subtle helper scale caption beneath boxes when tall enough
  if (rowH >= 32) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.setTextColor(148, 163, 184);
    doc.text('1=Deficient   3=Accept.   5=Superior', x + colW / 2, centerY + boxSize + 9, { align: 'center' });
  }
}

export function generateSection2EvaluationPdf(options: Section2PdfOptions): jsPDF {
  const rawProject = options.project;
  const project = enforceArchivedProjectDataSource(rawProject, () => rawProject);
  const consultant = options.consultant || project.supervisionConsultant || {
    firmName: project.consultant || 'N/A',
    residentEngineerName: 'N/A',
    contractRefNo: 'N/A',
    contractSignDate: '',
    commencementDate: '',
    originalCompletionDate: '',
    revisedCompletionDate: '',
    originalFeeEtb: 0,
    associationType: 'Sole Consultant',
    personnel: [],
    invoices: []
  };

  const contractTypeMode = options.contractTypeMode || project.contractType || 'ALL';
  const paperMode: Section2PaperPrintMode = options.paperMode || 'blank_paper';
  const includeRubrics = options.includeRubrics !== false;
  const includeSummarySheet = options.includeSummarySheet !== false;
  const customWeights = options.customCriterionWeights || consultant.customCriterionWeights || {};
  const thresholds = (options.customThresholds && options.customThresholds.length > 0)
    ? options.customThresholds
    : (consultant.customGradeThresholds && consultant.customGradeThresholds.length > 0)
      ? consultant.customGradeThresholds
      : DEFAULT_GRADE_THRESHOLDS;

  const baseCriteria = (options.criteriaList && options.criteriaList.length > 0)
    ? options.criteriaList
    : (consultant.customConsultantEvaluationCriteria && consultant.customConsultantEvaluationCriteria.length > 0)
      ? consultant.customConsultantEvaluationCriteria
      : CONSULTANT_EVALUATION_CRITERIA;

  const activeCriteria = baseCriteria.filter(c => {
    if (contractTypeMode === 'ALL') return true;
    if (!c.contractType || c.contractType === 'ALL') return true;
    return c.contractType === contractTypeMode;
  });

  const parsedJv = parseJvEntities(consultant.firmName, consultant.jvPartners, consultant.associationType);
  const entityScopeLabel = options.entityScopeLabel || (
    parsedJv.isSole
      ? `Sole Consultant (${consultant.firmName || 'Primary Firm'})`
      : `Joint Venture (${parsedJv.leadName} [${consultant.leadSharePct ?? parsedJv.leadSharePct}%] & ${parsedJv.partnerName} [${consultant.partnerSharePct ?? parsedJv.partnerSharePct}%])`
  );

  const evaluations = options.evaluations || {};
  const doc = new jsPDF('l', 'pt', 'a4');
  const margin = STRICT_1_INCH_MARGIN;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let pageNumber = 1;

  const modeBadgeLabel = paperMode === 'blank_paper'
    ? 'PAPER EVALUATION INSTRUMENT (BLANK SCORING FORM)'
    : 'PAPER EVALUATION SHEET (WITH LIVE SCORE REFERENCE)';

  const drawFrameForPage = (pNo: number) =>
    drawStandardPdfPageFrame(doc, pNo, 0, {
      margin,
      title: 'SECTION 2: SUPERVISION CONSULTANT PERFORMANCE EVALUATION CRITERIA',
      subtitle: `PROJECT: ${(project.name || 'ROAD PROJECT').toUpperCase()} • ${modeBadgeLabel}`,
      projectCode: `ERA-SC-SEC2-${contractTypeMode}`,
      footerText: 'ETHIOPIAN ROADS ADMINISTRATION • SECTION 2 CONSULTANT PERFORMANCE EVALUATION CRITERIA (PAPER FORM)'
    });

  const firstFrame = drawFrameForPage(pageNumber);
  const frameX = firstFrame.contentX;
  const contentWidth = firstFrame.contentWidth;
  const contentBottom = firstFrame.contentBottom;
  let curY = firstFrame.contentY;

  // =========================================================================
  // PAGE 1: PAPER EVALUATION HEADER, METADATA & WEIGHTAGE GUIDE
  // =========================================================================
  const metaBoxH = 66;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.75);
  doc.roundedRect(frameX, curY, contentWidth, metaBoxH, 4, 4, 'FD');

  const col1X = frameX + 10;
  const col2X = frameX + contentWidth * 0.52;
  const halfColW = contentWidth * 0.46;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    safeSplitText(doc, `PROJECT: ${(project.name || 'Road Construction Supervision Project').toUpperCase()}`, halfColW, 7.5, true)[0],
    col1X,
    curY + 13
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    safeSplitText(doc, `Supervision Consultant: ${consultant.firmName || project.consultant || 'N/A'}`, halfColW, 6.8, false)[0],
    col1X,
    curY + 25
  );
  doc.text(
    safeSplitText(doc, `Entity Scope: ${entityScopeLabel}`, halfColW, 6.8, false)[0],
    col1X,
    curY + 36
  );
  doc.text(
    safeSplitText(
      doc,
      `Contract Ref: ${consultant.contractRefNo || project.id || 'N/A'}   |   Resident Engineer: ${consultant.residentEngineerName || 'N/A'}`,
      halfColW,
      6.8,
      false
    )[0],
    col1X,
    curY + 47
  );
  doc.text(
    `Criteria Scope: ${contractTypeMode === 'ALL' ? 'All Section 2 Criteria (DB + DBB + General)' : `${contractTypeMode} Contract Criteria Only`} (${activeCriteria.length} total criteria across Dimensions A–E)`,
    col1X,
    curY + 58
  );

  // Right Side: Paper Evaluation Committee Fill-In Fields
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 64, 175);
  doc.text('PAPER EVALUATION RECORD (TO BE COMPLETED BY EVALUATOR / COMMITTEE)', col2X, curY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('Evaluator Full Name: ________________________________________________', col2X, curY + 26);
  doc.text('Designation / Role:  ________________________________________________', col2X, curY + 38);
  doc.text(
    `Evaluation Period:   ${options.evaluationPeriodLabel ? options.evaluationPeriodLabel : '______________________'}     Date: ____ / ____ / 20____`,
    col2X,
    curY + 50
  );
  doc.text(
    `Form Type: ${paperMode === 'blank_paper' ? 'Blank Field/Committee Paper Form' : 'Pre-Populated Current Scores + Paper Audit'}`,
    col2X,
    curY + 60
  );

  curY += metaBoxH + 8;

  // Compact Dimension Weightage & Formula Strip
  const guideH = 54;
  const leftGuideW = contentWidth * 0.57;
  const rightGuideW = contentWidth - leftGuideW - 8;

  // Left: 5-Dimension Weight Matrix
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(frameX, curY, leftGuideW, guideH, 3, 3, 'FD');

  doc.setFillColor(15, 23, 42);
  doc.rect(frameX, curY, leftGuideW, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(255, 255, 255);
  doc.text('SECTION 2 WEIGHTING MODEL:  S = (0.30×A) + (0.25×B) + (0.20×C) + (0.15×D) + (0.10×E)', frameX + 7, curY + 9.5);

  const dimCellW = leftGuideW / 5;
  DIMENSION_ORDER.forEach((dId, i) => {
    const cx = frameX + i * dimCellW;
    const dCriteria = activeCriteria.filter(c => c.dim === dId);
    const meta = DIMENSIONS_META[dId];
    if (i > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(cx, curY + 14, cx, curY + guideH);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(DIMENSION_RGB[dId].banner[0], DIMENSION_RGB[dId].banner[1], DIMENSION_RGB[dId].banner[2]);
    doc.text(`Dim ${dId}: ${meta.weight}%`, cx + 5, curY + 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.7);
    doc.setTextColor(51, 65, 85);
    const shortDimName = safeSplitText(doc, meta.name, dimCellW - 10, 5.7, false).slice(0, 2);
    shortDimName.forEach((ln, lIdx) => {
      doc.text(ln, cx + 5, curY + 34 + lIdx * 7);
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${dCriteria.length} criteria`, cx + 5, curY + 50);
  });

  // Right: 1-5 Likert Legend & Grade Scale
  const rX = frameX + leftGuideW + 8;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rX, curY, rightGuideW, guideH, 3, 3, 'FD');

  doc.setFillColor(30, 58, 138);
  doc.rect(rX, curY, rightGuideW, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(255, 255, 255);
  doc.text('PAPER SCORING KEY (1–5 LIKERT) & GRADE THRESHOLDS', rX + 7, curY + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.1);
  doc.setTextColor(15, 23, 42);
  doc.text('[5] Superior (100%)   [4] Good (80%)   [3] Acceptable (60%)   [2] Marginal (40%)   [1] Deficient (20%)', rX + 7, curY + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  const gradeSummary = thresholds
    .map(t => `${t.grade} (${t.minScore}–${t.maxScore}%): ${t.label}`)
    .join('   |   ');
  const gradeLines = safeSplitText(doc, gradeSummary, rightGuideW - 14, 5.8, false).slice(0, 2);
  gradeLines.forEach((ln, idx) => {
    doc.text(ln, rX + 7, curY + 36 + idx * 8);
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.6);
  doc.setTextColor(100, 116, 139);
  doc.text('Instructions: Tick ONE box [1–5] per criterion row and record score & justification remarks.', rX + 7, curY + 50.5);

  curY += guideH + 10;

  // =========================================================================
  // COLUMN GEOMETRY FOR CRITERIA TABLE
  // =========================================================================
  const cols = includeRubrics
    ? [
        { key: 'code', header: 'Code & Mode', width: 52, align: 'center' as const },
        { key: 'criterion', header: 'Evaluation Criterion, Metric & Source Reference', width: 238, align: 'left' as const },
        { key: 'weight', header: 'Net Wt.', width: 42, align: 'center' as const },
        { key: 'rubric', header: 'Scoring Benchmarks (Likert 5 -> 1)', width: 204, align: 'left' as const },
        { key: 'boxes', header: 'Paper Rating (Tick 1–5)', width: 118, align: 'center' as const },
        { key: 'remarks', header: paperMode === 'blank_paper' ? 'Score & Written Remarks' : 'Live Score & Remarks', width: contentWidth - (52 + 238 + 42 + 204 + 118), align: 'left' as const }
      ]
    : [
        { key: 'code', header: 'Code & Mode', width: 56, align: 'center' as const },
        { key: 'criterion', header: 'Evaluation Criterion, Metric & Source Reference', width: 368, align: 'left' as const },
        { key: 'weight', header: 'Net Wt.', width: 46, align: 'center' as const },
        { key: 'boxes', header: 'Paper Rating (Tick 1–5)', width: 124, align: 'center' as const },
        { key: 'remarks', header: paperMode === 'blank_paper' ? 'Score & Written Remarks' : 'Live Score & Remarks', width: contentWidth - (56 + 368 + 46 + 124), align: 'left' as const }
      ];

  const drawDimensionBanner = (dimId: DimensionId, isContinuation: boolean, dimCount: number, dimWeightSum: number): number => {
    const meta = DIMENSIONS_META[dimId];
    const palette = DIMENSION_RGB[dimId];
    const bannerH = isContinuation ? 18 : 26;

    doc.setFillColor(palette.banner[0], palette.banner[1], palette.banner[2]);
    doc.rect(frameX, curY, contentWidth, bannerH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(255, 255, 255);
    const titleStr = `DIMENSION ${dimId}: ${meta.name.toUpperCase()} (Weight: ${meta.weight}%)${isContinuation ? ' — CONTINUED' : ''}`;
    doc.text(titleStr, frameX + 8, curY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(226, 232, 240);
    doc.text(`${dimCount} Criteria  |  Active Net Weight: ${dimWeightSum.toFixed(2)}%`, frameX + contentWidth - 8, curY + 11, { align: 'right' });

    if (!isContinuation) {
      const descLine = safeSplitText(doc, meta.description, contentWidth - 16, 6.2, false)[0] || '';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(241, 245, 249);
      doc.text(descLine, frameX + 8, curY + 21);
    }

    curY += bannerH;
    return curY;
  };

  const drawCriteriaTableHeader = (): number => {
    const hHeight = 18;
    doc.setFillColor(15, 23, 42);
    doc.rect(frameX, curY, contentWidth, hHeight, 'F');

    let colX = frameX;
    cols.forEach((col, cIdx) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.6);
      doc.setTextColor(255, 255, 255);

      const textX = col.align === 'center' ? colX + col.width / 2 : colX + 5;
      doc.text(col.header, textX, curY + 11.5, { align: col.align === 'center' ? 'center' : 'left' });

      if (cIdx < cols.length - 1) {
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.5);
        doc.line(colX + col.width, curY, colX + col.width, curY + hHeight);
      }
      colX += col.width;
    });

    curY += hHeight;
    return curY;
  };

  const handlePageBreak = (dimId?: DimensionId, dimCount?: number, dimWeightSum?: number) => {
    doc.addPage();
    pageNumber += 1;
    const nextFrame = drawFrameForPage(pageNumber);
    curY = nextFrame.contentY;
    if (dimId && dimCount !== undefined && dimWeightSum !== undefined) {
      drawDimensionBanner(dimId, true, dimCount, dimWeightSum);
      drawCriteriaTableHeader();
    }
  };

  // Track per-dimension statistics for Summary Sheet
  const dimSummaryStats: Array<{
    dimId: DimensionId;
    name: string;
    dimWeight: number;
    criteriaCount: number;
    netWeightSum: number;
    avgScore?: number;
    earnedPct?: number;
  }> = [];

  // =========================================================================
  // RENDER ALL DIMENSIONS A -> E AND ALL CRITERIA GROUPED BY SUB-CATEGORY
  // =========================================================================
  DIMENSION_ORDER.forEach(dimId => {
    const dimCriteria = activeCriteria.filter(c => c.dim === dimId);
    if (dimCriteria.length === 0) return;

    const dimWeightSum = dimCriteria.reduce(
      (sum, c) => sum + (customWeights[c.code] !== undefined ? customWeights[c.code] : c.effectiveWeight),
      0
    );

    // Ensure banner + table header + parent header + first row fit cleanly before starting new dimension
    if (curY + 108 > contentBottom) {
      handlePageBreak();
    } else if (curY > firstFrame.contentY + 140) {
      curY += 6;
    }

    drawDimensionBanner(dimId, false, dimCriteria.length, dimWeightSum);
    drawCriteriaTableHeader();

    // Group by parent sub-category in original order
    const parentGroups: Array<{
      ref: string;
      parentName: string;
      parentWeight: number;
      items: ConsultantEvaluationCriterion[];
    }> = [];
    const groupMap = new Map<string, number>();

    dimCriteria.forEach(c => {
      const key = `${c.dim}_${c.ref}`;
      const existingIdx = groupMap.get(key);
      if (existingIdx === undefined) {
        groupMap.set(key, parentGroups.length);
        parentGroups.push({
          ref: c.ref,
          parentName: c.parentName,
          parentWeight: c.parentWeight,
          items: [c]
        });
      } else {
        parentGroups[existingIdx].items.push(c);
      }
    });

    let dimScoreWeightedSum = 0;
    let dimWeightUsed = 0;

    parentGroups.forEach(group => {
      const groupNetWeight = group.items.reduce(
        (s, item) => s + (customWeights[item.code] !== undefined ? customWeights[item.code] : item.effectiveWeight),
        0
      );

      // Avoid orphaned parent category header at bottom of page
      if (curY + 62 > contentBottom) {
        handlePageBreak(dimId, dimCriteria.length, dimWeightSum);
      }

      const subHeaderH = 16;
      const palette = DIMENSION_RGB[dimId];
      doc.setFillColor(palette.tint[0], palette.tint[1], palette.tint[2]);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.rect(frameX, curY, contentWidth, subHeaderH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(palette.banner[0], palette.banner[1], palette.banner[2]);
      doc.text(`[${group.ref}] ${group.parentName.toUpperCase()}`, frameX + 6, curY + 10.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Category Share: ${group.parentWeight}% of Dim ${dimId}   •   Net Weight: ${groupNetWeight.toFixed(2)}%   •   ${group.items.length} Criteria`,
        frameX + contentWidth - 6,
        curY + 10.5,
        { align: 'right' }
      );
      curY += subHeaderH;

      group.items.forEach((criterion, rowIdx) => {
        const netWt = customWeights[criterion.code] !== undefined ? customWeights[criterion.code] : criterion.effectiveWeight;
        const srcInfo = getCriterionSourceInfo(criterion);
        const ev = evaluations[criterion.code];
        const liveScore = ev?.score;

        if (liveScore !== undefined) {
          dimScoreWeightedSum += (liveScore / 5) * netWt;
          dimWeightUsed += netWt;
        }

        // Prepare wrapped lines per cell to measure exact row height
        const padX = 5;
        const padY = 4;

        const codeColW = cols[0].width;
        const critColW = cols[1].width;
        const wtColW = cols[2].width;

        const contractTag = criterion.contractType && criterion.contractType !== 'ALL' ? criterion.contractType : 'ALL';
        const srcShortTag =
          srcInfo.source === 'auto_submittal'
            ? 'Auto: Submittal'
            : srcInfo.source === 'auto_database'
              ? 'Auto: DB'
              : 'Evaluator';

        const critTitleLines = safeSplitText(doc, criterion.name, critColW - padX * 2, 6.9, true);
        const metaLineParts = [
          criterion.metric ? `Metric: ${criterion.metric}` : '',
          criterion.dataSource ? `Source: ${criterion.dataSource}` : '',
          criterion.eraFidicRef ? `Ref: ${criterion.eraFidicRef}` : ''
        ].filter(Boolean);
        const critMetaLines = metaLineParts.length > 0
          ? safeSplitText(doc, metaLineParts.join('  |  '), critColW - padX * 2, 5.7, false)
          : [];

        let rubricLines: Array<{ text: string; isHead?: boolean }> = [];
        if (includeRubrics) {
          const rubricColW = cols[3].width;
          const b = criterion.benchmarks || { score5: '-', score4: '-', score3: '-', score2: '-', score1: '-' };
          const pairs: Array<[string, string]> = [
            ['5:', b.score5 || '-'],
            ['4:', b.score4 || '-'],
            ['3:', b.score3 || '-'],
            ['2:', b.score2 || '-'],
            ['1:', b.score1 || '-']
          ];
          pairs.forEach(([prefix, desc]) => {
            const wrapped = safeSplitText(doc, `${prefix} ${desc}`, rubricColW - padX * 2, 5.7, false);
            wrapped.forEach((line, i) => rubricLines.push({ text: line, isHead: i === 0 }));
          });
        }

        const remarksCol = cols[cols.length - 1];
        let remarksLines: string[] = [];
        if (paperMode === 'with_current_scores') {
          const noteStr = ev?.notes ? ev.notes.trim() : '';
          if (noteStr) {
            remarksLines = safeSplitText(doc, noteStr, remarksCol.width - padX * 2, 5.7, false).slice(0, 4);
          }
        }

        const critBlockH = critTitleLines.length * 8.4 + (critMetaLines.length > 0 ? critMetaLines.length * 7.2 + 2 : 0);
        const rubricBlockH = includeRubrics ? rubricLines.length * 7.2 : 0;
        const remarksBlockH = paperMode === 'blank_paper' ? 32 : Math.max(24, 14 + remarksLines.length * 7.2);
        const boxesMinH = 30;
        const rowH = Math.max(boxesMinH, critBlockH + padY * 2, rubricBlockH + padY * 2, remarksBlockH + padY * 2);

        // Page break guard
        if (curY + rowH > contentBottom) {
          handlePageBreak(dimId, dimCriteria.length, dimWeightSum);
        }

        // Row background (alternating subtle slate)
        if (rowIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(frameX, curY, contentWidth, rowH, 'F');

        // Draw cells left-to-right
        let colX = frameX;

        // 1. Code & Mode
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.4);
        doc.setTextColor(palette.banner[0], palette.banner[1], palette.banner[2]);
        doc.text(criterion.code, colX + codeColW / 2, curY + 11, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.4);
        doc.setTextColor(71, 85, 105);
        doc.text(`[${contractTag}]`, colX + codeColW / 2, curY + 19, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.2);
        doc.setTextColor(100, 116, 139);
        doc.text(srcShortTag, colX + codeColW / 2, curY + 26, { align: 'center' });
        colX += codeColW;

        // 2. Criterion & Metadata
        let textY = curY + padY + 6.8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.9);
        doc.setTextColor(15, 23, 42);
        critTitleLines.forEach(line => {
          doc.text(line, colX + padX, textY);
          textY += 8.4;
        });

        if (critMetaLines.length > 0) {
          textY += 1.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.7);
          doc.setTextColor(71, 85, 105);
          critMetaLines.forEach(line => {
            doc.text(line, colX + padX, textY);
            textY += 7.2;
          });
        }
        colX += critColW;

        // 3. Net Weight %
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(`${netWt.toFixed(2)}%`, colX + wtColW / 2, curY + 14, { align: 'center' });
        colX += wtColW;

        // 4. Benchmarks (if enabled)
        if (includeRubrics) {
          const rubricColW = cols[3].width;
          let rY = curY + padY + 6;
          rubricLines.forEach(item => {
            doc.setFont('helvetica', item.isHead ? 'bold' : 'normal');
            doc.setFontSize(5.7);
            doc.setTextColor(51, 65, 85);
            doc.text(item.text, colX + padX, rY);
            rY += 7.2;
          });
          colX += rubricColW;
        }

        // 5. Paper Rating Checkboxes [ ] 1 [ ] 2 [ ] 3 [ ] 4 [ ] 5
        const boxesColW = includeRubrics ? cols[4].width : cols[3].width;
        drawPaperCheckboxes(
          doc,
          colX,
          curY,
          boxesColW,
          rowH,
          paperMode === 'with_current_scores' ? liveScore : undefined
        );
        colX += boxesColW;

        // 6. Score & Remarks
        if (paperMode === 'blank_paper') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.2);
          doc.setTextColor(51, 65, 85);
          doc.text('Score: _____ / 5', colX + padX, curY + 11.5);

          // Writing lines for paper notes
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.45);
          const lineStartX = colX + padX;
          const lineEndX = colX + remarksCol.width - padX;
          for (let ly = curY + 21; ly <= curY + rowH - 5; ly += 9.5) {
            doc.line(lineStartX, ly, lineEndX, ly);
          }
        } else {
          const displayScore = liveScore !== undefined ? `${Number(liveScore).toFixed(1)} / 5` : '_____ / 5';
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(30, 64, 175);
          doc.text(`Score: ${displayScore}`, colX + padX, curY + 11.5);

          if (remarksLines.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.7);
            doc.setTextColor(51, 65, 85);
            remarksLines.forEach((ln, idx) => {
              doc.text(ln, colX + padX, curY + 20 + idx * 7.2);
            });
          } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(5.5);
            doc.setTextColor(148, 163, 184);
            doc.text('Remarks: _________________', colX + padX, curY + 22);
          }
        }

        // Cell borders & horizontal grid
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.45);
        let borderX = frameX;
        cols.forEach((col, cIdx) => {
          if (cIdx < cols.length - 1) {
            borderX += col.width;
            doc.line(borderX, curY, borderX, curY + rowH);
          }
        });
        doc.line(frameX, curY, frameX, curY + rowH);
        doc.line(frameX + contentWidth, curY, frameX + contentWidth, curY + rowH);
        doc.line(frameX, curY + rowH, frameX + contentWidth, curY + rowH);

        curY += rowH;
      });
    });

    // Dimension Footer Paper Tally Bar
    if (curY + 20 > contentBottom) {
      handlePageBreak();
    }

    const dimAvg = dimWeightUsed > 0 ? (dimScoreWeightedSum / dimWeightUsed) * 5 : undefined;
    const dimEarned = dimWeightUsed > 0 ? (dimScoreWeightedSum / dimWeightUsed) * DIMENSIONS_META[dimId].weight : undefined;

    dimSummaryStats.push({
      dimId,
      name: DIMENSIONS_META[dimId].name,
      dimWeight: DIMENSIONS_META[dimId].weight,
      criteriaCount: dimCriteria.length,
      netWeightSum: dimWeightSum,
      avgScore: dimAvg,
      earnedPct: dimEarned
    });

    const footerBarH = 18;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.6);
    doc.rect(frameX, curY, contentWidth, footerBarH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `DIMENSION ${dimId} SUBTOTAL (${dimCriteria.length} Criteria | Max Weight ${DIMENSIONS_META[dimId].weight}%)`,
      frameX + 8,
      curY + 11.5
    );

    const tallyRightText = paperMode === 'with_current_scores' && dimAvg !== undefined && dimEarned !== undefined
      ? `Avg Likert Rating: ${dimAvg.toFixed(2)} / 5.00     |     Weighted Contribution: ${dimEarned.toFixed(2)}% / ${DIMENSIONS_META[dimId].weight.toFixed(2)}%`
      : `Paper Sum / Avg Rating: _________ / 5.00     |     Earned Weighted Contribution: _________ / ${DIMENSIONS_META[dimId].weight.toFixed(2)}%`;

    doc.text(tallyRightText, frameX + contentWidth - 8, curY + 11.5, { align: 'right' });
    curY += footerBarH + 8;
  });

  // =========================================================================
  // FINAL PAPER CONSOLIDATION & OFFICIAL SIGN-OFF SUMMARY SHEET
  // =========================================================================
  if (includeSummarySheet) {
    const neededSummaryHeight = 250;
    if (curY + neededSummaryHeight > contentBottom) {
      handlePageBreak();
    } else {
      curY += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('SECTION 2 PAPER EVALUATION CONSOLIDATION SHEET & COMMITTEE SIGN-OFF', frameX, curY + 8);
    curY += 15;

    // Consolidation Summary Table
    const sumCols = [
      { header: 'Dim', width: 40, align: 'center' as const },
      { header: 'Evaluation Dimension Title', width: 270, align: 'left' as const },
      { header: 'Criteria Count', width: 78, align: 'center' as const },
      { header: 'Max Dim Weight', width: 85, align: 'center' as const },
      { header: 'Avg Likert Score (1–5)', width: 120, align: 'center' as const },
      { header: 'Earned Weighted Score (%)', width: contentWidth - (40 + 270 + 78 + 85 + 120), align: 'center' as const }
    ];

    // Table header
    doc.setFillColor(15, 23, 42);
    doc.rect(frameX, curY, contentWidth, 17, 'F');
    let sx = frameX;
    sumCols.forEach(c => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.6);
      doc.setTextColor(255, 255, 255);
      doc.text(c.header, c.align === 'center' ? sx + c.width / 2 : sx + 6, curY + 11, {
        align: c.align === 'center' ? 'center' : 'left'
      });
      sx += c.width;
    });
    curY += 17;

    let grandTotalEarned = 0;
    let hasAllEarned = true;

    dimSummaryStats.forEach((st, idx) => {
      const rowH = 18;
      doc.setFillColor(idx % 2 === 1 ? 248 : 255, idx % 2 === 1 ? 250 : 255, idx % 2 === 1 ? 252 : 255);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.rect(frameX, curY, contentWidth, rowH, 'FD');

      if (st.earnedPct !== undefined) grandTotalEarned += st.earnedPct;
      else hasAllEarned = false;

      let cx = frameX;
      const values = [
        st.dimId,
        st.name,
        String(st.criteriaCount),
        `${st.dimWeight.toFixed(1)}%`,
        paperMode === 'with_current_scores' && st.avgScore !== undefined ? `${st.avgScore.toFixed(2)} / 5.00` : '___________ / 5.00',
        paperMode === 'with_current_scores' && st.earnedPct !== undefined ? `${st.earnedPct.toFixed(2)}%` : '___________ %'
      ];

      sumCols.forEach((col, cIdx) => {
        doc.setFont('helvetica', cIdx <= 1 || cIdx === 5 ? 'bold' : 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text(values[cIdx], col.align === 'center' ? cx + col.width / 2 : cx + 6, curY + 11.5, {
          align: col.align === 'center' ? 'center' : 'left'
        });
        if (cIdx < sumCols.length - 1) {
          doc.line(cx + col.width, curY, cx + col.width, curY + rowH);
        }
        cx += col.width;
      });
      curY += rowH;
    });

    // Grand Total Row
    const totalRowH = 22;
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.8);
    doc.rect(frameX, curY, contentWidth, totalRowH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(30, 58, 138);
    doc.text(
      `COMPOSITE SECTION 2 MATRIX SCORE (Dimensions A–E Total = ${activeCriteria.length} Criteria | Max = 100.0%)`,
      frameX + 8,
      curY + 14
    );

    const grandStr = paperMode === 'with_current_scores' && hasAllEarned
      ? `${grandTotalEarned.toFixed(2)}% / 100.0%`
      : '_____________ % / 100.0%';
    doc.setFontSize(8.2);
    doc.text(grandStr, frameX + contentWidth - 10, curY + 14, { align: 'right' });
    curY += totalRowH + 8;

    // Qualitative Grade Check Strip & Committee Findings Box
    const gradeBoxH = 24;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.6);
    doc.rect(frameX, curY, contentWidth, gradeBoxH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text('FINAL PERFORMANCE GRADE ASSIGNED (TICK ONE):', frameX + 8, curY + 14.5);

    let gx = frameX + 225;
    thresholds.slice(0, 5).forEach(t => {
      const isSelected = paperMode === 'with_current_scores' && hasAllEarned && grandTotalEarned >= t.minScore && grandTotalEarned <= (t.maxScore ?? 100);
      if (isSelected) {
        doc.setFillColor(30, 64, 175);
        doc.setDrawColor(30, 64, 175);
        doc.rect(gx, curY + 7.5, 9, 9, 'FD');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1.1);
        doc.line(gx + 2, curY + 12.2, gx + 3.9, curY + 14.2);
        doc.line(gx + 3.9, curY + 14.2, gx + 7.2, curY + 9.8);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(71, 85, 105);
        doc.setLineWidth(0.75);
        doc.rect(gx, curY + 7.5, 9, 9, 'FD');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`${t.grade} (${t.minScore}–${t.maxScore}%)`, gx + 12, curY + 14.5);
      gx += 102;
    });
    curY += gradeBoxH + 8;

    // Overall Written Findings Box
    const notesH = 54;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.rect(frameX, curY, contentWidth, notesH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(71, 85, 105);
    doc.text('OVERALL EVALUATION PANEL OBSERVATIONS, DEFICIENCIES & RECOMMENDATIONS:', frameX + 8, curY + 11);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.45);
    [23, 35, 47].forEach(offset => {
      doc.line(frameX + 8, curY + offset, frameX + contentWidth - 8, curY + offset);
    });
    curY += notesH + 14;

    // Formal 3-Tier Sign-Off & Stamp Block
    const sigs = getCredentialSignatures(options.currentUser);
    const sigBoxW = (contentWidth - 24) / 3;
    const sigItems = [
      { title: 'Evaluated By / Assessment Lead', sub: `${sigs.printedBy}  |  Signature & Date` },
      { title: 'Verified & Reviewed By', sub: `${sigs.verifiedBy}  |  Signature & Date` },
      { title: 'Approved By (Authorizing Officer)', sub: `${sigs.approvedBy}  |  Signature & Official Stamp` }
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('COMMITTEE VERIFICATION & OFFICIAL SIGN-OFF', frameX, curY);
    curY += 28;

    sigItems.forEach((item, idx) => {
      const bx = frameX + idx * (sigBoxW + 12);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.75);
      doc.line(bx, curY, bx + sigBoxW, curY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(item.title, bx, curY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139);
      doc.text(item.sub, bx, curY + 19);
    });
  }

  // =========================================================================
  // BACKFILL EXACT "Page X of Y" ACROSS EVERY PAGE FOOTER
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  const footerY = pageHeight - margin - 20;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Cover the placeholder "Page X" text cleanly before drawing "Page X of Y"
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - margin - 110, footerY + 2, 106, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 6, footerY + 12, { align: 'right' });
  }

  return doc;
}

export function downloadSection2EvaluationPdf(options: Section2PdfOptions): string {
  const doc = generateSection2EvaluationPdf(options);
  const safeName = (options.project.name || 'Project')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);
  const modeTag = (options.paperMode || 'blank_paper') === 'blank_paper' ? 'Paper_Form' : 'Evaluated_Sheet';
  const scopeTag = options.contractTypeMode || options.project.contractType || 'ALL';
  const dateTag = new Date().toISOString().split('T')[0];
  const filename = `ERA_Section2_Criteria_${safeName}_${scopeTag}_${modeTag}_${dateTag}.pdf`;
  doc.save(filename);
  return filename;
}
