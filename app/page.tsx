"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Printer, Save, Plus, FileText, RotateCcw, Settings, AlertTriangle } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { PrintService } from "@/print-service"
import { GenerateDialog } from "@/generate-dialog"
//import { QRScanner } from "@/qr-scanner"
import { NeonConfig } from "@/neon-config"
import { database, type Facture } from "@/lib/database"

type AppState = "loading" | "config_required" | "ready" | "error"

export default function CNAMApp() {
  const { toast } = useToast()
  const [appState, setAppState] = useState<AppState>("loading")
  const [initError, setInitError] = useState<string>("")
  const [isInitialized, setIsInitialized] = useState(false)

  const [mode, setMode] = useState<"nouveau" | "modifier" | "supprimer" | "reactiver">("nouveau")
  const [facture, setFacture] = useState<Facture>({
    nom: "",
    designation: "",
    nombreseance: 0,
    nombresemaine: 0,
    nombre: 0,
    puttc: 11.5,
    mntht: 0,
    mnttva: 0,
    mnt: 0,
    numass: "",
    annprc: "",
    numprc: "",
    burreg: "",
    cleass: "",
    datfac: new Date(),
    ddeb: new Date(),
    dfn: new Date(),
    numfac: "",
    annee: new Date().getFullYear(),
    ind: "0",
    generated: "0",
    dateCreation: new Date(),
    dateModification: new Date(),
  })

  const [showDatePicker, setShowDatePicker] = useState<string | null>(null)
  const [showDatabaseManager, setShowDatabaseManager] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [facturesNonGenerees, setFacturesNonGenerees] = useState<Facture[]>([])

  // Initialisation unique au montage du composant
  useEffect(() => {
    let isMounted = true

    const initApp = async () => {
      if (isInitialized) return

      try {
        console.log("🚀 Initializing CNAM App...")
        setAppState("loading")
        setInitError("")

        // Initialiser la base de données
        await database.init()

        if (!isMounted) return

        // Charger les données initiales
        const factures = await database.getFacturesNonGenerees()
        const nextNumber = await database.getNextFactureNumber()
        const prixDefaut = Number.parseFloat((await database.getParametre("prixUnitaireTTC")) || "11.5")
        const bureauDefaut = (await database.getParametre("bureauDefaut")) || "001"

        if (!isMounted) return

        setFacturesNonGenerees(factures)
        setFacture((prev) => ({
          ...prev,
          numfac: nextNumber,
          puttc: prixDefaut,
          burreg: bureauDefaut,
        }))

        setAppState("ready")
        setIsInitialized(true)

        toast({
          title: "Application prête",
          description: "Connexion Neon Database établie avec succès",
        })

        console.log("✅ CNAM App initialized successfully")
      } catch (error) {
        console.error("❌ App initialization failed:", error)

        if (!isMounted) return

        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
        setInitError(errorMessage)

        if (errorMessage.includes("connection") || errorMessage.includes("Database")) {
          setAppState("config_required")
          toast({
            title: "Configuration requise",
            description: "Veuillez configurer Neon Database",
            variant: "destructive",
          })
        } else {
          setAppState("error")
          toast({
            title: "Erreur d'initialisation",
            description: errorMessage,
            variant: "destructive",
          })
        }
      }
    }

    initApp()

    return () => {
      isMounted = false
    }
  }, []) // Dépendance vide pour n'exécuter qu'une fois

  // Calculs automatiques
  useEffect(() => {
    if (facture.nombreseance && facture.nombresemaine && facture.puttc) {
      const nombre = facture.nombreseance * facture.nombresemaine
      const mnt = nombre * facture.puttc
      const mnttva = Math.round((mnt / 1.07) * 0.07 * 1000) / 1000
      const mntht = mnt - mnttva

      setFacture((prev) => ({
        ...prev,
        nombre,
        mnt,
        mnttva,
        mntht,
      }))
    }
  }, [facture.nombreseance, facture.nombresemaine, facture.puttc])

  const handleConfigurationComplete = async () => {
    console.log("🔄 Configuration completed, restarting app...")
    setIsInitialized(false)
    setAppState("loading")

    // Redémarrer l'initialisation
    try {
      await database.init()
      const factures = await database.getFacturesNonGenerees()
      const nextNumber = await database.getNextFactureNumber()

      setFacturesNonGenerees(factures)
      setFacture((prev) => ({ ...prev, numfac: nextNumber }))
      setAppState("ready")
      setIsInitialized(true)

      toast({
        title: "Configuration terminée",
        description: "Application redémarrée avec succès",
      })
    } catch (error) {
      console.error("Restart failed:", error)
      setAppState("error")
      setInitError(error instanceof Error ? error.message : "Erreur de redémarrage")
    }
  }

  const loadFacturesNonGenerees = async () => {
    try {
      const factures = await database.getFacturesNonGenerees()
      setFacturesNonGenerees(factures)
    } catch (error) {
      console.error("Error loading factures:", error)
    }
  }

  const sauvegarder = async () => {
    if (!facture.nom || !facture.annprc || !facture.numprc || !facture.burreg || !facture.cleass) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    try {
      if (mode === "nouveau") {
        const numeroReserve = await database.reserveFactureNumber()
        const factureComplete = await database.saveFacture({
          ...facture,
          numfac: numeroReserve,
        })

        setFacture(factureComplete)
        await loadFacturesNonGenerees()

        toast({
          title: "Succès",
          description: `Facture ${factureComplete.numfac} ajoutée avec succès`,
        })

        // Préparer la prochaine facture
        const nextNumber = await database.getNextFactureNumber()
        setFacture((prev) => ({
          ...prev,
          id: undefined,
          nom: "",
          designation: "",
          nombreseance: 0,
          nombresemaine: 0,
          numfac: nextNumber,
          numass: "",
          annprc: "",
          numprc: "",
          cleass: "",
        }))
      }
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder",
        variant: "destructive",
      })
    }
  }

  const imprimer = async () => {
    try {
      const factures = await database.getFacturesNonGenerees()

      if (factures.length === 0) {
        toast({
          title: "Information",
          description: "Aucune facture non générée à imprimer",
        })
        return
      }

      await PrintService.printAllFactures(factures)

      const factureIds = factures.map((f) => f.id!).filter((id) => id !== undefined)
      await database.marquerFacturesCommeGenerees(factureIds)

      await loadFacturesNonGenerees()

      toast({
        title: "Succès",
        description: `${factures.length} factures imprimées et marquées comme générées`,
      })
    } catch (error) {
      console.error("Print error:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'imprimer les factures",
        variant: "destructive",
      })
    }
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const convertirEnLettres = (montant: number): string => {
    if (montant === 0) return "zéro"
    const entier = Math.floor(montant)
    const millimes = Math.round((montant - entier) * 1000)
    let resultat = ""
    if (entier > 0) resultat += `${entier} dinars`
    if (millimes > 0) resultat += ` et ${millimes} millimes`
    return resultat
  }

  // États de chargement et d'erreur
  if (appState === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold mb-2">Initialisation...</h2>
            <p className="text-gray-600">Connexion à Neon Database en cours</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (appState === "config_required") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <CardTitle className="text-red-800">Configuration Neon Database Requise</CardTitle>
                  <p className="text-red-600 text-sm mt-1">Impossible de se connecter à la base de données.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-red-100 p-3 rounded text-sm text-red-800">
                <strong>Erreur:</strong> {initError}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration Neon Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NeonConfig onConfigurationComplete={handleConfigurationComplete} />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (appState === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96 border-red-200">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 text-red-800">Erreur d'Initialisation</h2>
            <p className="text-red-600 mb-4">{initError}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Recharger la page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Interface principale
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold text-center text-blue-600">
                Application CNAM - Gestion des Factures (Neon Database)
              </CardTitle>
              <div className="flex gap-2">
                <div className="text-sm text-gray-600 bg-yellow-50 px-3 py-1 rounded">
                  📋 {facturesNonGenerees.length} factures non générées
                </div>
                <Button onClick={loadFacturesNonGenerees} variant="outline" size="sm">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
                <Button onClick={() => setAppState("config_required")} variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Config Database
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Données Facture */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Données Facture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode et Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mode">Mode</Label>
                  <Select value={mode} onValueChange={(value: any) => setMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nouveau">Nouveau</SelectItem>
                      <SelectItem value="modifier">Modifier</SelectItem>
                      <SelectItem value="supprimer">Supprimer</SelectItem>
                      <SelectItem value="reactiver">Réactiver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Popover
                    open={showDatePicker === "datfac"}
                    onOpenChange={(open) => setShowDatePicker(open ? "datfac" : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !facture.datfac && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {facture.datfac ? formatDate(facture.datfac) : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={facture.datfac}
                        onSelect={(date) => {
                          if (date) {
                            setFacture((prev) => ({ ...prev, datfac: date, dfn: date }))
                          }
                          setShowDatePicker(null)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Numéro de facture */}
              <div>
                <Label>Facture N°</Label>
                <div className="text-lg font-semibold p-2 bg-gray-100 rounded">
                  {facture.numfac}
                  {facture.id && <span className="text-sm ml-2 text-green-600">(ID: {facture.id})</span>}
                </div>
              </div>

              {/* Désignation */}
              <div>
                <Label htmlFor="designation">Désignation</Label>
                <Textarea
                  id="designation"
                  value={facture.designation}
                  onChange={(e) => setFacture((prev) => ({ ...prev, designation: e.target.value }))}
                  disabled={mode === "supprimer"}
                />
              </div>

              {/* Calculs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombreseance">Nombre de Séances</Label>
                  <Input
                    id="nombreseance"
                    type="number"
                    value={facture.nombreseance}
                    onChange={(e) =>
                      setFacture((prev) => ({ ...prev, nombreseance: Number.parseInt(e.target.value) || 0 }))
                    }
                    disabled={mode === "supprimer"}
                  />
                </div>
                <div>
                  <Label htmlFor="nombresemaine">Nombre de Semaines</Label>
                  <Input
                    id="nombresemaine"
                    type="number"
                    value={facture.nombresemaine}
                    onChange={(e) =>
                      setFacture((prev) => ({ ...prev, nombresemaine: Number.parseInt(e.target.value) || 0 }))
                    }
                    disabled={mode === "supprimer"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre Total</Label>
                  <Input id="nombre" type="number" value={facture.nombre} readOnly className="bg-gray-100" />
                </div>
                <div>
                  <Label htmlFor="puttc">PU TTC</Label>
                  <Input
                    id="puttc"
                    type="number"
                    step="0.01"
                    value={facture.puttc}
                    onChange={(e) => setFacture((prev) => ({ ...prev, puttc: Number.parseFloat(e.target.value) || 0 }))}
                    disabled={mode === "supprimer"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="mntht">Total HT</Label>
                  <Input
                    id="mntht"
                    type="number"
                    step="0.01"
                    value={facture.mntht.toFixed(3)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="mnttva">TVA 7%</Label>
                  <Input
                    id="mnttva"
                    type="number"
                    step="0.01"
                    value={facture.mnttva.toFixed(3)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="mnt">Total TTC</Label>
                  <Input
                    id="mnt"
                    type="number"
                    step="0.01"
                    value={facture.mnt.toFixed(3)}
                    readOnly
                    className="bg-gray-100 font-semibold"
                  />
                </div>
              </div>

              {/* Montant en lettres */}
              <div>
                <Label>Montant en lettres</Label>
                <div className="p-3 bg-blue-50 rounded border text-sm">{convertirEnLettres(facture.mnt)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Autres Informations */}
          <Card>
            <CardHeader>
              <CardTitle>Autres Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom et Prénom</Label>
                <Textarea
                  id="nom"
                  value={facture.nom}
                  onChange={(e) => setFacture((prev) => ({ ...prev, nom: e.target.value }))}
                  disabled={mode === "supprimer"}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="numass">N° Associé Social</Label>
                  <Input
                    id="numass"
                    value={facture.numass}
                    onChange={(e) => setFacture((prev) => ({ ...prev, numass: e.target.value }))}
                    disabled={mode === "supprimer"}
                  />
                </div>
                <div>
                  <Label htmlFor="cleass">Clé</Label>
                  <Input
                    id="cleass"
                    value={facture.cleass}
                    onChange={(e) => setFacture((prev) => ({ ...prev, cleass: e.target.value }))}
                    disabled={mode === "supprimer"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="burreg">Bureau</Label>
                  <Input
                    id="burreg"
                    value={facture.burreg}
                    onChange={(e) => setFacture((prev) => ({ ...prev, burreg: e.target.value }))}
                    disabled={mode === "supprimer"}
                  />
                </div>
                <div>
                  <Label htmlFor="annprc">Année</Label>
                  <Input
                    id="annprc"
                    value={facture.annprc}
                    onChange={(e) => setFacture((prev) => ({ ...prev, annprc: e.target.value }))}
                    disabled={mode === "supprimer"}
                  />
                </div>
                <div>
                  <Label htmlFor="numprc">N° PEC</Label>
                  <Input
                    id="numprc"
                    value={facture.numprc}
                    onChange={(e) => setFacture((prev) => ({ ...prev, numprc: e.target.value }))}
                    disabled={mode === "supprimer"}
                  />
                </div>
              </div>

              {/* Dates */}
              <div>
                <Label>Date Début</Label>
                <Popover
                  open={showDatePicker === "ddeb"}
                  onOpenChange={(open) => setShowDatePicker(open ? "ddeb" : null)}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {facture.ddeb ? formatDate(facture.ddeb) : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={facture.ddeb}
                      onSelect={(date) => {
                        if (date) {
                          setFacture((prev) => ({ ...prev, ddeb: date }))
                        }
                        setShowDatePicker(null)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Date Fin</Label>
                <Popover
                  open={showDatePicker === "dfn"}
                  onOpenChange={(open) => setShowDatePicker(open ? "dfn" : null)}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {facture.dfn ? formatDate(facture.dfn) : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={facture.dfn}
                      onSelect={(date) => {
                        if (date) {
                          setFacture((prev) => ({ ...prev, dfn: date }))
                        }
                        setShowDatePicker(null)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des factures non générées */}
        {facturesNonGenerees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Factures Non Générées ({facturesNonGenerees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-40 overflow-y-auto">
                {facturesNonGenerees.map((f) => (
                  <div key={f.id} className="p-3 border rounded-lg bg-yellow-50">
                    <div className="font-semibold text-sm">{f.numfac}</div>
                    <div className="text-xs text-gray-600">{f.nom}</div>
                    <div className="text-xs text-green-600 font-medium">{f.mnt.toFixed(3)} DT</div>
                    <div className="text-xs text-gray-500">{formatDate(f.datfac)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boutons d'action */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button onClick={sauvegarder} className="flex-1 max-w-xs">
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>

              <Button
                onClick={imprimer}
                variant="outline"
                className="flex-1 max-w-xs bg-transparent"
                disabled={facturesNonGenerees.length === 0}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimer & Générer ({facturesNonGenerees.length})
              </Button>

              <GenerateDialog facture={facture} />

              <Button onClick={() => window.location.reload()} variant="secondary" className="flex-1 max-w-xs">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Facture
              </Button>
            </div>

            <div className="text-center mt-4 space-y-2">
              <div className="text-sm text-blue-600">
                📋 {facturesNonGenerees.length} factures en attente d'impression/génération
              </div>
              <div className="text-xs text-gray-500">
                🐘 Base de données: Neon PostgreSQL • Statut: {isInitialized ? "✅ Connecté" : "❌ Déconnecté"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner QR */}
      {showQRScanner && (
        <QRScanner
          onScan={(data) => {
            console.log("QR Code scanné:", data)
            toast({ title: "QR Code détecté", description: data })
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  )
}
