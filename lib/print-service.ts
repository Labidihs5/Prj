"use client"
import type { Facture } from "./database"

export class PrintService {
  static async printFacture(facture: Facture, montantEnLettres: string): Promise<void> {
    try {
      console.log("PrintService.printFacture appelé", { facture, montantEnLettres })

      // Créer le contenu HTML avec design officiel CNAM
      const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facture ${facture.numfac}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body { 
              font-family: 'Times New Roman', serif; 
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 0;
              color: black;
              background: white;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 20px;
              box-sizing: border-box;
            }
            
            /* En-tête officiel */
            .header {
              text-align: center;
              border-bottom: 3px double #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 18px;
              font-weight: bold;
              margin: 0;
              text-transform: uppercase;
            }
            .header .subtitle {
              font-size: 14px;
              margin: 5px 0;
            }
            .header .country {
              font-size: 12px;
              font-style: italic;
              margin-top: 10px;
            }
            
            /* Informations facture */
            .facture-header {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
              border: 2px solid #000;
              padding: 10px;
            }
            .facture-number {
              font-size: 16px;
              font-weight: bold;
            }
            .facture-date {
              font-size: 14px;
            }
            
            /* Sections d'informations */
            .info-section {
              border: 1px solid #000;
              margin: 10px 0;
              padding: 10px;
            }
            .info-section h3 {
              background-color: #f0f0f0;
              margin: -10px -10px 10px -10px;
              padding: 8px 10px;
              font-size: 14px;
              font-weight: bold;
              border-bottom: 1px solid #000;
            }
            .info-row {
              display: flex;
              margin: 5px 0;
            }
            .info-label {
              font-weight: bold;
              width: 150px;
              flex-shrink: 0;
            }
            .info-value {
              flex: 1;
              border-bottom: 1px dotted #666;
              min-height: 18px;
            }
            
            /* Tableau des prestations */
            .prestations-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              border: 2px solid #000;
            }
            .prestations-table th {
              background-color: #e0e0e0;
              border: 1px solid #000;
              padding: 8px;
              text-align: center;
              font-weight: bold;
              font-size: 11px;
            }
            .prestations-table td {
              border: 1px solid #000;
              padding: 8px;
              text-align: center;
              font-size: 11px;
            }
            .prestations-table .designation {
              text-align: left;
              width: 40%;
            }
            
            /* Totaux */
            .totaux-section {
              margin: 20px 0;
              border: 2px solid #000;
              padding: 15px;
            }
            .totaux-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              padding: 5px 0;
            }
            .totaux-row.final {
              border-top: 2px solid #000;
              font-weight: bold;
              font-size: 14px;
              margin-top: 15px;
              padding-top: 10px;
            }
            
            /* Montant en lettres */
            .montant-lettres {
              border: 2px solid #000;
              padding: 15px;
              margin: 20px 0;
              background-color: #f9f9f9;
            }
            .montant-lettres .label {
              font-weight: bold;
              margin-bottom: 10px;
            }
            .montant-lettres .value {
              font-style: italic;
              text-transform: uppercase;
              font-size: 13px;
            }
            
