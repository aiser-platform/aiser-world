'use client';

import { useAuth } from '@/context/AuthContext';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TermsModal from '@/app/components/TermsAndPrivacy/TermsModal';
import PrivacyModal from '@/app/components/TermsAndPrivacy/PrivacyModal';

export default function SigninPage() {
    const [email, setEmail] = useState('');
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [termsOpen, setTermsOpen] = useState(false);
    const [privacyOpen, setPrivacyOpen] = useState(false);

    const { signin, signinError } = useAuth();
    const [form] = Form.useForm();

    interface FormValues {
        account: string;
        password: string;
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
        signin(values.account, values.password);
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen ">
            {/* Left side - Illustration and text */}
            <div className="flex-col justify-between hidden w-1/2 p-12 lg:flex bg-primary text-primary-foreground">
                <div>
                    <h1 className="mb-2 text-4xl font-bold">Aiser</h1>
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
                        Aiser is your instant data insights tool.
                    </h2>
                    <p className="text-xl">
                        Unlock the power of your data with AI-driven analysis
                        and visualization.
                    </p>
                </div>
                <div>
                    <p>&copy; 2024 Aiser. All rights reserved.</p>
                </div>
            </div>

            {/* Right side - Signin form */}
            <div className="flex flex-col justify-center w-full p-8 lg:w-1/2 lg:p-12">
                <div className="w-full max-w-sm mx-auto space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold">Log in to Aiser</h1>
                        <p className="text-muted-foreground">
                            Enter your email to sign in to your account
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
                        <Form.Item
                            className="space-y-2"
                            label="Password"
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your password!',
                                },
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

                        {/* Add forgot password link */}
                        <div className="text-right">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {signinError && (
                            <Form.Item>
                                <div className="flex items-center text-red-500 text-sm">
                                    <ExclamationCircleOutlined className="mr-2" />
                                    <span>{signinError}</span>
                                </div>
                            </Form.Item>
                        )}
                        <Form.Item>
                            <Button
                                type="primary"
                                className="w-full"
                                htmlType="submit"
                            >
                                Sign In
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="pt-4 border-t text-center space-y-4">
                        <p className="text-sm text-gray-500">
                            New to Aiser?{' '}
                            <Link
                                href="/signup"
                                className="text-primary hover:underline font-medium"
                            >
                                Create an account
                            </Link>
                        </p>
                        <div className="text-xs text-gray-500 space-y-2">
                            <p>By signing up, you agree to our</p>
                            <div className="space-x-2">
                                <button
                                    onClick={() => setTermsOpen(true)}
                                    className="text-primary hover:underline"
                                >
                                    Terms of Service
                                </button>
                                <span>and</span>
                                <button
                                    onClick={() => setPrivacyOpen(true)}
                                    className="text-primary hover:underline"
                                >
                                    Privacy Policy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
            <PrivacyModal
                open={privacyOpen}
                onClose={() => setPrivacyOpen(false)}
            />
        </div>
    );
}
