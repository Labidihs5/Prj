"use client"
import type { Facture } from "./database"

export class FileGenerator {
  // Fonction utilitaire pour padding (comme dans le VB original)
  static lPad(str: string | number, length: number, padChar = "0"): string {
    const s = String(str)
    return s.length >= length ? s : new Array(length - s.length + 1).join(padChar) + s
  }

  static rPad(str: string | number, length: number, padChar = " "): string {
    const s = String(str)
    return s.length >= length ? s : s + new Array(length - s.length + 1).join(padChar)
  }

  // Générer le fichier de données CNAM (format original VB)
  static async generateCNAMFile(factures: Facture[]): Promise<{ content: string; filename: string }> {
    try {
      console.log("Génération fichier CNAM pour", factures.length, "factures")

      let fileContent = ""
      const currentYear = new Date().getFullYear()
      const currentDate = new Date()

      // Simuler les données comme dans le VB original
      const numBordereau = this.getNextBordereauNumber()

      // En-tête du fichier (ligne type 1 - Général)
      if (factures.length > 0) {
        const firstFacture = factures[0]

        // Calculer les totaux
        const totalGeneral = factures.reduce((sum, f) => sum + f.mnt, 0)
        const totalHT = factures.reduce((sum, f) => sum + f.mntht, 0)
        const totalTVA = factures.reduce((sum, f) => sum + f.mnttva, 0)
        const totalSeances = factures.reduce((sum, f) => sum + f.nombre, 0)

        // Format ligne générale (type 1)
        const ligneGenerale =
          "1" + // Type d'enregistrement
          this.lPad(currentYear, 4) + // Année bordereau
          this.lPad(numBordereau, 3, "0") + // Numéro bordereau
          this.rPad(firstFacture.burreg || "001", 3) + // Code bureau
          this.lPad(currentYear, 4, "0") + // Année
          this.rPad("", 15, " ") + // Réservé
          this.rPad(firstFacture.burreg || "001", 3) + // Bureau régional
          this.rPad("01", 2) + // Code prestataire
          this.lPad(currentYear, 4) + // Année PEC
          this.lPad(firstFacture.numprc || "000001", 6, "0") + // Numéro PEC
          this.rPad(firstFacture.numass || "0000000000", 10, "0") + // Numéro associé
          this.lPad(totalSeances, 3, "0") + // Nombre total séances
          this.lPad(factures.length, 3, "0") + // Nombre de factures
          this.formatDateForFile(firstFacture.ddeb) + // Date début
          this.formatDateForFile(firstFacture.dfn) + // Date fin
          this.lPad(Math.round(totalGeneral * 1000), 10, "0") + // Montant général (millimes)
          this.lPad(Math.round(totalHT * 1000), 10, "0") + // Montant HT (millimes)
          this.lPad(Math.round(totalHT * 1000), 10, "0") + // Assiette TVA (millimes)
          this.lPad(Math.round(totalTVA * 1000), 10, "0") + // Montant TVA (millimes)
          this.formatDateForFile(currentDate) // Date facture

        fileContent += ligneGenerale + "\n"
      }

      // Détail des factures (lignes type 2)
      factures.forEach((facture, index) => {
        const ligneDetail =
          "2" + // Type d'enregistrement
          this.lPad(currentYear, 4) + // Année bordereau
          this.lPad(numBordereau, 3, "0") + // Numéro bordereau
          this.rPad(facture.burreg || "001", 3) + // Code bureau
          this.lPad(facture.annee || currentYear, 4, "0") + // Année facture
          this.rPad(facture.numfac, 15, " ") + // Numéro facture
          this.rPad(facture.burreg || "001", 3) + // Bureau régional
          this.rPad("01", 2) + // Code prestataire
          this.rPad(facture.annprc || currentYear.toString(), 4) + // Année PEC
          this.lPad(facture.numprc || "000001", 6, "0") + // Numéro PEC
          this.lPad(facture.numass.substring(0, 10) || "0000000000", 10, "0") + // Numéro associé (10 chars)
          this.lPad(facture.cleass.substring(0, 2) || "00", 2, "0") + // Clé associé (2 chars)
          this.lPad(facture.nombreseance, 3, "0") + // Nombre séances
          this.lPad(facture.nombre, 3, "0") + // Nombre total
          this.formatDateForFile(facture.ddeb) + // Date début (YYYYMMDD)
          this.formatDateForFile(facture.dfn) + // Date fin (YYYYMMDD)
          this.lPad(Math.round(facture.mnt * 1000), 10, "0") + // Montant TTC (millimes)
          this.lPad(Math.round(facture.mntht * 1000), 10, "0") + // Montant HT (millimes)
          this.lPad(Math.round(facture.mntht * 1000), 10, "0") + // Assiette TVA (millimes)
          this.lPad(Math.round(facture.mnttva * 1000), 10, "0") + // Montant TVA (millimes)
          this.formatDateForFile(facture.datfac) // Date facture (YYYYMMDD)

        fileContent += ligneDetail + "\n"
      })

      // Nom du fichier avec timestamp
      const timestamp = currentDate.toISOString().slice(0, 10).replace(/-/g, "")
      const filename = `CNAM_${timestamp}_${numBordereau}.txt`

      console.log("Fichier généré:", filename, "Taille:", fileContent.length, "caractères")

      return {
        content: fileContent,
        filename: filename,
      }
    } catch (error) {
      console.error("Erreur génération fichier:", error)
      throw new Error("Impossible de générer le fichier CNAM")
    }
  }

