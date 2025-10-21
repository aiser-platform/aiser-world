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
                    setLoading(false);
                    return;
                }
                if (values.password !== values.confirmPassword) {
                    message.error('Passwords do not match');
                    setLoading(false);
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
            console.error('Authentication error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
            
            if (isSignUp) {
                message.error(`Signup failed: ${errorMessage}`);
            } else {
                // Provide more specific error messages based on the error
                if (errorMessage.includes('Invalid credentials') || errorMessage.includes('401')) {
                    message.error('Invalid email or password. Please check your credentials.');
                } else if (errorMessage.includes('Network error') || errorMessage.includes('fetch')) {
                    message.error('Network error. Please check your connection and try again.');
                } else if (errorMessage.includes('verify')) {
                    message.error('Please verify your email before signing in.');
                } else {
                    message.error(`Login failed: ${errorMessage}`);
                }
            }
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
                    font-size: 1.875rem; /* 30px - standardized large heading */
                    font-weight: 700;
                    color: var(--color-text-primary, #1f2937);
                    margin: 0;
                    line-height: 1.2;
                }
                
                .form-title {
                    font-size: 1.5rem; /* 24px - standardized medium heading */
                    font-weight: 600;
                    color: var(--color-text-primary, #111827);
                    margin-bottom: 0.5rem;
                    text-align: center;
                    line-height: 1.3;
                }
                
                .form-subtitle {
                    font-size: 1rem; /* 16px - standardized body text */
                    color: var(--color-text-secondary, #6b7280);
                    margin-bottom: 2.5rem; /* Increased spacing */
                    text-align: center;
                    line-height: 1.5;
                }
                
                .form-card {
                    background: white;
                    border-radius: 12px;
                    padding: 2.5rem; /* Increased padding */
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                    margin-top: 1rem; /* Add space from logo */
                }
                
                .form-input {
                    height: 52px; /* Slightly increased height */
                    border-radius: 8px;
                    border: 1px solid var(--color-border-primary, #d1d5db);
                    font-size: 1rem; /* 16px - standardized input text */
                    padding: 0 18px; /* Increased padding */
                    transition: all 0.2s ease;
                    margin-bottom: 0.5rem; /* Add spacing between inputs */
                }
                
                .form-input:focus {
                    border-color: var(--color-brand-primary, #2563eb);
                    box-shadow: 0 0 0 3px var(--color-brand-primary-light, rgba(37, 99, 235, 0.1));
                }
                
                .form-button {
                    height: 52px; /* Match input height */
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 1rem; /* 16px - standardized button text */
                    transition: all 0.2s ease;
                    margin-top: 1rem; /* Add spacing from inputs */
                }
                
                .form-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                
                .toggle-section {
                    text-align: center;
                    margin-top: 2rem; /* Increased spacing */
                    padding-top: 1.5rem;
                    border-top: 1px solid #e5e7eb;
                }
                
                .footer {
                    position: fixed;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.875rem; /* 14px - standardized small text */
                    color: #9ca3af;
                    text-align: center;
                    line-height: 1.4;
                }
                
                .terms-privacy-text {
                    margin-top: 1rem;
                    font-size: 0.875rem; /* 14px - same as "Don't have an account?" */
                    color: #6b7280;
                    text-align: center;
                    line-height: 1.4;
                }
                
                .terms-privacy-text a {
                    color: #3b82f6;
                    text-decoration: none;
                    font-weight: 500;
                }
                
                .terms-privacy-text a:hover {
                    text-decoration: underline;
                }
                
                .branding-content {
                    text-align: center;
                    max-width: 400px;
                }
                
                .branding-title {
                    font-size: 1.875rem; /* 30px - standardized large heading */
                    font-weight: 700;
                    margin-bottom: 1rem;
                    line-height: 1.2;
                    color: #ffffff;
                }
                
                .branding-subtitle {
                    font-size: 1.125rem; /* 18px - standardized subtitle */
                    color: #cbd5e1;
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                }
                
                .branding-secondary-title {
                    font-size: 1.5rem; /* 24px - standardized secondary heading */
                    font-weight: 600;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    line-height: 1.3;
                    color: #ffffff;
                }
                
                .branding-description {
                    font-size: 1rem; /* 16px - standardized body text */
                    color: #cbd5e1;
                    line-height: 1.5;
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
                        font-size: 2.25rem; /* 36px - larger for desktop */
                        margin-bottom: 1rem;
                        line-height: 1.1;
                    }
                    
                    .branding-subtitle {
                        font-size: 1.25rem; /* 20px - larger for desktop */
                        margin-bottom: 2rem;
                        line-height: 1.4;
                    }
                    
                    .branding-secondary-title {
                        font-size: 1.75rem; /* 28px - larger for desktop */
                        margin-top: 2rem;
                        margin-bottom: 1rem;
                        line-height: 1.2;
                    }
                    
                    .branding-description {
                        font-size: 1.125rem; /* 18px - larger for desktop */
                        line-height: 1.5;
                    }
                    
                    .demo-image {
                        max-width: 450px;
                    }
                    
                    .footer {
                        left: 2rem;
                        transform: none;
                        text-align: left;
                        font-size: 1rem; /* 16px - larger for desktop */
                    }
                    
                    .form-title {
                        font-size: 1.75rem; /* 28px - larger for desktop */
                        margin-bottom: 0.75rem;
                    }
                    
                    .form-subtitle {
                        font-size: 1.125rem; /* 18px - larger for desktop */
                        margin-bottom: 3rem;
                    }
                    
                    .form-input {
                        height: 56px; /* Larger for desktop */
                        font-size: 1.125rem; /* 18px - larger for desktop */
                        padding: 0 20px;
                    }
                    
                    .form-button {
                        height: 56px; /* Match input height */
                        font-size: 1.125rem; /* 18px - larger for desktop */
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
                                
                                <p className="terms-privacy-text">
                                    By signing {isSignUp ? 'up' : 'in'}, you agree to our{' '}
                                    <a href="/terms">Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="/privacy">Privacy Policy</a>
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
                        <h2 className="branding-secondary-title">
                            Transform data into insights instantly
                        </h2>
                        <p className="branding-description">
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