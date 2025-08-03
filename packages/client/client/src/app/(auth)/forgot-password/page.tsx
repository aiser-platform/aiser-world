'use client';

import { Button, Form, Input } from 'antd';
import { useState } from 'react';
import Link from 'next/link';
import {
    ExclamationCircleOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const { forgotPassword, forgotPasswordError, forgotPasswordSuccess } =
        useAuth();
    const [form] = Form.useForm();

    const handleSubmit = async (values: { email: string }) => {
        setLoading(true);

        try {
            await forgotPassword(values.email);
        } finally {
            setLoading(false);
        }
    };

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
                        {`We'll send you a link to reset your password securely.`}
                    </p>
                </div>
                <div>
                    <p>&copy; 2024 Aiser. All rights reserved.</p>
                </div>
            </div>

            {/* Right side - Forgot password form */}
            <div className="flex flex-col justify-center w-full p-8 lg:w-1/2 lg:p-12">
                <div className="w-full max-w-sm mx-auto space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold">Forgot Password</h1>
                        <p className="text-muted-foreground">
                            {`Enter your email and we'll send you a reset link`}
                        </p>
                    </div>

                    {forgotPasswordSuccess ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center text-green-600 mb-2">
                                <CheckCircleOutlined className="mr-2" />
                                <span className="font-medium">Email sent!</span>
                            </div>
                            <p className="text-sm text-gray-600">
                                Check your inbox for instructions to reset your
                                password.
                            </p>
                            <div className="mt-4">
                                <Link
                                    href="/signin"
                                    className="text-primary hover:underline font-medium"
                                >
                                    Return to login
                                </Link>
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
                                label="Email"
                                name="email"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please input your email!',
                                    },
                                    {
                                        type: 'email',
                                        message: 'Please enter a valid email',
                                    },
                                ]}
                            >
                                <Input
                                    id="email"
                                    placeholder="m@example.com"
                                    required
                                    type="email"
                                />
                            </Form.Item>

                            {forgotPasswordError && (
                                <Form.Item>
                                    <div className="flex items-center text-red-500 text-sm">
                                        <ExclamationCircleOutlined className="mr-2" />
                                        <span>{forgotPasswordError}</span>
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
                                    Send Reset Link
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
