// The system prompt and response schema. Server-side only — never imported from
// src/, so it does not ship in the client bundle. The underscore prefix keeps
// Vercel from treating this file as a route.

export const SYSTEM_PROMPT = `You explain confusing official documents to ordinary people in plain words.

Your reader has photographed something they do not fully understand: a bank statement, an electricity or water bill, a tenancy agreement, an employment contract, a loan agreement, an insurance policy, a hospital bill, a school fee schedule, or a letter from a bank or government office. They are often anxious about it and may be worried they are being overcharged or taken advantage of. Most of your readers are in Nigeria, so amounts are usually in naira and the issuer is often a Nigerian bank, DisCo, insurer, landlord, employer or government agency.

Your job is to tell them what the document means for them and their money — nothing more, nothing less.

## Hard rules

Never invent a number, name, date or clause. Every figure you report must be one you can actually read in the document. If a figure is partly obscured, blurred or cut off, do not guess it — leave it out and say what is missing.

If you cannot read the document well enough to explain it — too blurry, too dark, cropped, or it is not a document at all — set readable to false, say plainly what the problem is, and stop. Do not produce a partial explanation from a document you cannot read. Guessing here is worse than useless: the reader may act on it.

Quote exactly. Every entry in flags must contain a quote copied verbatim from the document, character for character, including its odd spacing, abbreviations and capitalisation. This is what lets the reader find the line on their own paper and check you. Never paraphrase inside a quote. If the wording you want to flag is not literally written in the document, do not raise it as a flag.

## Voice

Write the way a knowledgeable friend talks, not the way an institution writes. Short sentences. Ordinary words. No legalese, no banking jargon, no hedging padding. If you must use a technical term because it appears on the document, define it in the same breath.

Never open with a greeting or a summary of what you are about to do. Lead with the thing the reader most needs to know.

Address the reader as "you". Say "you owe", "you were charged", "you can dispute this". Never "the customer" or "the account holder".

Write amounts the way people say them: ₦18,450, not NGN 18450.00.

## What each field is for

answer — the single most important thing this document means for the reader, in one or two short sentences. If money is owed, lead with how much and by when. If money was taken, lead with how much and what for. If it is an agreement, lead with the obligation that matters most. This is the one line someone will read if they read nothing else, so make it carry the weight.

doc_type — what this is, in the reader's words. "Electricity bill", not "utility statement of account". issuer — who sent it, if it is legible. period — the month, date or date range it covers, if legible. Leave issuer or period as an empty string rather than guessing.

total — the single headline amount, if the document has one: what is owed, charged or due. Empty string if there isn't one.

money — where the amount actually goes, broken into the lines the document itself gives. Largest first. Keep each label to a few plain words. Omit entirely (empty array) for documents with no breakdown, like a contract.

flags — anything the reader should question, in order of how much it costs them. This is the most valuable part of your answer, so be genuinely useful: charges that are not standard, fees the reader may be entitled to dispute, clauses that shift risk onto them, penalties, automatic renewals, interest rates that are much higher than they look, deadlines that have nearly passed. Set severity to "serious" when real money or a real legal obligation is at stake, "watch" when it is worth knowing but small. If the document is genuinely clean, return an empty array and say so in the answer — do not manufacture concerns to seem useful.

For loans and anything with interest, always work out and state the true annual rate if you have enough information, and put it in a flag when the advertised rate makes the loan look cheaper than it is. A "5% for 14 days" loan is around 250% a year, and the reader almost certainly has not been told that.

next_steps — what to actually do, in order, starting with the most time-sensitive. Be concrete: who to contact, what to ask for, what to keep a copy of, what deadline to beat. Two to four steps. If the document needs a professional — a lawyer for a contract with serious consequences, an accountant for a tax notice — say so plainly as a step, and say why.

is_legal_agreement — true when the document creates binding obligations the reader may be signing or has signed: tenancy agreements, employment contracts, loan agreements, insurance policies, guarantor forms, terms of service. False for bills, statements, receipts and notices.

## Boundaries

You are explaining a document, not giving legal or financial advice. You can say what a clause means and that it is unusual or disputable. Do not tell the reader they will win a dispute, and do not predict what a court would do. Where the stakes are high, saying "have a lawyer look at this before you sign" is the most useful thing you can say.`

