import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardAPIService } from '@/app/(dashboard)/dash-studio/services/DashboardAPIService'
import { useDashboardStore } from '@/stores/useDashboardStore'

// List all dashboards
export const useDashboards = () => {
  return useQuery({
    queryKey: ['dashboards'],
    queryFn: () => dashboardAPIService.listDashboards(),
    staleTime: 5 * 60 * 1000,
  })
}

// Get single dashboard
export const useDashboard = (id: string) => {
  const query = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => dashboardAPIService.getDashboard(id),
    enabled: !!id,
  });
  
  // Sync to Zustand when data changes
  React.useEffect(() => {
    if (query.data) {
      useDashboardStore.setState({ widgets: query.data.widgets || [] });
    }
  }, [query.data]);
  
  return query;
}

// Save dashboard (create or update)
export const useSaveDashboard = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      if (id) {
        return dashboardAPIService.updateDashboard(id, data)
      } else {
        return dashboardAPIService.createDashboard(data)
      }
    },
    onMutate: async ({ id, data }) => {
      // Optimistic update
      if (id) {
        await queryClient.cancelQueries({ queryKey: ['dashboard', id] })
        const previous = queryClient.getQueryData(['dashboard', id])
        queryClient.setQueryData(['dashboard', id], data)
        return { previous, id }
      }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous && context?.id) {
        queryClient.setQueryData(['dashboard', context.id], context.previous)
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['dashboard', variables.id] })
      }
    },
  })
}

// Delete dashboard
export const useDeleteDashboard = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => dashboardAPIService.deleteDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })
}

// Widget operations
export const useCreateWidget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ dashboardId, widgetData }: { dashboardId: string; widgetData: any }) => 
      dashboardAPIService.createWidget(dashboardId, widgetData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.dashboardId] })
    },
  })
}

export const useUpdateWidget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ dashboardId, widgetId, widgetData }: { dashboardId: string; widgetId: string; widgetData: any }) => 
      dashboardAPIService.updateWidget(dashboardId, widgetId, widgetData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.dashboardId] })
    },
  })
}

export const useDeleteWidget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ dashboardId, widgetId }: { dashboardId: string; widgetId: string }) => 
      dashboardAPIService.deleteWidget(dashboardId, widgetId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.dashboardId] })
    },
  })
}
