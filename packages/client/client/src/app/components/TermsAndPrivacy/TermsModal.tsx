import { Modal } from 'antd';

interface TermsModalProps {
    open: boolean;
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ open, onClose }) => {
    return (
        <Modal
            title="Terms of Service"
            open={open}
            onCancel={onClose}
            footer={null}
            width={700}
        >
            <div className="prose max-w-none">
                <h2>1. Acceptance of Terms</h2>
                <p>
                    By accessing and using Aiser's services, you agree to be
                    bound by these Terms of Service.
                </p>

                <h2>2. Use of Service</h2>
                <p>
                    You agree to use the service for lawful purposes only and in
                    accordance with these terms.
                </p>

                <h2>3. Data Privacy</h2>
                <p>
                    We handle your data in accordance with our Privacy Policy
                    and applicable data protection laws.
                </p>

                {/* Add more terms sections as needed */}
            </div>
        </Modal>
    );
};

export default TermsModal;
