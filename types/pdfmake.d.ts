declare module "pdfmake/build/pdfmake" {
  interface PdfMakeStatic {
    vfs?: Record<string, string>;
    createPdf(docDefinition: Record<string, unknown>): {
      getBuffer(callback: (buffer: Uint8Array) => void): void;
      getBlob(callback: (blob: Blob | null) => void): void;
    };
  }
  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