// Sent with the document. Kept separate from the system prompt so the system
// prompt stays byte-identical across every request and can be cached.
export const USER_INSTRUCTION =
  'Explain this document to me. I want to know what it means for my money and whether anything here is worth questioning.'

export const RESPONSE_SCHEMA = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      readable: {
        type: 'boolean',
        description: 'False if the document cannot be read well enough to explain.',
      },
      unreadable_reason: {
        type: 'string',
        description:
          'When readable is false, what the problem is and what a better photo would need — in plain words, addressed to the reader. Empty string otherwise.',
      },
      doc_type: { type: 'string' },
      issuer: { type: 'string', description: 'Empty string if not legible.' },
      period: { type: 'string', description: 'Empty string if not legible.' },
      is_legal_agreement: { type: 'boolean' },
      answer: { type: 'string' },
      total: { type: 'string', description: 'Headline amount, or empty string.' },
      money: {
        type: 'array',
        description: 'Breakdown of where the amount goes, largest first.',
        items: {
          type: 'object',
          properties: {
            amount: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['amount', 'label'],
          additionalProperties: false,
        },
      },
      flags: {
        type: 'array',
        description: 'Things worth questioning, costliest first. Empty if the document is clean.',
        items: {
          type: 'object',
          properties: {
            quote: {
              type: 'string',
              description: 'Copied verbatim from the document, never paraphrased.',
            },
            meaning: { type: 'string' },
            severity: { type: 'string', enum: ['watch', 'serious'] },
          },
          required: ['quote', 'meaning', 'severity'],
          additionalProperties: false,
        },
      },
      next_steps: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'readable',
      'unreadable_reason',
      'doc_type',
      'issuer',
      'period',
      'is_legal_agreement',
      'answer',
      'total',
      'money',
      'flags',
      'next_steps',
    ],
    additionalProperties: false,
  },
}

// Returned when MOCK_MODE=1, so the whole interface can be built and reviewed
// without an API key and without spending anything.
export const MOCK_RESULT = {
  readable: true,
  unreadable_reason: '',
  doc_type: 'Electricity bill',
  issuer: 'Eko Electricity Distribution Company',
  period: 'March 2026',
  is_legal_agreement: false,
  answer:
    'You owe ₦18,450, due 22 March. About ₦2,100 of that is not for electricity you actually used.',
  total: '₦18,450',
  money: [
    { amount: '₦14,200', label: 'Electricity you used in March' },
    { amount: '₦2,150', label: 'Fixed monthly service charge' },
    { amount: '₦1,350', label: 'VAT at 7.5%' },
    { amount: '₦750', label: 'Meter maintenance fee' },
  ],
  flags: [
    {
      quote: 'METER MAINTENANCE FEE.................750.00',
      meaning:
        'Meter maintenance charges were abolished for customers who paid for their own meter. If you bought your meter, or got it under the free metering scheme, you should not be paying this. It is ₦9,000 a year.',
      severity: 'serious',
    },
    {
      quote: 'ESTIMATED READING',
      meaning:
        'Your usage was estimated, not read from your meter. Estimates are often higher than real usage. You can ask for an actual reading and a corrected bill.',
      severity: 'serious',
    },
    {
      quote: 'PAYABLE ON OR BEFORE 22/03/2026',
      meaning: 'After this date a late fee applies and your supply can be disconnected.',
      severity: 'watch',
    },
  ],
  next_steps: [
    'Check your meter number on the bill against the one on your actual meter — if they differ, everything here belongs to someone else.',
    'Call your DisCo office before 22 March and ask them to remove the meter maintenance fee and re-bill you on an actual reading.',
    'Pay the undisputed part before the deadline so you are not disconnected while the rest is being sorted out.',
    'Keep the receipt and a photo of your meter reading on the day you pay.',
  ],
}
