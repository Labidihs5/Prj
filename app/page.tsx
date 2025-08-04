"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Printer, QrCode, Save, Database, Plus, FileText } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { PrintService } from "@/lib/print-service"
import { GenerateDialog } from "@/components/generate-dialog"
import { DatabaseManager } from "@/components/database-manager"
import { QRScanner } from "@/components/qr-scanner"
import { neon, type Facture } from "@/lib/database"

export default function CNAMApp() {
  const { toast } = useToast()
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

  useEffect(() => {
    initializeFacture()
    loadFacturesNonGenerees()
  }, [])

  const loadFacturesNonGenerees = async () => {
    try {
      const factures = await db.getFacturesNonGenerees()
      setFacturesNonGenerees(factures)
      console.log(`${factures.length} factures non générées trouvées`)
    } catch (error) {
      console.error("Erreur chargement factures non générées:", error)
    }
  }

  const initializeFacture = async () => {
    try {
      // Nettoyer les doublons au démarrage
      await db.cleanupDuplicateNumbers()

      const nextNumber = await db.getNextFactureNumber()
      const prixDefaut = (await db.getParametre("prixUnitaireTTC")) || 11.5
      const bureauDefaut = (await db.getParametre("bureauDefaut")) || "001"

      // Vérifier que le numéro est disponible avec plusieurs tentatives
      let numeroFinal = nextNumber
      let tentatives = 0

      while (tentatives < 10) {
        const isAvailable = await db.isFactureNumberAvailable(numeroFinal)
        if (isAvailable) {
          break
        }

        tentatives++
        const anneeEnCours = new Date().getFullYear()
        const sequence = await db.getNextSequenceForYear(anneeEnCours)
        numeroFinal = `${sequence + tentatives}/${anneeEnCours}`
      }

      setFacture((prev) => ({
        ...prev,
        numfac: numeroFinal,
        puttc: prixDefaut,
        burreg: bureauDefaut,
      }))

      console.log("Facture initialisée avec numéro:", numeroFinal)
    } catch (error) {
      console.error("Erreur initialisation:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'initialiser le numéro de facture",
        variant: "destructive",
      })
    }
  }

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

  const convertirEnLettres = (montant: number): string => {
    if (montant === 0) return "zéro"

    const entier = Math.floor(montant)
    const millimes = Math.round((montant - entier) * 1000)

    let resultat = ""
    if (entier > 0) {
      resultat += `${entier} dinars`
    }
    if (millimes > 0) {
      resultat += ` et ${millimes} millimes`
    }

    return resultat
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
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
        // Vérifier plusieurs fois que le numéro est disponible
        let tentatives = 0
        let numeroDisponible = false
        let numeroActuel = facture.numfac

        while (!numeroDisponible && tentatives < 5) {
          const isAvailable = await db.isFactureNumberAvailable(numeroActuel)
          if (isAvailable) {
            numeroDisponible = true
            break
          }

          // Générer un nouveau numéro
          tentatives++
          console.log(`Tentative ${tentatives}: Numéro ${numeroActuel} occupé, génération d'un nouveau...`)

          const anneeEnCours = new Date().getFullYear()
          const nextSequence = await db.getNextSequenceForYear(anneeEnCours)
          numeroActuel = `${nextSequence + tentatives}/${anneeEnCours}`
        }

        if (!numeroDisponible) {
          throw new Error("Impossible de générer un numéro de facture unique après plusieurs tentatives")
        }

        // Mettre à jour le numéro si nécessaire
        if (numeroActuel !== facture.numfac) {
          setFacture((prev) => ({ ...prev, numfac: numeroActuel }))
          toast({
            title: "Numéro modifié",
            description: `Nouveau numéro assigné: ${numeroActuel}`,
          })
        }

        const factureComplete = await db.saveFacture({ ...facture, numfac: numeroActuel })
        setFacture(factureComplete)
        await loadFacturesNonGenerees()

        toast({
          title: "Succès",
          description: `Facture ${factureComplete.numfac} ajoutée avec succès`,
        })

        // NOUVEAU: Préparer automatiquement la prochaine facture
        await prepareNextFacture()
      } else if (mode === "modifier" && facture.id) {
        const factureModifiee = await db.updateFacture(facture)
        setFacture(factureModifiee)
        await loadFacturesNonGenerees()

        toast({
          title: "Succès",
          description: `Facture ${factureModifiee.numfac} modifiée avec succès`,
        })
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error)

      let errorMessage = "Impossible de sauvegarder la facture"
      if (error instanceof Error) {
        if (error.message.includes("existe déjà")) {
          errorMessage = `Le numéro ${facture.numfac} existe déjà. Génération d'un nouveau numéro...`
          // Réessayer avec un nouveau numéro
          setTimeout(() => {
            initializeFacture()
          }, 1000)
        } else {
          errorMessage = error.message
        }
      }

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const prepareNextFacture = async () => {
    try {
      console.log("=== PRÉPARATION PROCHAINE FACTURE ===")

      // Générer le prochain numéro de facture
      const nextNumber = await db.getNextFactureNumber()
      const prixDefaut = (await db.getParametre("prixUnitaireTTC")) || 11.5
      const bureauDefaut = (await db.getParametre("bureauDefaut")) || "001"

      // Vérifier que le numéro est disponible
      let numeroFinal = nextNumber
      let tentatives = 0

      while (tentatives < 5) {
        const isAvailable = await db.isFactureNumberAvailable(numeroFinal)
        if (isAvailable) {
          break
        }

        tentatives++
        const anneeEnCours = new Date().getFullYear()
        const sequence = await db.getNextSequenceForYear(anneeEnCours)
        numeroFinal = `${sequence + tentatives}/${anneeEnCours}`
      }

      // Réinitialiser le formulaire avec le nouveau numéro
      setFacture({
        nom: "",
        designation: "",
        nombreseance: 0,
        nombresemaine: 0,
        nombre: 0,
        puttc: prixDefaut,
        mntht: 0,
        mnttva: 0,
        mnt: 0,
        numass: "",
        annprc: "",
        numprc: "",
        burreg: bureauDefaut,
        cleass: "",
        datfac: new Date(),
        ddeb: new Date(),
        dfn: new Date(),
        numfac: numeroFinal,
        annee: new Date().getFullYear(),
        ind: "0",
        generated: "0",
        dateCreation: new Date(),
        dateModification: new Date(),
      })

      console.log("Prochaine facture préparée avec numéro:", numeroFinal)

      toast({
        title: "Prêt pour la suivante",
        description: `Formulaire préparé pour facture N° ${numeroFinal}`,
      })
    } catch (error) {
      console.error("Erreur préparation prochaine facture:", error)
      toast({
        title: "Attention",
        description: "Erreur lors de la préparation de la prochaine facture",
        variant: "destructive",
      })
    }
  }

  const imprimer = async () => {
    try {
      console.log("=== IMPRESSION DE TOUTES LES FACTURES NON GÉNÉRÉES ===")

      // Récupérer toutes les factures non générées
      const factures = await db.getFacturesNonGenerees()

      if (factures.length === 0) {
        toast({
          title: "Information",
          description: "Aucune facture non générée à imprimer",
        })
        return
      }

      console.log(
        `${factures.length} factures non générées trouvées:`,
        factures.map((f) => f.numfac),
      )

      toast({
        title: "Impression",
        description: `Impression de ${factures.length} factures non générées...`,
      })

      // Imprimer chaque facture
      for (let i = 0; i < factures.length; i++) {
        const factureToprint = factures[i]
        const montantEnLettres = convertirEnLettres(factureToprint.mnt)

        console.log(`Impression facture ${i + 1}/${factures.length}: ${factureToprint.numfac}`)

        // Délai entre les impressions pour éviter les conflits
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        await PrintService.printFacture(factureToprint, montantEnLettres)

        // Enregistrer l'action d'impression
        await db.addHistorique("PRINT", "factures", factureToprint.id!, `Facture ${factureToprint.numfac} imprimée`)
      }

      // Marquer toutes les factures comme générées
      const factureIds = factures.map((f) => f.id!).filter((id) => id !== undefined)
      await db.marquerFacturesCommeGenerees(factureIds)

      // Recharger la liste
      await loadFacturesNonGenerees()

      toast({
        title: "Succès",
        description: `${factures.length} factures imprimées et marquées comme générées`,
      })

      console.log("=== FIN IMPRESSION GROUPÉE ===")
    } catch (error) {
      console.error("Erreur impression groupée:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'imprimer les factures",
        variant: "destructive",
      })
    }
  }

  const imprimerBordereau = async () => {
    try {
      console.log("=== IMPRESSION BORDEREAU TOUTES FACTURES NON GÉNÉRÉES ===")

      const factures = await db.getFacturesNonGenerees()

      if (factures.length === 0) {
        toast({
          title: "Information",
          description: "Aucune facture non générée pour le bordereau",
        })
        return
      }

      toast({
        title: "Impression Bordereau",
        description: `Génération du bordereau pour ${factures.length} factures...`,
      })

      // Données du bordereau pour toutes les factures non générées
      const bordereauData = {
        annee: new Date().getFullYear(),
        numero: `BOR-${Date.now()}`,
        dateGeneration: new Date(),
        factures: factures.map((f) => ({
          numfac: f.numfac,
          nom: f.nom,
          montant: f.mnt,
          datfac: f.datfac,
        })),
        totalGeneral: factures.reduce((sum, f) => sum + f.mnt, 0),
      }

      console.log("Données bordereau:", bordereauData)
      await PrintService.printBordereau(bordereauData)

      toast({
        title: "Succès",
        description: `Bordereau pour ${factures.length} factures imprimé`,
      })
    } catch (error) {
      console.error("Erreur impression bordereau:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'imprimer le bordereau",
        variant: "destructive",
      })
    }
  }

  const handleQRScan = (data: string) => {
    console.log("QR Code scanné:", data)

    // Traiter les différents types de QR codes
    if (data.startsWith("FACTURE:")) {
      const factureId = data.replace("FACTURE:", "")
      toast({
        title: "QR Code détecté",
        description: `Facture ID: ${factureId}`,
      })
    } else if (data.startsWith("PATIENT:")) {
      const patientId = data.replace("PATIENT:", "")
      setFacture((prev) => ({ ...prev, numass: patientId }))
      toast({
        title: "QR Code détecté",
        description: `N° Patient: ${patientId} ajouté`,
      })
    } else if (data.startsWith("CNAM:")) {
      const cnamData = data.replace("CNAM:", "")
      toast({
        title: "QR Code CNAM détecté",
        description: `Données: ${cnamData}`,
      })
    } else {
      toast({
        title: "QR Code détecté",
        description: data,
      })
    }
  }

  const nouvelleFacture = async () => {
    try {
      await prepareNextFacture()
    } catch (error) {
      console.error("Erreur nouvelle facture:", error)
      toast({
        title: "Erreur",
        description: "Impossible de générer un nouveau numéro de facture",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold text-center text-blue-600">
                Application CNAM - Gestion des Factures
              </CardTitle>
              <div className="flex gap-2">
                <div className="text-sm text-gray-600 bg-yellow-50 px-3 py-1 rounded">
                  📋 {facturesNonGenerees.length} factures non générées
                </div>
                <Dialog open={showDatabaseManager} onOpenChange={setShowDatabaseManager}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Database className="mr-2 h-4 w-4" />
                      Base de Données
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Gestionnaire de Base de Données</DialogTitle>
                    </DialogHeader>
                    <DatabaseManager />
                  </DialogContent>
                </Dialog>
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

              {/* Numéro de facture et Scanner */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Facture N°</Label>
                  <div className="text-lg font-semibold p-2 bg-gray-100 rounded">
                    {facture.numfac}
                    {facture.id && (
                      <span className="text-sm ml-2">
                        <span className="text-green-600">(ID: {facture.id})</span>
                        <span className={`ml-2 ${facture.generated === "0" ? "text-orange-600" : "text-blue-600"}`}>
                          {facture.generated === "0" ? "Non généré" : "Généré"}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <Button onClick={() => setShowQRScanner(true)} variant="outline" className="mt-6 bg-transparent">
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan QR Code
                </Button>
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
                Imprimer Toutes ({facturesNonGenerees.length})
              </Button>

              <Button
                onClick={imprimerBordereau}
                variant="outline"
                className="flex-1 max-w-xs bg-transparent"
                disabled={facturesNonGenerees.length === 0}
              >
                <Printer className="mr-2 h-4 w-4" />
                Bordereau Toutes ({facturesNonGenerees.length})
              </Button>

              <GenerateDialog facture={facture} />

              <Button onClick={nouvelleFacture} variant="secondary" className="flex-1 max-w-xs">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Facture
              </Button>
            </div>

            {/* Indicateur de statut */}
            <div className="text-center mt-4 space-y-2">
              {facture.id ? (
                <div className="text-sm text-green-600 font-medium">
                  ✅ Facture {facture.numfac} sauvegardée (ID: {facture.id})
                </div>
              ) : (
                <div className="text-sm text-orange-600 font-medium">
                  ⚠️ Facture non sauvegardée - Enregistrer d'abord
                </div>
              )}

              <div className="text-sm text-blue-600">
                📋 {facturesNonGenerees.length} factures en attente d'impression/génération
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner QR */}
      {showQRScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />}
    </div>
  )
}
