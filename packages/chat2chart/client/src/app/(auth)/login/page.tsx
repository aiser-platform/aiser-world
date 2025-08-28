'use client';

import { useAuth } from '@/context/AuthContext';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    const { login, signup, loginError, setLoginError } = useAuth();
    const [form] = Form.useForm();

    interface FormValues {
        account: string;
        password: string;
        username?: string;
        confirmPassword?: string;
    }

    // Add this function to handle Caps Lock detection
    const handleCapsLock = (e: KeyboardEvent) => {
        if (e.code === 'CapsLock')
            setIsCapsLockOn(e.getModifierState('CapsLock'));
    };

    // Add useEffect to add/remove event listeners
    useEffect(() => {
        window.addEventListener('keydown', handleCapsLock);
        window.addEventListener('keyup', handleCapsLock);

        return () => {
            window.removeEventListener('keydown', handleCapsLock);
            window.removeEventListener('keyup', handleCapsLock);
        };
    }, []);

    const handleSubmit = async (values: FormValues) => {
        setLoading(true);
        if (isSignUp) {
            signup(values.account, values.username!, values.password);
        } else {
            login(values.account, values.password);
        }
        setLoading(false);
    };

    return (
        <>
            <style jsx>{`
                /* Base input styling for all form fields */
                .ant-input, .ant-input-password {
                    background-color: white !important;
                    border-color: #d1d5db !important;
                    border-radius: 8px !important;
                    height: 40px !important;
                    color: #374151 !important;
                    font-size: 14px !important;
                    line-height: 1.5 !important;
                    padding: 8px 12px !important;
                    transition: all 0.2s ease !important;
                }

                /* Placeholder styling */
                .ant-input::placeholder, .ant-input-password::placeholder {
                    color: #9ca3af !important;
                    background-color: transparent !important;
                }

                /* Focus states */
                .ant-input:focus, .ant-input-password:focus,
                .ant-input-focused, .ant-input-password-focused {
                    background-color: white !important;
                    border-color: #1f2937 !important;
                    box-shadow: 0 0 0 2px rgba(31, 41, 55, 0.2) !important;
                    outline: none !important;
                }

                /* Hover states */
                .ant-input:hover, .ant-input-password:hover {
                    border-color: #9ca3af !important;
                    background-color: white !important;
                }

                /* Disabled states */
                .ant-input:disabled, .ant-input-password:disabled {
                    background-color: #f9fafb !important;
                    border-color: #e5e7eb !important;
                    color: #9ca3af !important;
                }

                /* Password input inner field */
                .ant-input-password .ant-input {
                    background-color: white !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    height: 100% !important;
                }

                /* Password input inner field focus */
                .ant-input-password .ant-input:focus {
                    background-color: white !important;
                    border: none !important;
                    box-shadow: none !important;
                }

                /* Password visibility toggle button */
                .ant-input-password .ant-input-suffix {
                    background-color: transparent !important;
                }

                .ant-input-password .ant-input-suffix .anticon {
                    color: #6b7280 !important;
                }

                /* Form item labels */
                .ant-form-item-label > label {
                    color: #374151 !important;
                    font-weight: 500 !important;
                    font-size: 14px !important;
                }

                /* Error states */
                .ant-input-status-error, .ant-input-password-status-error {
                    border-color: #ef4444 !important;
                    background-color: white !important;
                }

                .ant-input-status-error:focus, .ant-input-password-status-error:focus {
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
                }

                /* Success states */
                .ant-input-status-success, .ant-input-password-status-success {
                    border-color: #10b981 !important;
                    background-color: white !important;
                }

                .ant-input-status-success:focus, .ant-input-password-status-success:focus {
                    border-color: #10b981 !important;
                    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
                }

                /* Input group styling */
                .ant-input-group {
                    background-color: transparent !important;
                }

                .ant-input-group-addon {
                    background-color: #f9fafb !important;
                    border-color: #d1d5db !important;
                    color: #374151 !important;
                }

                /* Form container styling */
                .ant-form {
                    background-color: transparent !important;
                }

                .ant-form-item {
                    margin-bottom: 24px !important;
                }

                /* Button styling consistency */
                .ant-btn {
                    border-radius: 8px !important;
                    font-weight: 500 !important;
                    transition: all 0.2s ease !important;
                }

                .ant-btn-primary {
                    background-color: #1f2937 !important;
                    border-color: #1f2937 !important;
                    color: white !important;
                }

                .ant-btn-primary:hover {
                    background-color: #111827 !important;
                    border-color: #111827 !important;
                }

                .ant-btn-primary:focus {
                    background-color: #1f2937 !important;
                    border-color: #1f2937 !important;
                    box-shadow: 0 0 0 2px rgba(31, 41, 55, 0.2) !important;
                }

                /* Error message styling */
                .ant-form-item-explain-error {
                    color: #ef4444 !important;
                    font-size: 12px !important;
                    margin-top: 4px !important;
                }

                /* Caps lock warning styling */
                .caps-lock-warning {
                    color: #d97706 !important;
                    font-size: 12px !important;
                    margin-top: 4px !important;
                }
            `}</style>
            <div className="flex min-h-screen">
            {/* Left side - Dark section with GIF and branding */}
            <div className="flex-col justify-between hidden w-1/2 p-12 lg:flex bg-gray-900 text-white">
                <div>
                    <div className="flex items-center mb-8">
                        <Image
                            src="/aiser-logo.png"
                            alt="Aiser Logo"
                            width={40}
                            height={40}
                            className="mr-3"
                        />
                        <h1 className="text-4xl font-bold">Aiser</h1>
                    </div>
                    <p className="text-xl text-gray-300">AI-powered data visualization platform</p>
                </div>
                
                <div className="flex flex-col items-center space-y-6">
                    <div className="relative w-full max-w-md">
                        <Image
                            src="/Aiser Demo Gif.gif"
                            alt="Aiser Platform Demo"
                            width={500}
                            height={300}
                            className="rounded-lg shadow-2xl"
                            unoptimized
                        />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">
                            Transform data into insights instantly
                        </h2>
                        <p className="text-lg text-gray-300">
                            Chat with your data, generate visualizations, and discover patterns with AI
                        </p>
                    </div>
                </div>
                
                <div>
                    <p className="text-xs text-gray-500">&copy; 2025 Dataticon Team. All rights reserved.</p>
                </div>
            </div>

            {/* Right side - White section with login form */}
            <div className="flex flex-col justify-center w-full p-8 lg:w-1/2 lg:p-12 bg-white">
                <div className="w-full max-w-md mx-auto space-y-8">
                    <div className="text-center space-y-3">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {isSignUp ? 'Create your account' : 'Welcome back'}
                        </h1>
                        <p className="text-gray-600">
                            {isSignUp 
                                ? 'Sign up to start analyzing your data with AI' 
                                : 'Sign in to your Aiser account'
                            }
                        </p>
                    </div>
                    
                    <Form
                        form={form}
                        className="space-y-6"
                        layout="vertical"
                        onFinish={handleSubmit}
                        disabled={loading}
                    >
                        <Form.Item
                            label={<span className="text-gray-700 font-medium">Email or Username</span>}
                            name="account"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your email or username!',
                                },
                            ]}
                        >
                            <Input
                                id="account"
                                placeholder="Enter your email or username"
                                required
                                size="large"
                                className="rounded-lg border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                                style={{
                                    backgroundColor: 'white',
                                    borderColor: '#d1d5db',
                                    borderRadius: '8px',
                                    height: '40px'
                                }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </Form.Item>
                        
                        {isSignUp && (
                            <Form.Item
                                label={<span className="text-gray-700 font-medium">Username</span>}
                                name="username"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please input your username!',
                                    },
                                    {
                                        min: 3,
                                        message: 'Username must be at least 3 characters!',
                                    },
                                ]}
                            >
                                                            <Input
                                id="username"
                                placeholder="Choose a username"
                                required
                                size="large"
                                className="rounded-lg border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                                style={{
                                    backgroundColor: 'white',
                                    borderColor: '#d1d5db',
                                    borderRadius: '8px',
                                    height: '40px'
                                }}
                            />
                            </Form.Item>
                        )}
                        
                        <Form.Item
                            label={<span className="text-gray-700 font-medium">Password</span>}
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your password!',
                                },
                                ...(isSignUp ? [{
                                    min: 8,
                                    message: 'Password must be at least 8 characters!',
                                }] : []),
                            ]}
                        >
                            <Input.Password
                                id="password"
                                required
                                placeholder="Enter your password"
                                size="large"
                                className="rounded-lg border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                                style={{
                                    backgroundColor: 'white',
                                    borderColor: '#d1d5db',
                                    borderRadius: '8px',
                                    height: '40px'
                                }}
                            />
                            {isCapsLockOn && (
                                <div className="caps-lock-warning">
                                    <span role="alert">⚠️ Caps Lock is on</span>
                                </div>
                            )}
                        </Form.Item>
                        
                        {isSignUp && (
                            <Form.Item
                                label={<span className="text-gray-700 font-medium">Confirm Password</span>}
                                name="confirmPassword"
                                dependencies={['password']}
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please confirm your password!',
                                    },
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
                                    id="confirmPassword"
                                    required
                                    placeholder="Confirm your password"
                                    size="large"
                                    className="rounded-lg border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                                    style={{
                                        backgroundColor: 'white',
                                        borderColor: '#d1d5db',
                                        borderRadius: '8px',
                                        height: '40px'
                                    }}
                                />
                            </Form.Item>
                        )}
                        
                        {loginError && (
                            <div className="flex items-center p-3 text-red-700 bg-red-50 border border-red-200 rounded-lg">
                                <ExclamationCircleOutlined className="mr-2" />
                                <span className="text-sm">{loginError}</span>
                            </div>
                        )}
                        
                        <Button
                            type="primary"
                            className="w-full h-12 text-lg font-medium rounded-lg bg-gray-900 hover:bg-gray-800 border-gray-900"
                            htmlType="submit"
                            loading={loading}
                        >
                            {isSignUp ? 'Create Account' : 'Sign In'}
                        </Button>
                    </Form>
                    
                    <div className="text-center pt-6">
                        <p className="text-gray-600">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                className="text-gray-900 hover:text-gray-700 font-medium hover:underline"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    form.resetFields();
                                    setLoginError(null);
                                }}
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
