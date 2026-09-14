/**
 * Guided walkthrough for Trainee (intern) accounts.
 * Steps run on the real pages, department by department:
 * Store -> Quality -> Procurement -> Finance -> Inventory -> Sales -> EUDR.
 *
 * `target` is a CSS selector on the live page. Radix tabs are addressed via
 * their generated id suffix ("-trigger-<value>"). When a target is missing the
 * tour shows a centred card instead, so pages can evolve safely.
 */

export interface TourStep {
  id: string;
  department: string;
  route: string;
  target?: string;
  /** Selector of a tab trigger to activate before showing the step. */
  activate?: string;
  title: string;
  body: string;
  placement?: 'auto' | 'bottom' | 'top' | 'right' | 'left';
}

const tab = (value: string) => `[role="tab"][id$="-trigger-${value}"]`;
const nav = (path: string) => `[data-sidebar] a[href="${path}"], nav a[href="${path}"]`;
const title = '[data-tour="page-title"]';

export const TOUR_STEPS: TourStep[] = [
  // ---------- Welcome ----------
  {
    id: 'welcome',
    department: 'Welcome',
    route: '/',
    title: 'Welcome to Great Agro Coffee',
    body: 'This guided tour walks you through how coffee moves through the company — from the store gate to export documentation. Your account is view-only: you can look at everything on the tour but cannot change, print or download anything, and money figures are hidden. Use Next to move on; you can pause and resume any time.',
  },
  {
    id: 'welcome-menu',
    department: 'Welcome',
    route: '/',
    target: '[data-sidebar]',
    placement: 'right',
    title: 'Your menu',
    body: 'The menu on the left lists the seven departments you will learn about. The tour opens each page for you, but you are free to explore them on your own afterwards.',
  },

  // ---------- Store ----------
  {
    id: 'store-intro',
    department: 'Store',
    route: '/store',
    target: title,
    title: 'Store Department — where coffee arrives',
    body: 'Every delivery from a farmer or trader is first received here. The store team records who brought the coffee, the coffee type (Arabica or Robusta, parchment or kiboko/DRUGAR), the number of bags and the weight on the scale.',
  },
  {
    id: 'store-records',
    department: 'Store',
    route: '/store',
    activate: tab('records'),
    target: tab('records'),
    title: 'Coffee records',
    body: 'Each row is one delivery: supplier, date, coffee type, bags and kilograms. A batch number is generated automatically so the same coffee can be traced all the way to sale. Weights are visible to you; the price paid is hidden on a training account.',
  },
  {
    id: 'store-operations',
    department: 'Store',
    route: '/store',
    activate: tab('operations'),
    target: tab('operations'),
    title: 'Store operations',
    body: 'Here the team follows daily store tasks — receiving, weighing, stacking and preparing lots for the quality lab. New deliveries wait here until the quality assessment is done.',
  },
  {
    id: 'store-dispatch',
    department: 'Store',
    route: '/store',
    activate: tab('dispatch'),
    target: tab('dispatch'),
    title: 'Dispatch',
    body: 'When coffee leaves the store — to the mill or to a buyer — a dispatch is recorded with the truck, the lots loaded and the weight leaving. Dispatch quantities must reconcile with what was received.',
  },
  {
    id: 'store-suppliers',
    department: 'Store',
    route: '/store',
    activate: tab('suppliers'),
    target: tab('suppliers'),
    title: 'Suppliers',
    body: 'Every supplier has a profile with a unique code, origin and delivery history. Suppliers who have not delivered for a while are flagged so procurement can follow up.',
  },

  // ---------- Quality ----------
  {
    id: 'quality-intro',
    department: 'Quality',
    route: '/quality-control',
    target: title,
    title: 'Quality Control — grading the coffee',
    body: 'Before a delivery can be paid, the quality lab samples it. Assessors measure moisture, group defects, outturn and cup quality. The results decide whether the lot is accepted, sent back for reconditioning, or rejected.',
  },
  {
    id: 'quality-pending',
    department: 'Quality',
    route: '/quality-control',
    title: 'Pending assessments',
    body: 'Lots received by the store appear in a queue for the lab. Each assessment is tied to the store batch number. Strict thresholds apply — for example moisture must be within the accepted range for the coffee type — and assessors record every reading.',
  },
  {
    id: 'quality-pricing',
    department: 'Quality',
    route: '/quality-control',
    title: 'From quality to price',
    body: 'The system suggests a price from the day\'s reference prices adjusted by moisture and defect penalties. A final price is set and approved by management before finance can pay. On your training account these prices are shown as UGX ••••.',
  },
  {
    id: 'quality-grn',
    department: 'Quality',
    route: '/quality-control',
    title: 'The GRN',
    body: 'Once assessed and priced, a Goods Received Note (GRN) is issued. The GRN is the document finance pays against; it carries the batch, supplier, weight, grade and a secure pay code. Reprints are tracked to avoid duplicate payments.',
  },

  // ---------- Procurement ----------
  {
    id: 'procurement-intro',
    department: 'Procurement',
    route: '/procurement',
    target: title,
    title: 'Procurement — sourcing the coffee',
    body: 'Procurement manages supplier relationships, buying stations, contracts and advances to farmers. They keep coffee flowing into the store at the right quality and volume.',
  },
  {
    id: 'procurement-action-center',
    department: 'Procurement',
    route: '/procurement',
    activate: tab('action-center'),
    target: tab('action-center'),
    title: 'Action Center',
    body: 'A live to-do list: suppliers to call, contracts nearing their delivery cap, pending advances, inactive suppliers and reminders. It keeps the team focused every day.',
  },
  {
    id: 'procurement-suppliers',
    department: 'Procurement',
    route: '/procurement',
    activate: tab('suppliers'),
    target: tab('suppliers'),
    title: 'Supplier management',
    body: 'Profiles, codes and delivery history for every supplier. Procurement updates details and monitors performance; phone numbers are masked for training accounts.',
  },
  {
    id: 'procurement-deliveries',
    department: 'Procurement',
    route: '/procurement',
    activate: tab('deliveries'),
    target: tab('deliveries'),
    title: 'Deliveries and bookings',
    body: 'Coffee bookings and supplier contracts set how much a supplier may deliver. Each delivery received by the store automatically counts towards the contract, and the contract closes when fulfilled.',
  },
  {
    id: 'procurement-review',
    department: 'Procurement',
    route: '/procurement',
    activate: tab('review'),
    target: tab('review'),
    title: 'Procurement review',
    body: 'Certain requests go through a first-stage procurement review before administrators and finance approve them. Decisions are recorded and cannot be changed later, giving a clear audit trail.',
  },

  // ---------- Finance ----------
  {
    id: 'finance-intro',
    department: 'Finance',
    route: '/finance',
    target: title,
    title: 'Finance — paying for coffee',
    body: 'Finance settles GRNs with suppliers, pays approved requests and salaries, and reconciles cash. Every payment draws from a named treasury account, so the money trail is always complete.',
  },
  {
    id: 'finance-pending-coffee',
    department: 'Finance',
    route: '/finance',
    activate: tab('pending-coffee'),
    target: tab('pending-coffee'),
    title: 'Pending coffee payments',
    body: 'GRNs that quality has approved wait here. Finance works in two stages: an officer enters or scans the GRN and payment details, then a payer releases the payment by cash, Yo mobile money or GosentePay. A receipt is printed afterwards.',
  },
  {
    id: 'finance-approvals',
    department: 'Finance',
    route: '/finance',
    activate: tab('pending-approvals'),
    target: tab('pending-approvals'),
    title: 'Approval sequence',
    body: 'Expense and cash requests follow one rule: Administrator first, Finance last. Finance only pays what has already been approved, and larger payouts may need a second signature.',
  },
  {
    id: 'finance-completed',
    department: 'Finance',
    route: '/finance',
    activate: tab('completed'),
    target: tab('completed'),
    title: 'Completed transactions and reconciliation',
    body: 'Every finished payment is recorded with who paid, when and through which channel. Finance reconciles these against cash counts and mobile money statements regularly.',
  },

  // ---------- Inventory ----------
  {
    id: 'inventory-intro',
    department: 'Inventory',
    route: '/inventory',
    target: title,
    title: 'Inventory — what is in the store now',
    body: 'Received coffee is grouped into inventory batches (about 5,000 kg each) by coffee type. This page shows how much of each batch is still available.',
  },
  {
    id: 'inventory-active',
    department: 'Inventory',
    route: '/inventory',
    activate: tab('active'),
    target: tab('active'),
    title: 'Active batches',
    body: 'Batches with coffee remaining. Each batch lists the deliveries that formed it, so any kilogram in the store can be traced back to the supplier who delivered it.',
  },
  {
    id: 'inventory-soldout',
    department: 'Inventory',
    route: '/inventory',
    activate: tab('soldout'),
    target: tab('soldout'),
    title: 'Sold-out batches (FIFO)',
    body: 'When a sale is recorded, stock is deducted from the oldest batch first (first in, first out). Once a batch reaches zero it moves here and stays as a permanent record.',
  },

  // ---------- Sales ----------
  {
    id: 'sales-intro',
    department: 'Sales',
    route: '/sales-marketing',
    target: title,
    title: 'Sales & Marketing — selling the coffee',
    body: 'Sales records customers, contracts and each transaction. Every sale automatically reduces inventory and links to the batches it came from.',
  },
  {
    id: 'sales-form',
    department: 'Sales',
    route: '/sales-marketing',
    activate: tab('sales-form'),
    target: tab('sales-form'),
    title: 'Sales transactions',
    body: 'A sale captures the customer, coffee type, kilograms, grade and truck details. Selling prices and revenue are hidden on training accounts, but you can see quantities and movements.',
  },
  {
    id: 'sales-customers',
    department: 'Sales',
    route: '/sales-marketing',
    activate: tab('customers'),
    target: tab('customers'),
    title: 'Customers and contracts',
    body: 'Buyers and their contracts define agreed quantities. Sales are allocated to buyer contracts so the team can see what is still owed to each customer.',
  },
  {
    id: 'sales-clearance',
    department: 'Sales',
    route: '/sales-marketing',
    activate: tab('clearance'),
    target: tab('clearance'),
    title: 'Store clearance',
    body: 'Before a truck leaves, a clearance confirms the loaded weight matches the sale and the store\'s records, with scanned documents attached for proof.',
  },

  // ---------- EUDR ----------
  {
    id: 'eudr-intro',
    department: 'EUDR',
    route: '/eudr-documentation',
    target: title,
    title: 'EUDR — proving where coffee came from',
    body: 'The European Union Deforestation Regulation requires exporters to prove coffee was not grown on deforested land. This department builds that proof for every batch we sell to Europe.',
  },
  {
    id: 'eudr-batches',
    department: 'EUDR',
    route: '/eudr-documentation',
    title: 'EUDR batches and traceability',
    body: 'Inventory batches are linked to EUDR batches with farmer profiles, farm locations and documents. When coffee is sold, the EUDR batch is attached to the sale so the buyer receives a complete traceability file.',
  },
  {
    id: 'eudr-dispatch',
    department: 'EUDR',
    route: '/eudr-documentation',
    title: 'Dispatch reports and documents',
    body: 'Each export dispatch has a report with quality analysis, weights, container details and supporting documents. Access to these reports is tiered — trainees can view the structure but not download files.',
  },

  // ---------- Finish ----------
  {
    id: 'finish',
    department: 'Complete',
    route: '/',
    title: 'You have completed the tour',
    body: 'You now know the full journey: coffee is received and weighed in the Store, graded and priced by Quality, sourced through Procurement, paid by Finance, tracked in Inventory, sold by Sales, and documented for EUDR. Explore the pages on your own — the Training Guide button lets you revisit any department.',
  },
];

export const TOUR_DEPARTMENTS = Array.from(
  new Set(TOUR_STEPS.map((s) => s.department))
).filter((d) => d !== 'Welcome' && d !== 'Complete');

export function firstStepOfDepartment(department: string): number {
  const idx = TOUR_STEPS.findIndex((s) => s.department === department);
  return idx < 0 ? 0 : idx;
}
