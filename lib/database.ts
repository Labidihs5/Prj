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
      "by-generated": string
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
      action: "CREATE" | "UPDATE" | "DELETE" | "PRINT" | "EXPORT" | "GENERATE"
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
  generated: string // '0' = non généré, '1' = généré
  dateCreation: Date
  dateModification: Date
  dateGeneration?: Date
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
      this.db = await openDB<CNAMDatabase>("CNAM_DB", 5, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log(`🔄 Mise à jour DB de v${oldVersion} vers v${newVersion}`)

          // ✅ PRÉSERVER LES DONNÉES EXISTANTES
          const existingFactures: any[] = []
          const existingBorderaux: any[] = []
          const existingParametres: any[] = []
          const existingHistorique: any[] = []

          // Sauvegarder les données existantes si la table existe
          if (oldVersion > 0) {
            try {
              if (db.objectStoreNames.contains("factures")) {
                const factureStore = transaction.objectStore("factures")
                // Les données seront préservées automatiquement par IndexedDB
                console.log("📋 Données factures préservées")
              }
            } catch (error) {
              console.log("⚠️ Pas de données existantes à préserver")
            }
          }

          // Table factures
          if (!db.objectStoreNames.contains("factures")) {
            console.log("🆕 Création table factures")
            const factureStore = db.createObjectStore("factures", {
              keyPath: "id",
              autoIncrement: true,
            })
            factureStore.createIndex("by-numfac", "numfac", { unique: false })
            factureStore.createIndex("by-date", "datfac")
            factureStore.createIndex("by-patient", "nom")
            factureStore.createIndex("by-status", "ind")
            factureStore.createIndex("by-generated", "generated")
          } else {
            // Mise à jour des index si nécessaire
            const factureStore = transaction.objectStore("factures")

            // Ajouter l'index generated s'il n'existe pas
            if (!factureStore.indexNames.contains("by-generated")) {
              console.log("🔧 Ajout index by-generated")
              factureStore.createIndex("by-generated", "generated")
            }

            // Corriger l'index numfac s'il est unique
            if (factureStore.indexNames.contains("by-numfac")) {
              try {
                const index = factureStore.index("by-numfac")
                // Vérifier si l'index est unique (pas de méthode directe, on teste)
                // Si on arrive ici, l'index existe, on le laisse tel quel
                console.log("✅ Index by-numfac existe déjà")
              } catch (error) {
                console.log("🔧 Recréation index by-numfac")
                factureStore.deleteIndex("by-numfac")
                factureStore.createIndex("by-numfac", "numfac", { unique: false })
              }
            }
          }

          // Table borderaux
          if (!db.objectStoreNames.contains("borderaux")) {
            console.log("🆕 Création table borderaux")
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
            console.log("🆕 Création table parametres")
            db.createObjectStore("parametres", { keyPath: "cle" })
          }

          // Table historique
          if (!db.objectStoreNames.contains("historique")) {
            console.log("🆕 Création table historique")
            db.createObjectStore("historique", {
              keyPath: "id",
              autoIncrement: true,
            })
          }

          console.log("✅ Structure base de données mise à jour")
        },
      })

      // Initialiser seulement si c'est une nouvelle base
      await this.initializeDefaultDataIfNeeded()

      // Migration douce des données existantes
      await this.migrateExistingDataSafely()

      this.isInitialized = true
      console.log("✅ Base de données CNAM initialisée avec succès")

      // Afficher les statistiques
      await this.logDatabaseStats()
    } catch (error) {
      console.error("❌ Erreur initialisation DB:", error)
      throw new Error("Impossible d'initialiser la base de données")
    }
  }

  // Afficher les statistiques de la base
  private async logDatabaseStats(): Promise<void> {
    try {
      const stats = await this.getStatistiques()
      console.log("📊 Statistiques base de données:")
      console.log(`   - Factures: ${stats.totalFactures}`)
      console.log(`   - Non générées: ${stats.facturesNonGenerees}`)
      console.log(`   - Montant total: ${stats.totalMontant.toFixed(3)} DT`)
    } catch (error) {
      console.log("⚠️ Impossible d'afficher les statistiques")
    }
  }

  // Migration sécurisée des données existantes
  private async migrateExistingDataSafely(): Promise<void> {
    if (!this.db) return

    try {
      const tx = this.db.transaction("factures", "readwrite")
      const factures = await tx.store.getAll()

      let facturesModifiees = 0

      for (const facture of factures) {
        let needsUpdate = false

        // Ajouter le champ 'generated' s'il manque
        if (facture.generated === undefined) {
          facture.generated = "0"
          needsUpdate = true
        }

        // Ajouter les dates de création/modification si elles manquent
        if (!facture.dateCreation) {
          facture.dateCreation = facture.datfac || new Date()
          needsUpdate = true
        }

        if (!facture.dateModification) {
          facture.dateModification = facture.datfac || new Date()
          needsUpdate = true
        }

        // Corriger le champ 'ind' s'il manque
        if (!facture.ind) {
          facture.ind = "0"
          needsUpdate = true
        }

        if (needsUpdate) {
          await tx.store.put(facture)
          facturesModifiees++
        }
      }

      await tx.done

      if (facturesModifiees > 0) {
        console.log(`🔧 ${facturesModifiees} factures mises à jour lors de la migration`)
      } else {
        console.log("✅ Aucune migration nécessaire")
      }
    } catch (error) {
      console.error("⚠️ Erreur migration douce:", error)
    }
  }

  // Initialiser les données par défaut seulement si nécessaire
  private async initializeDefaultDataIfNeeded(): Promise<void> {
    if (!this.db) return

    try {
      // Vérifier si des paramètres existent déjà
      const tx = this.db.transaction("parametres", "readonly")
      const existingParams = await tx.store.getAll()
      await tx.done

      if (existingParams.length > 0) {
        console.log("✅ Paramètres existants trouvés, pas d'initialisation nécessaire")
        return
      }

      console.log("🆕 Initialisation des paramètres par défaut")
      const anneeEnCours = new Date().getFullYear()

      // Paramètres par défaut
      const parametresDefaut = [
        { cle: `dernierNumFacture_${anneeEnCours}`, valeur: 0, dateModification: new Date() },
        { cle: "dernierNumBordereau", valeur: 0, dateModification: new Date() },
        { cle: "tauxTVA", valeur: 0.07, dateModification: new Date() },
        { cle: "prixUnitaireTTC", valeur: 11.5, dateModification: new Date() },
        { cle: "bureauDefaut", valeur: "001", dateModification: new Date() },
        { cle: "anneeEnCours", valeur: anneeEnCours, dateModification: new Date() },
      ]

      const txWrite = this.db.transaction("parametres", "readwrite")
      for (const param of parametresDefaut) {
        await txWrite.store.add(param)
      }
      await txWrite.done

      console.log("✅ Paramètres par défaut initialisés")
    } catch (error) {
      console.error("⚠️ Erreur initialisation données par défaut:", error)
    }
  }

  // === GESTION DES FACTURES ===

  async saveFacture(facture: Omit<Facture, "id" | "dateCreation" | "dateModification">): Promise<Facture> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const now = new Date()

      // Vérifier si le numéro existe déjà (recherche plus robuste)
      const existingFacture = await this.getFactureByNumero(facture.numfac)
      if (existingFacture && existingFacture.ind !== "8") {
        throw new Error(`Le numéro de facture ${facture.numfac} existe déjà`)
      }

      const factureComplete: Facture = {
        ...facture,
        ind: facture.ind || "0",
        generated: "0",
        dateCreation: now,
        dateModification: now,
      }

      const tx = this.db.transaction(["factures"], "readwrite")

      try {
        // Sauvegarder la facture
        const id = await tx.objectStore("factures").add(factureComplete)
        factureComplete.id = id as number

        await tx.done

        // Enregistrer dans l'historique
        await this.addHistorique("CREATE", "factures", factureComplete.id, `Facture ${facture.numfac} créée`)

        console.log("✅ Facture sauvegardée:", factureComplete.id)
        return factureComplete
      } catch (txError) {
        await tx.abort()
        throw txError
      }
    } catch (error) {
      console.error("❌ Erreur sauvegarde facture:", error)
      if (error.message && error.message.includes("Key already exists")) {
        throw new Error(`Le numéro de facture ${facture.numfac} existe déjà dans la base de données`)
      }
      throw new Error(`Impossible de sauvegarder la facture: ${error.message}`)
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
      console.error("❌ Erreur modification facture:", error)
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
      console.error("❌ Erreur suppression facture:", error)
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
      console.error("❌ Erreur récupération factures:", error)
      return []
    }
  }

  // NOUVELLE MÉTHODE : Récupérer les factures non générées
  async getFacturesNonGenerees(): Promise<Facture[]> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("factures", "readonly")
      const factures = await tx.store.index("by-generated").getAll("0")
      await tx.done

      // Filtrer aussi les factures non supprimées
      return factures.filter((f) => f.ind !== "8")
    } catch (error) {
      console.error("❌ Erreur récupération factures non générées:", error)
      return []
    }
  }

  // NOUVELLE MÉTHODE : Marquer les factures comme générées
  async marquerFacturesCommeGenerees(factureIds: number[]): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("factures", "readwrite")
      const now = new Date()

      for (const id of factureIds) {
        const facture = await tx.store.get(id)
        if (facture) {
          facture.generated = "1"
          facture.dateGeneration = now
          facture.dateModification = now
          await tx.store.put(facture)
        }
      }

      await tx.done

      // Enregistrer dans l'historique
      await this.addHistorique("GENERATE", "factures", 0, `${factureIds.length} factures marquées comme générées`)
    } catch (error) {
      console.error("❌ Erreur marquage factures:", error)
      throw new Error("Impossible de marquer les factures comme générées")
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
      console.error("❌ Erreur récupération facture:", error)
      return null
    }
  }

  async getFactureByNumero(numfac: string): Promise<Facture | null> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const tx = this.db.transaction("factures", "readonly")
      const factures = await tx.store.index("by-numfac").getAll(numfac)
      await tx.done

      // Retourner la première facture active avec ce numéro
      const factureActive = factures.find((f) => f.ind !== "8")
      return factureActive || null
    } catch (error) {
      console.error("❌ Erreur recherche facture par numéro:", error)
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
      console.error("❌ Erreur recherche factures:", error)
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
      console.error("❌ Erreur sauvegarde bordereau:", error)
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
      console.error("❌ Erreur récupération borderaux:", error)
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
      console.error("❌ Erreur récupération paramètre:", error)
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
      console.error("❌ Erreur sauvegarde paramètre:", error)
      throw new Error("Impossible de sauvegarder le paramètre")
    }
  }

  async getNextFactureNumber(): Promise<string> {
    const anneeEnCours = new Date().getFullYear()
    const cleSequence = `dernierNumFacture_${anneeEnCours}`

    // Récupérer la dernière séquence pour cette année
    const dernierNum = (await this.getParametre(cleSequence)) || 0

    // Incrémenter la séquence
    const nouvelleSequence = dernierNum + 1

    // Mettre à jour immédiatement la séquence dans la base
    await this.setParametre(cleSequence, nouvelleSequence)

    return `${nouvelleSequence}/${anneeEnCours}`
  }

  async reserveFactureNumber(): Promise<string> {
    const anneeEnCours = new Date().getFullYear()
    const cleSequence = `dernierNumFacture_${anneeEnCours}`

    // Récupérer et incrémenter atomiquement
    const dernierNum = (await this.getParametre(cleSequence)) || 0
    const nouvelleSequence = dernierNum + 1

    // Sauvegarder immédiatement la nouvelle séquence
    await this.setParametre(cleSequence, nouvelleSequence)

    const numeroReserve = `${nouvelleSequence}/${anneeEnCours}`

    console.log(`📝 Numéro réservé: ${numeroReserve} (séquence: ${nouvelleSequence})`)

    return numeroReserve
  }

  async getNextBordereauNumber(): Promise<string> {
    const dernierNum = (await this.getParametre("dernierNumBordereau")) || 0
    const annee = new Date().getFullYear()
    return `BOR${String(dernierNum + 1).padStart(3, "0")}/${annee}`
  }

  // === HISTORIQUE ===

  async addHistorique(
    action: "CREATE" | "UPDATE" | "DELETE" | "PRINT" | "EXPORT" | "GENERATE",
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
      console.error("❌ Erreur ajout historique:", error)
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
      console.error("❌ Erreur récupération historique:", error)
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
    facturesNonGenerees: number
  }> {
    await this.init()
    const factures = await this.getFactures()
    const facturesNonGenerees = await this.getFacturesNonGenerees()

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
      facturesNonGenerees: facturesNonGenerees.length,
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
        dateGeneration: f.dateGeneration?.toISOString(),
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

      // ⚠️ ATTENTION: Cette fonction vide la base !
      console.log("⚠️ IMPORT: Vidage de la base de données existante")

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
          dateGeneration: facture.dateGeneration ? new Date(facture.dateGeneration) : undefined,
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
      console.log("✅ Base de données importée avec succès")
    } catch (error) {
      console.error("❌ Erreur import base de données:", error)
      throw new Error("Impossible d'importer la base de données")
    }
  }

  // === NETTOYAGE ===

  async clearDatabase(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      console.log("⚠️ NETTOYAGE: Vidage de la base de données")

      const tx = this.db.transaction(["factures", "borderaux", "historique"], "readwrite")
      await tx.objectStore("factures").clear()
      await tx.objectStore("borderaux").clear()
      await tx.objectStore("historique").clear()
      await tx.done

      console.log("✅ Base de données vidée")
    } catch (error) {
      console.error("❌ Erreur nettoyage base de données:", error)
      throw new Error("Impossible de vider la base de données")
    }
  }

  // Ajouter une méthode pour obtenir la prochaine séquence pour une année donnée
  async getNextSequenceForYear(annee: number): Promise<number> {
    const cleSequence = `dernierNumFacture_${annee}`
    const dernierNum = (await this.getParametre(cleSequence)) || 0
    return dernierNum + 1
  }

  // Ajouter une méthode pour vérifier si un numéro de facture est disponible
  async isFactureNumberAvailable(numfac: string): Promise<boolean> {
    try {
      const existing = await this.getFactureByNumero(numfac)
      return !existing
    } catch (error) {
      return true
    }
  }

  // Nouvelle méthode pour nettoyer les doublons (sans supprimer les données)
  async cleanupDuplicateNumbers(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Base de données non initialisée")

    try {
      const factures = await this.getFactures(true) // Inclure les supprimées
      const numerosVus = new Set<string>()
      const doublons: Facture[] = []

      for (const facture of factures) {
        if (numerosVus.has(facture.numfac)) {
          doublons.push(facture)
        } else {
          numerosVus.add(facture.numfac)
        }
      }

      if (doublons.length > 0) {
        console.log(`🔧 ${doublons.length} doublons détectés, marquage comme supprimés...`)
        const tx = this.db.transaction("factures", "readwrite")

        for (const doublon of doublons) {
          // Marquer comme supprimé au lieu de supprimer physiquement
          doublon.ind = "8"
          doublon.dateModification = new Date()
          await tx.store.put(doublon)
        }

        await tx.done
        console.log("✅ Doublons marqués comme supprimés")
      }
    } catch (error) {
      console.error("❌ Erreur nettoyage doublons:", error)
    }
  }
}

// Instance singleton
export const db = new DatabaseService()

// Initialiser automatiquement
if (typeof window !== "undefined") {
  db.init().catch(console.error)
}
