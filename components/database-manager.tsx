"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Download, Upload, Trash2, Search, History, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db, type Facture } from "@/lib/database"

export function DatabaseManager() {
  const { toast } = useToast()
  const [stats, setStats] = useState({
    totalFactures: 0,
    totalMontant: 0,
    facturesAujourdhui: 0,
    facturesCeMois: 0,
    moyenneMensuelle: 0,
  })
  const [factures, setFactures] = useState<Facture[]>([])
  const [historique, setHistorique] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [statsData, facturesData, historiqueData] = await Promise.all([
        db.getStatistiques(),
        db.getFactures(),
        db.getHistorique(50),
      ])

      setStats(statsData)
      setFactures(facturesData)
      setHistorique(historiqueData)
    } catch (error) {
      console.error("Erreur chargement données:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportDatabase = async () => {
    try {
      setIsLoading(true)
      const exportData = await db.exportDatabase()

      const blob = new Blob([exportData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `CNAM_Backup_${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Succès",
        description: "Base de données exportée avec succès",
      })
    } catch (error) {
      console.error("Erreur export:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'exporter la base de données",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const importDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsLoading(true)
      const text = await file.text()
      await db.importDatabase(text)
      await loadData()

      toast({
        title: "Succès",
        description: "Base de données importée avec succès",
      })
    } catch (error) {
      console.error("Erreur import:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'importer la base de données",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearDatabase = async () => {
    if (!confirm("Êtes-vous sûr de vouloir vider la base de données ? Cette action est irréversible.")) {
      return
    }

    try {
      setIsLoading(true)
      await db.clearDatabase()
      await loadData()

      toast({
        title: "Succès",
        description: "Base de données vidée avec succès",
      })
    } catch (error) {
      console.error("Erreur nettoyage:", error)
      toast({
        title: "Erreur",
        description: "Impossible de vider la base de données",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const searchFactures = async () => {
    if (!searchTerm.trim()) {
      await loadData()
      return
    }

    try {
      const results = await db.searchFactures({
        nom: searchTerm,
      })
      setFactures(results)
    } catch (error) {
      console.error("Erreur recherche:", error)
    }
  }

  const filteredFactures = factures.filter(
    (f) =>
      f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.numfac.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gestionnaire de Base de Données
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Factures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalFactures}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Montant Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.totalMontant.toFixed(3)} DT</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Aujourd'hui</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.facturesAujourdhui}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ce Mois</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.facturesCeMois}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Moyenne/Jour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{stats.moyenneMensuelle.toFixed(1)}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="factures" className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par nom ou numéro de facture..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchFactures()}
              />
            </div>
            <Button onClick={searchFactures} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Liste des Factures ({filteredFactures.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredFactures.map((facture) => (
                  <div key={facture.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">{facture.numfac}</div>
                      <div className="text-sm text-gray-600">{facture.nom}</div>
                      <div className="text-xs text-gray-500">{facture.datfac.toLocaleDateString("fr-FR")}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{facture.mnt.toFixed(3)} DT</div>
                      <div className="text-xs text-gray-500">{facture.ind === "0" ? "Actif" : "Supprimé"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historique" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {historique.map((action, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">
                        {action.action} - {action.table}
                      </div>
                      <div className="text-sm text-gray-600">{action.details}</div>
                      <div className="text-xs text-gray-500">Par {action.utilisateur}</div>
                    </div>
                    <div className="text-xs text-gray-500">{new Date(action.dateAction).toLocaleString("fr-FR")}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Sauvegarde
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Exporter toutes les données de l'application en format JSON.</p>
                <Button onClick={exportDatabase} disabled={isLoading} className="w-full">
                  {isLoading ? "Export en cours..." : "Exporter la Base de Données"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Restauration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Importer des données depuis un fichier de sauvegarde.</p>
                <div>
                  <Label htmlFor="import-file">Fichier de sauvegarde</Label>
                  <Input id="import-file" type="file" accept=".json" onChange={importDatabase} disabled={isLoading} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Nettoyage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Vider complètement la base de données. Action irréversible !</p>
                <Button onClick={clearDatabase} disabled={isLoading} variant="destructive" className="w-full">
                  {isLoading ? "Nettoyage en cours..." : "Vider la Base de Données"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Paramètres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Configuration et paramètres de l'application.</p>
                <Button onClick={loadData} disabled={isLoading} variant="outline" className="w-full bg-transparent">
                  {isLoading ? "Actualisation..." : "Actualiser les Données"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
