'use client';

import { useState } from 'react';
import { Button, Form, Input, message, Switch, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

    interface FormValues {
    identifier: string;
        password: string;
        username?: string;
        confirmPassword?: string;
    }

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const { login, signup } = useAuth();
    const router = useRouter();

    const onFinish = async (values: FormValues) => {
        setLoading(true);
        try {
            if (isSignUp) {
                // Signup flow
                if (!values.username) {
                    message.error('Username is required for signup');
                    return;
                }
                if (values.password !== values.confirmPassword) {
                    message.error('Passwords do not match');
                    return;
                }
                await signup(values.identifier, values.username, values.password);
                message.success('Account created successfully!');
            } else {
                // Login flow
                await login(values.identifier, values.password);
                message.success('Login successful!');
            }
            router.push('/chat');
        } catch (error) {
            message.error(isSignUp ? 'Signup failed. Please try again.' : 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (email: string) => {
        setLoading(true);
        try {
            // TODO: Implement forgot password API call
            message.success('Password reset instructions sent to your email!');
            setShowForgotPassword(false);
        } catch (error) {
            message.error('Failed to send reset instructions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style jsx>{`
                .login-page {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: #f8fafc;
                }
                
                .login-form-section {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    background: white;
                }
                
                .login-branding-section {
                    flex: 1;
                    display: flex;
                    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                    color: white;
                    padding: 2rem;
                    align-items: center;
                    justify-content: center;
                }
                
                .form-container {
                    width: 100%;
                    max-width: 400px;
                }
                
                .logo-section {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .logo-section img {
                    width: 48px;
                    height: 48px;
                    margin-bottom: 1rem;
                }
                
                .logo-section h1 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0;
                }
                
                .form-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 0.5rem;
                    text-align: center;
                }
                
                .form-subtitle {
                    font-size: 1rem;
                    color: #6b7280;
                    margin-bottom: 2rem;
                    text-align: center;
                }
                
                .form-card {
                    background: white;
                    border-radius: 12px;
                    padding: 2rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                }
                
                .form-input {
                    height: 48px;
                    border-radius: 8px;
                    border: 1px solid #d1d5db;
                }
                
                .form-button {
                    height: 48px;
                    border-radius: 8px;
                    font-weight: 500;
                }
                
                .toggle-section {
                    text-align: center;
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid #e5e7eb;
                }
                
                .footer {
                    position: fixed;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.75rem;
                    color: #9ca3af;
                    text-align: center;
                }
                
                .branding-content {
                    text-align: center;
                    max-width: 400px;
                }
                
                .branding-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                }
                
                .branding-subtitle {
                    font-size: 1rem;
                    color: #cbd5e1;
                    margin-bottom: 1.5rem;
                }
                
                .demo-image {
                    width: 100%;
                    max-width: 400px;
                    height: auto;
                    border-radius: 12px;
                    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3);
                }
                
                @media (min-width: 1024px) {
                    .login-page {
                        flex-direction: row;
                    }
                    
                    .branding-title {
                        font-size: 2rem;
                        margin-bottom: 1rem;
                    }
                    
                    .branding-subtitle {
                        font-size: 1.125rem;
                        margin-bottom: 2rem;
                    }
                    
                    .demo-image {
                        max-width: 450px;
                    }
                    
                    .footer {
                        left: 2rem;
                        transform: none;
                        text-align: left;
                    }
                }
            `}</style>
            
            <div className="login-page">
                {/* Form Section */}
                <div className="login-form-section">
                    <div className="form-container">
                        <div className="logo-section">
                        <Image
                            src="/aiser-logo.png"
                            alt="Aiser Logo"
                                width={48}
                                height={48}
                            />
                            <h1>Aiser</h1>
                        </div>
                        
                        <div className="form-card">
                            <h1 className="form-title">
                                {isSignUp ? 'Create your account' : 'Welcome back'}
                            </h1>
                            <p className="form-subtitle">
                                {isSignUp 
                                    ? 'Sign up to get started with Aiser' 
                                    : 'Sign in to your account to continue'
                                }
                            </p>
                            
                            <Form
                                name="login"
                                onFinish={onFinish}
                                layout="vertical"
                                size="large"
                            >
                                <Form.Item
                                    name="identifier"
                                    rules={[
                                        { required: true, message: 'Please input your email!' },
                                        { type: 'email', message: 'Please enter a valid email!' }
                                    ]}
                                >
                                    <Input
                                        prefix={<UserOutlined />}
                                        placeholder="Email"
                                        className="form-input"
                                    />
                                </Form.Item>
                                
                                {isSignUp && (
                                    <Form.Item
                                        name="username"
                                        rules={[
                                            { required: true, message: 'Please input your username!' },
                                            { min: 3, message: 'Username must be at least 3 characters!' }
                                        ]}
                                    >
                                        <Input
                                            prefix={<UserOutlined />}
                                            placeholder="Username"
                                            className="form-input"
                                        />
                                    </Form.Item>
                                )}
                                
                                <Form.Item
                                    name="password"
                                    rules={[
                                        { required: true, message: 'Please input your password!' },
                                        { min: 6, message: 'Password must be at least 6 characters!' }
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined />}
                                        placeholder="Password"
                                        className="form-input"
                                    />
                                </Form.Item>
                                
                                {isSignUp && (
                                    <Form.Item
                                        name="confirmPassword"
                                        rules={[
                                            { required: true, message: 'Please confirm your password!' },
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    if (!value || getFieldValue('password') === value) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject(new Error('Passwords do not match!'));
                                                },
                                            }),
                                        ]}
                                    >
                                        <Input.Password
                                            prefix={<LockOutlined />}
                                            placeholder="Confirm Password"
                                            className="form-input"
                                        />
                                    </Form.Item>
                                )}
                                
                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        className="form-button"
                                        block
                                    >
                                        {isSignUp ? 'Sign Up' : 'Sign In'}
                                    </Button>
                                </Form.Item>
                            </Form>
                            
                            <div className="toggle-section">
                                <Switch
                                    checked={isSignUp}
                                    onChange={setIsSignUp}
                                    checkedChildren="Sign Up"
                                    unCheckedChildren="Sign In"
                                />
                                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                                </p>
                                
                                {!isSignUp && (
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                        <a 
                                            href="#" 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setShowForgotPassword(true);
                                            }}
                                            style={{ color: '#3b82f6' }}
                                        >
                                            Forgot your password?
                                        </a>
                                    </p>
                                )}
                                
                                <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
                                    By signing {isSignUp ? 'up' : 'in'}, you agree to our{' '}
                                    <a href="/terms" style={{ color: '#3b82f6' }}>Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="/privacy" style={{ color: '#3b82f6' }}>Privacy Policy</a>
                                </p>
                            </div>
                        </div>
                        
                        {/* Forgot Password Modal */}
                        {showForgotPassword && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000
                            }}>
                                <div style={{
                                    backgroundColor: 'white',
                                    padding: '2rem',
                                    borderRadius: '12px',
                                    maxWidth: '400px',
                                    width: '90%',
                                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Reset Password</h3>
                                    <p style={{ marginBottom: '1.5rem', color: '#6b7280', textAlign: 'center' }}>
                                        Enter your email address and we'll send you instructions to reset your password.
                                    </p>
                                    <Form
                                        onFinish={(values) => handleForgotPassword(values.email)}
                                        layout="vertical"
                                    >
                                        <Form.Item
                                            name="email"
                                            rules={[
                                                { required: true, message: 'Please input your email!' },
                                                { type: 'email', message: 'Please enter a valid email!' }
                                            ]}
                                        >
                                            <Input
                                                prefix={<MailOutlined />}
                                                placeholder="Email"
                                                size="large"
                                            />
                                        </Form.Item>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <Button onClick={() => setShowForgotPassword(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="primary" htmlType="submit" loading={loading}>
                                                Send Instructions
                                            </Button>
                                        </div>
                                    </Form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Branding Section */}
                <div className="login-branding-section">
                    <div className="branding-content">
                        <h1 className="branding-title">Welcome to Aiser</h1>
                        <p className="branding-subtitle">
                            AI-powered data visualization platform
                        </p>
                        <Image
                            src="/Aiser Demo Gif.gif"
                            alt="Aiser Platform Demo"
                            width={450}
                            height={300}
                            className="demo-image"
                            unoptimized
                        />
                        <h2 className="branding-title" style={{ fontSize: '1.5rem', marginTop: '2rem' }}>
                            Transform data into insights instantly
                        </h2>
                        <p className="branding-subtitle">
                            Join thousands of users discovering patterns and making data-driven decisions with AI
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="footer">
                <p>&copy; 2025 Dataticon Team. All rights reserved.</p>
        </div>
        </>
    );
}