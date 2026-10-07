import infrastructureData from '../data/infrastructure.json'
import type { InfrastructureData } from '../types/infrastructure.ts'

/**
 * Returns the infrastructure snapshot.
 * This module stands in for a backend API. The payload is local mock JSON.
 */
export function getInfrastructure(): InfrastructureData {
  return infrastructureData as InfrastructureData
}
