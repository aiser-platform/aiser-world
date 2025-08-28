'use client';

import React, { useState, useEffect } from 'react';
import UploadDragger from '@/app/components/FileUpload/Dragger';
import { IFileUpload } from '@/app/components/FileUpload/types';
import { DeleteOutlined } from '@ant-design/icons';
import { Button, Card, Popover, Select } from 'antd';
import { fetchApi } from '@/utils/api';

// Constants
const VALID_FILE_TYPES = ['csv', 'xls', 'xlsx'];
const DEFAULT_SELECTION = 'UPLOAD';

// Types
interface Props {
    value?: IFileUpload;
    onChange: (file?: IFileUpload) => void;
}

interface FilePopoverProps {
    file: IFileUpload;
    children: React.ReactNode;
}

// Components
const FilePopover: React.FC<FilePopoverProps> = ({ file, children }) => (
    <Popover
        title={file.filename}
        content={
            <div>
                <p>Size: {(file.file_size / 1024).toFixed(2)} KB</p>
                <p>Type: {file.content_type}</p>
            </div>
        }
        placement="left"
    >
        {children}
    </Popover>
);

const FileCard: React.FC<{ file: IFileUpload; onDelete: () => void }> = ({
    file,
    onDelete,
}) => (
    <Card
        size="small"
        title={file.filename}
        extra={
            <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={onDelete}
            />
        }
    >
        <p>Size: {(file.file_size / 1024).toFixed(2)} KB</p>
        <p>Type: {file.content_type}</p>
    </Card>
);

const FileSection: React.FC<Props> = ({ value, onChange }) => {
    const [files, setFiles] = useState<IFileUpload[]>([]);
    const [availableFiles, setAvailableFiles] = useState<IFileUpload[]>([]);
    const [selectedFile, setSelectedFile] = useState<IFileUpload | null>(null);

    const fetchFiles = async () => {
        try {
            await fetchApi(`files/list?offset=0&limit=100`).then((response) => {
                if (!response.ok) throw new Error('Failed to fetch files');
                response.json().then((data) => {
                    setFiles(data.items);
                });
            });
        } catch (err) {
            console.error('Error fetching files:', err);
        }
    };

    useEffect(() => {
        return () => {
            fetchFiles();
        };
    }, []);

    useEffect(() => {
        if (files.length > 0) {
            setAvailableFiles(
                files.filter(
                    (file) =>
                        !selectedFile ||
                        file.uuid_filename !== selectedFile.uuid_filename
                )
            );
        }
    }, [files, selectedFile]);

    useEffect(() => {
        setSelectedFile(value || null);
    }, [value]);

    const handleFileSelect = (uuid_filename: string) => {
        if (uuid_filename === DEFAULT_SELECTION) {
            setAvailableFiles(files);
            setSelectedFile(null);
            onChange(undefined);
            return;
        }

        const selected = files.find(
            (file) => file.uuid_filename === uuid_filename
        );
        if (selected) {
            setSelectedFile(selected);
            onChange(selected);
            setAvailableFiles(
                files.filter((file) => file.uuid_filename !== uuid_filename)
            );
        }
    };

    const handleUpload = (fileData?: IFileUpload) => {
        if (!fileData) return;
        setSelectedFile(fileData);
        onChange(fileData);
        setFiles((prevFiles) => [fileData, ...prevFiles]);
    };

    const renderSelectOptions = () => {
        const options = [
            <Select.Option key={DEFAULT_SELECTION} value={DEFAULT_SELECTION}>
                --- Upload File ---
            </Select.Option>,
        ];

        if (selectedFile) {
            options.push(
                <Select.Option
                    key={selectedFile.uuid_filename}
                    value={selectedFile.uuid_filename}
                >
                    <FilePopover file={selectedFile}>
                        <span>{selectedFile.filename}</span>
                    </FilePopover>
                </Select.Option>
            );
        }

        availableFiles.forEach((file) => {
            options.push(
                <Select.Option
                    key={file.uuid_filename}
                    value={file.uuid_filename}
                >
                    <FilePopover file={file}>
                        <span>{file.filename}</span>
                    </FilePopover>
                </Select.Option>
            );
        });

        return options;
    };

    return (
        <div className="UploadSection">
            {!selectedFile ? (
                <UploadDragger
                    onUpload={handleUpload}
                    validFileTypes={VALID_FILE_TYPES}
                />
            ) : (
                <FileCard
                    file={selectedFile}
                    onDelete={() => handleFileSelect(DEFAULT_SELECTION)}
                />
            )}

            <Select
                placeholder="Select a file"
                value={selectedFile?.uuid_filename || DEFAULT_SELECTION}
                onChange={handleFileSelect}
                style={{ width: '100%' }}
                defaultValue={DEFAULT_SELECTION}
            >
                {renderSelectOptions()}
            </Select>
        </div>
    );
};

export default FileSection;
