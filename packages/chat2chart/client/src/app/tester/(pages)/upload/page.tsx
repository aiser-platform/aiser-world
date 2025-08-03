'use client';
import FileSection from '@/app/(dashboard)/chat/components/DataPanel/FileSection';
import UploadModal from '@/app/components/FileUpload/Modal';
import { IFileUpload } from '@/app/components/FileUpload/types';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Card } from 'antd';
import { useState } from 'react';

export default function TestUpload() {
    return (
        <App>
            <TestUploadComponent />
        </App>
    );
}

function TestUploadComponent() {
    const { message } = App.useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<IFileUpload | null>(null);

    const handleDelete = () => {
        setUploadedFile(null);
        message.success('File removed');
    };

    return (
        <div>
            <UploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpload={(fileData) => setUploadedFile(fileData || null)}
            />
            {!uploadedFile ? (
                <Button
                    type="primary"
                    onClick={() => setIsModalOpen(true)}
                    icon={<UploadOutlined />}
                >
                    Upload File
                </Button>
            ) : (
                <Card
                    size="small"
                    title={uploadedFile.filename}
                    extra={
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handleDelete}
                        />
                    }
                >
                    <p>Size: {(uploadedFile.file_size / 1024).toFixed(2)} KB</p>
                    <p>Type: {uploadedFile.content_type}</p>
                </Card>
            )}

            <FileSection onChange={(file) => console.log(file)} />
        </div>
    );
}
