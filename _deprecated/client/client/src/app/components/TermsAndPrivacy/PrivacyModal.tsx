import { Modal } from 'antd';

interface PrivacyModalProps {
    open: boolean;
    onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ open, onClose }) => {
    return (
        <Modal
            title="Privacy Policy"
            open={open}
            onCancel={onClose}
            footer={null}
            width={700}
        >
            <div className="prose max-w-none">
                <h2>1. Information We Collect</h2>
                <p>
                    We collect information that you provide directly to us when
                    using our services.
                </p>

                <h2>2. How We Use Your Information</h2>
                <p>
                    We use the information we collect to provide, maintain, and
                    improve our services.
                </p>

                <h2>3. Data Protection</h2>
                <p>
                    We implement appropriate security measures to protect your
                    personal information.
                </p>

                {/* Add more privacy sections as needed */}
            </div>
        </Modal>
    );
};

export default PrivacyModal;