            /* Signatures */
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
            }
            .signature-box {
              width: 45%;
              text-align: center;
              border: 1px solid #000;
              padding: 10px;
              height: 80px;
            }
            .signature-box .title {
              font-weight: bold;
              margin-bottom: 10px;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
            }
            
            /* Pied de page */
            .footer {
              position: fixed;
              bottom: 15mm;
              left: 15mm;
              right: 15mm;
              text-align: center;
              font-size: 10px;
              border-top: 1px solid #000;
              padding-top: 10px;
            }
            
            @media print {
              body { margin: 0; }
              .page { margin: 0; padding: 15mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- En-tête officiel -->
            <div class="header">
              <h1>الصندوق الوطني للضمان الاجتماعي</h1>
              <div class="subtitle">CAISSE NATIONALE D'ASSURANCE MALADIE</div>
              <div class="subtitle">C.N.A.M</div>
              <div class="country">الجمهورية التونسية - RÉPUBLIQUE TUNISIENNE</div>
            </div>
            
            <!-- Informations facture -->
            <div class="facture-header">
              <div>
                <div class="facture-number">FACTURE N° ${facture.numfac}</div>
              </div>
              <div>
                <div class="facture-date">DATE: ${facture.datfac.toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
            
            <!-- Informations patient -->
            <div class="info-section">
              <h3>INFORMATIONS PATIENT</h3>
              <div class="info-row">
                <div class="info-label">Nom et Prénom:</div>
                <div class="info-value">${facture.nom}</div>
              </div>
              <div class="info-row">
                <div class="info-label">N° Associé Social:</div>
                <div class="info-value">${facture.numass}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Clé:</div>
                <div class="info-value">${facture.cleass}</div>
              </div>
            </div>
            
            <!-- Informations prise en charge -->
            <div class="info-section">
              <h3>PRISE EN CHARGE</h3>
              <div class="info-row">
                <div class="info-label">Bureau Régional:</div>
                <div class="info-value">${facture.burreg}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Année PEC:</div>
                <div class="info-value">${facture.annprc}</div>
              </div>
              <div class="info-row">
                <div class="info-label">N° PEC:</div>
                <div class="info-value">${facture.numprc}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Période:</div>
                <div class="info-value">Du ${facture.ddeb.toLocaleDateString("fr-FR")} au ${facture.dfn.toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
            
            <!-- Tableau des prestations -->
            <table class="prestations-table">
              <thead>
                <tr>
                  <th class="designation">DÉSIGNATION</th>
                  <th>NBR<br>SÉANCES</th>
                  <th>NBR<br>SEMAINES</th>
                  <th>TOTAL<br>SÉANCES</th>
                  <th>P.U. TTC<br>(DT)</th>
                  <th>MONTANT<br>TTC (DT)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="designation">${facture.designation}</td>
                  <td>${facture.nombreseance}</td>
                  <td>${facture.nombresemaine}</td>
                  <td><strong>${facture.nombre}</strong></td>
                  <td>${facture.puttc.toFixed(3)}</td>
                  <td><strong>${facture.mnt.toFixed(3)}</strong></td>
                </tr>
              </tbody>
            </table>
            
            <!-- Totaux -->
            <div class="totaux-section">
              <div class="totaux-row">
                <span>TOTAL HORS TAXE (DT):</span>
                <span>${facture.mntht.toFixed(3)}</span>
              </div>
              <div class="totaux-row">
                <span>T.V.A 7% (DT):</span>
                <span>${facture.mnttva.toFixed(3)}</span>
              </div>
              <div class="totaux-row final">
                <span>TOTAL T.T.C (DT):</span>
                <span>${facture.mnt.toFixed(3)}</span>
              </div>
            </div>
            
            <!-- Montant en lettres -->
            <div class="montant-lettres">
              <div class="label">MONTANT EN LETTRES:</div>
              <div class="value">${montantEnLettres}</div>
            </div>
            
            <!-- Signatures -->
            <div class="signatures">
              <div class="signature-box">
                <div class="title">SIGNATURE DU PRESTATAIRE</div>
                <div style="height: 50px;"></div>
              </div>
              <div class="signature-box">
                <div class="title">CACHET ET SIGNATURE</div>
                <div style="height: 50px;"></div>
              </div>
            </div>
          </div>
          
          <!-- Pied de page -->
          <div class="footer">
            <p>CNAM - Caisse Nationale d'Assurance Maladie - République Tunisienne</p>
            <p>Facture générée le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
          </div>
        </body>
      </html>
    `

      // Ouvrir une nouvelle fenêtre pour l'impression
      const printWindow = window.open("", "_blank", "width=800,height=600")
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()

        // Attendre que le contenu soit chargé puis imprimer
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
          }, 500)
        }
      } else {
        throw new Error("Impossible d'ouvrir la fenêtre d'impression")
      }
    } catch (error) {
      console.error("Erreur dans printFacture:", error)
      throw error
    }
  }

  static async printBordereau(data: any): Promise<void> {
    try {
      console.log("PrintService.printBordereau appelé", data)

      const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bordereau ${data.numero}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body { 
              font-family: 'Times New Roman', serif; 
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 0;
              color: black;
              background: white;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 20px;
              box-sizing: border-box;
            }
            
            /* En-tête officiel */
            .header {
              text-align: center;
              border-bottom: 3px double #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 18px;
              font-weight: bold;
              margin: 0;
              text-transform: uppercase;
            }
            .header .subtitle {
              font-size: 14px;
              margin: 5px 0;
            }
            
            /* Informations bordereau */
            .bordereau-header {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
              border: 2px solid #000;
              padding: 10px;
              background-color: #f0f0f0;
            }
            .bordereau-number {
              font-size: 16px;
              font-weight: bold;
            }
            
            /* Récapitulatif */
            .summary {
              border: 2px solid #000;
              padding: 15px;
              margin: 20px 0;
              background-color: #f9f9f9;
              text-align: center;
            }
            .summary h3 {
              margin: 0 0 15px 0;
              font-size: 16px;
              text-decoration: underline;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              font-size: 14px;
            }
            .summary-total {
              font-size: 18px;
              font-weight: bold;
              color: #000;
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 15px;
            }
            
            /* Tableau des factures */
            .factures-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              border: 2px solid #000;
            }
            .factures-table th {
              background-color: #e0e0e0;
              border: 1px solid #000;
              padding: 10px;
              text-align: center;
              font-weight: bold;
              font-size: 12px;
            }
            .factures-table td {
              border: 1px solid #000;
              padding: 8px;
              font-size: 11px;
            }
            .factures-table .numero {
              text-align: center;
              font-weight: bold;
            }
            .factures-table .montant {
              text-align: right;
              font-weight: bold;
            }
            .factures-table .total-row {
              background-color: #e0e0e0;
              font-weight: bold;
              font-size: 14px;
            }
            
            /* Signatures */
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
            }
            .signature-box {
              width: 30%;
              text-align: center;
              border: 1px solid #000;
              padding: 15px;
              height: 100px;
            }
            .signature-box .title {
              font-weight: bold;
              margin-bottom: 15px;
              border-bottom: 1px solid #000;
              padding-bottom: 8px;
              font-size: 12px;
            }
            
            @media print {
              body { margin: 0; }
              .page { margin: 0; padding: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- En-tête officiel -->
            <div class="header">
              <h1>الصندوق الوطني للضمان الاجتماعي</h1>
              <div class="subtitle">CAISSE NATIONALE D'ASSURANCE MALADIE</div>
              <div class="subtitle">C.N.A.M</div>
              <div class="subtitle">الجمهورية التونسية - RÉPUBLIQUE TUNISIENNE</div>
            </div>
            
            <!-- Informations bordereau -->
            <div class="bordereau-header">
              <div>
                <div class="bordereau-number">BORDEREAU N° ${data.numero}</div>
                <div>ANNÉE: ${data.annee}</div>
              </div>
              <div>
                <div>DATE: ${data.dateGeneration.toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
            
            <!-- Récapitulatif -->
            <div class="summary">
              <h3>RÉCAPITULATIF GÉNÉRAL</h3>
              <div class="summary-row">
                <span>NOMBRE DE FACTURES:</span>
                <span><strong>${data.factures.length}</strong></span>
              </div>
              <div class="summary-row">
                <span>PÉRIODE:</span>
                <span><strong>${data.annee}</strong></span>
              </div>
              <div class="summary-row summary-total">
                <span>TOTAL GÉNÉRAL (DT):</span>
                <span>${data.totalGeneral.toFixed(3)}</span>
              </div>
            </div>
            
            <!-- Tableau des factures -->
            <table class="factures-table">
              <thead>
                <tr>
                  <th style="width: 15%;">N° FACTURE</th>
                  <th style="width: 40%;">NOM ET PRÉNOM</th>
                  <th style="width: 15%;">DATE</th>
                  <th style="width: 20%;">MONTANT TTC (DT)</th>
                  <th style="width: 10%;">STATUT</th>
                </tr>
              </thead>
              <tbody>
                ${data.factures
                  .map(
                    (facture: any, index: number) => `
                  <tr style="${index % 2 === 0 ? "background-color: #f9f9f9;" : ""}">
                    <td class="numero">${facture.numfac}</td>
                    <td>${facture.nom}</td>
                    <td style="text-align: center;">${facture.datfac.toLocaleDateString("fr-FR")}</td>
                    <td class="montant">${facture.montant.toFixed(3)}</td>
                    <td style="text-align: center;">✓</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding-right: 20px;"><strong>TOTAL GÉNÉRAL:</strong></td>
                  <td class="montant" style="font-size: 16px;"><strong>${data.totalGeneral.toFixed(3)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            
            <!-- Signatures -->
            <div class="signatures">
              <div class="signature-box">
                <div class="title">ÉTABLI PAR</div>
                <div style="height: 60px;"></div>
                <div style="font-size: 10px;">Signature et cachet</div>
              </div>
              <div class="signature-box">
                <div class="title">VÉRIFIÉ PAR</div>
                <div style="height: 60px;"></div>
                <div style="font-size: 10px;">Signature et cachet</div>
              </div>
              <div class="signature-box">
                <div class="title">APPROUVÉ PAR</div>
                <div style="height: 60px;"></div>
                <div style="font-size: 10px;">Signature et cachet</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

      const printWindow = window.open("", "_blank", "width=800,height=600")
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()

        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
          }, 500)
        }
      } else {
        throw new Error("Impossible d'ouvrir la fenêtre d'impression")
      }
    } catch (error) {
      console.error("Erreur dans printBordereau:", error)
      throw error
    }
  }

  static async generatePDF(facture: Facture, montantEnLettres: string): Promise<Blob> {
    const htmlContent = `Facture PDF pour ${facture.numfac}`
    return new Blob([htmlContent], { type: "text/html" })
  }
}
