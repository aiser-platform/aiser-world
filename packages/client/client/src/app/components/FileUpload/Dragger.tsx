import { InboxOutlined } from '@ant-design/icons';
import { message, Upload, UploadProps } from 'antd';
import { IFileUpload, IDataSource } from './types';

const { Dragger } = Upload;

export interface UploadDraggerProps {
    onUpload: (dataSource?: IDataSource) => void;
    validFileTypes?: string[];
    includePreview?: boolean;
    sheetName?: string;
    delimiter?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (matching backend)
const UPLOAD_API_URL = 'http://localhost:8000/api/v1/data/upload';

const UploadDragger: React.FC<UploadDraggerProps> = ({
    onUpload,
    validFileTypes = ['csv', 'xlsx', 'xls', 'json', 'tsv'],
    includePreview = true,
    sheetName,
    delimiter = ',',
}) => {
    const handleFileSizeValidation = (file: File): boolean => {
        if (file.size > MAX_FILE_SIZE) {
            message.error('File must be smaller than 50MB!');
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

    const handleUploadSuccess = (response: any): void => {
        if (response.success && response.data_source) {
            const dataSource: IDataSource = {
                id: response.data_source.id,
                name: response.data_source.name,
                type: response.data_source.type,
                format: response.data_source.format,
                size: response.data_source.size,
                rowCount: response.data_source.row_count,
                schema: response.data_source.schema,
                preview: response.preview,
                uploadedAt: response.data_source.uploaded_at
            };
            onUpload(dataSource);
        } else {
            message.error(response.error || 'Upload failed');
        }
    };

    const uploadProps: UploadProps = {
        name: 'file',
        action: UPLOAD_API_URL,
        method: 'POST',
        showUploadList: false,
        accept: validFileTypes.map((type) => `.${type}`).join(','),
        data: {
            include_preview: includePreview,
            sheet_name: sheetName,
            delimiter: delimiter
        },

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

            if (status === 'uploading') {
                message.loading(`Uploading ${info.file.name}...`, 0);
            } else if (status === 'done') {
                message.destroy(); // Clear loading message
                if (response) {
                    handleUploadSuccess(response);
                    message.success(
                        `${info.file.name} processed successfully! ${response.data_source?.row_count || 0} rows loaded.`
                    );
                }
            } else if (status === 'error') {
                message.destroy(); // Clear loading message
                message.error(`${info.file.name} file upload failed: ${response?.error || 'Unknown error'}`);
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
