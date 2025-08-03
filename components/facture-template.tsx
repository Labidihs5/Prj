"use client"

import { forwardRef } from "react"
import type { Facture } from "@/lib/database"

interface FactureTemplateProps {
  facture: Facture
  montantEnLettres: string
}

export const FactureTemplate = forwardRef<HTMLDivElement, FactureTemplateProps>(
  ({ facture, montantEnLettres }, ref) => {
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
        <div className="border-b-2 border-blue-600 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-blue-600 mb-2">CNAM</h1>
              <p className="text-sm text-gray-600">Caisse Nationale d'Assurance Maladie</p>
              <p className="text-sm text-gray-600">République Tunisienne</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">FACTURE</h2>
              <p className="text-lg font-semibold">N° {facture.numfac}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(facture.datfac)}</p>
            </div>
          </div>
        </div>

        {/* Informations client */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-600">Informations Patient</h3>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Nom et Prénom:</span> {facture.nom}
              </p>
              <p>
                <span className="font-medium">N° Associé Social:</span> {facture.numass}
              </p>
              <p>
                <span className="font-medium">Clé:</span> {facture.cleass}
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-600">Prise en Charge</h3>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Bureau:</span> {facture.burreg}
              </p>
              <p>
                <span className="font-medium">Année PEC:</span> {facture.annprc}
              </p>
              <p>
                <span className="font-medium">N° PEC:</span> {facture.numprc}
              </p>
            </div>
          </div>
        </div>

        {/* Période de soins */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-blue-600">Période de Soins</h3>
          <div className="flex gap-8">
            <p>
              <span className="font-medium">Du:</span> {formatDate(facture.ddeb)}
            </p>
            <p>
              <span className="font-medium">Au:</span> {formatDate(facture.dfn)}
            </p>
          </div>
        </div>

        {/* Détails de la prestation */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">Détails de la Prestation</h3>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr>
                  <th className="text-left p-4 font-semibold">Désignation</th>
                  <th className="text-center p-4 font-semibold">Nb Séances</th>
                  <th className="text-center p-4 font-semibold">Nb Semaines</th>
                  <th className="text-center p-4 font-semibold">Total</th>
                  <th className="text-right p-4 font-semibold">PU TTC</th>
                  <th className="text-right p-4 font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-4">{facture.designation}</td>
                  <td className="text-center p-4">{facture.nombreseance}</td>
                  <td className="text-center p-4">{facture.nombresemaine}</td>
                  <td className="text-center p-4 font-semibold">{facture.nombre}</td>
                  <td className="text-right p-4">{facture.puttc.toFixed(3)} DT</td>
                  <td className="text-right p-4 font-semibold">{facture.mnt.toFixed(3)} DT</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Récapitulatif financier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-600">Montant en Lettres</h3>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm font-medium italic">{montantEnLettres}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-600">Récapitulatif</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total HT:</span>
                <span className="font-semibold">{facture.mntht.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between">
                <span>TVA 7%:</span>
                <span className="font-semibold">{facture.mnttva.toFixed(3)} DT</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold text-blue-600">
                <span>Total TTC:</span>
                <span>{facture.mnt.toFixed(3)} DT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="border-t-2 border-blue-600 pt-6 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold mb-2">Conditions de paiement</h4>
              <p className="text-sm text-gray-600">
                Paiement à réception de facture
                <br />
                Facture payable en dinars tunisiens
              </p>
            </div>
            <div className="text-right">
              <h4 className="font-semibold mb-2">Signature et Cachet</h4>
              <div className="h-16 border border-gray-300 rounded mt-2"></div>
            </div>
          </div>
          <div className="text-center mt-6 text-xs text-gray-500">
            <p>CNAM - Caisse Nationale d'Assurance Maladie - République Tunisienne</p>
          </div>
        </div>
      </div>
    )
  },
)

FactureTemplate.displayName = "FactureTemplate"
