'use client';

import { useAuth } from '@/context/AuthContext';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { useEffect, useState } from 'react';

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

    // useEffect(() => {
    //   if (isAuthenticated) {
    //     router.push("/chat");
    //   }
    // }, [isAuthenticated, router]);

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
        <div className="flex min-h-screen ">
            {/* Left side - Illustration and text */}
            <div className="flex-col justify-between hidden w-1/2 p-12 lg:flex bg-primary text-primary-foreground">
                <div>
                    <h1 className="mb-2 text-4xl font-bold">Aiser Platform</h1>
                    <p className="text-xl">AI-powered data insights</p>
                </div>
                <div className="space-y-6">
                    {/* <div className="relative w-full aspect-square">
              <img
                src="/placeholder.svg?height=400&width=400"
                alt="Data visualization illustration"
                className="object-cover rounded-lg"
              />
            </div> */}
                    <h2 className="text-3xl font-bold">
                        Aiser Platform is your instant data insights tool.
                    </h2>
                    <p className="text-xl">
                        Unlock the power of your data with AI-driven analysis
                        and visualization.
                    </p>
                </div>
                <div>
                    <p>&copy; 2024 Dataticon Team. All rights reserved.</p>
                </div>
            </div>

            {/* Right side - Login form */}
            <div className="flex flex-col justify-center w-full p-8 lg:w-1/2 lg:p-12">
                <div className="w-full max-w-sm mx-auto space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold">
                            {isSignUp ? 'Sign up for Aiser Platform' : 'Log in to Aiser Platform'}
                        </h1>
                        <p className="text-muted-foreground">
                            {isSignUp 
                                ? 'Create your account to get started' 
                                : 'Enter your email to sign in to your account'
                            }
                        </p>
                    </div>
                    <Form
                        form={form}
                        className="space-y-4"
                        layout="vertical"
                        onFinish={handleSubmit}
                        disabled={loading}
                    >
                        <Form.Item
                            className="space-y-2 text-white"
                            label="Email"
                            name="account"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your email!',
                                },
                                {
                                    type: 'email',
                                    message: 'Please enter a valid email!',
                                },
                            ]}
                        >
                            <Input
                                id="email"
                                placeholder="m@example.com"
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </Form.Item>
                        
                        {isSignUp && (
                            <Form.Item
                                className="space-y-2 text-white"
                                label="Username"
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
                                    placeholder="Enter your username"
                                    required
                                />
                            </Form.Item>
                        )}
                        <Form.Item
                            className="space-y-2"
                            label="Password"
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
                            />
                            {isCapsLockOn && (
                                <div className="text-sm mt-1">
                                    <span role="alert">⚠️ Caps Lock is on</span>
                                </div>
                            )}
                        </Form.Item>
                        
                        {isSignUp && (
                            <Form.Item
                                className="space-y-2"
                                label="Confirm Password"
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
                                />
                            </Form.Item>
                        )}
                        {loginError && (
                            <Form.Item>
                                <div className="flex items-center text-red-500 text-sm">
                                    <ExclamationCircleOutlined className="mr-2" />
                                    <span>{loginError}</span>
                                </div>
                            </Form.Item>
                        )}
                        <Form.Item>
                            <Button
                                type="primary"
                                className="w-full"
                                htmlType="submit"
                                loading={loading}
                            >
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                            </Button>
                        </Form.Item>
                    </Form>
                    
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                className="text-primary hover:underline font-medium"
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
    );
}
