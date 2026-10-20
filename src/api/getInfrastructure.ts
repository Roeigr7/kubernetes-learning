import infrastructureData from '../data/infrastructure.json'
import { learningProd } from '../data/learningProd.ts'
import type { InfrastructureData } from '../types/infrastructure.ts'

const environments = ['learning', 'Learning Prod']

/**
 * Returns the infrastructure snapshot for one environment.
 * This module stands in for a backend API. The payload is local practice data.
 */
export function getInfrastructure(environment = 'learning'): InfrastructureData {
  const source = environment === 'Learning Prod' ? learningProd : (infrastructureData as InfrastructureData)
  return {
    ...source,
    company: {
      ...source.company,
      environments,
    },
  }
}
