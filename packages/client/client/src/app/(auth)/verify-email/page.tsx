'use client';

import { Button, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    LoadingOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const { verifyEmail, resendVerification, verifyEmailError } = useAuth();
    const [verificationSuccess, setVerificationSuccess] = useState(false);
    const [resendEmail, setResendEmail] = useState('');

    // Attempt to verify the email when the component loads
    useEffect(() => {
        async function verifyToken() {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                await verifyEmail(token);
                setVerificationSuccess(true);
            } catch (error) {
                console.error('Verification error:', error);
            } finally {
                setLoading(false);
            }
        }

        verifyToken();
    }, [token, verifyEmail]);

    // Handle resend verification
    const handleResendVerification = async () => {
        if (!resendEmail) return;

        setLoading(true);
        try {
            await resendVerification(resendEmail);
            // Show success message
        } catch (error) {
            // Error is handled in context
            console.error('Resend verification error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Determine what to render based on state
    const renderContent = () => {
        if (loading) {
            return (
                <div className="p-8 text-center">
                    <LoadingOutlined style={{ fontSize: 48 }} />
                    <p className="mt-4 text-lg">
                        Verifying your email address...
                    </p>
                </div>
            );
        }

        if (verificationSuccess) {
            return (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center text-green-600 mb-2">
                        <CheckCircleOutlined className="mr-2" />
                        <span className="font-medium">
                            Email verified successfully!
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">
                        Your email has been verified. You can now log in to
                        access your account.
                    </p>
                    <div className="text-center">
                        <Link
                            href="/signin"
                            className="text-primary hover:underline text-sm"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            );
        }

        // Error or no token state
        return (
            <div className="space-y-2">
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center text-red-600 mb-2">
                        <ExclamationCircleOutlined className="mr-2" />
                        <span className="font-medium">
                            {!token
                                ? 'Missing verification token'
                                : 'Verification failed'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">
                        {!token
                            ? 'No verification token was provided. Please check your email for the verification link.'
                            : verifyEmailError ||
                              "We couldn't verify your email. The link may have expired or been used already."}
                    </p>
                </div>

                <div className="p-4 border rounded-md">
                    <h3 className="text-lg font-medium mb-2">
                        Resend verification email
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {`If you didn't receive the verification email or the link
                        has expired, you can request a new one.`}
                    </p>
                    <div className="space-y-4">
                        <Input
                            id="email"
                            placeholder="Enter your email"
                            type="email"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                        />
                        <Button
                            type="primary"
                            className="w-full"
                            onClick={handleResendVerification}
                            loading={loading}
                        >
                            Resend Verification Email
                        </Button>
                    </div>
                </div>

                <div className="text-center">
                    <Link
                        href="/signin"
                        className="text-primary hover:underline text-sm"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        );
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
                    <h2 className="text-3xl font-bold">Email Verification</h2>
                    <p className="text-xl">
                        Verify your email to secure your account and access all
                        features.
                    </p>
                </div>
                <div>
                    <p>&copy; 2024 Aiser. All rights reserved.</p>
                </div>
            </div>

            {/* Right side - Verification status */}
            <div className="flex flex-col justify-center w-full p-8 lg:w-1/2 lg:p-12">
                <div className="w-full max-w-sm mx-auto space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold">
                            Email Verification
                        </h1>
                        <p className="text-muted-foreground">
                            Confirming your email address
                        </p>
                    </div>

                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
