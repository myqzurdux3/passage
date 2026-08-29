import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

type Options = {
  /** Appelé avant chaque rafraîchissement, et quand l'app passe en fond. */
  beforeLeave?: () => void;
};

/**
 * Relance `refresh` quand l'écran revient au premier plan ou reprend le focus.
 *
 * Sans cela, laisser l'application en fond une nuit affichait indéfiniment les
 * phrases de la veille, sans aucun chemin vers celles du jour.
 *
 * `beforeLeave` est appelé avant de relire l'état, et au passage en arrière-plan :
 * un écran qui garde des écritures en attente doit les vider là, sinon le
 * rafraîchissement les écraserait avec l'état déjà en base.
 */
export function useRefreshOnFocus(refresh: () => void, { beforeLeave }: Options = {}): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const beforeLeaveRef = useRef(beforeLeave);
  beforeLeaveRef.current = beforeLeave;

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        beforeLeaveRef.current?.();
        refreshRef.current();
      } else {
        beforeLeaveRef.current?.();
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshRef.current();
      return () => beforeLeaveRef.current?.();
    }, []),
  );
}
