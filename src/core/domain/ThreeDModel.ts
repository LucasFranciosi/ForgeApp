export type ThreeDModelStatus = 'pending' | 'available' | 'missing' | 'failed';
export type ThreeDModelSnapshot = {
  id: string; machineId: string; localUri: string; fileName?: string; fileSize?: number; fileHash?: string;
  status: ThreeDModelStatus; createdAt: string; updatedAt: string; version: number;
};

export function validateThreeDModel(model: ThreeDModelSnapshot): void {
  if (!model.machineId || !model.localUri) throw new Error('Máquina e arquivo local são obrigatórios para o modelo 3D.');
  if (model.fileName && !/\.(glb|gltf)$/i.test(model.fileName)) throw new Error('O modelo precisa estar no formato GLB ou GLTF.');
}
