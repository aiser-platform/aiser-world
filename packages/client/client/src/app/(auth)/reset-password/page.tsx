'use client';

import { Button, Form, Input } from 'antd';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    ExclamationCircleOutlined,
    CheckCircleOutlined,
    LockOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const { resetPassword, resetPasswordError, resetPasswordSuccess } =
        useAuth();

    const [form] = Form.useForm();

    // Handle caps lock detection
    const handleCapsLock = (e: KeyboardEvent) => {
        if (e.code === 'CapsLock')
            setIsCapsLockOn(e.getModifierState('CapsLock'));
    };

    useEffect(() => {
        window.addEventListener('keydown', handleCapsLock);
        window.addEventListener('keyup', handleCapsLock);

        return () => {
            window.removeEventListener('keydown', handleCapsLock);
            window.removeEventListener('keyup', handleCapsLock);
        };
    }, []);

    // Redirect if no token is present
    useEffect(() => {
        if (!token) {
            // Optionally redirect to forgot-password page
            window.location.href = '/forgot-password';
        }
    }, [token]);

    useEffect(() => {
        let redirectTimer: NodeJS.Timeout;

        if (resetPasswordSuccess) {
            // Automatically redirect to login after 5 seconds
            redirectTimer = setTimeout(() => {
                window.location.href = '/signin';
            }, 5000);
        }

        return () => {
            if (redirectTimer) clearTimeout(redirectTimer);
        };
    }, [resetPasswordSuccess]);

    const handleSubmit = async (values: {
        password: string;
        confirmPassword: string;
    }) => {
        if (values.password !== values.confirmPassword) {
            return;
        }

        setLoading(true);

        try {
            await resetPassword(token!, values.password);
        } finally {
            setLoading(false);
        }
    };

    if (!token && typeof window !== 'undefined') {
        return (
            <div>
                Invalid or missing token. Please request a new password reset.
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            {/* Left side - Illustration and text */}
            <div className="flex-col justify-between hidden w-1/2 p-12 lg:flex bg-primary text-primary-foreground">
                <div>
                    <h1 className="mb-2 text-4xl font-bold">Aiser</h1>
                    <p className="text-xl">AI-powered data insights</p>
                </div>
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold">Reset your password.</h2>
                    <p className="text-xl">
                        Create a new secure password for your account.
                    </p>
                </div>
                <div>
                    <p>&copy; 2024 Aiser. All rights reserved.</p>
                </div>
            </div>

            {/* Right side - Reset password form */}
            <div className="flex flex-col justify-center w-full p-8 lg:w-1/2 lg:p-12">
                <div className="w-full max-w-sm mx-auto space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold">Reset Password</h1>
                        <p className="text-muted-foreground">
                            Enter your new password below
                        </p>
                    </div>

                    {resetPasswordSuccess ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center text-green-600 mb-2">
                                <CheckCircleOutlined className="mr-2" />
                                <span className="font-medium">
                                    Password reset successful!
                                </span>
                            </div>
                            <p className="text-sm text-gray-600">
                                Your password has been updated. You can now log
                                in with your new password.
                            </p>
                            <div className="mt-6">
                                <Button
                                    type="primary"
                                    className="w-full"
                                    onClick={() =>
                                        (window.location.href = '/signin')
                                    }
                                >
                                    Go to Login
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Form
                            form={form}
                            className="space-y-4"
                            layout="vertical"
                            onFinish={handleSubmit}
                            disabled={loading}
                        >
                            <Form.Item
                                className="space-y-2"
                                label="New Password"
                                name="password"
                                rules={[
                                    {
                                        required: true,
                                        message:
                                            'Please input your new password!',
                                    },
                                    {
                                        min: 8,
                                        message:
                                            'Password must be at least 8 characters',
                                    },
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="New password"
                                />
                                {isCapsLockOn && (
                                    <div className="text-sm mt-1">
                                        <span role="alert">
                                            ⚠️ Caps Lock is on
                                        </span>
                                    </div>
                                )}
                            </Form.Item>

                            <Form.Item
                                className="space-y-2"
                                label="Confirm Password"
                                name="confirmPassword"
                                dependencies={['password']}
                                rules={[
                                    {
                                        required: true,
                                        message:
                                            'Please confirm your password!',
                                    },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (
                                                !value ||
                                                getFieldValue('password') ===
                                                    value
                                            ) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(
                                                new Error(
                                                    'The two passwords do not match'
                                                )
                                            );
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Confirm password"
                                />
                            </Form.Item>

                            {resetPasswordError && (
                                <Form.Item>
                                    <div className="flex items-center text-red-500 text-sm">
                                        <ExclamationCircleOutlined className="mr-2" />
                                        <span>{resetPasswordError}</span>
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
                                    Reset Password
                                </Button>
                            </Form.Item>

                            <div className="text-center">
                                <Link
                                    href="/signin"
                                    className="text-primary hover:underline text-sm"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </Form>
                    )}
                </div>
            </div>
        </div>
    );
}
