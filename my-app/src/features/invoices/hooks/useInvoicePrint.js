// src/features/invoices/hooks/useInvoicePrint.js
export function useInvoicePrint() {
  const handlePrint = (className) => {
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .${className}, .${className} * {
          visibility: visible;
        }
        .${className} {
          position: absolute;
          left: 0;
          top: 0;
          padding: 0px !important;
          margin: 0 !important;
          width: 100%;
        }
        .${className} input,
        .${className} textarea,
        .${className} .MuiAutocomplete-root {
          display: none !important;
        }
        @page {
          size: auto;
          margin: 5mm;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return { handlePrint };
}
