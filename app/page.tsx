"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Printer, QrCode, Save, Database } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { PrintService } from "@/lib/print-service"
import { GenerateDialog } from "@/components/generate-dialog"
import { DatabaseManager } from "@/components/database-manager"
import { db, type Facture } from "@/lib/database"

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
    dateCreation: new Date(),
    dateModification: new Date(),
  })
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null)
  const [showDatabaseManager, setShowDatabaseManager] = useState(false)

  useEffect(() => {
    initializeFacture()
  }, [])

  const initializeFacture = async () => {
    try {
      const nextNumber = await db.getNextFactureNumber()
      const prixDefaut = (await db.getParametre("prixUnitaireTTC")) || 11.5
      const bureauDefaut = (await db.getParametre("bureauDefaut")) || "001"

      setFacture((prev) => ({
        ...prev,
        numfac: nextNumber,
        puttc: prixDefaut,
        burreg: bureauDefaut,
      }))
    } catch (error) {
      console.error("Erreur initialisation:", error)
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
        await db.saveFacture(facture)
        toast({
          title: "Succès",
          description: "Facture ajoutée avec succès",
        })

        // Réinitialiser pour nouvelle facture
        await initializeFacture()
        setFacture((prev) => ({
          ...prev,
          nom: "",
          designation: "",
          nombreseance: 0,
          nombresemaine: 0,
          nombre: 0,
          mntht: 0,
          mnttva: 0,
          mnt: 0,
          numass: "",
          annprc: "",
          numprc: "",
          cleass: "",
          datfac: new Date(),
          ddeb: new Date(),
          dfn: new Date(),
        }))
      } else if (mode === "modifier" && facture.id) {
        await db.updateFacture(facture)
        toast({
          title: "Succès",
          description: "Facture modifiée avec succès",
        })
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la facture",
        variant: "destructive",
      })
    }
  }

  const imprimer = async () => {
    try {
      console.log("Début impression...", facture)

      toast({
        title: "Impression",
        description: "Préparation du rapport en cours...",
      })

      const montantEnLettres = convertirEnLettres(facture.mnt)
      console.log("Montant en lettres:", montantEnLettres)

      await PrintService.printFacture(facture, montantEnLettres)

      toast({
        title: "Succès",
        description: "Impression lancée avec succès",
      })
    } catch (error) {
      console.error("Erreur impression:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'imprimer la facture",
        variant: "destructive",
      })
    }
  }

  const imprimerBordereau = async () => {
    try {
      console.log("Début impression bordereau...")

      toast({
        title: "Impression Bordereau",
        description: "Génération du bordereau en cours...",
      })

      // Données simulées pour le bordereau
      const bordereauData = {
        annee: new Date().getFullYear(),
        numero: `BOR-${Date.now()}`,
        dateGeneration: new Date(),
        factures: [
          {
            numfac: facture.numfac,
            nom: facture.nom,
            montant: facture.mnt,
            datfac: facture.datfac,
          },
        ],
        totalGeneral: facture.mnt,
      }

      console.log("Données bordereau:", bordereauData)
      await PrintService.printBordereau(bordereauData)

      toast({
        title: "Succès",
        description: "Bordereau imprimé avec succès",
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

  const scannerQR = () => {
    toast({
      title: "Scanner QR",
      description: "Fonctionnalité de scan QR activée",
    })
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
                  <div className="text-lg font-semibold p-2 bg-gray-100 rounded">{facture.numfac}</div>
                </div>
                <Button onClick={scannerQR} variant="outline" className="mt-6 bg-transparent">
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

        {/* Boutons d'action */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button onClick={sauvegarder} className="flex-1 max-w-xs">
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
              <Button onClick={imprimer} variant="outline" className="flex-1 max-w-xs bg-transparent">
                <Printer className="mr-2 h-4 w-4" />
                Impression
              </Button>
              <Button onClick={imprimerBordereau} variant="outline" className="flex-1 max-w-xs bg-transparent">
                <Printer className="mr-2 h-4 w-4" />
                Impression Bordereaux
              </Button>
              <GenerateDialog facture={facture} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
