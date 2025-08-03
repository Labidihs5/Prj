"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, Download, Eye } from "lucide-react"

interface PrintDialogProps {
  isOpen: boolean
  onClose: () => void
  reportBlob?: Blob
  title: string
}

export function PrintDialog({ isOpen, onClose, reportBlob, title }: PrintDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePrint = () => {
    if (reportBlob) {
      const url = URL.createObjectURL(reportBlob)
      const printWindow = window.open(url, "_blank")
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    }
  }

  const handleDownload = () => {
    if (reportBlob) {
      const url = URL.createObjectURL(reportBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${title.replace(/\s+/g, "_")}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handlePreview = () => {
    if (reportBlob) {
      const url = URL.createObjectURL(reportBlob)
      window.open(url, "_blank")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Choisissez une action pour votre rapport :</p>
          <div className="flex flex-col gap-2">
            <Button onClick={handlePreview} variant="outline" disabled={!reportBlob}>
              <Eye className="mr-2 h-4 w-4" />
              Aperçu
            </Button>
            <Button onClick={handlePrint} disabled={!reportBlob}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
            <Button onClick={handleDownload} variant="secondary" disabled={!reportBlob}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
