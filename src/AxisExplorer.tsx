import { useState, useRef, useEffect } from "react"
import { SVD } from "ml-matrix"
import { Slider } from "@/components/ui/slider"
export type SVDData = {
  svd: SVD
  rows: number
  cols: number
} | null
export type AxisExplorerProps = {
  svdData: SVDData
}
export default function AxisExplorer({ svdData }: AxisExplorerProps) {
  const [selectedAxe, setSelectedAxe] = useState(0)
  const axeCanvasRef = useRef<HTMLCanvasElement>(null)

  const maxK = svdData ? Math.min(svdData.rows, svdData.cols) : 100

  const getAxeVisual = (svd: SVD, index: number) => {
    const { leftSingularVectors: U, rightSingularVectors: V, diagonal: S } = svd

    // Extraction des vecteurs de la i-ème composante
    const ui = U.getColumnVector(index)
    const vi = V.getColumnVector(index)

    // A_i = u_i * s_i * v_i^T
    // On multiplie le vecteur colonne par le vecteur ligne (produit extérieur)
    const axeMatrix = ui.mmul(vi.transpose()).mul(S[index])
    return axeMatrix.to2DArray()
  }

  useEffect(() => {
    if (!svdData || !axeCanvasRef.current) return

    const data = getAxeVisual(svdData.svd, selectedAxe)
    const { rows, cols } = svdData
    const ctx = axeCanvasRef.current.getContext("2d")!

    axeCanvasRef.current.width = cols
    axeCanvasRef.current.height = rows
    const outData = ctx.createImageData(cols, rows)

    // Trouver le max absolu pour normaliser le contraste de l'axe
    let maxAbs = 0
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (Math.abs(data[y][x]) > maxAbs) maxAbs = Math.abs(data[y][x])
      }
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Normalisation : 0 devient gris (128), les extrêmes vont vers noir/blanc
        const val = 128 + (data[y][x] / (maxAbs || 1)) * 127
        const i = (y * cols + x) * 4
        outData.data[i] = val
        outData.data[i + 1] = val
        outData.data[i + 2] = val
        outData.data[i + 3] = 255
      }
    }
    ctx.putImageData(outData, 0, 0)
  }, [selectedAxe, svdData])

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row">
      <div className="w-full md:w-1/3">
        <canvas ref={axeCanvasRef} className="w-full rounded border bg-black" />
      </div>

      <div className="w-full flex-1 space-y-4">
        <div className="flex justify-between">
          <span className="text-sm font-medium">Visualiser l'axe n° :</span>
          <span className="font-bold text-blue-600">{selectedAxe + 1}</span>
        </div>
        <Slider
          value={[selectedAxe]}
          min={0}
          max={maxK - 1}
          step={1}
          onValueChange={(val) => setSelectedAxe(val[0])}
        />
        <p className="text-xs text-muted-foreground">
          L'image finale est la somme de tous les axes de 1 jusqu'à k. L'axe 1
          contient les formes globales, les axes suivants ajoutent les textures.
        </p>
      </div>
    </div>
  )
}
