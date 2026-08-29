import { AppError } from '../ai/errors';
import type { StoredSeries } from '../data/seriesRepository';
import { correctSeriesFor } from './correctSeriesFor';
import type { Deps } from './deps';
import { prefetchTomorrow } from './prefetchTomorrow';

export async function submitAnswers(
  deps: Deps,
  seriesId: number,
  answers: { position: number; user_en: string }[],
): Promise<StoredSeries> {
  // Les réponses sont écrites d'abord : une panne réseau ne doit rien coûter.
  deps.series.saveAnswers(seriesId, answers);
  deps.series.setStatus(seriesId, 'in_progress');

  // Relecture par identifiant, jamais par date : minuit peut passer entre
  // l'ouverture de l'écran et la validation, et c'est bien *cette* série
  // qu'on corrige, pas celle du jour courant.
  const series = deps.series.findById(seriesId);
  if (!series) throw new AppError('bad_response', `Série introuvable : ${seriesId}.`);

  const corrected = await correctSeriesFor(deps, series);

  // Le prefetch prépare demain sans jamais pouvoir faire échouer la correction.
  void prefetchTomorrow(deps);

  return corrected;
}
