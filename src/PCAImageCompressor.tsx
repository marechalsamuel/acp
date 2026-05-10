import React, { useState, useRef, useEffect, useMemo } from "react"
import { Matrix, SVD } from "ml-matrix"
import { Slider } from "@/components/ui/slider"
import { Upload } from "lucide-react"
import AxisExplorer from "./AxisExplorer"
import { Progress } from "./components/ui/progress"

export const PCAImageCompressor = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [svdData, setSvdData] = useState<{
    svd: SVD
    rows: number
    cols: number
  } | null>(null)
  const [k, setK] = useState<number>(1)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)

  const onImgLoad = (img: HTMLImageElement) => {
    // On vérifie que les deux canvas sont bien chargés dans le DOM
    if (!canvasRef.current || !outputCanvasRef.current) {
      console.error("Les canvas ne sont pas prêts")
      return
    }

    const canvas = canvasRef.current
    const outputCanvas = outputCanvasRef.current

    const scale = Math.min(1, 300 / Math.max(img.width, img.height))
    const width = Math.floor(img.width * scale)
    const height = Math.floor(img.height * scale)

    // On applique les dimensions aux deux canvas
    canvas.width = width
    canvas.height = height
    outputCanvas.width = width
    outputCanvas.height = height

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(img, 0, 0, width, height)

    // Extraction des pixels en niveaux de gris
    const imageData = ctx.getImageData(0, 0, width, height)
    const matrixData: number[][] = []
    for (let y = 0; y < height; y++) {
      const row: number[] = []
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        // Formule de luminance : 0.299R + 0.587G + 0.114B
        const gray =
          0.299 * imageData.data[i] +
          0.587 * imageData.data[i + 1] +
          0.114 * imageData.data[i + 2]
        row.push(gray)
      }
      matrixData.push(row)
    }

    // Calcul de la SVD (Le gros du travail)
    setTimeout(() => {
      const A = new Matrix(matrixData)
      const svd = new SVD(A)
      setSvdData({ svd, rows: height, cols: width })
      setImage(img)
      setK(Math.floor(Math.min(width, height) * 0.1)) // 10% par défaut
    }, 100)
  }

  useEffect(() => {
    // Charger l'image par défaut au démarrage
    const img = new Image()
    img.onload = () => onImgLoad(img)
    img.src = `${import.meta.env.BASE_URL}cameraman.png`
  }, [])

  // 1. Gérer l'upload et transformer l'image en Matrice
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => onImgLoad(img)
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // 2. Reconstruire l'image quand 'k' change
  useEffect(() => {
    if (!svdData || !outputCanvasRef.current) return

    const { svd, rows, cols } = svdData
    const { leftSingularVectors: U, rightSingularVectors: V, diagonal: S } = svd

    // Reconstruction : A_k = U_k * S_k * V_k^T
    const reconstructed = Matrix.zeros(rows, cols)
    for (let i = 0; i < k; i++) {
      const ui = U.getColumnVector(i)
      const vi = V.getColumnVector(i)
      // Produit extérieur : ui * vi^T * si
      const contribution = ui.mmul(vi.transpose()).mul(S[i])
      reconstructed.add(contribution)
    }

    const ctx = outputCanvasRef.current.getContext("2d")!
    outputCanvasRef.current.width = cols
    outputCanvasRef.current.height = rows
    const outData = ctx.createImageData(cols, rows)

    const data = reconstructed.to2DArray()
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const val = Math.max(0, Math.min(255, data[y][x]))
        const i = (y * cols + x) * 4
        outData.data[i] = val // R
        outData.data[i + 1] = val // G
        outData.data[i + 2] = val // B
        outData.data[i + 3] = 255 // A
      }
    }
    ctx.putImageData(outData, 0, 0)
  }, [k, svdData])

  const maxK = svdData ? Math.min(svdData.rows, svdData.cols) : 100

  const stats = useMemo(() => {
    if (!svdData)
      if (!svdData)
        return {
          original: (0).toLocaleString(),
          compressed: (0).toLocaleString(),
          ratio: (0).toFixed(1),
          quality: (0).toFixed(2),
        }
    const { svd, rows, cols } = svdData
    const S = svd.diagonal

    // 1. Calcul de la variance expliquée (Qualité théorique)
    const totalVariance = S.reduce((acc, val) => acc + val * val, 0)
    const explainedVariance = S.slice(0, k).reduce(
      (acc, val) => acc + val * val,
      0
    )
    const qualityPercent = (explainedVariance / totalVariance) * 100

    // 2. Volume de données (comme vu précédemment)
    const originalSize = rows * cols
    const compressedSize = k * (rows + cols + 1)
    const ratio = (compressedSize / originalSize) * 100

    return {
      original: originalSize.toLocaleString(),
      compressed: compressedSize.toLocaleString(),
      ratio: ratio.toFixed(1),
      quality: qualityPercent.toFixed(2),
    }
  }, [k, svdData])

  return (
    
    <div className="flex min-h-screen flex-col items-center justify-center space-y-8 bg-gradient-to-br from-blue items-center bg-slate-1000 p-8 font-sans w-full">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">TP compression ACP</h1>
      <div className="space-y-4 px-4 w-full">
        <div className="flex justify-between text-sm width-100">
          <span>Nombre de composantes (k)</span>
          <span className="font-bold text-blue-600">
            {k} / {maxK}
          </span>
        </div>
        <Slider
          value={[k]}
          min={1}
          max={maxK}
          step={1}
          onValueChange={(val) => setK(val[0])}
        />
        <p className="text-center text-xs text-slate-400 italic">
          Plus 'k' est petit, plus la compression est forte
        </p>
      </div>

      <div className="space-y-8  w-full">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className={`space-y-2 ${!image ? "hidden" : "block"}`}>
            <p className="text-center text-sm font-medium">Original </p>
            <p className="font-mono text-lg">{stats.original} valeurs</p>

            <div className="flex justify-center">
              <label className="cursor-pointer">
                <div className="hover flex flex-row justify-center space-x-2 rounded-lg border-3 border-dashed border-slate-500 p-3 align-middle text-slate-500 transition hover:bg-slate-100">
                  <Upload className="text-slate-500" />
                  <span className="text-sm text-slate-600">
                    Charger une image
                  </span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleImageUpload}
                  accept="image/*"
                />
              </label>
            </div>
          </div>
          <div className={`space-y-2 ${!image ? "hidden" : "block"}`}>
            <p className="text-center text-sm font-medium text-blue-600">
              Compressée (k = {k}){" "}
            </p>
            <p className="font-mono text-lg text-blue-700">
              {stats.compressed} valeurs
            </p>
            <p className="text-sm">
              Poids de l'image : {stats.ratio}% du volume initial
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span>Fidélité théorique (Variance expliquée)</span>
                <span>{stats.quality}%</span>
              </div>
              <Progress value={parseFloat(stats.quality)} className="h-2" />
            </div>
          </div>
          <div className={`space-y-2 ${!image ? "hidden" : "block"}`}>
            <canvas
              ref={canvasRef}
              className="w-full rounded-md border shadow-sm"
            />
          </div>
          <div className={`space-y-2 ${!image ? "hidden" : "block"}`}>
            <canvas
              ref={outputCanvasRef}
              className="w-full rounded-md border shadow-sm"
            />
          </div>
        </div>
      </div>

      <AxisExplorer svdData={svdData} />
    </div>
  )
}
