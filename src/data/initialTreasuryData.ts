import { TreasuryBankAccount, PaymentInstruction, WebhookLog } from '../types/treasury';

export const INITIAL_TREASURY_ACCOUNTS: TreasuryBankAccount[] = [
  {
    id: 'acc_cbe_main',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    accountName: 'ERA Central Treasury Operations',
    accountNumber: '1000003928172',
    currency: 'ETB',
    clearedBalance: 4820500000.00,
    reservedCommitments: 229150000.00,
    availableBalance: 4591350000.00,
    lastUpdated: '2026-09-24T08:30:00.000Z',
    colorScheme: 'indigo',
    isFx: false,
    swiftBic: 'CBETETAA',
    branch: 'Addis Ababa Central Branch'
  },
  {
    id: 'acc_dashen_escrow',
    bankName: 'Dashen Bank SC',
    accountName: 'ERA Contractor Retention & Escrow Pool',
    accountNumber: '0092182746101',
    currency: 'ETB',
    clearedBalance: 1415200000.00,
    reservedCommitments: 54000000.00,
    availableBalance: 1361200000.00,
    lastUpdated: '2026-09-24T08:15:00.000Z',
    colorScheme: 'amber',
    isFx: false,
    swiftBic: 'DASHETAA',
    branch: 'Bole Medhanealem Corporate'
  },
  {
    id: 'acc_awash_ops',
    bankName: 'Awash International Bank',
    accountName: 'ERA Infrastructure Capital Dev Account',
    accountNumber: '0143892019481',
    currency: 'ETB',
    clearedBalance: 984750000.00,
    reservedCommitments: 18250000.00,
    availableBalance: 966500000.00,
    lastUpdated: '2026-09-24T07:45:00.000Z',
    colorScheme: 'emerald',
    isFx: false,
    swiftBic: 'AWINETAA',
    branch: 'Ras Abebe Aregay Corporate'
  },
  {
    id: 'acc_citi_fx',
    bankName: 'Citibank N.A. London / Deutsche Bank',
    accountName: 'ERA NBE Strategic FX Disbursal Reserve',
    accountNumber: 'GB82CITI182739401928',
    currency: 'USD',
    clearedBalance: 48650000.00,
    reservedCommitments: 840000.00,
    availableBalance: 47810000.00,
    lastUpdated: '2026-09-24T08:00:00.000Z',
    colorScheme: 'blue',
    isFx: true,
    swiftBic: 'CITIGB2L',
    branch: 'Canary Wharf FX Desk'
  }
];

