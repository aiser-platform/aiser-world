'use client';

import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Row, 
    Col, 
    Typography, 
    Form, 
    Input, 
    Button, 
    Avatar, 
    Upload, 
    message, 
    Divider, 
    Switch, 
    Tag,
    Space,
    Skeleton,
    Empty,
    Select,
    Tooltip
} from 'antd';
import { 
    UserOutlined, 
    MailOutlined, 
    PhoneOutlined,
    GlobalOutlined,
    CameraOutlined,
    SaveOutlined,
    EditOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function ProfileSettingsPage() {
    const { user } = useAuth();
    const { currentOrganization } = useOrganization();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [accountInfo, setAccountInfo] = useState<{
        planType?: string;
        memberSince?: string;
        lastLogin?: string;
    }>({});
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Fetch user profile on mount and set initial values from AuthContext
    useEffect(() => {
        const fetchProfile = async () => {
            setFetching(true);
            try {
                // First, set initial values from AuthContext user object
                if (user) {
                    form.setFieldsValue({
                        username: user.username || '',
                        firstName: user.first_name || user.firstName || '',
                        lastName: user.last_name || user.lastName || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        bio: user.bio || '',
                        website: user.website || '',
                        location: user.location || '',
                        timezone: user.timezone || 'UTC'
                    });
                }
                
                // Then fetch from API to get complete profile data
                // CRITICAL: Use /api/users/profile to match backend routing
                const res = await fetch('/api/users/profile', {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (res.ok) {
                    const profile = await res.json();
                    form.setFieldsValue({
                        username: profile.username || user?.username || '',
                        firstName: profile.first_name || profile.firstName || user?.first_name || user?.firstName || '',
                        lastName: profile.last_name || profile.lastName || user?.last_name || user?.lastName || '',
                        email: profile.email || user?.email || '',
                        phone: profile.phone || user?.phone || '',
                        bio: profile.bio || user?.bio || '',
                        website: profile.website || user?.website || '',
                        location: profile.location || user?.location || '',
                        timezone: profile.timezone || user?.timezone || 'UTC'
                    });
                    
                    // Set avatar URL
                    if (profile.avatar_url) {
                        setAvatarUrl(profile.avatar_url);
                    }
                    
                    // Set account info
                    setAccountInfo({
                        memberSince: profile.created_at || user?.created_at || undefined,
                        lastLogin: profile.last_login_at || user?.last_login_at || undefined,
                    });
                } else {
                    console.warn('Failed to fetch profile from API, using AuthContext data');
                }
                
                // Get plan type from organization context or fetch
                // CRITICAL: Only use plan_type if it's not empty/null
                const planType = (currentOrganization?.plan_type && currentOrganization.plan_type.trim() !== '') 
                    ? currentOrganization.plan_type 
                    : null;
                
                console.log('[ProfilePage] currentOrganization:', currentOrganization);
                console.log('[ProfilePage] planType from currentOrganization:', planType);
                
                if (planType) {
                    console.log('[ProfilePage] Setting planType from currentOrganization:', planType);
                    setAccountInfo(prev => ({
                        ...prev,
                        planType: planType
                    }));
                } else {
                    console.log('[ProfilePage] planType not in currentOrganization, fetching from API...');
                    try {
                        const orgRes = await fetch('/api/organizations', {
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                        });
                        if (orgRes.ok) {
                            const orgs = await orgRes.json();
                            console.log('[ProfilePage] Fetched organizations:', orgs);
                            const currentOrg = Array.isArray(orgs) ? orgs[0] : (orgs.organizations?.[0] || orgs);
                            console.log('[ProfilePage] Current org from API:', currentOrg);
                            const apiPlanType = (currentOrg?.plan_type && currentOrg.plan_type.trim() !== '') 
                                ? currentOrg.plan_type 
                                : null;
                            if (apiPlanType) {
                                console.log('[ProfilePage] Setting planType from API:', apiPlanType);
                                setAccountInfo(prev => ({
                                    ...prev,
                                    planType: apiPlanType
                                }));
                            } else {
                                console.warn('[ProfilePage] No valid plan_type found in API response');
                            }
                        } else {
                            console.error('[ProfilePage] Failed to fetch organizations, status:', orgRes.status);
                        }
                    } catch (error) {
                        console.error('[ProfilePage] Failed to fetch organization:', error);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
                // If API fails, at least we have user data from AuthContext
            } finally {
                setFetching(false);
            }
        };
        
        fetchProfile();
    }, [user, form, currentOrganization, currentOrganization?.plan_type]); // Also depend on plan_type

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const payload: any = {
                username: values.username,
                first_name: values.firstName,
                last_name: values.lastName,
                email: values.email,
                phone: values.phone,
                bio: values.bio,
                website: values.website,
                location: values.location,
                timezone: values.timezone,
                avatar_url: avatarUrl || values.avatar_url || null
            };

            // CRITICAL: Use /api/users/profile to match backend routing
            const res = await fetch('/api/users/profile', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                let errorMessage = `Failed to update profile: ${res.status}`;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    try {
                        const errorText = await res.text();
                        errorMessage = errorText || errorMessage;
                    } catch {
                        // Use default error message
                    }
                }
                throw new Error(errorMessage);
            }

            const updatedProfile = await res.json();
            
            // CRITICAL: Refetch profile to get all updated fields from backend
            try {
                const refreshRes = await fetch('/api/users/profile', {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (refreshRes.ok) {
                    const refreshedProfile = await refreshRes.json();
                    // Update form with refreshed data
                    form.setFieldsValue({
                        username: refreshedProfile.username || updatedProfile.username || values.username,
                        firstName: refreshedProfile.first_name || refreshedProfile.firstName || updatedProfile.first_name || values.firstName,
                        lastName: refreshedProfile.last_name || refreshedProfile.lastName || updatedProfile.last_name || values.lastName,
                        email: refreshedProfile.email || updatedProfile.email || values.email,
                        phone: refreshedProfile.phone || updatedProfile.phone || values.phone,
                        bio: refreshedProfile.bio || updatedProfile.bio || values.bio,
                        website: refreshedProfile.website || updatedProfile.website || values.website,
                        location: refreshedProfile.location || updatedProfile.location || values.location,
                        timezone: refreshedProfile.timezone || updatedProfile.timezone || values.timezone,
                        avatar_url: refreshedProfile.avatar_url || updatedProfile.avatar_url || avatarUrl || values.avatar_url
                    });
                    // Update avatar URL state
                    if (refreshedProfile.avatar_url) {
                        setAvatarUrl(refreshedProfile.avatar_url);
                    }
                    // Update account info
                    setAccountInfo(prev => ({
                        ...prev,
                        memberSince: refreshedProfile.created_at || prev.memberSince,
                        lastLogin: refreshedProfile.last_login_at || prev.lastLogin
                    }));
                }
            } catch (refreshError) {
                console.warn('Failed to refresh profile after update:', refreshError);
                // Fallback to using response data
                form.setFieldsValue({
                    username: updatedProfile.username || values.username,
                    firstName: updatedProfile.first_name || values.firstName,
                    lastName: updatedProfile.last_name || values.lastName,
                    email: updatedProfile.email || values.email,
                    phone: updatedProfile.phone || values.phone,
                    bio: updatedProfile.bio || values.bio,
                    website: updatedProfile.website || values.website,
                    location: updatedProfile.location || values.location,
                    timezone: updatedProfile.timezone || values.timezone
                });
            }

            message.success('Profile updated successfully!');
            setIsEditing(false);
        } catch (error: any) {
            const errorMessage = error?.message || 'Failed to update profile. Please try again.';
            message.error(errorMessage);
            console.error('Profile update error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (file: File) => {
        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // CRITICAL: Use /api/users/upload-avatar to match backend routing
            const res = await fetch('/api/users/upload-avatar', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            
            if (!res.ok) {
                const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
                throw new Error(error.detail || 'Failed to upload avatar');
            }
            
            const result = await res.json();
            const newAvatarUrl = result.url || result.avatar_url;
            setAvatarUrl(newAvatarUrl);
            form.setFieldsValue({ avatar_url: newAvatarUrl });
            message.success('Avatar uploaded successfully!');
            
            // Update user context if available
            if (user) {
                user.avatar_url = newAvatarUrl;
            }
        } catch (error: any) {
            console.error('Avatar upload error:', error);
            message.error(error?.message || 'Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAvatarUrlSubmit = async (url: string) => {
        setUploadingAvatar(true);
        try {
            // CRITICAL: Use /api/users/upload-avatar to match backend routing
            // Send as JSON for URL updates (not multipart/form-data)
            const res = await fetch('/api/users/upload-avatar', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url, avatar_url: url }),
            });
            
            if (!res.ok) {
                const error = await res.json().catch(() => ({ detail: 'Update failed' }));
                throw new Error(error.detail || 'Failed to update avatar URL');
            }
            
            const result = await res.json();
            const avatarUrlValue = result.url || result.avatar_url || url;
            setAvatarUrl(avatarUrlValue);
            form.setFieldsValue({ avatar_url: avatarUrlValue });
            message.success('Avatar URL updated successfully!');
            
            // Update user context if available
            if (user) {
                user.avatar_url = avatarUrlValue;
            }
        } catch (error: any) {
            console.error('Avatar URL submit error:', error);
            message.error(error?.message || 'Failed to update avatar URL');
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (fetching) {
        return (
            <div className="page-wrapper">
                <Skeleton active paragraph={{ rows: 8 }} />
            </div>
        );
    }

    return (
        <div className="page-wrapper" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <Title level={2} className="page-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <UserOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '24px' }} />
                    Profile Settings
                </Title>
                <Text type="secondary" className="page-description" style={{ marginTop: '4px', marginBottom: '0', fontSize: '16px' }}>
                    Manage your personal information and account preferences
                </Text>
            </div>

            <Row gutter={[24, 24]}>
                {/* Left Column - Main Form */}
                <Col xs={24} lg={16}>
                    {/* Personal Information Card */}
                    <Card 
                        title={
                            <Space>
                                <UserOutlined />
                                <span>Personal Information</span>
                            </Space>
                        }
                        extra={
                            !isEditing ? (
                                <Button 
                                    type="text" 
                                    icon={<EditOutlined />}
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit
                                </Button>
                            ) : (
                                <Space>
                                    <Button onClick={() => { setIsEditing(false); form.resetFields(); }}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        type="primary" 
                                        icon={<SaveOutlined />}
                                        loading={loading}
                                        onClick={() => form.submit()}
                                    >
                                        Save
                                    </Button>
                                </Space>
                            )
                        }
                        style={{ marginBottom: '24px' }}
                        className="profile-card"
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            disabled={!isEditing}
                        >
                            <Row gutter={16}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="firstName"
                                        label="First Name"
                                        rules={[{ required: true, message: 'Please enter your first name' }]}
                                    >
                                        <Input 
                                            prefix={<UserOutlined />} 
                                            placeholder="First Name"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="lastName"
                                        label="Last Name"
                                        rules={[{ required: true, message: 'Please enter your last name' }]}
                                    >
                                        <Input 
                                            prefix={<UserOutlined />} 
                                            placeholder="Last Name"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="email"
                                        label="Email Address"
                                        rules={[
                                            { required: true, message: 'Please enter your email' },
                                            { type: 'email', message: 'Please enter a valid email' }
                                        ]}
                                    >
                                        <Input 
                                            prefix={<MailOutlined />} 
                                            placeholder="Email Address"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="phone"
                                        label="Phone Number"
                                    >
                                        <Input 
                                            prefix={<PhoneOutlined />} 
                                            placeholder="Phone Number"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="bio"
                                label={
                                    <Space>
                                        <span>Bio</span>
                                        <Tooltip title="Tell us about yourself (max 500 characters)">
                                            <InfoCircleOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />
                                        </Tooltip>
                                    </Space>
                                }
                            >
                                <TextArea 
                                    rows={4} 
                                    placeholder="Tell us about yourself..."
                                    maxLength={500}
                                    showCount
                                    size="large"
                                />
                            </Form.Item>

                            <Row gutter={16}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="website"
                                        label="Website"
                                    >
                                        <Input 
                                            prefix={<GlobalOutlined />} 
                                            placeholder="https://yourwebsite.com"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="location"
                                        label="Location"
                                    >
                                        <Input 
                                            placeholder="City, Country"
                                            size="large"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="timezone"
                                label="Timezone"
                            >
                                <Select 
                                    placeholder="Select timezone"
                                    size="large"
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={[
                                        { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
                                        { value: 'America/New_York', label: 'EST (Eastern Time)' },
                                        { value: 'America/Chicago', label: 'CST (Central Time)' },
                                        { value: 'America/Denver', label: 'MST (Mountain Time)' },
                                        { value: 'America/Los_Angeles', label: 'PST (Pacific Time)' },
                                        { value: 'Europe/London', label: 'GMT (Greenwich Mean Time)' },
                                        { value: 'Europe/Paris', label: 'CET (Central European Time)' },
                                        { value: 'Asia/Tokyo', label: 'JST (Japan Standard Time)' },
                                        { value: 'Asia/Shanghai', label: 'CST (China Standard Time)' },
                                        { value: 'Asia/Dubai', label: 'GST (Gulf Standard Time)' },
                                    ]}
                                />
                            </Form.Item>
                        </Form>
                    </Card>

                    {/* Account Preferences Card */}
                    <Card 
                        title={
                            <Space>
                                <InfoCircleOutlined />
                                <span>Account Preferences</span>
                            </Space>
                        }
                        className="profile-card"
                    >
                        <Row gutter={[24, 24]}>
                            <Col xs={24} sm={12}>
                                <div style={{ marginBottom: '24px' }}>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <Text strong>Email Notifications</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Receive email updates about your account
                                                </Text>
                                            </div>
                                            <Switch defaultChecked />
                                        </div>
                                    </Space>
                                </div>
                                
                                <div>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <Text strong>Marketing Communications</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Receive product updates and tips
                                                </Text>
                                            </div>
                                            <Switch />
                                        </div>
                                    </Space>
                                </div>
                            </Col>
                            <Col xs={24} sm={12}>
                                <div style={{ marginBottom: '24px' }}>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <Text strong>Two-Factor Authentication</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Add an extra layer of security
                                                </Text>
                                            </div>
                                            <Switch />
                                        </div>
                                    </Space>
                                </div>
                                
                                <div>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <Text strong>Public Profile</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Make your profile visible to others
                                                </Text>
                                            </div>
                                            <Switch defaultChecked />
                                        </div>
                                    </Space>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* Right Column - Avatar & Account Info */}
                <Col xs={24} lg={8}>
                    {/* Profile Picture Card */}
                    <Card 
                        title="Profile Picture"
                        style={{ marginBottom: '24px', textAlign: 'center' }}
                        className="profile-card"
                    >
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <Upload
                                beforeUpload={(file) => {
                                    handleAvatarUpload(file);
                                    return false; // Prevent default upload
                                }}
                                showUploadList={false}
                                accept="image/*"
                            >
                                <Avatar 
                                    size={120} 
                                    src={avatarUrl || user?.avatar_url}
                                    icon={<UserOutlined />}
                                    style={{ 
                                        border: '4px solid var(--ant-color-border)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                    className="avatar-upload-trigger"
                                />
                            </Upload>
                            <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                                Click avatar to upload image
                            </Text>
                            
                            <Divider style={{ margin: '16px 0' }}>OR</Divider>
                            
                            <Space.Compact style={{ width: '100%' }}>
                                <Input
                                    placeholder="Enter image URL (e.g., https://example.com/avatar.jpg)"
                                    size="large"
                                    disabled={uploadingAvatar}
                                    value={avatarUrl || ''}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    onPressEnter={(e) => {
                                        const url = (e.target as HTMLInputElement).value.trim();
                                        if (url) {
                                            handleAvatarUrlSubmit(url);
                                        }
                                    }}
                                />
                                <Button
                                    type="primary"
                                    size="large"
                                    loading={uploadingAvatar}
                                    onClick={() => {
                                        if (avatarUrl) {
                                            handleAvatarUrlSubmit(avatarUrl.trim());
                                        } else {
                                            message.warning('Please enter an image URL');
                                        }
                                    }}
                                >
                                    Save URL
                                </Button>
                            </Space.Compact>
                            
                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', textAlign: 'center' }}>
                                Recommended: Square image, at least 200x200 pixels. Max 5MB.
                            </Text>
                        </Space>
                    </Card>

                    {/* Account Status Card */}
                    <Card 
                        title="Account Information"
                        className="profile-card"
                    >
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                                <Text type="secondary">Account Type</Text>
                                <Tag 
                                    color={
                                        accountInfo.planType === 'enterprise' ? 'gold' :
                                        accountInfo.planType === 'team' ? 'purple' :
                                        accountInfo.planType === 'pro' ? 'blue' : 'default'
                                    } 
                                    style={{ margin: 0 }}
                                >
                                    {/* CRITICAL: Use currentOrganization.plan_type as fallback if accountInfo.planType is not set */}
                                    {(() => {
                                      const plan = accountInfo.planType || currentOrganization?.plan_type;
                                      console.log('[ProfilePage] Rendering Account Type - accountInfo.planType:', accountInfo.planType, 'currentOrganization?.plan_type:', currentOrganization?.plan_type, 'final plan:', plan);
                                      if (!plan || plan.trim() === '') {
                                        return 'LOADING...';
                                      }
                                      return plan.toUpperCase();
                                    })()}
                                </Tag>
                            </div>
                            
                            <Divider style={{ margin: '8px 0' }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                                <Text type="secondary">Member Since</Text>
                                <Text>
                                    {accountInfo.memberSince 
                                        ? new Date(accountInfo.memberSince).toLocaleDateString() 
                                        : (user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A')}
                                </Text>
                            </div>
                            
                            <Divider style={{ margin: '8px 0' }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                                <Text type="secondary">Last Login</Text>
                                <Text>
                                    {accountInfo.lastLogin 
                                        ? new Date(accountInfo.lastLogin).toLocaleDateString() 
                                        : 'Never'}
                                </Text>
                            </div>
                            
                            <Divider style={{ margin: '16px 0' }} />
                            
                            <Button 
                                type="default" 
                                danger 
                                block
                                size="large"
                                style={{ marginTop: '8px' }}
                            >
                                Delete Account
                            </Button>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
