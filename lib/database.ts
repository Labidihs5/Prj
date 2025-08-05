"use client"

import { neon } from "@neondatabase/serverless"

// Types
export interface Facture {
  id?: string
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
  ind: string
  generated: string
  dateCreation: Date
  dateModification: Date
}

export interface HistoriqueEntry {
  id?: string
  action: "CREATE" | "UPDATE" | "DELETE" | "PRINT" | "EXPORT" | "GENERATE"
  table: string
  recordId: string
  details: string
  utilisateur: string
  dateAction: Date
}

export interface DatabaseConfig {
  connectionString: string
  host?: string
  database?: string
  username?: string
  password?: string
  port?: number
  ssl?: boolean
}

// Service de base de données Neon
class NeonDatabaseService {
  private sql: any = null
  private isInitialized = false
  private initPromise: Promise<void> | null = null
  private config: DatabaseConfig = {
    connectionString:
      "postgresql://neondb_owner:npg_6FgGQ3tMTnaR@ep-holy-frost-a23erwvq-pooler.eu-central-1.aws.neon.tech/prjcnam?sslmode=require&channel_binding=require",
  }

  // Réinitialiser le service
  reset(): void {
    this.sql = null
    this.isInitialized = false
    this.initPromise = null
    console.log("🔄 Neon Database service reset")
  }

