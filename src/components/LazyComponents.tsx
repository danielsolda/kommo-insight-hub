import { lazy } from 'react';

// Lazy load components for tabs that aren't the overview
export const LazyPipelineChart = lazy(() => 
  import('./PipelineChart').then(module => ({ default: module.PipelineChart }))
);

export const LazyLeadsTable = lazy(() => 
  import('./LeadsTable').then(module => ({ default: module.LeadsTable }))
);

export const LazySalesChart = lazy(() => 
  import('./SalesChart').then(module => ({ default: module.SalesChart }))
);

export const LazySalesRanking = lazy(() => 
  import('./SalesRanking').then(module => ({ default: module.SalesRanking }))
);

export const LazyCustomFieldAnalysis = lazy(() => 
  import('./CustomFieldAnalysis').then(module => ({ default: module.CustomFieldAnalysis }))
);

export const LazyTagsComparator = lazy(() => 
  import('./TagsComparator').then(module => ({ default: module.TagsComparator }))
);

export const LazyLeadBehaviorAnalysis = lazy(() => 
  import('./LeadBehaviorAnalysis').then(module => ({ default: module.LeadBehaviorAnalysis }))
);