// server/templates/agreements.ts
import type { IntakeData } from '../domain/types';

export interface PopulatedDoc { name: string; htmlBase64: string }

function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function doc(title: string, body: string): PopulatedDoc {
  const html = `<!doctype html><html><body style="font-family:Georgia,serif;padding:48px;line-height:1.6">
  <h1 style="font-size:20px">${esc(title)}</h1>${body}
  <p style="margin-top:48px">Signature: <span style="color:white">**signature_1**</span></p>
  </body></html>`;
  return { name: title, htmlBase64: Buffer.from(html, 'utf8').toString('base64') };
}

export function populateAgreements(i: IntakeData): PopulatedDoc[] {
  const vehicle = `${esc(i.vehicleYear)} ${esc(i.vehicleMake)} ${esc(i.vehicleModel)}`;
  const vehicleDetails = `<p><b>Vehicle:</b> ${vehicle}</p>
  <p><b>VIN:</b> ${esc(i.vin)}</p>
  <p><b>Mileage:</b> ${esc(i.mileage)}</p>`;
  const claimantDetails = `<p><b>Claimant:</b> ${esc(i.claimantName)} &mdash; ${esc(i.claimantEmail)}</p>`;
  const insurerDetails = `<p><b>Insurance Carrier:</b> ${esc(i.insuranceCarrier)}</p>
  <p><b>Claim Number:</b> ${esc(i.claimNumber)}</p>
  <p><b>Adjuster:</b> ${esc(i.adjuster)}</p>
  <p><b>Settlement Offer:</b> ${esc(i.settlementOffer)}</p>`;

  const appraisalBody = `
  <p>This Appraisal Agreement is entered into by the claimant below in connection with the auto total-loss appraisal of the vehicle described herein.</p>
  ${claimantDetails}
  ${vehicleDetails}
  ${insurerDetails}`;

  const loaBody = `
  <p>The claimant below hereby authorizes the appraiser to act on their behalf in all matters relating to this auto total-loss claim, including communication with the insurance carrier.</p>
  ${claimantDetails}
  ${vehicleDetails}
  ${insurerDetails}`;

  const docs: PopulatedDoc[] = [
    doc('Appraisal Agreement', appraisalBody),
    doc('Letter of Authorization', loaBody),
  ];

  if (i.requestRightToAppraisal) {
    const rtaBody = `
  <p>Pursuant to the claimant's insurance policy, the claimant formally invokes their <b>Right to Appraisal</b> for the auto total-loss claim described herein.</p>
  ${claimantDetails}
  ${vehicleDetails}
  ${insurerDetails}`;
    docs.push(doc('Right to Appraisal Request', rtaBody));
  }

  return docs;
}