export const INITIAL_PAYMENT_INSTRUCTIONS: PaymentInstruction[] = [
  {
    id: 'PAY-ERA-2026-0089',
    projectReference: 'ERA/ICB/R-2023/LOT-04',
    projectName: 'Modjo - Hawassa Expressway (Phase II - Lot 4)',
    category: 'IPC_VALUATION',
    purpose: 'Interim Payment Certificate IPC #14 - Asphalt Concrete Wearing Course & Drainage Structures',
    amount: 142500000.00,
    currency: 'ETB',
    payee: {
      name: 'China Civil Engineering Construction Corp (CCECC)',
      tin: '0019284751',
      entityType: 'Contractor',
      contactEmail: 'treasury.ccecc.eth@ccecc.com.cn',
      contactPhone: '+251 11 663 8820'
    },
    destinationBank: {
      bankName: 'Commercial Bank of Ethiopia',
      accountNumber: '1000182739485',
      swiftBic: 'CBETETAA',
      branchName: 'Finfine Special Branch'
    },
    status: 'Processing',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: 'Eng. Habtamu Tegegne (Director General)',
    createdAt: '2026-09-24T06:15:00.000Z',
    supportingDocuments: [
      {
        id: 'doc-0089-1',
        name: 'IPC_14_Valuation_Certificate_Signed.pdf',
        type: 'Engineer IPC Certificate',
        fileSize: '4.2 MB',
        referenceCode: 'ERA-ENG-CERT-2026-118',
        verificationStatus: 'Verified',
        uploadedAt: '2026-09-24T06:15:00.000Z'
      },
      {
        id: 'doc-0089-2',
        name: 'Ministry_of_Revenue_VAT_Tax_Clearance_Q3.pdf',
        type: 'Tax Clearance',
        fileSize: '1.8 MB',
        referenceCode: 'MOR-ET-CLR-8839102',
        verificationStatus: 'Verified',
        uploadedAt: '2026-09-24T06:16:00.000Z'
      }
    ],
    approvalNotes: 'Verified against IPC #14 signed by Supervising Engineer Scott Wilson JV. FIDIC Cl. 14.7 56-day deadline strictly observed.',
    reviewerCommentary: 'Verified against IPC #14 signed by Supervising Engineer Scott Wilson JV. FIDIC Cl. 14.7 56-day deadline strictly observed. Approved for bank gateway transfer.',
    approvedByRole: 'FINANCIAL_DIRECTOR',
    approvedByName: 'Ato Berhanu Zeleke (Financial Director)',
    approvedAt: '2026-09-24T07:20:00.000Z',
    gatewayTransactionId: 'ADY-TRF-99238102',
    gatewayPlatform: 'Adyen BalancePlatform',
    executedAt: '2026-09-24T07:22:00.000Z',
    linkedBankAccountId: 'acc_cbe_main',
    reviewHistory: [
      {
        id: 'rev-89-1',
        timestamp: '2026-09-24T07:20:00.000Z',
        reviewerName: 'Ato Berhanu Zeleke',
        reviewerRole: 'Financial Management Director',
        decision: 'APPROVED',
        reviewerCommentary: 'Verified against IPC #14 signed by Supervising Engineer Scott Wilson JV. FIDIC Cl. 14.7 56-day deadline strictly observed. Approved for bank gateway transfer.',
        previousStatus: 'Pending',
        newStatus: 'Approved'
      }
    ],
    editHistory: [
      {
        id: 'edit-89-1',
        timestamp: '2026-09-24T06:45:00.000Z',
        editorName: 'Eng. Habtamu Tegegne',
        editorRole: 'Director General',
        previousAmount: 145000000.00,
        newAmount: 142500000.00,
        previousCurrency: 'ETB',
        newCurrency: 'ETB',
        actionTaken: 'RESUBMIT_FOR_AUDIT',
        justification: 'Deducted 2% provisional advance recovery per Scott Wilson IPC summary audit.',
        previousStatus: 'Pending',
        newStatus: 'Pending'
      }
    ],
    auditTrail: [
      {
        id: 'aud-89-1',
        timestamp: '2026-09-24T06:15:00.000Z',
        action: 'INSTRUCTION_CREATED',
        actor: 'Eng. Habtamu Tegegne',
        role: 'Director General',
        notes: 'Submitted IPC #14 payment instruction for ETB 142,500,000.00'
      },
      {
        id: 'aud-89-2',
        timestamp: '2026-09-24T07:20:00.000Z',
        action: 'INSTRUCTION_APPROVED',
        actor: 'Ato Berhanu Zeleke',
        role: 'Financial Director',
        notes: 'Compliance validation passed. Certified for bank gateway transfer.'
      },
      {
        id: 'aud-89-3',
        timestamp: '2026-09-24T07:22:00.000Z',
        action: 'GATEWAY_DISPATCHED',
        actor: 'Ato Berhanu Zeleke',
        role: 'Financial Director',
        notes: 'Dispatched to Adyen BalancePlatform with Gateway Tx ID ADY-TRF-99238102. Awaiting 200 OK webhook sync.'
      }
    ]
  },
  {
    id: 'PAY-ERA-2026-0090',
    projectReference: 'ERA/NCB/W-2024/LOT-01',
    projectName: 'Gore - Tepi Road Upgrading Project (Km 0+000 - 45+000)',
    category: 'ADVANCE_MOBILIZATION',
    purpose: '10% Advance Payment Mobilization against Unconditional Bank Guarantee',
    amount: 68400000.00,
    currency: 'ETB',
    payee: {
      name: 'Sur Construction PLC',
      tin: '0003849182',
      entityType: 'Contractor',
      contactEmail: 'finance@surconstruction.com.et',
      contactPhone: '+251 11 551 2299'
    },
    destinationBank: {
      bankName: 'Dashen Bank SC',
      accountNumber: '0029384756102',
      swiftBic: 'DASHETAA',
      branchName: 'Meskel Square Corporate'
    },
    status: 'Pending',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: 'Eng. Habtamu Tegegne (Director General)',
    createdAt: '2026-09-24T07:45:00.000Z',
    supportingDocuments: [
      {
        id: 'doc-0090-1',
        name: 'Advance_Payment_Bank_Guarantee_10Pct.pdf',
        type: 'Bank Guarantee',
        fileSize: '3.1 MB',
        referenceCode: 'BG-DASH-2026-8841',
        verificationStatus: 'Verified',
        uploadedAt: '2026-09-24T07:45:00.000Z'
      }
    ],
    linkedBankAccountId: 'acc_dashen_escrow',
    auditTrail: [
      {
        id: 'aud-90-1',
        timestamp: '2026-09-24T07:45:00.000Z',
        action: 'INSTRUCTION_CREATED',
        actor: 'Eng. Habtamu Tegegne',
        role: 'Director General',
        notes: 'Mobilization advance submitted pending financial director authorization.'
      }
    ]
  },
  {
    id: 'PAY-ERA-2026-0091',
    projectReference: 'ERA/ROW/SNNP/2026-08',
    projectName: 'Bako - Shambu Road Rehabilitation Project',
    category: 'ROW_COMPENSATION',
    purpose: 'Right of Way (ROW) Resettlement Compensation for 124 Project Affected Persons (PAPs) in Tibe Woreda',
    amount: 18250000.00,
    currency: 'ETB',
    payee: {
      name: 'Tibe Woreda Finance & Economic Cooperation Office (PAP Escrow)',
      tin: '0049281729',
      entityType: 'Authority',
      contactEmail: 'tibe.woreda.finance@oromia.gov.et',
      contactPhone: '+251 57 662 1045'
    },
    destinationBank: {
      bankName: 'Awash International Bank',
      accountNumber: '0143892019481',
      swiftBic: 'AWINETAA',
      branchName: 'Bako Branch'
    },
    status: 'Pending',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: 'Eng. Habtamu Tegegne (Director General)',
    createdAt: '2026-09-24T08:10:00.000Z',
    supportingDocuments: [
      {
        id: 'doc-0091-1',
        name: 'Woreda_PAP_Valuation_Committee_Minutes.pdf',
        type: 'Valuation Committee Schedule',
        fileSize: '5.6 MB',
        referenceCode: 'ERA-ROW-VAL-TIBE-09',
        verificationStatus: 'Verified',
        uploadedAt: '2026-09-24T08:10:00.000Z'
      }
    ],
    linkedBankAccountId: 'acc_awash_ops',
    auditTrail: [
      {
        id: 'aud-91-1',
        timestamp: '2026-09-24T08:10:00.000Z',
        action: 'INSTRUCTION_CREATED',
        actor: 'Eng. Habtamu Tegegne',
        role: 'Director General',
        notes: 'Submitted ROW compensation batch for 124 PAPs approved by regional committee.'
      }
    ]
  },
  {
    id: 'PAY-ERA-2026-0088',
    projectReference: 'ERA/SUP/ICB/2023-02',
    projectName: 'Nekemte - Bure Road Project (Section II)',
    category: 'CONSULTANT_FEES',
    purpose: 'Supervision Consultant Professional Fees Invoice #21 - Expatriate Resident Engineer & Key Experts',
    amount: 840000.00,
    currency: 'USD',
    payee: {
      name: 'Dorsch Consult GmbH & Beha Engineering JV',
      tin: '0008819284',
      entityType: 'Consultant',
      contactEmail: 'finance@dorsch.de',
      contactPhone: '+49 89 5797 0'
    },
    destinationBank: {
      bankName: 'Deutsche Bank AG Frankfurt',
      accountNumber: 'DE89370400440532013000',
      iban: 'DE89370400440532013000',
      swiftBic: 'DEUTDEDD',
      branchName: 'Frankfurt am Main Head Office'
    },
    status: 'Approved',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: 'Eng. Habtamu Tegegne (Director General)',
    createdAt: '2026-09-23T14:30:00.000Z',
    supportingDocuments: [
      {
        id: 'doc-0088-1',
        name: 'Dorsch_Invoice_21_Signed_TimeSheets.pdf',
        type: 'Consultant Invoice',
        fileSize: '2.9 MB',
        referenceCode: 'DORSCH-INV-2026-21',
        verificationStatus: 'Verified',
        uploadedAt: '2026-09-23T14:30:00.000Z'
      }
    ],
    approvalNotes: 'Foreign currency allocation approved under NBE Foreign Currency Directive #FX-2026-012. Ready for gateway transfer execution.',
    reviewerCommentary: 'Foreign currency allocation approved under NBE Foreign Currency Directive #FX-2026-012. Verified against expatriate timesheets and resident engineer certificates. Ready for gateway transfer execution.',
    approvedByRole: 'FINANCIAL_DIRECTOR',
    approvedByName: 'Ato Berhanu Zeleke (Financial Director)',
    approvedAt: '2026-09-24T05:50:00.000Z',
    linkedBankAccountId: 'acc_citi_fx',
    reviewHistory: [
      {
        id: 'rev-88-1',
        timestamp: '2026-09-24T05:50:00.000Z',
        reviewerName: 'Ato Berhanu Zeleke',
        reviewerRole: 'Financial Management Director',
        decision: 'APPROVED',
        reviewerCommentary: 'Foreign currency allocation approved under NBE Foreign Currency Directive #FX-2026-012. Verified against expatriate timesheets and resident engineer certificates. Ready for gateway transfer execution.',
        previousStatus: 'Pending',
        newStatus: 'Approved'
      }
    ],
    auditTrail: [
      {
        id: 'aud-88-1',
        timestamp: '2026-09-23T14:30:00.000Z',
        action: 'INSTRUCTION_CREATED',
        actor: 'Eng. Habtamu Tegegne',
        role: 'Director General',
        notes: 'Submitted FX payment for Supervision Consultancy Invoice #21.'
      },
      {
        id: 'aud-88-2',
        timestamp: '2026-09-24T05:50:00.000Z',
        action: 'INSTRUCTION_APPROVED',
        actor: 'Ato Berhanu Zeleke',
        role: 'Financial Director',
        notes: 'Approved for execution via Citibank London FX clearing desk.'
      }
    ]
  },
  {
    id: 'PAY-ERA-2026-0087',
    projectReference: 'ERA/ICB/R-2022/LOT-02',
    projectName: 'Jimma - Chida Road Upgrading Design-Build',
    category: 'IPC_VALUATION',
    purpose: 'Interim Payment Certificate IPC #11 - Earthworks, Sub-base & Box Culverts',
    amount: 92300000.00,
    currency: 'ETB',
    payee: {
      name: 'Rama Construction Ltd',
      tin: '0001928471',
      entityType: 'Contractor',
      contactEmail: 'accounts@ramaconstruction.com.et',
      contactPhone: '+251 11 440 4040'
    },
    destinationBank: {
      bankName: 'Commercial Bank of Ethiopia',
      accountNumber: '1000182746192',
      swiftBic: 'CBETETAA',
      branchName: 'Addis Ababa Central Branch'
    },
    status: 'Paid',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: 'Eng. Habtamu Tegegne (Director General)',
    createdAt: '2026-09-22T09:00:00.000Z',
    supportingDocuments: [
      {
        id: 'doc-0087-1',
        name: 'IPC_11_Rama_Cert_Signed.pdf',
        type: 'Engineer IPC Certificate',
        fileSize: '3.7 MB',
        referenceCode: 'ERA-ENG-RAMA-IPC-11',
        verificationStatus: 'Verified',
        uploadedAt: '2026-09-22T09:00:00.000Z'
      }
    ],
    approvalNotes: 'Authorized in full. All retention deductions (5%) and advance recovery applied properly.',
    reviewerCommentary: 'Authorized in full. Certified against Supervising Engineer Scott Wilson valuation summary. All statutory retention deductions (5%) and advance recovery applied properly.',
    approvedByRole: 'FINANCIAL_DIRECTOR',
    approvedByName: 'Ato Berhanu Zeleke (Financial Director)',
    approvedAt: '2026-09-22T11:15:00.000Z',
    gatewayTransactionId: 'ADY-TRF-98172940',
    gatewayPlatform: 'Adyen BalancePlatform',
    executedAt: '2026-09-22T11:20:00.000Z',
    paidAt: '2026-09-22T11:20:18.000Z',
    linkedBankAccountId: 'acc_cbe_main',
    webhookEventId: 'evt_ady_981729487192',
    reviewHistory: [
      {
        id: 'rev-87-1',
        timestamp: '2026-09-22T11:15:00.000Z',
        reviewerName: 'Ato Berhanu Zeleke',
        reviewerRole: 'Financial Management Director',
        decision: 'APPROVED',
        reviewerCommentary: 'Authorized in full. Certified against Supervising Engineer Scott Wilson valuation summary. All statutory retention deductions (5%) and advance recovery applied properly.',
        previousStatus: 'Pending',
        newStatus: 'Approved'
      }
    ],
    auditTrail: [
      {
        id: 'aud-87-1',
        timestamp: '2026-09-22T09:00:00.000Z',
        action: 'INSTRUCTION_CREATED',
        actor: 'Eng. Habtamu Tegegne',
        role: 'Director General',
        notes: 'Submitted IPC #11 instruction.'
      },
      {
        id: 'aud-87-2',
        timestamp: '2026-09-22T11:15:00.000Z',
        action: 'INSTRUCTION_APPROVED',
        actor: 'Ato Berhanu Zeleke',
        role: 'Financial Director',
        notes: 'Approved payment.'
      },
      {
        id: 'aud-87-3',
        timestamp: '2026-09-22T11:20:00.000Z',
        action: 'GATEWAY_DISPATCHED',
        actor: 'Ato Berhanu Zeleke',
        role: 'Financial Director',
        notes: 'Dispatched to Adyen.'
      },
      {
        id: 'aud-87-4',
        timestamp: '2026-09-22T11:20:18.000Z',
        action: 'WEBHOOK_STATUS_PAID',
        actor: 'Adyen BalancePlatform Webhook',
        role: 'SYSTEM',
        notes: 'balancePlatform.transfer.updated webhook received (200 OK acknowledged). Status updated to Paid.'
      }
    ]
  },
  {
    id: 'PAY-ERA-2026-0086',
    projectReference: 'ERA/ICB/R-2021/LOT-01',
    projectName: 'Addis Ababa - Djibouti Trade Corridor (Package 1)',
    category: 'RETENTION_RELEASE',
    purpose: '50% Contractual Retention Release Upon Issuance of Taking-Over Certificate (TOC)',
    amount: 35000000.00,
    currency: 'ETB',
    payee: {
      name: 'Defence Construction Enterprise',
      tin: '0002918475',
      entityType: 'Contractor',
      contactEmail: 'contact@dce.gov.et',
      contactPhone: '+251 11 442 2255'
    },
    destinationBank: {
      bankName: 'Dashen Bank SC',
      accountNumber: '0092182746101',
      swiftBic: 'DASHETAA',
      branchName: 'Bole Medhanealem Corporate'
    },
    status: 'Paid',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: 'Eng. Habtamu Tegegne (Director General)',
    createdAt: '2026-09-21T10:00:00.000Z',
    supportingDocuments: [
      {
        id: 'doc-0086-1',
        name: 'Taking_Over_Certificate_FIDIC_10_1.pdf',
        type: 'Taking-Over Certificate',
        fileSize: '2.1 MB',
        referenceCode: 'ERA-TOC-2026-03',
        verificationStatus: 'Verified',
        uploadedAt: '2026-09-21T10:00:00.000Z'
      }
    ],
    approvalNotes: 'FIDIC Sub-Clause 14.9 compliance verified. Defect Notification Period (DNP) guarantee retained.',
    approvedByRole: 'FINANCIAL_DIRECTOR',
    approvedByName: 'Ato Berhanu Zeleke (Financial Director)',
    approvedAt: '2026-09-21T13:40:00.000Z',
    gatewayTransactionId: 'YAP-ETH-88371092',
    gatewayPlatform: 'Yapily ISO 20022',
    executedAt: '2026-09-21T13:45:00.000Z',
    paidAt: '2026-09-21T13:45:22.000Z',
    linkedBankAccountId: 'acc_dashen_escrow',
    webhookEventId: 'evt_yap_883710920192',
    auditTrail: [
      {
        id: 'aud-86-1',
        timestamp: '2026-09-21T10:00:00.000Z',
        action: 'INSTRUCTION_CREATED',
        actor: 'Eng. Habtamu Tegegne',
        role: 'Director General',
        notes: 'Retention release submitted.'
      },
      {
        id: 'aud-86-2',
        timestamp: '2026-09-21T13:45:22.000Z',
        action: 'WEBHOOK_STATUS_PAID',
        actor: 'Yapily ISO 20022 Webhook',
        role: 'SYSTEM',
        notes: 'payment.completed webhook callback verified and booked.'
      }
    ]
  },
  {
    id: 'PAY-ERA-2026-0085',
    projectReference: 'ERA/STAT/TAX/2026-Q3',
    projectName: 'Statutory VAT & 2% Withholding Tax Remittance for Q3',
    category: 'TAX_SETTLEMENT',
    purpose: 'Consolidated Contractor & Consultant 2% Withholding Tax and 15% VAT settlement to Ministry of Revenues',
    amount: 12450000.00,
    currency: 'ETB',
    payee: {
      name: 'Ministry of Revenues (MoR) Ethiopia',
      tin: '0000000001',
      entityType: 'Authority',
      contactEmail: 'taxcollection@mor.gov.et',
      contactPhone: '+251 11 552 8200'
    },
    destinationBank: {
      bankName: 'Commercial Bank of Ethiopia',
      accountNumber: '1000000010001',
      swiftBic: 'CBETETAA',
      branchName: 'CBE Revenue Special Account'
    },
    status: 'Paid',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: 'Eng. Habtamu Tegegne (Director General)',
    createdAt: '2026-09-20T08:00:00.000Z',
    supportingDocuments: [
      {
        id: 'doc-0085-1',
        name: 'MoR_Quarterly_Assessment_Schedule.pdf',
        type: 'Statutory Tax Assessment',
        fileSize: '1.4 MB',
        referenceCode: 'MOR-TAX-SCH-2026-Q3',
        verificationStatus: 'Verified',
        uploadedAt: '2026-09-20T08:00:00.000Z'
      }
    ],
    approvalNotes: 'Statutory deadline remittance. Approved immediately.',
    approvedByRole: 'FINANCIAL_DIRECTOR',
    approvedByName: 'Ato Berhanu Zeleke (Financial Director)',
    approvedAt: '2026-09-20T08:30:00.000Z',
    gatewayTransactionId: 'CBE-RTGS-55421099',
    gatewayPlatform: 'CBE RTGS Gateway',
    executedAt: '2026-09-20T08:35:00.000Z',
    paidAt: '2026-09-20T08:35:09.000Z',
    linkedBankAccountId: 'acc_cbe_main',
    webhookEventId: 'evt_cbe_rtgs_55421099',
    auditTrail: [
      {
        id: 'aud-85-1',
        timestamp: '2026-09-20T08:35:09.000Z',
        action: 'WEBHOOK_STATUS_PAID',
        actor: 'CBE RTGS Gateway Webhook',
        role: 'SYSTEM',
        notes: 'TRANSFER_SUCCESSFUL callback acknowledged with 200 OK.'
      }
    ]
  },
  {
    id: 'PAY-ERA-2026-0084',
    projectReference: 'ERA/NCB/W-2023/LOT-03',
    projectName: 'Kombolcha - Bati - Mille Road Upgrading',
    category: 'IPC_VALUATION',
    purpose: 'Interim Payment Certificate IPC #09',
    amount: 54000000.00,
    currency: 'ETB',
    payee: {
      name: 'Midroc Construction PLC',
      tin: '0001092837',
      entityType: 'Contractor',
      contactEmail: 'finance@midroccon.com.et',
      contactPhone: '+251 11 551 0000'
    },
    destinationBank: {
      bankName: 'Dashen Bank SC',
      accountNumber: '0019283746501',
      swiftBic: 'DASHETAA',
      branchName: 'Kazanchis Corporate Branch'
    },
    status: 'Failed',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: 'Eng. Habtamu Tegegne (Director General)',
    createdAt: '2026-09-18T10:00:00.000Z',
    supportingDocuments: [
      {
        id: 'doc-0084-1',
        name: 'IPC_09_Draft_Midroc.pdf',
        type: 'Engineer IPC Certificate',
        fileSize: '3.1 MB',
        referenceCode: 'ERA-ENG-MID-09',
        verificationStatus: 'Pending Verification',
        uploadedAt: '2026-09-18T10:00:00.000Z'
      }
    ],
    rejectionReason: 'Mandatory Rejection: Tax clearance certificate expired on 2026-09-01. Withholding tax deduction of 2% was omitted from contractor summary invoice. Re-submission required.',
    reviewerCommentary: 'Mandatory Rejection: Tax clearance certificate expired on 2026-09-01. Withholding tax deduction of 2% was omitted from contractor summary invoice. Re-submission required.',
    rejectedAt: '2026-09-18T14:20:00.000Z',
    linkedBankAccountId: 'acc_dashen_escrow',
    reviewHistory: [
      {
        id: 'rev-84-1',
        timestamp: '2026-09-18T14:20:00.000Z',
        reviewerName: 'Ato Berhanu Zeleke',
        reviewerRole: 'Financial Management Director',
        decision: 'REJECTED',
        reviewerCommentary: 'Mandatory Rejection: Tax clearance certificate expired on 2026-09-01. Withholding tax deduction of 2% was omitted from contractor summary invoice. Re-submission required.',
        previousStatus: 'Pending',
        newStatus: 'Failed'
      }
    ],
    editHistory: [
      {
        id: 'edit-84-1',
        timestamp: '2026-09-19T09:30:00.000Z',
        editorName: 'Eng. Habtamu Tegegne',
        editorRole: 'Director General',
        previousAmount: 58000000.00,
        newAmount: 54000000.00,
        previousCurrency: 'ETB',
        newCurrency: 'ETB',
        actionTaken: 'RESUBMIT_FOR_AUDIT',
        justification: 'Recalculated bill of quantities for Lot 3 and attached renewed Ministry of Revenue tax clearance.',
        previousStatus: 'Failed',
        newStatus: 'Pending'
      }
    ],
    auditTrail: [
      {
        id: 'aud-84-1',
        timestamp: '2026-09-18T10:00:00.000Z',
        action: 'INSTRUCTION_CREATED',
        actor: 'Eng. Habtamu Tegegne',
        role: 'Director General',
        notes: 'Submitted IPC #09.'
      },
      {
        id: 'aud-84-2',
        timestamp: '2026-09-18T14:20:00.000Z',
        action: 'INSTRUCTION_REJECTED',
        actor: 'Ato Berhanu Zeleke',
        role: 'Financial Director',
        notes: 'Mandatory rejection logged: Tax clearance certificate expired and 2% withholding was omitted.'
      }
    ]
  }
];

