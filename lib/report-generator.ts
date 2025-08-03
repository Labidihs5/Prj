"use client"

import type { Facture } from "./database"

export class ReportGenerator {
  static async generateFactureReport(facture: Facture, reportUrl?: string): Promise<Blob> {
    try {
      if (reportUrl) {
        // Utiliser le rapport Crystal Report fourni
        const response = await fetch(reportUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            facture: facture,
            format: "pdf",
          }),
        })

        if (response.ok) {
          return await response.blob()
        }
      }

      // Fallback : génération PDF basique
      return this.generateBasicPDF(facture)
    } catch (error) {
      console.error("Erreur génération rapport:", error)
      return this.generateBasicPDF(facture)
    }
  }

  private static generateBasicPDF(facture: Facture): Blob {
    // Génération PDF de base en attendant le rapport Crystal
    const pdfContent = `
      FACTURE N° ${facture.numfac}
      Date: ${facture.datfac.toLocaleDateString("fr-FR")}
      
      Client: ${facture.nom}
      N° Associé Social: ${facture.numass}
      
      Désignation: ${facture.designation}
      Nombre de séances: ${facture.nombreseance}
      Nombre de semaines: ${facture.nombresemaine}
      PU TTC: ${facture.puttc} DT
      
      Total HT: ${facture.mntht.toFixed(3)} DT
      TVA 7%: ${facture.mnttva.toFixed(3)} DT
      Total TTC: ${facture.mnt.toFixed(3)} DT
    `

    return new Blob([pdfContent], { type: "application/pdf" })
  }

  static async generateBordereauReport(reportUrl?: string): Promise<Blob> {
    try {
      if (reportUrl) {
        const response = await fetch(reportUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          return await response.blob()
        }
      }

      // Fallback
      const content = "Rapport Bordereau - En attente du rapport Crystal Report"
      return new Blob([content], { type: "application/pdf" })
    } catch (error) {
      console.error("Erreur génération bordereau:", error)
      const content = "Erreur génération bordereau"
      return new Blob([content], { type: "text/plain" })
    }
  }
}
