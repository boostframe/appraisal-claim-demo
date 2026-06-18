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
  const facts = `<p><b>Claimant:</b> ${esc(i.claimantName)} (${esc(i.claimantEmail)})</p>
  <p><b>Property:</b> ${esc(i.propertyAddress)}</p>
  <p><b>Loss type:</b> ${esc(i.lossType)}</p>
  <p><b>Description:</b> ${esc(i.lossDescription)}</p>`;
  return [
    doc('Appraisal Agreement', `<p>This Appraisal Agreement is entered into by the claimant below for the appraisal of the described loss.</p>${facts}`),
    doc('Letter of Authorization', `<p>The claimant below authorizes the appraiser to act on their behalf for this claim.</p>${facts}`),
  ];
}