export const INITIAL_WEBHOOK_LOGS: WebhookLog[] = [
  {
    id: 'log-001',
    eventId: 'evt_ady_981729487192',
    timestamp: '2026-09-22T11:20:18.000Z',
    gateway: 'Adyen BalancePlatform',
    eventType: 'balancePlatform.transfer.updated',
    instructionId: 'PAY-ERA-2026-0087',
    gatewayTransactionId: 'ADY-TRF-98172940',
    httpMethod: 'POST',
    requestUrl: '/api/webhooks/payment-status',
    requestHeaders: {
      'content-type': 'application/json',
      'x-adyen-hmac-sha256': '9d8f8a12e34c7b89d0a1e2f3a4b5c6d7e8f90123456789abcdef0123456789ab',
      'user-agent': 'Adyen-BalancePlatform-Webhook-Engine/2.4',
      'x-request-id': 'req_ady_981729487192'
    },
    requestBody: {
      type: 'balancePlatform.transfer.updated',
      data: {
        id: 'ADY-TRF-98172940',
        reference: 'PAY-ERA-2026-0087',
        status: 'booked',
        amount: {
          currency: 'ETB',
          value: 9230000000 // In minor units
        },
        beneficiary: {
          name: 'Rama Construction Ltd',
          bankAccount: '1000182746192',
          bank: 'Commercial Bank of Ethiopia'
        },
        settledAt: '2026-09-22T11:20:18.000Z'
      }
    },
    responseStatus: 200,
    responseBody: {
      received: true,
      status: 'acknowledged',
      eventId: 'evt_ady_981729487192',
      timestamp: '2026-09-22T11:20:18.018Z',
      recordUpdated: 'PAY-ERA-2026-0087',
      currentStatus: 'Paid'
    },
    signatureVerified: true,
    executionDurationMs: 18
  },
  {
    id: 'log-002',
    eventId: 'evt_yap_883710920192',
    timestamp: '2026-09-21T13:45:22.000Z',
    gateway: 'Yapily ISO 20022',
    eventType: 'payment.completed',
    instructionId: 'PAY-ERA-2026-0086',
    gatewayTransactionId: 'YAP-ETH-88371092',
    httpMethod: 'POST',
    requestUrl: '/api/webhooks/payment-status',
    requestHeaders: {
      'content-type': 'application/json',
      'x-yapily-signature': '7b89d0a1e2f3a4b5c6d7e8f90123456789abcdef0123456789ab9d8f8a12e34c',
      'user-agent': 'Yapily-OpenBanking-Webhook/1.9'
    },
    requestBody: {
      event: 'payment.completed',
      paymentId: 'YAP-ETH-88371092',
      instructionIdentification: 'PAY-ERA-2026-0086',
      status: 'COMPLETED',
      clearedAmount: {
        currency: 'ETB',
        amount: 35000000.00
      }
    },
    responseStatus: 200,
    responseBody: {
      received: true,
      status: 'acknowledged',
      eventId: 'evt_yap_883710920192',
      timestamp: '2026-09-21T13:45:22.024Z',
      recordUpdated: 'PAY-ERA-2026-0086',
      currentStatus: 'Paid'
    },
    signatureVerified: true,
    executionDurationMs: 24
  },
  {
    id: 'log-003',
    eventId: 'evt_cbe_rtgs_55421099',
    timestamp: '2026-09-20T08:35:09.000Z',
    gateway: 'CBE RTGS Gateway',
    eventType: 'TRANSFER_SUCCESSFUL',
    instructionId: 'PAY-ERA-2026-0085',
    gatewayTransactionId: 'CBE-RTGS-55421099',
    httpMethod: 'POST',
    requestUrl: '/api/webhooks/payment-status',
    requestHeaders: {
      'content-type': 'application/json',
      'x-cbe-rtgs-auth': 'Bearer cbe_token_rtgs_2026',
      'user-agent': 'NBE-RTGS-SettlementService/3.1'
    },
    requestBody: {
      messageType: 'pacs.002.001.10',
      settlementId: 'CBE-RTGS-55421099',
      originalInstructionId: 'PAY-ERA-2026-0085',
      txStatus: 'SETTLED',
      currency: 'ETB',
      amount: 12450000.00
    },
    responseStatus: 200,
    responseBody: {
      received: true,
      status: 'acknowledged',
      eventId: 'evt_cbe_rtgs_55421099',
      timestamp: '2026-09-20T08:35:09.015Z',
      recordUpdated: 'PAY-ERA-2026-0085',
      currentStatus: 'Paid'
    },
    signatureVerified: true,
    executionDurationMs: 15
  }
];
