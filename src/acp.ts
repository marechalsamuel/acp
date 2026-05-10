import { Matrix, SVD } from 'ml-matrix';

// On compresse en ne gardant que 'k' composantes
export function applyPCA(svd: SVD, k: number, rows: number, cols: number) {
  const { leftSingularVectors: U, rightSingularVectors: V, diagonal: S } = svd;

  // Création d'une matrice diagonale tronquée à k
  const reconstructed = Matrix.zeros(rows, cols);
  
  for (let i = 0; i < k; i++) {
    // On ajoute la contribution de chaque composante : s_i * u_i * v_i^T
    const ui = U.getColumnVector(i);
    const vi = V.getColumnVector(i);
    const contribution = ui.mmul(vi.transpose()).mul(S[i]);
    reconstructed.add(contribution);
  }

  return reconstructed.to2DArray();
}