"use client"

import { openDB, type DBSchema, type IDBPDatabase } from "idb"

// Schéma de la base de données
interface CNAMDatabase extends DBSchema {
  factures: {
    key: number
    value: Facture
    indexes: {
      "by-numfac": string
      "by-date": Date
      "by-patient": string
      "by-status": string
    }
  }
  borderaux: {
    key: number
    value: Bordereau
    indexes: {
      "by-numero": string
      "by-annee": number
      "by-date": Date
    }
  }
  parametres: {
    key: string
    value: {
      cle: string
      valeur: any
      dateModification: Date
    }
  }
  historique: {
    key: number
    value: {
      id?: number
      action: "CREATE" | "UPDATE" | "DELETE" | "PRINT" | "EXPORT"
      table: string
      recordId: number
      details: string
      utilisateur: string
      dateAction: Date
    }
  }
}

export interface Facture {
  id?: number
  nom: string
  designation: string
  nombreseance: number
  nombresemaine: number
  nombre: number
  puttc: number
  mntht: number
  mnttva: number
  mnt: number
  numass: string
  annprc: string
  numprc: string
  burreg: string
  cleass: string
  datfac: Date
  ddeb: Date
  dfn: Date
  numfac: string
  annee: number
  numbor?: string
  annfac?: number
  assiette?: string
  ind: string // '0' = actif, '8' = supprimé
  dateCreation: Date
  dateModification: Date
}

export interface Bordereau {
  id?: number
  annbor: number
  numbor: string
  assoc: string
  bur: string
  pres: string
  numpac: string
  assocs: string
  nbrs: number
  nbrg: number
  mntg: number
  mntht: number
  tva: number
  datfac: Date
  dateCreation: Date
  statut: "BROUILLON" | "VALIDE" | "TRANSMIS"
}

class DatabaseService {
  private db: IDBPDatabase<CNAMDatabase> | null = null
  private isInitialized = false

