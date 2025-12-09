'use client';

import React, { useState, useEffect } from 'react';
import { Dropdown, Button, List, Empty, Spin, Tooltip, Typography, Tag, Space } from 'antd';
import { 
  FolderOutlined, 
  BarChartOutlined, 
  BulbOutlined, 
  RiseOutlined,
  CodeOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { assetService, SavedAsset } from '@/services/assetService';
import { message } from 'antd';

const { Text } = Typography;

interface AssetLibraryDropdownProps {
  onSelectAsset?: (asset: SavedAsset) => void;
  conversationId?: string;
}

const AssetLibraryDropdown: React.FC<AssetLibraryDropdownProps> = ({ 
  onSelectAsset,
  conversationId 
}) => {
  const [assets, setAssets] = useState<SavedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (conversationId) {
        filters.conversation_id = conversationId;
      }
      const result = await assetService.getAssets({ ...filters, limit: 20 });
      setAssets(result.items || []);
    } catch (error: any) {
      console.error('Failed to load assets:', error);
      message.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadAssets();
    }
  }, [visible, conversationId]);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'chart':
        return <BarChartOutlined />;
      case 'insight':
        return <BulbOutlined />;
      case 'recommendation':
        return <RiseOutlined />;
      case 'query':
        return <CodeOutlined />;
      default:
        return <FolderOutlined />;
    }
  };

  const getAssetColor = (type: string) => {
    switch (type) {
      case 'chart':
        return 'blue';
      case 'insight':
        return 'green';
      case 'recommendation':
        return 'orange';
      case 'query':
        return 'purple';
      default:
        return 'default';
    }
  };

  const handleDelete = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await assetService.deleteAsset(assetId);
      setAssets(assets.filter(a => a.id !== assetId));
    } catch (error: any) {
      console.error('Failed to delete asset:', error);
    }
  };

  const menuItems = [
    {
      key: 'header',
      label: (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '8px 0',
          borderBottom: '1px solid var(--ant-color-border)',
          marginBottom: '8px'
        }}>
          <Text strong style={{ fontSize: '14px' }}>My Assets</Text>
          <Button 
            type="text" 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              loadAssets();
            }}
            style={{ fontSize: '12px' }}
          >
            Refresh
          </Button>
        </div>
      ),
      disabled: true,
    },
    ...(loading ? [{
      key: 'loading',
      label: (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="small" />
        </div>
      ),
      disabled: true,
    }] : assets.length === 0 ? [{
      key: 'empty',
      label: (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No saved assets yet"
            style={{ margin: 0 }}
          />
        </div>
      ),
      disabled: true,
    }] : assets.map((asset) => ({
      key: asset.id,
      label: (
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            padding: '8px 0',
            cursor: 'pointer'
          }}
          onClick={() => {
            if (onSelectAsset) {
              onSelectAsset(asset);
            }
            setVisible(false);
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {getAssetIcon(asset.asset_type)}
              <Text strong style={{ fontSize: '13px' }} ellipsis>
                {asset.title}
              </Text>
              <Tag color={getAssetColor(asset.asset_type)} size="small">
                {asset.asset_type}
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {new Date(asset.created_at).toLocaleDateString()}
            </Text>
          </div>
          <Space size={4}>
            <Tooltip title="View">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectAsset) {
                    onSelectAsset(asset);
                  }
                  setVisible(false);
                }}
              />
            </Tooltip>
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
                onClick={(e) => handleDelete(asset.id, e)}
              />
            </Tooltip>
          </Space>
        </div>
      ),
    }))),
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      placement="bottomRight"
      open={visible}
      onOpenChange={setVisible}
    >
      <Tooltip title="Asset Library" placement="bottom">
        <Button
          type="text"
          size="small"
          icon={<FolderOutlined />}
          style={{ color: 'var(--ant-color-text-secondary)' }}
        />
      </Tooltip>
    </Dropdown>
  );
};

export default AssetLibraryDropdown;


