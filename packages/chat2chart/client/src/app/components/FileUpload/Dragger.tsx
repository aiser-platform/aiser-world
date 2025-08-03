import { InboxOutlined } from '@ant-design/icons';
import { message, Upload, UploadProps } from 'antd';
import { IFileUpload } from './types';

const { Dragger } = Upload;

export interface UploadDraggerProps {
    onUpload: (fileData?: IFileUpload) => void;
    validFileTypes?: string[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_API_URL = 'http://localhost:8000/files/upload';

const UploadDragger: React.FC<UploadDraggerProps> = ({
    onUpload,
    validFileTypes = [],
}) => {
    const handleFileSizeValidation = (file: File): boolean => {
        if (file.size > MAX_FILE_SIZE) {
            message.error('File must be smaller than 10MB!');
            return false;
        }
        return true;
    };

    const handleFileTypeValidation = (file: File): boolean => {
        if (validFileTypes.length === 0) return true;

        const fileExtension = file.name.toLowerCase().split('.').pop();
        const isValidExtension = validFileTypes.includes(fileExtension || '');

        if (!isValidExtension) {
            message.error(
                `You can only upload ${validFileTypes.join(' or ')} files!`
            );
            return false;
        }
        return true;
    };

    const handleUploadSuccess = (response: IFileUpload): void => {
        onUpload(response);
    };

    const uploadProps: UploadProps = {
        name: 'file',
        action: UPLOAD_API_URL,
        method: 'POST',
        showUploadList: false,
        accept: validFileTypes.map((type) => `.${type}`).join(','),

        openFileDialogOnClick: true,

        onDrop: (event) => {
            const files = event.dataTransfer.files;
            if (files.length > 1) {
                message.error('You can only upload one file at a time!');
                return Upload.LIST_IGNORE;
            }
            return validateFile(files[0]);
        },

        beforeUpload: async (file) => {
            return validateFile(file);
        },

        onChange: (info) => {
            const { status, response } = info.file;

            if (status === 'done') {
                if (response) {
                    const uploadResponse = new IFileUpload(
                        response.file?.filename,
                        response.file?.content_type,
                        response.file?.storage_type,
                        response.file?.file_size,
                        response.file?.uuid_filename
                    );

                    handleUploadSuccess(uploadResponse);
                }
                message.success(
                    `${info.file.name} file uploaded successfully.`
                );
            } else if (status === 'error') {
                message.error(`${info.file.name} file upload failed.`);
            }
        },
    };

    const validateFile = (file: File): boolean => {
        return handleFileSizeValidation(file) && handleFileTypeValidation(file);
    };

    return (
        <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
                <InboxOutlined />
            </p>
            <p className="ant-upload-text">
                Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
                {validFileTypes.length > 0
                    ? `Support for ${validFileTypes.join(', ')} files only.`
                    : 'Upload any file type'}
            </p>
        </Dragger>
    );
};

export default UploadDragger;