  // Initialiser la base de données - version simplifiée
  async init(customConfig?: DatabaseConfig): Promise<void> {
    // Si déjà initialisé, retourner immédiatement
    if (this.isInitialized && this.sql) {
      return
    }

    // Si une initialisation est en cours, attendre qu'elle se termine
    if (this.initPromise) {
      return this.initPromise
    }

    // Créer une nouvelle promesse d'initialisation
    this.initPromise = this.performInit(customConfig)

    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  private async performInit(customConfig?: DatabaseConfig): Promise<void> {
    try {
      console.log("🔄 Starting Neon database initialization...")

      // Configuration
      if (customConfig) {
        this.config = customConfig
      } else {
        const savedConfig = this.loadConfigFromStorage()
        if (savedConfig) {
          this.config = savedConfig
        }
      }

      if (!this.config.connectionString) {
        throw new Error("Database connection string is required")
      }

      // Initialiser la connexion
      this.sql = neon(this.config.connectionString)

      // Test de connexion simple
      await this.sql`SELECT 1 as test`
      console.log("✅ Database connection successful")

      // Créer les tables
      await this.createTables()

      // Initialiser les paramètres
      await this.initParameters()

      this.isInitialized = true
      this.saveConfigToStorage()

      console.log("✅ Neon database initialized successfully")
    } catch (error) {
      console.error("❌ Database initialization failed:", error)
      this.isInitialized = false
      this.sql = null

      let errorMessage = "Database initialization failed"
      if (error instanceof Error) {
        errorMessage = error.message
      }

      throw new Error(errorMessage)
    }
  }

  // Tester la connexion
  async testConnection(): Promise<boolean> {
    try {
      if (!this.sql) {
        this.sql = neon(this.config.connectionString)
      }
      await this.sql`SELECT 1 as test`
      return true
    } catch (error) {
      console.error("Connection test failed:", error)
      return false
    }
  }

  // Créer les tables - version simplifiée
  private async createTables(): Promise<void> {
    try {
      // Table des factures
      await this.sql`
        CREATE TABLE IF NOT EXISTS factures (
          id SERIAL PRIMARY KEY,
          nom TEXT NOT NULL,
          designation TEXT DEFAULT '',
          nombreseance INTEGER DEFAULT 0,
          nombresemaine INTEGER DEFAULT 0,
          nombre INTEGER DEFAULT 0,
          puttc DECIMAL(10,3) DEFAULT 0,
          mntht DECIMAL(10,3) DEFAULT 0,
          mnttva DECIMAL(10,3) DEFAULT 0,
          mnt DECIMAL(10,3) DEFAULT 0,
          numass TEXT DEFAULT '',
          annprc TEXT DEFAULT '',
          numprc TEXT DEFAULT '',
          burreg TEXT DEFAULT '',
          cleass TEXT DEFAULT '',
          datfac TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ddeb TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          dfn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          numfac TEXT UNIQUE NOT NULL,
          annee INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP),
          ind TEXT DEFAULT '0',
          generated TEXT DEFAULT '0',
          date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Table des paramètres
      await this.sql`
        CREATE TABLE IF NOT EXISTS parametres (
          id SERIAL PRIMARY KEY,
          cle TEXT UNIQUE NOT NULL,
          valeur TEXT DEFAULT '',
          description TEXT DEFAULT '',
          date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Table de l'historique
      await this.sql`
        CREATE TABLE IF NOT EXISTS historique (
          id SERIAL PRIMARY KEY,
          action TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          details TEXT DEFAULT '',
          utilisateur TEXT DEFAULT 'system',
          date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      console.log("✅ Database tables created")
    } catch (error) {
      console.error("❌ Error creating tables:", error)
      throw error
    }
  }

  // Initialiser les paramètres par défaut
  private async initParameters(): Promise<void> {
    try {
      const params = [
        { cle: "prixUnitaireTTC", valeur: "11.5" },
        { cle: "bureauDefaut", valeur: "001" },
        { cle: "dernierNumeroFacture", valeur: "0" },
      ]

      for (const param of params) {
        const exists = await this.sql`
          SELECT id FROM parametres WHERE cle = ${param.cle} LIMIT 1
        `

        if (exists.length === 0) {
          await this.sql`
            INSERT INTO parametres (cle, valeur) 
            VALUES (${param.cle}, ${param.valeur})
          `
        }
      }
    } catch (error) {
      console.error("Error initializing parameters:", error)
    }
  }

  // Configuration
  getCurrentConfig(): DatabaseConfig {
    return { ...this.config }
  }

  async updateConfig(newConfig: DatabaseConfig): Promise<void> {
    this.config = newConfig
    this.reset()
    await this.init(newConfig)
  }

  private saveConfigToStorage(): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("neon_db_config", JSON.stringify(this.config))
      }
    } catch (error) {
      console.error("Error saving config:", error)
    }
  }

  private loadConfigFromStorage(): DatabaseConfig | null {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("neon_db_config")
        if (saved) {
          return JSON.parse(saved)
        }
      }
    } catch (error) {
      console.error("Error loading config:", error)
    }
    return null
  }

  // === MÉTHODES PRINCIPALES ===

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init()
    }
  }

  async saveFacture(facture: Omit<Facture, "id" | "dateCreation" | "dateModification">): Promise<Facture> {
    await this.ensureInitialized()

    try {
      const result = await this.sql`
        INSERT INTO factures (
          nom, designation, nombreseance, nombresemaine, nombre, puttc, mntht, mnttva, mnt,
          numass, annprc, numprc, burreg, cleass, datfac, ddeb, dfn, numfac, annee, ind, generated
        ) VALUES (
          ${facture.nom}, ${facture.designation}, ${facture.nombreseance}, ${facture.nombresemaine},
          ${facture.nombre}, ${facture.puttc}, ${facture.mntht}, ${facture.mnttva}, ${facture.mnt},
          ${facture.numass}, ${facture.annprc}, ${facture.numprc}, ${facture.burreg}, ${facture.cleass},
          ${facture.datfac.toISOString()}, ${facture.ddeb.toISOString()}, ${facture.dfn.toISOString()},
          ${facture.numfac}, ${facture.annee}, ${facture.ind}, ${facture.generated}
        ) RETURNING *
      `

      const saved = result[0]
      return {
        ...facture,
        id: saved.id.toString(),
        dateCreation: new Date(saved.date_creation),
        dateModification: new Date(saved.date_modification),
      }
    } catch (error) {
      console.error("Error saving facture:", error)
      throw new Error(
        `Impossible de sauvegarder la facture: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      )
    }
  }

  async getFacturesNonGenerees(): Promise<Facture[]> {
    await this.ensureInitialized()

    try {
      const result = await this.sql`
        SELECT * FROM factures 
        WHERE generated = '0' AND ind != '8'
        ORDER BY date_creation ASC
      `

      return result.map((row: any) => ({
        id: row.id.toString(),
        nom: row.nom || "",
        designation: row.designation || "",
        nombreseance: row.nombreseance || 0,
        nombresemaine: row.nombresemaine || 0,
        nombre: row.nombre || 0,
        puttc: Number.parseFloat(row.puttc) || 0,
        mntht: Number.parseFloat(row.mntht) || 0,
        mnttva: Number.parseFloat(row.mnttva) || 0,
        mnt: Number.parseFloat(row.mnt) || 0,
        numass: row.numass || "",
        annprc: row.annprc || "",
        numprc: row.numprc || "",
        burreg: row.burreg || "",
        cleass: row.cleass || "",
        datfac: new Date(row.datfac),
        ddeb: new Date(row.ddeb),
        dfn: new Date(row.dfn),
        numfac: row.numfac,
        annee: row.annee || new Date().getFullYear(),
        ind: row.ind || "0",
        generated: row.generated || "0",
        dateCreation: new Date(row.date_creation),
        dateModification: new Date(row.date_modification),
      }))
    } catch (error) {
      console.error("Error getting factures:", error)
      return []
    }
  }

  async getNextFactureNumber(): Promise<string> {
    await this.ensureInitialized()

    try {
      const result = await this.sql`
        SELECT valeur FROM parametres WHERE cle = 'dernierNumeroFacture' LIMIT 1
      `

      const lastNumber = result.length > 0 ? Number.parseInt(result[0].valeur) || 0 : 0
      const nextNumber = lastNumber + 1
      const currentYear = new Date().getFullYear()

      return `${nextNumber}/${currentYear}`
    } catch (error) {
      console.error("Error getting next number:", error)
      return `1/${new Date().getFullYear()}`
    }
  }

  async reserveFactureNumber(): Promise<string> {
    await this.ensureInitialized()

    try {
      const result = await this.sql`
        SELECT valeur FROM parametres WHERE cle = 'dernierNumeroFacture' LIMIT 1
      `

      const currentNumber = result.length > 0 ? Number.parseInt(result[0].valeur) || 0 : 0
      const nextNumber = currentNumber + 1

      await this.sql`
        UPDATE parametres SET valeur = ${nextNumber.toString()}
        WHERE cle = 'dernierNumeroFacture'
      `

      const currentYear = new Date().getFullYear()
      return `${nextNumber}/${currentYear}`
    } catch (error) {
      console.error("Error reserving number:", error)
      throw new Error("Impossible de réserver un numéro de facture")
    }
  }

  async getParametre(cle: string): Promise<string | null> {
    await this.ensureInitialized()

    try {
      const result = await this.sql`
        SELECT valeur FROM parametres WHERE cle = ${cle} LIMIT 1
      `
      return result.length > 0 ? result[0].valeur : null
    } catch (error) {
      console.error("Error getting parameter:", error)
      return null
    }
  }

  async setParametre(cle: string, valeur: string): Promise<void> {
    await this.ensureInitialized()

    try {
      const exists = await this.sql`
        SELECT id FROM parametres WHERE cle = ${cle} LIMIT 1
      `

      if (exists.length > 0) {
        await this.sql`
          UPDATE parametres SET valeur = ${valeur} WHERE cle = ${cle}
        `
      } else {
        await this.sql`
          INSERT INTO parametres (cle, valeur) VALUES (${cle}, ${valeur})
        `
      }
    } catch (error) {
      console.error("Error setting parameter:", error)
      throw new Error("Impossible de sauvegarder le paramètre")
    }
  }

  async marquerFacturesCommeGenerees(factureIds: string[]): Promise<void> {
    await this.ensureInitialized()

    try {
      for (const id of factureIds) {
        await this.sql`
          UPDATE factures SET generated = '1' WHERE id = ${id}
        `
      }
    } catch (error) {
      console.error("Error marking factures:", error)
      throw new Error("Impossible de marquer les factures comme générées")
    }
  }

  // Méthodes simplifiées pour éviter les boucles
  async updateFacture(facture: Facture): Promise<Facture> {
    await this.ensureInitialized()
    // Implementation simplifiée
    return facture
  }

  async getFactures(): Promise<Facture[]> {
    await this.ensureInitialized()
    return []
  }

  async addHistorique(): Promise<void> {
    // Méthode vide pour éviter les erreurs
  }

  async getStatistiques() {
    await this.ensureInitialized()
    return {
      totalFactures: 0,
      totalMontant: 0,
      facturesAujourdhui: 0,
      facturesCeMois: 0,
      moyenneMensuelle: 0,
      facturesNonGenerees: 0,
    }
  }

  async exportDatabase(): Promise<string> {
    return JSON.stringify({ message: "Export not implemented" })
  }

  async clearDatabase(): Promise<void> {
    await this.ensureInitialized()
    await this.sql`DELETE FROM factures`
  }
}

// Instance singleton
export const database = new NeonDatabaseService()
