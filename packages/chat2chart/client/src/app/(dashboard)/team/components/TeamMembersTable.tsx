/**
 * TeamMembersTable Component
 * 
 * Displays organization members with their roles and allows role management.
 * Requires ORG_VIEW permission to view, ORG_MANAGE_USERS to edit roles.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Select, Modal, Input } from 'antd';
import { 
  UserOutlined, 
  EditOutlined, 
  DeleteOutlined,
  PlusOutlined,
  MailOutlined 
} from '@ant-design/icons';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { RoleBadge, RoleType } from '@/components/RoleBadge';
import { useOrganization } from '@/context/OrganizationContext';
import type { ColumnsType } from 'antd/es/table';

interface TeamMember {
  user_id: string;
  email: string;
  username?: string;
  name?: string;
  role: string;
  is_active: boolean;
  joined_at?: string;
  avatar_url?: string;
}

interface TeamMembersTableProps {
  organizationId?: string | number;
}

export const TeamMembersTable: React.FC<TeamMembersTableProps> = ({
  organizationId,
}) => {
  const { currentOrganization } = useOrganization();
  const orgId = organizationId || currentOrganization?.id;
  const { hasPermission, loading: permissionsLoading } = usePermissions({
    organizationId: orgId ? String(orgId) : undefined,
  });

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [inviteModalVisible, setInviteModalVisible] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [roleSelectVisible, setRoleSelectVisible] = useState<string | null>(null);

  const canView = hasPermission(Permission.ORG_VIEW);
  const canManage = hasPermission(Permission.ORG_MANAGE_USERS);

  useEffect(() => {
    if (orgId && canView) {
      fetchMembers();
    }
  }, [orgId, canView]);

  const fetchMembers = async () => {
    if (!orgId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/rbac/organizations/${orgId}/members`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          message.error('You do not have permission to view organization members');
          return;
        }
        throw new Error(`Failed to fetch members: ${response.status}`);
      }

      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      message.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!orgId) return;

    try {
      const response = await fetch(
        `/api/rbac/organizations/${orgId}/members/${userId}/role?role=${newRole}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          message.error('You do not have permission to change roles');
          return;
        }
        throw new Error(`Failed to update role: ${response.status}`);
      }

      message.success('Role updated successfully');
      setRoleSelectVisible(null);
      fetchMembers(); // Refresh list
    } catch (error) {
      console.error('Error updating role:', error);
      message.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    // TODO: Implement remove member endpoint
    message.info('Remove member functionality coming soon');
  };

  const handleInviteMember = async (email: string, role: string) => {
    if (!orgId) return;

    try {
      const response = await fetch(`/api/organization/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role,
          organization_id: orgId,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          message.error('You do not have permission to invite members');
          return;
        }
        throw new Error(`Failed to invite member: ${response.status}`);
      }

      message.success('Invitation sent successfully');
      setInviteModalVisible(false);
      fetchMembers(); // Refresh list
    } catch (error) {
      console.error('Error inviting member:', error);
      message.error('Failed to send invitation');
    }
  };

  const columns: ColumnsType<TeamMember> = [
    {
      title: 'Member',
      key: 'member',
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ fontSize: 20 }} />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.name || record.username || record.email.split('@')[0]}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <RoleBadge role={role as RoleType} />,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'joined_at',
      key: 'joined_at',
      render: (date: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <PermissionGuard permission={Permission.ORG_MANAGE_USERS}>
            {roleSelectVisible === record.user_id ? (
              <Select
                defaultValue={record.role}
                style={{ width: 120 }}
                onChange={(value) => handleRoleChange(record.user_id, value)}
                onBlur={() => setRoleSelectVisible(null)}
                autoFocus
                options={[
                  { label: 'Owner', value: 'owner' },
                  { label: 'Admin', value: 'admin' },
                  { label: 'Member', value: 'member' },
                  { label: 'Viewer', value: 'viewer' },
                ]}
              />
            ) : (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => setRoleSelectVisible(record.user_id)}
                size="small"
              >
                Change Role
              </Button>
            )}
            <Popconfirm
              title="Remove member from organization?"
              description="This action cannot be undone."
              onConfirm={() => handleRemoveMember(record.user_id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                Remove
              </Button>
            </Popconfirm>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  if (permissionsLoading) {
    return <div>Loading permissions...</div>;
  }

  if (!canView) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>You do not have permission to view organization members.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Team Members ({members.length})</h3>
        <PermissionGuard permission={Permission.ORG_MANAGE_USERS}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setInviteModalVisible(true)}
          >
            Invite Member
          </Button>
        </PermissionGuard>
      </div>

      <Table
        columns={columns}
        dataSource={members}
        loading={loading}
        rowKey="user_id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} members`,
        }}
      />

      <Modal
        title="Invite Team Member"
        open={inviteModalVisible}
        onCancel={() => setInviteModalVisible(false)}
        onOk={() => {
          // Handle invite in form
          const emailInput = document.getElementById('invite-email') as HTMLInputElement;
          const roleSelect = document.getElementById('invite-role') as HTMLSelectElement;
          if (emailInput && roleSelect) {
            handleInviteMember(emailInput.value, roleSelect.value);
          }
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label>Email Address</label>
            <Input
              id="invite-email"
              prefix={<MailOutlined />}
              placeholder="user@example.com"
              type="email"
            />
          </div>
          <div>
            <label>Role</label>
            <Select
              id="invite-role"
              defaultValue="member"
              style={{ width: '100%' }}
              options={[
                { label: 'Owner', value: 'owner' },
                { label: 'Admin', value: 'admin' },
                { label: 'Member', value: 'member' },
                { label: 'Viewer', value: 'viewer' },
              ]}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};



