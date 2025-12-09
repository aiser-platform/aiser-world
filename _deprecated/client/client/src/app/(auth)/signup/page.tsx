'use client';

import { SignupData, useAuth } from '@/context/AuthContext';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input, Checkbox } from 'antd';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TermsModal from '@/app/components/TermsAndPrivacy/TermsModal';
import PrivacyModal from '@/app/components/TermsAndPrivacy/PrivacyModal';

const VERIFY_URL = `http://localhost:3001/verify`;

export default function SignupPage() {
    const [loading, setLoading] = useState(false);
    const [termsOpen, setTermsOpen] = useState(false);
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);

    const { signup, signupError } = useAuth();
    const [form] = Form.useForm();

    interface FormValues {
        email: string;
        username: string;
        password: string;
        confirmPassword: string;
        phoneNumber: string;
        firstName: string;
        lastName: string;
        agreeToTerms: boolean;
        verification_url: string | null;
    }

    const handleCapsLock = (e: KeyboardEvent) => {
        if (e.code === 'CapsLock') {
            setIsCapsLockOn(e.getModifierState('CapsLock'));
        }
    };

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
        const signupData: SignupData = {
            email: values.email,
            username: values.username,
            password: values.password,
            verification_url: VERIFY_URL,
        };
        try {
            await signup(signupData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left side - Illustration and text */}
            <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground p-12 flex-col justify-between">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Aiser</h1>
                    <p className="text-xl">AI-powered data insights</p>
                </div>
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold">
                        Join Aiser today and transform your data experience.
                    </h2>
                    <p className="text-xl">
                        Create beautiful visualizations and gain insights from
                        your data instantly.
                    </p>
                </div>
                <div>
                    <p>&copy; 2024 Aiser. All rights reserved.</p>
                </div>
            </div>

            {/* Right side - Signup form */}
            <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                <div className="mx-auto w-full max-w-sm space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold">
                            Create an Account
                        </h1>
                        <p className="text-muted-foreground">
                            Enter your information to create your account
                        </p>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        disabled={loading}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item
                                label="First Name"
                                name="firstName"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please enter your first name',
                                    },
                                ]}
                            >
                                <Input placeholder="John" />
                            </Form.Item>

                            <Form.Item
                                label="Last Name"
                                name="lastName"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please enter your last name',
                                    },
                                ]}
                            >
                                <Input placeholder="Doe" />
                            </Form.Item>
                        </div>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please enter your email',
                                },
                                {
                                    type: 'email',
                                    message: 'Please enter a valid email',
                                },
                            ]}
                        >
                            <Input placeholder="m@example.com" />
                        </Form.Item>

                        <Form.Item
                            label="Username"
                            name="username"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please enter a username',
                                },
                                {
                                    min: 3,
                                    message:
                                        'Username must be at least 3 characters',
                                },
                            ]}
                        >
                            <Input placeholder="johndoe" />
                        </Form.Item>

                        <Form.Item
                            label="Phone Number"
                            name="phoneNumber"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please enter your phone number',
                                },
                                {
                                    pattern: /^\+?[1-9]\d{1,14}$/,
                                    message:
                                        'Please enter a valid phone number',
                                },
                            ]}
                        >
                            <Input placeholder="+1234567890" />
                        </Form.Item>

                        <Form.Item
                            label="Password"
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please enter a password',
                                },
                                {
                                    min: 8,
                                    message:
                                        'Password must be at least 8 characters',
                                },
                            ]}
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item
                            label="Confirm Password"
                            name="confirmPassword"
                            dependencies={['password']}
                            rules={[
                                {
                                    required: true,
                                    message: 'Please confirm your password',
                                },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (
                                            !value ||
                                            getFieldValue('password') === value
                                        ) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(
                                            new Error('Passwords do not match')
                                        );
                                    },
                                }),
                            ]}
                        >
                            <Input.Password />
                        </Form.Item>

                        {isCapsLockOn && (
                            <div className="text-sm text-warning">
                                ⚠️ Caps Lock is on
                            </div>
                        )}

                        {signupError && (
                            <div className="flex items-center text-red-500 text-sm">
                                <ExclamationCircleOutlined className="mr-2" />
                                <span>{signupError}</span>
                            </div>
                        )}

                        <Form.Item
                            name="agreeToTerms"
                            valuePropName="checked"
                            rules={[
                                {
                                    validator: (_, value) =>
                                        value
                                            ? Promise.resolve()
                                            : Promise.reject(
                                                  new Error(
                                                      'Please agree to the Terms and Privacy Policy'
                                                  )
                                              ),
                                },
                            ]}
                        >
                            <Checkbox>
                                <span className="text-sm text-gray-600">
                                    I agree to the{' '}
                                    <button
                                        type="button"
                                        onClick={() => setTermsOpen(true)}
                                        className="text-primary hover:underline"
                                    >
                                        Terms of Service
                                    </button>{' '}
                                    and{' '}
                                    <button
                                        type="button"
                                        onClick={() => setPrivacyOpen(true)}
                                        className="text-primary hover:underline"
                                    >
                                        Privacy Policy
                                    </button>
                                </span>
                            </Checkbox>
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="w-full"
                            >
                                Create Account
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="pt-4 border-t text-center space-y-4">
                        <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link
                                href="/signin"
                                className="text-primary hover:underline font-medium"
                            >
                                Sign in
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