  // Générer fichier CSV pour export
  static async generateCSVFile(factures: Facture[]): Promise<{ content: string; filename: string }> {
    try {
      console.log("Génération fichier CSV pour", factures.length, "factures")

      // En-tête CSV
      const headers = [
        "Numéro Facture",
        "Date Facture",
        "Nom Patient",
        "Numéro Associé",
        "Clé",
        "Bureau",
        "Année PEC",
        "Numéro PEC",
        "Désignation",
        "Nombre Séances",
        "Nombre Semaines",
        "Total Séances",
        "PU TTC",
        "Montant HT",
        "TVA 7%",
        "Montant TTC",
        "Date Début",
        "Date Fin",
      ]

      let csvContent = headers.join(";") + "\n"

      // Données
      factures.forEach((facture) => {
        const row = [
          facture.numfac,
          facture.datfac.toLocaleDateString("fr-FR"),
          `"${facture.nom.replace(/"/g, '""')}"`, // Échapper les guillemets
          facture.numass,
          facture.cleass,
          facture.burreg,
          facture.annprc,
          facture.numprc,
          `"${facture.designation.replace(/"/g, '""')}"`,
          facture.nombreseance,
          facture.nombresemaine,
          facture.nombre,
          facture.puttc.toFixed(3),
          facture.mntht.toFixed(3),
          facture.mnttva.toFixed(3),
          facture.mnt.toFixed(3),
          facture.ddeb.toLocaleDateString("fr-FR"),
          facture.dfn.toLocaleDateString("fr-FR"),
        ]
        csvContent += row.join(";") + "\n"
      })

      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      const filename = `Factures_CNAM_${timestamp}.csv`

      return {
        content: csvContent,
        filename: filename,
      }
    } catch (error) {
      console.error("Erreur génération CSV:", error)
      throw new Error("Impossible de générer le fichier CSV")
    }
  }

  // Générer fichier JSON pour sauvegarde
  static async generateJSONFile(factures: Facture[]): Promise<{ content: string; filename: string }> {
    try {
      const exportData = {
        dateExport: new Date().toISOString(),
        nombreFactures: factures.length,
        totalGeneral: factures.reduce((sum, f) => sum + f.mnt, 0),
        factures: factures.map((f) => ({
          ...f,
          datfac: f.datfac.toISOString(),
          ddeb: f.ddeb.toISOString(),
          dfn: f.dfn.toISOString(),
        })),
      }

      const jsonContent = JSON.stringify(exportData, null, 2)
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      const filename = `Backup_CNAM_${timestamp}.json`

      return {
        content: jsonContent,
        filename: filename,
      }
    } catch (error) {
      console.error("Erreur génération JSON:", error)
      throw new Error("Impossible de générer le fichier JSON")
    }
  }

  // Utilitaires privées
  private static formatDateForFile(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}${month}${day}`
  }

  private static getNextBordereauNumber(): string {
    // Simuler la génération du numéro de bordereau
    // En production, ceci viendrait de la base de données
    const timestamp = Date.now()
    return String(timestamp).slice(-3) // 3 derniers chiffres
  }

  // Télécharger le fichier généré
  static downloadFile(content: string, filename: string, mimeType = "text/plain"): void {
    try {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Nettoyer l'URL
      setTimeout(() => URL.revokeObjectURL(url), 100)

      console.log("Fichier téléchargé:", filename)
    } catch (error) {
      console.error("Erreur téléchargement:", error)
      throw new Error("Impossible de télécharger le fichier")
    }
  }
}
