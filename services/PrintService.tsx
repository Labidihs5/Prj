"use client"

import { createRoot } from "react-dom/client"
import { FactureTemplate } from "@/components/facture-template"
import { BordereauTemplate } from "@/components/bordereau-template"
import type { Facture } from "@/lib/database"

export class PrintService {
  static async printFacture(facture: Facture, montantEnLettres: string): Promise<void> {
    return new Promise((resolve) => {
      // Créer un conteneur temporaire
      const printContainer = document.createElement("div")
      printContainer.style.position = "absolute"
      printContainer.style.left = "-9999px"
      printContainer.style.top = "-9999px"
      document.body.appendChild(printContainer)

      // Créer le composant React
      const root = createRoot(printContainer)
      root.render(FactureTemplate({ facture, montantEnLettres, ref: null }))

      // Attendre le rendu puis imprimer
      setTimeout(() => {
        const printWindow = window.open("", "_blank")
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Facture ${facture.numfac}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                  @media print {
                    body { margin: 0; padding: 0; }
                    .print\\:shadow-none { box-shadow: none !important; }
                  }
                  .bg-white { background-color: white; }
                  .text-black { color: black; }
                  .border-b-2 { border-bottom: 2px solid; }
                  .border-blue-600 { border-color: #2563eb; }
                  .border-green-600 { border-color: #16a34a; }
                  .text-blue-600 { color: #2563eb; }
                  .text-green-600 { color: #16a34a; }
                  .font-bold { font-weight: bold; }
                  .font-semibold { font-weight: 600; }
                  .text-3xl { font-size: 1.875rem; }
                  .text-2xl { font-size: 1.5rem; }
                  .text-lg { font-size: 1.125rem; }
                  .text-sm { font-size: 0.875rem; }
                  .text-xs { font-size: 0.75rem; }
                  .mb-2 { margin-bottom: 0.5rem; }
                  .mb-3 { margin-bottom: 0.75rem; }
                  .mb-4 { margin-bottom: 1rem; }
                  .mb-6 { margin-bottom: 1.5rem; }
                  .mb-8 { margin-bottom: 2rem; }
                  .mt-2 { margin-top: 0.5rem; }
                  .mt-6 { margin-top: 1.5rem; }
                  .mt-8 { margin-top: 2rem; }
                  .mt-12 { margin-top: 3rem; }
                  .p-3 { padding: 0.75rem; }
                  .p-4 { padding: 1rem; }
                  .p-8 { padding: 2rem; }
                  .pt-2 { padding-top: 0.5rem; }
                  .pt-6 { padding-top: 1.5rem; }
                  .pb-6 { padding-bottom: 1.5rem; }
                  .text-center { text-align: center; }
                  .text-right { text-align: right; }
                  .text-left { text-align: left; }
                  .bg-blue-50 { background-color: #eff6ff; }
                  .bg-gray-50 { background-color: #f9fafb; }
                  .border { border: 1px solid #d1d5db; }
                  .border-gray-300 { border-color: #d1d5db; }
                  .rounded-lg { border-radius: 0.5rem; }
                  .overflow-hidden { overflow: hidden; }
                  .space-y-2 > * + * { margin-top: 0.5rem; }
                  .grid { display: grid; }
                  .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
                  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                  .gap-8 { gap: 2rem; }
                  .gap-4 { gap: 1rem; }
                  .flex { display: flex; }
                  .justify-between { justify-content: space-between; }
                  .items-start { align-items: flex-start; }
                  .max-w-4xl { max-width: 56rem; }
                  .mx-auto { margin-left: auto; margin-right: auto; }
                  .w-full { width: 100%; }
                  .h-16 { height: 4rem; }
                  .h-20 { height: 5rem; }
                  table { border-collapse: collapse; width: 100%; }
                  th, td { border: 1px solid #d1d5db; }
                  .text-gray-600 { color: #4b5563; }
                  .text-gray-500 { color: #6b7280; }
                  .text-gray-800 { color: #1f2937; }
                  .italic { font-style: italic; }
                  @media (min-width: 768px) {
                    .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                  }
                </style>
              </head>
              <body>
                ${printContainer.innerHTML}
              </body>
            </html>
          `)
          printWindow.document.close()
          printWindow.onload = () => {
            printWindow.print()
            printWindow.close()
            document.body.removeChild(printContainer)
            resolve()
          }
        }
      }, 100)
    })
  }

  static async printBordereau(data: any): Promise<void> {
    return new Promise((resolve) => {
      const printContainer = document.createElement("div")
      printContainer.style.position = "absolute"
      printContainer.style.left = "-9999px"
      document.body.appendChild(printContainer)

      const root = createRoot(printContainer)
      root.render(BordereauTemplate({ data, ref: null }))

      setTimeout(() => {
        const printWindow = window.open("", "_blank")
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Bordereau ${data.numero}</title>
                <style>
                  /* Mêmes styles que pour la facture */
                  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                  @media print { body { margin: 0; padding: 0; } }
                  /* ... autres styles ... */
                </style>
              </head>
              <body>
                ${printContainer.innerHTML}
              </body>
            </html>
          `)
          printWindow.document.close()
          printWindow.onload = () => {
            printWindow.print()
            printWindow.close()
            document.body.removeChild(printContainer)
            resolve()
          }
        }
      }, 100)
    })
  }

  static async generatePDF(facture: Facture, montantEnLettres: string): Promise<Blob> {
    // Pour une vraie génération PDF, utiliser jsPDF ou Puppeteer
    // Ici on simule avec du HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facture ${facture.numfac}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
            .title { color: #2563eb; font-size: 24px; font-weight: bold; }
            .section { margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .total { font-weight: bold; color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">CNAM - Facture ${facture.numfac}</h1>
            <p>Date: ${facture.datfac.toLocaleDateString("fr-FR")}</p>
          </div>
          <div class="section">
            <h3>Patient: ${facture.nom}</h3>
            <p>N° Associé Social: ${facture.numass}</p>
          </div>
          <table class="table">
            <tr>
              <th>Désignation</th>
              <th>Quantité</th>
              <th>PU TTC</th>
              <th>Montant</th>
            </tr>
            <tr>
              <td>${facture.designation}</td>
              <td>${facture.nombre}</td>
              <td>${facture.puttc.toFixed(3)} DT</td>
              <td class="total">${facture.mnt.toFixed(3)} DT</td>
            </tr>
          </table>
          <div class="section">
            <p><strong>Montant en lettres:</strong> ${montantEnLettres}</p>
          </div>
        </body>
      </html>
    `

    return new Blob([htmlContent], { type: "text/html" })
  }
}