  // Initialiser la base de données
  async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.db = await openDB<CNAMDatabase>("CNAM_DB", 3, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log(`Mise à jour DB de v${oldVersion} vers v${newVersion}`)

          // Table factures
          if (!db.objectStoreNames.contains("factures")) {
            const factureStore = db.createObjectStore("factures", {
              keyPath: "id",
              autoIncrement: true,
            })
            factureStore.createIndex("by-numfac", "numfac", { unique: true })
            factureStore.createIndex("by-date", "datfac")
            factureStore.createIndex("by-patient", "nom")
            factureStore.createIndex("by-status", "ind")
          }

          // Table borderaux
          if (!db.objectStoreNames.contains("borderaux")) {
            const bordereauStore = db.createObjectStore("borderaux", {
              keyPath: "id",
              autoIncrement: true,
            })
            bordereauStore.createIndex("by-numero", "numbor", { unique: true })
            bordereauStore.createIndex("by-annee", "annbor")
            bordereauStore.createIndex("by-date", "datfac")
          }

          // Table paramètres
          if (!db.objectStoreNames.contains("parametres")) {
            db.createObjectStore("parametres", { keyPath: "cle" })
          }

          // Table historique
          if (!db.objectStoreNames.contains("historique")) {
            const historiqueStore = db.createObjectStore("historique", {
              keyPath: "id",
              autoIncrement: true,
            })
          }
        },
      })

      await this.initializeDefaultData()
      this.isInitialized = true
      console.log("Base de données CNAM initialisée avec succès")
    } catch (error) {
      console.error("Erreur initialisation DB:", error)
      throw new Error("Impossible d'initialiser la base de données")
    }
  }

  // Initialiser les données par défaut
  private async initializeDefaultData(): Promise<void> {
    if (!this.db) return

    try {
      // Paramètres par défaut
      const parametresDefaut = [
        { cle: "dernierNumFacture", valeur: 0, dateModification: new Date() },
        { cle: "dernierNumBordereau", valeur: 0, dateModification: new Date() },
        { cle: "tauxTVA", valeur: 0.07, dateModification: new Date() },
        { cle: "prixUnitaireTTC", valeur: 11.5, dateModification: new Date() },
        { cle: "bureauDefaut", valeur: "001", dateModification: new Date() },
        { cle: "anneeEnCours", valeur: new Date().getFullYear(), dateModification: new Date() },
      ]

      const tx = this.db.transaction("parametres", "readwrite")
      for (const param of parametresDefaut) {
        const existing = await tx.store.get(param.cle)
        if (!existing) {
          await tx.store.add(param)
        }
      }
      await tx.done
    } catch (error) {
      console.error("Erreur initialisation données par défaut:", error)
    }
  }

  // === GESTION DES FACTURES ===

  async saveFacture(facture: Omit<Facture, "id" | "dateCreation" | "dateModification">): Promise<Facture> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const now = new Date()
      const factureComplete: Facture = {
        ...facture,
        ind: facture.ind || "0",
        dateCreation: now,
        dateModification: now,
      }

      const tx = this.db.transaction(["factures", "parametres"], "readwrite")

      // Sauvegarder la facture
      const id = await tx.objectStore("factures").add(factureComplete)
      factureComplete.id = id as number

      // Mettre à jour le dernier numéro de facture
      const numFacture = Number.parseInt(facture.numfac.split("/")[0])
      await tx.objectStore("parametres").put({
        cle: "dernierNumFacture",
        valeur: numFacture,
        dateModification: now,
      })

      await tx.done

      // Enregistrer dans l'historique
      await this.addHistorique("CREATE", "factures", factureComplete.id, `Facture ${facture.numfac} créée`)

      console.log("Facture sauvegardée:", factureComplete.id)
      return factureComplete
    } catch (error) {
      console.error("Erreur sauvegarde facture:", error)
      throw new Error("Impossible de sauvegarder la facture")
    }
  }

  async updateFacture(facture: Facture): Promise<Facture> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const factureModifiee = {
        ...facture,
        dateModification: new Date(),
      }

      const tx = this.db.transaction("factures", "readwrite")
      await tx.store.put(factureModifiee)
      await tx.done

      await this.addHistorique("UPDATE", "factures", facture.id!, `Facture ${facture.numfac} modifiée`)

      return factureModifiee
    } catch (error) {
      console.error("Erreur modification facture:", error)
      throw new Error("Impossible de modifier la facture")
    }
  }

  async deleteFacture(id: number): Promise<boolean> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("factures", "readwrite")
      const facture = await tx.store.get(id)

      if (facture) {
        // Marquer comme supprimé au lieu de supprimer physiquement
        facture.ind = "8"
        facture.dateModification = new Date()
        await tx.store.put(facture)
        await tx.done

        await this.addHistorique("DELETE", "factures", id, `Facture ${facture.numfac} supprimée`)
        return true
      }
      return false
    } catch (error) {
      console.error("Erreur suppression facture:", error)
      throw new Error("Impossible de supprimer la facture")
    }
  }

  async getFactures(includeDeleted = false): Promise<Facture[]> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("factures", "readonly")
      const factures = await tx.store.getAll()
      await tx.done

      return includeDeleted ? factures : factures.filter((f) => f.ind !== "8")
    } catch (error) {
      console.error("Erreur récupération factures:", error)
      return []
    }
  }

  async getFactureById(id: number): Promise<Facture | null> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("factures", "readonly")
      const facture = await tx.store.get(id)
      await tx.done
      return facture || null
    } catch (error) {
      console.error("Erreur récupération facture:", error)
      return null
    }
  }

  async getFactureByNumero(numfac: string): Promise<Facture | null> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("factures", "readonly")
      const facture = await tx.store.index("by-numfac").get(numfac)
      await tx.done
      return facture || null
    } catch (error) {
      console.error("Erreur recherche facture par numéro:", error)
      return null
    }
  }

  async searchFactures(criteres: {
    nom?: string
    dateDebut?: Date
    dateFin?: Date
    bureau?: string
    statut?: string
  }): Promise<Facture[]> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      let factures = await this.getFactures()

      // Filtrer selon les critères
      if (criteres.nom) {
        factures = factures.filter((f) => f.nom.toLowerCase().includes(criteres.nom!.toLowerCase()))
      }

      if (criteres.dateDebut) {
        factures = factures.filter((f) => f.datfac >= criteres.dateDebut!)
      }

      if (criteres.dateFin) {
        factures = factures.filter((f) => f.datfac <= criteres.dateFin!)
      }

      if (criteres.bureau) {
        factures = factures.filter((f) => f.burreg === criteres.bureau)
      }

      if (criteres.statut) {
        factures = factures.filter((f) => f.ind === criteres.statut)
      }

      return factures
    } catch (error) {
      console.error("Erreur recherche factures:", error)
      return []
    }
  }

  // === GESTION DES BORDERAUX ===

  async saveBordereau(bordereau: Omit<Bordereau, "id" | "dateCreation">): Promise<Bordereau> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const bordereauComplet: Bordereau = {
        ...bordereau,
        dateCreation: new Date(),
      }

      const tx = this.db.transaction("borderaux", "readwrite")
      const id = await tx.store.add(bordereauComplet)
      bordereauComplet.id = id as number
      await tx.done

      await this.addHistorique("CREATE", "borderaux", bordereauComplet.id, `Bordereau ${bordereau.numbor} créé`)

      return bordereauComplet
    } catch (error) {
      console.error("Erreur sauvegarde bordereau:", error)
      throw new Error("Impossible de sauvegarder le bordereau")
    }
  }

  async getBorderaux(): Promise<Bordereau[]> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("borderaux", "readonly")
      const borderaux = await tx.store.getAll()
      await tx.done
      return borderaux
    } catch (error) {
      console.error("Erreur récupération borderaux:", error)
      return []
    }
  }

  // === GESTION DES PARAMÈTRES ===

  async getParametre(cle: string): Promise<any> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("parametres", "readonly")
      const param = await tx.store.get(cle)
      await tx.done
      return param?.valeur
    } catch (error) {
      console.error("Erreur récupération paramètre:", error)
      return null
    }
  }

  async setParametre(cle: string, valeur: any): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("parametres", "readwrite")
      await tx.store.put({
        cle,
        valeur,
        dateModification: new Date(),
      })
      await tx.done
    } catch (error) {
      console.error("Erreur sauvegarde paramètre:", error)
      throw new Error("Impossible de sauvegarder le paramètre")
    }
  }

  async getNextFactureNumber(): Promise<string> {
    const dernierNum = (await this.getParametre("dernierNumFacture")) || 0
    const annee = new Date().getFullYear()
    return `${dernierNum + 1}/${annee}`
  }

  async getNextBordereauNumber(): Promise<string> {
    const dernierNum = (await this.getParametre("dernierNumBordereau")) || 0
    const annee = new Date().getFullYear()
    return `BOR${String(dernierNum + 1).padStart(3, "0")}/${annee}`
  }

  // === HISTORIQUE ===

  private async addHistorique(
    action: "CREATE" | "UPDATE" | "DELETE" | "PRINT" | "EXPORT",
    table: string,
    recordId: number,
    details: string,
  ): Promise<void> {
    if (!this.db) return

    try {
      const tx = this.db.transaction("historique", "readwrite")
      await tx.store.add({
        action,
        table,
        recordId,
        details,
        utilisateur: "Utilisateur", // À remplacer par le vrai utilisateur
        dateAction: new Date(),
      })
      await tx.done
    } catch (error) {
      console.error("Erreur ajout historique:", error)
    }
  }

  async getHistorique(limit = 100): Promise<any[]> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("historique", "readonly")
      const historique = await tx.store.getAll()
      await tx.done

      return historique.sort((a, b) => b.dateAction.getTime() - a.dateAction.getTime()).slice(0, limit)
    } catch (error) {
      console.error("Erreur récupération historique:", error)
      return []
    }
  }

  // === STATISTIQUES ===

  async getStatistiques(): Promise<{
    totalFactures: number
    totalMontant: number
    facturesAujourdhui: number
    facturesCeMois: number
    moyenneMensuelle: number
  }> {
    await this.init()
    const factures = await this.getFactures()

    const aujourd = new Date()
    const debutMois = new Date(aujourd.getFullYear(), aujourd.getMonth(), 1)

    const facturesAujourdhui = factures.filter((f) => f.datfac.toDateString() === aujourd.toDateString()).length

    const facturesCeMois = factures.filter((f) => f.datfac >= debutMois).length

    const totalMontant = factures.reduce((sum, f) => sum + f.mnt, 0)

    return {
      totalFactures: factures.length,
      totalMontant,
      facturesAujourdhui,
      facturesCeMois,
      moyenneMensuelle: facturesCeMois / aujourd.getDate(),
    }
  }

  // === SAUVEGARDE/RESTAURATION ===

  async exportDatabase(): Promise<string> {
    await this.init()

    const factures = await this.getFactures(true)
    const borderaux = await this.getBorderaux()
    const historique = await this.getHistorique(1000)

    const exportData = {
      version: "1.0",
      dateExport: new Date().toISOString(),
      factures: factures.map((f) => ({
        ...f,
        datfac: f.datfac.toISOString(),
        ddeb: f.ddeb.toISOString(),
        dfn: f.dfn.toISOString(),
        dateCreation: f.dateCreation.toISOString(),
        dateModification: f.dateModification.toISOString(),
      })),
      borderaux: borderaux.map((b) => ({
        ...b,
        datfac: b.datfac.toISOString(),
        dateCreation: b.dateCreation.toISOString(),
      })),
      historique: historique.map((h) => ({
        ...h,
        dateAction: h.dateAction.toISOString(),
      })),
    }

    return JSON.stringify(exportData, null, 2)
  }

  async importDatabase(jsonData: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const data = JSON.parse(jsonData)

      // Vider les tables existantes
      const tx = this.db.transaction(["factures", "borderaux", "historique"], "readwrite")
      await tx.objectStore("factures").clear()
      await tx.objectStore("borderaux").clear()
      await tx.objectStore("historique").clear()

      // Importer les factures
      for (const facture of data.factures) {
        await tx.objectStore("factures").add({
          ...facture,
          datfac: new Date(facture.datfac),
          ddeb: new Date(facture.ddeb),
          dfn: new Date(facture.dfn),
          dateCreation: new Date(facture.dateCreation),
          dateModification: new Date(facture.dateModification),
        })
      }

      // Importer les borderaux
      for (const bordereau of data.borderaux) {
        await tx.objectStore("borderaux").add({
          ...bordereau,
          datfac: new Date(bordereau.datfac),
          dateCreation: new Date(bordereau.dateCreation),
        })
      }

      await tx.done
      console.log("Base de données importée avec succès")
    } catch (error) {
      console.error("Erreur import base de données:", error)
      throw new Error("Impossible d'importer la base de données")
    }
  }

  // === NETTOYAGE ===

  async clearDatabase(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction(["factures", "borderaux", "historique"], "readwrite")
      await tx.objectStore("factures").clear()
      await tx.objectStore("borderaux").clear()
      await tx.objectStore("historique").clear()
      await tx.done

      console.log("Base de données vidée")
    } catch (error) {
      console.error("Erreur nettoyage base de données:", error)
      throw new Error("Impossible de vider la base de données")
    }
  }
}

// Instance singleton
export const db = new DatabaseService()

// Initialiser automatiquement
if (typeof window !== "undefined") {
  db.init().catch(console.error)
}
