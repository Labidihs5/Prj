"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Download, Database, FileSpreadsheet, FileJson } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { FileGenerator } from "@/lib/file-generator"
import type { Facture } from "@/lib/database"

interface GenerateDialogProps {
  facture: Facture
}

export function GenerateDialog({ facture }: GenerateDialogProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [fileType, setFileType] = useState<"cnam" | "csv" | "json">("cnam")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)

      // Simuler une liste de factures (en production, récupérer depuis la DB)
      const factures = [facture] // Pour l'instant, juste la facture courante

      let result: { content: string; filename: string }
      let mimeType: string

      switch (fileType) {
        case "cnam":
          result = await FileGenerator.generateCNAMFile(factures)
          mimeType = "text/plain"
          break
        case "csv":
          result = await FileGenerator.generateCSVFile(factures)
          mimeType = "text/csv"
          break
        case "json":
          result = await FileGenerator.generateJSONFile(factures)
          mimeType = "application/json"
          break
        default:
          throw new Error("Type de fichier non supporté")
      }

      // Télécharger le fichier
      FileGenerator.downloadFile(result.content, result.filename, mimeType)

      toast({
        title: "Succès",
        description: `Fichier ${result.filename} généré et téléchargé avec succès`,
      })

      setIsOpen(false)
    } catch (error) {
      console.error("Erreur génération:", error)
      toast({
        title: "Erreur",
        description: "Impossible de générer le fichier",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const getFileDescription = () => {
    switch (fileType) {
      case "cnam":
        return "Fichier de données au format CNAM officiel pour transmission électronique"
      case "csv":
        return "Fichier Excel/CSV pour analyse et archivage des données"
      case "json":
        return "Fichier de sauvegarde JSON pour backup et restauration"
      default:
        return ""
    }
  }

  const getFileIcon = () => {
    switch (fileType) {
      case "cnam":
        return <Database className="h-5 w-5" />
      case "csv":
        return <FileSpreadsheet className="h-5 w-5" />
      case "json":
        return <FileJson className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="flex-1 max-w-xs">
          <FileText className="mr-2 h-4 w-4" />
          Générer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Générer Fichier de Données</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <Label htmlFor="fileType">Type de fichier</Label>
            <Select value={fileType} onValueChange={(value: any) => setFileType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cnam">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Fichier CNAM (.txt)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Export CSV (.csv)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    Sauvegarde JSON (.json)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              {getFileIcon()}
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Description</h4>
                <p className="text-sm text-blue-700">{getFileDescription()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Contenu du fichier</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Facture N° {facture.numfac}</li>
              <li>• Patient: {facture.nom}</li>
              <li>• Montant: {facture.mnt.toFixed(3)} DT</li>
              <li>• Date: {facture.datfac.toLocaleDateString("fr-FR")}</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1">
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Génération...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Générer et Télécharger
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
