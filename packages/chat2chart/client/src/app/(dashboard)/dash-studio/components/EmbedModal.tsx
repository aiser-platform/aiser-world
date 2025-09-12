import React, { useEffect, useState } from 'react';
import { Modal, Button, List, Input, Space, message, Tooltip } from 'antd';
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { dashboardAPIService } from '../services/DashboardAPIService';

interface EmbedItem {
  id: string;
  embed_token: string;
  is_active: boolean;
  created_at?: string;
  expires_at?: string | null;
}

interface EmbedModalProps {
  visible: boolean;
  onClose: () => void;
  initialEmbedUrl?: string | null;
  dashboardId: string | null;
}

const EmbedModal: React.FC<EmbedModalProps> = ({ visible, onClose, initialEmbedUrl, dashboardId }) => {
  const [items, setItems] = useState<EmbedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEmbeds = async () => {
    if (!dashboardId) return;
    setLoading(true);
    try {
      const res = await dashboardAPIService.listEmbeds(dashboardId);
      setItems(res.items || []);
    } catch (e) {
      console.error('Failed to list embeds', e);
      message.error('Failed to load embeds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchEmbeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Copied to clipboard');
    } catch (e) {
      message.error('Copy failed');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!dashboardId) return;
    try {
      await dashboardAPIService.revokeEmbed(dashboardId, id);
      message.success('Embed revoked');
      fetchEmbeds();
    } catch (e) {
      console.error('Failed to revoke embed', e);
      message.error('Failed to revoke embed');
    }
  };

  return (
    <Modal
      title="Manage Embeds"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>
      ]}
      width={720}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6 }}>Embed URL</div>
        <Space style={{ width: '100%' }}>
          <Input value={initialEmbedUrl || ''} readOnly />
          <Tooltip title="Copy embed URL">
            <Button icon={<CopyOutlined />} onClick={() => handleCopy(initialEmbedUrl || '')} />
          </Tooltip>
        </Space>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 8 }}>Existing Embed Tokens</div>
        <List
          loading={loading}
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="copy" icon={<CopyOutlined />} onClick={() => handleCopy(`${window.location.origin}/embed/dashboards/${dashboardId}?token=${item.embed_token}`)} />,
                <Button key="revoke" danger icon={<DeleteOutlined />} onClick={() => handleRevoke(item.id)} />
              ]}
            >
              <List.Item.Meta
                title={<span style={{ fontFamily: 'monospace' }}>{item.embed_token}</span>}
                description={`Active: ${item.is_active ? 'yes' : 'no'} ${item.created_at ? ' • created: ' + item.created_at : ''}`}
              />
            </List.Item>
          )}
        />
      </div>
    </Modal>
  );
};

export default EmbedModal;


