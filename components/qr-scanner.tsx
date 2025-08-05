"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, X, Flashlight, FlashlightOff } from "lucide-react"

interface QRScannerProps {
  onScan: (data: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFlash, setHasFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)

      // Demander l'accès à la caméra arrière avec haute résolution
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        setIsScanning(true)

        // Vérifier si la caméra a un flash
        const track = mediaStream.getVideoTracks()[0]
        const capabilities = track.getCapabilities()
        setHasFlash(!!capabilities.torch)

        // Démarrer le scan automatique
        videoRef.current.onloadedmetadata = () => {
          startScanning()
        }
      }
    } catch (err) {
      console.error("Erreur caméra:", err)
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
    }
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsScanning(false)
  }

  const toggleFlash = async () => {
    if (!stream || !hasFlash) return

    try {
      const track = stream.getVideoTracks()[0]
      await track.applyConstraints({
        advanced: [{ torch: !flashOn }],
      })
      setFlashOn(!flashOn)
    } catch (err) {
      console.error("Erreur flash:", err)
    }
  }

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return

    // Scanner toutes les 500ms
    scanIntervalRef.current = setInterval(() => {
      scanForQR()
    }, 500)
  }

  const scanForQR = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Ajuster la taille du canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Dessiner l'image vidéo sur le canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      // Obtenir les données d'image
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      // Ici, dans un vrai projet, vous utiliseriez une bibliothèque comme jsQR
      // Pour la démo, on simule la détection
      const qrData = simulateQRDetection(imageData)

      if (qrData) {
        console.log("QR Code détecté:", qrData)
        onScan(qrData)
        onClose()
      }
    } catch (err) {
      console.error("Erreur scan QR:", err)
    }
  }

  // Simulation de détection QR (remplacer par jsQR en production)
  const simulateQRDetection = (imageData: ImageData): string | null => {
    // Analyser les pixels pour détecter des patterns QR
    const data = imageData.data
    let darkPixels = 0
    let lightPixels = 0

    // Échantillonner quelques pixels au centre
    const centerX = Math.floor(imageData.width / 2)
    const centerY = Math.floor(imageData.height / 2)
    const sampleSize = 50

    for (let x = centerX - sampleSize; x < centerX + sampleSize; x++) {
      for (let y = centerY - sampleSize; y < centerY + sampleSize; y++) {
        if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
          const index = (y * imageData.width + x) * 4
          const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3

          if (brightness < 128) {
            darkPixels++
          } else {
            lightPixels++
          }
        }
      }
    }

    // Si on détecte un pattern contrasté (simulation)
    const contrast = Math.abs(darkPixels - lightPixels) / (darkPixels + lightPixels)

    if (contrast > 0.3 && Math.random() > 0.95) {
      // 5% de chance de "détecter" un QR
      // Générer des données QR simulées
      const qrTypes = [
        `FACTURE:${Date.now()}`,
        `PATIENT:${Math.floor(Math.random() * 1000000)}`,
        `CNAM:${new Date().getFullYear()}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
        `URL:https://cnam.tn/facture/${Math.floor(Math.random() * 10000)}`,
      ]

      return qrTypes[Math.floor(Math.random() * qrTypes.length)]
    }

    return null
  }

  const captureManually = () => {
    // Capture manuelle pour test
    const testQRData = `CNAM:TEST:${Date.now()}`
    onScan(testQRData)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">Scanner QR Code</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center text-red-500 p-4 bg-red-50 rounded">
              <p>{error}</p>
              <Button onClick={startCamera} className="mt-2">
                Réessayer
              </Button>
            </div>
          ) : (
            <>
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                {/* Canvas caché pour l'analyse */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay de visée */}
                {isScanning && (
                  <div className="absolute inset-4 border-2 border-white rounded-lg">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500"></div>

                    {/* Ligne de scan animée */}
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-green-500 animate-pulse"></div>
                  </div>
                )}

                {/* Contrôles */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {hasFlash && (
                    <Button
                      onClick={toggleFlash}
                      variant="secondary"
                      size="sm"
                      className="bg-black bg-opacity-50 text-white"
                    >
                      {flashOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-center text-gray-600">
                  {isScanning ? "Recherche de QR Code..." : "Démarrage de la caméra..."}
                </p>

                <div className="flex gap-2">
                  <Button onClick={captureManually} variant="outline" className="flex-1 bg-transparent">
                    <Camera className="mr-2 h-4 w-4" />
                    Test QR
                  </Button>

                  <Button onClick={onClose} variant="secondary" className="flex-1">
                    Annuler
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
