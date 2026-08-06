/**
 * Recommendation React Hooks
 * Custom React hooks for fetching recommendations, decision graphs, analytics, and triggering actions.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Recommendation, RecommendationGraph } from './recommendation-types';
import { AnalyticsSummary } from './recommendation-analytics';

export function useRecommendations(storeId: string, filters?: { category?: string; priority?: string }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ storeId });
      if (filters?.category) params.append('category', filters.category);
      if (filters?.priority) params.append('priority', filters.priority);

      const res = await fetch(`/api/forecast/recommendations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch {
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, filters?.category, filters?.priority]);

  useEffect(() => {
    if (storeId) fetchRecommendations();
  }, [storeId, fetchRecommendations]);

  return { recommendations, loading, refresh: fetchRecommendations };
}

export function useDecisionGraph(storeId: string) {
  const [graph, setGraph] = useState<RecommendationGraph | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;
    fetch(`/api/forecast/recommendations?storeId=${storeId}&includeGraph=true`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.graph) setGraph(data.graph);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [storeId]);

  return { graph, loading };
}

export function useRecommendationAnalytics(storeId: string) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;
    fetch(`/api/forecast/recommendations/analytics?storeId=${storeId}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.analytics) setAnalytics(data.analytics);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [storeId]);

  return { analytics, loading };
}
