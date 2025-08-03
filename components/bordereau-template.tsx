"use client"

import { forwardRef } from "react"

interface BordereauData {
  annee: number
  numero: string
  dateGeneration: Date
  factures: Array<{
    numfac: string
    nom: string
    montant: number
    datfac: Date
  }>
  totalGeneral: number
}

interface BordereauTemplateProps {
  data: BordereauData
}

export const BordereauTemplate = forwardRef<HTMLDivElement, BordereauTemplateProps>(({ data }, ref) => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto text-black print:shadow-none">
      {/* En-tête */}
      <div className="border-b-2 border-green-600 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">CNAM</h1>
            <p className="text-sm text-gray-600">Caisse Nationale d'Assurance Maladie</p>
            <p className="text-sm text-gray-600">République Tunisienne</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">BORDEREAU</h2>
            <p className="text-lg font-semibold">N° {data.numero}</p>
            <p className="text-sm text-gray-600">Date: {formatDate(data.dateGeneration)}</p>
            <p className="text-sm text-gray-600">Année: {data.annee}</p>
          </div>
        </div>
      </div>

      {/* Récapitulatif */}
      <div className="mb-8">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Nombre de factures</p>
              <p className="text-2xl font-bold text-green-600">{data.factures.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Période</p>
              <p className="text-lg font-semibold">{data.annee}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Général</p>
              <p className="text-2xl font-bold text-green-600">{data.totalGeneral.toFixed(3)} DT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des factures */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-green-600">Détail des Factures</h3>
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-green-50">
              <tr>
                <th className="text-left p-3 font-semibold">N° Facture</th>
                <th className="text-left p-3 font-semibold">Patient</th>
                <th className="text-center p-3 font-semibold">Date</th>
                <th className="text-right p-3 font-semibold">Montant TTC</th>
              </tr>
            </thead>
            <tbody>
              {data.factures.map((facture, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="p-3 font-medium">{facture.numfac}</td>
                  <td className="p-3">{facture.nom}</td>
                  <td className="text-center p-3">{formatDate(facture.datfac)}</td>
                  <td className="text-right p-3 font-semibold">{facture.montant.toFixed(3)} DT</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-green-100 border-t-2 border-green-600">
              <tr>
                <td colSpan={3} className="p-3 font-bold text-right">
                  TOTAL GÉNÉRAL:
                </td>
                <td className="p-3 font-bold text-right text-green-600 text-lg">{data.totalGeneral.toFixed(3)} DT</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div className="text-center">
          <h4 className="font-semibold mb-4">Établi par</h4>
          <div className="h-20 border border-gray-300 rounded mb-2"></div>
          <p className="text-sm text-gray-600">Signature et cachet</p>
        </div>
        <div className="text-center">
          <h4 className="font-semibold mb-4">Vérifié par</h4>
          <div className="h-20 border border-gray-300 rounded mb-2"></div>
          <p className="text-sm text-gray-600">Signature et cachet</p>
        </div>
      </div>

      {/* Pied de page */}
      <div className="border-t-2 border-green-600 pt-6 mt-8">
        <div className="text-center text-xs text-gray-500">
          <p>CNAM - Caisse Nationale d'Assurance Maladie - République Tunisienne</p>
          <p>Bordereau généré le {formatDate(data.dateGeneration)}</p>
        </div>
      </div>
    </div>
  )
})

BordereauTemplate.displayName = "BordereauTemplate"
