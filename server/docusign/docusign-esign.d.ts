// Minimal ambient declaration for docusign-esign (no @types package available).
// real.ts uses `import docusign from 'docusign-esign'` then `docusign.ApiClient` etc.
declare module 'docusign-esign' {
  const _default: Record<string, any> & {
    ApiClient: new (...args: any[]) => any;
    EnvelopesApi: new (...args: any[]) => any;
    EnvelopeDefinition: { constructFromObject(o: any): any };
    Recipients: { constructFromObject(o: any): any };
    Signer: { constructFromObject(o: any): any };
    Tabs: { constructFromObject(o: any): any };
    SignHere: { constructFromObject(o: any): any };
    RecipientViewRequest: { constructFromObject(o: any): any };
  };
  export = _default;
}
