'use client';

import React from 'react';
import { Modal } from 'antd';
import AdvancedDashboardCanvas from './AdvancedDashboardCanvas';
import { DashboardWidget } from './DashboardConfiguration/DashboardConfigProvider';

interface FullscreenPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  widgets: DashboardWidget[];
  layout: any[];
  title?: string;
  subtitle?: string;
  isDarkMode?: boolean;
}

const FullscreenPreviewModal: React.FC<FullscreenPreviewModalProps> = ({ visible, onClose, widgets, layout, title, subtitle, isDarkMode = false }) => {
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={'100%'}
      style={{ top: 0, padding: 0 }}
      bodyStyle={{ height: '100vh', padding: 0 }}
      closable={true}
    >
      <div style={{ height: '100%', background: isDarkMode ? '#000' : '#fff' }}>
        <AdvancedDashboardCanvas
          widgets={widgets}
          layout={layout}
          selectedWidget={null}
          isDarkMode={isDarkMode}
          onLayoutChange={() => {}}
          onWidgetSelect={() => {}}
          onWidgetUpdate={() => {}}
          onWidgetDelete={() => {}}
          onWidgetDuplicate={() => {}}
          onWidgetConfigUpdate={() => {}}
          onAddWidget={() => {}}
          dashboardTitle={title || ''}
          dashboardSubtitle={subtitle || ''}
          onTitleChange={() => {}}
          onSubtitleChange={() => {}}
        />
      </div>
    </Modal>
  );
};

export default FullscreenPreviewModal;


