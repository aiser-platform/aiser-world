import { Modal } from 'antd';
import React from 'react';
import UploadDragger from './Dragger';
import { IFileUpload } from './types';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (fileData?: IFileUpload) => void;
    validFileTypes?: string[];
}

const UploadModal: React.FC<UploadModalProps> = ({
    isOpen,
    onClose,
    onUpload,
    validFileTypes = [],
}) => {
    const handleUploadSuccess = (response?: IFileUpload): void => {
        onUpload(response);
        onClose();
    };

    return (
        <Modal
            title="Upload Files"
            open={isOpen}
            onCancel={onClose}
            footer={null}
        >
            <UploadDragger
                onUpload={handleUploadSuccess}
                validFileTypes={validFileTypes}
            />
        </Modal>
    );
};

export default UploadModal;
